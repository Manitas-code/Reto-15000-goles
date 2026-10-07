import {
  testOrigin,
  allowedOrigins as allowedOriginsFromEnvironment,
} from '../helpers/environment';
import { expect, test } from '@playwright/test';
import { emojiPlayers } from '../../src/data/emoji-players';
import { players } from '../../src/data/players';
import { extraPlayers } from '../../src/data/extra-players';
import { picksFor } from '../../src/games/emoji-player/engine';
import { FakeGoaldayApi } from '../helpers/fake-api';

let fakeApi: FakeGoaldayApi;

const routes = [
  'index.html',
  'reto-15000.html',
  'mas-o-menos.html',
  'blackjack-goles.html',
  'emoji-player.html',
  'caras.html',
  'editor-goles.html',
];

test.beforeEach(async ({ page }) => {
  const allowedOrigins = new Set(allowedOriginsFromEnvironment);
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN) {
    allowedOrigins.add(
      new URL(process.env.GOALDAY_VISUAL_BASELINE_ORIGIN).origin,
    );
  }
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (allowedOrigins.has(url.origin)) await route.continue();
    else await route.abort('blockedbyclient');
  });
  fakeApi = new FakeGoaldayApi();
  await fakeApi.attach(page);
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', 'es');
  });
});

test('cargan las siete entradas sin errores de ejecución', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of routes) {
    const response = await page.goto(`/${route}`);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('body')).toContainText(/\S/);
  }
  expect(errors).toEqual([]);
});

test('navega desde portada y empieza Emoji Player con red remota aislada', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.brand')).toBeVisible();
  await page.getByRole('link', { name: /Emoji Player/ }).click();
  await expect(page).toHaveURL(/emoji-player\.html$/);
  await expect(
    page.getByRole('heading', { name: /Emoji Player/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Jugar el reto de hoy/ }).click();
  await expect(page.locator('#nameBox')).toBeVisible();
  await page.getByRole('button', { name: 'Ahora no' }).click();
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#emojis span')).toHaveCount(4);

  const savedAttempt = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('gd_emoji_v1') ?? '{}');
    return Object.keys(stored.days ?? {}).length === 1;
  });
  expect(savedAttempt).toBe(true);
});

test('cambia ES a EN y vuelve a ES sin recargar mensajes dinámicos', async ({
  page,
}) => {
  const fixedDate = new Date('2026-10-05T12:00:00.000Z');
  const players = emojiPlayers.map((row) => ({
    name: row[0],
    emojis: row.slice(1, 5),
    why: row[5],
  }));
  const targetName = picksFor(fixedDate, players)[0].name;
  const wrongGuess = players.find((player) => player.name !== targetName)!.name;

  await page.clock.setFixedTime(fixedDate);
  await page.goto('/emoji-player.html');
  const languageButton = page.locator('#btnLang');
  await expect(languageButton).toHaveText('🌐 EN');
  await page.getByRole('button', { name: /Jugar el reto de hoy/ }).click();
  await page.getByRole('button', { name: 'Ahora no' }).click();
  await expect(page.locator('#game')).toBeVisible();

  await page.locator('#inp').fill(wrongGuess);
  await page.locator('#btnGo').click();
  const feedback = page.locator('#fb');
  await expect(feedback).toHaveText('No es él. Te quedan 2 intentos.');

  await languageButton.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(languageButton).toHaveText('🌐 ES');
  await expect(feedback).toHaveText('Not him. 2 guesses left.');

  await languageButton.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(languageButton).toHaveText('🌐 EN');
  await expect(feedback).toHaveText('No es él. Te quedan 2 intentos.');
});

test('inicia partidas libres de Reto 15K, Más o Menos y Blackjack', async ({
  page,
}) => {
  await page.goto('/reto-15000.html');
  await page.getByRole('button', { name: /Partida libre/ }).click();
  await expect(page.locator('body')).toHaveClass(/playing/);

  await page.goto('/mas-o-menos.html');
  await page.locator('#modesBox [data-cat]').first().click();
  await expect(page.locator('#game')).toBeVisible();

  await page.goto('/blackjack-goles.html');
  await page.locator('#modesBox [data-m]').first().click();
  await expect(page.locator('#game')).toBeVisible();
});

