import { testOrigin } from '../helpers/environment';
import { expect, test } from '@playwright/test';
import { FakeGoaldayApi } from '../helpers/fake-api';

test('Reto conserva la presentación del tablero, las previsualizaciones y el resultado diario', async ({
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', 'es');
    localStorage.setItem(
      'reto15k-v2',
      JSON.stringify({
        pid: '00000000-0000-4000-8000-000000000001',
        name: 'Jugador',
        best: 30000,
        games: 20,
        xp: 10000,
      }),
    );
  });
  await page.goto('/reto-15000.html');
  await page.locator('#tab-diario').click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await expect(page.locator('#board .slot:not(:disabled)')).toHaveCount(17);
  await expect(page.locator('#p-play')).toHaveScreenshot(
    'reto-daily-first-card.png',
    { maxDiffPixels: 0 },
  );
  for (let i = 0; i < 4; i++)
    await page.locator('#board .slot:not(:disabled)').first().click();
  await expect(page.locator('#board .slot:not(:disabled)')).toHaveCount(13);
  await expect(page.locator('#p-play')).toHaveScreenshot(
    'reto-daily-four-placements.png',
    { maxDiffPixels: 0 },
  );
  for (let i = 4; i < 17; i++)
    await page.locator('#board .slot:not(:disabled)').first().click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#p-play')).toHaveScreenshot(
    'reto-daily-result.png',
    { maxDiffPixels: 0 },
  );
});
