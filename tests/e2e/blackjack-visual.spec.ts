import { expect, test } from '@playwright/test';
import { FakeGoaldayApi } from '../helpers/fake-api';

test('Blackjack conserva la mesa durante la decisión y los resultados de pérdida y victoria', async ({
  page,
}) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin ===
    new URL(
      process.env.GOALDAY_VISUAL_BASELINE_ORIGIN || 'http://127.0.0.1:4173',
    ).origin
      ? route.continue()
      : route.abort(),
  );
  const api = new FakeGoaldayApi();
  await api.attach(page);
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN)
    await api.attachOriginal(page);
  await page.setViewportSize({ width: 390, height: 799 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', 'es');
  });
  await page.clock.install({ time: new Date('2026-10-05T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));
  await page.goto('/blackjack-goles.html');
  await page.clock.runFor(1);
  await page.locator('#bDaily').click();
  for (let hand = 0; hand < 4; hand++) {
    await page.locator('[data-b="100"]').click();
    await page.locator('#bDeal').click();
    // Observe each deal commit before advancing the next timer; bulk advancement
    // can batch React updates into a different 3D paint history.
    await page.clock.runFor(220);
    await expect(page.locator('#dCards .card')).toHaveCount(1);
    await page.clock.runFor(220);
    await expect(page.locator('#pCards .card')).toHaveCount(2);
    await page.clock.runFor(220);
    await expect(page.locator('#dCards .card')).toHaveCount(2);
    await page.clock.runFor(260);
    await expect(page.locator('#bDouble')).toBeVisible();
    await page.clock.runFor(80);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    if (hand === 0)
      await expect(page).toHaveScreenshot('blackjack-first-decision.png', {
        maxDiffPixels: 0,
        fullPage: true,
        stylePath: 'tests/helpers/blackjack-screenshot.css',
      });
    if (await page.locator('#bDouble').isVisible()) {
      if (hand === 0) await page.locator('#bDouble').click();
      else if (hand === 1) {
        await page.locator('#bTake').click();
        await page.clock.runFor(750);
        if (await page.locator('#bStand').isVisible())
          await page.locator('#bStand').click();
      } else if (hand === 2) await page.clock.runFor(10000);
      else await page.locator('#bStand').click();
    }
    for (
      let tick = 0;
      tick < 60 && !(await page.locator('#bNext').isVisible());
      tick++
    )
      await page.clock.runFor(100);
    await expect(page.locator('#bNext')).toBeVisible();
    await page.clock.runFor(750);
    if (hand === 0 || hand === 3)
      await expect(page).toHaveScreenshot(
        hand === 0 ? 'blackjack-bank-wins.png' : 'blackjack-bank-bust.png',
        {
          maxDiffPixels: 0,
          fullPage: true,
          stylePath: 'tests/helpers/blackjack-screenshot.css',
        },
      );
    await page.locator('#bNext').click();
  }
});
