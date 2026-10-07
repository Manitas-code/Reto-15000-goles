import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { it, expect } from 'vitest';

it('serves two clients through Fastify and the offline upstream, with correlated logs', async () => {
  const child = spawn(process.execPath, ['scripts/offline.mjs'], {
    env: { ...process.env, SOURCE: 'dev', PORT: '0', HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  let stdout = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.resume();
  try {
    let origin = '';
    await expect
      .poll(
        () => {
          for (const line of stdout.split('\n')) {
            try {
              const event = JSON.parse(line);
              if (event.event === 'offline.ready') origin = event.origin;
            } catch {
              /* startup messages are not all JSON */
            }
          }
          return origin;
        },
        { timeout: 15000 },
      )
      .not.toBe('');
    const post = (operation: string, body: object) =>
      fetch(origin + '/api/v1/reto/rpc/' + operation, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'never-log-this-token',
        },
        body: JSON.stringify(body),
      });
    const room = await post('duel_room_create', {
      pid: 'host',
      n: 'Private Name',
    });
    expect(room.status).toBe(200);
    expect(room.headers.get('x-request-id')).toBeTruthy();
    const { id, code } = await room.json();
    const joined = await post('duel_room_join', {
      c: code,
      pid: 'guest',
      n: 'Other Name',
    });
    expect(joined.status).toBe(200);
    expect(await joined.json()).toMatchObject({ id });
    const state = await post('duel_state', { d: id, pid: 'host' });
    expect(await state.json()).toMatchObject({
      status: 'playing',
      rival: { name: 'Other Name' },
    });
    const ranking = await fetch(
      origin + '/api/v1/rankings/reto?tab=all&includeVisibility=false',
    );
    expect(ranking.status).toBe(200);
    await expect.poll(() => stdout.includes('request completed')).toBe(true);
    expect(stdout).toContain('reqId');
    expect(stdout).not.toContain('never-log-this-token');
    expect(stdout).not.toContain('Private Name');
    expect(stdout).not.toContain('includeVisibility');
  } finally {
    child.kill('SIGTERM');
    await exited;
  }
}, 20000);
