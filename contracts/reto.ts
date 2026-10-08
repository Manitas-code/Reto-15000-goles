/** Frontend-consumed Reto 15K RPC inputs. These are not a Supabase schema. */
export type Slot = [string, number];

export interface RetoRpcArgs {
  seed_daily: { d: string; sc: number[]; at: string[] };
  duel_cancel: { d: string; pid: string };
  duel_progress: { d: string; pid: string; n: number };
  duel_queue: { pid: string; n: string };
  duel_bot: { d: string; pid: string };
  duel_state: { d: string; pid: string };
  duel_bot_submit: { d: string; pid: string; sc: number; sl: Slot[] };
  duel_submit: { d: string; pid: string; sc: number; sl: Slot[] };
  duel_rematch: { d: string; pid: string };
  duel_room_create: { pid: string; n: string };
  duel_room_peek: { c: string };
  duel_room_join: { c: string; pid: string; n: string };
  link_get: { c: string; pid: string };
  link_start: { c: string; pid: string; n: string };
  link_create: { code: string; pid: string; n: string; sc: number; sl: Slot[] };
  link_finish: { c: string; pid: string; sc: number; sl: Slot[] };
  link_mine: { pid: string };
  duel_top: Record<string, never>;
  duel_me: { pid: string };
  season_info: { pid: string };
  season_tick: Record<string, never>;
  bots_tick: Record<string, never>;
}

export type RetoRpcName = keyof RetoRpcArgs;
export type RetoRpcCall = {
  [K in RetoRpcName]: Record<string, never> extends RetoRpcArgs[K]
    ? [name: K, args?: RetoRpcArgs[K]]
    : [name: K, args: RetoRpcArgs[K]];
}[RetoRpcName];

/**
 * Shapes consumed by the Reto 15K client. These document the frontend's usage;
 * they are not a separately verified Supabase schema.
 */
export type QueueResponse = string;

export interface OnlineRival {
  name: string;
  elo: number;
  pos?: number;
  bot?: boolean;
  prog?: number;
  score?: number;
  slots?: Array<[string, number]>;
  done?: boolean;
}

export interface RematchState {
  mine?: boolean;
  status?: string;
}

/** Response used by both duel_state and duel_submit. */
export interface OnlineState {
  status: 'waiting' | 'ready' | 'playing' | 'done' | 'cancelled';
  creator?: string;
  rival?: OnlineRival;
  seed?: string;
  private?: boolean;
  started_at?: string;
  now?: string;
  rematch?: RematchState | null;
  result?: 'win' | 'loss' | 'draw' | string;
  forfeit?: boolean;
  my_score?: number | null;
  score?: number;
  slots?: Array<[string, number]>;
  my_elo?: number;
  my_pos?: number;
  my_delta?: number;
  my_bonus?: number;
  my_games?: number;
  plays?: Array<[string, number]>;
}

export interface RoomCreateResponse {
  id: string;
  code: string;
}

export interface RoomPeekResponse {
  ok: boolean;
  host?: string;
}

export interface RoomJoinResponse {
  id: string;
  host: string;
  error?: string;
}

export interface RematchResponse {
  id: string;
  joined: boolean;
  error?: string;
}

export interface LinkPlay {
  name: string;
  score: number | null;
}

export interface LinkData {
  creator_name: string;
  creator_score: number;
  mine?: boolean;
  started?: boolean;
  my_score?: number | null;
  plays?: LinkPlay[];
}

export interface LinkCompareData {
  creator_name: string;
  creator_score: number;
  creator_slots: Array<[string, number]>;
}

export interface DuelMeResponse {
  wins: number;
  losses: number;
  draws: number;
  elo: number;
  pos: number | null;
}

export interface DuelTopEntry {
  name: string;
  elo: number;
}

export interface SeasonMedal {
  season: number;
  name: string;
  pos: number;
  elo: number;
  wins: number;
  losses: number;
  draws?: number;
}

export interface SeasonChampion {
  name: string;
  elo: number;
  pos: number;
}

export interface SeasonRecord {
  num: number;
  name: string;
  podium?: SeasonChampion[];
}

export interface SeasonInfoResponse {
  current?: SeasonRecord;
  last?: SeasonRecord;
  medals?: SeasonMedal[];
}

export interface LinkMineCreated {
  code: string;
  score: number;
  plays?: LinkPlay[];
}

export interface LinkMineAnswered {
  rival: string;
  score: number | null;
  rival_score: number;
}

export interface DuelLinkMine {
  created?: LinkMineCreated[];
  answered?: LinkMineAnswered[];
}

/** link_start is consumed as a success/failure boolean by the client. */
export type LinkStartResponse = boolean;
