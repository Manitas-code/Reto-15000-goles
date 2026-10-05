import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emojiPlayers } from '../../src/data/emoji-players';
import { extraPlayers } from '../../src/data/extra-players';
import { playerRows, retoPlayers } from '../../src/data/players';
import { mulberry, seedFrom, shuffle } from '../../src/games/reto-15000/engine';
import { baseDictionary } from '../../src/shared/i18n/dictionary';
import { teams } from '../../src/shared/stadiums/teams';

type PageReference = {
  domSha256: string;
  inlineCssSha256: string;
  inlineCssWithoutInitialNewlineSha256: string;
  inlineCssBytes: number;
};
type ProductBaseline = {
  pages: Record<string, PageReference>;
  catalogs: Record<
    string,
    {
      count: number;
      names: string[];
      rowsSha256: string;
      normalizedSha256?: string;
      ids?: string[];
    }
  >;
  golden: {
    seed: string;
    seedFrom: number;
    random: number[];
    shuffledIndices: number[];
  };
};

const root = resolve(import.meta.dirname, '../..');
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const baseline = JSON.parse(
  await readFile(resolve(root, 'tests/fixtures/product-baseline.json'), 'utf8'),
) as ProductBaseline;

describe('compatibilidad con la referencia previa a la migración', () => {
  // UI now renders at runtime: tests/e2e/semantic.spec.ts compares an
  // independent original-runtime fixture. Original CSS/data hashes remain here.
  it('mantiene el orden y todos los valores de las dos bases originales de 200 jugadores', () => {
    expect(playerRows).toHaveLength(baseline.catalogs.players.count);
    expect(digest(JSON.stringify(playerRows))).toBe(
      baseline.catalogs.players.rowsSha256,
    );
    expect(playerRows.map((row) => row[0])).toEqual(
      baseline.catalogs.players.names,
    );

    const originalRetoRows = retoPlayers.map(({ name, flag, pos, base }) => [
      name,
      flag,
      pos,
      ...base,
    ]);
    expect(originalRetoRows).toHaveLength(baseline.catalogs.retoPlayers.count);
    expect(digest(JSON.stringify(originalRetoRows))).toBe(
      baseline.catalogs.retoPlayers.normalizedSha256,
    );
    expect(originalRetoRows.map((row) => row[0])).toEqual(
      baseline.catalogs.retoPlayers.names,
    );
  });

  it('mantiene exactamente jugadores extra y pistas de Emoji Player, incluido su orden', () => {
    const extraRows = extraPlayers.map(
      ({ name, flag, pos, carrera, seleccion }) => [
        name,
        flag,
        pos,
        carrera,
        seleccion,
      ],
    );
    const emojiRows = emojiPlayers;
    expect(extraRows).toHaveLength(baseline.catalogs.extraPlayers.count);
    expect(digest(JSON.stringify(extraRows))).toBe(
      baseline.catalogs.extraPlayers.rowsSha256,
    );
    expect(extraRows.map((row) => row[0])).toEqual(
      baseline.catalogs.extraPlayers.names,
    );
    expect(emojiRows).toHaveLength(baseline.catalogs.emojiPlayers.count);
    expect(digest(JSON.stringify(emojiRows))).toBe(
      baseline.catalogs.emojiPlayers.rowsSha256,
    );
    expect(emojiRows.map((row) => row[0])).toEqual(
      baseline.catalogs.emojiPlayers.names,
    );
  });

  it('mantiene los textos de traducción y la geometría ordenada de los estadios', () => {
    expect(Object.keys(baseDictionary)).toHaveLength(
      baseline.catalogs.dictionary.count,
    );
    expect(digest(JSON.stringify(baseDictionary))).toBe(
      baseline.catalogs.dictionary.rowsSha256,
    );
    expect(teams).toHaveLength(baseline.catalogs.teams.count);
    expect(teams.map((team) => team.id)).toEqual(baseline.catalogs.teams.ids);
    expect(digest(JSON.stringify(teams))).toBe(
      baseline.catalogs.teams.rowsSha256,
    );
  });

  it('extrae cada hoja de estilos sin cambiar sus reglas originales', async () => {
    const cssFiles: Record<string, string> = {
      'index.html': 'src/pages/home/styles.css',
      'reto-15000.html': 'src/games/reto-15000/styles.css',
      'mas-o-menos.html': 'src/games/mas-o-menos/styles.css',
      'blackjack-goles.html': 'src/games/blackjack/styles.css',
      'emoji-player.html': 'src/games/emoji-player/styles.css',
      'caras.html': 'src/tools/faces/styles.css',
      'editor-goles.html': 'src/tools/goal-editor/styles.css',
    };
    for (const [page, cssFile] of Object.entries(cssFiles)) {
      const css = await readFile(resolve(root, cssFile), 'utf8');
      expect(digest(css.replace(/^\n/, '')), `${page} CSS`).toBe(
        baseline.pages[page].inlineCssWithoutInitialNewlineSha256,
      );
    }
  });

  it('conserva la secuencia determinista de aleatoriedad usada por el Reto 15K', () => {
    expect(seedFrom(baseline.golden.seed)).toBe(baseline.golden.seedFrom);
    const random = mulberry(seedFrom(baseline.golden.seed));
    expect(
      Array.from({ length: baseline.golden.random.length }, () => random()),
    ).toEqual(baseline.golden.random);
    expect(
      shuffle(
        Array.from({ length: 17 }, (_, index) => index),
        mulberry(seedFrom(baseline.golden.seed)),
      ),
    ).toEqual(baseline.golden.shuffledIndices);
  });
});