test('termina un Reto libre y conserva identidad y campos locales existentes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem(
      'reto15k-v2',
      JSON.stringify({
        pid: 'compatibility-test-player',
        name: 'Jugador de prueba',
        futureField: { keep: true },
      }),
    );
  });
  await page.goto('/reto-15000.html');
  await page.getByRole('button', { name: /Partida libre/ }).click();
  await expect(page.locator('#intro')).toBeHidden();
  for (let index = 0; index < 17; index++)
    await page.locator('#board .slot:not(:disabled)').first().click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/done/);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('reto15k-v2')!),
  );
  expect(saved.pid).toBe('compatibility-test-player');
  expect(saved.name).toBe('Jugador de prueba');
  expect(saved.futureField).toEqual({ keep: true });
  expect(saved.games).toBe(1);
  expect(saved.scores).toHaveLength(1);
  // A promotion opens after the result. Wait for it instead of sampling visibility before its timer fires.
  if ((await page.locator('#mName').textContent()) !== 'Banquillo') {
    await expect(page.locator('#rankUp')).toBeVisible();
    await page.locator('#ruOk').click();
    await expect(page.locator('#rankUp')).toBeHidden();
  }
  await page.locator('#btnHome').click();
  await expect(page.locator('body')).not.toHaveClass(/playing/);
});

