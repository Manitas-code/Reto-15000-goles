import { readJson, writeJson } from '../storage/json';

export const IDENTITY_KEY = 'reto15k-v2';
export interface Identity extends Record<string, unknown> {
  pid?: string;
  name?: string;
}

export function readIdentity(): Identity {
  return readJson<Identity>(IDENTITY_KEY, {});
}

/** Preserve the Reto 15K progress and any unknown fields. */
export function saveIdentity(pid: string, name: string): void {
  const current = readIdentity();
  current.pid = pid;
  current.name = name;
  writeJson(IDENTITY_KEY, current);
}
