export type DifficultyTier = readonly [minimum: number, maximum: number];

export function difficultyTier(streak: number): DifficultyTier {
  return streak < 5 ? [0.4, 0.85] : streak < 15 ? [0.2, 0.6] : [0.1, 0.55];
}

export function relativeDifference(first: number, second: number): number {
  return Math.abs(first - second) / Math.max(first, second);
}

export function isHigherLowerCorrect(
  first: number,
  second: number,
  choseMore: boolean,
): boolean {
  return choseMore ? second > first : second < first;
}
