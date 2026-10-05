import cors from '@fastify/cors';
import fastify, { type FastifyReply, type FastifySchema } from 'fastify';
import fastifyStatic from '@fastify/static';
import { resolve } from 'node:path';
import type { RetoRpcName } from '../contracts/reto.js';
import type { ServerConfig } from './config.js';
import { createSupabaseTransport, type UpstreamResult } from './supabase.js';

type Props = Record<string, unknown>;
const str = { type: 'string' };
const num = { type: 'number' };
const bool = { type: 'boolean' };
const slot = {
  type: 'array',
  items: [{ type: 'string' }, { type: 'number' }],
  minItems: 2,
  maxItems: 2,
};
const object = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
): Props => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

const rpcSchemas: Record<RetoRpcName, Props> = {
  seed_daily: object({
    d: str,
    sc: { type: 'array', items: num },
    at: { type: 'array', items: str },
  }),
  duel_cancel: object({ d: str, pid: str }),
  duel_progress: object({ d: str, pid: str, n: num }),
  duel_queue: object({ pid: str, n: str }),
  duel_bot: object({ d: str, pid: str }),
  duel_state: object({ d: str, pid: str }),
  duel_bot_submit: object({
    d: str,
    pid: str,
    sc: num,
    sl: { type: 'array', items: slot },
  }),
  duel_submit: object({
    d: str,
    pid: str,
    sc: num,
    sl: { type: 'array', items: slot },
  }),
  duel_rematch: object({ d: str, pid: str }),
  duel_room_create: object({ pid: str, n: str }),
  duel_room_peek: object({ c: str }),
  duel_room_join: object({ c: str, pid: str, n: str }),
  link_get: object({ c: str, pid: str }),
  link_start: object({ c: str, pid: str, n: str }),
  link_create: object({
    code: str,
    pid: str,
    n: str,
    sc: num,
    sl: { type: 'array', items: slot },
  }),
  link_finish: object({
    c: str,
    pid: str,
    sc: num,
    sl: { type: 'array', items: slot },
  }),
  link_mine: object({ pid: str }),
  duel_top: object({}),
  duel_me: object({ pid: str }),
  season_info: object({ pid: str }),
  season_tick: object({}),
  bots_tick: object({}),
};

const identityBody = object({ pid: str, n: str });
const scoreBodies: Record<string, Props> = {
  reto: object({
    name: str,
    score: num,
    daily: bool,
    day: str,
    player_id: str,
  }),
  'mas-o-menos': object(
    {
      player_id: str,
      name: str,
      mode: { type: 'string', enum: ['diario', 'carrera', 'seleccion'] },
      day: str,
      streak: num,
    },
    ['player_id', 'name', 'mode', 'streak'],
  ),
  blackjack: object(
    {
      player_id: str,
      name: str,
      mode: { type: 'string', enum: ['diario', 'carrera', 'seleccion'] },
      day: str,
      chips: num,
    },
    ['player_id', 'name', 'mode', 'chips'],
  ),
  'emoji-player': object({ player_id: str, name: str, day: str, score: num }),
};

