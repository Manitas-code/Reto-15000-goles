import { readFile, writeFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

const [baselineDir, baselineRevision] = process.argv.slice(2);
if (!baselineDir || !baselineRevision)
  throw new Error(
    'Uso: bun scripts/capture-game-rules-baseline.mjs <directorio-original> <revision-original>',
  );

async function source(name) {
  return readFile(`${baselineDir}/${name}`, 'utf8');
}

function functionSource(text, name) {
  const start = text.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`No se encontró function ${name}`);
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '{') depth++;
    if (text[index] === '}' && --depth === 0)
      return text.slice(start, index + 1);
  }
  throw new Error(`Función ${name} sin cierre`);
}

function declarationArray(text, name) {
  const marker = new RegExp(`(?:const|let|var) ${name}\\s*=\\s*\\[`);
  const match = marker.exec(text);
  if (!match) throw new Error(`No se encontró array ${name}`);
  const open = text.indexOf('[', match.index);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = open; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '[') depth++;
    else if (char === ']' && --depth === 0)
      return Function(`return (${text.slice(open, index + 1)});`)();
  }
  throw new Error(`Array ${name} sin cierre`);
}

function originalEmojiCatalog(text) {
  const match = text.match(/window\.GD_EMOJI\s*=\s*(\[[\s\S]*?\n\])/);
  if (!match) throw new Error('No se encontró window.GD_EMOJI');
  return Function(`return (${match[1]});`)().map((row) => ({
    name: row[0],
    emojis: row.slice(1, 5),
    why: row[5] || '',
  }));
}

const retoHtml = await source('reto-15000.html');
const retoSlots = declarationArray(retoHtml, 'SLOTS').map(({ src, mult }) => ({
  src,
  mult,
}));
const retoSeedFrom = Function(
  `${functionSource(retoHtml, 'seedFrom')}; return seedFrom;`,
)();
const retoMulberry = Function(
  `${functionSource(retoHtml, 'mulberry')}; return mulberry;`,
)();
const retoShuffle = Function(
  `${functionSource(retoHtml, 'shuffle')}; return shuffle;`,
)();
const dailySeed = '2026-10-05';
const dailySeedHash = retoSeedFrom(dailySeed);
const retoRandom = retoMulberry(dailySeedHash);
const madridInstant = '2026-10-05T22:30:00.000Z';
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [madridInstant]));
  }
}
const originalTodayKey = Function(
  'Date',
  `${functionSource(retoHtml, 'todayKey')}; return todayKey;`,
)(FixedDate);

const emojiHtml = await source('emoji-player.html');
const emojiRowsSource = await source('emojis-jugadores.js');
const emojiCatalog = originalEmojiCatalog(emojiRowsSource);
const emojiDayKey = Function(
  'pad',
  `${functionSource(emojiHtml, 'dayKey')}; return dayKey;`,
)((value) => String(value).padStart(2, '0'));
const emojiStart = emojiHtml.indexOf('const isFlag=');
const emojiEnd = emojiHtml.indexOf('const SPC=', emojiStart);
if (emojiStart < 0 || emojiEnd < 0)
  throw new Error('No se encontraron las reglas de selección Emoji Player');
const emojiRules = Function(
  'ALL',
  'dayKey',
  `${emojiHtml.slice(emojiStart, emojiEnd)}; return { seeded, picksFor };`,
)(emojiCatalog, emojiDayKey);
const emojiDates = ['2026-09-28', '2026-09-29', '2026-10-05'];
const emojiSeed = 'goalday-emoji-easy-v1';
const emojiRandom = emojiRules.seeded(emojiSeed);

const mmHtml = await source('mas-o-menos.html');
const tierSource = functionSource(mmHtml, 'tier');
const originalTier = (streak) =>
  Function('streak', `${tierSource}; return tier();`)(streak);
const differenceSource = mmHtml.match(/const diff\s*=\s*([^;]+);/)?.[1];
if (!differenceSource) throw new Error('No se encontró const diff');
const originalDifference = Function(
  'x',
  'y',
  `return (${differenceSource})(x,y);`,
);

const blackjackHtml = await source('blackjack-goles.html');
const settleSource = functionSource(blackjackHtml, 'settle');
function originalPayout(outcome, bet) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        children: [],
        classList: { add() {} },
        querySelector() {
          return element(`${id}:query`);
        },
      });
    return elements.get(id);
  };
  const context = createContext({
    $: element,
    pc: [],
    dc: [],
    total: () => 0,
    bet,
    chips: 1000,
    hand: 0,
    log: [],
    doubled: false,
    busy: false,
    nextT: 0,
    MINBET: 100,
    HANDS: 7,
    AUTO: 1500,
    fmt: String,
    setTot() {},
    setChips(value) {
      context.chips = value;
    },
    stats: () => ({ hands: 0 }),
    store: { set() {} },
    SKEY: 'gd_bj10_stats',
    clearNext() {},
    finish() {},
    betPhase() {},
    setTimeout: () => 1,
  });
  runInContext(`${settleSource}; settle(${JSON.stringify(outcome)});`, context);
  return context.chips - 1000;
}

const cases = [
  ['exact', 100],
  ['win', 200],
  ['dbust', 300],
  ['bust', 100],
  ['tie', 200],
  ['lose', 300],
];
const result = {
  baselineRevision,
  reto: {
    slots: retoSlots,
    goalsInput: ['7', null, 'not-a-number', 0, 3],
    goalsExpected: [7, 0, 0, 0, 3],
    multiplierCases: [
      { slot: 0, boost: null, expected: 10 },
      { slot: 4, boost: 4, expected: 5 },
      { slot: 4, boost: 3, expected: 1 },
      { slot: 12, boost: 12, expected: 5 },
    ],
    dailySeed,
    dailySeedHash,
    dailyRandom: Array.from({ length: 5 }, () => retoRandom()),
    shuffleInput: ['a', 'b', 'c', 'd', 'e'],
    shuffleRandom: [0, 0.99, 0.5, 0],
    shuffleExpected: retoShuffle(
      ['a', 'b', 'c', 'd', 'e'],
      (() => {
        const values = [0, 0.99, 0.5, 0];
        let index = 0;
        return () => values[index++];
      })(),
    ),
    madridInstant,
    madridDay: originalTodayKey(),
  },
  emoji: {
    days: emojiDates.map((date) => ({
      date,
      players: emojiRules
        .picksFor(new Date(`${date}T12:00:00`))
        .map(({ name }) => name),
    })),
    seed: emojiSeed,
    seedRandom: Array.from({ length: 3 }, () => emojiRandom()),
  },
  masOMenos: {
    tiers: [0, 4, 5, 14, 15].map((streak) => ({
      streak,
      expected: originalTier(streak),
    })),
    comparisons: [
      [10, 11, true],
      [10, 9, false],
      [10, 10, true],
      [10, 10, false],
    ].map(([first, second, more]) => ({
      first,
      second,
      more,
      expected: more ? second > first : second < first,
    })),
    differences: [
      [148, 150],
      [100, 150],
    ].map(([first, second]) => ({
      first,
      second,
      expected: originalDifference(first, second),
    })),
  },
  blackjack: {
    payouts: cases.map(([outcome, bet]) => ({
      outcome,
      bet,
      expected: originalPayout(outcome, bet),
    })),
  },
};

const output = new URL(
  '../tests/fixtures/game-rules-baseline.json',
  import.meta.url,
);
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  `Reglas originales (${baselineRevision}) guardadas en ${output.pathname}`,
);
