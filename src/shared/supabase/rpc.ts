import { SB_H, SB_URL } from './config';

export interface RpcError extends Error {
  status: number;
}

async function requestRpc(name: string, args: unknown): Promise<Response> {
  const response = await fetch(SB_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: SB_H,
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    const error = new Error('HTTP ' + response.status) as RpcError;
    error.status = response.status;
    throw error;
  }
  return response;
}

/** Registration/rename RPCs historically ignore response bodies. */
export async function rpcVoid(name: string, args: unknown): Promise<void> {
  await requestRpc(name, args);
}

/** Duel RPCs historically accept an empty body and default arguments to {}. */
export async function rpcJson<T = unknown>(
  name: string,
  args?: unknown,
): Promise<T | null> {
  const response = await requestRpc(name, args || {});
  const body = await response.text();
  return body ? (JSON.parse(body) as T) : null;
}