function dateIsValid(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function badRequest(reply: {
  code: (status: number) => { send: (body: unknown) => unknown };
}) {
  return reply.code(400).send({ error: 'Invalid request' });
}

function queryOnly(query: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(query).every((key) => allowed.includes(key));
}

function upstreamReply(reply: FastifyReply, result: UpstreamResult) {
  reply.code(result.status);
  if (result.contentType) reply.header('content-type', result.contentType);
  return reply.send(Buffer.from(result.body));
}

export interface BuildAppOptions {
  config: ServerConfig;
  fetchImpl?: typeof fetch;
}

export async function buildApp({ config, fetchImpl = fetch }: BuildAppOptions) {
  const app = fastify({
    bodyLimit: 64 * 1024,
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: false,
        coerceTypes: false,
      },
    },
  });
  const supabase = createSupabaseTransport(config, fetchImpl);

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'POST' && request.url.startsWith('/api/v1/')) {
      const mediaType = request.headers['content-type']
        ?.split(';')[0]
        ?.trim()
        .toLowerCase();
      if (mediaType !== 'application/json')
        return reply.code(415).send({ error: 'Unsupported media type' });
    }
  });

  if (config.webOrigins.length) {
    await app.register(cors, {
      origin: config.webOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    const failure = error as Error & {
      validation?: unknown;
      statusCode?: number;
    };
    if (failure.validation)
      return reply.code(400).send({ error: 'Invalid request' });
    const status =
      failure.statusCode === 413
        ? 413
        : failure.statusCode === 415
          ? 415
          : failure.statusCode === 400
            ? 400
            : 500;
    return reply.code(status).send({
      error:
        status === 413
          ? 'Request too large'
          : status === 415
            ? 'Unsupported media type'
            : status === 400
              ? 'Invalid request'
              : 'Internal server error',
    });
  });

  const forward = async (
    reply: FastifyReply,
    path: string,
    body?: unknown,
    prefer?: string,
  ) => {
    try {
      return upstreamReply(reply, await supabase(path, body, prefer));
    } catch (error) {
      const timeout =
        error instanceof Error && error.message === 'upstream timeout';
      return reply
        .code(timeout ? 504 : 502)
        .send({ error: timeout ? 'Upstream timeout' : 'Upstream unavailable' });
    }
  };

  app.get('/api/v1/health', async () => ({ status: 'ok' }));

  for (const name of Object.keys(rpcSchemas) as RetoRpcName[]) {
    app.post<{ Body: Record<string, unknown> }>(
      `/api/v1/reto/rpc/${name}`,
      { schema: { body: rpcSchemas[name] } as FastifySchema },
      (request, reply) => forward(reply, '/rest/v1/rpc/' + name, request.body),
    );
  }

  for (const [game, table] of Object.entries({
    reto: 'scores',
    'mas-o-menos': 'hl_scores',
    blackjack: 'bj10_scores',
    'emoji-player': 'emoji_scores',
  })) {
    app.post<{ Body: Record<string, unknown> }>(
      `/api/v1/scores/${game}`,
      {
        schema: { body: scoreBodies[game] } as FastifySchema,
      },
      async (request, reply) => {
        const prefer =
          game === 'emoji-player'
            ? 'return=minimal,resolution=merge-duplicates'
            : 'return=minimal';
        return forward(reply, '/rest/v1/' + table, request.body, prefer);
      },
    );
  }

  app.post<{ Body: { pid: string; n: string } }>(
    '/api/v1/identity/register',
    { schema: { body: identityBody } as FastifySchema },
    (request, reply) =>
      forward(reply, '/rest/v1/rpc/register_name', request.body),
  );
  app.post<{ Body: { pid: string; n: string } }>(
    '/api/v1/identity/rename',
    { schema: { body: identityBody } as FastifySchema },
    (request, reply) =>
      forward(reply, '/rest/v1/rpc/rename_player', request.body),
  );

  const rank = (
    route: string,
    table: string,
    params: (query: Record<string, string>) => string | null,
  ) => {
    app.get<{ Querystring: Record<string, string> }>(
      route,
      async (request, reply) => {
        const query = request.query;
        const upstreamQuery = params(query);
        if (!upstreamQuery) return badRequest(reply);
        return forward(reply, `/rest/v1/${table}?${upstreamQuery}`);
      },
    );
  };
  rank('/api/v1/rankings/reto', 'scores', (q) => {
    if (
      !queryOnly(q, ['tab', 'day', 'includeVisibility']) ||
      !['true', 'false'].includes(q.includeVisibility ?? '')
    )
      return null;
    const select =
      q.includeVisibility === 'true'
        ? 'name,score,day,show_at'
        : 'name,score,day';
    if (q.tab === 'day' && dateIsValid(q.day))
      return new URLSearchParams({
        select,
        daily: 'eq.true',
        day: 'eq.' + q.day,
        order: 'score.desc',
        limit: '1000',
      }).toString();
    if (q.tab === 'all' && !('day' in q))
      return new URLSearchParams({
        select,
        order: 'score.desc',
        limit: '2000',
      }).toString();
    return null;
  });
  const categoryQuery =
    (select: string, field: string, dailyLimit: number, allLimit: number) =>
    (q: Record<string, string>) => {
      if (!queryOnly(q, ['tab', 'day'])) return null;
      if (q.tab === 'diario' && dateIsValid(q.day))
        return new URLSearchParams({
          select,
          mode: 'eq.diario',
          day: 'eq.' + q.day,
          order: field + '.desc',
          limit: String(dailyLimit),
        }).toString();
      if (['carrera', 'seleccion'].includes(q.tab ?? '') && !('day' in q))
        return new URLSearchParams({
          select,
          mode: 'eq.' + q.tab,
          order: field + '.desc',
          limit: String(allLimit),
        }).toString();
      return null;
    };
  rank(
    '/api/v1/rankings/mas-o-menos',
    'hl_scores',
    categoryQuery('name,streak', 'streak', 100, 500),
  );
  rank(
    '/api/v1/rankings/blackjack',
    'bj10_scores',
    categoryQuery('name,chips', 'chips', 100, 500),
  );
  rank('/api/v1/rankings/emoji-player', 'emoji_scores', (q) => {
    if (
      q.period === 'day' &&
      queryOnly(q, ['period', 'day']) &&
      dateIsValid(q.day)
    )
      return new URLSearchParams({
        select: 'name,score,day',
        day: 'eq.' + q.day,
        limit: '5000',
      }).toString();
    if (
      q.period === 'week' &&
      queryOnly(q, ['period', 'weekStart']) &&
      dateIsValid(q.weekStart)
    )
      return new URLSearchParams({
        select: 'name,score,day',
        day: 'gte.' + q.weekStart,
        limit: '5000',
      }).toString();
    return null;
  });

  if (config.serveWeb) {
    await app.register(fastifyStatic, {
      root: resolve(process.cwd(), 'dist'),
      prefix: config.webBasePath,
      wildcard: true,
      index: ['index.html'],
      setHeaders(response, path) {
        response.header(
          'Cache-Control',
          /[\\/]assets[\\/].+-[A-Za-z0-9_-]{8,}\.[^/\\]+$/.test(path)
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
        );
      },
    });
  }
  return app;
}
