import type {
  BlackjackPlayer,
  DailyResult,
  HandSource,
  Mode,
  Stats,
} from './state';
import type { HandOutcome } from './engine';

export const MODES: Mode[] = [
  {
    k: 'carrera',
    n: 'Carrera',
    t: 'Goles en toda su carrera',
    lo: 600,
    hi: 1500,
    step: 50,
    sf: 0.8,
  },
  {
    k: 'seleccion',
    n: 'Selección',
    t: 'Goles con su selección',
    lo: 100,
    hi: 150,
    step: 5,
    sf: 0.75,
  },
];
export const START_CHIPS = 1000;
export const HANDS = 7;
export const AUTO_NEXT_MS = 1500;
export const LIMIT_MS = 10_000;
export const BETS = [100, 200, 300] as const;
export const MIN_BET = BETS[0];
export const STATS_KEY = 'gd_bj10_stats';
export const DAILY_KEY = 'gd_bj10_daily';
export const CHIP_COLORS = ['#1f5fbf', '#1d8a4e', '#c8322a', '#16110b'];

export type GamePhase =
  | 'home'
  | 'betting'
  | 'dealing'
  | 'decision'
  | 'standing'
  | 'dealer'
  | 'settled'
  | 'result';
export type GameMode = 'free' | 'daily';

export interface RankRow {
  name: string;
  chips: number;
}
export interface BlackjackState {
  phase: GamePhase;
  mode: GameMode;
  modeKey: Mode['k'];
  hand: number;
  bet: number;
  doubled: boolean;
  busy: boolean;
  chips: number;
  target: number;
  standAt: number;
  playerCards: BlackjackPlayer[];
  dealerCards: BlackjackPlayer[];
  dealerShownTotal: number | null;
  playerAnimIndex: number;
  dealerAnimIndex: number;
  holeDown: boolean;
  lateStand: boolean;
  nextCard: BlackjackPlayer | null;
  deadline: number;
  remaining: number;
  outcome: HandOutcome | null;
  delta: number;
  log: string[];
  stats: Stats;
  daily: Record<string, DailyResult>;
  rankTab: 'diario' | Mode['k'];
  ranking: RankRow[];
  rankStatus: 'loading' | 'ready' | 'error';
  result: {
    final: number;
    hands: number;
    summary: string;
    title: string;
    shareText: string;
    isDaily: boolean;
    record: boolean;
  } | null;
  rankMessage: string;
  rankError: boolean;
  namePrompt: boolean;
  nameValue: string;
  nameError: string;
  nameBusy: boolean;
  shareMessage: string;
  toast: string;
  toastId: number;
  chipAnimation: number;
  chipTone: '' | 'up' | 'down';
  chipFrom: number;
  freeDeck: BlackjackPlayer[];
}

export type Action =
  | {
      type: 'START';
      mode: GameMode;
      modeKey: Mode['k'];
      target: number;
      standAt: number;
      deck: BlackjackPlayer[];
    }
  | { type: 'BET'; value: number }
  | { type: 'HAND_READY'; target: number; standAt: number }
  | { type: 'DEAL_BEGIN' }
  | { type: 'PLAYER_CARD'; card: BlackjackPlayer }
  | { type: 'DEALER_CARD'; card: BlackjackPlayer; down?: boolean }
  | { type: 'DEAL_DONE' }
  | { type: 'OFFER'; card: BlackjackPlayer; deadline: number }
  | { type: 'TICK'; remaining: number }
  | { type: 'TAKE'; card: BlackjackPlayer; doubled: boolean }
  | { type: 'STAND_BEGIN'; late?: boolean }
  | { type: 'REVEAL_HOLE'; total: number }
  | { type: 'DEALER_CARD_ADD'; card: BlackjackPlayer }
  | { type: 'DEALER_TOTAL'; total: number }
  | {
      type: 'SETTLE';
      outcome: HandOutcome;
      delta: number;
      chips: number;
      stats: Stats;
      log: string[];
    }
  | { type: 'CHIP_TONE_CLEAR'; id: number }
  | { type: 'NEXT_HAND'; target: number; standAt: number }
  | {
      type: 'FINISH';
      stats: Stats;
      daily: Record<string, DailyResult>;
      result: BlackjackState['result'];
    }
  | { type: 'HOME'; stats: Stats; daily: Record<string, DailyResult> }
  | { type: 'RANK_TAB'; tab: BlackjackState['rankTab'] }
  | { type: 'RANK_LOADING' }
  | { type: 'RANK_READY'; rows: RankRow[] }
  | { type: 'RANK_ERROR' }
  | { type: 'RANK_MESSAGE'; message: string; error?: boolean }
  | { type: 'DAILY_DATA'; daily: Record<string, DailyResult> }
  | { type: 'NAME_PROMPT'; visible: boolean }
  | { type: 'NAME_VALUE'; value: string }
  | { type: 'NAME_ERROR'; message: string; busy?: boolean }
  | { type: 'NAME_SAVED'; stats: Stats; daily: Record<string, DailyResult> }
  | { type: 'STATS_SYNCED'; stats: Stats; daily: Record<string, DailyResult> }
  | { type: 'SHARE_MESSAGE'; message: string }
  | { type: 'TOAST'; message: string; id: number }
  | { type: 'TOAST_CLEAR'; id: number };

