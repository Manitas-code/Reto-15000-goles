export const testOrigin =
  process.env.GOALDAY_E2E_ORIGIN ||
  process.env.GOALDAY_VISUAL_BASELINE_ORIGIN ||
  'http://127.0.0.1:4173';

/** The visual baseline always points to the original product when configured. */
export const visualBaselineOrigin =
  process.env.GOALDAY_VISUAL_BASELINE_ORIGIN || testOrigin;

export const allowedOrigins = new Set([
  new URL(testOrigin).origin,
  new URL(visualBaselineOrigin).origin,
]);
