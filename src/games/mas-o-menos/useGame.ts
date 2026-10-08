import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
} from 'react';
import {
  getMasOMenosRanking,
  postMasOMenosScore,
  registerIdentity,
} from '../../shared/api';
import { useLanguage } from '../../shared/i18n/provider';
import { readIdentity, saveIdentity } from '../../shared/identity/store';
import {
  CATEGORIES,
  FAMOUS,
  dayKey,
  eligiblePlayers,
  madridDay,
  pickOpponent,
  seeded,
  type Category,
  type CategoryKey,
  type DailyEntry,
  type GameMode,
  type GameStats,
  type PlayablePlayer,
} from './model';
import {
  readDaily,
  readStats,
  updateDaily,
  writeDaily,
  writeStats,
} from './persistence';

const LIMIT = 10_000;
const pad = (value: number) => String(value).padStart(2, '0');

type Phase = 'home' | 'entering' | 'active' | 'reveal' | 'result';
type RankTab = 'diario' | CategoryKey;
interface ResultData {
  mode: GameMode;
  category: Category;
  streak: number;
  record: boolean;
  best: number;
  date: string;
}
interface RankRow {
  name: string;
  streak: number;
  position: number;
}
export interface GameState {
  phase: Phase;
  stats: GameStats;
  daily: Record<string, DailyEntry>;
  today: Date;
  todayKey: string;
  mode: GameMode | null;
  category: Category | null;
  playerA: PlayablePlayer | null;
  playerB: PlayablePlayer | null;
  used: string[];
  streak: number;
  animating: boolean;
  remaining: number;
  shownGoals: number;
  isLate: boolean;
  isCorrect: boolean;
  result: ResultData | null;
  rankTab: RankTab;
  rankRows: RankRow[] | null;
  rankLoading: boolean;
  rankMessage: string;
  namePrompt: 'daily' | 'free-choice' | 'free' | null;
  nameError: string;
  nameInput: string;
  nameBusy: boolean;
  identityName: string;
  toast: string;
  copied: boolean;
}

type Action = { type: 'patch'; changes: Partial<GameState> };
function reducer(state: GameState, action: Action): GameState {
  return action.type === 'patch' ? { ...state, ...action.changes } : state;
}

function makeState(): GameState {
  const today = madridDay();
  return {
    phase: 'home',
    stats: readStats(),
    daily: readDaily(),
    today,
    todayKey: dayKey(today),
    mode: null,
    category: null,
    playerA: null,
    playerB: null,
    used: [],
    streak: 0,
    animating: false,
    remaining: LIMIT,
    shownGoals: 0,
    isLate: false,
    isCorrect: false,
    result: null,
    rankTab: 'diario',
    rankRows: null,
    rankLoading: true,
    rankMessage: '',
    namePrompt: null,
    nameError: '',
    nameInput: '',
    nameBusy: false,
    identityName: readIdentity().name || '',
    toast: '',
    copied: false,
  };
}

function newId(): string {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (character) => {
      const random = (Math.random() * 16) | 0;
      return (character === 'x' ? random : (random & 3) | 8).toString(16);
    },
  );
}

function yesterdayKey(today: Date): string {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return dayKey(yesterday);
}

function rankRows(
  rows: { name: string; streak: number }[],
  me: string,
): RankRow[] {
  const best: Record<string, number> = {};
  for (const row of rows) {
    if (!(row.name in best) || row.streak > best[row.name]!)
      best[row.name] = row.streak;
  }
  const sorted = Object.entries(best).sort((a, b) => b[1] - a[1]);
  const visible = sorted
    .slice(0, 10)
    .map(([name, streak], position) => ({ name, streak, position }));
  const own = me ? sorted.findIndex(([name]) => name === me) : -1;
  if (own >= 10)
    visible.push({
      name: sorted[own]![0],
      streak: sorted[own]![1],
      position: own,
    });
  return visible;
}

