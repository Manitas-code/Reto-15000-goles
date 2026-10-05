import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import baseline from '../fixtures/stadium-baseline.json';
import { teams } from '../../src/shared/stadiums/teams';
import { svg } from '../../src/shared/stadiums/geometry';

describe('geometría de estadios del producto original', () => {
  it('produce el mismo SVG para todos los equipos en ambos encuadres', () => {
    expect(teams.map((team) => team.id)).toEqual(
      baseline.teams.map((team) => team.id),
    );
    teams.forEach((team, index) => {
      baseline.sizes.forEach(([width, height], sizeIndex) => {
        const hash = createHash('sha256')
          .update(svg(team.spec, width, height))
          .digest('hex');
        expect(hash, `${team.id} ${width}x${height}`).toBe(
          baseline.teams[index].hashes[sizeIndex],
        );
      });
    });
  });
});
