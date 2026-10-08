import { readJson, writeJson } from '../../shared/storage/json';
import type { Goal } from './state';
const KEY = 'gd_editor_v1';
export function readGoals(): Goal[] | null {
  if (typeof GOLES === 'undefined') return null;
  const saved = readJson<Record<number, Partial<Goal>>>(KEY, {});
  return GOLES.map((g, i) => ({ ...g, ...saved[i] }));
}
export function saveGoals(goals: Goal[]) {
  const saved = { ...readJson<Record<number, Partial<Goal>>>(KEY, {}) };
  goals.forEach((g, i) => {
    saved[i] = {
      ...saved[i],
      yt: g.yt,
      desde: g.desde,
      corte: g.corte,
      hasta: g.hasta,
    };
  });
  writeJson(KEY, saved);
}
export function goalFileText(goals: Goal[]) {
  const q = (value: unknown) =>
    "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const rows = goals.map((g) => {
    const p = [`yt:${q(g.yt || '')}`];
    if (g.video) p.push(`video:${q(g.video)}`);
    p.push(`desde:${g.desde || 0}`, `corte:${g.corte || 0}`);
    if (g.hasta) p.push(`hasta:${g.hasta}`);
    if (g.tapar) p.push(`tapar:${JSON.stringify(g.tapar)}`);
    if (g.color) p.push('color:true');
    return `{${p.join(',')},\n name:${q(g.name)},flag:${q(g.flag)},\n h:[${g.h.map(q).join(',')}],\n mt:${q(g.mt)},\n tx:${q(g.tx)}}`;
  });
  return `/* GOL DEL DÍA · calendario de goles (generado con editor-goles.html)\n   Para probar un gol concreto antes de su día:  gol-del-dia.html?dia=5 */\nconst INICIO=${q(INICIO)};\n\nconst GOLES=[\n${rows.join(',\n\n')}\n];\n`;
}
export function idFrom(value: string) {
  const s = value.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  return (
    s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/)?.[1] || ''
  );
}
