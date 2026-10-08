import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { readIdentity, saveIdentity } from '../../shared/identity/store';
import {
  getBlackjackRanking,
  postBlackjackScore,
  registerIdentity,
} from '../../shared/api';
import type { ApiError } from '../../../contracts/api';
import { players } from '../../data/players';
import { extraPlayers } from '../../data/extra-players';
import { payoutFor, type HandOutcome } from './engine';
import {
  AUTO_NEXT_MS,
  HANDS,
  LIMIT_MS,
  MODES,
  START_CHIPS,
  cardTotal,
  createDailyHand,
  createFreeHand,
  dailyMessage,
  dayKey,
  initialState,
  isOver,
  madridDay,
  reducer,
  shuffle,
  type Action,
  type BlackjackState,
  type GameMode,
  type RankRow,
} from './model';
import { patchDaily, readDaily, readStats, saveStats } from './persistence';
import type { BlackjackPlayer, DailyResult, HandSource, Mode } from './state';

const PLAYERS: BlackjackPlayer[] = [...players, ...extraPlayers];

const POS_SHORT: Record<string, string> = {
  DEF: 'Defensa',
  MED: 'Medio',
  DEL: 'Delantero',
};
const escError = (error: unknown) => error as Partial<ApiError>;
type UiContext = Pick<BlackjackState, 'phase' | 'result'>;

function errorMessage(error: unknown): string {
  const candidate = escError(error);
  const body = candidate.body || '';
  if (
    candidate.status === 404 ||
    /42P01|does not exist|schema cache/i.test(body)
  ) {
    return 'No se ha podido guardar: falta crear la tabla del ranking en Supabase.';
  }
  if (
    candidate.status === 401 ||
    candidate.status === 403 ||
    /42501|permission|policy/i.test(body)
  ) {
    return 'No se ha podido guardar: la tabla del ranking no tiene permisos.';
  }
  return (
    'No se ha podido guardar en el ranking (' +
    (candidate.status || 'sin conexión') +
    ').'
  );
}

