import { describe, expect, it, vi } from 'vitest';
import baseline from '../fixtures/game-rules-baseline.json';
import { emojiPlayers } from '../../src/data/emoji-players';
import {
  dayKey,
  matchesPlayerName,
  picksFor,
  seeded as emojiSeeded,
} from '../../src/games/emoji-player/engine';
import {
  difficultyTier,
  isHigherLowerCorrect,
  relativeDifference,
} from '../../src/games/mas-o-menos/engine';
import { payoutFor, type HandOutcome } from '../../src/games/blackjack/engine';
import {
  goalsFor,
  mulberry,
  multiplierFor,
  pointsFor,
  seedFrom,
  shuffle,
  SLOTS,
  todayKey,
} from '../../src/games/reto-15000/engine';

const emojiCatalog = emojiPlayers.map((row) => ({
  name: row[0],
  emojis: row.slice(1, 5),
  why: row[5] || '',
}));

describe('Reto 15K rules (captured from the original page)', () => {
  it('keeps the original goal source and multiplier for every slot', () => {
    expect(SLOTS.map(({ src, mult }) => ({ src, mult }))).toEqual(
      baseline.reto.slots,
    );
    baseline.reto.goalsInput.forEach((value, index) => {
      expect(goalsFor({ v: [value as number] }, 0)).toBe(
        baseline.reto.goalsExpected[index],
      );
    });
    expect(pointsFor({ v: [7] }, 0, 5)).toBe(35);
    for (const { slot, boost, expected } of baseline.reto.multiplierCases)
      expect(multiplierFor(slot, boost)).toBe(expected);
  });

  it('preserves daily seed, random stream, shuffle, and Madrid day boundary', () => {
    const { dailySeed, dailySeedHash, dailyRandom } = baseline.reto;
    expect(seedFrom(dailySeed)).toBe(dailySeedHash);
    const random = mulberry(dailySeedHash);
    expect(dailyRandom.map(() => random())).toEqual(dailyRandom);

    let index = 0;
    const sequence = [...baseline.reto.shuffleRandom];
    const actualShuffle = shuffle(
      [...baseline.reto.shuffleInput],
      () => sequence[index++],
    );
    expect(actualShuffle).toEqual(baseline.reto.shuffleExpected);

    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseline.reto.madridInstant));
    expect(todayKey()).toBe(baseline.reto.madridDay);
    vi.useRealTimers();
  });
});

describe('Emoji Player daily rules (captured from the original page)', () => {
  it('preserves the seeded stream, epoch dates, catalog order, and easy/hard mix', () => {
    const random = emojiSeeded(baseline.emoji.seed);
    expect(baseline.emoji.seedRandom.map(() => random())).toEqual(
      baseline.emoji.seedRandom,
    );

    const isEasy = (name: string) => {
      const player = emojiCatalog.find((entry) => entry.name === name);
      expect(
        player,
        `fixture player ${name} exists in the original catalog`,
      ).toBeDefined();
      return player!.emojis.some(
        (emoji) =>
          /[\u{1F1E6}-\u{1F1FF}]/u.test(emoji) || emoji.startsWith('🏴'),
      );
    };
    for (const { date, players } of baseline.emoji.days) {
      const picks = picksFor(new Date(`${date}T12:00:00`), emojiCatalog);
      expect(dayKey(new Date(`${date}T12:00:00`))).toBe(date);
      expect(picks.map(({ name }) => name)).toEqual(players);
      expect(picks.filter(({ name }) => isEasy(name))).toHaveLength(3);
      expect(picks.filter(({ name }) => !isEasy(name))).toHaveLength(2);
      expect(new Set(picks.map(({ name }) => name)).size).toBe(5);
    }
    expect(matchesPlayerName('van basten', 'Marco van Basten')).toBe(true);
  });
});

describe('Más o Menos comparison and difficulty rules', () => {
  it('preserves streak tier boundaries and comparison behavior, including ties', () => {
    for (const { streak, expected } of baseline.masOMenos.tiers)
      expect(difficultyTier(streak)).toEqual(expected);
    for (const { first, second, more, expected } of baseline.masOMenos
      .comparisons)
      expect(isHigherLowerCorrect(first, second, more)).toBe(expected);
    for (const { first, second, expected } of baseline.masOMenos.differences)
      expect(relativeDifference(first, second)).toBeCloseTo(expected, 14);
  });
});

describe('Blackjack Goles payout rules', () => {
  it('preserves winning, losing, bust, dealer-bust, exact, and tie payouts', () => {
    for (const { outcome, bet, expected } of baseline.blackjack.payouts)
      expect(payoutFor(outcome as HandOutcome, bet)).toBe(expected);
  });
});
