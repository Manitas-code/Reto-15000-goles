import type {
  CategoryRankingQuery,
  EmojiRankingQuery,
  RetoRankingQuery,
  ScorePayloads,
} from '../../../contracts/api';
import { json, jsonInit, request, responseError } from './http';
import type { RetoRpcCall } from '../../../contracts/reto';

export async function retoRpc<T = unknown>(
  ...[name, args = {}]: RetoRpcCall
): Promise<T | null> {
  const response = await request('/reto/rpc/' + name, jsonInit(args));
  if (!response.ok) throw await responseError(response);
  return json<T>(response);
}

async function identity(
  operation: 'register' | 'rename',
  pid: string,
  n: string,
): Promise<void> {
  const response = await request(
    '/identity/' + operation,
    jsonInit({ pid, n }),
  );
  if (!response.ok) throw await responseError(response);
}

export const registerIdentity = (pid: string, n: string) =>
  identity('register', pid, n);
export const renameIdentity = (pid: string, n: string) =>
  identity('rename', pid, n);

async function ranking<T>(
  path: string,
  values: Record<string, string | boolean>,
): Promise<T[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    query.set(key, String(value));
  const response = await request(path + '?' + query.toString());
  if (!response.ok) throw await responseError(response);
  return JSON.parse(await response.text()) as T[];
}

export const getRetoRanking = <T = Record<string, unknown>>(
  query: RetoRankingQuery,
) => ranking<T>('/rankings/reto', query);
export const getMasOMenosRanking = <T = Record<string, unknown>>(
  query: CategoryRankingQuery,
) => ranking<T>('/rankings/mas-o-menos', query);
export const getBlackjackRanking = <T = Record<string, unknown>>(
  query: CategoryRankingQuery,
) => ranking<T>('/rankings/blackjack', query);
export const getEmojiRanking = <T = Record<string, unknown>>(
  query: EmojiRankingQuery,
) => ranking<T>('/rankings/emoji-player', query);

async function postScore<K extends keyof ScorePayloads>(
  game: K,
  payload: ScorePayloads[K],
  prefer: string,
  conflictIsSuccess = false,
): Promise<void> {
  const response = await request(
    '/scores/' + game,
    jsonInit(payload, { Prefer: prefer }),
  );
  if (conflictIsSuccess && response.status === 409) return;
  if (!response.ok) throw await responseError(response, true);
}

export const postRetoScore = (payload: ScorePayloads['reto']) =>
  postScore('reto', payload, 'return=minimal');
export const postMasOMenosScore = (payload: ScorePayloads['mas-o-menos']) =>
  postScore('mas-o-menos', payload, 'return=minimal', true);
export const postBlackjackScore = (payload: ScorePayloads['blackjack']) =>
  postScore('blackjack', payload, 'return=minimal', true);
export const postEmojiScore = (payload: ScorePayloads['emoji-player']) =>
  postScore(
    'emoji-player',
    payload,
    'return=minimal,resolution=merge-duplicates',
  );
