import { spawn } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function startOffline({ source = 'dev', dir, signal }) {
  signal?.throwIfAborted();
  const child = spawn(process.execPath, ['scripts/offline.mjs'], {
    env: { ...process.env, SOURCE: source, PORT: '0', HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let lines = '';
  let ready;
  let rejectReady;
  const originPromise = new Promise((resolve, reject) => {
    ready = resolve;
    rejectReady = reject;
  });
  let writes = Promise.resolve();
  const log = (chunk) => {
    writes = writes.then(() => appendFile(resolve(dir, 'server.log'), chunk));
  };
  child.stderr.on('data', log);
  child.stdout.on('data', (chunk) => {
    log(chunk);
    lines += chunk;
    const complete = lines.split('\n');
    lines = complete.pop();
    for (const line of complete) {
      try {
        const event = JSON.parse(line);
        if (event.event === 'offline.ready') ready(event.origin);
      } catch {
        /* Vite also prints human-readable startup output. */
      }
    }
  });
  child.on('error', rejectReady);
  child.on('exit', (code) =>
    rejectReady(
      new Error(`Offline server exited (${code}); see ${dir}/server.log`),
    ),
  );
  const exited = new Promise((resolve) => child.on('close', resolve));
  let stopping;
  const stop = () =>
    (stopping ??= (async () => {
      if (child.exitCode === null && child.signalCode === null)
        child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
      try {
        await exited;
      } finally {
        clearTimeout(timer);
      }
      await writes;
      signal?.removeEventListener('abort', abort);
    })());
  const abort = () => {
    rejectReady(signal.reason);
    void stop();
  };
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(
    () => rejectReady(new Error('Offline server startup timed out')),
    30000,
  );
  try {
    const origin = await originPromise;
    signal?.throwIfAborted();
    return { origin, stop };
  } catch (error) {
    await stop();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
