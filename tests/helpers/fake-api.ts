import type { Page, Route } from '@playwright/test';

type Participant = { pid: string; name: string };
type Session = {
  id: string;
  participants: Participant[];
  scores: Map<string, number>;
  private: boolean;
  slots: Map<string, Array<[string, number]>>;
  progress: Map<string, number>;
  cancelled?: boolean;
  rematch?: Session;
};
type Room = { code: string; host: Participant; session: Session };
type Link = {
  code: string;
  creator: Participant;
  score: number;
  slots: Array<[string, number]>;
  plays: Array<{ name: string; score: number | null }>;
  starters: Map<string, string>;
  results: Map<string, number>;
};
type ApiCall = { method: string; path: string; body: unknown };
type Failure = { method: string; path: string; status: number; body: string };

const json = (route: Route, value: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
    headers: { 'access-control-allow-origin': '*' },
  });
const empty = (route: Route, status = 204) =>
  route.fulfill({
    status,
    body: '',
    headers: { 'access-control-allow-origin': '*' },
  });

/** Stateful in-browser API double shared by every page attached to it. */
export class FakeGoaldayApi {
  readonly calls: ApiCall[] = [];
  private readonly sessions = new Map<string, Session>();
  private readonly rooms = new Map<string, Room>();
  private readonly links = new Map<string, Link>();
  private readonly scores = new Map<string, Record<string, unknown>[]>();
  private readonly failures: Failure[] = [];
  private queuedSession: Session | undefined;
  private sequence = 0;

  async attach(page: Page): Promise<void> {
    await page.route('**/api/v1/**', (route) => this.handle(route));
  }

