import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const [originalDirectory, revision] = process.argv.slice(2);
if (!originalDirectory || !revision)
  throw new Error(
    'Uso: node scripts/capture-stadium-baseline.mjs <directorio-original> <revision>',
  );
const original = await readFile(join(originalDirectory, 'stadiums.js'), 'utf8');
// Evaluate only the original catalogue and pure renderer, before browser setup.
const start = original.indexOf('var TEAMS=');
const end = original.indexOf("var KEY='fg_team'");
if (start < 0 || end < 0) throw new Error('Referencia original inesperada');
const sizes = [
  [390, 640],
  [1440, 640],
];
const results = runInNewContext(
  original.slice(start, end) +
    ';TEAMS.map(t => ({id:t.id, drawings:sizes.map(size => svg(t.spec,...size))}))',
  { sizes },
);
const teams = results.map(({ id, drawings }) => ({
  id,
  hashes: drawings.map((drawing) =>
    createHash('sha256').update(drawing).digest('hex'),
  ),
}));
await writeFile(
  new URL('../tests/fixtures/stadium-baseline.json', import.meta.url),
  JSON.stringify({ revision, sizes, teams }, null, 2) + '\n',
);
