import type { RetoRpcArgs, RetoRpcName } from './reto.js';

export type Day = string;
export type IdentityPayload = { pid: string; n: string };

export type RetoRankingQuery =
  | { tab: 'day'; day: Day; includeVisibility: boolean }
  | { tab: 'all'; includeVisibility: boolean };
export type Category = 'diario' | 'carrera' | 'seleccion';
export type CategoryRankingQuery =
  { tab: 'diario'; day: Day } | { tab: Exclude<Category, 'diario'> };
export type EmojiRankingQuery =
  { period: 'day'; day: Day } | { period: 'week'; weekStart: Day };

export interface ScorePayloads {
  reto: {
    name: string;
    score: number;
    daily: boolean;
    day: Day;
    player_id: string;
  };
  'mas-o-menos': {
    player_id: string;
    name: string;
    mode: Category;
    day?: Day;
    streak: number;
  };
  blackjack: {
    player_id: string;
    name: string;
    mode: Category;
    day?: Day;
    chips: number;
  };
  'emoji-player': { player_id: string; name: string; day: Day; score: number };
}

export interface ApiError extends Error {
  status: number;
  body?: string;
}

export type { RetoRpcArgs, RetoRpcName };
