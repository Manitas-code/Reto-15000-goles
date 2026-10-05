import { expect, test } from '@playwright/test';
import { FakeGoaldayApi } from '../helpers/fake-api';

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
  const baselineOrigin = process.env.GOALDAY_VISUAL_BASELINE_ORIGIN
    ? new URL(process.env.GOALDAY_VISUAL_BASELINE_ORIGIN).origin
    : undefined;
  if (baselineOrigin) allowedOrigins.add(baselineOrigin);
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (
      url.hostname.endsWith('.supabase.co') &&
      baselineOrigin &&
      page.url().startsWith(baselineOrigin)
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    } else if (allowedOrigins.has(url.origin)) {
      await route.continue();
    } else {
      await route.abort('blockedbyclient');
    }
  });
  await new FakeGoaldayApi().attach(page);
});

async function captureRoutes(
  page: import('@playwright/test').Page,
  size: { width: number; height: number },
  lang: 'es' | 'en',
) {
  const baseline =
    process.env.GOALDAY_VISUAL_BASELINE_ORIGIN ?? 'http://127.0.0.1:4173';
  await page.setViewportSize(size);
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
  await page.addInitScript((language) => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', language);
  }, lang);

  const languageRoutes = lang === 'es' ? routes : routes.slice(0, 5);
  for (const route of languageRoutes) {
    const response = await page.goto(`${baseline}/${route}`);
    expect(response?.status(), route).toBe(200);
    await page.waitForLoadState('networkidle');
    const languageSuffix = lang === 'es' ? '' : '-en';
    await expect(page).toHaveScreenshot(
      `${route}${languageSuffix}-${size.width}.png`,
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
      },
    );
  }
}

test('capturas en español para las siete páginas en escritorio', async ({
  page,
}) => {
  await captureRoutes(page, { width: 1440, height: 960 }, 'es');
});

test('capturas en español para las siete páginas en móvil', async ({
  page,
}) => {
  await captureRoutes(page, { width: 390, height: 844 }, 'es');
});

test('capturas en inglés para los cinco productos en escritorio', async ({
  page,
}) => {
  await captureRoutes(page, { width: 1440, height: 960 }, 'en');
});

test('capturas en inglés para los cinco productos en móvil', async ({
  page,
}) => {
  await captureRoutes(page, { width: 390, height: 844 }, 'en');
});
