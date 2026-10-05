import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const [baselineDir, baselineRevision] = process.argv.slice(2);
if (!baselineDir || !baselineRevision)
  throw new Error(
    'Uso: node scripts/capture-baseline.mjs <directorio-de-la-referencia-original> <revision-git>',
  );
const outputFile = new URL(
  '../tests/fixtures/product-baseline.json',
  import.meta.url,
);
const pages = [
  'index.html',
  'reto-15000.html',
  'mas-o-menos.html',
  'blackjack-goles.html',
  'emoji-player.html',
  'caras.html',
  'editor-goles.html',
];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function tree(node) {
  if (node.nodeType === 3) {
    const value = node.nodeValue.replace(/\s+/g, ' ').trim();
    return value ? ['text', value] : null;
  }
  if (node.nodeType !== 1) return null;
  const tag = node.tagName.toLowerCase();
  if (tag === 'script' || tag === 'style') return null;
  if (
    tag === 'link' &&
    node.getAttribute('rel')?.split(/\s+/).includes('stylesheet')
  )
    return null;
  const attrs = [...node.attributes]
    .map(({ name, value }) => [name, value])
    .sort(([a], [b]) => a.localeCompare(b));
  const children = [...node.childNodes].map(tree).filter(Boolean);
  return [tag, attrs, children];
}

function extractRaw(source, label) {
  const match = source.match(/(?:const|let|var) RAW\s*=\s*\[([\s\S]*?)\n\];/);
  if (!match) throw new Error(`No se encontró RAW en ${label}`);
  return Function(`"use strict"; return [${match[1]}\n];`)();
}

function extractObject(source, name, label) {
  const match = source.match(
    new RegExp(`(?:const|let|var) ${name}\\s*=\\s*(\\{[\\s\\S]*?\\});`),
  );
  if (!match) throw new Error(`No se encontró ${name} en ${label}`);
  return Function(`"use strict"; return (${match[1]});`)();
}

function extractArray(source, name, label) {
  const match = source.match(
    new RegExp(`(?:const|let|var) ${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`),
  );
  if (!match) throw new Error(`No se encontró ${name} en ${label}`);
  return Function(`"use strict"; return (${match[1]});`)();
}

function extractWindowArray(source, name, label) {
  const match = source.match(
    new RegExp(`window\\.${name}\\s*=\\s*\\[([\\s\\S]*?)\\n\\]`),
  );
  if (!match) throw new Error(`No se encontró window.${name} en ${label}`);
  return Function(`"use strict"; return [${match[1]}\n];`)();
}

function functionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`No se encontró ${name}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0)
      return source.slice(start, index + 1);
  }
  throw new Error(`Función ${name} sin cierre`);
}

const result = { baselineRevision, pages: {}, catalogs: {} };
for (const page of pages) {
  const source = await readFile(`${baselineDir}/${page}`, 'utf8');
  const dom = new JSDOM(source).window.document;
  const css = [...dom.querySelectorAll('style')]
    .map((style) => style.textContent)
    .join('\n');
  result.pages[page] = {
    domSha256: sha256(JSON.stringify(tree(dom.documentElement))),
    inlineCssSha256: sha256(css),
    inlineCssWithoutInitialNewlineSha256: sha256(css.replace(/^\n/, '')),
    inlineCssBytes: Buffer.byteLength(css),
  };
}

const playerSource = await readFile(`${baselineDir}/players.js`, 'utf8');
const sharedRows = extractRaw(playerSource, 'players.js');
const retoSource = await readFile(`${baselineDir}/reto-15000.html`, 'utf8');
const retoRows = extractRaw(retoSource, 'reto-15000.html');
const retoPositions = extractObject(retoSource, 'POS_EX', 'reto-15000.html');
const normalizedRetoRows = retoRows.map((row) => {
  const hasPosition = typeof row[2] === 'string';
  return [
    row[0],
    row[1],
    hasPosition ? row[2] : retoPositions[row[0]] || 'DEL',
    ...row.slice(hasPosition ? 3 : 2),
  ];
});
const extraSource = await readFile(
  `${baselineDir}/mas-o-menos-jugadores.js`,
  'utf8',
);
const extraRows = extractWindowArray(
  extraSource,
  'GD_MM_EXTRA',
  'mas-o-menos-jugadores.js',
);
const emojiSource = await readFile(
  `${baselineDir}/emojis-jugadores.js`,
  'utf8',
);
const emojiRows = extractWindowArray(
  emojiSource,
  'GD_EMOJI',
  'emojis-jugadores.js',
);
const dictionarySource = await readFile(`${baselineDir}/lang.js`, 'utf8');
const dictionary = extractObject(dictionarySource, 'D', 'lang.js');
const stadiumSource = await readFile(`${baselineDir}/stadiums.js`, 'utf8');
const teams = extractArray(stadiumSource, 'TEAMS', 'stadiums.js');
result.catalogs = {
  players: {
    count: sharedRows.length,
    names: sharedRows.map((row) => row[0]),
    rowsSha256: sha256(JSON.stringify(sharedRows)),
  },
  retoPlayers: {
    count: retoRows.length,
    names: retoRows.map((row) => row[0]),
    rowsSha256: sha256(JSON.stringify(retoRows)),
    normalizedSha256: sha256(JSON.stringify(normalizedRetoRows)),
  },
  extraPlayers: {
    count: extraRows.length,
    names: extraRows.map((row) => row[0]),
    rowsSha256: sha256(JSON.stringify(extraRows)),
  },
  emojiPlayers: {
    count: emojiRows.length,
    names: emojiRows.map((row) => row[0]),
    rowsSha256: sha256(JSON.stringify(emojiRows)),
  },
  dictionary: {
    count: Object.keys(dictionary).length,
    rowsSha256: sha256(JSON.stringify(dictionary)),
  },
  teams: {
    count: teams.length,
    ids: teams.map((team) => team.id),
    rowsSha256: sha256(JSON.stringify(teams)),
  },
};

const engineSource = await readFile(`${baselineDir}/reto-15000.html`, 'utf8');
const originalSeedFrom = Function(
  `${functionSource(engineSource, 'seedFrom')}; return seedFrom;`,
)();
const originalMulberry = Function(
  `${functionSource(engineSource, 'mulberry')}; return mulberry;`,
)();
const originalShuffle = Function(
  `${functionSource(engineSource, 'shuffle')}; return shuffle;`,
)();
const seed = 'goalday-contract-2026-10-05';
const random = originalMulberry(originalSeedFrom(seed));
result.golden = {
  seed,
  seedFrom: originalSeedFrom(seed),
  random: Array.from({ length: 8 }, () => random()),
  shuffledIndices: originalShuffle(
    Array.from({ length: 17 }, (_, index) => index),
    originalMulberry(originalSeedFrom(seed)),
  ),
};

await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Referencia original guardada en ${outputFile.pathname}`);
