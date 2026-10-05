import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IDENTITY_KEY,
  readIdentity,
  saveIdentity,
} from '../../src/shared/identity/store';
import { readJson, writeJson } from '../../src/shared/storage/json';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    values,
  };
}

describe('compatibilidad de almacenamiento local', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('usa el fallback ante JSON roto y tolera errores de cuota al guardar', () => {
    const storage = memoryStorage({ broken: '{' });
    vi.stubGlobal('localStorage', storage);
    const fallback = { score: 0 };

    expect(readJson('broken', fallback)).toBe(fallback);
    storage.setItem.mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeJson('full', { score: 1 })).not.toThrow();
  });

  it('actualiza identidad preservando el progreso y los campos desconocidos existentes', () => {
    const storage = memoryStorage({
      [IDENTITY_KEY]: JSON.stringify({
        pid: 'old',
        name: 'Antiguo',
        daily: { done: 1 },
        future: 17,
      }),
    });
    vi.stubGlobal('localStorage', storage);

    saveIdentity('new-id', 'Nuevo');

    expect(readIdentity()).toEqual({
      pid: 'new-id',
      name: 'Nuevo',
      daily: { done: 1 },
      future: 17,
    });
  });
});
