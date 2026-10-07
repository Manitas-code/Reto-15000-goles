import type { Page } from '@playwright/test';

/** Pause one second after the page's current simulated time, even under load. */
export async function pauseAfterLoad(page: Page, delayMs = 1000) {
  const pauseTime = await page.evaluate(
    (delay) => new Date(Date.now() + delay),
    delayMs,
  );
  await page.clock.pauseAt(pauseTime);
}
