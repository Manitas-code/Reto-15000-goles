import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../server/app.js';
import type { ServerConfig } from '../../server/config.js';

const config: ServerConfig = {
  supabaseUrl: 'https://db.example.test',
  supabaseAnonKey: 'public-test-key',
  timeoutMs: 100,
  webOrigins: [],
  serveWeb: false,
  webBasePath: '/',
};
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

async function appWith(
  fetchImpl: typeof fetch = vi.fn<typeof fetch>(
    async () =>
      new Response('[]', {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }),
  ),
) {
  const app = await buildApp({ config, fetchImpl });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('server API adapter', () => {
  it('restricts RPC names and argument fields, and preserves empty success', async () => {
    const upstream = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 204 }),
    );
    const app = await appWith(upstream);
    const rpc: Array<[string, object]> = [
      ['seed_daily', { d: 'd', sc: [1], at: ['a'] }],
      ['duel_cancel', { d: 'd', pid: 'p' }],
      ['duel_progress', { d: 'd', pid: 'p', n: 1 }],
      ['duel_queue', { pid: 'p', n: 'N' }],
      ['duel_bot', { d: 'd', pid: 'p' }],
      ['duel_state', { d: 'd', pid: 'p' }],
      ['duel_bot_submit', { d: 'd', pid: 'p', sc: 1, sl: [['a', 1]] }],
      ['duel_submit', { d: 'd', pid: 'p', sc: 1, sl: [['a', 1]] }],
      ['duel_rematch', { d: 'd', pid: 'p' }],
      ['duel_room_create', { pid: 'p', n: 'N' }],
      ['duel_room_peek', { c: 'c' }],
      ['duel_room_join', { c: 'c', pid: 'p', n: 'N' }],
      ['link_get', { c: 'c', pid: 'p' }],
      ['link_start', { c: 'c', pid: 'p', n: 'N' }],
      ['link_create', { code: 'c', pid: 'p', n: 'N', sc: 1, sl: [['a', 1]] }],
      ['link_finish', { c: 'c', pid: 'p', sc: 1, sl: [['a', 1]] }],
      ['link_mine', { pid: 'p' }],
      ['duel_top', {}],
      ['duel_me', { pid: 'p' }],
      ['season_info', { pid: 'p' }],
      ['season_tick', {}],
      ['bots_tick', {}],
    ];
    for (const [name, payload] of rpc) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/reto/rpc/${name}`,
        payload,
      });
      expect(response.statusCode, name).toBe(204);
      expect(response.body, name).toBe('');
    }
    expect(upstream).toHaveBeenCalledTimes(rpc.length);
    expect(upstream.mock.calls.map(([url]) => String(url))).toEqual(
      rpc.map(([name]) => `https://db.example.test/rest/v1/rpc/${name}`),
    );
    for (let index = 0; index < rpc.length; index++) {
      const options = upstream.mock.calls[index]![1]!;
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(rpc[index]![1]));
      const headers = new Headers(options.headers);
      expect(headers.get('apikey')).toBe('public-test-key');
      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.has('authorization')).toBe(false);
      expect(headers.has('cookie')).toBe(false);
    }

    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/reto/rpc/nope',
          payload: {},
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/reto/rpc/duel_queue',
          payload: { pid: 'p', n: 'N', x: 1 },
        })
      ).statusCode,
    ).toBe(400);
    expect(upstream).toHaveBeenCalledTimes(rpc.length);
  });

  it('maps identity, score and ranking routes to fixed upstream requests', async () => {
    const upstream = vi.fn<typeof fetch>(
      async () =>
        new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const app = await appWith(upstream);
    const body = {
      player_id: 'pid',
      name: 'N',
      mode: 'diario',
      day: '2026-10-05',
      streak: 5,
    };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/scores/mas-o-menos',
          payload: body,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/identity/register',
          payload: { pid: 'pid', n: 'N' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/rankings/reto?tab=day&day=2026-10-05&includeVisibility=true',
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/rankings/mas-o-menos?tab=seleccion',
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/rankings/blackjack?tab=diario&day=2026-10-05',
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/rankings/emoji-player?period=week&weekStart=2026-10-05',
        })
      ).statusCode,
    ).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(6);

    const scoreRequests: Array<[string, object]> = [
      [
        '/api/v1/scores/reto',
        {
          name: 'N',
          score: 12,
          daily: true,
          day: '2026-10-05',
          player_id: 'pid',
        },
      ],
      [
        '/api/v1/scores/blackjack',
        { player_id: 'pid', name: 'N', mode: 'carrera', chips: 20 },
      ],
      [
        '/api/v1/scores/emoji-player',
        { player_id: 'pid', name: 'N', day: '2026-10-05', score: 4 },
      ],
    ];
    for (const [url, payload] of scoreRequests)
      expect(
        (await app.inject({ method: 'POST', url, payload })).statusCode,
      ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/identity/rename',
          payload: { pid: 'pid', n: 'N' },
        })
      ).statusCode,
    ).toBe(200);
    const extraRankings = [
      '/api/v1/rankings/reto?tab=day&day=2026-10-05&includeVisibility=false',
      '/api/v1/rankings/reto?tab=all&includeVisibility=true',
      '/api/v1/rankings/reto?tab=all&includeVisibility=false',
      '/api/v1/rankings/mas-o-menos?tab=diario&day=2026-10-05',
      '/api/v1/rankings/mas-o-menos?tab=carrera',
      '/api/v1/rankings/blackjack?tab=carrera',
      '/api/v1/rankings/blackjack?tab=seleccion',
      '/api/v1/rankings/emoji-player?period=day&day=2026-10-05',
    ];
    for (const url of extraRankings)
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(18);

    const calls = upstream.mock.calls.map(([url, init]) => ({
      url: String(url),
      init: init as RequestInit,
    }));
    expect(calls[0]!.url).toBe('https://db.example.test/rest/v1/hl_scores');
    expect(new Headers(calls[0]!.init.headers).get('Prefer')).toBe(
      'return=minimal',
    );
    expect(calls[0]!.init.body).toBe(JSON.stringify(body));
    expect(calls[1]!.url).toBe(
      'https://db.example.test/rest/v1/rpc/register_name',
    );
    expect(calls[2]!.url).toContain('/rest/v1/scores?');
    const retoQuery = new URL(calls[2]!.url).searchParams;
    expect(retoQuery.get('select')).toBe('name,score,day,show_at');
    expect(retoQuery.get('limit')).toBe('1000');
    expect(new URL(calls[3]!.url).searchParams.get('mode')).toBe(
      'eq.seleccion',
    );
    expect(new URL(calls[4]!.url).searchParams.get('order')).toBe('chips.desc');
    expect(new URL(calls[5]!.url).searchParams.get('day')).toBe(
      'gte.2026-10-05',
    );
    expect(calls.slice(6, 9).map(({ url }) => url)).toEqual([
      'https://db.example.test/rest/v1/scores',
      'https://db.example.test/rest/v1/bj10_scores',
      'https://db.example.test/rest/v1/emoji_scores',
    ]);
    expect(new Headers(calls[8]!.init.headers).get('Prefer')).toBe(
      'return=minimal,resolution=merge-duplicates',
    );
    expect(calls[9]!.url).toBe(
      'https://db.example.test/rest/v1/rpc/rename_player',
    );

    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/rankings/reto?tab=all&includeVisibility=true&limit=1',
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/rankings/reto?tab=day&day=bad&includeVisibility=false',
        })
      ).statusCode,
    ).toBe(400);
    expect(upstream).toHaveBeenCalledTimes(18);
  });

  it('keeps upstream conflict status and raw error text', async () => {
    const app = await appWith(
      vi.fn<typeof fetch>(
        async () =>
          new Response('unique conflict', {
            status: 409,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          }),
      ),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/scores/blackjack',
      payload: { player_id: 'pid', name: 'N', mode: 'carrera', chips: 20 },
    });
    expect(response.statusCode).toBe(409);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toBe('unique conflict');
  });

  it('rejects unsupported bodies and incompatible ranking parameters before upstream access', async () => {
    const upstream = vi.fn<typeof fetch>();
    const app = await appWith(upstream);
    for (const contentType of [
      'text/plain',
      'application/x-www-form-urlencoded',
    ]) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/identity/register',
            headers: { 'content-type': contentType },
            payload: '{}',
          })
        ).statusCode,
      ).toBe(415);
    }
    for (const query of [
      '/rankings/reto?tab=all&includeVisibility=true&day=',
      '/rankings/blackjack?tab=carrera&day=',
      '/rankings/mas-o-menos?tab=seleccion&day=',
      '/rankings/reto?tab=day&includeVisibility=true&day=2026-02-30',
      '/rankings/emoji-player?period=week&weekStart=2026-10-05&day=2026-10-05',
    ])
      expect((await app.inject('/api/v1' + query)).statusCode).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('maps upstream timeout and connection failure without exposing details', async () => {
    const timeoutFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('network details')),
        );
      });
    const app = await appWith(timeoutFetch);
    const timed = await app.inject({
      method: 'POST',
      url: '/api/v1/reto/rpc/duel_top',
      payload: {},
    });
    expect(timed.statusCode).toBe(504);
    expect(timed.body).not.toContain('network details');
    await app.close();
    apps.pop();

    const failed = await appWith(
      vi.fn<typeof fetch>(async () => {
        throw new Error('secret network details');
      }),
    );
    const unavailable = await failed.inject({
      method: 'POST',
      url: '/api/v1/identity/rename',
      payload: { pid: 'p', n: 'Name' },
    });
    expect(unavailable.statusCode).toBe(502);
    expect(unavailable.body).not.toContain('secret network details');
  });
});
