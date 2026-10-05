import type { ApiError } from '../../../contracts/api';

function apiBase(value: string | undefined): string {
  const invalid =
    'VITE_API_BASE_URL must be a relative path or HTTPS URL ending in /api/v1';
  const configured = value?.trim() || '/api/v1';
  if (configured.includes('?') || configured.includes('#'))
    throw new Error(invalid);
  if (configured.startsWith('https://')) {
    try {
      const url = new URL(configured);
      if (
        url.protocol !== 'https:' ||
        !url.pathname.replace(/\/$/, '').endsWith('/api/v1') ||
        url.username ||
        url.password
      ) {
        throw new Error(invalid);
      }
      return url.toString().replace(/\/$/, '');
    } catch {
      throw new Error(invalid);
    }
  }
  if (
    !configured.startsWith('/') ||
    configured.startsWith('//') ||
    !configured.replace(/\/$/, '').endsWith('/api/v1')
  ) {
    throw new Error(invalid);
  }
  return configured.replace(/\/$/, '');
}

export const API_BASE = apiBase(import.meta.env.VITE_API_BASE_URL);

export async function request(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(API_BASE + (path.startsWith('/') ? path : '/' + path), init);
}

export async function responseError(
  response: Response,
  withBody = false,
): Promise<ApiError> {
  const error = new Error('HTTP ' + response.status) as ApiError;
  error.status = response.status;
  if (withBody) {
    try {
      error.body = await response.text();
    } catch {
      // The status remains useful when an error body cannot be read.
    }
  }
  return error;
}

export async function json<T>(response: Response): Promise<T | null> {
  const body = await response.text();
  return body ? (JSON.parse(body) as T) : null;
}

export function jsonInit(body: unknown, headers?: HeadersInit): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(new Headers(headers)),
    },
    body: JSON.stringify(body),
  };
}
