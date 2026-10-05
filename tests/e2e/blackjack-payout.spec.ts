import { expect, test } from '@playwright/test';
import { FakeGoaldayApi } from '../helpers/fake-api';

test('Blackjack diario conserva cartas, dobles, vencimientos y pagos en siete manos', async ({
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
  await page.addInitScript(() => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', 'es');
  });
  await page.clock.install({ time: new Date('2026-10-05T12:00:00Z') });
  await page.goto('/blackjack-goles.html');
  await page.locator('#bDaily').click();
  const checkpoints = [];
  for (let hand = 0; hand < 7; hand++) {
    await page.locator('[data-b="100"]').click();
    await page.locator('#bDeal').click();
    await page.clock.runFor(1000);
    if (await page.locator('#bDouble').isVisible()) {
      if (hand === 0) await page.locator('#bDouble').click();
      else if (hand === 1) {
        await page.locator('#bTake').click();
        await page.clock.runFor(350);
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
    await page.clock.runFor(350);
    checkpoints.push({
      p: await page.locator('#pSum').innerText(),
      d: await page.locator('#dSum').innerText(),
      result: await page.locator('#mid .banner').innerText(),
      cards: await page.locator('#pCards .card').count(),
    });
    await page.locator('#bNext').click();
  }
  await expect(page.locator('#res')).toBeVisible();
  // Oracle obtained from revision 8855264, before running this case against React.
  expect(checkpoints).toEqual([
    { p: '845', d: '1127', result: 'GANA LA BANCA\n−200 fichas', cards: 3 },
    { p: '844', d: '1184', result: 'GANA LA BANCA\n−100 fichas', cards: 3 },
    { p: '163', d: '620', result: 'GANA LA BANCA\n−100 fichas', cards: 2 },
    { p: '543', d: '996', result: '¡LA BANCA SE PASA!\n+100 fichas', cards: 2 },
    {
      p: '557',
      d: '1109',
      result: '¡LA BANCA SE PASA!\n+100 fichas',
      cards: 2,
    },
    { p: '268', d: '625', result: 'GANA LA BANCA\n−100 fichas', cards: 2 },
    { p: '433', d: '825', result: 'GANA LA BANCA\n−100 fichas', cards: 2 },
  ]);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gd_bj10_stats')!),
    ),
  ).toMatchObject({ games: 1, hands: 7, bestDaily: 600 });
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gd_bj10_daily')!),
    ),
  ).toEqual({ '2026-10-05': { start: 1, done: 1, chips: 600 } });
});
