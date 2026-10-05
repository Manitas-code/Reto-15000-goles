import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootFaces } from '../../src/shared/browser/faces';

const FACE_CACHE_KEY = 'gd_faces_v2';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    values,
  };
}

function setup(initial: Record<string, string> = {}) {
  const storage = memoryStorage(initial);
  const browser = {} as unknown as Window;
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', browser);
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return { browser, fetchMock, storage };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status });
}

describe('shared player faces', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses cached faces without making a request', async () => {
    const { browser, fetchMock } = setup({
      [FACE_CACHE_KEY]: JSON.stringify({
        Messi: '/messi.jpg',
        'Cached player': '',
      }),
    });
    bootFaces();

    await expect(browser.GD_faces(['Messi', 'Cached player'])).resolves.toEqual(
      {
        Messi: '/messi.jpg',
        'Cached player': '',
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves title aliases and falls back to search when a title has no thumbnail', async () => {
    const { browser, fetchMock } = setup();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          query: {
            normalized: [{ from: 'Alias', to: 'Normalized Alias' }],
            redirects: [{ from: 'Messi', to: 'Lionel Messi' }],
            pages: {
              'Lionel Messi': {
                title: 'Lionel Messi',
                thumbnail: { source: '/messi.jpg' },
              },
              'Normalized Alias': {
                title: 'Normalized Alias',
                thumbnail: { source: '/alias.jpg' },
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          query: {
            pages: {
              'Found by search': {
                title: 'Found by search',
                thumbnail: { source: '/fallback.jpg' },
              },
            },
          },
        }),
      );
    bootFaces();

    await expect(
      browser.GD_faces(['Messi', 'Alias', 'Fallback']),
    ).resolves.toEqual({
      Messi: '/messi.jpg',
      Alias: '/alias.jpg',
      Fallback: '/fallback.jpg',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '&titles=Messi%7CAlias',
    );
    expect(String(fetchMock.mock.calls[1][0])).toContain('generator=search');
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      'Fallback%20futbolista',
    );
  });

  it('does not cache failed title lookups, so a later call retries', async () => {
    const { browser, fetchMock, storage } = setup();
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        jsonResponse({
          query: {
            pages: {
              Retry: { title: 'Retry', thumbnail: { source: '/retry.jpg' } },
            },
          },
        }),
      );
    bootFaces();

    await expect(browser.GD_faces(['Retry'])).resolves.toEqual({ Retry: '' });
    expect(
      JSON.parse(storage.values.get(FACE_CACHE_KEY) || '{}'),
    ).not.toHaveProperty('Retry');
    await expect(browser.GD_faces(['Retry'])).resolves.toEqual({
      Retry: '/retry.jpg',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears cached faces through the published reset function', async () => {
    const { browser, fetchMock, storage } = setup({
      [FACE_CACHE_KEY]: JSON.stringify({ Messi: '/old.jpg' }),
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        query: {
          pages: {
            Messi: { title: 'Messi', thumbnail: { source: '/new.jpg' } },
          },
        },
      }),
    );
    bootFaces();

    browser.GD_faces_reset();
    expect(storage.values.get(FACE_CACHE_KEY)).toBe('{}');
    await expect(browser.GD_faces(['Messi'])).resolves.toEqual({
      Messi: '/new.jpg',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
