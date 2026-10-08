import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IDENTITY_KEY,
  readIdentity,
  saveIdentity,
} from '../../src/shared/identity/store';
import { readJson, writeJson } from '../../src/shared/storage/json';
import { saveGoals } from '../../src/tools/goal-editor/persistence';

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

  it('edita un vídeo sin borrar extensiones ni filas existentes del editor', () => {
    const storage = memoryStorage({
      gd_editor_v1: JSON.stringify({
        0: { yt: 'old-video', future: { keep: true } },
        9: { futureRow: 42 },
        futureRoot: { keep: true },
      }),
      anotherGame: 'unchanged',
    });
    vi.stubGlobal('localStorage', storage);
    saveGoals([
      {
        yt: 'new-video',
        desde: 5,
        corte: 6,
        hasta: 7,
        name: 'Goal',
        flag: '',
        h: [],
        mt: '',
        tx: '',
      },
    ]);
    expect(readJson('gd_editor_v1', {})).toEqual({
      0: {
        yt: 'new-video',
        desde: 5,
        corte: 6,
        hasta: 7,
        future: { keep: true },
      },
      9: { futureRow: 42 },
      futureRoot: { keep: true },
    });
    expect(storage.getItem('anotherGame')).toBe('unchanged');
  });
});