test('la portada abre los cuatro juegos y conserva atrás, adelante e historial', async ({
  page,
}) => {
  // Exercise same-origin API requests against the wrapper's offline Fastify server.
  await page.unroute('**/api/v1/**');
  const games = [
    { label: /Reto de los 15\.000 goles/, path: '/reto-15000.html' },
    { label: /Higher or Lower|Más o Menos/, path: '/mas-o-menos.html' },
    { label: /Blackjack de goles/, path: '/blackjack-goles.html' },
    { label: /Emoji Player/, path: '/emoji-player.html' },
  ];

  await page.goto('/');
  for (const game of games) {
    await page.getByRole('link', { name: game.label }).click();
    await expect(page).toHaveURL(new RegExp(`${game.path.slice(1)}$`));
    await expect(page.locator('body')).toContainText(/\S/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${game.path.slice(1)}$`));
    await page.goBack();
    await expect(page.locator('.brand')).toBeVisible();
  }
});

test('preserva el intento diario al recargar y reanuda Emoji Player', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));

  await page.goto('/reto-15000.html');
  await page.locator('#tab-diario').click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await expect(page.locator('body')).toHaveClass(/playing/);
  const retoDay = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('reto15k-v2') ?? '{}');
    return Object.values(data.dailyStart ?? {})[0];
  });
  expect(retoDay).toBeTruthy();
  await page.reload();
  await expect(page.locator('#tab-diario')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.keys(
          JSON.parse(localStorage.getItem('reto15k-v2') ?? '{}').dailyStart ??
            {},
        ).length,
    ),
  ).toBeGreaterThan(0);

  await page.goto('/mas-o-menos.html');
  await page.locator('#bDaily').click();
  await expect(page.locator('#game')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('gd_mm_daily') ?? '{}')['2026-10-05']
          ?.start,
    ),
  ).toBe(1);
  await page.reload();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#bDaily')).toHaveClass(/done/);

  await page.goto('/blackjack-goles.html');
  await page.locator('#bDaily').click();
  await expect(page.locator('#game')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('gd_bj10_daily') ?? '{}')['2026-10-05']
          ?.start,
    ),
  ).toBe(1);
  await page.reload();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#bDaily')).toHaveClass(/done/);

  await page.goto('/emoji-player.html');
  await page.locator('#btnStart').click();
  if (await page.locator('#nameBox').isVisible())
    await page.getByRole('button', { name: 'Ahora no' }).click();
  await expect(page.locator('#game')).toBeVisible();
  const before = (await page.locator('#emojis').textContent()) ?? '';
  expect(before).not.toBe('');
  await page.reload();
  await expect(page.locator('#btnStart')).toHaveText(
    '▶ Continuar el reto de hoy',
  );
  await page.locator('#btnStart').click();
  if (await page.locator('#nameBox').isVisible())
    await page.locator('#nmSkip0').click();
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#emojis')).toHaveText(before);
});

test('termina Más o Menos con sus controles reales', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-05T12:00:00.000Z') });
  await page.goto('/mas-o-menos.html');
  await page.locator('#modesBox [data-cat]').first().click();
  await expect(page.locator('#game')).toBeVisible();
  await page.clock.runFor(15_000);
  await expect(page.locator('#res')).toBeVisible();
});

test('termina Blackjack con sus controles reales', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-05T12:00:00.000Z') });
  await page.goto('/blackjack-goles.html');
  await page.locator('#modesBox [data-m]').first().click();
  await expect(page.locator('#game')).toBeVisible();
  for (
    let hand = 0;
    hand < 32 && !(await page.locator('#res').isVisible());
    hand++
  ) {
    if (await page.locator('#bDeal').isVisible()) {
      await page.locator('#bDeal').click();
      await page.clock.runFor(1_500);
    }
    if (await page.locator('#bStand').isVisible()) {
      await page.locator('#bStand').click();
      await page.clock.runFor(1_500);
    }
    if (await page.locator('#bNext').isVisible())
      await page.locator('#bNext').click();
    await page.clock.runFor(2500);
  }
  await expect(page.locator('#res')).toBeVisible();
});

test('los clientes comparten salas, duelos, retos por enlace y resultados en el fake API', async ({
  browser,
}) => {
  const host = await browser.newPage();
  const guest = await browser.newPage();
  const api = new FakeGoaldayApi();
  for (const client of [host, guest]) {
    await client.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(testOrigin).origin
        ? route.continue()
        : route.abort('blockedbyclient'),
    );
  }
  await api.attach(host);
  await api.attach(guest);
  await host.goto(testOrigin + '/');
  await guest.goto(testOrigin + '/');
  const postRpc = (
    page: typeof host,
    name: string,
    args: Record<string, unknown>,
  ) =>
    page.evaluate(
      async ({ name, args }) => {
        const response = await fetch(`/api/v1/reto/rpc/${name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });
        return response.status === 204 ? null : response.json();
      },
      { name, args },
    );

  const room = (await postRpc(host, 'duel_room_create', {
    pid: 'host-1',
    n: 'Host',
  })) as { id: string; code: string };
  expect(await postRpc(guest, 'duel_room_peek', { c: room.code })).toEqual({
    ok: true,
    host: 'Host',
  });
  expect(
    await postRpc(guest, 'duel_room_join', {
      c: room.code,
      pid: 'guest-1',
      n: 'Guest',
    }),
  ).toEqual({ id: room.id, host: 'Host' });
  expect(
    (await postRpc(host, 'duel_state', { d: room.id, pid: 'host-1' })).status,
  ).toBe('playing');
  expect(
    await postRpc(host, 'link_create', {
      code: 'CHALLENGE',
      pid: 'host-1',
      n: 'Host',
      sc: 1200,
      sl: [['Lionel Messi', 100]],
    }),
  ).toBeNull();
  expect(
    await postRpc(guest, 'link_get', { c: 'CHALLENGE', pid: 'guest-1' }),
  ).toMatchObject({
    creator_name: 'Host',
    creator_score: 1200,
    mine: false,
  });
  expect(
    await postRpc(guest, 'link_finish', {
      c: 'CHALLENGE',
      pid: 'guest-1',
      sc: 1400,
      sl: [['Pelé', 100]],
    }),
  ).toMatchObject({ creator_name: 'Host', creator_score: 1200 });

  await postRpc(host, 'duel_queue', { pid: 'online-a', n: 'A' });
  const paired = await postRpc(guest, 'duel_queue', {
    pid: 'online-b',
    n: 'B',
  });
  expect(
    await postRpc(host, 'duel_state', { d: paired, pid: 'online-a' }),
  ).toMatchObject({
    status: 'playing',
    rival: { name: 'B' },
  });
  const result = await postRpc(host, 'duel_submit', {
    d: paired,
    pid: 'online-a',
    sc: 1500,
    sl: [],
  });
  expect(result).toMatchObject({ status: 'playing', my_score: 1500 });
  expect(api.calls.map((call) => call.path)).toContain(
    '/reto/rpc/duel_room_join',
  );
  await host.close();
  await guest.close();
});

