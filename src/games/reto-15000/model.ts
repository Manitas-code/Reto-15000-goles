import { retoPlayers } from '../../data/players';
import type { RetoPlayer } from '../../data/player-types';
import {
  goalsFor,
  mulberry,
  multiplierFor,
  N,
  pointsFor,
  seedFrom,
  shuffle,
  SLOTS,
  todayKey,
} from './engine';

export type Pick = {
  player: RetoPlayer;
  goals: number;
  points: number;
  mult: number;
};
export type Result = {
  total: number;
  best: number;
  daily: boolean;
  date: string;
  skips: number;
  slots: Pick[];
  goal: number;
  pass: boolean;
  prevBest: number;
  unlocked: string[];
  newlyUnlocked: string[];
  up: number;
  got: number;
  med: { t: number; ico: string; name: string; rar: string; pct: string };
};
export type RetoToast = {
  id: number;
  icon: string;
  message: string;
  duration: number;
  parts?: { text: string; strong?: boolean }[];
};
export type Rankup = { rank: (typeof ranks)[number]; review: boolean };
export type Phase =
  | 'idle'
  | 'card'
  | 'placing'
  | 'discarding'
  | 'counting'
  | 'result'
  | 'daily-done';
export type RankTab = 'day' | 'all' | 'med' | 'duel';
export type ScorePosition = {
  visible: boolean;
  daily: boolean;
  text: string;
  parts: { text: string; strong?: boolean }[];
  position: number;
  total: number;
  score: number;
  gap?: number;
};
export type Store = Record<string, unknown> & {
  games: number;
  wins: number;
  best: number;
  scores: { t: number; d: string; med: string; daily: boolean }[];
  daily: Record<string, { t: number; med: string }>;
  dailyStart?: Record<string, number>;
  ach: Record<string, string>;
  xp: number;
  sound: boolean;
  sbBest?: number;
  pid?: string;
  name?: string;
};
export type Mode = 'libre' | 'diario' | 'online' | 'enlace';
export type View = 'home' | 'play' | 'result' | 'rank';
export type Model = {
  store: Store;
  mode: Mode;
  view: View;
  game: null | {
    q: RetoPlayer[];
    i: number;
    slots: (Pick | null)[];
    total: number;
    skips: number;
    skipsUsed: number;
    daily: boolean;
    day: string;
    boost: number;
    transition: '' | 'place' | 'skip';
  };
  result: Result | null;
  dailyConfirm: boolean;
  sound: boolean;
  busy: boolean;
  toast: string;
  dailyMessage: string;
  cardReady: boolean;
  counting: boolean;
  countIndex: number;
  countTotal: number;
  phase: Phase;
  currentCard: RetoPlayer | null;
  flip: boolean;
  slotsOpen: boolean;
  flashSlots: number[];
  previewVisible: boolean;
  displayedTotal: number;
  displayedResult: number;
  displayedSlotPoints: number[];
  progressTotal: number;
  slotPoints: number | null;
  recountIndex: number;
  intro: boolean;
  rankUp: Rankup | null;
  review: boolean;
  newlyUnlocked: string[];
  scrollRequest: number;
  confetti: boolean;
  confettiKey: number;
  scoreWorldPosition: ScorePosition | null;
  toasts: RetoToast[];
  rankup: Rankup | null;
  rankTab: RankTab;
  rankRows:
    { name: string; score: number; day?: string; player_id?: string }[] | null;
  rankError: string;
  modal: '' | 'name' | 'share' | 'duel';
  name: string;
  nameError: string;
  nameBusy: boolean;
};

