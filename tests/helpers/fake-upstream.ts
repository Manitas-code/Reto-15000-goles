import type { Page, Route } from '@playwright/test';
import { FakeGoaldayApi } from './fake-api';

/** The offline server reuses the observed Supabase contracts, without opening an upstream socket. */
export async function createFakeUpstream() {
  const api = new FakeGoaldayApi();
  let dispatch: (route: Route) => Promise<void>;
  await api.attachOriginal({
    route: async (_pattern: unknown, handler: typeof dispatch) => {
      dispatch = handler;
    },
  } as unknown as Page);
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (new URL(url).origin !== 'https://offline.example.test')
      throw new Error('Unexpected offline upstream origin');
    let response: Response | undefined;
    await dispatch({
      request: () => ({
        url: () => url,
        method: () => init?.method ?? 'GET',
        postDataJSON: () => JSON.parse(String(init?.body)),
      }),
      fulfill: async (options: {
        status?: number;
        body?: string;
        contentType?: string;
        headers?: Record<string, string>;
      }) => {
        const status = options.status ?? 200;
        const headers = new Headers(options.headers);
        if (options.contentType)
          headers.set('content-type', options.contentType);
        response = new Response(
          [204, 205, 304].includes(status) ? null : (options.body ?? ''),
          { status, headers },
        );
      },
    } as unknown as Route);
    if (!response)
      throw new Error('Offline upstream did not produce a response');
    return response;
  };
  return { api, fetchImpl };
}