export function initialState(
  stats: Stats,
  daily: Record<string, DailyResult>,
): BlackjackState {
  return {
    phase: 'home',
    mode: 'free',
    modeKey: 'carrera',
    hand: 0,
    bet: MIN_BET,
    doubled: false,
    busy: false,
    chips: START_CHIPS,
    target: 0,
    standAt: 0,
    playerCards: [],
    dealerCards: [],
    dealerShownTotal: null,
    playerAnimIndex: -1,
    dealerAnimIndex: -1,
    holeDown: false,
    lateStand: false,
    nextCard: null,
    deadline: 0,
    remaining: LIMIT_MS,
    outcome: null,
    delta: 0,
    log: [],
    stats,
    daily,
    rankTab: 'diario',
    ranking: [],
    rankStatus: 'loading',
    result: null,
    rankMessage: '',
    rankError: false,
    namePrompt: false,
    nameValue: '',
    nameError: '',
    nameBusy: false,
    shareMessage: '',
    toast: '',
    toastId: 0,
    chipAnimation: 0,
    chipTone: '',
    chipFrom: START_CHIPS,
    freeDeck: [],
  };
}

export function reducer(state: BlackjackState, action: Action): BlackjackState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        phase: 'betting',
        mode: action.mode,
        modeKey: action.modeKey,
        hand: 0,
        bet: MIN_BET,
        doubled: false,
        busy: false,
        chips: START_CHIPS,
        target: action.target,
        standAt: action.standAt,
        playerCards: [],
        dealerCards: [],
        dealerShownTotal: null,
        playerAnimIndex: -1,
        dealerAnimIndex: -1,
        holeDown: false,
        lateStand: false,
        nextCard: null,
        deadline: 0,
        remaining: LIMIT_MS,
        outcome: null,
        delta: 0,
        log: [],
        result: null,
        rankMessage: '',
        shareMessage: '',
        rankError: false,
        namePrompt: false,
        nameValue: '',
        nameBusy: false,
        nameError: '',
        chipAnimation: 0,
        chipTone: '',
        freeDeck: action.deck,
      };
    case 'BET':
      return state.phase === 'betting' &&
        !state.busy &&
        action.value <= state.chips
        ? { ...state, bet: action.value }
        : state;
    case 'HAND_READY':
      return {
        ...state,
        phase: 'betting',
        busy: false,
        target: action.target,
        standAt: action.standAt,
        playerCards: [],
        dealerCards: [],
        dealerShownTotal: null,
        playerAnimIndex: -1,
        dealerAnimIndex: -1,
        holeDown: false,
        lateStand: false,
        nextCard: null,
        deadline: 0,
        remaining: LIMIT_MS,
        outcome: null,
        delta: 0,
        bet:
          state.bet > state.chips
            ? [...BETS].reverse().find((v) => v <= state.chips) || MIN_BET
            : state.bet,
      };
    case 'DEAL_BEGIN':
      return {
        ...state,
        phase: 'dealing',
        busy: true,
        playerCards: [],
        dealerCards: [],
        dealerShownTotal: null,
        playerAnimIndex: -1,
        dealerAnimIndex: -1,
        holeDown: false,
        nextCard: null,
      };
    case 'PLAYER_CARD':
      return {
        ...state,
        playerAnimIndex: state.playerCards.length,
        playerCards: [...state.playerCards, action.card],
      };
    case 'DEALER_CARD':
      return {
        ...state,
        dealerAnimIndex: state.dealerCards.length,
        dealerCards: [...state.dealerCards, action.card],
        holeDown: action.down === true,
      };
    case 'DEAL_DONE':
      return { ...state, busy: false };
    case 'OFFER':
      return {
        ...state,
        phase: 'decision',
        busy: false,
        nextCard: action.card,
        deadline: action.deadline,
        remaining: LIMIT_MS,
      };
    case 'TICK':
      return { ...state, remaining: action.remaining };
    case 'TAKE':
      return {
        ...state,
        phase: 'dealing',
        busy: true,
        playerAnimIndex: state.playerCards.length,
        nextCard: null,
        deadline: 0,
        bet: action.doubled ? state.bet * 2 : state.bet,
        doubled: state.doubled || action.doubled,
        playerCards: [...state.playerCards, action.card],
      };
    case 'STAND_BEGIN':
      return {
        ...state,
        phase: state.phase === 'decision' ? 'standing' : 'dealer',
        busy: true,
        lateStand: action.late === true,
        deadline: 0,
        nextCard: state.phase === 'decision' ? state.nextCard : null,
      };
    case 'REVEAL_HOLE':
      return { ...state, holeDown: false, dealerShownTotal: action.total };
    case 'DEALER_CARD_ADD':
      return {
        ...state,
        dealerAnimIndex: state.dealerCards.length,
        dealerCards: [...state.dealerCards, action.card],
      };
    case 'DEALER_TOTAL':
      return { ...state, dealerShownTotal: action.total };
    case 'SETTLE':
      return {
        ...state,
        phase: 'settled',
        busy: false,
        hand: state.hand + 1,
        outcome: action.outcome,
        delta: action.delta,
        chips: action.chips,
        stats: action.stats,
        log: action.log,
        chipAnimation: state.chipAnimation + 1,
        chipTone: action.delta > 0 ? 'up' : 'down',
        chipFrom: state.chips,
        doubled: false,
        bet: state.doubled ? state.bet / 2 : state.bet,
      };
    case 'CHIP_TONE_CLEAR':
      return action.id === state.chipAnimation
        ? { ...state, chipTone: '' }
        : state;
    case 'NEXT_HAND':
      return {
        ...state,
        phase: 'betting',
        target: action.target,
        standAt: action.standAt,
        playerCards: [],
        dealerCards: [],
        dealerShownTotal: null,
        playerAnimIndex: -1,
        dealerAnimIndex: -1,
        holeDown: false,
        lateStand: false,
        nextCard: null,
        deadline: 0,
        remaining: LIMIT_MS,
        outcome: null,
        delta: 0,
        busy: false,
        bet:
          state.bet > state.chips
            ? [...BETS].reverse().find((v) => v <= state.chips) || MIN_BET
            : state.bet,
      };
    case 'FINISH':
      return {
        ...state,
        phase: 'result',
        busy: false,
        deadline: 0,
        stats: action.stats,
        daily: action.daily,
        result: action.result,
      };
    case 'HOME':
      return {
        ...state,
        phase: 'home',
        busy: false,
        deadline: 0,
        stats: action.stats,
        daily: action.daily,
        result: null,
        rankMessage: '',
        shareMessage: '',
        namePrompt: false,
        nameValue: '',
        nameBusy: false,
        nameError: '',
      };
    case 'RANK_TAB':
      return { ...state, rankTab: action.tab, rankStatus: 'loading' };
    case 'RANK_LOADING':
      return { ...state, rankStatus: 'loading' };
    case 'RANK_READY':
      return { ...state, ranking: action.rows, rankStatus: 'ready' };
    case 'RANK_ERROR':
      return { ...state, rankStatus: 'error' };
    case 'RANK_MESSAGE':
      return {
        ...state,
        rankMessage: action.message,
        rankError: action.error === true,
      };
    case 'DAILY_DATA':
      return { ...state, daily: action.daily };
    case 'NAME_PROMPT':
      return { ...state, namePrompt: action.visible, nameError: '' };
    case 'NAME_VALUE':
      return { ...state, nameValue: action.value, nameError: '' };
    case 'NAME_ERROR':
      return {
        ...state,
        nameError: action.message,
        nameBusy: action.busy ?? false,
      };
    case 'NAME_SAVED':
      return {
        ...state,
        nameBusy: false,
        nameError: '',
        stats: action.stats,
        daily: action.daily,
      };
    case 'STATS_SYNCED':
      return { ...state, stats: action.stats, daily: action.daily };
    case 'SHARE_MESSAGE':
      return { ...state, shareMessage: action.message };
    case 'TOAST':
      return { ...state, toast: action.message, toastId: action.id };
    case 'TOAST_CLEAR':
      return action.id === state.toastId ? { ...state, toast: '' } : state;
  }
}