export function useGame(t: (text: string) => string) {
  const today = useMemo(() => madridDay(), []);
  const todayKey = useMemo(() => dayKey(today), [today]);
  const [state, reactDispatch] = useReducer(reducer, undefined, () =>
    initialState(readStats(), readDaily()),
  );
  const stateRef = useRef(state);
  const lifecycleRef = useRef({ active: false, epoch: 0 });
  const isAlive = useCallback(
    (epoch: number) =>
      lifecycleRef.current.active && lifecycleRef.current.epoch === epoch,
    [],
  );
  const captureUi = useCallback((): UiContext => {
    const current = stateRef.current;
    return { phase: current.phase, result: current.result };
  }, []);
  const isSameUi = useCallback((context: UiContext) => {
    const current = stateRef.current;
    return current.phase === context.phase && current.result === context.result;
  }, []);
  const dispatch = useCallback((action: Action) => {
    stateRef.current = reducer(stateRef.current, action);
    reactDispatch(action);
    return stateRef.current;
  }, []);
  const sourceRef = useRef<HandSource | null>(null);
  const freeDeckRef = useRef<BlackjackPlayer[]>([]);
  const sessionRef = useRef(0);
  const waitsRef = useRef(
    new Map<ReturnType<typeof setTimeout>, (active: boolean) => void>(),
  );
  const rankRequestRef = useRef(0);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const nameThenRef = useRef<(() => void) | null>(null);
  const nextHandRef = useRef<() => void>(() => {});
  const [chipDisplay, setChipDisplay] = useState(START_CHIPS);

  const fmt = useCallback(
    (number: number) => t(number.toLocaleString('es-ES')),
    [t],
  );
  const modeFor = useCallback(
    (key: Mode['k']) => MODES.find((mode) => mode.k === key)!,
    [],
  );
  const poolFor = useCallback(
    (mode: Mode) =>
      PLAYERS.filter(
        (player) => typeof player[mode.k] === 'number' && player[mode.k]! >= 1,
      ),
    [],
  );

  const cancelWaits = useCallback(() => {
    sessionRef.current++;
    for (const [timer, resolve] of waitsRef.current) {
      clearTimeout(timer);
      resolve(false);
    }
    waitsRef.current.clear();
  }, []);
  const wait = useCallback(
    (ms: number, token: number) =>
      new Promise<boolean>((resolve) => {
        if (token !== sessionRef.current) return resolve(false);
        const timer = setTimeout(() => {
          waitsRef.current.delete(timer);
          resolve(token === sessionRef.current);
        }, ms);
        waitsRef.current.set(timer, resolve);
      }),
    [],
  );
  const newSession = useCallback(() => {
    cancelWaits();
    return sessionRef.current;
  }, [cancelWaits]);

  const toast = useCallback(
    (message: string) => {
      const id = stateRef.current.toastId + 1;
      dispatch({ type: 'TOAST', message, id });
    },
    [dispatch],
  );

  const chooseHand = useCallback(
    (gameMode: GameMode, modeKey: Mode['k'], handIndex: number) => {
      const mode = modeFor(modeKey);
      if (gameMode === 'daily') {
        const result = createDailyHand(
          todayKey,
          handIndex,
          mode,
          poolFor(mode),
        );
        sourceRef.current = result.source;
        return {
          target: result.target,
          standAt:
            Math.round((result.target * mode.sf) / mode.step) * mode.step,
        };
      }
      const result = createFreeHand(mode, poolFor(mode), freeDeckRef.current);
      freeDeckRef.current = result.deck;
      sourceRef.current = result.source;
      return {
        target: result.target,
        standAt: Math.round((result.target * mode.sf) / mode.step) * mode.step,
      };
    },
    [modeFor, poolFor, todayKey],
  );

  const start = useCallback(
    (modeKey: Mode['k'], gameMode: GameMode = 'free') => {
      const dailyEntry = readDaily()[todayKey];
      if (gameMode === 'daily' && dailyEntry) {
        toast(dailyMessage(dailyEntry, fmt));
        return;
      }
      const token = newSession();
      const mode = modeFor(modeKey);
      if (gameMode === 'daily') {
        const daily = patchDaily(todayKey, { start: 1 });
        dispatch({ type: 'DAILY_DATA', daily });
        freeDeckRef.current = [];
      } else {
        freeDeckRef.current = shuffle(poolFor(mode));
      }
      const first = chooseHand(gameMode, modeKey, 0);
      dispatch({
        type: 'START',
        mode: gameMode,
        modeKey,
        target: first.target,
        standAt: first.standAt,
        deck: freeDeckRef.current,
      });
      void token;
    },
    [chooseHand, dispatch, fmt, modeFor, newSession, poolFor, todayKey, toast],
  );

  const dailyStart = useCallback(() => {
    const result = readDaily()[todayKey];
    if (result) toast(dailyMessage(result, fmt));
    else start('carrera', 'daily');
  }, [fmt, start, todayKey, toast]);

  const refreshRanking = useCallback(
    async (tab = stateRef.current.rankTab) => {
      const epoch = lifecycleRef.current.epoch;
      if (!isAlive(epoch)) return;
      const requestId = ++rankRequestRef.current;
      dispatch({ type: 'RANK_LOADING' });
      try {
        const rows = await getBlackjackRanking<RankRow>(
          tab === 'diario' ? { tab: 'diario', day: todayKey } : { tab },
        );
        if (!isAlive(epoch) || requestId !== rankRequestRef.current) return;
        const best: Record<string, number> = {};
        rows.forEach((row) => {
          if (!(row.name in best) || row.chips > best[row.name]!)
            best[row.name] = row.chips;
        });
        dispatch({
          type: 'RANK_READY',
          rows: Object.entries(best)
            .map(([name, chips]) => ({ name, chips }))
            .sort((a, b) => b.chips - a.chips),
        });
      } catch {
        if (isAlive(epoch) && requestId === rankRequestRef.current)
          dispatch({ type: 'RANK_ERROR' });
      }
    },
    [dispatch, isAlive, todayKey],
  );

  const postScore = useCallback(
    async (
      epoch: number,
      mode: Mode['k'] | 'diario',
      chips: number,
      day: string | undefined,
      identity: ReturnType<typeof readIdentity>,
    ) => {
      if (!isAlive(epoch)) return false;
      if (!identity.pid || !identity.name) return false;
      await postBlackjackScore({
        player_id: identity.pid,
        name: identity.name,
        mode,
        chips,
        ...(day ? { day } : {}),
      });
      return isAlive(epoch);
    },
    [isAlive],
  );

  const syncBestImpl = useCallback(
    async (
      epoch: number,
      context: UiContext,
      identity: ReturnType<typeof readIdentity>,
    ) => {
      const empty = {
        done: {} as Record<string, number>,
        errs: {} as Record<string, unknown>,
      };
      if (!isAlive(epoch)) return empty;
      const stats = readStats();
      const pending = MODES.filter(
        (mode) => (stats.best[mode.k] || 0) > (stats.sent[mode.k] || 0),
      );
      if (!pending.length || !identity.pid || !identity.name) return empty;
      const done: Record<string, number> = {};
      const errs: Record<string, unknown> = {};
      for (const mode of pending) {
        if (!isAlive(epoch)) return { done, errs };
        try {
          const posted = await postScore(
            epoch,
            mode.k,
            stats.best[mode.k]!,
            undefined,
            identity,
          );
          if (!isAlive(epoch)) return { done, errs };
          if (posted) done[mode.k] = stats.best[mode.k]!;
        } catch (error) {
          if (!isAlive(epoch)) return { done, errs };
          errs[mode.k] = error;
        }
      }
      if (Object.keys(done).length && isAlive(epoch)) {
        const latest = readStats();
        for (const key in done)
          latest.sent[key] = Math.max(latest.sent[key] || 0, done[key]!);
        saveStats(latest);
        if (isSameUi(context)) {
          dispatch({ type: 'STATS_SYNCED', stats: latest, daily: readDaily() });
          if (stateRef.current.phase === 'home') void refreshRanking();
        }
      }
      return { done, errs };
    },
    [dispatch, isAlive, isSameUi, postScore, refreshRanking],
  );
  const syncBest = useCallback(
    (
      epoch = lifecycleRef.current.epoch,
      context = captureUi(),
      identity = readIdentity(),
    ) => {
      const run = () => syncBestImpl(epoch, context, identity);
      const next = syncQueueRef.current.then(run, run);
      syncQueueRef.current = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
    [captureUi, syncBestImpl],
  );

  const sendDaily = useCallback(
    async (
      day: string,
      epoch = lifecycleRef.current.epoch,
      context = captureUi(),
      identity = readIdentity(),
    ) => {
      if (!isAlive(epoch)) return;
      const record = readDaily()[day];
      if (!record?.done) return;
      if (record.sent) {
        if (isSameUi(context))
          dispatch({
            type: 'RANK_MESSAGE',
            message:
              '🌍 Guardado en el ranking mundial como ' + (identity.name || ''),
          });
        return;
      }
      if (!identity.pid || !identity.name) {
        if (isSameUi(context)) {
          nameThenRef.current = () =>
            void sendDaily(day, epoch, context, readIdentity());
          dispatch({
            type: 'RANK_MESSAGE',
            message: 'Elige tu nombre para salir en el ranking mundial:',
          });
          dispatch({ type: 'NAME_PROMPT', visible: true });
        }
        return;
      }
      if (isSameUi(context))
        dispatch({
          type: 'RANK_MESSAGE',
          message: 'Guardando en el ranking mundial…',
        });
      try {
        if (!isAlive(epoch)) return;
        const posted = await postScore(
          epoch,
          'diario',
          record.chips || 0,
          day,
          identity,
        );
        if (!posted || !isAlive(epoch)) return;
        const daily = patchDaily(day, { sent: 1 });
        if (!isAlive(epoch)) return;
        dispatch({ type: 'DAILY_DATA', daily });
        if (isSameUi(context)) {
          dispatch({
            type: 'RANK_MESSAGE',
            message: '🌍 Guardado en el ranking mundial como ' + identity.name,
          });
          if (stateRef.current.phase === 'home') void refreshRanking();
        }
      } catch (error) {
        if (isAlive(epoch) && isSameUi(context))
          dispatch({
            type: 'RANK_MESSAGE',
            message: errorMessage(error),
            error: true,
          });
      }
    },
    [captureUi, dispatch, isAlive, isSameUi, postScore, refreshRanking],
  );

  const askName = useCallback(
    (then: () => void) => {
      const context = captureUi();
      nameThenRef.current = () => {
        if (isSameUi(context)) then();
      };
      dispatch({
        type: 'RANK_MESSAGE',
        message: 'Elige tu nombre para salir en el ranking mundial:',
      });
      dispatch({ type: 'NAME_PROMPT', visible: true });
    },
    [captureUi, dispatch, isSameUi],
  );

  const submitName = useCallback(async () => {
    const epoch = lifecycleRef.current.epoch;
    const context = captureUi();
    if (!isAlive(epoch)) return;
    if (stateRef.current.nameBusy) return;
    const name = stateRef.current.nameValue
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16);
    if (name.length < 2) {
      dispatch({ type: 'NAME_ERROR', message: 'Mínimo 2 caracteres.' });
      return;
    }
    dispatch({ type: 'NAME_ERROR', message: '', busy: true });
    try {
      const pid = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
            const random = Math.floor(Math.random() * 16);
            return (char === 'x' ? random : (random & 3) | 8).toString(16);
          });
      await registerIdentity(pid, name);
      if (!isAlive(epoch)) return;
      saveIdentity(pid, name);
      if (isSameUi(context)) {
        dispatch({
          type: 'NAME_SAVED',
          stats: readStats(),
          daily: readDaily(),
        });
        dispatch({ type: 'NAME_PROMPT', visible: false });
        const done = nameThenRef.current;
        nameThenRef.current = null;
        done?.();
      }
    } catch (error) {
      if (isAlive(epoch) && isSameUi(context))
        dispatch({
          type: 'NAME_ERROR',
          message:
            escError(error).status === 409
              ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
              : 'No se ha podido guardar. Revisa la conexión.',
        });
    }
  }, [captureUi, dispatch, isAlive, isSameUi]);

  const rankTab = useCallback(
    (tab: BlackjackState['rankTab']) => {
      dispatch({ type: 'RANK_TAB', tab });
    },
    [dispatch],
  );

  const settle = useCallback(
    (outcome: HandOutcome, token: number) => {
      if (token !== sessionRef.current) return;
      const current = stateRef.current;
      if (current.phase === 'settled' || current.phase === 'result') return;
      const delta = payoutFor(outcome, current.bet);
      const chips = current.chips + delta;
      const stats = readStats();
      stats.hands++;
      saveStats(stats);
      dispatch({
        type: 'SETTLE',
        outcome,
        delta,
        chips,
        stats,
        log: [...current.log, delta > 0 ? '🟩' : '🟥'],
      });
    },
    [dispatch],
  );

  const dealerPlay = useCallback(
    async (exact: boolean, late: boolean, token: number) => {
      if (token !== sessionRef.current) return;
      dispatch({ type: 'STAND_BEGIN', late });
      let current = stateRef.current;
      const mode = modeFor(current.modeKey);
      if (current.holeDown && current.dealerCards.length > 1) {
        if (!(await wait(60, token))) return;
        dispatch({
          type: 'REVEAL_HOLE',
          total: cardTotal(current.dealerCards, mode),
        });
      }
      if (!(await wait(450, token))) return;
      while (
        cardTotal(stateRef.current.dealerCards, mode) < stateRef.current.standAt
      ) {
        const card = sourceRef.current?.d();
        if (!card) return;
        dispatch({ type: 'DEALER_CARD_ADD', card });
        if (!(await wait(200, token))) return;
        dispatch({
          type: 'DEALER_TOTAL',
          total: cardTotal(stateRef.current.dealerCards, mode),
        });
        if (!(await wait(260, token))) return;
      }
      current = stateRef.current;
      const player = cardTotal(current.playerCards, mode);
      const dealer = cardTotal(current.dealerCards, mode);
      if (exact) settle(dealer === player ? 'lose' : 'exact', token);
      else if (dealer > current.target) settle('dbust', token);
      else if (player > dealer) settle('win', token);
      else settle(player === dealer ? 'tie' : 'lose', token);
      void late;
    },
    [dispatch, modeFor, settle, wait],
  );

  const offer = useCallback(
    (token: number) => {
      if (token !== sessionRef.current) return;
      const nextCard = sourceRef.current?.p();
      if (!nextCard) return;
      dispatch({
        type: 'OFFER',
        card: nextCard,
        deadline: performance.now() + LIMIT_MS,
      });
    },
    [dispatch],
  );

  const deal = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== 'betting' || current.busy || !sourceRef.current)
      return;
    const token = sessionRef.current;
    dispatch({ type: 'DEAL_BEGIN' });
    const [first, second] = sourceRef.current.pair;
    dispatch({ type: 'PLAYER_CARD', card: first! });
    if (!(await wait(220, token))) return;
    dispatch({ type: 'DEALER_CARD', card: sourceRef.current.d() });
    if (!(await wait(220, token))) return;
    dispatch({ type: 'PLAYER_CARD', card: second! });
    const mode = modeFor(stateRef.current.modeKey);
    if (!(await wait(220, token))) return;
    dispatch({ type: 'DEALER_CARD', card: sourceRef.current.d(), down: true });
    if (!(await wait(260, token))) return;
    dispatch({ type: 'DEAL_DONE' });
    const total = cardTotal(stateRef.current.playerCards, mode);
    if (total > stateRef.current.target) settle('bust', token);
    else if (total === stateRef.current.target)
      void dealerPlay(true, false, token);
    else offer(token);
  }, [dispatch, dealerPlay, modeFor, offer, settle, wait]);

  const take = useCallback(
    async (double: boolean) => {
      const current = stateRef.current;
      if (current.phase !== 'decision' || current.busy || !current.nextCard)
        return;
      if (performance.now() >= current.deadline) {
        void stand(true);
        return;
      }
      if (double && current.chips < current.bet * 2) return;
      const token = sessionRef.current;
      dispatch({ type: 'TAKE', card: current.nextCard, doubled: double });
      if (!(await wait(320, token))) return;
      const latest = stateRef.current;
      const mode = modeFor(latest.modeKey);
      const total = cardTotal(latest.playerCards, mode);
      if (total > latest.target) settle('bust', token);
      else if (total === latest.target) void dealerPlay(true, false, token);
      else if (double) void dealerPlay(false, false, token);
      else offer(token);
    },
    [dealerPlay, dispatch, modeFor, offer, settle, wait],
  );

  const stand = useCallback(
    async (late = false) => {
      const current = stateRef.current;
      if (current.phase !== 'decision' || current.busy) return;
      if (!late && performance.now() >= current.deadline) late = true;
      const token = sessionRef.current;
      dispatch({ type: 'STAND_BEGIN', late });
      if (!(await wait(150, token))) return;
      void dealerPlay(false, late, token);
    },
    [dealerPlay, dispatch, wait],
  );

  const timeUp = useCallback(() => {
    const current = stateRef.current;
    if (current.phase === 'decision' && performance.now() >= current.deadline)
      void stand(true);
  }, [stand]);

  const finish = useCallback(() => {
    const current = stateRef.current;
    const epoch = lifecycleRef.current.epoch;
    if (current.phase !== 'settled' || !isAlive(epoch)) return;
    cancelWaits();
    const stats = readStats();
    const isDaily = current.mode === 'daily';
    const final = current.chips;
    const mode = modeFor(current.modeKey);
    stats.games++;
    const previous = stats.best[mode.k] || 0;
    const record = !isDaily && final > previous;
    let daily = readDaily();
    if (isDaily) {
      stats.bestDaily = Math.max(stats.bestDaily || 0, final);
      daily = patchDaily(todayKey, { done: 1, chips: final });
    } else if (record) stats.best[mode.k] = final;
    saveStats(stats);
    const strip = current.log.join('');
    const url = location.origin + location.pathname;
    const title = isDaily ? 'Reto diario · ' + dateText(today, true) : mode.t;
    const summary =
      current.hand < HANDS
        ? 'No te quedan fichas para apostar tras ' + handsText(current.hand)
        : 'fichas tras ' + handsText(current.hand);
    const suffix = isDaily
      ? ' · mañana hay otro reto'
      : record
        ? ' · ¡nuevo récord!'
        : ' · récord: ' +
          (stats.best[mode.k] || 0).toLocaleString('es-ES') +
          ' fichas';
    const share = `GOALDAY ⚽ Blackjack · ${isDaily ? 'Reto diario ' + dateText(today, true) : mode.t}\n🃏 ${final.toLocaleString('es-ES')} fichas tras ${handsText(current.hand)}\n${strip}\n${url}`;
    const result = {
      final,
      hands: current.hand,
      summary: summary + suffix,
      title,
      shareText: share,
      isDaily,
      record,
    };
    dispatch({ type: 'FINISH', stats, daily, result });
    const context = captureUi();
    const identity = readIdentity();
    if (isDaily) void sendDaily(todayKey, epoch, context, identity);
    else if (record) {
      if (identity.pid && identity.name) {
        dispatch({
          type: 'RANK_MESSAGE',
          message: 'Guardando en el ranking mundial…',
        });
        void syncBest(epoch, context, identity).then((sync) => {
          if (!isAlive(epoch) || !isSameUi(context)) return;
          dispatch({
            type: 'RANK_MESSAGE',
            message: sync.errs[mode.k]
              ? errorMessage(sync.errs[mode.k])
              : '🌍 Guardado en el ranking mundial como ' +
                (identity.name || ''),
            error: !!sync.errs[mode.k],
          });
        });
      } else {
        dispatch({ type: 'RANK_MESSAGE', message: '' });
      }
    }
  }, [
    cancelWaits,
    dispatch,
    captureUi,
    isAlive,
    isSameUi,
    modeFor,
    sendDaily,
    syncBest,
    t,
    today,
    todayKey,
  ]);

  const nextHand = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== 'settled') return;
    if (isOver(current)) {
      finish();
      return;
    }
    const next = chooseHand(current.mode, current.modeKey, current.hand);
    dispatch({ type: 'NEXT_HAND', target: next.target, standAt: next.standAt });
  }, [chooseHand, dispatch, finish]);

  const goHome = useCallback(() => {
    cancelWaits();
    sourceRef.current = null;
    const stats = readStats();
    const daily = readDaily();
    dispatch({ type: 'HOME', stats, daily });
    void syncBest();
  }, [cancelWaits, dispatch, syncBest]);

  const selectBet = useCallback(
    (bet: number) => dispatch({ type: 'BET', value: bet }),
    [dispatch],
  );

  const saveBest = useCallback(
    (
      modeKey: Mode['k'],
      context = captureUi(),
      epoch = lifecycleRef.current.epoch,
      identity = readIdentity(),
    ) => {
      if (!isAlive(epoch) || !isSameUi(context)) return;
      dispatch({
        type: 'RANK_MESSAGE',
        message: 'Guardando en el ranking mundial…',
      });
      void syncBest(epoch, context, identity).then((sync) => {
        if (!isAlive(epoch) || !isSameUi(context)) return;
        dispatch({
          type: 'RANK_MESSAGE',
          message: sync.errs[modeKey]
            ? errorMessage(sync.errs[modeKey])
            : '🌍 Guardado en el ranking mundial como ' + (identity.name || ''),
          error: !!sync.errs[modeKey],
        });
      });
    },
    [captureUi, dispatch, isAlive, isSameUi, syncBest],
  );

  const submitShare = useCallback(async () => {
    const epoch = lifecycleRef.current.epoch;
    const context = captureUi();
    const result = stateRef.current.result;
    if (!isAlive(epoch) || !result || !isSameUi(context)) return;
    const text = t(result.shareText);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        if (isAlive(epoch) && isSameUi(context))
          dispatch({ type: 'SHARE_MESSAGE', message: 'Copiado ✔' });
      }
    } catch {
      /* User cancellation leaves the result intact. */
    }
  }, [captureUi, dispatch, isAlive, isSameUi, t]);

  const backgroundRef = useRef({ syncBest, sendDaily });
  backgroundRef.current = { syncBest, sendDaily };

  useEffect(() => {
    if (state.phase !== 'home') return;
    const timer = setTimeout(() => {
      void refreshRanking(state.rankTab);
    }, 0);
    return () => {
      clearTimeout(timer);
      rankRequestRef.current++;
    };
  }, [refreshRanking, state.phase, state.rankTab]);

  useEffect(() => {
    const epoch = lifecycleRef.current.epoch + 1;
    lifecycleRef.current = { active: true, epoch };
    const timer = setTimeout(() => {
      if (!isAlive(epoch)) return;
      const context = captureUi();
      void backgroundRef.current.syncBest(epoch, context, readIdentity());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      [dayKey(yesterday), todayKey].forEach((day) => {
        const record = readDaily()[day];
        const identity = readIdentity();
        if (record?.done && !record.sent && identity.pid && identity.name)
          void backgroundRef.current.sendDaily(day, epoch, context, identity);
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      if (lifecycleRef.current.epoch === epoch) {
        lifecycleRef.current.active = false;
        lifecycleRef.current.epoch++;
      }
      nameThenRef.current = null;
      cancelWaits();
      rankRequestRef.current++;
    };
  }, [cancelWaits, captureUi, isAlive, today, todayKey]);

  useEffect(() => {
    document.body.classList.toggle(
      'playing',
      !['home', 'result'].includes(state.phase),
    );
    return () => document.body.classList.remove('playing');
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'decision') return;
    let raf = 0;
    const timeout = setTimeout(
      timeUp,
      Math.max(0, state.deadline - performance.now()),
    );
    const tick = () => {
      const current = stateRef.current;
      const left = current.deadline - performance.now();
      if (left <= 0) {
        dispatch({ type: 'TICK', remaining: 0 });
        timeUp();
        return;
      }
      dispatch({ type: 'TICK', remaining: left });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const visibility = () => {
      if (
        stateRef.current.deadline &&
        performance.now() >= stateRef.current.deadline
      )
        timeUp();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      if (timeout) clearTimeout(timeout);
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [dispatch, state.deadline, state.phase, timeUp]);

  useEffect(() => {
    if (state.phase !== 'settled') return;
    const timer = setTimeout(() => nextHandRef.current(), AUTO_NEXT_MS);
    return () => clearTimeout(timer);
  }, [state.hand, state.phase]);
  nextHandRef.current = nextHand;

  useEffect(() => {
    if (!state.chipAnimation) {
      setChipDisplay(state.chips);
      return;
    }
    let raf = 0;
    let toneTimer: ReturnType<typeof setTimeout> | undefined;
    const startTime = performance.now();
    const draw = () => {
      const k = Math.min(1, (performance.now() - startTime) / 700);
      setChipDisplay(
        Math.round(
          state.chipFrom +
            (state.chips - state.chipFrom) * (1 - Math.pow(1 - k, 3)),
        ),
      );
      if (k < 1) raf = requestAnimationFrame(draw);
      else
        toneTimer = setTimeout(
          () => dispatch({ type: 'CHIP_TONE_CLEAR', id: state.chipAnimation }),
          900,
        );
    };
    raf = requestAnimationFrame(draw);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (toneTimer) clearTimeout(toneTimer);
    };
  }, [dispatch, state.chipAnimation, state.chipFrom, state.chips]);

  useEffect(() => {
    if (!state.toast) return;
    const id = state.toastId;
    const timer = setTimeout(() => dispatch({ type: 'TOAST_CLEAR', id }), 2200);
    return () => clearTimeout(timer);
  }, [dispatch, state.toast, state.toastId]);

  const startNamePrompt = useCallback(() => {
    const context = captureUi();
    const modeKey = stateRef.current.modeKey;
    askName(() => saveBest(modeKey, context));
  }, [askName, captureUi, saveBest]);
  const currentMode = modeFor(state.modeKey);
  const remaining = Math.max(0, state.remaining);
  const totalPlayer = cardTotal(state.playerCards, currentMode);
  const totalDealer = cardTotal(state.dealerCards, currentMode);
  const canDouble = state.chips >= state.bet * 2;
  const over = isOver(state);
  const dailyToday: DailyResult | undefined = state.daily[todayKey];
  const homeCards = [
    PLAYERS.find((player) => player.name === 'Lionel Messi'),
    PLAYERS.find((player) => player.name === 'Cristiano Ronaldo'),
  ];
  const rankTabs = [
    { key: 'diario' as const, name: 'Hoy' },
    ...MODES.map((item) => ({ key: item.k, name: item.n })),
  ];
  const resultLabel = useCallback(
    (outcome: HandOutcome) =>
      t(
        {
          exact: '¡Clavado!',
          win: '¡Ganas la mano!',
          dbust: '¡La banca se pasa!',
          bust: 'Te has pasado',
          tie: 'Empate: gana la banca',
          lose: 'Gana la banca',
        }[outcome],
      ),
    [t],
  );

  return {
    state,
    today,
    todayKey,
    fmt,
    modeFor,
    currentMode,
    remaining,
    totalPlayer,
    totalDealer,
    canDouble,
    over,
    dailyToday,
    chipDisplay,
    homeCards,
    rankTabs,
    resultLabel,
    posShort: POS_SHORT,
    start,
    dailyStart,
    selectBet,
    deal,
    take,
    stand,
    nextHand,
    finish,
    goHome,
    rankTab,
    refreshRanking,
    submitShare,
    askName,
    submitName,
    startNamePrompt,
    saveBest,
    toast,
    dispatch,
    setName: (value: string) => dispatch({ type: 'NAME_VALUE', value }),
  };
}

function dateText(date: Date, year?: boolean) {
  const pad = (number: number) => String(number).padStart(2, '0');
  return (
    pad(date.getDate()) +
    '/' +
    pad(date.getMonth() + 1) +
    (year ? '/' + date.getFullYear() : '')
  );
}
function handsText(count: number) {
  return count + (count === 1 ? ' mano' : ' manos');
}
