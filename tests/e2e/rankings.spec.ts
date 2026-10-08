import { testOrigin } from '../helpers/environment';
import { expect, test } from '@playwright/test';
import { FakeGoaldayApi } from '../helpers/fake-api';

test('Reto conserva temporada, podio, medallas, clasificación y aviso único', async ({
  page,
}) => {
  const origin = testOrigin;
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  const api = new FakeGoaldayApi();
  await api.attach(page);
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN)
    await api.attachOriginal(page);
  const replies: Record<string, unknown> = {
    season_info: {
      current: { num: 2, name: 'Octubre 2026' },
      last: {
        num: 1,
        name: 'Septiembre 2026',
        podium: [
          { name: 'Campeón', elo: 1805, pos: 1 },
          { name: 'Segundo', elo: 1750, pos: 2 },
          { name: 'Jugador', elo: 1700, pos: 3 },
        ],
      },
      medals: [
        {
          season: 1,
          name: 'Septiembre 2026',
          pos: 3,
          elo: 1700,
          wins: 7,
          losses: 2,
          draws: 1,
        },
      ],
    },
    duel_me: { elo: 1325, pos: 25, wins: 4, losses: 3, draws: 1 },
    duel_top: Array.from({ length: 25 }, (_, i) => ({
      name: i === 0 ? 'Campeón' : i === 24 ? 'Jugador' : 'Rival ' + i,
      elo: 1805 - i * 20,
    })),
  };
  await page.route(
    /(?:reto\/rpc|rest\/v1\/rpc)\/(?:season_info|duel_me|duel_top)$/,
    async (route) => {
      if (route.request().method() === 'OPTIONS')
        return route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET,POST,OPTIONS',
          },
        });
      await route.fulfill({
        json: replies[
          new URL(route.request().url()).pathname.split('/').pop()!
        ],
        headers: { 'access-control-allow-origin': '*' },
      });
    },
  );
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', 'es');
    if (!localStorage.getItem('reto15k-v2'))
      localStorage.setItem(
        'reto15k-v2',
        JSON.stringify({
          pid: 'season-player',
          name: 'Jugador',
          seasonSeen: 1,
          best: 12000,
          sbBest: 12000,
          games: 4,
          ach: { first: 1, b12: 1 },
          futureField: 42,
        }),
      );
  });
  await page.goto('/reto-15000.html');
  await expect(page.locator('#duelModal')).toBeVisible();
  await expect(page.locator('#duelModal')).toContainText('TOP 3 TEMPORADA 1');
  await expect(page.locator('#duelModal')).toContainText(
    'quedaste 3º del mundo con 1700 puntos (7-2-1)',
  );
  await page
    .getByRole('button', { name: 'Ver mis medallas', exact: true })
    .click();
  await expect(page.locator('#rt-duel')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('#phName')).toHaveText('Serie A');
  await expect(page.locator('#phSub')).toHaveText(
    '1325 puntos · Te faltan 25 para LaLiga · 4 victorias · 3 derrotas · 1 empate · vas 25º · te quedan 2 duelos de clasificación (subes más rápido)',
  );
  await expect(page.locator('#rankList .medhead').first()).toContainText(
    'Temporada 2 · Octubre 2026',
  );
  await expect(page.locator('#rankList')).toContainText('🥉 TOP 3 TEMPORADA 1');
  await expect(page.locator('#rankList li.mine b')).toHaveText('Jugador');
  await expect(page.locator('#rankList li.mine .s')).toHaveText('1325');
  await expect(page.locator('#champ')).toContainText('Campeón');
  await expect(page.locator('#champ')).toContainText('TOP 1 TEMPORADA 1');
  await page.locator('#rt-med').click();
  await expect(page.locator('#phName')).toHaveText('Bota de Oro');
  await expect(page.locator('#track .node')).toHaveCount(13);
  await expect(page.locator('#track .node.now')).toHaveCount(1);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('reto15k-v2')!),
  );
  expect(saved).toMatchObject({ seasonSeen: 2, futureField: 42 });
  await page.reload();
  await expect(page.locator('#duelModal')).toBeHidden();
});

test('Reto filtra visibilidad y duplicados, usa fallback y conserva errores de ranking', async ({
  page,
}) => {
  const origin = testOrigin;
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  const api = new FakeGoaldayApi();
  await api.attach(page);
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN)
    await api.attachOriginal(page);
  const rows = [
    {
      name: 'Futuro',
      score: 21000,
      day: '2026-10-05',
      show_at: '2026-10-05T13:00:00Z',
    },
    {
      name: ' Jugador ',
      score: 18000,
      day: '2026-10-05',
      show_at: '2026-10-05T11:00:00Z',
    },
    { name: 'jugador', score: 17000, day: '2026-10-05', show_at: null },
    { name: 'Otro', score: 16000, day: '2026-10-05' },
  ];
  let failDay = false;
  const queries: boolean[] = [];
  await page.route(
    /(?:api\/v1\/rankings\/reto|rest\/v1\/scores)(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const url = new URL(route.request().url());
      const params = url.searchParams;
      const all =
        params.get('tab') === 'all' ||
        (url.pathname.startsWith('/rest/') && !params.has('daily'));
      const visible =
        params.get('includeVisibility') === 'true' ||
        (params.get('select') || '').includes('show_at');
      if (all) queries.push(visible);
      const headers = { 'access-control-allow-origin': '*' };
      if (failDay || (all && visible))
        return route.fulfill({ status: 503, body: 'Unavailable', headers });
      await route.fulfill({
        json: all
          ? rows.slice(1).map(({ name, score, day }) => ({ name, score, day }))
          : rows,
        headers,
      });
    },
  );
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', 'es');
    if (!localStorage.getItem('reto15k-v2'))
      localStorage.setItem(
        'reto15k-v2',
        JSON.stringify({ pid: 'rank-player', name: 'Jugador' }),
      );
  });
  await page.goto('/reto-15000.html');
  await expect(page.locator('#rankNote')).toHaveText(
    '2 jugadores en el reto de hoy · vas 1º.',
  );
  await expect(page.locator('#rankList li')).toHaveCount(2);
  await expect(page.locator('#rankList li.mine b')).toHaveText('Jugador');
  await expect(page.locator('#rankList li.mine .s')).toHaveText('18.000');
  await expect(page.locator('#rankList')).not.toContainText('Futuro');
  await page.locator('#rt-all').click();
  await expect(page.locator('#rankNote')).toHaveText(
    '2 jugadores con récord · vas 1º. Cada jugador aparece una vez, con su récord.',
  );
  expect(queries).toEqual([true, false]);
  await expect(page.locator('#rankList li.mine .d')).toHaveText(
    ' · 🌍 Balón de Oro · 05/10/2026',
  );
  failDay = true;
  await page.locator('#rt-day').click();
  await expect(page.locator('#rankNote')).toHaveText(
    'No se ha podido cargar el ranking mundial. Revisa la conexión.',
  );
  await expect(page.locator('#rankList li')).toHaveCount(0);
});
