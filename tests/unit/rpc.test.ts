import { afterEach, describe, expect, it, vi } from 'vitest';
import { SB_H, SB_URL } from '../../src/shared/supabase/config';
import { rpcJson, rpcVoid } from '../../src/shared/supabase/rpc';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status });
}

describe('Supabase RPC helpers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the original URL, headers and JSON body; rpcVoid ignores its response body', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('not JSON'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      rpcVoid('register_name', { pid: 'p-1', n: 'Ada' }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${SB_URL}/rest/v1/rpc/register_name`,
    );
    expect(fetchMock.mock.calls[0][1]).toEqual({
      method: 'POST',
      headers: SB_H,
      body: JSON.stringify({ pid: 'p-1', n: 'Ada' }),
    });
  });

  it('defaults omitted args to an empty object and maps an empty body to null', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(''))
      .mockResolvedValueOnce(jsonResponse({ accepted: true }));
    vi.stubGlobal('fetch', fetchMock);

    const empty = await rpcJson('duel_start');
    const typed = await rpcJson<{ accepted: boolean }>('duel_status', {
      room: 'abc',
    });

    expect(empty).toBeNull();
    expect(typed).toEqual({ accepted: true });
    expect(fetchMock.mock.calls.map(([, init]) => init?.body)).toEqual([
      JSON.stringify({}),
      JSON.stringify({ room: 'abc' }),
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.headers)).toEqual([
      SB_H,
      SB_H,
    ]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${SB_URL}/rest/v1/rpc/duel_start`,
      `${SB_URL}/rest/v1/rpc/duel_status`,
    ]);
  });

  it('preserves HTTP status and message for server errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('', { status: 409 })),
    );

    await expect(rpcVoid('register_name', {})).rejects.toMatchObject({
      status: 409,
      message: 'HTTP 409',
    });
  });

  it('preserves network errors unchanged', async () => {
    const networkError = new TypeError('offline');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(networkError),
    );

    await expect(rpcJson('duel_start')).rejects.toBe(networkError);
  });
});
