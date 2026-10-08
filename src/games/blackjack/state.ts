import type { Position } from '../../data/player-types';

export interface BlackjackPlayer {
  name: string;
  flag: string;
  pos: Position;
  carrera: number | null;
  seleccion: number | null;
}
export interface Mode {
  k: 'carrera' | 'seleccion';
  n: string;
  t: string;
  lo: number;
  hi: number;
  step: number;
  sf: number;
}
export interface Stats extends Record<string, unknown> {
  best: Record<string, number>;
  sent: Record<string, number>;
  games: number;
  hands: number;
  bestDaily?: number;
}
export interface DailyResult {
  start?: number;
  done?: number;
  chips?: number;
  sent?: number;
}
export interface HandSource {
  pair: BlackjackPlayer[];
  p: () => BlackjackPlayer;
  d: () => BlackjackPlayer;
}
export interface ScoreRow {
  mode: string;
  chips: number;
  day?: string;
}
export interface RemoteError extends Error {
  status: number;
  body?: string;
}
export interface SyncResult {
  done: Record<string, number>;
  errs: Record<string, unknown>;
}
