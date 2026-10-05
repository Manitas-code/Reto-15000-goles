export interface EmojiPlayer {
  name: string;
  emojis: string[];
  why: string;
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

function shuffled<T>(items: readonly T[], seed: string): T[] {
  const random = seeded(seed);
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function isFlag(emoji: string): boolean {
  return /[\u{1F1E6}-\u{1F1FF}]/u.test(emoji) || emoji.startsWith('🏴');
}

/** Preserve the original seeded catalog order and five-player daily rotation. */
export function picksFor(
  date: Date,
  players: readonly EmojiPlayer[],
): EmojiPlayer[] {
  const easy = players.filter((player) => player.emojis.some(isFlag));
  const hard = players.filter((player) => !player.emojis.some(isFlag));
  const easyOrder = shuffled(easy, 'goalday-emoji-easy-v1');
  const hardOrder = shuffled(hard, 'goalday-emoji-hard-v1');
  const epoch = new Date(2026, 8, 28);
  const index = Math.round((date.getTime() - epoch.getTime()) / 86400000);
  const mod = (value: number, length: number) =>
    ((value % length) + length) % length;
  const selected: EmojiPlayer[] = [];
  for (let offset = 0; offset < 3; offset++)
    selected.push(easyOrder[mod(index * 3 + offset, easyOrder.length)]);
  for (let offset = 0; offset < 2; offset++)
    selected.push(hardOrder[mod(index * 2 + offset, hardOrder.length)]);
  return shuffled(selected, 'day-' + dayKey(date));
}

const substitutions: Record<string, string> = {
  ø: 'o',
  æ: 'ae',
  ß: 'ss',
  đ: 'd',
  ł: 'l',
};

export function normalizePlayerName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[øæßđł]/g, (character) => substitutions[character])
    .replace(/[«»"'’.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesPlayerName(query: string, name: string): boolean {
  const normalizedQuery = normalizePlayerName(query);
  if (!normalizedQuery) return false;
  const words = normalizePlayerName(name).split(' ');
  const compactQuery = normalizedQuery.replace(/ /g, '');
  return words.some((_, index) => {
    const remainingWords = words.slice(index);
    return (
      remainingWords.join(' ').startsWith(normalizedQuery) ||
      remainingWords.join('').startsWith(compactQuery)
    );
  });
}
