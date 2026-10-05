import { expect, test } from '@playwright/test';

test('conserva el estadio seleccionado, su cache y el selector en inglés', async ({
  page,
}) => {
  const origin =
    process.env.GOALDAY_VISUAL_BASELINE_ORIGIN || 'http://127.0.0.1:4173';
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
  await page.addInitScript(() => {
    if (!localStorage.getItem('fg_team'))
      localStorage.setItem('fg_team', 'Barcelona');
    if (!localStorage.getItem('fg_lang')) localStorage.setItem('fg_lang', 'es');
  });
  await page.goto('/index.html');
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fg_bg') || '{}').t),
    )
    .toBe('Barcelona');
  await page.waitForLoadState('networkidle');
  const cached = await page.evaluate(() => localStorage.getItem('fg_bg'));
  await expect(page).toHaveScreenshot('barcelona-home-es-390.png', {
    fullPage: true,
    maxDiffPixels: 0,
  });
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/hasteam/);
  expect(await page.evaluate(() => localStorage.getItem('fg_bg'))).toBe(cached);
  await page.locator('#btnLang').click();
  await page.locator('#btnTeam').click();
  await expect(page.locator('#teamPick')).toBeVisible();
  await expect(page.locator('.tp-team.on')).toContainText('Barcelona');
  await expect(page).toHaveScreenshot('barcelona-picker-en-390.png', {
    fullPage: true,
    maxDiffPixels: 0,
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('#teamPick')).toBeHidden();
  await page.locator('#btnTeam').click();
  await page.locator('.tp-back').click();
  await page.locator('.tp-skip').click();
  expect(await page.evaluate(() => localStorage.getItem('fg_team'))).toBe(
    'none',
  );
  expect(await page.evaluate(() => localStorage.getItem('fg_bg'))).toBeNull();
});