export const KEY = 'reto15k-v2';
export const SKIPS = 2;
export const LEAGUE_SLOTS = [1, 2, 3, 4, 5, 6];
export const ranks = [
  { t: 0, ico: '🪑', name: 'Banquillo', rar: 'Común' },
  { t: 2000, ico: '👟', name: 'Cantera', rar: 'Común' },
  { t: 3500, ico: '⚽', name: 'Suplente', rar: 'Común' },
  { t: 5000, ico: '🥉', name: 'Bronce', rar: 'Común' },
  { t: 6000, ico: '⭐', name: 'Titular', rar: 'Común' },
  { t: 7000, ico: '🥈', name: 'Plata', rar: 'Poco común' },
  { t: 8500, ico: '🎖️', name: 'Pichichi', rar: 'Poco común' },
  { t: 10500, ico: '🥇', name: 'Oro', rar: 'Rara' },
  { t: 12000, ico: '🏅', name: 'Bota de Oro', rar: 'Épica' },
  { t: 13000, ico: '🏆', name: 'Champions', rar: 'Épica' },
  { t: 15000, ico: '👑', name: 'Leyenda', rar: 'Legendaria' },
  { t: 17500, ico: '🌍', name: 'Balón de Oro', rar: 'Mítica' },
  { t: 20000, ico: '🐐', name: 'GOAT', rar: 'Mítica' },
];
export const achievements = [
  ['first', 'Debut', 'Juega tu primera partida', false],
  ['p5', 'Cinco partidas', 'Juega 5 partidas', false],
  ['p25', 'Veinticinco partidas', 'Juega 25 partidas', false],
  ['p100', 'Centenario', 'Juega 100 partidas', false],
  ['b5', 'Bronce', 'Pasa de 5.000 puntos', false],
  ['b7', 'Plata', 'Pasa de 7.000 puntos', false],
  ['b10', 'Oro', 'Pasa de 10.500 puntos', false],
  ['b12', 'Doce mil', 'Pasa de 12.000 puntos', false],
  ['b15', '¡Reto superado!', 'Llega a 15.000 puntos', false],
  ['b20', 'GOAT', 'Llega a 20.000 puntos', false],
  ['total100', 'Cien mil', 'Suma 100.000 puntos en total', false],
  ['big2', 'Jugadón', 'Haz 2.000 puntos en una sola casilla', false],
  ['big4', 'Bombazo', 'Haz 4.000 puntos en una sola casilla', false],
  [
    'final',
    'Final del Mundial',
    'Puntúa en la casilla de la final del Mundial',
    false,
  ],
  ['lib', 'Noche de Libertadores', 'Puntúa en la final de Libertadores', false],
  ['ucl', 'Noche mágica', 'Puntúa en la final de Champions', false],
  ['olimp', 'Gol olímpico', 'Puntúa en la casilla de goles olímpicos', false],
  ['trio', 'Triplete de finales', 'Puntúa en las tres finales a la vez', false],
  ['cab', 'De cabeza', 'Haz 500+ puntos con goles de cabeza', false],
  ['boost', 'Aprovechar el ×5', 'Haz 500+ puntos en la liga con ×5', false],
  [
    'perfect',
    'Colocación perfecta',
    'Saca el máximo posible con tus jugadores',
    false,
  ],
  ['noskip', 'Sin red', 'Termina sin usar ningún descarte', false],
  ['skip2', 'Criba', 'Usa los dos descartes en una partida', false],
  ['zero', 'A quemar', 'Coloca a un jugador que suma 0', false],
  ['zero3', 'Partida maldita', 'Tres casillas a 0 en la misma partida', false],
  ['daily1', 'Primer diario', 'Juega un reto diario', false],
  ['daily7', 'Una semana', 'Juega 7 retos diarios', false],
  ['daily30', 'Un mes entero', 'Juega 30 retos diarios', false],
  ['streak3', 'En racha', '3 partidas seguidas de 8.000+', false],
  ['streak5', 'Imparable', '5 partidas seguidas de 8.000+', false],
  ['meds6', 'Vitrina', 'Consigue 6 medallas distintas', false],
  [
    'x_clasico',
    'El Clásico',
    'Coloca a Messi y a Cristiano en la misma partida',
    true,
  ],
  [
    'x_capicua',
    'Capicúa',
    'Termina con una puntuación capicúa de 4 cifras o más',
    true,
  ],
  [
    'x_banquillo',
    'Plantilla de bajas',
    'Descarta a dos jugadores y aun así pasa de 9.000',
    true,
  ],
  [
    'x_paseo',
    'Paseo militar',
    'Que ninguna de las 17 casillas se quede a 0',
    true,
  ],
  [
    'x_remontada',
    'Remontada',
    'Supera tu récord por más de 2.000 puntos de golpe',
    true,
  ],
] as const;
export const fmt = (n: number) => Math.round(n).toLocaleString('es-ES');
export function rankIndex(best: number) {
  let index = 0;
  ranks.forEach((rank, i) => {
    if (best >= rank.t) index = i;
  });
  return index;
}
export function blankStore(input: unknown): Store {
  const source =
    input && typeof input === 'object' ? (input as Partial<Store>) : {};
  return {
    ...source,
    games: source.games || 0,
    wins: source.wins || 0,
    best: source.best || 0,
    scores: Array.isArray(source.scores) ? source.scores.slice() : [],
    daily:
      source.daily && typeof source.daily === 'object'
        ? { ...source.daily }
        : {},
    dailyStart:
      source.dailyStart && typeof source.dailyStart === 'object'
        ? { ...source.dailyStart }
        : undefined,
    ach: source.ach && typeof source.ach === 'object' ? { ...source.ach } : {},
    xp: source.xp || 0,
    sound: source.sound === undefined ? true : source.sound,
  } as Store;
}
export function loadModel(): Model {
  let raw: unknown = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    /* Keep an empty local game if storage is unavailable. */
  }
  const store = blankStore(raw);
  return {
    store,
    mode: 'libre',
    view: 'home',
    game: null,
    result: null,
    dailyConfirm: false,
    sound: store.sound,
    busy: false,
    toast: '',
    dailyMessage: '',
    cardReady: false,
    counting: false,
    countIndex: -1,
    countTotal: 0,
    phase: 'idle',
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
    intro: false,
    toasts: [],
    rankup: null,
    rankUp: null,
    review: false,
    newlyUnlocked: [],
    scrollRequest: 0,
    confetti: false,
    confettiKey: 0,
    scoreWorldPosition: null,
    rankTab: 'day',
    rankRows: null,
    rankError: '',
    modal: '',
    name: store.name || '',
    nameError: '',
    nameBusy: false,
  };
}
export function persist(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* Storage is optional. */
  }
}
let freeDeck: number[] = [];
export function makeGame(
  mode: Mode,
  day = todayKey(),
  duelSeed?: string,
): Model['game'] {
  const daily = mode === 'diario';
  const seed = daily ? day : duelSeed ? 'duelo:' + duelSeed : null;
  const rand = seed ? mulberry(seedFrom(seed)) : null;
  const q: RetoPlayer[] = [];
  while (q.length < N + SKIPS) {
    if (rand) {
      const indices = shuffle(
        retoPlayers.map((_, i) => i),
        rand,
      ).slice(0, N + SKIPS);
      q.push(...indices.map((i) => retoPlayers[i]!));
      break;
    }
    if (!freeDeck.length) freeDeck = shuffle(retoPlayers.map((_, i) => i));
    const i = freeDeck.pop();
    if (i !== undefined && !q.includes(retoPlayers[i]!))
      q.push(retoPlayers[i]!);
  }
  const boost =
    LEAGUE_SLOTS[
      Math.floor((rand ? rand() : Math.random()) * LEAGUE_SLOTS.length)
    ]!;
  return {
    q,
    i: 0,
    slots: new Array(N).fill(null),
    total: 0,
    skips: SKIPS,
    skipsUsed: 0,
    daily,
    day,
    boost,
    transition: '',
  };
}
export function placePlayer(game: NonNullable<Model['game']>, index: number) {
  const player = game.q[game.i]!;
  const mult = multiplierFor(index, game.boost),
    goals = goalsFor(player, index),
    points = pointsFor(player, index, mult);
  const slots = game.slots.slice();
  slots[index] = { player, goals, points, mult };
  return { ...game, slots, total: game.total + points, i: game.i + 1 };
}
export function optimalScore(game: NonNullable<Model['game']>) {
  const pts = game.q
    .slice(0, N)
    .map((p) =>
      SLOTS.map((_, i) => pointsFor(p, i, multiplierFor(i, game.boost))),
    );
  const full = (1 << N) - 1,
    dp = new Float64Array(1 << N).fill(-1),
    pc = new Uint8Array(1 << N);
  dp[0] = 0;
  for (let mask = 1; mask <= full; mask++)
    pc[mask] = pc[mask >> 1]! + (mask & 1);
  for (let mask = 0; mask < full; mask++)
    if (dp[mask]! >= 0) {
      const row = pts[pc[mask]!]!;
      for (let slot = 0; slot < N; slot++)
        if (!(mask & (1 << slot))) {
          const next = mask | (1 << slot);
          dp[next] = Math.max(dp[next]!, dp[mask]! + row[slot]!);
        }
    }
  return dp[full]!;
}
