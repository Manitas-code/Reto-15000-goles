import { spawn } from 'node:child_process';
import { runContext, acquireWorkspaceLock } from './run-context.mjs';
import { startOffline } from './offline-process.mjs';
import { startDockerOffline } from './docker-offline-process.mjs';

const source = process.env.SOURCE ?? 'dev';
const run = await runContext(`e2e-${source}`);
let lock;
let server;
let code = 1;
let runner;
const controller = new AbortController();
const interrupted = () => {
  controller.abort(new Error('Verification interrupted'));
  runner?.kill('SIGTERM');
};
process.once('SIGINT', interrupted);
process.once('SIGTERM', interrupted);
try {
  lock = await acquireWorkspaceLock();
  if (!['dev', 'prod', 'docker', 'baseline'].includes(source))
    throw new Error('Invalid E2E SOURCE');
  let externalOrigin;
  if (source === 'baseline') {
    externalOrigin = process.env.GOALDAY_VISUAL_BASELINE_ORIGIN;
    if (
      !externalOrigin ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(
        new URL(externalOrigin).hostname,
      )
    )
      throw new Error(
        'Baseline mode requires a separately served original checkout on loopback',
      );
  } else if (
    process.env.GOALDAY_E2E_ORIGIN ||
    process.env.GOALDAY_VISUAL_BASELINE_ORIGIN
  ) {
    throw new Error(
      'Offline E2E does not accept inherited origins; use SOURCE=baseline explicitly for the original checkout',
    );
  }
  if (!externalOrigin)
    server =
      source === 'docker'
        ? await startDockerOffline({ dir: run.dir, signal: controller.signal })
        : await startOffline({
            source,
            dir: run.dir,
            signal: controller.signal,
          });
  controller.signal.throwIfAborted();
  const origin = externalOrigin ?? server.origin;
  runner = spawn(
    process.execPath,
    ['--bun', 'run', 'playwright', 'test', ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        GOALDAY_E2E_ORIGIN: origin,
        GOALDAY_RUN_DIR: run.dir,
      },
    },
  );
  code = await new Promise((resolve, reject) => {
    runner.on('error', reject);
    runner.on('close', (code) => resolve(code ?? 1));
  });
} finally {
  try {
    await server?.stop();
  } catch (error) {
    code = 1;
    console.error('Server cleanup failed:', error.message);
  }
  await lock?.release();
  code = await run.finish(code, {
    source,
    dockerImageId: server?.imageId,
    origin:
      server?.origin ??
      process.env.GOALDAY_E2E_ORIGIN ??
      process.env.GOALDAY_VISUAL_BASELINE_ORIGIN,
  });
}
process.exitCode = code;
