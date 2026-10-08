import { testOrigin } from '../helpers/environment';
import { expect, test } from '@playwright/test';
import { players } from '../../src/data/players';

test('Caras conserva candidatos ordenados, selección, deshacer, exportación y recarga', async ({
  page,
}) => {
  const origin = testOrigin;
  const original = origin + '/original.jpg';
  const old = origin + '/old.jpg';
  const recent = origin + '/recent.jpg';
  const name = players[0].name;
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/w/api.php') {
      await route.fulfill({
        json: {
          query: {
            pages: {
              1: {
                title: 'File:Player 2020.jpg',
                imageinfo: [{ mime: 'image/jpeg', thumburl: recent }],
              },
              2: {
                title: 'File:Player 1995.jpg',
                imageinfo: [{ mime: 'image/jpeg', thumburl: old }],
              },
              3: {
                title: 'File:Team logo 1980.png',
                imageinfo: [
                  { mime: 'image/png', thumburl: origin + '/logo.png' },
                ],
              },
            },
          },
        },
      });
    } else if (url.origin === origin && !url.pathname.endsWith('.jpg'))
      await route.continue();
    else await route.abort();
  });
  await page.addInitScript(
    ({ names, original }) => {
      localStorage.setItem(
        'gd_faces_v2',
        JSON.stringify(Object.fromEntries(names.map((n) => [n, original]))),
      );
      if (!localStorage.getItem('gd_caras_elegidas'))
        localStorage.setItem(
          'gd_caras_elegidas',
          JSON.stringify({ 'Otro futbolista': 'future-photo' }),
        );
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as Window & { copiedFaces?: string }).copiedFaces = text;
          },
        },
      });
    },
    { names: players.map((p) => p.name), original },
  );
  await page.goto('/caras.html');
  const card = page
    .locator('#grid .c')
    .filter({ has: page.locator('.n', { hasText: name }) })
    .first();
  await expect(page.locator('#grid .c')).toHaveCount(players.length);
  await card.click();
  await expect(page.locator('#modal .opt')).toHaveCount(2);
  expect(await page.locator('#modal .opt small').allTextContents()).toEqual([
    '1995',
    '2020',
  ]);
  await page.locator('#modal .opt').first().click();
  await expect(card).toHaveClass('c chg');
  await expect(card.locator('img')).toHaveAttribute('src', old);
  await card.click();
  await page.locator('#mNone').click();
  await expect(card).toHaveClass('c chg none');
  await page.locator('#bCopy').click();
  await expect(page.locator('#bCopy')).toHaveText('Copiado ✔');
  const exported = await page.locator('#out').inputValue();
  expect(exported).toContain('CAMBIADAS: Otro futbolista, ' + name);
  const photos = JSON.parse(exported.split('\nFOTOS: ')[1]);
  expect(photos[name]).toBe('');
  expect(Object.keys(photos)).toHaveLength(players.length);
  expect(
    await page.evaluate(
      () => (window as Window & { copiedFaces?: string }).copiedFaces,
    ),
  ).toBe(exported);
  await page.reload();
  await expect(card).toHaveClass('c chg none');
  await card.click();
  await page.locator('#mUndo').click();
  await expect(card).toHaveClass('c');
  await expect(card.locator('img')).toHaveAttribute('src', original);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gd_caras_elegidas')!),
    ),
  ).toEqual({ 'Otro futbolista': 'future-photo' });
  await page.locator('#bOnly').click();
  await expect(page.locator('#grid .c')).toHaveCount(0);
  await page.locator('#bOnly').click();
  await expect(page.locator('#grid .c')).toHaveCount(players.length);
});
