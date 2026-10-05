import type { EmojiPlayer } from './engine';
import { dayKey } from './engine';

export interface StoredDay {
  res: number[];
  score: number;
  done: boolean;
  sent?: boolean;
  cur?: { i: number; fails: string[] };
}

export interface EmojiStore extends Record<string, unknown> {
  days: Record<string, StoredDay>;
  streak: number;
  lastDone?: string;
}

export type Phase = 'home' | 'game' | 'end';

export interface GameModel {
  store: EmojiStore;
  today: string;
  phase: Phase;
  query: string;
  suggestionsOpen: boolean;
  suggestionIndex: number;
  feedback: string;
  feedbackKind: '' | 'bad' | 'good';
  reveal: boolean;
  revealFails: string[];
  review: boolean;
  nameOpen: boolean;
  name: string;
  nameError: string;
  registrationBusy: boolean;
  rankTab: 'week' | 'day';
  rankRows: { name: string; score: number; position: number }[] | null;
  rankLoading: boolean;
  rankMessage: string;
  toast: string;
}

export const POINTS = [600, 400, 200] as const;
export const PLAYER_COUNT = 5;

export function emptyStore(value: unknown): EmojiStore {
  const original = value && typeof value === 'object' ? value : {};
  const source = original as Partial<EmojiStore>;
  return {
    ...source,
    days: source.days && typeof source.days === 'object' ? source.days : {},
    streak: Number(source.streak) || 0,
  };
}

export function createModel(store: unknown, today: Date): GameModel {
  const clean = emptyStore(store);
  const key = dayKey(today);
  return {
    store: clean,
    today: key,
    phase: 'home',
    query: '',
    suggestionsOpen: false,
    suggestionIndex: 0,
    feedback: '',
    feedbackKind: '',
    reveal: false,
    revealFails: [],
    review: false,
    nameOpen: false,
    name: '',
    nameError: '',
    registrationBusy: false,
    rankTab: 'week',
    rankRows: null,
    rankLoading: true,
    rankMessage: '',
    toast: '',
  };
}

export function currentDay(model: GameModel): StoredDay | null {
  return model.store.days[model.today] || null;
}

export function currentFails(model: GameModel): string[] {
  const day = currentDay(model);
  const index = day?.res.length || 0;
  return day?.cur?.i === index ? day.cur.fails : [];
}

export function updateStreak(store: EmojiStore, today: Date): void {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const key = dayKey(today);
  if (store.lastDone === key) return;
  store.streak = store.lastDone === dayKey(yesterday) ? store.streak + 1 : 1;
  store.lastDone = key;
}

export function weekStart(date: Date): string {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return dayKey(monday);
}

export function findSuggestions(
  query: string,
  fails: string[],
  players: readonly EmojiPlayer[],
  matches: (query: string, name: string) => boolean,
  normalize: (value: string) => string,
): EmojiPlayer[] {
  if (normalize(query).length < 2) return [];
  return players
    .filter(
      (player) => matches(query, player.name) && !fails.includes(player.name),
    )
    .slice(0, 5);
}

export function resolveGuess(
  day: StoredDay,
  index: number,
  target: EmojiPlayer,
  guess: EmojiPlayer,
): {
  day: StoredDay;
  result: 'wrong' | 'duplicate' | 'right' | 'failed';
  attempt: number;
} {
  const fails = day.cur?.i === index ? day.cur.fails.slice() : [];
  if (guess.name === target.name) {
    const attempt = fails.length + 1;
    const res = day.res.slice();
    res[index] = attempt;
    const next: StoredDay = {
      ...day,
      res,
      score: day.score + POINTS[attempt - 1],
      cur: undefined,
    };
    delete next.cur;
    return { day: next, result: 'right', attempt };
  }
  if (fails.includes(guess.name))
    return { day, result: 'duplicate', attempt: 0 };
  fails.push(guess.name);
  if (fails.length >= 3) {
    const res = day.res.slice();
    res[index] = 0;
    const next: StoredDay = { ...day, res, cur: undefined };
    delete next.cur;
    return { day: next, result: 'failed', attempt: 0 };
  }
  return {
    day: { ...day, cur: { i: index, fails } },
    result: 'wrong',
    attempt: 0,
  };
}
