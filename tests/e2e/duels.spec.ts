import { testOrigin } from '../helpers/environment';
import { expect, test, type Page } from '@playwright/test';
import { FakeGoaldayApi } from '../helpers/fake-api';

async function setup(
  page: Page,
  api: FakeGoaldayApi,
  name: string,
  pid: string,
) {
  const origin = new URL(testOrigin).origin;
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  await api.attach(page);
  if (process.env.GOALDAY_VISUAL_BASELINE_ORIGIN)
    await api.attachOriginal(page);
  await page.addInitScript(
    ({ name, pid }) => {
      localStorage.setItem('fg_team', 'none');
      localStorage.setItem('fg_lang', 'es');
      localStorage.setItem('reto15k-v2', JSON.stringify({ pid, name }));
    },
    { name, pid },
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function complete(page: Page, reverse = false) {
  for (let index = 0; index < 17; index++) {
    const open = page.locator('#board .slot:not(:disabled)');
    await (reverse ? open.last() : open.first()).click();
  }
  await expect(page.locator('#result')).toBeVisible();
}

test('dos usuarios juegan una sala completa y aceptan la revancha desde la interfaz', async ({
  browser,
}) => {
  const contexts = [await browser.newContext(), await browser.newContext()];
  const [host, guest] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );
  const api = new FakeGoaldayApi();
  try {
    await setup(host, api, 'Anfitrión', 'host');
    await setup(guest, api, 'Visitante', 'guest');
    await host.goto('/reto-15000.html');
    await host.locator('#tab-enlace').click();
    await expect(host.locator('#duelModal .dm-clock')).toHaveText(/ROOM\d+/);
    const code = (await host.locator('#duelModal .dm-clock').textContent())!;
    await guest.goto('/reto-15000.html?sala=' + code);
    await expect(guest.locator('#duelModal')).toContainText('Anfitrión');
    await guest.getByRole('button', { name: '¡Jugar!' }).click();
    await expect(host.locator('body')).toHaveClass(/playing/);
    await expect(guest.locator('body')).toHaveClass(/playing/);
    await expect(host.locator('#cName')).not.toBeEmpty();
    await expect(guest.locator('#cName')).toHaveText(
      (await host.locator('#cName').textContent())!,
    );
    await Promise.all([complete(host), complete(guest, true)]);
    await expect(host.locator('#duelRes')).toBeVisible();
    await expect(guest.locator('#duelRes')).toBeVisible();
    await expect(host.locator('#duelRes')).toContainText('Visitante');
    await expect(guest.locator('#duelRes')).toContainText('Anfitrión');
    for (const page of [host, guest]) {
      const best = await page.evaluate(
        () => JSON.parse(localStorage.getItem('reto15k-v2')!).best,
      );
      // The original schedules the first promotion after the result becomes visible.
      if (best >= 2000) {
        await expect(page.locator('#rankUp')).toBeVisible();
        await page.locator('#ruOk').click();
      }
    }
    await host.locator('#btnAgain').click();
    await expect(host.locator('#duelModal')).toContainText('Revancha pedida');
    await guest.locator('#btnAgain').click();
    await expect(host.locator('body')).toHaveClass(/playing/);
    await expect(guest.locator('body')).toHaveClass(/playing/);
    const operations = api.calls.map((call) => call.path);
    expect(
      operations.filter((path) => path.endsWith('/duel_submit')),
    ).toHaveLength(2);
    expect(
      operations.filter((path) => path.endsWith('/duel_rematch')),
    ).toHaveLength(2);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('un enlace permite jugar una vez, consultar el resultado y crear otro reto', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const api = new FakeGoaldayApi();
  try {
    await setup(page, api, 'Visitante', 'guest');
    await page.goto('/index.html');
    await page.evaluate(async () => {
      await fetch('/api/v1/reto/rpc/link_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'REPLAY1',
          pid: 'host',
          n: 'Anfitrión',
          sc: 1234,
          sl: Array.from({ length: 17 }, () => ['Pelé', 100]),
        }),
      });
    });
    await page.goto('/reto-15000.html?reto=REPLAY1');
    await expect(page.locator('#duelModal')).toContainText('Anfitrión te reta');
    await page.getByRole('button', { name: 'Aceptar el reto' }).click();
    await complete(page);
    await expect(page.locator('#duelRes')).toBeVisible();
    await expect(page.locator('#duelRes')).toContainText('Anfitrión');
    await page.goto('/reto-15000.html?reto=REPLAY1');
    await expect(page.locator('#duelModal')).toContainText('1234');
    await expect(
      page.getByRole('button', { name: 'Aceptar el reto' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Crear mi propio reto' }).click();
    await complete(page);
    await expect(page.locator('#duelRes')).toContainText('Reto listo');
    expect(
      api.calls.filter((call) => call.path.endsWith('/link_start')),
    ).toHaveLength(1);
    expect(
      api.calls.filter((call) => call.path.endsWith('/link_finish')),
    ).toHaveLength(1);
    expect(
      api.calls.filter((call) => call.path.endsWith('/link_create')),
    ).toHaveLength(2);
  } finally {
    await context.close();
  }
});

test('la cola cancela, encuentra un bot y publica el resultado tras su tiempo de juego', async ({
  page,
}) => {
  const api = new FakeGoaldayApi();
  await setup(page, api, 'Jugador', 'queue-player');
  await page.clock.install({ time: new Date('2026-10-05T12:00:00Z') });
  await page.goto('/reto-15000.html');
  await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));
  await page.locator('#tab-online').click();
  await expect(page.locator('#duelModal')).toContainText('Buscando rival');
  await expect
    .poll(
      () =>
        api.calls.filter((call) => call.path.endsWith('/duel_queue')).length,
    )
    .toBe(1);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('#duelModal')).toBeHidden();
  await expect
    .poll(
      () =>
        api.calls.filter((call) => call.path.endsWith('/duel_cancel')).length,
    )
    .toBe(1);
  await page.locator('#tab-online').click();
  await expect
    .poll(
      () =>
        api.calls.filter((call) => call.path.endsWith('/duel_queue')).length,
    )
    .toBe(2);
  // Stop advancing at the bot request so network scheduling cannot consume the countdown.
  for (
    let tick = 0;
    tick < 34 && !api.calls.some((call) => call.path.endsWith('/duel_bot'));
    tick++
  )
    await page.clock.runFor(500);
  await expect(page.locator('#duelModal')).toContainText('Rival encontrado');
  await page.clock.runFor(1500);
  await expect(page.locator('body')).toHaveClass(/playing/);
  await page.clock.runFor(20500);
  await expect(page.locator('#board .filled')).toHaveCount(1);
  for (let i = 0; i < 16; i++) {
    await page.locator('#board .slot:not(:disabled)').first().click();
    await page.clock.runFor(550);
  }
  await page.clock.runFor(2500);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#duelRes')).toContainText(
    'Esperando a Rival automático',
  );
  await page.clock.runFor(190000);
  await expect(page.locator('#duelRes')).not.toContainText('Esperando');
  await expect(page.locator('#duelRes')).toContainText(
    /Has ganado|Has perdido|Empate/i,
  );
  await expect
    .poll(
      () =>
        api.calls.filter((call) => call.path.endsWith('/duel_submit')).length,
    )
    .toBe(1);
});
