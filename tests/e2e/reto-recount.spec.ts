import { testOrigin } from '../helpers/environment';
import { expect, test } from '@playwright/test';
import { pauseAfterLoad } from '../helpers/clock';
import { FakeGoaldayApi } from '../helpers/fake-api';

const number = (text: string) => Number(text.replace(/\D/g, ''));

test('el recuento anima casillas independientes, conserva el total y guarda cambios recientes', async ({
  page,
}) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(testOrigin).origin
      ? route.continue()
      : route.abort(),
  );
  const api = new FakeGoaldayApi();
  await api.attach(page);
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN)
    await api.attachOriginal(page);
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', 'es');
    localStorage.setItem(
      'reto15k-v2',
      JSON.stringify({
        pid: '00000000-0000-4000-8000-000000000001',
        name: 'Jugador',
        best: 30000,
        sound: true,
        futureField: 42,
      }),
    );
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2026-10-05T12:00:00Z') });
  await page.goto('/reto-15000.html');
  await pauseAfterLoad(page);
  await page.locator('#tab-diario').click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.clock.runFor(1800);
  for (let i = 0; i < 16; i++) {
    await page.locator('#board .slot:not(:disabled)').first().click();
    await page.clock.runFor(700);
  }
  await page.locator('#board .slot:not(:disabled)').click();
  const points = (
    await page.locator('#board .slot .pts').allTextContents()
  ).map(number);
  const total = points.reduce((sum, value) => sum + value, 0);
  await page.clock.runFor(270);
  await expect(page.locator('#step')).toHaveText('Recuento');
  await page.locator('#btnSound').click();
  await page.clock.runFor(250);
  // A slot keeps its placed value until its own recount begins.
  expect(
    number((await page.locator('#board .slot .pts').nth(16).textContent())!),
  ).toBe(points[16]);
  await page.clock.runFor(400);
  const dock = number((await page.locator('#total').textContent())!);
  expect(dock).toBeGreaterThan(total * 0.55);
  expect(dock).toBeLessThan(total * 0.8);
  const shown = (await page.locator('#board .slot .pts').allTextContents()).map(
    number,
  );
  expect(shown[0]).toBe(points[0]);
  expect(shown[1]).toBe(points[1]);
  await expect(page.locator('#result')).toBeHidden();
  await page.clock.runFor(1100);
  await expect(page.locator('#result')).toBeVisible();
  expect(number((await page.locator('#total').textContent())!)).toBe(total);
  const store = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('reto15k-v2')!),
  );
  expect(store).toMatchObject({ games: 1, sound: false, futureField: 42 });
  expect(store.scores[0].t).toBe(total);
  await page.clock.runFor(1000);
  expect(number((await page.locator('#rNum').textContent())!)).toBe(total);
  expect(number((await page.locator('#total').textContent())!)).toBe(total);
});
