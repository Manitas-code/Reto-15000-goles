import { readJson, writeJson } from '../../shared/storage/json';
import { DAILY_KEY, STATS_KEY, emptyStats } from './model';
import type { DailyResult, Stats } from './state';

export function readStats(): Stats {
  const stats = readJson<Stats>(STATS_KEY, emptyStats());
  stats.best = stats.best || {};
  stats.sent = stats.sent || {};
  stats.games = stats.games || 0;
  stats.hands = stats.hands || 0;
  return stats;
}

export function saveStats(stats: Stats): void {
  writeJson(STATS_KEY, stats);
}

export function readDaily(): Record<string, DailyResult> {
  return readJson<Record<string, DailyResult>>(DAILY_KEY, {});
}

export function patchDaily(
  day: string,
  patch: Partial<DailyResult>,
): Record<string, DailyResult> {
  const all = readDaily();
  all[day] = Object.assign(all[day] || {}, patch);
  const keys = Object.keys(all).sort();
  while (keys.length > 7) delete all[keys.shift()!];
  writeJson(DAILY_KEY, all);
  return all;
}
