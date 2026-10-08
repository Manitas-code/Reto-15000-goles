import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { expect, it } from 'vitest';

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

it.skipIf(process.platform === 'win32')(
  'starts both development servers and closes their process trees on shutdown',
  async () => {
    const [apiPort, webPort] = await Promise.all([freePort(), freePort()]);
    const child = spawn(
      process.execPath,
      [
        'scripts/dev.mjs',
        '--host',
        '127.0.0.1',
        '--port',
        String(webPort),
        '--strictPort',
      ],
      {
        stdio: 'ignore',
        env: {
          ...process.env,
          SUPABASE_URL: 'https://dev-upstream.example.test',
          SUPABASE_ANON_KEY: 'test-public-key',
          PORT: String(apiPort),
        },
      },
    );
    const exited = once(child, 'exit');
    const health = `http://127.0.0.1:${apiPort}/api/v1/health`;
    const web = `http://127.0.0.1:${webPort}/`;
    try {
      await expect
        .poll(
          async () => {
            try {
              return [(await fetch(health)).status, (await fetch(web)).status];
            } catch {
              return [];
            }
          },
          { timeout: 15000 },
        )
        .toEqual([200, 200]);
      child.kill('SIGTERM');
      await exited;
      await expect
        .poll(
          async () => {
            const responses = await Promise.allSettled([
              fetch(health),
              fetch(web),
            ]);
            return responses.every(
              (response) => response.status === 'rejected',
            );
          },
          { timeout: 5000 },
        )
        .toBe(true);
    } finally {
      if (child.exitCode === null && child.signalCode === null)
        child.kill('SIGTERM');
    }
  },
  20000,
);