export function seeded(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function createFreeHand(
  mode: Mode,
  pool: BlackjackPlayer[],
  deck: BlackjackPlayer[],
): { source: HandSource; target: number; deck: BlackjackPlayer[] } {
  const nextDeck = deck;
  const draw = () => {
    if (!nextDeck.length) nextDeck.push(...shuffle(pool));
    return nextDeck.pop()!;
  };
  const target =
    Math.round((mode.lo + Math.random() * (mode.hi - mode.lo)) / mode.step) *
    mode.step;
  let a = draw();
  let b = draw();
  for (let k = 0; k < 200 && value(a, mode) + value(b, mode) > target; k++) {
    a = draw();
    b = draw();
  }
  return { source: { pair: [a, b], p: draw, d: draw }, target, deck: nextDeck };
}

export function createDailyHand(
  day: string,
  index: number,
  mode: Mode,
  pool: BlackjackPlayer[],
): { source: HandSource; target: number } {
  const seed = 'bj-' + day + '-' + index;
  const rt = seeded(seed + '-t');
  const rp = seeded(seed + '-p');
  const rd = seeded(seed + '-d');
  const one = (random: () => number, skip: Set<string>): BlackjackPlayer => {
    let card!: BlackjackPlayer;
    for (let k = 0; k < 60; k++) {
      card = pool[Math.floor(random() * pool.length)]!;
      if (!skip.has(card.name)) break;
    }
    return card;
  };
  const target =
    Math.round((mode.lo + rt() * (mode.hi - mode.lo)) / mode.step) * mode.step;
  let a = one(rp, new Set());
  let b = one(rp, new Set([a.name]));
  for (let k = 0; k < 200 && value(a, mode) + value(b, mode) > target; k++) {
    a = one(rp, new Set());
    b = one(rp, new Set([a.name]));
  }
  const used = new Set([a.name, b.name]);
  const seq: BlackjackPlayer[] = [];
  const more = () => {
    const card = one(rp, used);
    used.add(card.name);
    seq.push(card);
  };
  for (let k = 0; k < 20; k++) more();
  const dUsed = new Set(used);
  let n = 0;
  return {
    source: {
      pair: [a, b],
      p: () => {
        if (n >= seq.length) more();
        return seq[n++]!;
      },
      d: () => {
        const card = one(rd, dUsed);
        dUsed.add(card.name);
        return card;
      },
    },
    target,
  };
}

export function value(player: BlackjackPlayer, mode: Mode): number {
  return player[mode.k]!;
}

export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate())
  );
}

