import {
  registerIdentity,
  renameIdentity,
  retoRpc,
  getRetoRanking,
  postRetoScore,
} from '../../shared/api';
import type { RetoRpcName, RetoRpcCall } from '../../../contracts/reto';
function sbCall<T = unknown>(
  name: RetoRpcName,
  args?: unknown,
): Promise<T | null> {
  return retoRpc<T>(...([name, args || {}] as RetoRpcCall));
}
import { retoPlayers as PLAYERS } from '../../data/players';
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
import { $ } from './dom';
import type { RetoPlayer } from '../../data/player-types';
import type {
  DuelLinkMine,
  DuelMeResponse,
  DuelTopEntry,
  LinkCompareData,
  LinkData,
  LinkPlay,
  LinkStartResponse,
  OnlineState,
  QueueResponse,
  RematchResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  RoomPeekResponse,
  SeasonInfoResponse,
} from './rpc-types';

type SlotPick = { p: RetoPlayer; goals: number; pts: number; mult: number };
type GameState = {
  q: RetoPlayer[];
  i: number;
  slots: Array<SlotPick | null>;
  total: number;
  skips: number;
  skipsUsed: number;
  daily: boolean;
  day: string;
  duelKind: 'online' | 'enlace' | null;
  boost: number;
};
type ScoreRecord = { t: number; d: string; med: string; daily: boolean };
type GameStore = {
  games: number;
  wins: number;
  best: number;
  scores: ScoreRecord[];
  daily: Record<string, { t: number; med: string }>;
  dailyStart?: Record<string, number>;
  ach: Record<string, string>;
  xp: number;
  sound: boolean;
  sbBest?: number;
  pid?: string;
  name?: string;
  lastDiv?: string;
  linkSeen?: Record<string, number>;
  seasonSeen?: number;
};
type Rank = { t: number; ico: string; name: string; rar: string };
type ResultState = {
  t: number;
  goal: number;
  pass: boolean;
  best: number;
  med: Rank & { pct: string };
  slots: Array<SlotPick & { i: number }>;
  skipsUsed: number;
  daily: boolean;
  prevBest: number;
  date: string;
};
type Achievement = {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
  test: (result: ResultState) => boolean;
};
type BotResult = {
  score: number;
  slots: Array<[string, number] | undefined>;
  times: number[];
  finishAt: number;
};
type WorldInfo = {
  elo: number;
  pos: number | null;
  games: number;
  elo50: number | null;
};
type DuelState = {
  kind: 'online' | 'enlace';
  private?: boolean;
  seed?: string;
  id?: string;
  rivalName?: string;
  role?: 'creator' | 'rival';
  creator?: string;
  code?: string;
  t0?: number;
  botTimer?: ReturnType<typeof setTimeout>;
  botView?: ReturnType<typeof setTimeout>;
  poll?: number | null;
  revealed?: boolean;
  started?: boolean;
  submitted?: boolean;
  polling?: boolean;
  readyShown?: boolean;
  shownDone?: boolean;
  rmBeep?: boolean;
  rk?: string;
  state?: DuelSnapshot;
  bot?: BotResult;
  botReq?: Promise<unknown>;
  req?: Promise<unknown>;
  myScore?: number;
  mySlots?: Array<[string, number]>;
  link?: LinkCompareData;
  prev?: WorldInfo | null;
  topReq?: Promise<void>;
  topAfter?: DuelTopEntry[];
  move?: string;
  celebrated?: boolean;
  err?: boolean;
  saved?: boolean;
  [key: string]: unknown;
};
type DuelSnapshot = OnlineState;
type RankingRow = {
  name: string;
  score: number;
  day?: string;
  show_at?: string | null;
  player_id?: string;
  daily?: boolean;
};
type Division = { t: number; ico: string; name: string; top?: number };
type BotPlan = { q: RetoPlayer[]; boost: number };
type BotOutcome = {
  total: number;
  slots: Array<[string, number] | undefined>;
  best?: number;
};
type OptimalAssignment = { pts: number[][]; slotOf: number[]; best: number };

