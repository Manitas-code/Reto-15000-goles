import { readJson, writeJson } from '../../shared/storage/json';
import { normalizeStats, type DailyEntry, type GameStats } from './model';

export const STATS_KEY = 'gd_mm_stats';
export const DAILY_KEY = 'gd_mm_daily';

export function readStats(): GameStats {
  return normalizeStats(readJson<unknown>(STATS_KEY, {}));
}

export function readDaily(): Record<string, DailyEntry> {
  const value = readJson<unknown>(DAILY_KEY, {});
  return value && typeof value === 'object'
    ? (value as Record<string, DailyEntry>)
    : {};
}

export function writeStats(stats: GameStats): void {
  writeJson(STATS_KEY, stats);
}

export function writeDaily(daily: Record<string, DailyEntry>): void {
  writeJson(DAILY_KEY, daily);
}

export function updateDaily(
  source: Record<string, DailyEntry>,
  day: string,
  update: Partial<DailyEntry>,
): Record<string, DailyEntry> {
  const next = { ...source, [day]: { ...(source[day] || {}), ...update } };
  const keys = Object.keys(next).sort();
  while (keys.length > 7) {
    const oldest = keys.shift();
    if (oldest) delete next[oldest];
  }
  return next;
}
