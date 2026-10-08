import { players } from '../../data/players';
import { extraPlayers } from '../../data/extra-players';
import type { Position } from '../../data/player-types';
import { difficultyTier, relativeDifference } from './engine';

export type CategoryKey = 'carrera' | 'seleccion';
export type GameMode = 'daily' | 'free';
export interface Category {
  k: CategoryKey;
  t: string;
  n: string;
  d: string;
  min: number;
}
export const CATEGORIES: Category[] = [
  {
    k: 'carrera',
    t: 'Goles en toda su carrera',
    n: 'Carrera',
    d: 'Goles totales en toda su carrera',
    min: 0,
  },
  {
    k: 'seleccion',
    t: 'Goles con su selección',
    n: 'Selección',
    d: 'Goles con su selección nacional',
    min: 1,
  },
];

export interface GamePlayer {
  name: string;
  flag: string;
  pos: Position;
  carrera: number | null;
  seleccion: number | null;
}
export type PlayablePlayer = GamePlayer & Record<CategoryKey, number>;
export const ALL_PLAYERS: GamePlayer[] = [...players, ...extraPlayers];
export const FAMOUS = new Set(players.map((player) => player.name));
export const POSITION_NAMES: Record<Position, string> = {
  DEF: 'Defensa',
  MED: 'Centrocampista',
  DEL: 'Delantero',
};

export interface DailyEntry extends Record<string, unknown> {
  start?: number;
  done?: number;
  streak?: number;
  sent?: number;
}
export interface GameStats extends Record<string, unknown> {
  best: number;
  games: number;
  total: number;
  bestByCat: Partial<Record<CategoryKey, number>>;
  sent: Partial<Record<CategoryKey, number>>;
  bestDaily?: number;
}
export interface StoredData {
  stats: GameStats;
  daily: Record<string, DailyEntry>;
}

export function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate())
  );
}

export function seeded(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  };
}

export function madridDay(now = new Date()): Date {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((item) => item.type === type)?.value);
    return new Date(part('year'), part('month') - 1, part('day'));
  } catch {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

export function normalizeStats(value: unknown): GameStats {
  const source =
    value && typeof value === 'object' ? (value as Partial<GameStats>) : {};
  return {
    ...source,
    best: source.best || 0,
    games: source.games || 0,
    total: source.total || 0,
    bestByCat: { ...(source.bestByCat || {}) },
    sent: { ...(source.sent || {}) },
  };
}

export function eligiblePlayers(category: Category): PlayablePlayer[] {
  return ALL_PLAYERS.filter((player): player is PlayablePlayer => {
    const value = player[category.k];
    return typeof value === 'number' && value >= category.min;
  });
}

export function pickOpponent(
  player: PlayablePlayer,
  pool: PlayablePlayer[],
  used: ReadonlySet<string>,
  category: CategoryKey,
  streak: number,
  random: () => number,
): PlayablePlayer | null {
  let base = pool.filter(
    (candidate) =>
      candidate !== player &&
      !used.has(candidate.name) &&
      candidate[category] !== player[category],
  );
  if (streak < 5) {
    const famous = base.filter((candidate) => FAMOUS.has(candidate.name));
    if (famous.length) base = famous;
  }
  const [minimum, maximum] = difficultyTier(streak);
  for (const [low, high] of [
    [minimum, maximum],
    [0.1, Math.max(maximum, 0.85)],
    [0.1, 1],
  ]) {
    const candidates = base.filter((candidate) => {
      const difference = relativeDifference(
        player[category],
        candidate[category],
      );
      return difference >= low! && difference <= high!;
    });
    if (candidates.length)
      return candidates[Math.floor(random() * candidates.length)]!;
  }
  return base.length ? base[Math.floor(random() * base.length)]! : null;
}