test('la ruta simulada conserva errores upstream y conflictos idempotentes', async ({
  page,
}) => {
  fakeApi.failNext(
    'GET',
    '/rankings/emoji-player',
    503,
    'rankings unavailable',
  );
  // Use a page without ranking requests so the explicit request owns the injected failure.
  await page.goto('/');
  await page
    .evaluate(async () => {
      const response = await fetch(
        '/api/v1/rankings/emoji-player?period=day&day=2026-10-05',
      );
      return { status: response.status, body: await response.text() };
    })
    .then((result) =>
      expect(result).toEqual({ status: 503, body: 'rankings unavailable' }),
    );

  const response = await page.evaluate(async () => {
    const payload = {
      player_id: 'same-player',
      name: 'Jugador',
      mode: 'diario',
      day: '2026-10-05',
      streak: 4,
    };
    const first = await fetch('/api/v1/scores/mas-o-menos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const second = await fetch('/api/v1/scores/mas-o-menos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return [first.status, second.status];
  });
  expect(response).toEqual([201, 409]);
});

test('completa los cinco acertijos de Emoji conservando intentos, revelado, reanudación y puntuación', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
  await page.addInitScript(() =>
    localStorage.setItem(
      'reto15k-v2',
      JSON.stringify({
        pid: '00000000-0000-4000-8000-000000000001',
        name: 'Jugador',
        extraField: 'preserved',
      }),
    ),
  );
  await page.goto('/emoji-player.html');
  await page.locator('#btnStart').click();
  const catalog = emojiPlayers.map((row) => ({
    name: row[0],
    emojis: row.slice(1, 5),
    why: row[5],
  }));
  const picks = picksFor(new Date(2026, 9, 5), catalog);
  const outcomes = [1, 2, 3, 0, 1];
  let total = 0;
  for (let index = 0; index < 5; index++) {
    const target = picks[index];
    const attempt = outcomes[index];
    const wrong = catalog
      .filter((player) => player.name !== target.name)
      .slice(0, 3);
    for (let fail = 0; fail < (attempt ? attempt - 1 : 3); fail++) {
      await page.locator('#inp').fill(wrong[fail].name);
      await page.locator('#btnGo').click();
      if (index === 1 && fail === 0) {
        await page.reload();
        await page.locator('#btnStart').click();
        await expect(page.locator('#guesses')).toContainText(wrong[fail].name);
        await expect(page.locator('#tries .x')).toHaveCount(1);
      }
    }
    if (attempt) {
      await page.locator('#inp').fill(target.name);
      await page.locator('#btnGo').click();
      total += [600, 400, 200][attempt - 1];
    }
    await expect(page.locator('#reveal')).toBeVisible();
    await expect(page.locator('#rvName')).toHaveText(target.name);
    await expect(page.locator('#idx')).toHaveText(String(index + 1));
    await expect(page.locator('#pts')).toHaveText(
      total.toLocaleString('es-ES'),
    );
    await page.locator('#btnNext').click();
  }
  await expect(page.locator('#end')).toBeVisible();
  await expect(page.locator('#endPts')).toHaveText('1800');
  await expect(page.locator('#endHits')).toHaveText('4');
  await expect(page.locator('#endStreak')).toHaveText('1');
  await page.locator('#btnReview').click();
  await expect(page.locator('#review .reveal')).toHaveCount(5);
  const stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('gd_emoji_v1') ?? '{}').days[
        '2026-10-05'
      ],
  );
  expect(stored).toMatchObject({
    res: [1, 2, 3, 0, 1],
    score: 1800,
    done: true,
  });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('reto15k-v2') ?? '{}').extraField,
    ),
  ).toBe('preserved');
});

