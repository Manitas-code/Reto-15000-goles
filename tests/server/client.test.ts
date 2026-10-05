import { afterEach, expect, it, vi } from 'vitest';
import { buildApp } from '../../server/app';
import {
  getEmojiRanking,
  postBlackjackScore,
  postEmojiScore,
  postMasOMenosScore,
  registerIdentity,
  retoRpc,
} from '../../src/shared/api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('preserves response semantics through the browser client and local API together', async () => {
  let status = 204;
  let body: string | null = null;
  const app = await buildApp({
    config: {
      supabaseUrl: 'https://database.example.test',
      supabaseAnonKey: 'test-key',
      timeoutMs: 1000,
      webOrigins: [],
      serveWeb: false,
      webBasePath: '/',
    },
    fetchImpl: async () =>
      new Response(body, {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  });
  // Exercise the real browser transport, route validation and upstream adapter without a socket or remote request.
  vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
    const headers = Object.fromEntries(new Headers(options?.headers));
    const response = await app.inject({
      url,
      method: options?.method === 'POST' ? 'POST' : 'GET',
      headers,
      ...(options?.body ? { payload: String(options.body) } : {}),
    });
    return new Response(response.statusCode === 204 ? null : response.body, {
      status: response.statusCode,
      headers: response.headers as Record<string, string>,
    });
  });
  try {
    expect(await retoRpc('duel_top')).toBeNull();
    await registerIdentity('player', 'Jugador');
    status = 200;
    body = 'null';
    expect(await retoRpc('duel_top')).toBeNull();
    body = '{"status":"ready","unknown_future_field":42}';
    expect(await retoRpc('duel_state', { d: 'duel', pid: 'player' })).toEqual({
      status: 'ready',
      unknown_future_field: 42,
    });
    body = '[{"name":"Jugador","score":21000}]';
    expect(await getEmojiRanking({ period: 'day', day: '2026-10-05' })).toEqual(
      [{ name: 'Jugador', score: 21000 }],
    );
    status = 409;
    body = 'unique conflict';
    await postMasOMenosScore({
      player_id: 'player',
      name: 'Jugador',
      mode: 'diario',
      day: '2026-10-05',
      streak: 4,
    });
    await postBlackjackScore({
      player_id: 'player',
      name: 'Jugador',
      mode: 'carrera',
      chips: 1200,
    });
    await expect(
      postEmojiScore({
        player_id: 'player',
        name: 'Jugador',
        day: '2026-10-05',
        score: 600,
      }),
    ).rejects.toMatchObject({ status: 409, body: 'unique conflict' });
    status = 503;
    body = 'upstream unavailable';
    await expect(retoRpc('duel_top')).rejects.toMatchObject({ status: 503 });
    status = 200;
    body = 'invalid JSON';
    await expect(
      getEmojiRanking({ period: 'day', day: '2026-10-05' }),
    ).rejects.toBeInstanceOf(SyntaxError);
  } finally {
    await app.close();
  }
});

it('routes relative and separately hosted API URLs through the same server contracts', async () => {
  const app = await buildApp({
    config: {
      supabaseUrl: 'https://database.example.test',
      supabaseAnonKey: 'test-key',
      timeoutMs: 1000,
      webOrigins: [],
      serveWeb: false,
      webBasePath: '/',
    },
    fetchImpl: async () =>
      new Response('[]', { headers: { 'content-type': 'application/json' } }),
  });
  try {
    for (const base of ['/api/v1', 'https://api.example.test/api/v1']) {
      vi.stubEnv('VITE_API_BASE_URL', base);
      vi.resetModules();
      const urls: string[] = [];
      vi.stubGlobal('fetch', async (url: string) => {
        urls.push(url);
        const response = await app.inject({
          method: 'POST',
          url: new URL(url, 'https://web.example.test/Reto-15000-goles/')
            .pathname,
          headers: { 'content-type': 'application/json' },
          payload: '{}',
        });
        return new Response(response.body, { status: response.statusCode });
      });
      const client = await import('../../src/shared/api/index');
      expect(await client.retoRpc('duel_top')).toEqual([]);
      expect(urls).toEqual([base + '/reto/rpc/duel_top']);
    }
  } finally {
    await app.close();
  }
});