function failureMessage(error: unknown): string {
  const failure =
    error && typeof error === 'object'
      ? (error as { status?: unknown; body?: unknown })
      : {};
  const status =
    typeof failure.status === 'number' ? failure.status : undefined;
  const body = typeof failure.body === 'string' ? failure.body : '';
  return status === 404 || /42P01|does not exist|schema cache/i.test(body)
    ? 'No se ha podido guardar: falta crear la tabla del ranking en Supabase.'
    : status === 401 || status === 403 || /42501|permission|policy/i.test(body)
      ? 'No se ha podido guardar: la tabla del ranking no tiene permisos.'
      : 'No se ha podido guardar en el ranking (' +
        (status || 'sin conexión') +
        ').';
}

function startPlayers(
  category: Category,
  streak: number,
  random: () => number,
) {
  const pool = eligiblePlayers(category);
  const famous = pool.filter((player) => FAMOUS.has(player.name));
  const APool = famous.length ? famous : pool;
  const playerA = APool[Math.floor(random() * APool.length)]!;
  const used = new Set([playerA.name]);
  const playerB = pickOpponent(playerA, pool, used, category.k, streak, random);
  if (!playerB) throw new Error('No opponent available');
  used.add(playerB.name);
  return { pool, playerA, playerB, used: [...used] };
}

