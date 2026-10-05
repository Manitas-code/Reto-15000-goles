import { retoPlayers } from '../../data/players';
import type { RetoPlayer } from '../../data/player-types';
import {
  mulberry,
  multiplierFor,
  N,
  pointsFor,
  seedFrom,
  shuffle,
  SLOTS,
  todayKey,
} from './engine';

export type BotPlan = { q: RetoPlayer[]; boost: number };
export type OptimalAssignment = {
  pts: number[][];
  slotOf: number[];
  best: number;
};
export type BotOutcome = {
  total: number;
  slots: Array<[string, number] | undefined>;
  best?: number;
};
export type BotResult = {
  score: number;
  slots: Array<[string, number] | undefined>;
  times: number[];
  finishAt: number;
};

export function drawMany(
  n: number,
  rnd: (() => number) | null,
  deck: number[],
): RetoPlayer[] {
  if (rnd)
    return shuffle(
      retoPlayers.map((_, i) => i),
      rnd,
    )
      .slice(0, n)
      .map((i) => retoPlayers[i]!);
  const out: number[] = [];
  while (out.length < n) {
    if (!deck.length) deck.push(...shuffle(retoPlayers.map((_, i) => i)));
    const i = deck.pop();
    if (i !== undefined && !out.includes(i)) out.push(i);
  }
  return out.map((i) => retoPlayers[i]!);
}

export function seededDeal(seedStr: string): BotPlan {
  const rnd = mulberry(seedFrom(seedStr));
  const q = drawMany(N + 2, rnd, []);
  const leagueSlots = [1, 2, 3, 4, 5, 6];
  const boost = leagueSlots[Math.floor(rnd() * leagueSlots.length)]!;
  return { q, boost };
}

export function optimalAssign(
  q: RetoPlayer[],
  boost: number,
): OptimalAssignment {
  const pts = q.map((p) =>
    SLOTS.map((_, i) => pointsFor(p, i, multiplierFor(i, boost))),
  );
  const full = (1 << N) - 1,
    dp = new Float64Array(1 << N).fill(-1),
    par = new Int8Array(1 << N),
    pc = new Uint8Array(1 << N);
  for (let m = 1; m <= full; m++) pc[m] = pc[m >> 1]! + (m & 1);
  dp[0] = 0;
  for (let m = 0; m < full; m++) {
    if (dp[m]! < 0) continue;
    const row = pts[pc[m]!]!,
      base = dp[m]!;
    for (let s = 0; s < N; s++) {
      if (m & (1 << s)) continue;
      const nm = m | (1 << s),
        v = base + row[s]!;
      if (v > dp[nm]!) {
        dp[nm] = v;
        par[nm] = s;
      }
    }
  }
  const slotOf: number[] = new Array(N);
  let m = full;
  while (m) {
    const s = par[m]!;
    slotOf[pc[m]! - 1] = s;
    m ^= 1 << s;
  }
  return { pts, slotOf, best: dp[full]! };
}

export function botResult(
  q: RetoPlayer[],
  boost: number,
  ratio: number,
  cap: number,
  pre?: OptimalAssignment,
): BotOutcome {
  const o = pre || optimalAssign(q, boost),
    slotOf = o.slotOf.slice();
  const totalOf = () => slotOf.reduce((a, s, i) => a + o.pts[i]![s]!, 0);
  const goal = Math.min(o.best * ratio, cap || 14999),
    low = goal - o.best * 0.01;
  let total = totalOf();
  for (let it = 0; it < 4000 && total > goal; it++) {
    const a = Math.floor(Math.random() * N),
      b = Math.floor(Math.random() * N);
    if (a === b) continue;
    const next =
      total -
      o.pts[a]![slotOf[a]!]! -
      o.pts[b]![slotOf[b]!]! +
      o.pts[a]![slotOf[b]!]! +
      o.pts[b]![slotOf[a]!]!;
    if (next < total && next >= low) {
      const x = slotOf[a]!;
      slotOf[a] = slotOf[b]!;
      slotOf[b] = x;
      total = next;
    }
  }
  const slots: Array<[string, number] | undefined> = new Array(N);
  slotOf.forEach((s, i) => {
    slots[s] = [q[i]!.name, Math.round(o.pts[i]![s]!)];
  });
  return { total: Math.round(total), slots, best: o.best };
}

export function botRatio(elo: number): number {
  const pts = [
    [800, 0.55],
    [1000, 0.62],
    [1300, 0.72],
    [1600, 0.82],
    [1770, 0.88],
  ];
  let ratio = pts[0]![1]!;
  for (let i = 0; i < pts.length; i++) {
    if (elo >= pts[i]![0]!) ratio = pts[i]![1]!;
    if (i > 0 && elo >= pts[i - 1]![0]! && elo < pts[i]![0]!) {
      const [a, ra] = pts[i - 1]!,
        [b, rb] = pts[i]!;
      ratio = ra! + ((rb! - ra!) * (elo - a!)) / (b! - a!);
    }
  }
  if (elo >= 1600)
    ratio = Math.max(
      0.81,
      Math.min(0.9, ratio + (Math.random() * 0.06 - 0.03)),
    );
  else ratio += Math.random() * 0.06 - 0.03;
  const chance = Math.random();
  if (chance < 0.12) ratio -= 0.12 + Math.random() * 0.1;
  else if (chance < 0.17) ratio += 0.03 + Math.random() * 0.04;
  return Math.max(0.25, Math.min(0.92, ratio));
}
export function scoreCap(rnd: (() => number) | null = null): number {
  const chance = (rnd || Math.random)();
  return chance < 0.03 ? 14999 : chance < 0.25 ? 13999 : 13499;
}
export function botPlan(seed: string, elo: number, startAt: number): BotResult {
  const { q, boost } = seededDeal('duelo:' + seed),
    result = botResult(q.slice(0, N), boost, botRatio(elo), scoreCap());
  const times: number[] = [];
  let t = startAt + 800;
  for (let i = 0; i < N; i++) {
    t += 2500 + Math.random() * (i < 3 ? 6500 : 8500);
    times.push(t);
  }
  return {
    score: result.total,
    slots: result.slots,
    times,
    finishAt: times[N - 1]!,
  };
}
export function botProgress(bot: { times: number[] } | null) {
  return bot ? bot.times.filter((t) => t <= Date.now()).length : 0;
}

let seededDay = '';
export async function ensureDaily(): Promise<void> {
  await null;
  const day = todayKey();
  if (seededDay === day) return;
  seededDay = day;
  try {
    const rnd = mulberry(seedFrom('bots:' + day)),
      { q, boost } = seededDeal(day),
      q17 = q.slice(0, N),
      optimal = optimalAssign(q17, boost),
      scores: number[] = [],
      dates: string[] = [];
    const now = Date.now(),
      dayStart = new Date(day + 'T00:00:00').getTime();
    for (let k = 0; k < 10; k++) {
      const result = botResult(q17, boost, 0.74 + rnd() * 0.12, 13499, optimal);
      if (result.total < 1000 || result.total >= 15000) continue;
      scores.push(result.total);
      dates.push(
        new Date(now - rnd() * Math.max(0, now - dayStart)).toISOString(),
      );
    }
    const { retoRpc } = await import('../../shared/api');
    await retoRpc('seed_daily', { d: day, sc: scores, at: dates });
  } catch {
    /* Preserve the daily ranking's best-effort fallback. */
  }
}
