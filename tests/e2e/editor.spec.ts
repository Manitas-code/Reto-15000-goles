import { testOrigin } from '../helpers/environment';
import { expect, test } from '@playwright/test';

test('el editor con calendario conserva marcas, navegación, prueba de vídeo y exportación', async ({
  page,
}) => {
  const origin = testOrigin;
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  await page.clock.install();
  await page.addInitScript(() => {
    const browser = window as unknown as Record<string, unknown>;
    browser.INICIO = '2026-10-05';
    browser.GOLES = [
      {
        name: 'Jugador Uno',
        flag: '🇪🇸',
        h: ['A', 'B'],
        mt: 'Club · Rival',
        tx: 'Gol uno',
        yt: 'abcdefghijk',
        desde: 2,
        corte: 5,
        hasta: 8,
      },
      {
        name: 'Jugador Dos',
        flag: '🇦🇷',
        h: ['C', 'D'],
        mt: 'Otro · Rival',
        tx: 'Gol dos',
      },
    ];
    browser.mockVideo = { time: 12.34, playing: false, seeks: [] as number[] };
    const video = browser.mockVideo as {
      time: number;
      playing: boolean;
      seeks: number[];
    };
    browser.YT = {
      Player: class {
        getCurrentTime() {
          return video.time;
        }
        seekTo(time: number) {
          video.time = time;
          video.seeks.push(time);
        }
        playVideo() {
          video.playing = true;
        }
        pauseVideo() {
          video.playing = false;
        }
        destroy() {}
      },
    };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          browser.copiedGoals = text;
        },
      },
    });
  });
  await page.goto('/editor-goles.html');
  await page.evaluate(() => window.onYouTubeIframeAPIReady?.());
  await expect(page.locator('#list .it')).toHaveCount(2);
  await expect(page.locator('#count')).toHaveText('1 de 2 listos');
  await page.locator('[data-k="desde"]').click();
  await expect(page.locator('#f_desde')).toHaveValue('12.3');
  await page.locator('#f_corte').fill('15');
  await page.locator('#f_hasta').fill('18');
  await page.locator('#f_hasta').press('Tab');
  await expect(page.locator('#warn')).toHaveText('Listo ✔');
  await page.locator('#test').click();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { mockVideo: { seeks: number[] } }
      ).mockVideo.seeks.at(-1),
    ),
  ).toBe(12.3);
  await page.evaluate(() => {
    (window as unknown as { mockVideo: { time: number } }).mockVideo.time = 15;
  });
  await page.clock.runFor(150);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { mockVideo: { playing: boolean } }).mockVideo
          .playing,
    ),
  ).toBe(false);
  await page.locator('#next').click();
  await expect(page.locator('#ed h2')).toHaveText('Día 2 · Jugador Dos');
  await page.locator('#url').fill('https://youtu.be/123456789ab');
  await page.locator('#f_desde').fill('1');
  await page.locator('#f_corte').fill('3');
  await page.locator('#f_corte').press('Tab');
  await expect(page.locator('#count')).toHaveText('2 de 2 listos');
  await page.locator('#cp').click();
  await expect(page.locator('#cp')).toHaveText('Copiado ✔');
  const text = await page.evaluate(
    () => (window as unknown as { copiedGoals: string }).copiedGoals,
  );
  expect(text).toContain("const INICIO='2026-10-05';");
  expect(text).toContain("yt:'abcdefghijk',desde:12.3,corte:15,hasta:18");
  expect(text).toContain("yt:'123456789ab',desde:1,corte:3");
  const download = page.waitForEvent('download');
  await page.locator('#dl').click();
  expect((await download).suggestedFilename()).toBe('goles.js');
  await page.reload();
  await expect(page.locator('#f_desde')).toHaveValue('12.3');
  await expect(page.locator('#count')).toHaveText('2 de 2 listos');
});
