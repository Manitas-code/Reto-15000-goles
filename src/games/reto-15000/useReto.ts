import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  getRetoRanking,
  postRetoScore,
  registerIdentity,
  renameIdentity,
} from '../../shared/api';
import { saveIdentity } from '../../shared/identity/store';
import { goalsFor, multiplierFor, N, pointsFor, todayKey } from './engine';
import {
  achievements,
  blankStore,
  fmt,
  loadModel,
  makeGame,
  optimalScore,
  persist,
  rankIndex,
  ranks,
  type Model,
  type Mode,
  type Pick,
  type RankTab,
  type Result,
  type RetoToast,
  type Store,
} from './model';
import { ensureDaily } from './bots';

const LEVELS = [0, 3000, 9000, 20000, 40000, 70000, 110000, 170000, 250000];
const LVNAME = [
  'Cantera',
  'Suplente',
  'Titular',
  'Capitán',
  'Internacional',
  'Crack',
  'Estrella',
  'Balón de Oro',
  'Leyenda',
];
const pct: Record<number, string> = {
  0: '100%',
  2000: '99,9%',
  3500: '99,7%',
  5000: '95%',
  6000: '83%',
  7000: '65%',
  8500: '34%',
  10500: '9%',
  12000: '2%',
  13000: '0,7%',
  15000: '0,04%',
  17500: '0,0004%',
  20000: '0,0000005%',
};
type Action = { type: 'replace'; state: Model };
function reducer(_state: Model, action: Action): Model {
  return action.state;
}
const initial = () => loadModel();
const reduceMotion = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;
function cleanName(value: string) {
  return (value || '').replace(/\s+/g, ' ').trim().slice(0, 16);
}
function newId() {
  return (
    window.crypto?.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    })
  );
}
function resetTransient(): Partial<Model> {
  return {
    game: null,
    result: null,
    phase: 'idle',
    busy: false,
    counting: false,
    cardReady: false,
    currentCard: null,
    flip: false,
    slotsOpen: false,
    flashSlots: [],
    previewVisible: false,
    displayedTotal: 0,
    displayedResult: 0,
    displayedSlotPoints: new Array(N).fill(0),
    progressTotal: 0,
    slotPoints: null,
    recountIndex: -1,
    countIndex: -1,
    countTotal: 0,
    intro: false,
    dailyConfirm: false,
    dailyMessage: '',
    rankUp: null,
    rankup: null,
    review: false,
    newlyUnlocked: [],
    confetti: false,
    scoreWorldPosition: null,
  };
}
function achievementMet(
  id: string,
  result: Result,
  store: Store,
  oldBest: number,
) {
  const slots = result.slots,
    any = (index: number) => !!slots[index]?.points;
  switch (id) {
    case 'first':
      return true;
    case 'p5':
      return store.games >= 5;
    case 'p25':
      return store.games >= 25;
    case 'p100':
      return store.games >= 100;
    case 'b5':
      return result.total >= 5000;
    case 'b7':
      return result.total >= 7000;
    case 'b10':
      return result.total >= 10500;
    case 'b12':
      return result.total >= 12000;
    case 'b15':
      return result.total >= 15000;
    case 'b20':
      return result.total >= 20000;
    case 'total100':
      return store.xp >= 100000;
    case 'big2':
      return slots.some((x) => x.points >= 2000);
    case 'big4':
      return slots.some((x) => x.points >= 4000);
    case 'final':
      return any(16);
    case 'lib':
      return any(15);
    case 'ucl':
      return any(14);
    case 'olimp':
      return any(12);
    case 'trio':
      return any(14) && any(15) && any(16);
    case 'cab':
      return slots[11]?.points >= 500;
    case 'boost':
      return slots.some((x) => x.mult === 5 && x.points >= 500);
    case 'perfect':
      return result.total >= result.best;
    case 'noskip':
      return result.skips === 0;
    case 'skip2':
      return result.skips === 2;
    case 'zero':
      return slots.some((x) => x.points === 0);
    case 'zero3':
      return slots.filter((x) => x.points === 0).length >= 3;
    case 'daily1':
      return result.daily;
    case 'daily7':
      return Object.keys(store.daily).length >= 7;
    case 'daily30':
      return Object.keys(store.daily).length >= 30;
    case 'streak3':
      return (
        store.scores.slice(-3).length === 3 &&
        store.scores.slice(-3).every((x) => x.t >= 8000)
      );
    case 'streak5':
      return (
        store.scores.slice(-5).length === 5 &&
        store.scores.slice(-5).every((x) => x.t >= 8000)
      );
    case 'meds6':
      return new Set(store.scores.map((x) => x.med).filter(Boolean)).size >= 6;
    case 'x_clasico':
      return (
        slots.some((x) => x.player.name === 'Lionel Messi') &&
        slots.some((x) => x.player.name === 'Cristiano Ronaldo')
      );
    case 'x_capicua': {
      const value = String(Math.round(result.total));
      return value.length >= 4 && value === [...value].reverse().join('');
    }
    case 'x_banquillo':
      return result.skips === 2 && result.total >= 9000;
    case 'x_paseo':
      return slots.every((x) => x.points > 0);
    case 'x_remontada':
      return oldBest > 0 && result.total >= oldBest + 2000;
    default:
      return false;
  }
}

