import { expect, test, type Page, type Route } from '@playwright/test';
import { FakeGoaldayApi } from '../helpers/fake-api';

type Scenario = {
  name: 'Más o Menos' | 'Blackjack';
  path: string;
  modeSelector: string;
  statsKey: string;
  dailyKey: string;
};

const scenarios: Scenario[] = [
  {
    name: 'Más o Menos',
    path: '/mas-o-menos.html',
    modeSelector: '#modesBox [data-cat="seleccion"]',
    statsKey: 'gd_mm_stats',
    dailyKey: 'gd_mm_daily',
  },
  {
    name: 'Blackjack',
    path: '/blackjack-goles.html',
    modeSelector: '#modesBox [data-m="seleccion"]',
    statsKey: 'gd_bj10_stats',
    dailyKey: 'gd_bj10_daily',
  },
];

const fixedTime = new Date('2026-10-05T12:00:00.000Z');
const pausedTime = new Date('2026-10-05T12:00:01.000Z');

let api: FakeGoaldayApi;

test.beforeEach(async ({ page }) => {
  const allowed = new Set(['http://127.0.0.1:4173']);
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN)
    allowed.add(new URL(process.env.GOALDAY_VISUAL_BASELINE_ORIGIN).origin);
  await page.route('**/*', (route) =>
    allowed.has(new URL(route.request().url()).origin)
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  api = new FakeGoaldayApi();
  await api.attach(page);
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN)
    await api.attachOriginal(page);
});

