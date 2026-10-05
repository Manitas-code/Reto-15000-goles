// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { mountPage } from '../../src/app/mount';
import Reto from '../../src/games/reto-15000/App';
import Emoji from '../../src/games/emoji-player/App';
import MoreLess from '../../src/games/mas-o-menos/App';
import Blackjack from '../../src/games/blackjack/App';

let dispose: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem('fg_team', 'none');
  localStorage.setItem('fg_lang', 'es');
  document.body.innerHTML = '<div id="root"></div>';
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});
afterEach(async () => {
  if (dispose) await act(async () => dispose?.());
  dispose = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

for (const [name, App] of [
  ['Reto', Reto],
  ['Emoji', Emoji],
  ['Más o Menos', MoreLess],
  ['Blackjack', Blackjack],
] as const) {
  test(`${name}: StrictMode cancela recursos y respuestas tardías al desmontar la página`, async () => {
    const pending: Array<(response: Response) => void> = [];
    const fetch = vi.fn((url: string) =>
      url.includes('/rankings/')
        ? new Promise<Response>((resolve) => pending.push(resolve))
        : Promise.resolve(
            new Response(url.includes('/season_info') ? '{}' : 'null', {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
    );
    vi.stubGlobal('fetch', fetch);
    await act(async () => {
      dispose = mountPage(<App />, { teamPicker: name === 'Reto' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(pending.length).toBe(1);
    const start =
      name === 'Reto'
        ? '#tab-libre'
        : name === 'Emoji'
          ? '#btnStart'
          : name === 'Más o Menos'
            ? '[data-cat]'
            : '[data-m]';
    await act(async () => {
      document.querySelector<HTMLButtonElement>(start)!.click();
    });
    if (
      name === 'Emoji' &&
      document.querySelector<HTMLButtonElement>('#nmSkip0')
    )
      await act(async () => {
        document.querySelector<HTMLButtonElement>('#nmSkip0')!.click();
      });
    if (name === 'Blackjack')
      await act(async () => {
        document.querySelector<HTMLButtonElement>('#bDeal')!.click();
      });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    const calls = fetch.mock.calls.length;
    const before = { ...localStorage };
    await act(async () => {
      dispose?.();
      dispose = undefined;
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(window.FG_LANG).toBeUndefined();
    expect(window.FG_STADIUM).toBeUndefined();
    await act(async () => {
      for (const resolve of pending)
        resolve(
          new Response('[]', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(fetch.mock.calls.length).toBe(calls);
    expect({ ...localStorage }).toEqual(before);
    expect(document.getElementById('root')!.childElementCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
}

for (const [name, App, key, best] of [
  [
    'Más o Menos',
    MoreLess,
    'gd_mm_stats',
    { bestByCat: { carrera: 7, seleccion: 4 } },
  ],
  [
    'Blackjack',
    Blackjack,
    'gd_bj10_stats',
    { best: { carrera: 1200, seleccion: 1500 } },
  ],
] as const) {
  test(`${name}: una subida pendiente no continúa ni escribe tras desmontar`, async () => {
    localStorage.setItem(
      'reto15k-v2',
      JSON.stringify({ pid: 'player', name: 'Jugador' }),
    );
    localStorage.setItem(
      key,
      JSON.stringify({ ...best, sent: {}, futureField: 42 }),
    );
    const uploads: Array<(response: Response) => void> = [];
    const fetch = vi.fn((url: string) =>
      url.includes('/scores/')
        ? new Promise<Response>((resolve) => uploads.push(resolve))
        : Promise.resolve(
            new Response('[]', {
              headers: { 'content-type': 'application/json' },
            }),
          ),
    );
    vi.stubGlobal('fetch', fetch);
    await act(async () => {
      dispose = mountPage(<App />);
      await vi.advanceTimersByTimeAsync(1);
    });
    // Effects created by the commit may schedule their delayed bootstrap after act flushes.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(uploads).toHaveLength(1);
    const calls = fetch.mock.calls.length;
    const before = { ...localStorage };
    await act(async () => {
      dispose?.();
      dispose = undefined;
    });
    await act(async () => {
      uploads[0]!(new Response(null, { status: 204 }));
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(fetch.mock.calls.length).toBe(calls);
    expect({ ...localStorage }).toEqual(before);
    expect(vi.getTimerCount()).toBe(0);
  });
}