test('Emoji conserva el texto acertado y finaliza una partida cerrada antes de recargar', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
  await page.addInitScript(() =>
    localStorage.setItem(
      'reto15k-v2',
      JSON.stringify({
        pid: '00000000-0000-4000-8000-000000000001',
        name: 'Jugador',
      }),
    ),
  );
  const catalog = emojiPlayers.map((row) => ({
    name: row[0],
    emojis: row.slice(1, 5),
    why: row[5],
  }));
  const picks = picksFor(new Date(2026, 9, 5), catalog);
  await page.goto('/emoji-player.html');
  await page.locator('#btnStart').click();
  const partial = picks[0].name.slice(0, -1);
  await page.locator('#inp').fill(partial);
  await expect(page.locator('#sug button').first()).toHaveText(picks[0].name);
  await page.locator('#btnGo').click();
  await expect(page.locator('#inp')).toHaveValue(partial);
  await page.locator('#btnNext').click();
  await page.locator('#inp').fill(picks[1].name);
  await page.locator('#sug button').filter({ hasText: picks[1].name }).click();
  await expect(page.locator('#inp')).toHaveValue(picks[1].name);
  await page.evaluate(() =>
    localStorage.setItem(
      'gd_emoji_v1',
      JSON.stringify({
        days: {
          '2026-10-05': { res: [1, 1, 1, 1, 1], score: 3000, done: false },
        },
        streak: 0,
      }),
    ),
  );
  await page.reload();
  await page.locator('#btnStart').click();
  await expect(page.locator('#end')).toBeVisible();
  await expect(page.locator('#endPts')).toHaveText('3000');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('gd_emoji_v1')!).days['2026-10-05']
          .done,
    ),
  ).toBe(true);
});

test('registrarse mientras se juega Emoji conserva el progreso y evita envíos repetidos', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let observed!: () => void;
  const registered = new Promise<void>((resolve) => {
    observed = resolve;
  });
  let registrations = 0;
  await page.route(
    /\/(?:identity\/register|rest\/v1\/rpc\/register_name)$/,
    async (route) => {
      registrations++;
      observed();
      await delayed;
      await route.fulfill({
        status: 204,
        headers: { 'access-control-allow-origin': '*' },
      });
    },
  );
  const catalog = emojiPlayers.map((row) => ({
    name: row[0],
    emojis: row.slice(1, 5),
    why: row[5],
  }));
  const target = picksFor(new Date(2026, 9, 5), catalog)[0];
  await page.goto('/emoji-player.html');
  await page.locator('#btnStart').click();
  await page.locator('#nmIn0').fill('Jugador');
  await page.locator('#nmOk0').click();
  await registered;
  await page.locator('#nmIn0').press('Enter');
  await page.locator('#nmSkip0').click();
  await page.locator('#inp').fill(target.name);
  await page.locator('#btnGo').click();
  await expect(page.locator('#pts')).toHaveText('600');
  release();
  await expect(page.locator('#toast')).toHaveText('Nombre registrado: Jugador');
  expect(registrations).toBe(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('gd_emoji_v1')!).days['2026-10-05'],
    ),
  ).toMatchObject({ res: [1], score: 600 });
});

test('Emoji traduce las cifras del ranking y refresca la pestaña activa', async ({
  page,
}) => {
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN)
    await fakeApi.attachOriginal(page);
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
  await page.goto('/index.html');
  await page.evaluate(async () => {
    await fetch('/api/v1/scores/emoji-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: 'ranking-player',
        name: 'Ranking Player',
        day: '2026-10-05',
        score: 21000,
      }),
    });
  });
  await page.goto('/emoji-player.html');
  await expect(page.locator('#rankList')).toContainText('21.000');
  await page.locator('#btnLang').click();
  await expect(page.locator('#rankList')).toContainText('21,000');
  const requests = () =>
    fakeApi.calls.filter((call) => call.path === '/rankings/emoji-player')
      .length;
  const count = requests();
  await page.locator('#tabWeek').click();
  await expect.poll(requests).toBe(count + 1);
  await expect(page.locator('#rankList')).toContainText('21,000');
  await page.locator('#btnLang').click();
  await expect(page.locator('#rankList')).toContainText('21.000');
});