async function prepare(page: Page, scenario: Scenario) {
  await page.goto(scenario.path);
  await page.evaluate(
    ({ statsKey, stats }) => {
      localStorage.clear();
      localStorage.setItem('fg_team', 'none');
      localStorage.setItem('fg_lang', 'es');
      localStorage.setItem(
        'reto15k-v2',
        JSON.stringify({ futureField: { keep: true } }),
      );
      localStorage.setItem(statsKey, JSON.stringify(stats));
    },
    { statsKey: scenario.statsKey, stats: initialStats(scenario.name) },
  );
  await page.reload();
  await expect(page.locator(scenario.modeSelector)).toBeVisible();
  await page.evaluate(() => {
    let s = 1234;
    Math.random = () =>
      (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  });
  await page.locator(scenario.modeSelector).click();
  await page.clock.runFor(1);
}

function initialStats(name: Scenario['name']) {
  return name === 'Más o Menos'
    ? { best: 0, games: 0, total: 0, bestByCat: {}, sent: {}, futureField: 42 }
    : { best: {}, sent: {}, games: 0, hands: 0, futureField: 42 };
}

async function finishFreeGame(page: Page, scenario: Scenario) {
  if (scenario.name === 'Más o Menos') {
    const pairs = [
      ['Kenny Dalglish', 'Andrés Iniesta'],
      ['Andrés Iniesta', 'Robin van Persie'],
      ['Robin van Persie', 'Ruud Gullit'],
      ['Ruud Gullit', 'Hristo Stoichkov'],
      ['Hristo Stoichkov', 'George Weah'],
      ['George Weah', 'Filippo Inzaghi'],
      ['Filippo Inzaghi', 'Franz Beckenbauer'],
    ];
    for (let index = 0; index < pairs.length; index++) {
      const [first, second] = pairs[index]!;
      await expect(page.locator('#cA .nm')).toHaveText(first!);
      await expect(page.locator('#cB .nm')).toHaveText(second!);
      await page
        .locator(index === 6 ? '#bMore' : index % 2 ? '#bMore' : '#bLess')
        .click();
      await page.clock.runFor(800);
      if (index === 6) {
        await page.clock.runFor(1200);
        await expect(page.locator('#res')).toBeVisible();
      } else {
        await page.clock.runFor(600);
        await page.clock.runFor(450);
      }
    }
    await expect(page.locator('#res .big')).toHaveText('6');
    await expect(page.locator('#rankMsg')).toContainText(
      'Elige tu nombre para salir en el ranking',
    );
    return;
  }

  const hands = [
    {
      target: 140,
      stand: 105,
      player: 16,
      dealer: 117,
      result: 'Gana la banca',
      chips: 900,
      cards: ['Haller', 'Navas'],
    },
    {
      target: 100,
      stand: 75,
      player: 46,
      dealer: 116,
      result: '¡La banca se pasa!',
      chips: 1000,
      cards: ['Agüero', 'Carvalho'],
    },
    {
      target: 105,
      stand: 80,
      player: 64,
      dealer: 84,
      result: 'Gana la banca',
      chips: 900,
      cards: ['Özil', 'Platini'],
    },
    {
      target: 130,
      stand: 100,
      player: 24,
      dealer: 147,
      result: '¡La banca se pasa!',
      chips: 1000,
      cards: ['Kewell', 'Chiesa'],
    },
    {
      target: 125,
      stand: 95,
      player: 41,
      dealer: 96,
      result: 'Gana la banca',
      chips: 900,
      cards: ['Salas', 'Sánchez'],
    },
    {
      target: 100,
      stand: 75,
      player: 18,
      dealer: 105,
      result: '¡La banca se pasa!',
      chips: 1000,
      cards: ['Vlahović', 'Koulibaly'],
    },
    {
      target: 130,
      stand: 100,
      player: 15,
      dealer: 110,
      result: 'Gana la banca',
      chips: 900,
      cards: ['Deco', 'Braithwaite'],
    },
  ];
  for (let index = 0; index < hands.length; index++) {
    const hand = hands[index]!;
    await page.locator('[data-b="100"]').click();
    await expect(page.locator('#mid .felt-t small')).toHaveText(
      'La banca se planta en ' + hand.stand,
    );
    await page.locator('#bDeal').click();
    await page.clock.runFor(1000);
    await expect(page.locator('#mid .felt-t b')).toHaveText(
      'Objetivo ' + hand.target,
    );
    await expect(page.locator('#pCards .ln')).toHaveText(hand.cards);
    await page.locator('#bStand').click();
    for (
      let tick = 0;
      tick < 100 && !(await page.locator('#bNext').isVisible());
      tick++
    )
      await page.clock.runFor(100);
    await expect(page.locator('#bNext')).toBeVisible();
    await page.clock.runFor(750);
    await expect(page.locator('#pSum')).toHaveText(String(hand.player));
    await expect(page.locator('#dSum')).toHaveText(String(hand.dealer));
    await expect(page.locator('#mid .banner b')).toHaveText(hand.result);
    await expect(page.locator('#chips')).toHaveText(
      hand.chips.toLocaleString('es-ES'),
    );
    await page.locator('#bNext').click();
  }
  await expect(page.locator('#res')).toBeVisible();
  await expect(page.locator('#res .big')).toHaveText('900');
  await expect(page.locator('#rankMsg')).toContainText(
    'Elige tu nombre para salir en el ranking',
  );
}

async function assertSavedGame(page: Page, scenario: Scenario) {
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    scenario.statsKey,
  );
  expect(stored.futureField).toBe(42);
  if (scenario.name === 'Más o Menos')
    expect(stored).toMatchObject({
      games: 1,
      total: 6,
      best: 6,
      bestByCat: { seleccion: 6 },
    });
  else
    expect(stored).toMatchObject({
      games: 1,
      hands: 7,
      best: { seleccion: 900 },
    });
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key), scenario.dailyKey),
    )
    .toBeNull();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('reto15k-v2')!)),
  ).toEqual({ futureField: { keep: true } });
}

for (const scenario of scenarios) {
  test(`${scenario.name}: Selección libre usa la secuencia de referencia`, async ({
    page,
  }) => {
    await page.clock.install({ time: fixedTime });
    await page.clock.pauseAt(pausedTime);
    await prepare(page, scenario);
    await finishFreeGame(page, scenario);
    await assertSavedGame(page, scenario);
  });
}

async function interceptRegistration(page: Page) {
  let requests = 0;
  let releaseSecond!: () => void;
  let resolveSecondStarted!: () => void;
  const secondStarted = new Promise<void>((resolve) => {
    resolveSecondStarted = resolve;
  });
  const secondResponse = new Promise<void>((resolve) => {
    releaseSecond = resolve;
  });
  const matcher =
    /(?:\/api\/v1\/identity\/register|\/rest\/v1\/rpc\/register_name)$/;
  const handler = async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': '*',
        },
      });
      return;
    }
    requests++;
    if (requests === 1) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'name already taken' }),
        headers: { 'access-control-allow-origin': '*' },
      });
      return;
    }
    resolveSecondStarted();
    await secondResponse;
    await route.fulfill({
      status: 204,
      headers: { 'access-control-allow-origin': '*' },
    });
  };
  await page.route(matcher, handler);
  return {
    get requests() {
      return requests;
    },
    secondStarted,
    release: releaseSecond,
    remove: () => page.unroute(matcher, handler),
  };
}

