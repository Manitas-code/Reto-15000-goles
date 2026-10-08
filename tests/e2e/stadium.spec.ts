import { testOrigin } from '../helpers/environment';
import { expect, test } from '@playwright/test';

test('conserva el estadio seleccionado, su cache y el selector en inglés', async ({
  page,
}) => {
  const origin = testOrigin;
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
  const selectedCrest = page.locator('.tp-team.on .tp-crest');
  await expect(selectedCrest).toHaveAttribute('alt', '');
  await expect(selectedCrest).toHaveJSProperty('naturalWidth', 128);
  await page.locator('.tp-back').click();
  const leagues = page.locator('.tp-lg');
  await expect(leagues).toHaveCount(8);
  let totalTeams = 0;
  for (let index = 0; index < 8; index += 1) {
    await leagues.nth(index).click();
    const crests = page.locator('.tp-team .tp-crest');
    await crests.evaluateAll((images) => {
      images.forEach(
        (image) => ((image as HTMLImageElement).loading = 'eager'),
      );
    });
    await expect(page.locator('.tp-team')).not.toHaveCount(0);
    totalTeams += await page.locator('.tp-team').count();
    await expect
      .poll(() =>
        crests.evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
      )
      .toBe(true);
    if (index < 7) await page.locator('.tp-back').click();
  }
  expect(totalTeams).toBe(174);
  await page.locator('.tp-back').click();
  await page.locator('.tp-lg').filter({ hasText: 'LaLiga' }).click();
  await expect(page.locator('.tp-team')).toHaveCount(20);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('#teamPick')).toBeVisible();
  await expect(page.locator('.tp-team.on')).toContainText('Barcelona');
  await page.setViewportSize({ width: 390, height: 844 });
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

test('Reto muestra el escudo y el nombre completo en el selector móvil', async ({
  page,
}) => {
  const origin = testOrigin;
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'Barcelona');
    localStorage.setItem('fg_lang', 'es');
  });
  await page.goto('/reto-15000.html');
  await page.getByTitle('Cambiar estadio').click();
  await expect(page.locator('#teamPick')).toBeVisible();
  const madrid = page.locator('.tp-team').filter({ hasText: 'Real Madrid CF' });
  await expect(madrid).toBeVisible();
  const crest = madrid.locator('.tp-crest');
  await expect(crest).toHaveJSProperty('naturalWidth', 128);
  const name = page
    .locator('.tp-team')
    .filter({ hasText: 'RC Deportivo de La Coruña' })
    .locator('.tp-n');
  await expect(name).toHaveText('RC Deportivo de La Coruña');
  await expect
    .poll(() =>
      name.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const box = element.getBoundingClientRect();
        const lines = [...range.getClientRects()];
        return (
          lines.length > 0 &&
          new Set(lines.map((line) => Math.round(line.top))).size <= 2 &&
          lines.every(
            (line) =>
              line.left >= box.left - 1 &&
              line.right <= box.right + 1 &&
              line.top >= box.top - 2 &&
              line.bottom <= box.bottom + 3,
          )
        );
      }),
    )
    .toBe(true);
  await madrid.click();
  await expect(page.locator('#teamPick')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('fg_team'))).toBe(
    'Madrid',
  );
});

test('Reto carga los ocho logos de liga y conserva la selección al volver', async ({
  page,
}) => {
  const origin = testOrigin;
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'Barcelona');
    localStorage.setItem('fg_lang', 'es');
  });
  await page.goto('/reto-15000.html');
  await page.getByTitle('Cambiar estadio').click();

  const headerLogo = page.locator('.tp-lgname .tp-league-logo img');
  await expect
    .poll(() =>
      headerLogo.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.locator('.tp-back').click();
  const leagueButtons = page.locator('.tp-lg');
  await expect(leagueButtons).toHaveCount(8);
  await expect
    .poll(() =>
      page
        .locator('.tp-lg .tp-league-logo img')
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await expect
    .poll(() => page.locator('.tp-lg b').allTextContents())
    .toEqual([
      'LaLiga',
      'Premier League',
      'Serie A',
      'Bundesliga',
      'Ligue 1',
      'Liga Argentina',
      'Liga MX',
      'MLS',
    ]);

  await leagueButtons.filter({ hasText: 'Premier League' }).click();
  const title = page.locator('.tp-lgname');
  await expect
    .poll(() =>
      title
        .locator('.tp-league-logo img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      title.evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeLessThanOrEqual(44);
  await page.locator('.tp-team').filter({ hasText: 'Arsenal' }).click();
  await expect(page.locator('#teamPick')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('fg_team'))).toBe(
    'PL-Arsenal',
  );

  await page.getByTitle('Cambiar estadio').click();
  await expect(title).toContainText('Premier League');
  await expect
    .poll(() =>
      title
        .locator('.tp-league-logo img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.locator('.tp-team.on')).toContainText('Arsenal');
});

test('un logo de liga ausente no impide elegirla', async ({ page }) => {
  const origin = testOrigin;
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === origin &&
      url.pathname.endsWith('/league-logos/L1.png')
    ) {
      return route.abort('failed');
    }
    return url.origin === origin
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'Barcelona');
    localStorage.setItem('fg_lang', 'es');
  });
  await page.goto('/reto-15000.html');
  await page.getByTitle('Cambiar estadio').click();
  await page.locator('.tp-back').click();

  const ligue1 = page.locator('.tp-lg').filter({ hasText: 'Ligue 1' });
  const missingLogo = ligue1.locator('.tp-league-logo');
  await expect(missingLogo).toBeVisible();
  await expect(missingLogo.locator('img')).toBeHidden();
  await ligue1.click();
  await expect(page.locator('.tp-lgname')).toContainText('Ligue 1');
  await expect(page.locator('.tp-team')).toHaveCount(18);
});