export function madridDay(now = new Date()): Date {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const get = (type: string) =>
      +parts.find((part) => part.type === type)!.value;
    return new Date(get('year'), get('month') - 1, get('day'));
  } catch {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

export function emptyStats(): Stats {
  return { best: {}, sent: {}, games: 0, hands: 0 };
}

export function dailyMessage(
  result: DailyResult,
  fmt: (value: number) => string,
): string {
  return result.done
    ? 'Hoy: ' + fmt(result.chips || 0) + ' fichas · vuelve mañana'
    : 'Hoy lo dejaste a medias · vuelve mañana';
}

export function cardTotal(cards: BlackjackPlayer[], mode: Mode): number {
  return cards.reduce((sum, card) => sum + value(card, mode), 0);
}

export function isOver(state: Pick<BlackjackState, 'hand' | 'chips'>): boolean {
  return state.hand >= HANDS || state.chips < MIN_BET;
}

export function shareSummary(outcome: HandOutcome): string {
  if (outcome === 'exact') return '¡Clavado!';
  if (outcome === 'win') return '¡Ganas la mano!';
  if (outcome === 'dbust') return '¡La banca se pasa!';
  if (outcome === 'bust') return 'Te has pasado';
  if (outcome === 'tie') return 'Empate: gana la banca';
  return 'Gana la banca';
}