test('Más o Menos conserva seis aciertos diarios, revelado y cierre tras una respuesta incorrecta', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-05T12:00:00.000Z') });
  await page.goto('/mas-o-menos.html');
  await page.locator('#bDaily').click();
  const catalog = [...players, ...extraPlayers];
  for (let step = 0; step < 7; step++) {
    const first = await page.locator('#cA .nm').textContent();
    const second = await page.locator('#cB .nm').textContent();
    const a = catalog.find((player) => player.name === first)!;
    const b = catalog.find((player) => player.name === second)!;
    expect(a, first!).toBeDefined();
    expect(b, second!).toBeDefined();
    const higher = b.carrera! > a.carrera!;
    await page
      .locator((step < 6 ? higher : !higher) ? '#bMore' : '#bLess')
      .click();
    await page.clock.runFor(800);
    await expect(page.locator('#cB .led')).toHaveText(
      b.carrera!.toLocaleString('es-ES'),
    );
    await page.clock.runFor(1400);
    if (step < 6) {
      await expect(page.locator('#streak')).toHaveText(String(step + 1));
      await expect(page.locator('#cA .nm')).toHaveText(second!);
      await expect(page.locator('#cB')).not.toHaveClass(/\binB\b/);
    }
  }
  await expect(page.locator('#res')).toBeVisible();
  await expect(page.locator('#res .big')).toHaveText('6');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('gd_mm_daily')!)['2026-10-05'],
    ),
  ).toMatchObject({ streak: 6 });
  await page.reload();
  await page.locator('#bDaily').click();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#toast')).toHaveText(
    'Hoy: racha 6 · vuelve mañana',
  );
});

test('Reto diario conserva descartes, historial y medalla del récord acumulado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    if (!localStorage.getItem('reto15k-v2'))
      localStorage.setItem(
        'reto15k-v2',
        JSON.stringify({
          pid: '00000000-0000-4000-8000-000000000001',
          name: 'Jugador',
          best: 30000,
          games: 4,
          wins: 2,
          xp: 10000,
          futureField: { preserved: true },
        }),
      );
  });
  await page.goto('/reto-15000.html');
  await page.locator('#tab-diario').click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.locator('#btnSkip').click();
  await page.locator('#btnSkip').click();
  await expect(page.locator('#btnSkip')).toBeDisabled();
  for (let index = 0; index < 17; index++)
    await page.locator('#board .slot:not(:disabled)').first().click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#summary li')).toHaveCount(17);
  await expect(page.locator('#mName')).toHaveText('GOAT');
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('reto15k-v2')!),
  );
  expect(stored).toMatchObject({
    best: 30000,
    games: 5,
    futureField: { preserved: true },
  });
  expect(stored.scores[0]).toMatchObject({ med: 'GOAT', daily: true });
  expect(stored.daily['2026-10-05']).toMatchObject({
    t: stored.scores[0].t,
    med: 'GOAT',
  });
  await page.locator('#btnShare').click();
  await expect(page.locator('#shareModal')).toBeVisible();
  await expect(page.locator('#shareImg')).toHaveScreenshot(
    'reto-daily-share-es.png',
    { maxDiffPixels: 0 },
  );
  await page.locator('#btnCloseShare').click();
  await page.evaluate(() => window.FG_LANG.set('en'));
  await page.locator('#btnShare').click();
  await expect(page.locator('#shareImg')).toHaveScreenshot(
    'reto-daily-share-en.png',
    { maxDiffPixels: 0 },
  );
  await page.locator('#btnCloseShare').click();
  await page.reload();
  await page.locator('#tab-diario').click();
  await expect(page.locator('#dailyBar')).toContainText(
    String(stored.scores[0].t),
  );
  await expect(page.locator('#result')).toBeHidden();
});

for (const game of [
  { path: 'mas-o-menos.html', key: 'gd_mm_daily', result: { streak: 6 } },
  {
    path: 'blackjack-goles.html',
    key: 'gd_bj10_daily',
    result: { chips: 600 },
  },
]) {
  test(`${game.path}: un diario consumido en otra pestaña impide empezar`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-05T12:00:00Z'));
    await page.goto('/' + game.path);
    await expect(page.locator('#home')).toBeVisible();
    const entry = { start: 1, done: 1, ...game.result, futureField: 42 };
    await page.evaluate(
      ({ key, entry }) =>
        localStorage.setItem(key, JSON.stringify({ '2026-10-05': entry })),
      { key: game.key, entry },
    );
    await page.locator('#bDaily').click();
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#toast')).toContainText('vuelve mañana');
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        game.key,
      ),
    ).toEqual({ '2026-10-05': entry });
  });
}
