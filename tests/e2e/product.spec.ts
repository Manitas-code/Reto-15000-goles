import { expect, test } from '@playwright/test';
import { emojiPlayers } from '../../src/data/emoji-players';
import { picksFor } from '../../src/games/emoji-player/engine';

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
  const allowedOrigins = new Set(['http://127.0.0.1:4173']);
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
  await page.locator('#btnHome').click();
  await expect(page.locator('body')).not.toHaveClass(/playing/);
});
