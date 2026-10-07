import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runContext, acquireWorkspaceLock } from './run-context.mjs';
import { startOffline } from './offline-process.mjs';

const source = process.env.SOURCE ?? 'prod';
const run = await runContext(`evidence-${source}`);
let server;
let lock;
let browser;
let context;
let code = 1;
const diagnostics = [];
const controller = new AbortController();
const interrupt = () => {
  controller.abort(new Error('Evidence interrupted'));
  void browser?.close();
};
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
try {
  lock = await acquireWorkspaceLock();
  server = await startOffline({
    source,
    dir: run.dir,
    signal: controller.signal,
  });
  controller.signal.throwIfAborted();
  browser = await chromium.launch();
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: run.dir },
  });
  context.setDefaultTimeout(10000);
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === server.origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  await context.addInitScript(() => {
    localStorage.setItem('fg_team', 'none');
    localStorage.setItem('fg_lang', 'es');
  });
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) =>
    diagnostics.push({ pageError: error.message }),
  );
  page.on('console', (event) =>
    diagnostics.push({ level: event.type(), text: event.text() }),
  );
  for (const route of [
    'index',
    'reto-15000',
    'mas-o-menos',
    'blackjack-goles',
    'emoji-player',
    'caras',
    'editor-goles',
  ]) {
    const response = await page.goto(`${server.origin}/${route}.html`);
    if (response?.status() !== 200)
      throw new Error(`Page did not load: ${route}.html`);
    await page.waitForFunction(
      () => (document.querySelector('#root')?.childElementCount ?? 0) > 0,
    );
    await page.screenshot({
      path: resolve(run.dir, `${route}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.goto(server.origin);
  await page.locator('a[href="emoji-player.html"]').click();
  await page.locator('#btnStart').click();
  if (await page.locator('#nameBox').isVisible())
    await page.getByRole('button', { name: 'Ahora no' }).click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('#emojis span').length === 4 &&
      [...document.querySelectorAll('#emojis span')].every((node) =>
        node
          .getAnimations()
          .every((animation) => animation.playState === 'finished'),
      ),
  );
  await page.screenshot({
    path: resolve(run.dir, 'emoji-playing.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: '🌐 EN', exact: true }).click();
  await page.locator('html[lang="en"]').waitFor();
  await context.tracing.stop({
    path: resolve(run.dir, 'navigation.trace.zip'),
  });
  code = 0;
} finally {
  await context?.close();
  await browser?.close();
  await server?.stop();
  await lock?.release();
  await writeFile(
    resolve(run.dir, 'browser-diagnostics.json'),
    JSON.stringify(diagnostics, null, 2),
  );
  code = await run.finish(code, { source, origin: server?.origin });
}
process.exitCode = code;