export function initReto(): void {
  'use strict';

  const POS_NAME = { DEF: 'Defensa', MED: 'Centrocampista', DEL: 'Delantero' };

  const fmt = (n: number) => Math.round(n).toLocaleString('es-ES');
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  const wait = (ms: number) =>
    new Promise<void>((r) => setTimeout(r, reduceMotion ? 0 : ms));
  function target() {
    return 15000;
  }

  function countTo(el: HTMLElement, to: number, dur = 600): Promise<void> {
    const from = Number(el.dataset.v || 0);
    if (reduceMotion || from === to) {
      el.textContent = fmt(to);
      el.dataset.v = String(to);
      return Promise.resolve();
    }
    const t0 = performance.now();
    return new Promise<void>((res) => {
      function step(t: number): void {
        const p = Math.min(1, (t - t0) / dur),
          e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
        else {
          el.textContent = fmt(to);
          el.dataset.v = String(to);
          res();
        }
      }
      requestAnimationFrame(step);
    });
  }

  // ---- almacenamiento ----
  const KEY = 'reto15k-v2';
  function load(): GameStore {
    try {
      return (
        JSON.parse(localStorage.getItem(KEY) || 'null') || ({} as GameStore)
      );
    } catch {
      return {} as GameStore;
    }
  }
  function save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* Ignore unavailable or full local storage, as before. */
    }
  }
  const store = load() as GameStore;
  store.games = store.games || 0;
  store.wins = store.wins || 0;
  store.best = store.best || 0;
  store.scores = store.scores || [];
  store.daily = store.daily || {};
  store.ach = store.ach || {};
  store.xp = store.xp || 0;
  if (store.sound === undefined) store.sound = true;

  // ---- medallas, niveles y logros ----
  const RANKS: Rank[] = [
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
  // % de partidas que llegan a cada medalla. Simulación de 110 millones de partidas con los puntos a la vista
  // (misma lógica: 17 casillas, liga ×5 y 2 descartes): mitad jugadores que colocan en la mejor casilla
  // (mediana 7.000) y mitad que además comparan con lo que suele dar cada casilla y usan los descartes (mediana 8.350).
  const PCT: Record<number, string> = {
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
  function rankIdx(best: number) {
    let i = 0;
    for (let k = 0; k < RANKS.length; k++) if (best >= RANKS[k].t) i = k;
    return i;
  }
  const RARCOL: Record<string, string> = {
    Mítica: '#ff6b5c',
    Legendaria: '#f3c545',
    Épica: '#c084fc',
    Rara: '#63e0a1',
    'Poco común': '#7dd3fc',
    Común: 'rgba(245,248,243,.6)',
  };
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
  function levelOf(xp: number) {
    let i = 0;
    while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1]) i++;
    return i;
  }
  const has = (r: ResultState, i: number) => r.slots[i] && r.slots[i].pts > 0;
  const ACH: Achievement[] = [
    // primeros pasos
    {
      id: 'first',
      name: 'Debut',
      desc: 'Juega tu primera partida',
      test: () => true,
    },
    {
      id: 'p5',
      name: 'Cinco partidas',
      desc: 'Juega 5 partidas',
      test: () => store.games >= 5,
    },
    {
      id: 'p25',
      name: 'Veinticinco partidas',
      desc: 'Juega 25 partidas',
      test: () => store.games >= 25,
    },
    {
      id: 'p100',
      name: 'Centenario',
      desc: 'Juega 100 partidas',
      test: () => store.games >= 100,
    },
    // puntuación
    {
      id: 'b5',
      name: 'Bronce',
      desc: 'Pasa de 5.000 puntos',
      test: (r) => r.t >= 5000,
    },
    {
      id: 'b7',
      name: 'Plata',
      desc: 'Pasa de 7.000 puntos',
      test: (r) => r.t >= 7000,
    },
    {
      id: 'b10',
      name: 'Oro',
      desc: 'Pasa de 10.500 puntos',
      test: (r) => r.t >= 10500,
    },
    {
      id: 'b12',
      name: 'Doce mil',
      desc: 'Pasa de 12.000 puntos',
      test: (r) => r.t >= 12000,
    },
    {
      id: 'b15',
      name: '¡Reto superado!',
      desc: 'Llega a 15.000 puntos',
      test: (r) => r.t >= 15000,
    },
    {
      id: 'b20',
      name: 'GOAT',
      desc: 'Llega a 20.000 puntos',
      test: (r) => r.t >= 20000,
    },
    {
      id: 'total100',
      name: 'Cien mil',
      desc: 'Suma 100.000 puntos en total',
      test: () => store.xp >= 100000,
    },
    // jugadas
    {
      id: 'big2',
      name: 'Jugadón',
      desc: 'Haz 2.000 puntos en una sola casilla',
      test: (r) => r.slots.some((x) => x.pts >= 2000),
    },
    {
      id: 'big4',
      name: 'Bombazo',
      desc: 'Haz 4.000 puntos en una sola casilla',
      test: (r) => r.slots.some((x) => x.pts >= 4000),
    },
    {
      id: 'final',
      name: 'Final del Mundial',
      desc: 'Puntúa en la casilla de la final del Mundial',
      test: (r) => has(r, 16),
    },
    {
      id: 'lib',
      name: 'Noche de Libertadores',
      desc: 'Puntúa en la final de Libertadores',
      test: (r) => has(r, 15),
    },
    {
      id: 'ucl',
      name: 'Noche mágica',
      desc: 'Puntúa en la final de Champions',
      test: (r) => has(r, 14),
    },
    {
      id: 'olimp',
      name: 'Gol olímpico',
      desc: 'Puntúa en la casilla de goles olímpicos',
      test: (r) => has(r, 12),
    },
    {
      id: 'trio',
      name: 'Triplete de finales',
      desc: 'Puntúa en las tres finales a la vez',
      test: (r) => has(r, 14) && has(r, 15) && has(r, 16),
    },
    {
      id: 'cab',
      name: 'De cabeza',
      desc: 'Haz 500+ puntos con goles de cabeza',
      test: (r) => r.slots[11] && r.slots[11].pts >= 500,
    },
    {
      id: 'boost',
      name: 'Aprovechar el ×5',
      desc: 'Haz 500+ puntos en la liga con ×5',
      test: (r) => r.slots.some((x) => x.mult === 5 && x.pts >= 500),
    },
    // estilo de juego
    {
      id: 'perfect',
      name: 'Colocación perfecta',
      desc: 'Saca el máximo posible con tus jugadores',
      test: (r) => r.t >= r.best,
    },
    {
      id: 'noskip',
      name: 'Sin red',
      desc: 'Termina sin usar ningún descarte',
      test: (r) => r.skipsUsed === 0,
    },
    {
      id: 'skip2',
      name: 'Criba',
      desc: 'Usa los dos descartes en una partida',
      test: (r) => r.skipsUsed === 2,
    },
    {
      id: 'zero',
      name: 'A quemar',
      desc: 'Coloca a un jugador que suma 0',
      test: (r) => r.slots.some((x) => x.pts === 0),
    },
    {
      id: 'zero3',
      name: 'Partida maldita',
      desc: 'Tres casillas a 0 en la misma partida',
      test: (r) => r.slots.filter((x) => x.pts === 0).length >= 3,
    },
    // constancia
    {
      id: 'daily1',
      name: 'Primer diario',
      desc: 'Juega un reto diario',
      test: (r) => r.daily,
    },
    {
      id: 'daily7',
      name: 'Una semana',
      desc: 'Juega 7 retos diarios',
      test: () => Object.keys(store.daily).length >= 7,
    },
    {
      id: 'daily30',
      name: 'Un mes entero',
      desc: 'Juega 30 retos diarios',
      test: () => Object.keys(store.daily).length >= 30,
    },
    {
      id: 'streak3',
      name: 'En racha',
      desc: '3 partidas seguidas de 8.000+',
      test: () =>
        store.scores.slice(-3).length === 3 &&
        store.scores.slice(-3).every((s) => s.t >= 8000),
    },
    {
      id: 'streak5',
      name: 'Imparable',
      desc: '5 partidas seguidas de 8.000+',
      test: () =>
        store.scores.slice(-5).length === 5 &&
        store.scores.slice(-5).every((s) => s.t >= 8000),
    },
    {
      id: 'meds6',
      name: 'Vitrina',
      desc: 'Consigue 6 medallas distintas',
      test: () =>
        new Set(store.scores.map((s) => s.med).filter(Boolean)).size >= 6,
    },
    // ocultos
    {
      id: 'x_clasico',
      name: 'El Clásico',
      desc: 'Coloca a Messi y a Cristiano en la misma partida',
      hidden: true,
      test: (r) =>
        r.slots.some((x) => x.p.name === 'Lionel Messi') &&
        r.slots.some((x) => x.p.name === 'Cristiano Ronaldo'),
    },
    {
      id: 'x_capicua',
      name: 'Capicúa',
      desc: 'Termina con una puntuación capicúa de 4 cifras o más',
      hidden: true,
      test: (r) => {
        const s = String(Math.round(r.t));
        return s.length >= 4 && s === s.split('').reverse().join('');
      },
    },
    {
      id: 'x_banquillo',
      name: 'Plantilla de bajas',
      desc: 'Descarta a dos jugadores y aun así pasa de 9.000',
      hidden: true,
      test: (r) => r.skipsUsed === 2 && r.t >= 9000,
    },
    {
      id: 'x_paseo',
      name: 'Paseo militar',
      desc: 'Que ninguna de las 17 casillas se quede a 0',
      hidden: true,
      test: (r) => r.slots.every((x) => x.pts > 0),
    },
    {
      id: 'x_remontada',
      name: 'Remontada',
      desc: 'Supera tu récord por más de 2.000 puntos de golpe',
      hidden: true,
      test: (r) => r.prevBest > 0 && r.t >= r.prevBest + 2000,
    },
  ];

  // ---- sonido ----
  let actx: AudioContext | null = null;
  function beep(type: 'place' | 'skip' | 'big' | 'win' | 'lose') {
    if (!store.sound) return;
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) return;
      actx = actx || new AudioContextCtor();
      const audio = actx;
      if (audio.state === 'suspended') audio.resume();
      const seq: number[][] = {
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
      }[type] || [[440, 0]];
      seq.forEach(([f, d]) => {
        const o = audio.createOscillator(),
          g = audio.createGain(),
          t0 = audio.currentTime + d;
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        o.connect(g);
        g.connect(audio.destination);
        o.start(t0);
        o.stop(t0 + 0.25);
      });
    } catch {
      /* Preserve the existing silent fallback. */
    }
  }
  $('btnSound').textContent = store.sound ? '🔊' : '🔇';
  $('btnSound').addEventListener('click', () => {
    store.sound = !store.sound;
    save();
    $('btnSound').textContent = store.sound ? '🔊' : '🔇';
    if (store.sound) beep('place');
  });

  // ---- azar con semilla (reto diario) ----
  let mode = 'libre';

  // ---- mazo ----
  let deck: number[] = [];
  function drawMany(n: number, rnd: (() => number) | null): RetoPlayer[] {
    if (rnd) {
      const idx = shuffle(
        PLAYERS.map((_, i) => i),
        rnd,
      ).slice(0, n);
      return idx.map((i) => PLAYERS[i]);
    }
    const out: number[] = [];
    while (out.length < n) {
      if (!deck.length) deck = shuffle(PLAYERS.map((_, i) => i));
      const i = deck.pop();
      if (i !== undefined && !out.includes(i)) out.push(i);
    }
    return out.map((i) => PLAYERS[i]!);
  }
  function tierOf(p: RetoPlayer) {
    const c = Number(p.v[9]) || 0;
    return c >= 350 ? 't-gold' : c >= 120 ? 't-silver' : 't-bronze';
  }

  // ---- tablero ----
  const board = $('board');
  const slotEls = SLOTS.map((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.dataset.i = String(i);
    b.disabled = true;
    b.innerHTML =
      '<span class="ico" aria-hidden="true">' +
      s.ico +
      '</span><span class="lab"><span class="lt">' +
      s.label +
      '</span><span class="mul">×' +
      s.mult +
      '</span></span><span class="who">Libre</span><span class="gl"></span><span class="pts" data-v="0"></span>';
    li.appendChild(b);
    board.appendChild(li);
    return b;
  });

  let game: GameState | null = null,
    busy = false;
  function getGame(): GameState {
    if (!game) throw new Error('Reto game state is not initialized');
    return game;
  }
  const LEAGUE_SLOTS = [1, 2, 3, 4, 5, 6];
  function multOf(i: number) {
    return multiplierFor(i, game ? getGame().boost : null);
  }
  function paintMults() {
    slotEls.forEach((b, i) => {
      b.querySelector<HTMLElement>('.mul')!.textContent = '×' + multOf(i);
      b.classList.toggle('boost', !!game && i === getGame().boost);
    });
  }

  function resetBoard() {
    slotEls.forEach((b) => {
      b.className = 'slot';
      b.disabled = true;
      b.removeAttribute('title');
      b.querySelector<HTMLElement>('.who')!.textContent = 'Libre';
      b.querySelector<HTMLElement>('.gl')!.textContent = '';
      b.querySelector<HTMLElement>('.gl')!.removeAttribute('title');
      const p = b.querySelector<HTMLElement>('.pts')!;
      p.textContent = '';
      p.dataset.v = '0';
      p.className = 'pts';
    });
    $('total').textContent = '0';
    $('total').dataset.v = '0';
    $('total').classList.remove('gold');
    $('dockTotal').hidden = true;
    $('progress').hidden = true;
    $('medal').hidden = true;
    $('unlocked').hidden = true;
    setProgress(0);
    $('result').hidden = true;
    $('duelRes').hidden = true;
    $('duelRes').innerHTML = '';
  }
  function setProgress(t: number) {
    const goal = target(),
      pct = Math.min(100, (100 * t) / goal);
    const pr = $('progress');
    pr.querySelector<HTMLElement>('i')!.style.width = pct + '%';
    pr.classList.toggle('over', t >= goal);
    $('pctLabel').textContent =
      t >= goal ? 'Objetivo superado' : fmt(goal - t) + ' para el objetivo';
    $('total').classList.toggle('gold', t >= goal);
  }

  // ---- vista previa: lo que daría el jugador de la carta en cada casilla libre ----
  const golesTxt = (g: number) => (g === 1 ? '1 gol' : fmt(g) + ' goles');
  // "Antoine Griezmann" → "A. Griezmann": cabe en la casilla junto a los puntos
  // (apodo entre «» si lo tiene; si aun así es largo, solo el apellido)
  function shortName(n: string) {
    const nick = n.match(/«(.+?)»/);
    if (nick) return nick[1];
    const w = n.split(' ');
    if (n.length <= 14 || w.length < 2) return n;
    const s = w[0][0] + '. ' + w.slice(1).join(' ');
    return s.length <= 15 ? s : w[w.length - 1];
  }
  function previewPts(p: RetoPlayer, i: number) {
    return pointsFor(p, i, multOf(i));
  }
  function paintPreview(p: RetoPlayer) {
    // la mejor casilla para ESTE jugador se marca siempre, aunque dé pocos puntos
    let top = 0;
    slotEls.forEach((b, i) => {
      if (!getGame().slots[i]) top = Math.max(top, previewPts(p, i));
    });
    slotEls.forEach((b, i) => {
      if (getGame().slots[i]) return;
      const goals = goalsFor(p, i),
        pts = previewPts(p, i),
        pe = b.querySelector<HTMLElement>('.pts')!;
      b.classList.toggle('nil', pts === 0);
      b.classList.toggle('best', top > 0 && pts === top);
      b.classList.toggle('big', pts >= 1000);
      b.classList.toggle('mid', pts >= 300 && pts < 1000);
      // los goles, solo la cifra (el balón lo pinta el CSS); el texto completo queda en el title
      const gl = b.querySelector<HTMLElement>('.gl')!;
      gl.textContent = fmt(goals);
      gl.title = golesTxt(goals);
      pe.textContent = pts ? '+' + fmt(pts) : '0';
      pe.dataset.v = String(pts);
      pe.className =
        'pts preview' +
        (pts ? (pts >= 1000 ? ' hot' : pts >= 300 ? ' mid' : '') : ' nil');
    });
  }
  function clearPreview() {
    slotEls.forEach((b, i) => {
      if (game && getGame().slots[i]) return;
      b.classList.remove('nil', 'big', 'mid', 'best');
      b.querySelector<HTMLElement>('.gl')!.textContent = '';
      b.querySelector<HTMLElement>('.gl')!.removeAttribute('title');
      const pe = b.querySelector<HTMLElement>('.pts')!;
      pe.textContent = '';
      pe.dataset.v = '0';
      pe.className = 'pts';
    });
  }

  const SKIPS = 2;
  let dailyOk = false;
  function newGame() {
    const daily = mode === 'diario',
      day = todayKey();
    if (daily && (store.daily[day] || (store.dailyStart || {})[day])) {
      showDailyDone();
      return;
    }
    if (daily && !dailyOk) {
      duelModal({
        ico: '📅',
        tit: 'Reto diario',
        txt: 'Tienes <b>un solo intento</b> al día. Si sales a medias o cierras la página, cuenta como jugado y no podrás volver a entrar hasta mañana.',
        buttons: [
          {
            label: 'Empezar',
            fn: () => {
              closeDuelModal();
              dailyOk = true;
              newGame();
              dailyOk = false;
            },
          },
          {
            label: 'Ahora no',
            ghost: true,
            fn: () => {
              closeDuelModal();
              goHome();
            },
          },
        ],
      });
      return;
    }
    const dk =
      duel && (mode === 'online' || mode === 'enlace') ? duel.kind : null;
    const seedStr = daily ? day : dk ? 'duelo:' + duel!.seed : null;
    const rnd = seedStr ? mulberry(seedFrom(seedStr)) : null;
    const q = drawMany(N + SKIPS, rnd);
    if (daily) {
      store.dailyStart = {};
      store.dailyStart[day] = 1;
      save();
    }
    game = {
      q,
      i: 0,
      slots: new Array(N).fill(null),
      total: 0,
      skips: SKIPS,
      skipsUsed: 0,
      daily,
      day,
      duelKind: dk,
      boost:
        LEAGUE_SLOTS[
          Math.floor((rnd ? rnd() : Math.random()) * LEAGUE_SLOTS.length)
        ],
    };
    resetBoard();
    paintMults();
    paintSkips();
    $('dockTotal').hidden = false;
    document.body.classList.add('playing');
    window.scrollTo(0, 0);
    intro(daily);
    $('dailyBar').hidden = !daily && !dk;
    if (daily)
      $('dailyBar').textContent =
        'Reto diario del ' +
        day.split('-').reverse().join('/') +
        ' · mismos 17 jugadores para todo el mundo, una sola partida';
    if (dk) $('dailyBar').textContent = duelBarText();
    $('duelBar').hidden = dk !== 'online';
    if (dk === 'online') paintRival(0);
    $('skips').hidden = false;
    showCard();
  }
  function paintSkips() {
    $('btnSkip').disabled = !game || getGame().skips <= 0;
    $('skipDots').textContent = game
      ? 'Descartes: ' +
        '●'.repeat(getGame().skips) +
        '○'.repeat(SKIPS - getGame().skips)
      : '';
  }
  function showDailyDone() {
    const d = store.daily[todayKey()];
    game = null;
    resetBoard();
    paintMults();
    paintSkips();
    document.body.classList.remove('playing');
    document.body.classList.add('done');
    $('skips').hidden = true;
    $('dailyBar').hidden = false;
    $('dailyBar').textContent = d
      ? 'Ya has jugado el reto diario de hoy: ' +
        fmt(d.t) +
        ' puntos. Vuelve mañana.'
      : 'Empezaste el reto diario de hoy y lo dejaste a medias: cuenta como jugado. Vuelve mañana.';
    $('step').textContent = 'Reto diario completado';
    $('cta').textContent = 'Cambia a partida libre para seguir jugando.';
    $('flip').classList.remove('flipped');
    slotEls.forEach((b) => {
      b.disabled = true;
      b.classList.remove('open');
    });
  }
  function skipPlayer() {
    if (
      !game ||
      busy ||
      getGame().skips <= 0 ||
      getGame().i >= getGame().q.length - 1
    )
      return;
    beep('skip');
    getGame().skips--;
    getGame().skipsUsed++;
    getGame().q.splice(getGame().i, 1);
    busy = true;
    clearPickTimer();
    slotEls.forEach((b) => {
      b.disabled = true;
      b.classList.remove('open');
    });
    clearPreview();
    paintSkips();
    $('btnSkip').disabled = true;
    $('flip').classList.remove('flipped');
    const g = game;
    setTimeout(() => {
      busy = false;
      if (game === g) {
        paintSkips();
        showCard();
      }
    }, 320);
  }
  $('btnSkip').addEventListener('click', skipPlayer);

  function intro(daily: boolean) {
    const el = $('intro');
    $('introTit').textContent =
      getGame().duelKind === 'online'
        ? 'DUELO ONLINE'
        : getGame().duelKind === 'enlace'
          ? 'RETO A UN AMIGO'
          : daily
            ? 'RETO DIARIO'
            : 'PARTIDA LIBRE';
    $('introSub').textContent =
      'Liga ×5 de hoy: ' + SLOTS[getGame().boost].label;
    el.hidden = false;
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
    beep('big');
    setTimeout(
      () => {
        el.hidden = true;
      },
      reduceMotion ? 10 : 1500,
    );
  }
  async function showCard() {
    const p = getGame().q[getGame().i];
    if (!p) return finish();
    $('cFlag').textContent = p.flag;
    $('cName').textContent = p.name;
    $('cPos').textContent = POS_NAME[p.pos] || '';
    $('cardBack').className = 'face back ' + tierOf(p);
    $('step').textContent = 'Jugador ' + (getGame().i + 1) + ' de ' + N;
    $('cta').innerHTML =
      (getGame().i === 0
        ? 'Esta partida <b>' + SLOTS[getGame().boost].label + '</b> vale ×5. '
        : '') +
      '¿Dónde colocas a <b>' +
      p.name +
      '</b>?';
    $('flip').classList.add('flipped');
    paintPreview(p);
    startPickTimer();
    await wait(200);
    slotEls.forEach((b, i) => {
      if (!getGame().slots[i]) {
        b.disabled = false;
        b.classList.add('open');
      }
    });
  }

  async function place(i: number) {
    if (!game || busy || getGame().slots[i]) return;
    busy = true;
    clearPickTimer();
    slotEls.forEach((b2) => {
      b2.disabled = true;
      b2.classList.remove('open');
    });
    const p = getGame().q[getGame().i],
      s = SLOTS[i];
    const mult = multOf(i),
      goals = goalsFor(p, i),
      pts = pointsFor(p, i, mult);
    getGame().slots[i] = { p, goals, pts, mult };
    getGame().total += pts;
    const b = slotEls[i],
      ptsEl = b.querySelector<HTMLElement>('.pts')!;
    clearPreview();
    b.classList.remove('nil', 'big', 'mid', 'best');
    b.classList.add('filled', 'flash');
    beep(pts >= 1500 ? 'big' : 'place');
    b.querySelector<HTMLElement>('.who')!.textContent = shortName(p.name);
    b.title = p.name;
    b.querySelector<HTMLElement>('.gl')!.textContent = '';
    b.querySelector<HTMLElement>('.gl')!.removeAttribute('title');
    ptsEl.textContent = fmt(pts);
    ptsEl.dataset.v = String(pts);
    ptsEl.className =
      'pts' +
      (pts === 0 ? ' zero' : '') +
      (pts >= 1000 ? ' big' : pts >= 300 ? ' mid' : '') +
      (pts >= 10000 ? ' xl' : '');
    countTo($('total'), getGame().total, 350);
    setProgress(getGame().total);
    $('cta').innerHTML =
      '<b>' +
      p.name +
      '</b> → ' +
      (s.ico ? s.ico + ' ' : '') +
      '<span>' +
      s.label +
      '</span> <b>+' +
      fmt(pts) +
      '</b>';
    $('flip').classList.remove('flipped');
    await wait(260);
    b.classList.remove('flash');
    getGame().i++;
    paintSkips();
    duelProgress();
    if (getGame().slots.filter(Boolean).length < N) {
      await showCard();
    } else finish();
    busy = false;
  }

  function optimalTotal() {
    const pts = getGame().q.map((p) =>
      SLOTS.map((s, i) => pointsFor(p, i, multOf(i))),
    );
    const full = (1 << N) - 1,
      dp = new Float64Array(1 << N).fill(-1),
      pc = new Uint8Array(1 << N);
    for (let m = 1; m <= full; m++) pc[m] = pc[m >> 1] + (m & 1);
    dp[0] = 0;
    for (let m = 0; m < full; m++) {
      if (dp[m] < 0) continue;
      const i = pc[m],
        row = pts[i],
        base = dp[m];
      for (let s = 0; s < N; s++) {
        if (m & (1 << s)) continue;
        const nm = m | (1 << s),
          v = base + row[s];
        if (v > dp[nm]) dp[nm] = v;
      }
    }
    return dp[full];
  }

  let lastResult: ResultState | null = null,
    counting = false;
  async function finish() {
    const t = getGame().total,
      goal = target(),
      best = optimalTotal();
    counting = true; // hasta guardar el resultado no se puede cambiar de modo
    clearPickTimer();
    $('duelBar').hidden = true;
    if (getGame().duelKind) duelSubmit(t);
    document.body.classList.remove('playing');
    document.body.classList.add('done');
    $('skips').hidden = true;
    $('step').textContent = 'Recuento';
    $('cta').textContent = 'Sumando tus 17 casillas…';
    $('dockTotal').hidden = false;
    $('progress').hidden = false;
    $('p-play').scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    // los puntos ya se veían durante la partida: el recuento es un repaso rápido (≈1,5 s)
    $('total').dataset.v = '0';
    $('total').textContent = '0';
    setProgress(0);
    await wait(250);
    const stepMs = 70,
      tot = countTo($('total'), t, N * stepMs + 250);
    let run = 0;
    for (let i = 0; i < N; i++) {
      const x = getGame().slots[i]!,
        b = slotEls[i],
        pe = b.querySelector<HTMLElement>('.pts')!;
      b.classList.remove('nil', 'big', 'mid', 'best');
      b.classList.add('flash');
      b.querySelector<HTMLElement>('.gl')!.textContent = '';
      b.querySelector<HTMLElement>('.who')!.textContent =
        x.p.flag + ' ' + x.p.name + '  ·  ' + fmt(x.goals) + ' × ' + x.mult;
      pe.className =
        'pts' +
        (x.pts === 0 ? ' zero' : '') +
        (x.pts >= 1000 ? ' big' : x.pts >= 300 ? ' mid' : '');
      pe.dataset.v = '0';
      countTo(pe, x.pts, 300);
      run += x.pts;
      setProgress(run);
      setTimeout(
        () => b.classList.remove('flash'),
        reduceMotion ? 0 : stepMs * 4,
      );
      await wait(stepMs);
    }
    await tot;
    setProgress(t);
    counting = false;
    $('step').textContent = 'Partida terminada';
    $('cta').textContent = 'Este ha sido tu resultado.';
    $('rNum').dataset.v = '0';
    $('rNum').textContent = '0';
    $('result').hidden = false;
    countTo($('rNum'), t, 1000);
    const v = $('rVerdict'),
      pass = t >= goal;
    v.textContent = pass
      ? '¡Reto superado!'
      : 'No llegas: te faltan ' + fmt(goal - t);
    v.className = 'verdict ' + (pass ? 'pass' : 'fail');
    $('rOpt').textContent =
      best > t
        ? 'La mejor colocación posible de estos 17 daba ' +
          fmt(best) +
          ' puntos' +
          (best >= goal && !pass ? ', suficientes para el reto.' : '.')
        : 'Colocación perfecta: no se podía sacar más con estos 17.';
    const sum = $('summary');
    sum.innerHTML = '';
    getGame()
      .slots.map((x, i) => ({ x: x!, i }))
      .sort((a, b) => b.x.pts - a.x.pts)
      .forEach(({ x, i }, k) => {
        const li = document.createElement('li');
        if (k < 3 && x.pts > 0) li.className = 'top';
        li.innerHTML =
          '<span>' +
          (SLOTS[i].ico ? SLOTS[i].ico + ' ' : '') +
          '<b>' +
          x.p.name +
          '</b> en ' +
          SLOTS[i].label +
          ' ×' +
          x.mult +
          '</span><span class="p">' +
          fmt(x.pts) +
          '</span>';
        sum.appendChild(li);
      });
    const prevBest = store.best || 0,
      prevIdx = rankIdx(prevBest);
    const shouldSubmit = getGame().daily || t > (store.sbBest || 0);
    const newBest = Math.max(prevBest, t),
      idx = rankIdx(newBest),
      cur = RANKS[idx],
      next = RANKS[idx + 1];
    const up = idx > prevIdx;
    const med = Object.assign({}, cur, { pct: PCT[cur.t] });
    $('mTag').textContent = up ? '¡HAS SUBIDO DE RANGO!' : 'TU RANGO';
    $('mTag').classList.toggle('up', up);
    $('mIco').textContent = cur.ico;
    $('mName').textContent = cur.name;
    $('mPct').innerHTML =
      '<b>' +
      cur.rar.toUpperCase() +
      '</b> · ' +
      PCT[cur.t] +
      ' de los jugadores llega aquí';
    $('mPct').style.color = RARCOL[cur.rar];
    $('mPct').style.borderColor = RARCOL[cur.rar];
    $('rankFill').style.width =
      (next
        ? Math.max(
            3,
            Math.min(100, (100 * (newBest - cur.t)) / (next.t - cur.t)),
          )
        : 100) + '%';
    $('mSub').textContent = next
      ? 'Siguiente: ' +
        next.ico +
        ' ' +
        next.name +
        ' · te faltan ' +
        fmt(next.t - newBest) +
        ' puntos en una partida'
      : 'Rango máximo alcanzado';
    $('mRew').innerHTML = '';
    $('medal').hidden = false;
    $('medal').classList.remove('pop');
    void $('medal').offsetWidth;
    $('medal').classList.add('pop');
    if (up) setTimeout(() => showRankUp(cur, false), 400);
    const day = getGame().day || todayKey(),
      daily = getGame().daily;
    lastResult = {
      t,
      goal,
      pass,
      best,
      med,
      prevBest,
      slots: getGame().slots.map((x, i) => ({ ...x!, i })),
      skipsUsed: getGame().skipsUsed,
      daily,
      date: day,
    };
    store.games++;
    if (pass) store.wins++;
    if (t > store.best) store.best = t;
    store.scores.push({ t, d: day, med: med.name, daily });
    if (store.scores.length > 200) store.scores = store.scores.slice(-200);
    if (daily) store.daily[day] = { t, med: med.name };
    store.xp += t;
    const lv = levelOf(store.xp),
      nextLv = LEVELS[lv + 1];
    $('lvlFill').style.width =
      (nextLv
        ? Math.min(100, (100 * (store.xp - LEVELS[lv])) / (nextLv - LEVELS[lv]))
        : 100) + '%';
    $('lvlText').textContent =
      'Nivel ' +
      (lv + 1) +
      ' · ' +
      LVNAME[lv] +
      (nextLv
        ? ' · ' + fmt(nextLv - store.xp) + ' XP para el siguiente nivel'
        : ' · máximo');
    const got: Achievement[] = [];
    ACH.forEach((a) => {
      try {
        if (!store.ach[a.id] && a.test(lastResult!)) {
          store.ach[a.id] = todayKey();
          got.push(a);
        }
      } catch {
        /* Preserve the existing silent fallback. */
      }
    });
    const ul = $('unlocked');
    ul.innerHTML = '';
    if (got.length) {
      got.forEach((g, k) => {
        const li = document.createElement('li');
        li.textContent =
          (g.hidden ? '❓ Logro oculto: ' : '🏅 Logro: ') + g.name;
        ul.appendChild(li);
        setTimeout(
          () => {
            toast(
              '<b>Logro desbloqueado</b> · ' + g.name,
              g.hidden ? '❓' : '🏅',
            );
            beep('place');
          },
          600 + k * 700,
        );
      });
      ul.hidden = false;
    }
    save();
    renderStats();
    renderRank();
    if (shouldSubmit) setTimeout(() => submitScore(t, daily, day), 1400);
    beep(pass ? 'win' : t >= 7000 ? 'big' : 'lose');
    if (pass && !getGame().duelKind) confetti();
    lastPrivate = !!(duel && duel.private);
    $('btnAgain').textContent =
      getGame().duelKind === 'online'
        ? lastPrivate
          ? '🔁 Jugar otra vez'
          : '⚔️ Jugar otra vez'
        : getGame().duelKind === 'enlace'
          ? 'Crear otro reto'
          : 'Jugar otra vez';
    if (getGame().duelKind) duelReveal();
    (getGame().duelKind ? $('duelRes') : $('result')).scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
  // ---- ranking mundial (Supabase) ----
  async function sbGetVisible(tab: 'day' | 'all'): Promise<RankingRow[]> {
    const query = (includeVisibility: boolean) =>
      tab === 'day'
        ? ({ tab, day: todayKey(), includeVisibility } as const)
        : ({ tab, includeVisibility } as const);
    try {
      const rows = await getRetoRanking<RankingRow>(query(true));
      const now = Date.now();
      return rows.filter(
        (r) => !r.show_at || new Date(r.show_at).getTime() <= now,
      );
    } catch {
      return getRetoRanking<RankingRow>(query(false));
    }
  }
  async function sbPost(row: RankingRow): Promise<void> {
    await postRetoScore({
      name: row.name,
      score: row.score,
      daily: row.daily!,
      day: row.day!,
      player_id: row.player_id!,
    });
  }
  function escapeHtml(x: unknown) {
    return String(x).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]!,
    );
  }
  function cleanName(x: string) {
    return (x || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  }
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
  }
  const registered = () => !!(store.pid && store.name);
  let nameCb: (() => void) | null = null,
    nameBusy = false;
  function askName(cb: (() => void) | null) {
    nameCb = cb || null;
    $('nameInput').value = store.name || '';
    $('nameErr').textContent = '';
    $('btnNameOk').disabled = false;
    $('btnNameOk').textContent = 'Guardar';
    $('nameModal').hidden = false;
    setTimeout(() => $('nameInput').focus(), 50);
  }
  function closeName() {
    $('nameModal').hidden = true;
    const cb = nameCb;
    nameCb = null;
    return cb;
  }
  $('btnNameOk').addEventListener('click', async () => {
    if (nameBusy) return;
    const n = cleanName($('nameInput').value);
    if (n.length < 2) {
      $('nameErr').textContent = 'Mínimo 2 caracteres.';
      return;
    }
    if (registered() && n === store.name) {
      closeName();
      return;
    }
    nameBusy = true;
    $('btnNameOk').disabled = true;
    $('btnNameOk').textContent = 'Comprobando…';
    $('nameErr').textContent = '';
    const first = !registered();
    try {
      if (first) {
        const pid = newId();
        await registerIdentity(pid, n);
        store.pid = pid;
      } else {
        await renameIdentity(store.pid!, n);
      }
      store.name = n;
      save();
      const cb = closeName();
      toast(
        first
          ? '<b>Nombre registrado:</b> ' + escapeHtml(n)
          : '<b>Nombre cambiado:</b> ' + escapeHtml(n),
        '🌍',
      );
      if (cb) cb();
      else if (first && (store.best || 0) > 0) submitScore(store.best, false);
      renderRank();
    } catch (e) {
      $('nameErr').textContent =
        e instanceof Error && 'status' in e && e.status === 409
          ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
          : 'No se ha podido guardar. Revisa la conexión.';
    } finally {
      nameBusy = false;
      $('btnNameOk').disabled = false;
      $('btnNameOk').textContent = 'Guardar';
    }
  });
  $('nameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btnNameOk').click();
  });
  $('btnNameSkip').addEventListener('click', () => {
    closeName();
  });
  $('btnName').addEventListener('click', () => askName(null));
  function submitScore(t: number, daily: boolean, day = todayKey()): void {
    if (!registered()) {
      askName(() =>
        submitScore(Math.max(t, daily ? 0 : store.best || 0), daily, day),
      );
      return;
    }
    const row: RankingRow = {
      name: store.name!,
      score: Math.round(t),
      daily: !!daily,
      day: day || todayKey(),
      player_id: store.pid!,
    };
    sbPost(row)
      .then(() => {
        if (!daily && t > (store.sbBest || 0)) {
          store.sbBest = t;
          save();
        }
        toast('<b>Puntuación subida</b> al ranking mundial', '🌍');
        renderRank();
      })
      .catch(() =>
        toast('No se pudo subir la puntuación. Revisa la conexión.', '⚠️'),
      );
  }
  let rankTab = 'day';
  function renderRank() {
    const ul = $('rankList');
    ul.innerHTML = '';
    $('pass').hidden = true;
    $('rankFoot').hidden = true;
    if (rankTab === 'med') {
      const best = store.best || 0,
        idx = rankIdx(best),
        cur = RANKS[idx],
        nx = RANKS[idx + 1];
      $('pass').hidden = false;
      $('phIco').textContent = cur.ico;
      $('phName').textContent = cur.name;
      $('phSub').textContent = nx
        ? 'Mejor marca ' +
          fmt(best) +
          ' · te faltan ' +
          fmt(nx.t - best) +
          ' para ' +
          nx.name
        : 'Mejor marca ' + fmt(best) + ' · rango máximo';
      const tr = $('track');
      tr.innerHTML = '';
      RANKS.forEach((m, i) => {
        const on = i <= idx,
          now = i === idx;
        const d = document.createElement('div');
        d.className = 'node' + (on ? ' on' : '') + (now ? ' now' : '');
        d.innerHTML =
          (now ? '<span class="tagnow">AQUÍ</span>' : '') +
          '<span class="dot">' +
          (on ? m.ico : '🔒') +
          '</span>' +
          '<span class="nn">' +
          m.name +
          '</span>' +
          '<span class="np">' +
          fmt(m.t) +
          ' pts</span>' +
          '<span class="nr" style="color:' +
          RARCOL[m.rar] +
          '">' +
          m.rar +
          '</span>';
        tr.appendChild(d);
      });
      setTimeout(() => {
        const n = tr.querySelector<HTMLElement>('.node.now')!;
        if (n)
          tr.scrollLeft = Math.max(0, n.offsetLeft - tr.clientWidth / 2 + 52);
      }, 50);
      const ah = document.createElement('li');
      ah.className = 'medhead';
      ah.innerHTML = '<span>Logros</span><span class="s"></span>';
      ul.appendChild(ah);
      ACH.forEach((a) => {
        const li = document.createElement('li');
        const on = !!store.ach[a.id];
        li.className = on ? 'done' : 'locked';
        const nm = !on && a.hidden ? 'Logro oculto' : a.name;
        const ds = !on && a.hidden ? 'Descúbrelo jugando' : a.desc;
        li.innerHTML =
          '<span>' +
          (on ? '🏅 ' : a.hidden ? '❓ ' : '🔒 ') +
          nm +
          '<span class="d"> · ' +
          ds +
          '</span></span><span class="s">' +
          (on ? '✓' : '') +
          '</span>';
        ul.appendChild(li);
      });
      $('rankNote').textContent =
        'Tu rango sube con tu mejor puntuación; una vez alcanzado no se pierde.';
      const hid = ACH.filter((a) => a.hidden).length;
      $('rankNote').textContent +=
        ' Logros desbloqueados: ' +
        Object.keys(store.ach).filter((k) => ACH.some((a) => a.id === k))
          .length +
        ' de ' +
        ACH.length +
        ' (' +
        hid +
        ' ocultos).';
      return;
    }
    if (rankTab === 'duel') {
      renderDuelTab(ul);
      return;
    }
    $('rankFoot').hidden = false;
    $('rfName').textContent = registered()
      ? 'Juegas como: ' + store.name
      : 'Aún no tienes nombre en el ranking';
    $('btnName').textContent = registered()
      ? 'Cambiar nombre'
      : 'Elegir nombre';
    const tab = rankTab;
    $('rankNote').textContent = 'Cargando ranking mundial…';
    (tab === 'day' ? ensureDaily() : Promise.resolve())
      .then(() => sbGetVisible(tab as 'day' | 'all'))
      .then((rows) => {
        if (rankTab !== tab) return;
        ul.innerHTML = '';
        // una sola línea por persona: su mejor marca (récord)
        const seen = new Set<string>(),
          list: RankingRow[] = [];
        rows.forEach((r) => {
          const k = r.name.trim().toLowerCase();
          if (!seen.has(k)) {
            seen.add(k);
            list.push(r);
          }
        });
        if (!list.length) {
          $('rankNote').textContent =
            tab === 'day'
              ? 'Nadie ha jugado aún el reto de hoy. ¡Sé el primero!'
              : 'Todavía no hay puntuaciones. ¡Estrena el ranking!';
          return;
        }
        const me = registered() ? store.name!.trim().toLowerCase() : '';
        const myPos = me
          ? list.findIndex((r) => r.name.trim().toLowerCase() === me)
          : -1;
        const addRow = (r: RankingRow, pos: number) => {
          const li = document.createElement('li');
          const isMe = me && r.name.trim().toLowerCase() === me;
          if (isMe) li.className = 'mine';
          li.style.counterSet = 'r ' + pos;
          const rk = RANKS[rankIdx(r.score)];
          li.innerHTML =
            '<span>' +
            (isMe ? '<b>' + escapeHtml(r.name) + '</b>' : escapeHtml(r.name)) +
            crown(r.name) +
            '<span class="d"> · ' +
            rk.ico +
            ' ' +
            rk.name +
            (tab === 'all'
              ? ' · ' +
                String(r.day).slice(0, 10).split('-').reverse().join('/')
              : '') +
            '</span></span><span class="s">' +
            fmt(r.score) +
            '</span>';
          ul.appendChild(li);
        };
        list.slice(0, 20).forEach((r, i) => addRow(r, i));
        if (myPos >= 20 && myPos < 50) {
          const sp = document.createElement('li');
          sp.className = 'sep';
          sp.innerHTML = '<span>⋯</span>';
          ul.appendChild(sp);
          addRow(list[myPos], myPos);
        }
        $('rankNote').textContent =
          list.length +
          ' jugador' +
          (list.length === 1 ? '' : 'es') +
          (tab === 'day' ? ' en el reto de hoy' : ' con récord') +
          (myPos >= 0
            ? myPos < 50
              ? ' · vas ' + (myPos + 1) + 'º'
              : ' · aún no estás en el top 50'
            : '') +
          (tab === 'all'
            ? '. Cada jugador aparece una vez, con su récord.'
            : '.');
      })
      .catch(() => {
        if (rankTab !== tab) return;
        $('rankNote').textContent =
          'No se ha podido cargar el ranking mundial. Revisa la conexión.';
      });
  }
  const rankTabs = [
    ['rt-day', 'day'],
    ['rt-all', 'all'],
    ['rt-med', 'med'],
    ['rt-duel', 'duel'],
  ] as const;
  rankTabs.forEach(([id, k], _, all) => {
    $(id).addEventListener('click', () => {
      rankTab = k;
      all.forEach(([i2]) =>
        $(i2).setAttribute('aria-selected', String(i2 === id)),
      );
      renderRank();
    });
  });
  renderRank();

  // ---- duelos: online competitivo y reto por enlace ----
  const PICK_SECS = 20;
  const NOBODY = '00000000-0000-0000-0000-000000000000';
  // Divisiones = ligas y competiciones del mundo, de peor a mejor. Todos empiezan con 1.000 (Saudi Pro League, a mitad de tabla).
  const DIVS: Division[] = [
    { t: 0, ico: '🇸🇲', name: 'Liga de San Marino' },
    { t: 750, ico: '🇮🇳', name: 'Indian Super League' },
    { t: 825, ico: '🇦🇺', name: 'A-League' },
    { t: 900, ico: '🇺🇸', name: 'MLS' },
    { t: 950, ico: '🇸🇦', name: 'Saudi Pro League' },
    { t: 1050, ico: '🇦🇷', name: 'Liga Argentina' },
    { t: 1100, ico: '🇳🇱', name: 'Eredivisie' },
    { t: 1150, ico: '🇵🇹', name: 'Liga Portugal' },
    { t: 1200, ico: '🇫🇷', name: 'Ligue 1' },
    { t: 1250, ico: '🇩🇪', name: 'Bundesliga' },
    { t: 1300, ico: '🇮🇹', name: 'Serie A' },
    { t: 1350, ico: '🇪🇸', name: 'LaLiga' },
    {
      t: 1400,
      ico: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
      name: 'Premier League',
    },
    { t: 1450, ico: '🟢', name: 'Conference League' },
    { t: 1500, ico: '🟠', name: 'Europa League' },
    { t: 1550, ico: '🌎', name: 'Copa Libertadores' },
    { t: 1600, ico: '🏆', name: 'Champions League' },
  ];
  // El Mundial no va por puntos: son los 50 mejores del mundo que estén a nivel Champions (1.600+).
  const MUNDIAL: Division & { top: number } = {
    t: 1600,
    ico: '🌍',
    name: 'Mundial',
    top: 50,
  };
  function divOf(e: number, pos: number | null | undefined): Division {
    if (pos && pos <= MUNDIAL.top && e >= MUNDIAL.t) return MUNDIAL;
    return (
      DIVS.slice()
        .reverse()
        .find((d) => e >= d.t) || DIVS[0]
    );
  }
  function divMove(elo: number, pos: number | undefined): string {
    // Ascenso/descenso respecto a la última división que vio este jugador
    const cur = divOf(elo, pos),
      prev = store.lastDiv;
    store.lastDiv = cur.name;
    save();
    if (!prev || prev === cur.name) return '';
    const all = DIVS.concat([MUNDIAL]),
      a = all.findIndex((d) => d.name === prev),
      b = all.indexOf(cur);
    if (a < 0) return '';
    return b > a
      ? '<span class="up">⬆️ ¡Ascenso a ' + cur.name + '!</span>'
      : '<span class="down">⬇️ Desciendes a ' + cur.name + '</span>';
  }
  let duel: DuelState | null = null,
    pickTimer: number | null = null,
    searchClock: number | null = null,
    lastPrivate = false;

  function requireName(cb: () => void): void {
    if (registered()) cb();
    else askName(cb);
  }
  function baseUrl(): string {
    return location.origin + location.pathname;
  }
  function newCode(): string {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    const b = new Uint8Array(8);
    if (window.crypto) window.crypto.getRandomValues(b);
    else b.forEach((_, i) => (b[i] = Math.random() * 256));
    b.forEach((v) => (c += a[v % a.length]));
    return c;
  }
  function packSlots(): Array<[string, number]> {
    return getGame().slots.map((x) => [x!.p.name, Math.round(x!.pts)]);
  }
  function stopDuel() {
    if (duel && duel.poll) window.clearInterval(duel.poll);
    if (duel && duel.botTimer) clearTimeout(duel.botTimer);
    if (duel && duel.kind === 'online' && duel.id && !duel.started)
      sbCall('duel_cancel', { d: duel.id, pid: store.pid }).catch(() => {});
    if (searchClock !== null) window.clearInterval(searchClock);
    clearPickTimer();
    duel = null;
    $('duelModal').hidden = true;
    $('duelBar').hidden = true;
  }

  // ---- bots (juegan con los mismos 17 jugadores; nivel según su ELO) ----
  function seededDeal(seedStr: string): BotPlan {
    const rnd = mulberry(seedFrom(seedStr));
    const q = drawMany(N + SKIPS, rnd);
    const boost = LEAGUE_SLOTS[Math.floor(rnd() * LEAGUE_SLOTS.length)];
    return { q, boost };
  }
  // Colocación óptima de 17 jugadores (programación dinámica) con reconstrucción
  function optimalAssign(q: RetoPlayer[], boost: number): OptimalAssignment {
    const mult = (i: number) => (i === boost ? 5 : SLOTS[i].mult);
    const pts = q.map((p) => SLOTS.map((s, i) => pointsFor(p, i, mult(i))));
    const full = (1 << N) - 1,
      dp = new Float64Array(1 << N).fill(-1),
      par = new Int8Array(1 << N),
      pc = new Uint8Array(1 << N);
    for (let m = 1; m <= full; m++) pc[m] = pc[m >> 1] + (m & 1);
    dp[0] = 0;
    for (let m = 0; m < full; m++) {
      if (dp[m] < 0) continue;
      const row = pts[pc[m]],
        base = dp[m];
      for (let s = 0; s < N; s++) {
        if (m & (1 << s)) continue;
        const nm = m | (1 << s),
          v = base + row[s];
        if (v > dp[nm]) {
          dp[nm] = v;
          par[nm] = s;
        }
      }
    }
    const slotOf: number[] = new Array(N);
    let m = full;
    while (m) {
      const s = par[m];
      slotOf[pc[m] - 1] = s;
      m ^= 1 << s;
    }
    return { pts, slotOf, best: dp[full] };
  }
  // Partida de bot que saca un % concreto de la colocación perfecta
  function botResult(
    q: RetoPlayer[],
    boost: number,
    ratio: number,
    cap: number,
    pre?: OptimalAssignment,
  ): BotOutcome {
    const o = pre || optimalAssign(q, boost),
      slotOf = o.slotOf.slice();
    const tot = () => slotOf.reduce((a, s, i) => a + o.pts[i][s], 0);
    const goal = Math.min(o.best * ratio, cap || 14999),
      low = goal - o.best * 0.01;
    let t = tot();
    for (let it = 0; it < 4000 && t > goal; it++) {
      const a = Math.floor(Math.random() * N),
        b = Math.floor(Math.random() * N);
      if (a === b) continue;
      const nt =
        t -
        o.pts[a][slotOf[a]] -
        o.pts[b][slotOf[b]] +
        o.pts[a][slotOf[b]] +
        o.pts[b][slotOf[a]];
      if (nt < t && nt >= low) {
        const x = slotOf[a];
        slotOf[a] = slotOf[b];
        slotOf[b] = x;
        t = nt;
      }
    }
    const slots = new Array(N);
    slotOf.forEach((s, i) => {
      slots[s] = [q[i].name, Math.round(o.pts[i][s])];
    });
    return { total: Math.round(t), slots, best: o.best };
  }
  // % de colocación perfecta según el ELO del bot (Mundial: 81-90 %).
  // Las personas ven los puntos de cada casilla: quien coloca siempre en la mejor casilla saca ≈73 % del óptimo
  // (se equilibra hacia 1.300-1.350 de ELO) y quien además piensa en las casillas que vendrán y descarta, ≈87 % (≈1.750).
  function botRatio(elo: number): number {
    const pts = [
      [800, 0.55],
      [1000, 0.62],
      [1300, 0.72],
      [1600, 0.82],
      [1770, 0.88],
    ];
    let r = pts[0][1];
    for (let i = 0; i < pts.length; i++) {
      if (elo >= pts[i][0]) r = pts[i][1];
      if (i > 0 && elo >= pts[i - 1][0] && elo < pts[i][0]) {
        const [a, ra] = pts[i - 1],
          [b, rb] = pts[i];
        r = ra + ((rb - ra) * (elo - a)) / (b - a);
      }
    }
    if (elo >= 1600)
      r = Math.max(0.81, Math.min(0.9, r + (Math.random() * 0.06 - 0.03)));
    else r += Math.random() * 0.06 - 0.03;
    // como las personas: a veces tienen un mal día (y alguna vez uno muy bueno)
    const u = Math.random();
    if (u < 0.12) r -= 0.12 + Math.random() * 0.1;
    else if (u < 0.17) r += 0.03 + Math.random() * 0.04;
    return Math.max(0.25, Math.min(0.92, r));
  }
  // Techo de puntos: normalmente menos de 13.500, a veces hasta 13.999, muy pocas veces 14.000+ y nunca 15.000
  function scoreCap(rnd: (() => number) | null = null): number {
    const u = (rnd || Math.random)();
    return u < 0.03 ? 14999 : u < 0.25 ? 13999 : 13499;
  }
  function botPlan(seed: string, elo: number, startAt: number) {
    const { q, boost } = seededDeal('duelo:' + seed);
    const r = botResult(q.slice(0, N), boost, botRatio(elo), scoreCap());
    const times = [];
    let t = startAt + 800;
    for (let i = 0; i < N; i++) {
      t += 2500 + Math.random() * (i < 3 ? 6500 : 8500);
      times.push(t);
    }
    return { score: r.total, slots: r.slots, times, finishAt: times[N - 1] };
  }
  function botProg(me: { bot?: { times: number[] } } | null) {
    const b = me && me.bot;
    return b ? b.times.filter((t) => t <= Date.now()).length : 0;
  }
  let dailySeeded: string | null = null;
  async function ensureDaily() {
    await null;
    const day = todayKey();
    if (dailySeeded === day) return;
    dailySeeded = day;
    try {
      const rnd = mulberry(seedFrom('bots:' + day));
      const { q, boost } = seededDeal(day),
        q17 = q.slice(0, N);
      const opt = optimalAssign(q17, boost),
        sc = [],
        at = [];
      const now = Date.now(),
        d0 = new Date(day + 'T00:00:00').getTime();
      // top 10 del día: entre el 74 % y el 86 % de la colocación perfecta de hoy (con los puntos a la vista,
      // una persona que coloca en la mejor casilla saca ≈73 % y una que además planifica, ≈87 %)
      for (let k = 0; k < 10; k++) {
        const r = botResult(q17, boost, 0.74 + rnd() * 0.12, 13499, opt);
        if (r.total < 1000 || r.total >= 15000) continue;
        sc.push(r.total);
        at.push(new Date(now - rnd() * Math.max(0, now - d0)).toISOString());
      }
      await sbCall('seed_daily', { d: day, sc, at });
    } catch {
      /* Preserve the existing silent fallback. */
    }
  }

  // ---- ventana de duelo ----
  type ModalOption = { label: string; ghost?: boolean; fn: () => void };
  type ModalOptions = {
    ico?: string;
    tit?: string;
    txt?: string;
    extra?: string;
    buttons?: ModalOption[];
  };
  function duelModal(o: ModalOptions): void {
    $('dmIco').textContent = o.ico || '⚔️';
    $('dmTit').textContent = o.tit || '';
    $('dmTxt').innerHTML = o.txt || '';
    $('dmExtra').innerHTML = o.extra || '';
    const act = $('dmAct');
    act.innerHTML = '';
    (o.buttons || []).forEach((b) => {
      const x = document.createElement('button');
      x.className = 'btn' + (b.ghost ? ' ghost' : '');
      x.textContent = b.label;
      x.addEventListener('click', b.fn);
      act.appendChild(x);
    });
    $('duelModal').hidden = false;
  }
  function closeDuelModal() {
    $('duelModal').hidden = true;
  }
  async function shareLink(url: string, text: string): Promise<void> {
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      toast('<b>Enlace copiado.</b> Pégalo en WhatsApp o donde quieras.', '🔗');
    } catch {
      prompt('Copia este enlace:', url);
    }
  }

  // ---- barra del rival y reloj por jugador ----
  function duelBarText() {
    if (!duel) return '';
    if (duel.kind === 'online')
      return (
        (duel.private ? '🤝 Duelo amistoso contra ' : '⚔️ Duelo contra ') +
        duel.rivalName +
        ' · mismos 17 jugadores para los dos'
      );
    if (duel.role === 'rival')
      return (
        '🔗 Reto de ' + duel.creator + ' · te tocan sus mismos 17 jugadores'
      );
    return '🔗 Tu reto · al terminar tendrás el enlace para mandarlo';
  }
  function paintRival(prog: number): void {
    $('dbName').textContent =
      '⚔️ ' + (duel ? duel.rivalName : 'Rival') + ' ' + prog + '/' + N;
    $('dbFill').style.width = (100 * prog) / N + '%';
  }
  function clearPickTimer() {
    if (pickTimer !== null) window.clearInterval(pickTimer);
    pickTimer = null;
    const t = $('dbTime');
    if (t) {
      t.textContent = '';
      t.classList.remove('hot');
    }
  }
  function startPickTimer() {
    clearPickTimer();
    if (!game || getGame().duelKind !== 'online') return;
    let left = PICK_SECS;
    const paint = () => {
      $('dbTime').textContent = '⏱' + left;
      $('dbTime').classList.toggle('hot', left <= 5);
    };
    paint();
    pickTimer = window.setInterval(() => {
      left--;
      paint();
      if (left <= 0) {
        clearPickTimer();
        if (!game || busy) return;
        const free: number[] = [];
        getGame().slots.forEach((x, i) => {
          if (!x) free.push(i);
        });
        if (!free.length) return;
        toast('Se acabó el tiempo: jugador colocado al azar', '⏱');
        place(free[Math.floor(Math.random() * free.length)]);
      }
    }, 1000);
  }
  function duelProgress() {
    if (!game || getGame().duelKind !== 'online' || !duel || !duel.id) return;
    sbCall('duel_progress', {
      d: duel.id,
      pid: store.pid,
      n: getGame().slots.filter(Boolean).length,
    }).catch(() => {});
  }

  // ---- DUELO ONLINE ----
  function startOnline() {
    requireName(async () => {
      stopDuel();
      duel = { kind: 'online', t0: Date.now() };
      worldInfo()
        .then((w) => {
          if (duel && duel.kind === 'online') duel.prev = w;
        })
        .catch(() => {});
      const me = duel;
      showSearching();
      try {
        me.id =
          (await sbCall<QueueResponse>('duel_queue', {
            pid: store.pid,
            n: store.name,
          })) ?? undefined;
      } catch {
        if (duel === me) {
          stopDuel();
          toast('No se ha podido buscar rival. Revisa la conexión.', '⚠️');
        }
        return;
      }
      if (duel !== me) {
        sbCall('duel_cancel', { d: me.id, pid: store.pid }).catch(() => {});
        return;
      }
      me.poll = window.setInterval(pollOnline, 1500);
      pollOnline();
      // si en unos segundos no aparece nadie, rival bot de nivel parecido
      me.botTimer = setTimeout(
        () => {
          if (duel === me && !me.started)
            sbCall('duel_bot', { d: me.id, pid: store.pid })
              .then(() => pollOnline())
              .catch(() => {});
        },
        8000 + Math.random() * 8000,
      );
    });
  }
  function showSearching() {
    duelModal({
      ico: '⚔️',
      tit: 'Buscando rival',
      txt: 'Te emparejamos con el primero que busque duelo. Los dos jugáis los mismos 17 jugadores a la vez, con 20 segundos por jugador. Gana quien más sume.',
      extra: '<div class="dm-clock" id="dmClock">0:00</div>',
      buttons: [
        {
          label: 'Invitar a alguien',
          fn: () =>
            shareLink(
              baseUrl() + '?online=1',
              '⚔️ Te reto a un duelo en el Reto de los 15.000 goles. Entra y dale a buscar rival:',
            ),
        },
        {
          label: 'Cancelar',
          ghost: true,
          fn: () => {
            stopDuel();
          },
        },
      ],
    });
    if (searchClock !== null) window.clearInterval(searchClock);
    searchClock = window.setInterval(() => {
      if (!duel || duel.started) {
        if (searchClock !== null) window.clearInterval(searchClock);
        return;
      }
      const s = Math.floor((Date.now() - duel.t0!) / 1000),
        c = $('dmClock');
      if (c)
        c.textContent =
          Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      if (s === 45)
        $('dmTxt').innerHTML =
          'Ahora mismo no hay nadie más buscando. Mándale el enlace a alguien: cuando entre y busque, os emparejamos al momento.';
    }, 500);
  }
  async function pollOnline() {
    const me = duel;
    if (!me || me.kind !== 'online' || !me.id || me.polling) return;
    me.polling = true;
    try {
      const s = await sbCall<OnlineState>('duel_state', {
        d: me.id,
        pid: store.pid,
      });
      if (duel !== me || !s) return;
      me.state = s;
      if (s.rival) me.rivalName = s.rival.name;
      if (s.status === 'ready' && !me.readyShown) {
        me.readyShown = true;
        if (searchClock !== null) window.clearInterval(searchClock);
        duelModal({
          ico: '🤝',
          tit: '¡' + s.rival!.name + ' ha entrado!',
          txt: 'Empezáis en cuanto los dos tengáis la web abierta…',
          extra: '',
          buttons: [{ label: 'Cancelar', ghost: true, fn: () => stopDuel() }],
        });
        beep('big');
      }
      if (s.status === 'playing' && !me.started) {
        me.started = true;
        me.seed = s.seed!;
        if (searchClock !== null) window.clearInterval(searchClock);
        const rival = s.rival!;
        const dv = divOf(rival.elo, rival.pos);
        let left = Math.max(
          1,
          Math.round(
            (new Date(s.started_at!).getTime() - new Date(s.now!).getTime()) /
              1000,
          ),
        );
        if (rival.bot) {
          const bot = botPlan(s.seed!, rival.elo, Date.now() + left * 1000);
          me.bot = bot;
          me.botReq = sbCall('duel_bot_submit', {
            d: me.id,
            pid: store.pid,
            sc: bot.score,
            sl: bot.slots,
          });
        }
        const rivalName = rival.name,
          rivalElo = rival.elo;
        const paint = () =>
          duelModal({
            ico: '⚔️',
            tit: s.private ? '¡Duelo con tu amigo!' : '¡Rival encontrado!',
            txt: '',
            extra:
              '<div class="dm-rival"><b>' +
              escapeHtml(rivalName) +
              '</b><span class="note">' +
              (s.private
                ? 'Duelo amistoso · no cuenta para el ELO'
                : dv.ico + ' ' + dv.name + ' · ' + fmt(rivalElo) + ' ELO') +
              '</span></div><div class="dm-clock">' +
              left +
              '</div>',
            buttons: [],
          });
        paint();
        beep('big');
        const iv = window.setInterval(() => {
          if (duel !== me) {
            window.clearInterval(iv);
            return;
          }
          left--;
          if (left > 0) {
            paint();
            beep('skip');
            return;
          }
          window.clearInterval(iv);
          closeDuelModal();
          mode = 'online';
          $('result').hidden = true;
          document.body.classList.remove('done');
          newGame();
        }, 1000);
      } else if (s.status === 'playing' && s.rival) {
        if (game && getGame().duelKind === 'online')
          paintRival(me.bot ? botProg(me) : s.rival.prog!);
        if (me.submitted && me.revealed) renderOnline();
      } else if (s.status === 'done') {
        const rk = JSON.stringify(s.rematch || null);
        if (!s.private && me.poll !== undefined && me.poll !== null) {
          window.clearInterval(me.poll);
          me.poll = null;
        }
        if (me.revealed && (me.rk !== rk || !me.shownDone)) {
          me.rk = rk;
          me.shownDone = true;
          renderOnline();
        }
        if (
          s.rematch &&
          !s.rematch.mine &&
          s.rematch.status === 'waiting' &&
          !me.rmBeep
        ) {
          me.rmBeep = true;
          beep('big');
        }
      } else if (s.status === 'cancelled' && !me.started && me.private) {
        stopDuel();
        toast('La sala se ha cancelado.', '⚠️');
      } else if (s.status === 'cancelled' && me.started) {
        if (me.poll !== undefined && me.poll !== null) {
          window.clearInterval(me.poll);
          me.poll = null;
        }
        if (me.revealed) renderOnline();
      }
    } catch {
      /* Preserve the existing silent fallback. */
    } finally {
      me.polling = false;
    }
  }

  // ---- revancha con el mismo amigo, sin mandar otro enlace ----
  async function rematch() {
    const old = duel;
    if (!old || !old.private || !old.id) {
      startRoom();
      return;
    }
    const rival = old.rivalName || 'tu amigo';
    let r;
    try {
      r = await sbCall<RematchResponse>('duel_rematch', {
        d: old.id,
        pid: store.pid,
      });
    } catch {
      toast('No se ha podido pedir la revancha. Revisa la conexión.', '⚠️');
      return;
    }
    if (!r || r.error) {
      startRoom();
      return;
    }
    stopDuel();
    duel = {
      kind: 'online',
      private: true,
      t0: Date.now(),
      id: r.id,
      rivalName: rival,
    };
    duelModal({
      ico: '🔁',
      tit: r.joined ? '¡Revancha!' : 'Revancha pedida',
      txt: r.joined
        ? 'Preparando el duelo con ' + escapeHtml(rival) + '…'
        : 'Esperando a que ' +
          escapeHtml(rival) +
          ' acepte. Le sale en su pantalla al acabar el duelo.',
      buttons: [{ label: 'Cancelar', ghost: true, fn: () => stopDuel() }],
    });
    duel.poll = window.setInterval(pollOnline, 1500);
    pollOnline();
  }

  // ---- RETA A UN AMIGO: sala privada, los dos jugáis a la vez ----
  function roomUrl(code: string) {
    return baseUrl() + '?sala=' + code;
  }
  function startRoom() {
    requireName(async () => {
      stopDuel();
      duel = { kind: 'online', private: true, t0: Date.now() };
      const me = duel;
      duelModal({ ico: '🔗', tit: 'Creando la sala…', txt: '', buttons: [] });
      let r;
      try {
        r = await sbCall<RoomCreateResponse>('duel_room_create', {
          pid: store.pid,
          n: store.name,
        });
      } catch {
        if (duel === me) {
          stopDuel();
          toast('No se ha podido crear la sala. Revisa la conexión.', '⚠️');
        }
        return;
      }
      if (duel !== me) return;
      me.id = r!.id;
      me.code = r!.code;
      const share = () =>
        shareLink(
          roomUrl(r!.code),
          '⚔️ Te reto a un duelo en directo en el Reto de los 15.000 goles. Entra y jugamos a la vez:',
        );
      duelModal({
        ico: '🔗',
        tit: 'Reta a un amigo',
        txt: 'Mándale el enlace. Cuando entre, empezáis los dos a la vez con los mismos 17 jugadores. <b>No cierres esta página.</b>',
        extra:
          '<div class="dm-clock">' +
          r!.code +
          '</div><p class="note">Código de la sala · caduca en 15 minutos</p>',
        buttons: [
          { label: 'Enviar enlace', fn: share },
          { label: 'Cancelar', ghost: true, fn: () => stopDuel() },
        ],
      });
      me.poll = window.setInterval(pollOnline, 1500);
      pollOnline();
    });
  }
  async function openRoom(code: string) {
    let p;
    try {
      p = await sbCall<RoomPeekResponse>('duel_room_peek', { c: code });
    } catch {
      toast('No se ha podido abrir la sala. Revisa la conexión.', '⚠️');
      return;
    }
    if (!p || !p.ok) {
      duelModal({
        ico: '⌛',
        tit: 'Sala no disponible',
        txt: p
          ? 'La sala de ' +
            escapeHtml(p.host) +
            ' ya ha empezado o ha caducado. Pídele que te mande un enlace nuevo.'
          : 'Ese enlace no es válido.',
        buttons: [
          {
            label: 'Crear mi sala',
            fn: () => {
              closeDuelModal();
              startRoom();
            },
          },
          { label: 'Cerrar', ghost: true, fn: closeDuelModal },
        ],
      });
      return;
    }
    duelModal({
      ico: '⚔️',
      tit: p.host + ' te reta',
      txt: 'Duelo en directo: jugáis los dos a la vez con los mismos 17 jugadores y 20 segundos por jugador. Gana quien más sume. Es amistoso: no cuenta para el ELO.',
      buttons: [
        { label: '¡Jugar!', fn: () => joinRoom(code) },
        { label: 'Ahora no', ghost: true, fn: closeDuelModal },
      ],
    });
  }
  function joinRoom(code: string) {
    closeDuelModal();
    requireName(async () => {
      stopDuel();
      duel = { kind: 'online', private: true, t0: Date.now() };
      const me = duel;
      duelModal({
        ico: '⚔️',
        tit: 'Entrando en la sala…',
        txt: '',
        buttons: [],
      });
      let r;
      try {
        r = await sbCall<RoomJoinResponse>('duel_room_join', {
          c: code,
          pid: store.pid,
          n: store.name,
        });
      } catch {
        if (duel === me) {
          stopDuel();
          toast('No se ha podido entrar. Revisa la conexión.', '⚠️');
        }
        return;
      }
      if (duel !== me) return;
      if (!r || r.error) {
        stopDuel();
        if (r && r.error === 'own')
          toast('Esa sala es tuya: mándale el enlace a tu amigo.', '🔗');
        else openRoom(code);
        return;
      }
      me.id = r.id;
      me.rivalName = r.host;
      duelModal({
        ico: '🤝',
        tit: '¡Dentro!',
        txt: 'Esperando a que ' + escapeHtml(r.host) + ' esté listo…',
        buttons: [{ label: 'Cancelar', ghost: true, fn: () => stopDuel() }],
      });
      me.poll = window.setInterval(pollOnline, 1500);
      pollOnline();
    });
  }

  // ---- RETO POR ENLACE (antiguo: los enlaces viejos siguen funcionando) ----
  function startLink() {
    requireName(() => {
      stopDuel();
      duel = { kind: 'enlace', role: 'creator', code: newCode() };
      duel.seed = duel.code;
      mode = 'enlace';
      $('result').hidden = true;
      document.body.classList.remove('done');
      newGame();
    });
  }
  async function openLink(code: string) {
    let l;
    try {
      l = await sbCall<LinkData>('link_get', {
        c: code,
        pid: store.pid || NOBODY,
      });
    } catch {
      toast('No se ha podido abrir el reto. Revisa la conexión.', '⚠️');
      return;
    }
    if (!l) {
      toast('Ese reto no existe o el enlace está mal copiado.', '⚠️');
      return;
    }
    const nm = escapeHtml(l.creator_name);
    if (l.mine) {
      duelModal({
        ico: '🔗',
        tit: 'Tu reto',
        txt: 'Hiciste <b>' + fmt(l.creator_score) + '</b> puntos.',
        extra: playsHtml(l.plays, l.creator_score),
        buttons: [
          {
            label: 'Volver a mandarlo',
            fn: () =>
              shareLink(
                baseUrl() + '?reto=' + code,
                '⚔️ Te reto en el Reto de los 15.000 goles: te tocan mis mismos 17 jugadores. ¿Me ganas?',
              ),
          },
          { label: 'Cerrar', ghost: true, fn: closeDuelModal },
        ],
      });
      return;
    }
    if (l.started && l.my_score != null) {
      const w = l.my_score > l.creator_score,
        d = l.my_score === l.creator_score;
      duelModal({
        ico: w ? '🏆' : d ? '🤝' : '😬',
        tit: w ? 'Le ganaste' : d ? 'Empate' : 'Te ganó',
        txt:
          'Tú <b>' +
          fmt(l.my_score) +
          '</b> · ' +
          nm +
          ' <b>' +
          fmt(l.creator_score) +
          '</b>',
        extra: playsHtml(l.plays, l.creator_score, l.creator_name),
        buttons: [
          {
            label: 'Crear mi propio reto',
            fn: () => {
              closeDuelModal();
              startLink();
            },
          },
          { label: 'Cerrar', ghost: true, fn: closeDuelModal },
        ],
      });
      return;
    }
    if (l.started) {
      duelModal({
        ico: '⛔',
        tit: 'Reto ya empezado',
        txt:
          'Empezaste el reto de ' +
          nm +
          ' y lo dejaste a medias. Cada reto solo se puede jugar una vez.',
        buttons: [
          {
            label: 'Crear mi propio reto',
            fn: () => {
              closeDuelModal();
              startLink();
            },
          },
          { label: 'Cerrar', ghost: true, fn: closeDuelModal },
        ],
      });
      return;
    }
    duelModal({
      ico: '⚔️',
      tit: l.creator_name + ' te reta',
      txt:
        'Te tocarán los mismos 17 jugadores, en el mismo orden y con la misma liga ×5 que le tocaron a ' +
        nm +
        '. Verás su puntuación al terminar. <b>Solo tienes un intento:</b> si sales a medias, cuenta como jugado.',
      buttons: [
        {
          label: 'Aceptar el reto',
          fn: () => acceptLink(code, l.creator_name),
        },
        { label: 'Ahora no', ghost: true, fn: closeDuelModal },
      ],
    });
  }
  function acceptLink(code: string, creator: string) {
    closeDuelModal();
    requireName(async () => {
      let ok: boolean;
      try {
        ok = !!(await sbCall<LinkStartResponse>('link_start', {
          c: code,
          pid: store.pid,
          n: store.name,
        }));
      } catch {
        toast('No se ha podido empezar el reto. Revisa la conexión.', '⚠️');
        return;
      }
      if (!ok) {
        openLink(code);
        return;
      }
      stopDuel();
      duel = { kind: 'enlace', role: 'rival', code, seed: code, creator };
      mode = 'enlace';
      $('result').hidden = true;
      document.body.classList.remove('done');
      newGame();
    });
  }
  function playsHtml(
    plays: LinkPlay[] | undefined,
    creatorScore: number,
    creatorName = '',
  ): string {
    if (!plays || !plays.length)
      return '<p class="note">Todavía no lo ha jugado nadie.</p>';
    const rows = plays
      .map((p) => {
        const done = p.score != null,
          cls = !done
            ? ''
            : p.score! > creatorScore
              ? 'l'
              : p.score! < creatorScore
                ? 'w'
                : '';
        return (
          '<li class="plain ' +
          cls +
          '"><span>' +
          escapeHtml(p.name) +
          '<span class="d"> · ' +
          (!done
            ? 'a medias'
            : p.score! > creatorScore
              ? 'ganó a ' + escapeHtml(creatorName || 'ti')
              : p.score! < creatorScore
                ? 'perdió'
                : 'empate') +
          '</span></span><span class="s">' +
          (done ? fmt(p.score!) : '–') +
          '</span></li>'
        );
      })
      .join('');
    return (
      '<ol class="rank" style="text-align:left;width:100%;margin-top:8px">' +
      rows +
      '</ol>'
    );
  }

  // ---- al terminar la partida ----
  function duelSubmit(t: number) {
    if (!duel) return;
    const me = duel,
      slots = packSlots();
    me.myScore = Math.round(t);
    me.mySlots = slots;
    me.submitted = true;
    if (me.kind === 'online') {
      const botState = me.bot;
      const bot = botState
        ? (me.botReq || Promise.reject())
            .catch(() =>
              sbCall('duel_bot_submit', {
                d: me.id,
                pid: store.pid,
                sc: botState.score,
                sl: botState.slots,
              }),
            )
            .catch(() => {})
        : Promise.resolve();
      me.req = bot
        .then(() =>
          sbCall<OnlineState>('duel_submit', {
            d: me.id,
            pid: store.pid,
            sc: me.myScore,
            sl: slots,
          }),
        )
        .then((s) => {
          if (duel === me && s) {
            me.state = s;
            if (me.revealed) renderOnline();
          }
        })
        .catch(() => {
          me.err = true;
          if (me.revealed) renderOnline();
        });
    } else if (me.role === 'creator') {
      me.req = sbCall('link_create', {
        code: me.code,
        pid: store.pid,
        n: store.name,
        sc: me.myScore,
        sl: slots,
      })
        .then(() => {
          me.saved = true;
          if (me.revealed) renderLink();
        })
        .catch(() => {
          me.err = true;
          if (me.revealed) renderLink();
        });
    } else {
      me.req = sbCall<LinkCompareData>('link_finish', {
        c: me.code,
        pid: store.pid,
        sc: me.myScore,
        sl: slots,
      })
        .then((l) => {
          me.link = l ?? undefined;
          if (me.revealed) renderLink();
        })
        .catch(() => {
          me.err = true;
          if (me.revealed) renderLink();
        });
    }
  }
  function duelReveal() {
    if (!duel) return;
    duel.revealed = true;
    if (duel.kind === 'online') renderOnline();
    else renderLink();
  }
  function scoreBox(
    myScore: number | undefined,
    rivalName: string | undefined,
    rivalScore: number | null | undefined,
    top: string,
    cls: string,
    sub: string,
    extra?: string,
    cmp?: string,
  ) {
    const box = $('duelRes');
    box.className = 'duelres' + (cls ? ' ' + cls : '');
    const known = rivalScore != null;
    box.innerHTML =
      '<div class="dr-top">' +
      top +
      '</div>' +
      '<div class="dr-score"><div class="dr-p' +
      (known && myScore! >= rivalScore ? ' best' : '') +
      '"><span class="dr-n">Tú</span><span class="dr-s">' +
      fmt(myScore!) +
      '</span></div>' +
      '<span class="dr-vs">vs</span>' +
      '<div class="dr-p' +
      (known && rivalScore >= myScore! ? ' best' : '') +
      '"><span class="dr-n">' +
      escapeHtml(rivalName) +
      '</span><span class="dr-s">' +
      (known ? fmt(rivalScore) : '?') +
      '</span></div></div>' +
      (sub ? '<p class="dr-sub">' + sub + '</p>' : '') +
      (extra || '') +
      (cmp || '');
    box.hidden = false;
  }
  function compareHtml(
    mine: Array<[string, number] | undefined> | undefined,
    theirs: Array<[string, number] | undefined> | undefined,
    rivalName: string,
  ) {
    if (!Array.isArray(mine) || !Array.isArray(theirs) || theirs.length !== N)
      return '';
    let rows = '';
    for (let i = 0; i < N; i++) {
      const a = mine[i] || ['', 0],
        b = theirs[i] || ['', 0],
        pa = Number(a[1]) || 0,
        pb = Number(b[1]) || 0;
      rows +=
        '<li class="' +
        (pa > pb ? 'w' : pb > pa ? 'l' : '') +
        '"><span class="cs">' +
        (SLOTS[i].ico ? SLOTS[i].ico + ' ' : '') +
        SLOTS[i].label +
        '</span>' +
        '<span class="ca">' +
        escapeHtml(a[0]) +
        ' <b>' +
        fmt(pa) +
        '</b></span><span class="cb"><b>' +
        fmt(pb) +
        '</b> ' +
        escapeHtml(b[0]) +
        '</span></li>';
    }
    return (
      '<details class="cmp"><summary>Comparar casilla por casilla</summary><div class="cmphead"><span></span><span>Tú</span><span>' +
      escapeHtml(rivalName) +
      '</span></div><ul>' +
      rows +
      '</ul></details>'
    );
  }
  function renderOnline() {
    const me = duel;
    if (!me || me.kind !== 'online') return;
    const s: Partial<OnlineState> = me.state || {};
    const rv: Partial<import('./rpc-types').OnlineRival> & { name: string } =
      Object.assign({ name: me.rivalName || 'Rival' }, s.rival || {});
    if (me.bot && Date.now() < me.bot.finishAt && !me.err) {
      // el bot "sigue jugando": se enseña su progreso hasta que termine
      rv.prog = botProg(me);
      rv.done = false;
      clearTimeout(me.botView);
      me.botView = setTimeout(() => {
        if (duel === me) renderOnline();
      }, 1500);
      scoreBox(
        me.myScore,
        rv.name,
        null,
        'Esperando a ' + escapeHtml(rv.name) + '…',
        '',
        'Va por el jugador ' +
          Math.min(N, rv.prog! + 1) +
          ' de ' +
          N +
          '. Si se va, ganas tú.',
      );
      return;
    }
    if (me.err && s.status !== 'done') {
      scoreBox(
        me.myScore,
        rv.name,
        null,
        'Sin conexión',
        '',
        'No se ha podido enviar tu resultado. Comprueba la conexión: el duelo sigue abierto unos minutos.',
      );
      return;
    }
    if (s.status === 'done') {
      const res = s.result,
        dv = divOf(s.my_elo || 1000, s.my_pos),
        dl = Number(s.my_delta) || 0;
      if (s.private) {
        const top =
          res === 'win'
            ? s.forfeit
              ? '🏆 Ganas: ' + escapeHtml(rv.name) + ' no terminó'
              : '🏆 ¡Le has ganado!'
            : res === 'loss'
              ? s.forfeit
                ? 'Pierdes: no terminaste a tiempo'
                : 'Te ha ganado'
              : '🤝 Empate';
        const rm = s.rematch,
          offer = rm && !rm.mine && rm.status === 'waiting';
        const act =
          '<div class="actions">' +
          (offer
            ? '<p class="dr-sub" style="width:100%"><span class="up">🔁 ' +
              escapeHtml(rv.name) +
              ' quiere la revancha</span></p><button class="btn" id="drAgain">¡Revancha!</button>'
            : '<button class="btn" id="drAgain">🔁 Jugar otra vez</button>') +
          '<button class="btn ghost" id="drHome">Inicio</button></div>';
        scoreBox(
          s.my_score != null ? s.my_score : me.myScore,
          rv.name,
          rv.score,
          top,
          res === 'win' ? 'win' : res === 'loss' ? 'loss' : '',
          '🤝 Duelo amistoso: no cuenta para el ELO',
          act,
          compareHtml(me.mySlots, rv.slots, rv.name),
        );
        $('drAgain').addEventListener('click', rematch);
        $('drHome').addEventListener('click', goHome);
        if (!me.celebrated) {
          me.celebrated = true;
          if (res === 'win') {
            beep('win');
            confetti();
          } else if (res === 'loss') beep('lose');
        }
        return;
      }
      if (me.move === undefined) me.move = divMove(s.my_elo || 1000, s.my_pos);
      if (!me.topReq)
        me.topReq = sbCall<DuelTopEntry[]>('duel_top')
          .then((t) => {
            me.topAfter = t || [];
            if (duel === me) renderOnline();
          })
          .catch(() => {});
      const top =
        res === 'win'
          ? s.forfeit
            ? '🏆 Ganas: ' + escapeHtml(rv.name) + ' no terminó'
            : '🏆 ¡Has ganado el duelo!'
          : res === 'loss'
            ? s.forfeit
              ? 'Pierdes: no terminaste a tiempo'
              : 'Has perdido el duelo'
            : '🤝 Empate';
      const bn = Number(s.my_bonus) || 0,
        g = Number(s.my_games) || 0;
      const sub =
        (me.move ? me.move + '<br>' : '') +
        (bn
          ? '<span class="up">🔥 Bonus ' +
            (bn >= 10 ? '15K' : '12K') +
            ' +' +
            bn +
            '</span><br>'
          : '') +
        dv.ico +
        ' <b>' +
        dv.name +
        '</b> · ' +
        fmt(s.my_elo!) +
        ' puntos <span class="' +
        (dl >= 0 ? 'up' : 'down') +
        '">(' +
        (dl >= 0 ? '+' : '') +
        dl +
        ')</span>' +
        (dv === MUNDIAL ? ' · ' + s.my_pos + 'º del mundo' : '') +
        (g && g <= 10
          ? '<br>Duelo ' +
            g +
            ' de 10 de clasificación: subes y bajas más rápido'
          : '');
      scoreBox(
        s.my_score != null ? s.my_score : me.myScore,
        rv.name,
        rv.score,
        top,
        res === 'win' ? 'win' : res === 'loss' ? 'loss' : '',
        sub,
        duelPosLine(me, s as OnlineState) +
          '<div class="actions"><button class="btn" id="drAgain">⚔️ Jugar otra vez</button><button class="btn ghost" id="drHome">Inicio</button></div>',
        compareHtml(me.mySlots, rv.slots, rv.name),
      );
      $('drAgain').addEventListener('click', startOnline);
      $('drHome').addEventListener('click', goHome);
      if (!me.celebrated) {
        me.celebrated = true;
        if (res === 'win') {
          beep('win');
          confetti();
        } else if (res === 'loss') beep('lose');
      }
      return;
    }
    if (s.status === 'cancelled') {
      scoreBox(
        me.myScore,
        rv.name,
        null,
        'Duelo anulado',
        '',
        'Ninguno de los dos terminó. No cuenta para el ELO.',
      );
      return;
    }
    const prog = rv.prog || 0;
    scoreBox(
      me.myScore,
      rv.name,
      null,
      'Esperando a ' + escapeHtml(rv.name) + '…',
      '',
      rv.done
        ? 'Ya ha terminado, calculando…'
        : 'Va por el jugador ' +
            Math.min(N, prog + 1) +
            ' de ' +
            N +
            '. Si se va, ganas tú.',
    );
  }
  function renderLink() {
    const me = duel;
    if (!me || me.kind !== 'enlace') return;
    if (me.role === 'creator') {
      if (me.err) {
        scoreBox(
          me.myScore,
          'Tu rival',
          null,
          'No se ha podido crear el reto',
          '',
          'Revisa la conexión y vuelve a intentarlo.',
          '<div class="actions"><button class="btn" id="drRetry">Reintentar</button></div>',
        );
        $('drRetry').addEventListener('click', () => {
          me.err = false;
          me.revealed = true;
          duelSubmit(me.myScore!);
          renderLink();
        });
        return;
      }
      if (!me.saved) {
        scoreBox(me.myScore, 'Tu rival', null, 'Creando tu reto…', '', '');
        return;
      }
      const url = baseUrl() + '?reto=' + me.code;
      scoreBox(
        me.myScore,
        'Tu rival',
        null,
        '🔗 Reto listo',
        '',
        'Mándale el enlace a quien quieras: jugará tus mismos 17 jugadores sin ver tu puntuación hasta el final. Verás quién te gana en la pestaña ⚔️ Duelos.',
        '<div class="actions"><button class="btn" id="drSend">Enviar el reto</button></div>',
      );
      $('drSend').addEventListener('click', () =>
        shareLink(
          url,
          '⚔️ He hecho ' +
            fmt(me.myScore!) +
            ' puntos en el Reto de los 15.000 goles. Te tocan mis mismos 17 jugadores. ¿Me ganas?',
        ),
      );
      return;
    }
    if (me.err) {
      scoreBox(
        me.myScore,
        me.creator,
        null,
        'Sin conexión',
        '',
        'No se ha podido enviar tu resultado.',
        '<div class="actions"><button class="btn" id="drRetry">Reintentar</button></div>',
      );
      $('drRetry').addEventListener('click', () => {
        me.err = false;
        duelSubmit(me.myScore!);
        renderLink();
      });
      return;
    }
    if (!me.link) {
      scoreBox(me.myScore, me.creator, null, 'Comparando…', '', '');
      return;
    }
    const l = me.link,
      cs = l.creator_score,
      w = me.myScore! > cs,
      d = me.myScore === cs;
    scoreBox(
      me.myScore,
      l.creator_name,
      cs,
      w ? '🏆 ¡Le has ganado!' : d ? '🤝 Empate' : 'Te ha ganado',
      w ? 'win' : d ? '' : 'loss',
      '',
      '<div class="actions"><button class="btn ghost" id="drMine">Crear mi propio reto</button></div>',
      compareHtml(me.mySlots, l.creator_slots, l.creator_name),
    );
    $('drMine').addEventListener('click', startLink);
    if (!me.celebrated) {
      me.celebrated = true;
      if (w) {
        beep('win');
        confetti();
      } else if (!d) beep('lose');
    }
  }

  // ---- tu posición en el mundo ----
  function top50Line(
    elo: number,
    pos: number | null,
    elo50: number | null,
  ): string {
    if (pos && pos <= 50) {
      if (elo >= MUNDIAL.t)
        return 'Estás en el <b>top 50</b> y juegas el Mundial';
      return (
        'Estás en el <b>top 50</b> · te faltan <b>' +
        fmt(MUNDIAL.t - elo) +
        '</b> puntos para el Mundial'
      );
    }
    if (elo50 == null) return 'Top 50 por llenar: gana duelos para entrar';
    return (
      'Te faltan <b>' +
      fmt(Math.max(1, elo50 - elo + 1)) +
      '</b> puntos para entrar en el top 50'
    );
  }
  async function worldInfo(): Promise<WorldInfo | null> {
    if (!registered()) return null;
    const [me, top] = await Promise.all([
      sbCall<DuelMeResponse>('duel_me', { pid: store.pid }),
      sbCall<DuelTopEntry[]>('duel_top'),
    ]);
    const games = me ? me.wins + me.losses + me.draws : 0;
    const elo50 = top && top.length >= 50 ? top[49].elo : null;
    return {
      elo: me ? me.elo : 1000,
      pos: games ? me!.pos : null,
      games,
      elo50,
    };
  }
  function duelPosLine(me: DuelState, s: OnlineState): string {
    const pos = s.my_pos,
      prev = me.prev && me.prev.pos,
      elo = s.my_elo || 1000,
      top = me.topAfter;
    const inTop = pos && pos <= 50;
    let mv = '';
    if (inTop && (!prev || prev > 50) && me.prev)
      mv = ' <span class="up">⬆️ ¡entras en el top 50!</span>';
    else if (inTop && prev && prev !== pos)
      mv =
        pos < prev
          ? ' <span class="up">⬆️ subes ' +
            (prev - pos) +
            ' puesto' +
            (prev - pos === 1 ? '' : 's') +
            '</span>'
          : ' <span class="down">⬇️ bajas ' +
            (pos - prev) +
            ' puesto' +
            (pos - prev === 1 ? '' : 's') +
            '</span>';
    let next = '';
    if (inTop) {
      // en el top 50: lo que te falta para pasar al jugador de delante
      if (pos === 1) next = '👑 ¡Eres el número 1 del mundo!';
      else if (top && top[pos - 2]) {
        const a = top[pos - 2];
        next =
          'Te faltan <b>' +
          fmt(Math.max(1, a.elo - elo + 1)) +
          '</b> puntos para pasar a ' +
          escapeHtml(a.name) +
          ' (' +
          (pos - 1) +
          'º)';
      }
    } else {
      // fuera del top 50: lo que te falta para la siguiente categoría
      const dv = divOf(elo, pos),
        nx = DIVS[DIVS.indexOf(dv) + 1] || MUNDIAL;
      if (nx === MUNDIAL) {
        const e50 =
          top && top.length >= 50
            ? top[49].elo
            : me.prev
              ? me.prev.elo50
              : null;
        const need = Math.max(
          MUNDIAL.t - elo,
          e50 != null ? e50 - elo + 1 : 0,
          1,
        );
        next =
          'Siguiente categoría: ' +
          MUNDIAL.ico +
          ' Mundial a <b>' +
          fmt(need) +
          '</b> puntos';
      } else
        next =
          'Siguiente categoría: ' +
          nx.ico +
          ' ' +
          nx.name +
          ' a <b>' +
          fmt(Math.max(1, nx.t - elo)) +
          '</b> puntos';
    }
    return (
      '<p class="worldpos">' +
      (inTop
        ? '🌍 Vas <b>' +
          pos +
          'º</b> del mundo en duelos' +
          mv +
          (next ? '<br>' : '')
        : prev && prev <= 50
          ? '<span class="down">⬇️ Sales del top 50</span><br>'
          : '') +
      next +
      '</p>'
    );
  }
  async function paintMyPos(): Promise<void> {
    const el = $('myPos');
    if (!registered()) {
      el.hidden = true;
      return;
    }
    try {
      const w = await worldInfo();
      if (!w) return;
      const dv = divOf(w.elo, w.pos ?? undefined);
      el.innerHTML =
        '<span>⚔️ Duelos: <b>' +
        (w.pos && w.pos <= 50
          ? w.pos + 'º del mundo'
          : w.pos
            ? 'fuera del top 50'
            : 'sin clasificar') +
        '</b> · ' +
        dv.ico +
        ' ' +
        dv.name +
        ' · ' +
        fmt(w.elo) +
        ' pts</span>' +
        '<span class="mp-sub">' +
        (w.games
          ? top50Line(w.elo, w.pos, w.elo50)
          : 'Juega un duelo online para entrar en la clasificación') +
        '</span>' +
        (seasonCache && seasonCache.current
          ? '<span class="mp-sub">🏆 ' +
            escapeHtml(seasonLabel(seasonCache.current)) +
            ' · quedan ' +
            daysLeft() +
            ' días</span>'
          : '') +
        '';
      el.hidden = false;
    } catch {
      el.hidden = true;
    }
  }

  // ---- homenaje al campeón de la temporada anterior ----
  function champOf(): {
    name: string;
    elo: number;
    num: number;
    month: string;
  } | null {
    const l = seasonCache && seasonCache.last;
    return l && l.podium && l.podium[0]
      ? {
          name: l.podium[0].name,
          elo: l.podium[0].elo,
          num: l.num,
          month: l.name,
        }
      : null;
  }
  function crown(name: string) {
    const c = champOf();
    return c &&
      String(name).trim().toLowerCase() === c.name.trim().toLowerCase()
      ? ' 👑'
      : '';
  }
  function paintChamp(): void {
    const el = $('champ'),
      c = champOf();
    if (!c) {
      el.hidden = true;
      return;
    }
    const mine =
      registered() &&
      store.name!.trim().toLowerCase() === c.name.trim().toLowerCase();
    el.innerHTML =
      '<span class="ch-ico">👑</span><span class="ch-tx"><span class="ch-tag">' +
      (mine ? '¡Eres el campeón!' : 'Campeón de la temporada pasada') +
      '</span>' +
      '<span class="ch-name">' +
      escapeHtml(c.name) +
      '</span>' +
      '<span class="ch-sub">TOP 1 TEMPORADA ' +
      c.num +
      ' · ' +
      escapeHtml(c.month) +
      ' · ' +
      fmt(c.elo) +
      ' puntos</span></span>';
    el.hidden = false;
  }

  // ---- temporadas mensuales y medallas ----
  let seasonCache: SeasonInfoResponse | null = null;
  function seasonMedal(pos: number, elo: number, season: number) {
    const t = ' TEMPORADA ' + season;
    if (pos <= 50)
      return {
        ico:
          pos === 1
            ? '🥇'
            : pos === 2
              ? '🥈'
              : pos === 3
                ? '🥉'
                : pos <= 10
                  ? '🏅'
                  : '🎖️',
        txt: 'TOP ' + pos + t,
      };
    const dv = divOf(elo, pos);
    return { ico: dv.ico, txt: dv.name.toUpperCase() + t };
  }
  function daysLeft(): number {
    const n = new Date(),
      next = new Date(n.getFullYear(), n.getMonth() + 1, 1);
    return Math.max(0, Math.ceil((next.getTime() - n.getTime()) / 864e5));
  }
  function seasonLabel(c: { num: number; name: string } | null | undefined) {
    return c ? 'Temporada ' + c.num + ' · ' + c.name : '';
  }
  async function seasonLoad(): Promise<SeasonInfoResponse | null> {
    seasonCache = await sbCall<SeasonInfoResponse>('season_info', {
      pid: store.pid || NOBODY,
    });
    return seasonCache;
  }
  async function seasonBoot(quiet: boolean): Promise<void> {
    try {
      await sbCall('season_tick');
      const info = await seasonLoad();
      paintMyPos();
      paintChamp();
      if (rankTab !== 'med') renderRank();
      if (quiet || !registered() || !info || !info.current) return;
      const cur = info.current.num;
      if (store.seasonSeen == null) {
        store.seasonSeen = cur;
        save();
        return;
      }
      if (store.seasonSeen! >= cur) return;
      store.seasonSeen = cur;
      save();
      const m = (info.medals || []).find((x) => x.season === cur - 1);
      const me = await sbCall<DuelMeResponse>('duel_me', {
        pid: store.pid,
      }).catch(() => null);
      if (!m) {
        toast(
          '<b>Empieza la ' + escapeHtml(seasonLabel(info.current)) + '</b>',
          '🏆',
        );
        return;
      }
      const md = seasonMedal(m.pos, m.elo, m.season);
      duelModal({
        ico: md.ico,
        tit: md.txt,
        txt:
          'Fin de la Temporada ' +
          m.season +
          ' (' +
          escapeHtml(m.name) +
          '): ' +
          (m.pos <= 50
            ? 'quedaste <b>' + m.pos + 'º del mundo</b>'
            : 'terminaste en <b>' +
              escapeHtml(divOf(m.elo, m.pos).name) +
              '</b>') +
          ' con ' +
          fmt(m.elo) +
          ' puntos (' +
          m.wins +
          '-' +
          m.losses +
          (m.draws ? '-' + m.draws : '') +
          ').',
        extra:
          '<p class="note">Empieza la <b>' +
          escapeHtml(seasonLabel(info.current)) +
          '</b>. Los puntos se han reiniciado a mitad de camino' +
          (me ? ': ahora tienes <b>' + fmt(me.elo) + '</b>' : '') +
          '. En los primeros duelos subes más rápido.</p>',
        buttons: [
          { label: '¡A por ello!', fn: closeDuelModal },
          {
            label: 'Ver mis medallas',
            ghost: true,
            fn: () => {
              closeDuelModal();
              $('rt-duel').click();
              $('p-rank').scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'start',
              });
            },
          },
        ],
      });
      beep('win');
      if (m.pos <= 3) confetti();
    } catch {
      /* Preserve the existing silent fallback. */
    }
  }

  // ---- pestaña ⚔️ Duelos del ranking ----
  let duelTabTok = 0;
  async function renderDuelTab(ul: HTMLElement): Promise<void> {
    const tok = ++duelTabTok,
      stale = () => rankTab !== 'duel' || tok !== duelTabTok; // solo pinta la última llamada
    $('rankNote').textContent = 'Cargando duelos…';
    const pid = registered() ? store.pid : null;
    let top: DuelTopEntry[] | null, me: DuelMeResponse | null;
    let mine: DuelLinkMine | null;
    try {
      await sbCall('bots_tick').catch(() => {});
      [top, me, mine] = await Promise.all([
        sbCall<DuelTopEntry[]>('duel_top'),
        pid ? sbCall<DuelMeResponse>('duel_me', { pid }) : null,
        Promise.resolve<DuelLinkMine | null>(null),
      ]);
    } catch {
      if (!stale())
        $('rankNote').textContent =
          'No se han podido cargar los duelos. Revisa la conexión.';
      return;
    }
    if (stale()) return;
    ul.innerHTML = '';
    const games = me ? me.wins + me.losses + me.draws : 0,
      elo = me ? me.elo : 1000,
      dv = divOf(elo, games ? me!.pos : null);
    if (games) {
      store.lastDiv = dv.name;
      save();
    }
    $('pass').hidden = false;
    $('phIco').textContent = dv.ico;
    $('phName').textContent = dv.name;
    const nxt = dv === MUNDIAL ? null : DIVS[DIVS.indexOf(dv) + 1] || MUNDIAL;
    $('phSub').textContent =
      (games ? fmt(elo) + ' puntos · ' : '') +
      (dv === MUNDIAL
        ? 'Estás entre los 50 mejores del mundo'
        : nxt === MUNDIAL
          ? 'Para el Mundial: entrar en el top 50'
          : nxt
            ? 'Te faltan ' + fmt(nxt.t - elo) + ' para ' + nxt.name
            : '') +
      ' · ' +
      (games
        ? me!.wins +
          (me!.wins === 1 ? ' victoria' : ' victorias') +
          ' · ' +
          me!.losses +
          (me!.losses === 1 ? ' derrota' : ' derrotas') +
          (me!.draws
            ? ' · ' + me!.draws + (me!.draws === 1 ? ' empate' : ' empates')
            : '') +
          (me!.pos! <= 50 ? ' · vas ' + me!.pos + 'º' : ' · fuera del top 50') +
          (games < 10
            ? ' · te quedan ' +
              (10 - games) +
              ' duelos de clasificación (subes más rápido)'
            : '')
        : 'Juega un duelo online para entrar en la clasificación');
    const tr = $('track');
    tr.innerHTML = '';
    const ladder = DIVS.concat([MUNDIAL]),
      idx = ladder.indexOf(dv);
    ladder.forEach((m, i) => {
      const d = document.createElement('div');
      d.className =
        'node' + (i <= idx ? ' on' : '') + (i === idx ? ' now' : '');
      d.innerHTML =
        (i === idx ? '<span class="tagnow">AQUÍ</span>' : '') +
        '<span class="dot">' +
        (i <= idx ? m.ico : '🔒') +
        '</span><span class="nn">' +
        m.name +
        '</span><span class="np">' +
        (m === MUNDIAL ? 'Top 50' : fmt(m.t) + ' pts') +
        '</span>';
      tr.appendChild(d);
    });
    setTimeout(() => {
      const n = tr.querySelector<HTMLElement>('.node.now')!;
      if (n)
        tr.scrollLeft = Math.max(0, n.offsetLeft - tr.clientWidth / 2 + 52);
    }, 50);
    const head = (t: string) => {
      const h = document.createElement('li');
      h.className = 'medhead';
      h.innerHTML = '<span>' + t + '</span><span class="s"></span>';
      ul.appendChild(h);
    };
    let info = seasonCache;
    try {
      info = await seasonLoad();
    } catch {
      /* Preserve the existing silent fallback. */
    }
    if (stale()) return;
    if (info && info.current)
      head(
        '🏆 ' +
          escapeHtml(seasonLabel(info.current)) +
          ' · quedan ' +
          daysLeft() +
          ' días',
      );
    if (info && info.medals && info.medals.length) {
      head('Tus medallas');
      info.medals.forEach((m) => {
        const md = seasonMedal(m.pos, m.elo, m.season),
          li = document.createElement('li');
        li.className = 'plain';
        li.innerHTML =
          '<span>' +
          md.ico +
          ' <b>' +
          md.txt +
          '</b><span class="d"> · ' +
          escapeHtml(m.name) +
          '</span></span><span class="s">' +
          fmt(m.elo) +
          '</span>';
        ul.appendChild(li);
      });
    }
    if (info && info.last && info.last.podium && info.last.podium.length) {
      const last = info.last;
      head(
        'Campeones de la Temporada ' + last.num + ' · ' + escapeHtml(last.name),
      );
      last.podium!.forEach((x) => {
        const li = document.createElement('li');
        li.className = 'plain';
        li.innerHTML =
          '<span>' +
          (['🥇', '🥈', '🥉'][x.pos - 1] || '🏅') +
          ' ' +
          escapeHtml(x.name) +
          '<span class="d"> · TOP ' +
          x.pos +
          ' TEMPORADA ' +
          last.num +
          '</span></span><span class="s">' +
          fmt(x.elo) +
          '</span>';
        ul.appendChild(li);
      });
    }
    head('Clasificación de duelos online');
    const myName = registered() ? store.name!.trim().toLowerCase() : '';
    if (!top || !top.length) {
      const li = document.createElement('li');
      li.className = 'plain';
      li.innerHTML =
        '<span class="d">Aún no se ha jugado ningún duelo. Estrena la clasificación.</span><span></span>';
      ul.appendChild(li);
    }
    const myIdx = (top || []).findIndex(
      (r) => myName && r.name.trim().toLowerCase() === myName,
    );
    const shown: Array<[DuelTopEntry, number] | null> = (top || [])
      .slice(0, 20)
      .map((r, i) => [r, i]);
    if (myIdx >= 20 && myIdx < 50) shown.push(null, [top![myIdx], myIdx]);
    shown.forEach((x) => {
      if (!x) {
        const sp = document.createElement('li');
        sp.className = 'sep';
        sp.innerHTML = '<span>⋯</span>';
        ul.appendChild(sp);
        return;
      }
      const [r, i] = x;
      const li = document.createElement('li');
      const isMe = myName && r.name.trim().toLowerCase() === myName;
      if (isMe) li.className = 'mine';
      li.style.counterSet = 'r ' + i;
      const d = divOf(r.elo, i + 1);
      li.innerHTML =
        '<span>' +
        (isMe ? '<b>' + escapeHtml(r.name) + '</b>' : escapeHtml(r.name)) +
        crown(r.name) +
        '<span class="d"> · ' +
        d.ico +
        ' ' +
        d.name +
        '</span></span><span class="s">' +
        fmt(r.elo) +
        '</span>';
      ul.appendChild(li);
    });
    if (mine && ((mine.created || []).length || (mine.answered || []).length)) {
      head('Tus retos por enlace');
      (mine.created || []).forEach((c) => {
        const done = (c.plays || []).filter((p) => p.score != null);
        if (!done.length) {
          const li = document.createElement('li');
          li.className = 'plain';
          li.innerHTML =
            '<span>Tu reto de ' +
            fmt(c.score) +
            '<span class="d"> · nadie lo ha jugado aún</span></span><span class="s"></span>';
          ul.appendChild(li);
          return;
        }
        done.forEach((p) => {
          const li = document.createElement('li');
          li.className =
            'plain ' +
            (c.score > p.score! ? 'w' : c.score < p.score! ? 'l' : '');
          li.innerHTML =
            '<span>' +
            escapeHtml(p.name) +
            ' jugó tu reto<span class="d"> · ' +
            (c.score > p.score!
              ? 'le ganaste'
              : c.score < p.score!
                ? 'te ganó'
                : 'empate') +
            '</span></span><span class="s">' +
            fmt(c.score) +
            '–' +
            fmt(p.score!) +
            '</span>';
          ul.appendChild(li);
        });
      });
      (mine.answered || []).forEach((a) => {
        const li = document.createElement('li');
        const done = a.score != null;
        li.className =
          'plain ' +
          (!done
            ? ''
            : a.score! > a.rival_score
              ? 'w'
              : a.score! < a.rival_score
                ? 'l'
                : '');
        li.innerHTML =
          '<span>Reto de ' +
          escapeHtml(a.rival) +
          '<span class="d"> · ' +
          (!done
            ? 'a medias'
            : a.score! > a.rival_score
              ? 'le ganaste'
              : a.score! < a.rival_score
                ? 'te ganó'
                : 'empate') +
          '</span></span><span class="s">' +
          (done ? fmt(a.score!) + '–' + fmt(a.rival_score) : '–') +
          '</span>';
        ul.appendChild(li);
      });
    }
    $('rankNote').textContent =
      'Cada mes es una temporada: el día 1 se guarda tu clasificación como medalla y los puntos se reinician a mitad de camino de 1.000. Todos empiezan con 1.000 puntos en la Saudi Pro League. Ganar un duelo suma y perderlo resta; ganar a alguien de una liga mejor da más. En los 10 primeros duelos se sube más rápido, y desde la Premier cuesta más. Bonus: +5 si haces 12.000 en el reto y +10 si llegas a 15.000, ganes o pierdas. El Mundial es para los 50 mejores del mundo que estén a nivel Champions. Los retos por enlace son amistosos y no cuentan.';
  }

  // ---- al abrir la web: enlaces de reto y avisos ----
  async function duelBoot() {
    const qs = new URLSearchParams(location.search);
    const code = (qs.get('reto') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const online = qs.has('online');
    const sala = (qs.get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    seasonBoot(!!(code || online || sala))
      .then(() => sbCall('bots_tick'))
      .catch(() => {});
    if (code || online || sala) {
      try {
        history.replaceState(null, '', baseUrl());
      } catch {
        /* Preserve the existing silent fallback. */
      }
    }
    if (sala) openRoom(sala);
    else if (code) openLink(code);
    else if (online)
      duelModal({
        ico: '⚔️',
        tit: 'Duelo online',
        txt: 'Te han invitado a un duelo. Dale a buscar rival y os emparejamos.',
        buttons: [
          {
            label: 'Buscar rival',
            fn: () => {
              closeDuelModal();
              startOnline();
            },
          },
          { label: 'Ahora no', ghost: true, fn: closeDuelModal },
        ],
      });
    if (!registered()) return;
    try {
      const mine = await sbCall<DuelLinkMine>('link_mine', { pid: store.pid });
      if (!mine) return;
      const linkSeen = store.linkSeen || (store.linkSeen = {});
      let k = 0;
      (mine.created || []).forEach((c) => {
        (c.plays || [])
          .filter((p) => p.score != null)
          .forEach((p) => {
            const key = c.code + ':' + p.name;
            if (linkSeen[key]) return;
            linkSeen[key] = 1;
            const txt =
              escapeHtml(p.name) +
              ' ha jugado tu reto: ' +
              fmt(p.score!) +
              ' contra tus ' +
              fmt(c.score) +
              (p.score! > c.score
                ? ' · te ha ganado'
                : p.score! < c.score
                  ? ' · le has ganado'
                  : ' · empate');
            setTimeout(() => toast(txt, '⚔️'), 800 + k++ * 1200);
          });
      });
      save();
    } catch {
      /* Preserve the existing silent fallback. */
    }
  }

  function toast(txt: string, ico = ''): void {
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML =
      (ico ? '<span>' + ico + '</span>' : '') + '<span>' + txt + '</span>';
    $('toasts').appendChild(d);
    setTimeout(() => d.remove(), 3600);
  }
  function showRankUp(r: Rank, review = false): void {
    $('rankUp').querySelector<HTMLElement>('.ru-tag')!.textContent = review
      ? 'TU RANGO ACTUAL'
      : 'HAS SUBIDO DE RANGO';
    $('ruIco').textContent = r.ico;
    $('ruName').textContent = r.name;
    const rr = $('ruRar');
    rr.textContent = r.rar.toUpperCase();
    rr.style.color = RARCOL[r.rar];
    rr.style.borderColor = RARCOL[r.rar];
    const nx = RANKS[RANKS.indexOf(r) + 1];
    $('ruRew').textContent = nx
      ? 'Siguiente rango: ' +
        nx.ico +
        ' ' +
        nx.name +
        ' · desde ' +
        fmt(nx.t) +
        ' puntos'
      : 'Has llegado al rango máximo';
    $('rankUp').hidden = false;
    beep('win');
    if (!review) confetti();
  }
  $('ruOk').addEventListener('click', () => {
    $('rankUp').hidden = true;
  });
  $('rankUp').addEventListener('click', (e) => {
    if (e.target === $('rankUp')) $('rankUp').hidden = true;
  });

  function renderStats() {
    $('sGames').textContent = String(store.games);
    $('sWins').textContent = String(store.wins);
    $('sBest').textContent = store.best ? fmt(store.best) : '–';
  }
  renderStats();

  const LOGO_SRC =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="gdhs5"><rect x="0" y="0" width="100" height="63"></rect></clipPath><clipPath id="gdds5"><circle cx="50" cy="60" r="31.5"></circle></clipPath></defs><g clip-path="url(#gdhs5)"><circle cx="50" cy="60" r="32" fill="#f5f8f3"></circle><g clip-path="url(#gdds5)"><polygon points="50.00,33.00 59.51,39.91 55.88,51.09 44.12,51.09 40.49,39.91" fill="#06241a"></polygon><path d="M50.00 33.00L50.00 26.00" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="50.00,25.50 40.96,18.94 44.42,8.31 55.58,8.31 59.04,18.94" fill="#06241a"></polygon><path d="M59.51 39.91L66.17 37.75" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="66.64,37.59 70.09,26.97 81.26,26.97 84.71,37.59 75.68,44.16" fill="#06241a"></polygon><path d="M55.88 51.09L59.99 56.75" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="60.29,57.16 71.45,57.16 74.91,67.78 65.87,74.34 56.84,67.78" fill="#06241a"></polygon><path d="M44.12 51.09L40.01 56.75" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="39.71,57.16 43.16,67.78 34.13,74.34 25.09,67.78 28.55,57.16" fill="#06241a"></polygon><path d="M40.49 39.91L33.83 37.75" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="33.36,37.59 24.32,44.16 15.29,37.59 18.74,26.97 29.91,26.97" fill="#06241a"></polygon></g></g><path d="M9 72H91" stroke="#f5f8f3" stroke-width="7" stroke-linecap="round"></path></svg>',
    );
  let logoImg: Promise<HTMLImageElement | null> | null = null;
  function loadLogo() {
    if (logoImg) return logoImg;
    logoImg = new Promise<HTMLImageElement | null>((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = LOGO_SRC;
    });
    return logoImg;
  }
  async function drawShare() {
    const logo = await loadLogo();
    try {
      await document.fonts.load('600 46px Jost');
    } catch {
      /* Preserve the existing silent fallback. */
    }
    const r = lastResult!,
      c = $('shareCanvas'),
      x = c.getContext('2d')!,
      W = c.width,
      H = c.height;
    x.fillStyle = '#06241a';
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 150) {
      x.fillStyle = (i / 150) % 2 ? '#0d4a33' : '#0b4530';
      x.fillRect(i, 0, 150, H);
    }
    const g = x.createRadialGradient(W / 2, 0, 0, W / 2, 0, H);
    g.addColorStop(0, 'rgba(255,255,220,.18)');
    g.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.textAlign = 'center';
    x.fillStyle = '#f3c545';
    x.font = '700 34px Barlow, sans-serif';
    x.fillText(
      (r.daily
        ? 'RETO DIARIO · ' + r.date.split('-').reverse().join('/')
        : 'RETO DE LOS 15.000 GOLES'
      ).toUpperCase(),
      W / 2,
      110,
    );
    x.fillStyle = '#f5f8f3';
    x.font = '900 96px "Barlow Condensed", Impact, sans-serif';
    x.fillText('RETO DE LOS', W / 2, 215);
    x.fillStyle = '#f3c545';
    x.fillText('15.000 GOLES', W / 2, 305);
    x.font = '900 200px "Barlow Condensed", Impact, sans-serif';
    x.fillStyle = r.pass ? '#63e0a1' : '#f5f8f3';
    x.fillText(fmt(r.t), W / 2, 520);
    x.font = '700 40px Barlow, sans-serif';
    x.fillStyle = '#f5f8f3';
    x.fillText('puntos', W / 2, 575);

    x.font = '900 56px "Barlow Condensed", sans-serif';
    x.fillStyle = '#f3c545';
    x.save();
    x.font = '90px "Noto Color Emoji",sans-serif';
    x.fillText(r.med.ico, W / 2, 700);
    x.restore();
    x.fillText(r.med.name.toUpperCase(), W / 2, 770);
    x.font = '700 28px Barlow, sans-serif';
    x.fillStyle = 'rgba(245,248,243,.72)';
    x.fillText(
      'Medalla ' +
        r.med.rar.toUpperCase() +
        ' · la consiguen ' +
        r.med.pct +
        ' de los jugadores',
      W / 2,
      815,
    );
    const top = r.slots
      .slice()
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 3);
    let y = 880;
    x.textAlign = 'left';
    top.forEach((s) => {
      x.fillStyle = 'rgba(255,255,255,.08)';
      x.fillRect(90, y - 48, W - 180, 72);
      x.fillStyle = '#f5f8f3';
      x.font = '700 38px Barlow, sans-serif';
      let nm = s.p.name;
      if (nm.length > 22) nm = nm.slice(0, 21) + '…';
      x.fillText(nm + '  ·  ' + SLOTS[s.i].label, 120, y);
      x.textAlign = 'right';
      x.fillStyle = '#f3c545';
      x.font = '900 46px "Barlow Condensed", sans-serif';
      x.fillText(fmt(s.pts), W - 120, y);
      x.textAlign = 'left';
      y += 100;
    });
    x.textAlign = 'center';
    x.fillStyle = 'rgba(245,248,243,.75)';
    x.font = '600 34px Barlow, sans-serif';
    x.fillText(
      r.pass
        ? '¡Reto superado!'
        : 'Me faltaron ' + fmt(r.goal - r.t) + ' puntos',
      W / 2,
      1210,
    );
    x.fillStyle = 'rgba(245,248,243,.5)';
    x.font = '600 30px Barlow, sans-serif';
    x.fillText('¿Lo superas tú?', W / 2, 1255);
    x.font = '600 46px Jost, "Century Gothic", sans-serif';
    if ('letterSpacing' in x) x.letterSpacing = '6px';
    const tw = x.measureText('GOALDAY').width,
      ms = 64,
      gap = 14,
      bx = W / 2 - (ms + gap + tw) / 2;
    if (logo) x.drawImage(logo, bx, 1318 - ms + 10, ms, ms);
    x.textAlign = 'left';
    x.fillStyle = '#f5f8f3';
    x.fillText('GOALDAY', bx + ms + gap, 1318);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    x.textAlign = 'center';
    return new Promise<Blob | null>((res) =>
      c.toBlob((b) => res(b), 'image/png'),
    );
  }
  let shareBlob: Blob | null = null;
  async function share() {
    if (!lastResult) return;
    shareBlob = await drawShare();
    $('shareImg').src = URL.createObjectURL(shareBlob!);
    $('shareModal').hidden = false;
  }
  async function shareNow() {
    const r = lastResult!;
    const text =
      (r.daily ? 'Reto diario ' : '') +
      'Reto de los 15.000 goles ⚽ ' +
      fmt(r.t) +
      ' puntos · ' +
      r.med.name +
      '. ¿Lo superas? ' +
      location.href;
    try {
      const file = new File([shareBlob!], 'goalday-15000.png', {
        type: 'image/png',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(shareBlob!);
      a.download = 'goalday-15000.png';
      a.click();
    } catch {
      /* Preserve the existing silent fallback. */
    }
  }
  $('btnShareNow').addEventListener('click', shareNow);
  $('btnCloseShare').addEventListener('click', () => {
    $('shareModal').hidden = true;
  });
  $('shareModal').addEventListener('click', (e) => {
    if (e.target === $('shareModal')) $('shareModal').hidden = true;
  });

  function confetti() {
    if (reduceMotion) return;
    const c = $('confetti'),
      ctx = c.getContext('2d')!;
    c.hidden = false;
    c.width = innerWidth;
    c.height = innerHeight;
    const cols = ['#f3c545', '#ffe08a', '#63e0a1', '#f5f8f3', '#ff6b5c'];
    const ps = Array.from({ length: 140 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.5,
      r: 4 + Math.random() * 5,
      vy: 2 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      rot: Math.random() * 6,
      vr: -0.1 + Math.random() * 0.2,
      col: cols[Math.floor(Math.random() * cols.length)],
    }));
    const t0 = performance.now();
    (function frame(t: number) {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        ctx.restore();
      });
      if (t - t0 < 3200) requestAnimationFrame(frame);
      else {
        ctx.clearRect(0, 0, c.width, c.height);
        c.hidden = true;
      }
    })(t0);
  }

  (
    [
      ['tab-libre', 'libre'],
      ['tab-diario', 'diario'],
    ] as const
  ).forEach(([id, m]) => {
    $(id).addEventListener('click', () => {
      if (countingWait()) return;
      stopDuel();
      mode = m;
      $('result').hidden = true;
      document.body.classList.remove('done');
      newGame();
    });
  });
  function countingWait() {
    if (counting) toast('Espera a que termine el recuento', '⏳');
    return counting;
  }
  $('tab-online').addEventListener('click', () => {
    if (!countingWait()) startOnline();
  });
  $('myPos').addEventListener('click', () => {
    $('rt-duel').click();
    $('p-rank').scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  });
  $('tab-enlace').addEventListener('click', () => {
    if (!countingWait()) startRoom();
  });
  function goHome() {
    paintMyPos();
    stopDuel();
    if (mode === 'online' || mode === 'enlace') mode = 'libre';
    document.body.classList.remove('playing', 'done');
    game = null;
    $('result').hidden = true;
    $('dailyBar').hidden = true;
    $('skips').hidden = true;
    const d = store.daily[todayKey()];
    $('dailySub').textContent = d
      ? 'Hoy ya lo has jugado: ' + fmt(d.t) + ' puntos'
      : (store.dailyStart || {})[todayKey()]
        ? 'Hoy lo dejaste a medias. Vuelve mañana'
        : 'Los mismos 17 jugadores para todo el mundo. Un solo intento';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  board.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.slot');
    if (b && !b.disabled) place(Number(b.dataset.i));
  });
  $('btnAgain').addEventListener('click', () => {
    if (mode === 'online') {
      if (lastPrivate) rematch();
      else startOnline();
      return;
    }
    if (mode === 'enlace') {
      startLink();
      return;
    }
    $('result').hidden = true;
    document.body.classList.remove('done');
    if (
      mode === 'diario' &&
      (store.daily[todayKey()] || (store.dailyStart || {})[todayKey()])
    ) {
      mode = 'libre';
    }
    newGame();
  });
  $('btnHome').addEventListener('click', goHome);
  $('btnRank').addEventListener('click', () => {
    showRankUp(RANKS[rankIdx(store.best || 0)], true);
  });
  $('btnShare').addEventListener('click', share);
  goHome();
  duelBoot();
}
