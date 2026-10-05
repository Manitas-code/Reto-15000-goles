export interface SlotDefinition {
  readonly label: string;
  readonly mult: number;
  readonly src: number;
  readonly ico: string;
}

type PlayerValues = { readonly v: readonly number[] };

export const SLOTS = [
  { label: 'Champions', mult: 10, src: 0, ico: '🏆' },
  {
    label: 'Premier League',
    mult: 1,
    src: 1,
    ico: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  },
  { label: 'La Liga', mult: 1, src: 2, ico: '🇪🇸' },
  { label: 'Serie A', mult: 1, src: 3, ico: '🇮🇹' },
  { label: 'Bundesliga', mult: 1, src: 4, ico: '🇩🇪' },
  { label: 'Ligue 1', mult: 1, src: 5, ico: '🇫🇷' },
  { label: 'Eredivisie / Primeira', mult: 1, src: 6, ico: '🇳🇱' },
  { label: 'Selección', mult: 10, src: 7, ico: '🌍' },
  { label: 'América', mult: 4, src: 8, ico: '🌎' },
  { label: 'Carrera', mult: 1, src: 9, ico: '⚽' },
  { label: 'Carrera', mult: 3, src: 9, ico: '⚽' },
  { label: 'Goles de cabeza', mult: 10, src: 10, ico: '🎯' },
  { label: 'Goles olímpicos', mult: 500, src: 11, ico: '🚩' },
  { label: 'Mundiales', mult: 100, src: 12, ico: '🏅' },
  { label: 'Final de Champions', mult: 300, src: 13, ico: '🌟' },
  { label: 'Final de Libertadores', mult: 500, src: 14, ico: '🥇' },
  { label: 'Final del Mundial', mult: 1000, src: 15, ico: '👑' },
] as const satisfies readonly SlotDefinition[];
export const N = SLOTS.length;

export function goalsFor(player: PlayerValues, slotIndex: number): number {
  return Number(player.v[SLOTS[slotIndex].src]) || 0;
}

export function pointsFor(
  player: PlayerValues,
  slotIndex: number,
  multiplier: number,
): number {
  return goalsFor(player, slotIndex) * multiplier;
}

export function multiplierFor(slotIndex: number, boost: number | null): number {
  return boost !== null && slotIndex === boost ? 5 : SLOTS[slotIndex].mult;
}

export function mulberry(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(): string {
  try {
    const parts: Record<string, string> = {};
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .forEach((part) => {
        parts[part.type] = part.value;
      });
    if (parts.year && parts.month && parts.day)
      return parts.year + '-' + parts.month + '-' + parts.day;
  } catch {
    // Falls back to local date when this runtime lacks the Madrid timezone.
  }
  const date = new Date();
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}

export function seedFrom(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffle<T>(
  items: T[],
  random: (() => number) | null = null,
): T[] {
  const nextRandom = random || Math.random;
  for (let index = items.length - 1; index > 0; index--) {
    const otherIndex = Math.floor(nextRandom() * (index + 1));
    [items[index], items[otherIndex]] = [items[otherIndex], items[index]];
  }
  return items;
}