export function useReto() {
  const [rendered, dispatch] = useReducer(reducer, undefined, initial);
  const stateRef = useRef(rendered);
  const mounted = useRef(true),
    busy = useRef(false),
    run = useRef(0),
    timers = useRef(new Set<ReturnType<typeof setTimeout>>()),
    waitTimers = useRef(new Set<ReturnType<typeof setTimeout>>()),
    frames = useRef(new Set<number>()),
    pendingResolves = useRef(new Set<() => void>());
  const audio = useRef<AudioContext | null>(null),
    toastId = useRef(0),
    rankToken = useRef(0),
    confettiSequence = useRef(0),
    worldPositionToken = useRef(0);
  const nameCallback = useRef<
    ((identity: { pid: string; name: string }) => void) | null
  >(null);
  const pendingScore = useRef<{
    score: number;
    daily: boolean;
    day: string;
  } | null>(null);
  const finishRef = useRef<(game: NonNullable<Model['game']>) => void>(
    () => {},
  );
  const submitRef = useRef<
    (score: number, daily: boolean, day?: string) => void
  >(() => {});
  const loadRankRef = useRef<() => void>(() => {}),
    showRankupRef = useRef<(review?: boolean) => void>(() => {}),
    fireConfettiRef = useRef<() => void>(() => {}),
    scorePositionRef = useRef<
      (score: number, daily: boolean, token: number) => void
    >(() => {});
  const duelApi = useRef<{
    submitDuel?: (score: number, slots: Array<[string, number]>) => void;
    revealDuel?: () => void;
    stop?: () => void;
  }>({});
  const send = useCallback((next: Model) => {
    stateRef.current = next;
    if (mounted.current) dispatch({ type: 'replace', state: next });
  }, []);
  const patch = useCallback(
    (value: Partial<Model>) => send({ ...stateRef.current, ...value }),
    [send],
  );
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      if (mounted.current) fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);
  const delay = useCallback(
    (ms: number, token: number) =>
      new Promise<void>((resolve) => {
        const finish = () => {
          waitTimers.current.delete(id);
          pendingResolves.current.delete(finish);
          resolve();
        };
        const id = setTimeout(finish, reduceMotion() ? 0 : ms);
        waitTimers.current.add(id);
        pendingResolves.current.add(finish);
        void token;
      }),
    [],
  );
  const cancelRunResources = useCallback(() => {
    waitTimers.current.forEach(clearTimeout);
    waitTimers.current.clear();
    [...pendingResolves.current].forEach((finish) => finish());
    frames.current.forEach(cancelAnimationFrame);
    frames.current.clear();
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      run.current++;
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      cancelRunResources();
      rankToken.current++;
      const ctx = audio.current;
      audio.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    };
  }, [cancelRunResources]);
  useEffect(() => {
    if (rendered.modal !== 'name') return;
    const id = window.setTimeout(
      () => document.getElementById('nameInput')?.focus(),
      50,
    );
    return () => window.clearTimeout(id);
  }, [rendered.modal]);
  const animateCount = useCallback(
    (
      to: number,
      ms: number,
      token: number,
      field: 'displayedTotal' | 'displayedResult' = 'displayedTotal',
    ) =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          pendingResolves.current.delete(finish);
          resolve();
        };
        if (reduceMotion() || ms <= 0) {
          patch({ [field]: to });
          finish();
          return;
        }
        pendingResolves.current.add(finish);
        const from = stateRef.current[field],
          started = performance.now();
        if (from === to) {
          finish();
          return;
        }
        const frame = (now: number) => {
          frames.current.delete(frameId);
          if (run.current !== token) {
            finish();
            return;
          }
          const fraction = Math.min(1, (now - started) / ms),
            eased = 1 - (1 - fraction) ** 3;
          patch({ [field]: Math.round(from + (to - from) * eased) });
          if (fraction < 1) {
            frameId = requestAnimationFrame(frame);
            frames.current.add(frameId);
          } else finish();
        };
        let frameId = requestAnimationFrame(frame);
        frames.current.add(frameId);
      }),
    [patch],
  );
  const animateSlot = useCallback(
    (index: number, to: number, ms: number, token: number) => {
      if (reduceMotion() || ms <= 0) {
        const values = stateRef.current.displayedSlotPoints.slice();
        values[index] = to;
        patch({ displayedSlotPoints: values, slotPoints: to });
        return;
      }
      const started = performance.now();
      const frame = (now: number) => {
        frames.current.delete(frameId);
        if (run.current !== token) return;
        const fraction = Math.min(1, (now - started) / ms),
          eased = 1 - (1 - fraction) ** 3,
          values = stateRef.current.displayedSlotPoints.slice();
        values[index] = Math.round(to * eased);
        patch({ displayedSlotPoints: values, slotPoints: values[index] });
        if (fraction < 1) {
          frameId = requestAnimationFrame(frame);
          frames.current.add(frameId);
        }
      };
      let frameId = requestAnimationFrame(frame);
      frames.current.add(frameId);
    },
    [patch],
  );

  const sound = useCallback(
    (kind: 'place' | 'skip' | 'big' | 'win' | 'lose') => {
      if (!stateRef.current.sound) return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return;
        audio.current ||= new Ctx();
        const ctx = audio.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const sequences: Record<typeof kind, number[][]> = {
          place: [
            [440, 0],
            [660, 0.07],
          ],
          skip: [[300, 0]],
          big: [
            [523, 0],
            [659, 0.07],
            [784, 0.14],
          ],
          win: [
            [523, 0],
            [659, 0.1],
            [784, 0.2],
            [1046, 0.3],
          ],
          lose: [
            [330, 0],
            [247, 0.12],
          ],
        };
        sequences[kind].forEach(([frequency, offset]) => {
          const osc = ctx.createOscillator(),
            gain = ctx.createGain(),
            at = ctx.currentTime + offset!;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(frequency!, at);
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(0.18, at + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(at);
          osc.stop(at + 0.25);
        });
      } catch {
        /* Audio remains optional. */
      }
    },
    [],
  );
  const toast = useCallback(
    (
      message: string,
      icon = '',
      parts?: { text: string; strong?: boolean }[],
      duration = 3600,
    ) => {
      const id = ++toastId.current,
        item: RetoToast = { id, icon, message, duration, parts };
      patch({ toast: message, toasts: [...stateRef.current.toasts, item] });
      later(
        () =>
          patch({
            toast:
              stateRef.current.toast === message ? '' : stateRef.current.toast,
            toasts: stateRef.current.toasts.filter((x) => x.id !== id),
          }),
        duration,
      );
    },
    [later, patch],
  );
  const setMode = useCallback(
    (mode: Mode) => {
      if (stateRef.current.counting) {
        toast('Espera a que termine el recuento', '⏳');
        return;
      }
      run.current++;
      cancelRunResources();
      busy.current = false;
      patch({ ...resetTransient(), mode, view: 'home' });
    },
    [cancelRunResources, patch, toast],
  );

  const revealDuel = useCallback(() => duelApi.current.revealDuel?.(), []);
  const start = useCallback(
    (
      confirmed = false,
      selectedMode: Mode = stateRef.current.mode,
      duelSeed?: string,
    ) => {
      const current = stateRef.current,
        day = todayKey(),
        daily = selectedMode === 'diario';
      if (current.counting) {
        toast('Espera a que termine el recuento', '⏳');
        return;
      }
      if (
        ['online', 'enlace'].includes(current.mode) &&
        ['libre', 'diario'].includes(selectedMode)
      )
        duelApi.current.stop?.();
      if (
        daily &&
        (current.store.daily[day] || current.store.dailyStart?.[day])
      ) {
        const done = !!current.store.daily[day];
        run.current++;
        cancelRunResources();
        busy.current = false;
        patch({
          ...resetTransient(),
          mode: selectedMode,
          view: 'play',
          phase: 'daily-done',
          dailyMessage: done
            ? 'Ya has jugado el reto diario de hoy: ' +
              fmt(current.store.daily[day]!.t) +
              ' puntos. Vuelve mañana.'
            : 'Empezaste el reto diario de hoy y lo dejaste a medias: cuenta como jugado. Vuelve mañana.',
        });
        return;
      }
      if (daily && !confirmed) {
        patch({ mode: selectedMode, dailyConfirm: true });
        return;
      }
      run.current++;
      cancelRunResources();
      busy.current = false;
      const token = run.current;
      const game = makeGame(selectedMode, day, duelSeed);
      if (!game) return;
      let store = current.store;
      if (daily) {
        store = { ...current.store, dailyStart: { [day]: 1 } };
        persist(store);
      }
      sound('big');
      patch({
        ...resetTransient(),
        store,
        game,
        mode: selectedMode,
        view: 'play',
        phase: 'card',
        currentCard: game.q[0] || null,
        cardReady: false,
        flip: true,
        previewVisible: true,
        intro: true,
        scrollRequest: stateRef.current.scrollRequest + 1,
      });
      later(
        () => {
          if (run.current === token)
            patch({ cardReady: true, slotsOpen: true });
        },
        reduceMotion() ? 0 : 200,
      );
      later(
        () => {
          if (run.current === token) patch({ intro: false });
        },
        reduceMotion() ? 10 : 1500,
      );
    },
    [cancelRunResources, later, patch, sound, toast],
  );

  const place = useCallback(
    (index: number) => {
      const current = stateRef.current,
        game = current.game;
      if (
        !game ||
        current.counting ||
        busy.current ||
        current.phase !== 'card' ||
        !current.slotsOpen
      )
        return;
      const player = current.currentCard || game.q[game.i];
      if (!player || game.slots[index]) return;
      busy.current = true;
      const token = run.current;
      const mult = multiplierFor(index, game.boost),
        goals = goalsFor(player, index),
        points = pointsFor(player, index, mult);
      const slots = game.slots.slice();
      slots[index] = { player, goals, points, mult };
      const nextGame = { ...game, slots, total: game.total + points };
      sound(points >= 1500 ? 'big' : 'place');
      nextGame.transition = 'place';
      patch({
        game: nextGame,
        phase: 'placing',
        busy: true,
        cardReady: false,
        slotsOpen: false,
        previewVisible: false,
        slotPoints: points,
        flashSlots: [index],
        progressTotal: nextGame.total,
        flip: false,
      });
      void animateCount(nextGame.total, 350, token);
      later(
        () => {
          if (run.current === token)
            patch({
              flashSlots: stateRef.current.flashSlots.filter(
                (flashIndex) => flashIndex !== index,
              ),
            });
        },
        reduceMotion() ? 0 : 260,
      );
      const next = async () => {
        await delay(260, token);
        if (run.current !== token) return;
        const advanced = {
          ...nextGame,
          i: nextGame.i + 1,
          transition: '' as const,
        };
        if (advanced.slots.every(Boolean)) {
          patch({ game: advanced, phase: 'counting', slotsOpen: false });
          busy.current = false;
          finishRef.current(advanced);
          return;
        }
        const card = advanced.q[advanced.i];
        patch({
          phase: 'card',
          currentCard: card || null,
          flip: true,
          previewVisible: !!card,
          slotsOpen: false,
          cardReady: false,
          busy: true,
          game: advanced,
        });
        await delay(200, token);
        if (
          run.current !== token ||
          stateRef.current.game !== advanced ||
          stateRef.current.phase !== 'card'
        )
          return;
        busy.current = false;
        patch({ slotsOpen: true, cardReady: true, busy: false });
      };
      void next();
    },
    [delay, later, patch, sound],
  );
  const skip = useCallback(() => {
    const current = stateRef.current,
      game = current.game;
    if (
      !game ||
      current.counting ||
      busy.current ||
      current.phase !== 'card' ||
      game.skips <= 0 ||
      game.i >= game.q.length - 1
    )
      return;
    busy.current = true;
    const token = run.current,
      q = game.q.slice();
    q.splice(game.i, 1);
    const nextGame = {
      ...game,
      q,
      skips: game.skips - 1,
      skipsUsed: game.skipsUsed + 1,
      transition: 'skip' as const,
    };
    sound('skip');
    patch({
      game: nextGame,
      phase: 'discarding',
      busy: true,
      cardReady: false,
      slotsOpen: false,
      previewVisible: false,
      flip: false,
      currentCard: null,
    });
    const advance = async () => {
      await delay(320, token);
      if (run.current !== token) return;
      const advanced = { ...nextGame, transition: '' as const },
        card = advanced.q[advanced.i];
      busy.current = false;
      patch({
        game: advanced,
        phase: 'card',
        currentCard: card || null,
        flip: true,
        previewVisible: !!card,
        busy: false,
      });
      await delay(200, token);
      if (
        run.current !== token ||
        stateRef.current.game !== advanced ||
        stateRef.current.phase !== 'card' ||
        stateRef.current.currentCard !== card
      )
        return;
      patch({ slotsOpen: true, cardReady: true });
    };
    void advance();
  }, [delay, patch, sound]);

  const toggleSound = useCallback(() => {
    const current = stateRef.current,
      enabled = !current.sound,
      store = { ...current.store, sound: enabled };
    persist(store);
    patch({ store, sound: enabled });
    if (enabled) sound('place');
  }, [patch, sound]);

  const submitScore = useCallback(
    (score: number, daily: boolean, day = todayKey()) => {
      const current = stateRef.current;
      const post = (
        identity: { pid: string; name: string },
        pending: { score: number; daily: boolean; day: string },
        maximize: boolean,
      ) => {
        const value = Math.round(
          maximize
            ? Math.max(
                pending.score,
                pending.daily ? 0 : stateRef.current.store.best,
              )
            : pending.score,
        );
        void postRetoScore({
          name: identity.name,
          score: value,
          daily: pending.daily,
          day: pending.day,
          player_id: identity.pid,
        })
          .then(() => {
            const s = stateRef.current.store;
            if (!pending.daily && value > (s.sbBest || 0)) {
              const next = { ...s, sbBest: value };
              persist(next);
              patch({ store: next });
            }
            if (mounted.current) {
              toast('Puntuación subida al ranking mundial', '🌍', [
                { text: 'Puntuación subida', strong: true },
                { text: ' al ranking mundial' },
              ]);
              loadRankRef.current();
            }
          })
          .catch(() => {
            if (mounted.current)
              toast(
                'No se pudo subir la puntuación. Revisa la conexión.',
                '⚠️',
              );
          });
      };
      if (!current.store.pid || !current.store.name) {
        pendingScore.current = { score, daily, day };
        nameCallback.current = (identity) => {
          const pending = pendingScore.current;
          pendingScore.current = null;
          if (pending && mounted.current) post(identity, pending, true);
        };
        patch({
          modal: 'name',
          name: current.store.name || '',
          nameError: '',
          nameBusy: false,
        });
        return;
      }
      post(
        { pid: current.store.pid, name: current.store.name },
        { score, daily, day },
        false,
      );
    },
    [patch, toast],
  );
  submitRef.current = submitScore;
  const finish = useCallback(
    (game: NonNullable<Model['game']>) => {
      const token = run.current,
        current = stateRef.current,
        total = game.total,
        best = optimalScore(game),
        goal = 15000;
      if (current.counting) return;
      const slots = game.slots as Pick[];
      const submitSlots: Array<[string, number]> = slots.map((slot) => [
        slot.player.name,
        Math.round(slot.points),
      ]);
      duelApi.current.submitDuel?.(total, submitSlots);
      busy.current = true;
      patch({
        phase: 'counting',
        counting: true,
        busy: true,
        view: 'result',
        result: null,
        rankUp: null,
        rankup: null,
        dailyConfirm: false,
        slotsOpen: false,
        cardReady: false,
        previewVisible: false,
        flip: false,
        flashSlots: [],
        countIndex: -1,
        countTotal: total,
        displayedTotal: 0,
        displayedResult: 0,
        displayedSlotPoints: slots.map((slot) => slot.points),
        progressTotal: 0,
        recountIndex: -1,
        scoreWorldPosition: null,
        scrollRequest: stateRef.current.scrollRequest + 1,
        newlyUnlocked: [],
      });
      const recount = async () => {
        await delay(250, token);
        if (run.current !== token) return;
        const totalAnimation = animateCount(total, 1430, token);
        let progressTotal = 0;
        for (let index = 0; index < N; index++) {
          if (run.current !== token) return;
          const pick = slots[index]!;
          progressTotal += pick.points;
          const displayedSlotPoints =
            stateRef.current.displayedSlotPoints.slice();
          displayedSlotPoints[index] = 0;
          patch({
            recountIndex: index,
            countIndex: index,
            slotPoints: 0,
            displayedSlotPoints,
            progressTotal,
            flashSlots: [...stateRef.current.flashSlots, index],
          });
          animateSlot(index, pick.points, 300, token);
          later(
            () => {
              if (run.current === token)
                patch({
                  flashSlots: stateRef.current.flashSlots.filter(
                    (slotIndex) => slotIndex !== index,
                  ),
                });
            },
            reduceMotion() ? 0 : 280,
          );
          await delay(70, token);
        }
        await totalAnimation;
        if (run.current !== token) return;
        const latest = blankStore(stateRef.current.store),
          store = blankStore(latest);
        const prevBest = latest.best || 0;
        const shouldSubmit = game.daily || total > (latest.sbBest || 0);
        const newBest = Math.max(prevBest, total),
          nextRank = ranks[rankIndex(newBest)]!;
        const med = { ...nextRank, pct: pct[nextRank.t] || '100%' };
        const baseResult: Result = {
          total,
          best,
          daily: game.daily,
          date: game.day,
          skips: game.skipsUsed,
          slots,
          goal,
          pass: total >= goal,
          prevBest,
          unlocked: [],
          newlyUnlocked: [],
          up: rankIndex(newBest) - rankIndex(prevBest),
          got: 0,
          med,
        };
        store.games = latest.games + 1;
        if (total >= goal) store.wins = latest.wins + 1;
        store.best = Math.max(latest.best, total);
        store.scores = [
          ...latest.scores,
          { t: total, d: game.day, med: med.name, daily: game.daily },
        ].slice(-200);
        if (game.daily)
          store.daily = {
            ...latest.daily,
            [game.day]: { t: total, med: med.name },
          };
        store.xp += total;
        const unlocked = achievements
          .filter(
            ([id]) =>
              !store.ach[id] && achievementMet(id, baseResult, store, prevBest),
          )
          .map(([id]) => id);
        unlocked.forEach((id) => {
          store.ach[id] = todayKey();
        });
        persist(store);
        const result: Result = {
          ...baseResult,
          unlocked,
          newlyUnlocked: unlocked,
          got: unlocked.length,
        };
        patch({
          store,
          result,
          phase: 'result',
          counting: false,
          busy: false,
          displayedTotal: total,
          displayedResult: 0,
          displayedSlotPoints: slots.map((slot) => slot.points),
          progressTotal: total,
          countIndex: N,
          countTotal: total,
          newlyUnlocked: unlocked,
          rankUp: null,
          rankup: null,
        });
        busy.current = false;
        revealDuel();
        sound(total >= goal ? 'win' : total >= 7000 ? 'big' : 'lose');
        if (shouldSubmit)
          later(() => submitRef.current(total, game.daily, game.day), 1400);
        void animateCount(total, 1000, token, 'displayedResult');
        loadRankRef.current();
        scorePositionRef.current(total, game.daily, token);
        if (result.pass && !['online', 'enlace'].includes(current.mode))
          fireConfettiRef.current();
        if (result.up > 0) later(() => showRankupRef.current(false), 400);
        unlocked.forEach((id, index) => {
          const achievement = achievements.find(([key]) => key === id);
          if (!achievement) return;
          const icon = achievement[3] ? '❓' : '🏅';
          later(
            () => {
              toast('Logro desbloqueado · ' + achievement[1], icon, [
                { text: 'Logro desbloqueado', strong: true },
                { text: ' · ' + achievement[1] },
              ]);
              sound('place');
            },
            600 + index * 700,
          );
        });
      };
      void recount();
    },
    [animateCount, animateSlot, delay, later, patch, revealDuel, sound, toast],
  );
  finishRef.current = finish;

  const saveName = useCallback(async () => {
    const current = stateRef.current;
    if (current.nameBusy) return;
    const name = cleanName(current.name);
    if (name.length < 2) {
      patch({ nameError: 'Mínimo 2 caracteres.' });
      return;
    }
    const registered = !!(current.store.pid && current.store.name);
    if (registered && name === current.store.name) {
      patch({ modal: '', nameBusy: false });
      nameCallback.current = null;
      return;
    }
    patch({ nameBusy: true, nameError: '', modal: 'name' });
    const pid = registered ? current.store.pid! : newId();
    try {
      if (registered) await renameIdentity(pid, name);
      else await registerIdentity(pid, name);
      if (!mounted.current) return;
      const latest = stateRef.current.store,
        store = { ...latest, pid, name };
      saveIdentity(pid, name);
      persist(store);
      patch({ store, name, modal: '', nameBusy: false, nameError: '' });
      const lead = registered ? 'Nombre cambiado: ' : 'Nombre registrado: ';
      if (mounted.current)
        toast(lead + name, '🌍', [
          { text: lead, strong: true },
          { text: name },
        ]);
      const cb = nameCallback.current;
      nameCallback.current = null;
      if (mounted.current && cb) cb({ pid, name });
      else if (mounted.current && !registered && store.best > 0)
        submitRef.current(store.best, false);
      if (mounted.current) loadRankRef.current();
    } catch (error) {
      if (mounted.current)
        patch({
          nameBusy: false,
          nameError:
            error instanceof Error && 'status' in error && error.status === 409
              ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
              : 'No se ha podido guardar. Revisa la conexión.',
        });
    }
  }, [patch, toast]);
  const requireIdentity = useCallback(
    (callback: (identity: { pid: string; name: string }) => void) => {
      const current = stateRef.current;
      if (current.store.pid && current.store.name)
        callback({ pid: current.store.pid, name: current.store.name });
      else {
        nameCallback.current = callback;
        patch({
          modal: 'name',
          name: current.store.name || '',
          nameError: '',
          nameBusy: false,
        });
      }
    },
    [patch],
  );
  const closeModal = useCallback(() => {
    nameCallback.current = null;
    patch({ modal: '', nameBusy: false });
  }, [patch]);

  const loadRank = useCallback(async () => {
    const current = stateRef.current,
      tab = current.rankTab,
      pid = current.store.pid,
      name = current.store.name;
    if (tab === 'med' || tab === 'duel') return;
    const token = ++rankToken.current;
    patch({ rankRows: null, rankError: 'Cargando ranking mundial…' });
    try {
      if (tab === 'day') await ensureDaily();
      if (
        !mounted.current ||
        token !== rankToken.current ||
        stateRef.current.rankTab !== tab ||
        stateRef.current.store.pid !== pid ||
        stateRef.current.store.name !== name
      )
        return;
      let rows: {
        name: string;
        score: number;
        day?: string;
        show_at?: string | null;
        player_id?: string;
      }[];
      try {
        rows =
          tab === 'day'
            ? await getRetoRanking({
                tab,
                day: todayKey(),
                includeVisibility: true,
              })
            : await getRetoRanking({ tab, includeVisibility: true });
      } catch {
        rows =
          tab === 'day'
            ? await getRetoRanking({
                tab,
                day: todayKey(),
                includeVisibility: false,
              })
            : await getRetoRanking({ tab, includeVisibility: false });
      }
      rows = rows.filter(
        (row) => !row.show_at || new Date(row.show_at).getTime() <= Date.now(),
      );
      const seen = new Set<string>(),
        unique = rows.filter((row) => {
          const key = row.name.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      if (
        mounted.current &&
        token === rankToken.current &&
        stateRef.current.rankTab === tab &&
        stateRef.current.store.pid === pid &&
        stateRef.current.store.name === name
      )
        patch({
          rankRows: unique,
          rankError: unique.length
            ? ''
            : tab === 'day'
              ? 'Nadie ha jugado aún el reto de hoy. ¡Sé el primero!'
              : 'Todavía no hay puntuaciones. ¡Estrena el ranking!',
        });
    } catch {
      if (
        mounted.current &&
        token === rankToken.current &&
        stateRef.current.rankTab === tab &&
        stateRef.current.store.pid === pid &&
        stateRef.current.store.name === name
      )
        patch({
          rankRows: [],
          rankError:
            'No se ha podido cargar el ranking mundial. Revisa la conexión.',
        });
    }
  }, [patch]);
  loadRankRef.current = () => {
    void loadRank();
  };
  const showScorePosition = useCallback(
    (score: number, daily: boolean, token: number) => {
      const requestId = ++worldPositionToken.current;
      later(() => {
        void (async () => {
          const initial = stateRef.current,
            pid = initial.store.pid,
            name = initial.store.name;
          if (!pid || !name || !mounted.current || run.current !== token)
            return;
          const query = daily
            ? { tab: 'day' as const, day: todayKey(), includeVisibility: true }
            : { tab: 'all' as const, includeVisibility: true };
          let rows: {
            name: string;
            score: number;
            day?: string;
            show_at?: string | null;
          }[];
          try {
            try {
              rows = await getRetoRanking(query);
            } catch {
              rows = await getRetoRanking({
                ...query,
                includeVisibility: false,
              });
            }
            rows = rows.filter(
              (row) =>
                !row.show_at || new Date(row.show_at).getTime() <= Date.now(),
            );
          } catch {
            return;
          }
          if (
            !mounted.current ||
            run.current !== token ||
            requestId !== worldPositionToken.current ||
            stateRef.current.store.pid !== pid ||
            stateRef.current.store.name !== name
          )
            return;
          const seen = new Set<string>(),
            list = rows.filter((row) => {
              const key = row.name.trim().toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          const position =
            list.findIndex(
              (row) =>
                row.name.trim().toLowerCase() === name.trim().toLowerCase(),
            ) + 1;
          if (!position) return;
          const row = list[position - 1]!,
            n = list.length;
          let text: string,
            parts: { text: string; strong?: boolean }[],
            gap: number | undefined;
          if (daily && position > 50) {
            gap = Math.max(1, Number(list[49]?.score || 0) - row.score + 1);
            text =
              '🌍 En el reto de hoy aún no estás en el top 50 · te faltan ' +
              fmt(gap) +
              ' puntos para entrar';
            parts = [
              {
                text: '🌍 En el reto de hoy aún no estás en el top 50 · te faltan ',
              },
              { text: fmt(gap), strong: true },
              { text: ' puntos para entrar' },
            ];
          } else if (daily && position === 1) {
            text = '🌍 En el reto de hoy vas 1º de ' + n + ' · ¡vas primero!';
            parts = [
              { text: '🌍 En el reto de hoy vas ' },
              { text: '1º', strong: true },
              { text: ' de ' + n + ' · ¡vas primero!' },
            ];
          } else if (daily) {
            gap = Math.max(1, list[position - 2]!.score - row.score + 1);
            text =
              '🌍 En el reto de hoy vas ' +
              position +
              'º de ' +
              n +
              ' · te faltan ' +
              fmt(gap) +
              ' puntos para pasar al ' +
              (position - 1) +
              'º';
            parts = [
              { text: '🌍 En el reto de hoy vas ' },
              { text: position + 'º', strong: true },
              { text: ' de ' + n + ' · te faltan ' },
              { text: fmt(gap), strong: true },
              { text: ' puntos para pasar al ' + (position - 1) + 'º' },
            ];
          } else if (position <= 50) {
            const fresh = score >= row.score;
            text =
              '🌍 Tu récord (' +
              fmt(row.score) +
              ') va ' +
              position +
              'º del mundo' +
              (fresh ? ' · ¡con esta partida!' : '');
            parts = [
              { text: '🌍 Tu récord (' + fmt(row.score) + ') va ' },
              { text: position + 'º', strong: true },
              { text: ' del mundo' + (fresh ? ' · ¡con esta partida!' : '') },
            ];
          } else {
            gap = Math.max(1, Number(list[49]?.score || 0) - row.score + 1);
            text =
              '🌍 Aún no estás en el top 50 · a tu récord (' +
              fmt(row.score) +
              ') le faltan ' +
              fmt(gap) +
              ' puntos para entrar';
            parts = [
              {
                text:
                  '🌍 Aún no estás en el top 50 · a tu récord (' +
                  fmt(row.score) +
                  ') le faltan ',
              },
              { text: fmt(gap), strong: true },
              { text: ' puntos para entrar' },
            ];
          }
          patch({
            scoreWorldPosition: {
              visible: true,
              daily,
              text,
              parts,
              position,
              total: n,
              score: row.score,
              gap,
            },
          });
        })();
      }, 2600);
    },
    [later, patch],
  );
  scorePositionRef.current = showScorePosition;
  const changeRank = useCallback(
    (rankTab: RankTab) => {
      const current = stateRef.current;
      patch({ rankTab, view: 'rank', rankRows: null });
      if (current.view === 'rank' && current.rankTab === rankTab)
        void loadRank();
    },
    [loadRank, patch],
  );
  const setRankTab = useCallback(
    (rankTab: RankTab) => {
      const current = stateRef.current;
      patch({ rankTab });
      if (current.rankTab === rankTab && current.view === 'rank')
        void loadRank();
    },
    [loadRank, patch],
  );
  const fireConfetti = useCallback(() => {
    if (reduceMotion()) return;
    const sequence = ++confettiSequence.current;
    patch({ confetti: true, confettiKey: stateRef.current.confettiKey + 1 });
    later(() => {
      if (confettiSequence.current === sequence) patch({ confetti: false });
    }, 3200);
  }, [later, patch]);
  fireConfettiRef.current = fireConfetti;
  const showRankup = useCallback(
    (review = true) => {
      const rank = ranks[rankIndex(stateRef.current.store.best)]!,
        rankUp = { rank, review };
      patch({ rankUp, rankup: rankUp, review, modal: '' });
      sound('win');
      if (!review) fireConfettiRef.current();
    },
    [patch, sound],
  );
  showRankupRef.current = showRankup;
  const attachDuel = useCallback(
    (api: {
      submitDuel?: (score: number, slots: Array<[string, number]>) => void;
      revealDuel?: () => void;
      stop?: () => void;
    }) => {
      duelApi.current = api;
    },
    [],
  );
  useEffect(() => {
    if (!['day', 'all'].includes(rendered.rankTab)) return;
    void loadRank();
    return () => {
      rankToken.current++;
    };
  }, [rendered.rankTab, loadRank]);

  const goHome = useCallback(() => {
    if (stateRef.current.counting) {
      toast('Espera a que termine el recuento', '⏳');
      return;
    }
    duelApi.current.stop?.();
    run.current++;
    cancelRunResources();
    busy.current = false;
    const current = stateRef.current,
      mode =
        current.mode === 'online' || current.mode === 'enlace'
          ? 'libre'
          : current.mode;
    patch({
      ...resetTransient(),
      mode,
      view: 'home',
      modal: '',
      scrollRequest: current.scrollRequest + 1,
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [cancelRunResources, patch, toast]);
  const again = useCallback(() => {
    const current = stateRef.current;
    if (current.counting) {
      toast('Espera a que termine el recuento', '⏳');
      return;
    }
    let mode = current.mode;
    if (
      mode === 'diario' &&
      (current.store.daily[todayKey()] ||
        current.store.dailyStart?.[todayKey()])
    )
      mode = 'libre';
    start(false, mode);
  }, [start, toast]);
  const submitDuel = useCallback(
    (score: number, slots: Array<[string, number]>) => {
      duelApi.current.submitDuel?.(score, slots);
    },
    [],
  );
  return {
    state: rendered,
    patch,
    toast,
    setMode,
    start,
    place,
    skip,
    toggleSound,
    sound,
    bestRank: ranks[rankIndex(rendered.store.best)]!,
    nextRank: ranks[rankIndex(rendered.store.best) + 1],
    xpLevel: LEVELS.reduce(
      (level, value, index) => (rendered.store.xp >= value ? index : level),
      0,
    ),
    levelName:
      LVNAME[
        LEVELS.reduce(
          (level, value, index) => (rendered.store.xp >= value ? index : level),
          0,
        )
      ]!,
    pct,
    ranks,
    achievements,
    saveName,
    changeRank,
    setRankTab,
    loadRank,
    requireIdentity,
    closeModal,
    goHome,
    again,
    submitDuel,
    revealDuel,
    attachDuel,
    showRankup,
  };
}