  /** Replay the same observed contracts against the untouched original client, with no remote access. */
  async attachOriginal(page: Page): Promise<void> {
    await page.route(
      /https:\/\/[^/]+\.supabase\.co\/rest\/v1\//,
      async (route) => {
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-methods': 'GET, POST, OPTIONS',
              'access-control-allow-headers': 'apikey, content-type, prefer',
            },
          });
          return;
        }
        const source = new URL(route.request().url());
        const operation = source.pathname.split('/').at(-1)!;
        const target = new URL('http://fake.test/api/v1');
        if (source.pathname.includes('/rpc/')) {
          target.pathname += ['register_name', 'rename_me'].includes(operation)
            ? '/identity/' +
              (operation === 'register_name' ? 'register' : 'rename')
            : '/reto/rpc/' + operation;
        } else {
          const game = {
            scores: 'reto',
            hl_scores: 'mas-o-menos',
            bj10_scores: 'blackjack',
            emoji_scores: 'emoji-player',
          }[operation];
          if (!game)
            throw new Error('Unconfigured original table: ' + operation);
          target.pathname +=
            (route.request().method() === 'POST' ? '/scores/' : '/rankings/') +
            game;
          const day = source.searchParams.get('day');
          if (day)
            target.searchParams.set(
              day.startsWith('gte.') ? 'weekStart' : 'day',
              day.slice(day.indexOf('.') + 1),
            );
          const mode = source.searchParams.get('mode');
          if (mode) target.searchParams.set('tab', mode.slice(3));
          if (game === 'emoji-player')
            target.searchParams.set(
              'period',
              day?.startsWith('gte.') ? 'week' : 'day',
            );
        }
        await this.handle(route, target);
      },
    );
  }

  failNext(
    method: string,
    path: string,
    status: number,
    body = 'upstream unavailable',
  ) {
    this.failures.push({ method: method.toUpperCase(), path, status, body });
  }

  private async handle(route: Route, replayUrl?: URL) {
    const request = route.request();
    const url = replayUrl || new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = request.method();
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      body = undefined;
    }
    this.calls.push({ method, path, body });

    const failureIndex = this.failures.findIndex(
      (failure) => failure.method === method && failure.path === path,
    );
    if (failureIndex !== -1) {
      const [failure] = this.failures.splice(failureIndex, 1);
      await route.fulfill({ status: failure.status, body: failure.body });
      return;
    }

    if (method === 'GET' && path.startsWith('/rankings/')) {
      await json(route, this.ranking(path, url.searchParams));
      return;
    }
    if (method === 'POST' && path.startsWith('/scores/')) {
      await this.saveScore(route, path.slice('/scores/'.length), body);
      return;
    }
    if (
      method === 'POST' &&
      ['/identity/register', '/identity/rename'].includes(path)
    ) {
      await empty(route, 201);
      return;
    }
    if (method === 'POST' && path.startsWith('/reto/rpc/')) {
      await this.rpc(
        route,
        path.slice('/reto/rpc/'.length),
        body as Record<string, unknown>,
      );
      return;
    }
    await route.fulfill({ status: 404, body: 'fake API route not configured' });
  }

  private ranking(path: string, query: URLSearchParams) {
    const game = path.slice('/rankings/'.length);
    const rows = this.scores.get(game) ?? [];
    if (game === 'reto') {
      const day = query.get('day');
      return rows.filter((row) => !day || row.day === day);
    }
    if (game === 'emoji-player') {
      const day = query.get('day');
      return rows.filter((row) => !day || row.day === day);
    }
    const tab = query.get('tab');
    return rows.filter((row) => !tab || row.mode === tab);
  }

  private async saveScore(route: Route, game: string, payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      await route.fulfill({ status: 400, body: 'invalid score payload' });
      return;
    }
    const row = payload as Record<string, unknown>;
    const rows = this.scores.get(game) ?? [];
    const duplicate = rows.some(
      (item) =>
        item.player_id === row.player_id &&
        item.day === row.day &&
        item.mode === row.mode,
    );
    if (duplicate && game !== 'reto') {
      await route.fulfill({ status: 409, body: 'duplicate score' });
      return;
    }
    rows.push(row);
    this.scores.set(game, rows);
    await empty(route, 201);
  }

  private async rpc(route: Route, name: string, args: Record<string, unknown>) {
    const pid = String(args.pid ?? '');
    const participant = (value: Record<string, unknown>): Participant => ({
      pid: String(value.pid ?? ''),
      name: String(value.n ?? 'Jugador'),
    });
    const session = (id: string) => this.sessions.get(id);
    switch (name) {
      case 'seed_daily':
      case 'duel_bot':
      case 'duel_bot_submit':
      case 'season_tick':
      case 'bots_tick':
        await empty(route);
        return;
      case 'duel_cancel': {
        const current = session(String(args.d));
        if (current) current.cancelled = true;
        await empty(route);
        return;
      }
      case 'duel_progress': {
        session(String(args.d))?.progress.set(pid, Number(args.n));
        await empty(route);
        return;
      }
      case 'duel_queue': {
        let current = this.queuedSession;
        if (!current || current.participants.some((item) => item.pid === pid)) {
          current = this.newSession(false);
          this.queuedSession = current;
        }
        current.participants.push(participant(args));
        if (current.participants.length === 2) this.queuedSession = undefined;
        await json(route, current.id);
        return;
      }
      case 'duel_state': {
        const current = session(String(args.d));
        await json(route, current ? this.duelState(current, pid) : null);
        return;
      }
      case 'duel_submit': {
        const current = session(String(args.d));
        if (!current) {
          await json(route, null);
          return;
        }
        current.scores.set(pid, Number(args.sc));
        current.slots.set(pid, args.sl as Array<[string, number]>);
        await json(route, this.duelState(current, pid));
        return;
      }
      case 'duel_rematch': {
        const previous = session(String(args.d));
        if (!previous) {
          await json(route, { error: 'missing' });
          return;
        }
        const next = previous.rematch || this.newSession(previous.private);
        previous.rematch = next;
        const player = previous.participants.find((item) => item.pid === pid);
        if (player && !next.participants.some((item) => item.pid === pid))
          next.participants.push(player);
        await json(route, {
          id: next.id,
          joined: next.participants.length === 2,
        });
        return;
      }
      case 'duel_room_create': {
        const host = participant(args);
        const code = `ROOM${String(++this.sequence).padStart(2, '0')}`;
        const current = this.newSession(true);
        current.participants.push(host);
        this.rooms.set(code, { code, host, session: current });
        await json(route, { id: current.id, code });
        return;
      }
      case 'duel_room_peek': {
        const room = this.rooms.get(String(args.c));
        await json(
          route,
          room ? { ok: true, host: room.host.name } : { ok: false },
        );
        return;
      }
      case 'duel_room_join': {
        const room = this.rooms.get(String(args.c));
        if (!room || room.host.pid === pid) {
          await json(route, { error: room ? 'own' : 'missing' });
          return;
        }
        room.session.participants.push(participant(args));
        await json(route, { id: room.session.id, host: room.host.name });
        return;
      }
      case 'link_create': {
        const creator = participant(args);
        const code = String(args.code);
        this.links.set(code, {
          code,
          creator,
          score: Number(args.sc),
          slots: (args.sl as Array<[string, number]>) ?? [],
          plays: [{ name: creator.name, score: Number(args.sc) }],
          starters: new Map(),
          results: new Map(),
        });
        await empty(route);
        return;
      }
      case 'link_get': {
        const link = this.links.get(String(args.c));
        await json(
          route,
          link
            ? {
                creator_name: link.creator.name,
                creator_score: link.score,
                mine: link.creator.pid === pid,
                plays: link.plays,
                started: link.starters.has(pid),
                my_score: link.results.get(pid) ?? null,
              }
            : null,
        );
        return;
      }
      case 'link_start': {
        const link = this.links.get(String(args.c));
        if (link && link.creator.pid !== pid && !link.starters.has(pid)) {
          link.starters.set(pid, String(args.n));
          link.plays.push({ name: String(args.n), score: null });
          await json(route, true);
        } else await json(route, false);
        return;
      }
      case 'link_finish': {
        const link = this.links.get(String(args.c));
        if (!link) {
          await json(route, null);
          return;
        }
        const name = link.starters.get(pid) || 'Rival';
        link.results.set(pid, Number(args.sc));
        const play = link.plays.find((item) => item.name === name);
        if (play) play.score = Number(args.sc);
        else link.plays.push({ name, score: Number(args.sc) });
        await json(route, {
          creator_name: link.creator.name,
          creator_score: link.score,
          creator_slots: link.slots,
        });
        return;
      }
      case 'link_mine':
        await json(route, { created: [], answered: [] });
        return;
      case 'duel_top':
        await json(route, []);
        return;
      case 'duel_me':
        await json(route, {
          wins: 0,
          losses: 0,
          draws: 0,
          elo: 1000,
          pos: null,
        });
        return;
      case 'season_info':
        await json(route, { medals: [] });
        return;
      default:
        await route.fulfill({
          status: 404,
          body: `unconfigured fake RPC: ${name}`,
        });
    }
  }

  private newSession(isPrivate: boolean): Session {
    const id = `duel-${++this.sequence}`;
    const current = {
      id,
      participants: [],
      scores: new Map<string, number>(),
      private: isPrivate,
      slots: new Map<string, Array<[string, number]>>(),
      progress: new Map<string, number>(),
    };
    this.sessions.set(id, current);
    return current;
  }

  private duelState(session: Session, pid: string) {
    const me = session.participants.find((item) => item.pid === pid);
    const rival = session.participants.find((item) => item.pid !== pid);
    const done =
      session.scores.size === session.participants.length &&
      session.scores.size > 0;
    return {
      status: session.cancelled
        ? 'cancelled'
        : done
          ? 'done'
          : rival
            ? 'playing'
            : 'waiting',
      creator: session.participants[0]?.name,
      rival: rival
        ? {
            name: rival.name,
            elo: 1000,
            prog: session.progress.get(rival.pid) || 0,
            score: session.scores.get(rival.pid) ?? 0,
            slots: session.slots.get(rival.pid),
            done: session.scores.has(rival.pid),
          }
        : undefined,
      seed: session.id,
      private: session.private,
      started_at: new Date().toISOString(),
      now: new Date().toISOString(),
      my_score: session.scores.get(pid) ?? null,
      slots: session.slots.get(pid),
      rematch: session.rematch
        ? {
            mine: session.rematch.participants.some((item) => item.pid === pid),
            status:
              session.rematch.participants.length === 2 ? 'playing' : 'waiting',
          }
        : null,
      result: done
        ? session.scores.get(pid)! > session.scores.get(rival?.pid ?? '')!
          ? 'win'
          : session.scores.get(pid) === session.scores.get(rival?.pid ?? '')
            ? 'draw'
            : 'loss'
        : undefined,
      plays: me ? [...session.scores].map(([key, score]) => [key, score]) : [],
    };
  }
}
