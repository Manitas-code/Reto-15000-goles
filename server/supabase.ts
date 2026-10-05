import type { ServerConfig } from './config.js';

export interface UpstreamResult {
  status: number;
  contentType: string | null;
  body: Uint8Array;
}

export function createSupabaseTransport(
  config: ServerConfig,
  fetchImpl: typeof fetch,
) {
  return async (
    path: string,
    body?: unknown,
    prefer?: string,
  ): Promise<UpstreamResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const headers = new Headers({ apikey: config.supabaseAnonKey });
      headers.set('Content-Type', 'application/json');
      if (prefer) headers.set('Prefer', prefer);
      const response = await fetchImpl(config.supabaseUrl + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      return {
        status: response.status,
        contentType: response.headers.get('content-type'),
        body: new Uint8Array(await response.arrayBuffer()),
      };
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error('upstream timeout', { cause: error });
      throw new Error('upstream connection failed', { cause: error });
    } finally {
      clearTimeout(timer);
    }
  };
}