export function useGame() {
  const { t } = useLanguage();
  const [state, dispatch] = useReducer(reducer, undefined, makeState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const randomRef = useRef<() => number>(Math.random);
  const deadline = useRef(0);
  const busy = useRef(false);
  const rankRequest = useRef(0);
  const dailyBusy = useRef(false);
  const mountEpoch = useRef(0);
  const alive = useRef(false);
  const nameLock = useRef(false);
  useEffect(() => {
    alive.current = true;
    mountEpoch.current++;
    return () => {
      alive.current = false;
      mountEpoch.current++;
    };
  }, []);
  const isCurrent = useCallback(
    (epoch: number) => alive.current && mountEpoch.current === epoch,
    [],
  );
  const beginLock = useRef(false);
  const syncQueue = useRef<
    Promise<{
      done: Partial<Record<CategoryKey, number>>;
      errors: Partial<Record<CategoryKey, unknown>>;
    }>
  >(Promise.resolve({ done: {}, errors: {} }));
  const toastTimer = useRef<number | undefined>(undefined);
  const resultInput = useRef<HTMLInputElement>(null);
  const rankingInput = useRef<HTMLInputElement>(null);
  const today = state.today;
  const todayKey = state.todayKey;

  const patch = useCallback(
    (changes: Partial<GameState>) => dispatch({ type: 'patch', changes }),
    [],
  );

  useLayoutEffect(() => {
    const playing =
      state.phase === 'entering' ||
      state.phase === 'active' ||
      state.phase === 'reveal';
    document.body.classList.toggle('playing', playing);
    return () => document.body.classList.remove('playing');
  }, [state.phase]);

  const toast = useCallback(
    (message: string) => {
      window.clearTimeout(toastTimer.current);
      patch({ toast: message });
      toastTimer.current = window.setTimeout(() => patch({ toast: '' }), 2200);
    },
    [patch],
  );
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const loadRanking = useCallback(
    async (tab: RankTab) => {
      const token = ++rankRequest.current;
      patch({ rankLoading: true, rankRows: null });
      try {
        const result = await getMasOMenosRanking<{
          name: string;
          streak: number;
        }>(tab === 'diario' ? { tab, day: todayKey } : { tab });
        if (token !== rankRequest.current) return;
        patch({
          rankRows: rankRows(result, readIdentity().name || ''),
          rankLoading: false,
        });
      } catch {
        if (token === rankRequest.current)
          patch({ rankRows: null, rankLoading: false });
      }
    },
    [patch, todayKey],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRanking(state.rankTab);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      rankRequest.current++;
    };
  }, [loadRanking, state.rankTab]);

  const reloadRank = useCallback(() => {
    void loadRanking(stateRef.current.rankTab);
  }, [loadRanking]);

  const begin = useCallback(
    (categoryKey: CategoryKey, mode: GameMode) => {
      const category =
        CATEGORIES.find((item) => item.k === categoryKey) || CATEGORIES[0]!;
      const dailyEntry = readDaily()[todayKey];
      if (mode === 'daily' && dailyEntry) {
        const message = dailyEntry.done
          ? 'Hoy: racha ' + (dailyEntry.streak || 0) + ' · vuelve mañana'
          : 'Hoy lo dejaste a medias · vuelve mañana';
        toast(message);
        return;
      }
      if (beginLock.current) {
        if (mode === 'daily') {
          const startedToday = readDaily()[todayKey];
          if (startedToday)
            toast(
              startedToday.done
                ? 'Hoy: racha ' +
                    (startedToday.streak || 0) +
                    ' · vuelve mañana'
                : 'Hoy lo dejaste a medias · vuelve mañana',
            );
        }
        return;
      }
      beginLock.current = true;
      busy.current = true;
      randomRef.current =
        mode === 'daily' ? seeded('hl-' + todayKey) : Math.random;
      const next = startPlayers(category, 0, randomRef.current);
      let daily = stateRef.current.daily;
      if (mode === 'daily') {
        daily = updateDaily(readDaily(), todayKey, { start: 1 });
        writeDaily(daily);
      }
      patch({
        phase: 'entering',
        mode,
        category,
        playerA: next.playerA,
        playerB: next.playerB,
        used: next.used,
        streak: 0,
        animating: false,
        remaining: LIMIT,
        shownGoals: 0,
        isLate: false,
        isCorrect: false,
        result: null,
        daily,
        namePrompt: null,
        nameError: '',
        nameInput: '',
        rankMessage: '',
        copied: false,
      });
    },
    [patch, todayKey, toast],
  );

  const startDaily = useCallback(() => begin('carrera', 'daily'), [begin]);
  const startFree = useCallback(
    (category: CategoryKey) => begin(category, 'free'),
    [begin],
  );

  const advance = useCallback(() => {
    const current = stateRef.current;
    if (
      current.phase !== 'reveal' ||
      !current.isCorrect ||
      !current.playerA ||
      !current.playerB ||
      !current.category
    )
      return;
    let used = new Set(current.used);
    let playerB = pickOpponent(
      current.playerB,
      eligiblePlayers(current.category),
      used,
      current.category.k,
      current.streak,
      randomRef.current,
    );
    if (!playerB) {
      used = new Set([current.playerB.name]);
      playerB = pickOpponent(
        current.playerB,
        eligiblePlayers(current.category),
        used,
        current.category.k,
        current.streak,
        randomRef.current,
      );
    }
    if (!playerB) return;
    const playerA = current.playerB;
    used.add(playerB.name);
    patch({
      phase: 'entering',
      playerA,
      playerB,
      used: [...used],
      animating: true,
      remaining: LIMIT,
      shownGoals: 0,
      isLate: false,
      isCorrect: false,
    });
  }, [patch]);

  const finish = useCallback(() => {
    const current = stateRef.current;
    if (
      current.phase !== 'reveal' ||
      current.isCorrect ||
      !current.category ||
      !current.mode
    )
      return;
    const stats = readStats();
    const previous = stats.bestByCat[current.category.k] || 0;
    const record =
      current.mode === 'free' &&
      current.streak > 0 &&
      current.streak > previous;
    stats.games++;
    stats.total += current.streak;
    stats.best = Math.max(stats.best, current.streak);
    if (current.mode === 'daily') {
      stats.bestDaily = Math.max(stats.bestDaily || 0, current.streak);
    } else {
      stats.bestByCat[current.category.k] = Math.max(previous, current.streak);
    }
    writeStats(stats);
    let daily = current.daily;
    if (current.mode === 'daily') {
      daily = updateDaily(readDaily(), todayKey, {
        done: 1,
        streak: current.streak,
      });
      writeDaily(daily);
    }
    const result: ResultData = {
      mode: current.mode,
      category: current.category,
      streak: current.streak,
      record,
      best:
        current.mode === 'daily'
          ? stats.bestDaily || 0
          : stats.bestByCat[current.category.k] || 0,
      date: current.todayKey,
    };
    busy.current = true;
    patch({
      phase: 'result',
      stats,
      daily,
      result,
      rankMessage: '',
      namePrompt: null,
      copied: false,
    });
  }, [patch, todayKey]);

  const answer = useCallback(
    (more: boolean, late = false) => {
      const current = stateRef.current;
      if (
        current.phase !== 'active' ||
        busy.current ||
        !current.playerA ||
        !current.playerB ||
        !current.category
      )
        return;
      if (
        !late &&
        deadline.current &&
        deadline.current - performance.now() <= 0
      ) {
        answerRef.current(false, true);
        return;
      }
      busy.current = true;
      deadline.current = 0;
      const correct = late
        ? false
        : more
          ? current.playerB[current.category.k] >
            current.playerA[current.category.k]
          : current.playerB[current.category.k] <
            current.playerA[current.category.k];
      const streak = correct ? current.streak + 1 : current.streak;
      patch({
        phase: 'reveal',
        isCorrect: correct,
        isLate: late,
        streak,
        shownGoals: 0,
        remaining: late ? 0 : current.remaining,
      });
    },
    [patch],
  );
  const answerRef = useRef(answer);
  answerRef.current = answer;

  useEffect(() => {
    if (state.phase !== 'entering') return;
    const timer = window.setTimeout(
      () => {
        beginLock.current = false;
        busy.current = false;
        patch({ phase: 'active', remaining: LIMIT });
      },
      state.animating ? 450 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [patch, state.animating, state.phase, state.playerA, state.playerB]);

  useEffect(() => {
    if (state.phase !== 'active') return;
    deadline.current = performance.now() + LIMIT;
    let raf = 0;
    let timeout = 0;
    const draw = () => {
      const remaining = deadline.current - performance.now();
      if (remaining <= 0) {
        answerRef.current(false, true);
        return;
      }
      patch({ remaining });
      raf = requestAnimationFrame(draw);
    };
    const checkVisibility = () => {
      if (deadline.current && deadline.current - performance.now() <= 0)
        answerRef.current(false, true);
    };
    timeout = window.setTimeout(checkVisibility, LIMIT);
    document.addEventListener('visibilitychange', checkVisibility);
    raf = requestAnimationFrame(draw);
    return () => {
      window.clearTimeout(timeout);
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', checkVisibility);
      deadline.current = 0;
    };
  }, [patch, state.phase, state.playerA, state.playerB]);

  useEffect(() => {
    if (state.phase !== 'reveal' || !state.playerB || !state.category) return;
    const started = performance.now();
    const target = state.playerB[state.category.k];
    let raf = 0;
    let flow = 0;
    const count = () => {
      const progress = Math.min(1, (performance.now() - started) / 700);
      const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      patch({ shownGoals: value });
      if (progress < 1) raf = requestAnimationFrame(count);
    };
    patch({ shownGoals: 0 });
    raf = requestAnimationFrame(count);
    if (state.isCorrect) flow = window.setTimeout(advance, 1300);
    else flow = window.setTimeout(finish, state.isLate ? 2600 : 2000);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(flow);
    };
  }, [
    advance,
    finish,
    patch,
    state.isCorrect,
    state.isLate,
    state.phase,
    state.playerB,
    state.category,
  ]);

  useLayoutEffect(() => {
    if (state.namePrompt !== 'daily' || state.phase !== 'result') return;
    const timer = window.setTimeout(() => resultInput.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [state.namePrompt, state.phase]);
  useLayoutEffect(() => {
    if (state.namePrompt !== 'free') return;
    const timer = window.setTimeout(() => rankingInput.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [state.namePrompt]);

  const savedMessage = useCallback(
    () => '🌍 Guardado en el ranking mundial como ' + readIdentity().name,
    [],
  );

  const sendDaily = useCallback(
    async (day: string, visible: boolean) => {
      const epoch = mountEpoch.current;
      if (!isCurrent(epoch)) return;
      const result = stateRef.current.result;
      const show = () =>
        visible &&
        isCurrent(epoch) &&
        stateRef.current.phase === 'result' &&
        stateRef.current.result === result;
      const entry = readDaily()[day];
      if (!entry?.done) return;
      if (entry.sent) {
        if (show()) patch({ rankMessage: savedMessage() });
        return;
      }
      const identity = readIdentity();
      if (!identity.pid || !identity.name) {
        if (show())
          patch({
            namePrompt: 'daily',
            rankMessage: '',
            nameError: '',
            nameInput: '',
          });
        return;
      }
      if (dailyBusy.current) return;
      dailyBusy.current = true;
      if (show()) patch({ rankMessage: 'Guardando en el ranking mundial…' });
      try {
        await postMasOMenosScore({
          player_id: identity.pid,
          name: identity.name,
          mode: 'diario',
          day,
          streak: entry.streak || 0,
        });
        if (!isCurrent(epoch)) return;
        const daily = updateDaily(readDaily(), day, { sent: 1 });
        writeDaily(daily);
        patch({ daily, ...(show() ? { rankMessage: savedMessage() } : {}) });
        reloadRank();
      } catch (error) {
        if (show()) patch({ rankMessage: failureMessage(error) });
      } finally {
        if (isCurrent(epoch)) dailyBusy.current = false;
      }
    },
    [isCurrent, patch, reloadRank, savedMessage],
  );

  const syncBest = useCallback(() => {
    const epoch = mountEpoch.current;
    syncQueue.current = syncQueue.current.then(async () => {
      const identity = readIdentity();
      let stats = readStats();
      const done: Partial<Record<CategoryKey, number>> = {};
      const errors: Partial<Record<CategoryKey, unknown>> = {};
      if (!isCurrent(epoch) || !identity.pid || !identity.name)
        return { done, errors };
      for (const category of CATEGORIES) {
        if (!isCurrent(epoch)) return { done: {}, errors: {} };
        const score = stats.bestByCat[category.k] || 0;
        if (score <= (stats.sent[category.k] || 0)) continue;
        try {
          await postMasOMenosScore({
            player_id: identity.pid,
            name: identity.name,
            mode: category.k,
            streak: score,
          });
          if (!isCurrent(epoch)) return { done: {}, errors: {} };
          done[category.k] = score;
        } catch (error) {
          if (!isCurrent(epoch)) return { done: {}, errors: {} };
          errors[category.k] = error;
        }
      }
      if (!isCurrent(epoch)) return { done: {}, errors: {} };
      if (Object.keys(done).length) {
        stats = readStats();
        for (const category of CATEGORIES) {
          const value = done[category.k];
          if (value !== undefined)
            stats.sent[category.k] = Math.max(
              stats.sent[category.k] || 0,
              value,
            );
        }
        writeStats(stats);
        patch({ stats });
        reloadRank();
      }
      return { done, errors };
    });
    return syncQueue.current;
  }, [isCurrent, patch, reloadRank]);

  const saveBest = useCallback(
    async (category: CategoryKey) => {
      const epoch = mountEpoch.current;
      const snapshot = stateRef.current.result;
      if (!isCurrent(epoch)) return;
      patch({
        rankMessage: 'Guardando en el ranking mundial…',
        namePrompt: null,
      });
      const result = await syncBest();
      if (
        !isCurrent(epoch) ||
        stateRef.current.phase !== 'result' ||
        stateRef.current.result !== snapshot
      )
        return;
      patch({
        rankMessage: result.errors[category]
          ? failureMessage(result.errors[category])
          : savedMessage(),
      });
    },
    [isCurrent, patch, savedMessage, syncBest],
  );

  const complete = useCallback(async () => {
    const result = stateRef.current.result;
    if (!result) return;
    if (result.mode === 'daily') {
      await sendDaily(result.date, true);
    } else if (result.record) {
      const identity = readIdentity();
      if (identity.pid && identity.name) await saveBest(result.category.k);
      else
        patch({
          rankMessage: '',
          namePrompt: 'free-choice',
        });
    }
  }, [patch, saveBest, sendDaily]);

  useEffect(() => {
    if (state.phase === 'result') void complete();
  }, [complete, state.phase]);

  const goHome = useCallback(() => {
    busy.current = false;
    patch({
      phase: 'home',
      result: null,
      namePrompt: null,
      rankMessage: '',
      copied: false,
    });
    const stats = readStats();
    patch({ stats });
    void syncBest();
    void loadRanking(stateRef.current.rankTab);
  }, [loadRanking, patch, syncBest]);

  const retryDaily = useCallback(() => {
    const identity = readIdentity();
    if (!identity.pid || !identity.name) return;
    const yesterday = yesterdayKey(today);
    [yesterday, todayKey].forEach((day) => {
      const entry = readDaily()[day];
      if (entry?.done && !entry.sent) void sendDaily(day, false);
    });
  }, [sendDaily, today, todayKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      retryDaily();
      void syncBest();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []); // One delayed mount retry; cleanup prevents StrictMode from duplicating network work.

  const registerName = useCallback(async () => {
    if (stateRef.current.nameBusy || nameLock.current || !alive.current) return;
    const epoch = mountEpoch.current;
    const snapshot = stateRef.current.result;
    const prompt = stateRef.current.namePrompt;
    const sameForm = () =>
      isCurrent(epoch) &&
      stateRef.current.result === snapshot &&
      stateRef.current.namePrompt === prompt;
    const name = stateRef.current.nameInput
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16);
    if (name.length < 2) {
      patch({ nameError: 'Mínimo 2 caracteres.' });
      return;
    }
    nameLock.current = true;
    patch({ nameBusy: true, nameError: '' });
    const pid = newId();
    try {
      await registerIdentity(pid, name);
      if (!isCurrent(epoch)) return;
      saveIdentity(pid, name);
      nameLock.current = false;
      patch({ identityName: name, nameBusy: false });
      if (!sameForm()) return;
      patch({ namePrompt: null });
      const current = stateRef.current;
      if (current.result?.mode === 'daily')
        await sendDaily(current.result.date, true);
      else if (current.result?.mode === 'free' && current.result.record)
        await saveBest(current.result.category.k);
    } catch (error) {
      if (!isCurrent(epoch)) return;
      nameLock.current = false;
      patch({ nameBusy: false });
      if (!sameForm()) return;
      const status =
        error && typeof error === 'object'
          ? (error as { status?: unknown }).status
          : undefined;
      patch({
        nameBusy: false,
        nameError:
          status === 409
            ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
            : 'No se ha podido guardar. Revisa la conexión.',
      });
    }
  }, [isCurrent, patch, saveBest, sendDaily]);

  const selectRank = useCallback(
    (tab: RankTab) => {
      if (stateRef.current.rankTab === tab) void loadRanking(tab);
      else patch({ rankTab: tab });
    },
    [loadRanking, patch],
  );

  const share = useCallback(async () => {
    const epoch = mountEpoch.current;
    const result = stateRef.current.result;
    if (!result) return;
    const [year, month, date] = result.date.split('-').map(Number);
    const localDate = new Date(year!, month! - 1, date!);
    const dailyTitle =
      t('Reto diario') +
      ' ' +
      pad(localDate.getDate()) +
      '/' +
      pad(localDate.getMonth() + 1);
    const text =
      result.mode === 'daily'
        ? 'GOALDAY ⚽ Higher or Lower · ' +
          dailyTitle +
          '\n' +
          t('🔥 Racha de ' + result.streak) +
          '\n' +
          location.origin +
          location.pathname
        : 'GOALDAY ⚽ Higher or Lower · ' +
          t(result.category.t) +
          '\n' +
          t('🔥 Racha de ' + result.streak) +
          '\n' +
          location.origin +
          location.pathname;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        if (
          isCurrent(epoch) &&
          stateRef.current.phase === 'result' &&
          stateRef.current.result === result
        )
          patch({ copied: true });
      }
    } catch {
      // Share dismissal leaves the result unchanged.
    }
  }, [isCurrent, patch, t]);

  const closeNamePrompt = useCallback(
    () => patch({ namePrompt: null, nameError: '', nameInput: '' }),
    [patch],
  );

  return {
    state,
    patch,
    startDaily,
    startFree,
    answer,
    advance,
    goHome,
    registerName,
    selectRank,
    share,
    closeNamePrompt,
    toast,
    resultInput,
    rankingInput,
  };
}