async function setLanguage(page: Page, language: 'en' | 'es') {
  await page.evaluate((next) => window.FG_LANG.set(next), language);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

async function registerAfterResult(page: Page, scenario: Scenario) {
  await page.locator('#bName').click();
  await expect(page.locator('#nmIn')).toBeVisible();
  const registration = await interceptRegistration(page);
  try {
    await page.locator('#nmIn').fill('X');
    await page.locator('#nmIn').press('Enter');
    await expect(page.locator('#nmErr')).toHaveText('Mínimo 2 caracteres.');
    expect(registration.requests).toBe(0);

    await page.locator('#nmIn').fill('Jugador');
    await page.locator('#nmIn').press('Enter');
    await expect.poll(() => registration.requests).toBe(1);
    await expect(page.locator('#nmErr')).toHaveText(
      'Ese nombre ya lo tiene otro jugador. Elige otro.',
    );

    await setLanguage(page, 'en');
    await expect(page.locator('#rankMsg')).toContainText(
      'Choose your name to appear in the world ranking:',
    );
    await expect(page.locator('#nmErr')).toHaveText(
      'That name is already taken. Choose another one.',
    );
    await setLanguage(page, 'es');
    await expect(page.locator('#nmErr')).toHaveText(
      'Ese nombre ya lo tiene otro jugador. Elige otro.',
    );

    await page.locator('#nmIn').press('Enter');
    await expect.poll(() => registration.requests).toBe(2);
    await registration.secondStarted;
    await expect(page.locator('#nmOk')).toBeDisabled();
    await page.locator('#nmIn').press('Enter');
    expect(registration.requests).toBe(2);
    registration.release();
    await expect(page.locator('#nmIn')).toBeHidden();
    await expect(page.locator('#rankMsg')).toContainText(
      'Guardado en el ranking mundial como Jugador',
    );

    const identity = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('reto15k-v2')!),
    );
    expect(identity).toMatchObject({
      name: 'Jugador',
      futureField: { keep: true },
    });
    expect(identity.pid).toEqual(expect.any(String));
    expect(identity.pid).not.toBe('');
    const scorePath =
      scenario.name === 'Más o Menos'
        ? '/scores/mas-o-menos'
        : '/scores/blackjack';
    await expect
      .poll(
        () =>
          api.calls.filter(
            (call) => call.method === 'POST' && call.path === scorePath,
          ).length,
      )
      .toBe(1);
    const score = api.calls.find(
      (call) => call.method === 'POST' && call.path === scorePath,
    )!;
    if (scenario.name === 'Más o Menos')
      expect(score.body).toMatchObject({ mode: 'seleccion', streak: 6 });
    else expect(score.body).toMatchObject({ mode: 'seleccion', chips: 900 });

    const sentValue = scenario.name === 'Más o Menos' ? 6 : 900;
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).sent,
          scenario.statsKey,
        ),
      )
      .toMatchObject({ seleccion: sentValue });
    const stats = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      scenario.statsKey,
    );
    expect(stats.futureField).toBe(42);
    expect(stats.sent).toMatchObject({ seleccion: sentValue });
    await expect(page.locator('#rankMsg')).toContainText(
      'Guardado en el ranking mundial como Jugador',
    );
  } finally {
    registration.release();
    if (!page.isClosed()) await registration.remove();
  }
}

for (const scenario of scenarios) {
  test(`${scenario.name}: el registro conserva errores, idioma y un solo envío`, async ({
    page,
  }) => {
    await page.clock.install({ time: fixedTime });
    await page.clock.pauseAt(pausedTime);
    await prepare(page, scenario);
    await finishFreeGame(page, scenario);
    await registerAfterResult(page, scenario);
  });
}
