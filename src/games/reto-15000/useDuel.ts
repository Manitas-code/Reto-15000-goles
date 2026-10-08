import { useCallback, useEffect, useRef, useState } from 'react';
import { retoRpc } from '../../shared/api';
import { botPlan, botProgress, type BotResult } from './bots';
import { fmt, persist, type Model, type Mode } from './model';
import { N } from './engine';
import { divOf, divMove } from './divisions';
import type {
  RetoRpcCall,
  DuelLinkMine,
  DuelMeResponse,
  DuelTopEntry,
  LinkCompareData,
  LinkData,
  OnlineState,
  QueueResponse,
  RematchResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  RoomPeekResponse,
  SeasonInfoResponse,
  SeasonMedal,
} from '../../../contracts/reto';

const NOBODY = '00000000-0000-0000-0000-000000000000';
const PICK_SECS = 20;
function rpc<T>(...operation: RetoRpcCall) {
  return retoRpc<T>(...operation);
}
function cleanCode(value: string | null) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function newCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    bytes = new Uint8Array(8);
  if (window.crypto) window.crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => (bytes[index] = Math.random() * 256));
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join('');
}

export type ModalAction =
  | 'cancel'
  | 'invite'
  | 'start-online'
  | 'start-room'
  | 'join-room'
  | 'accept-link'
  | 'close'
  | 'new-link'
  | 'rematch'
  | 'again'
  | 'home'
  | 'send'
  | 'retry'
  | 'duel-rank';
export type ModalPart = { text: string; strong?: boolean };
export type ModalPlayRow = {
  name: string;
  score: number | null;
  label: string;
  className: '' | 'w' | 'l';
};
export type DuelModal = {
  icon: string;
  title: string;
  text: string;
  textParts?: ModalPart[];
  extra?: string;
  extraParts?: ModalPart[];
  plays?: ModalPlayRow[];
  noPlays?: boolean;
  code?: string;
  displayCode?: string;
  rival?: { name: string; note: string };
  action?: string;
  buttons: { label: string; action: ModalAction; ghost?: boolean }[];
};
export type DuelSession = {
  kind: 'online' | 'enlace';
  private?: boolean;
  seed?: string;
  id?: string;
  code?: string;
  rivalName?: string;
  creator?: string;
  role?: 'creator' | 'rival';
  pid?: string;
  name?: string;
  t0: number;
  started?: boolean;
  submitted?: boolean;
  revealed?: boolean;
  polling?: boolean;
  readyShown?: boolean;
  botTimer?: number;
  botView?: number;
  topReq?: Promise<unknown>;
  topAfter?: DuelTopEntry[];
  state?: OnlineState;
  bot?: BotResult;
  botReq?: Promise<unknown>;
  myScore?: number;
  mySlots?: [string, number][];
  link?: LinkCompareData;
  error?: boolean;
  saved?: boolean;
  request?: Promise<unknown>;
  top?: DuelTopEntry[];
  move?: string;
  celebrated?: boolean;
  previous?: {
    elo: number;
    pos: number | null;
    games: number;
    elo50: number | null;
  } | null;
  doneKey?: string;
  doneBeep?: boolean;
  botProgress?: number;
};
export type DuelWorldView = DuelMeResponse & {
  games: number;
  elo50: number | null;
};
export type DuelView = {
  modal: DuelModal | null;
  session: DuelSession | null;
  countdown: number;
  searchSeconds: number;
  pickLeft: number;
  result: boolean;
  linkData: LinkData | null;
  lastPrivate: boolean;
  world: DuelWorldView | null;
  top: DuelTopEntry[];
  error: string;
  rankLoading: boolean;
  season: SeasonInfoResponse | null;
  seasonDaysLeft: number;
  duelRows: DuelTopEntry[];
  duelMe: DuelMeResponse | null;
  linkMine: DuelLinkMine | null;
};
export type DuelIdentity = { pid: string; name: string };
type DuelModel = Model & { phase?: string; currentCard?: unknown };
type RetoApi = {
  state: DuelModel;
  start: (confirmed?: boolean, mode?: Mode, seed?: string) => void;
  patch: (value: Partial<Model>) => void;
  goHome: () => void;
  toast: (
    message: string,
    icon?: string,
    parts?: { text: string; strong?: boolean }[],
    duration?: number,
  ) => void;
  requireIdentity: (callback: (identity: DuelIdentity) => void) => void;
  place: (index: number) => void;
  sound?: (kind: 'place' | 'skip' | 'big' | 'win' | 'lose') => void;
  submitDuel?: (score: number, slots: Array<[string, number]>) => void;
  revealDuel?: () => void;
};

export function useDuel(game: RetoApi) {
  const [view, setView] = useState<DuelView>({
    modal: null,
    session: null,
    countdown: 0,
    searchSeconds: 0,
    pickLeft: PICK_SECS,
    result: false,
    linkData: null,
    lastPrivate: false,
    world: null,
    top: [],
    error: '',
    rankLoading: false,
    season: null,
    seasonDaysLeft: 0,
    duelRows: [],
    duelMe: null,
    linkMine: null,
  });
  const session = useRef<DuelSession | null>(null);
  const pickTimer = useRef<number | null>(null);
  const confettiTimer = useRef<number | null>(null);
  const booted = useRef(false);
  const roomPeekToken = useRef(0);
  const linkFetchToken = useRef(0);
  const duelTabToken = useRef(0);
  const progressSent = useRef<string | null>(null);
  const bootTimers = useRef<number[]>([]);
  const alive = useRef(true);
  const storeRef = useRef(game.state.store);
  storeRef.current = game.state.store;
  const update = useCallback(
    (next: Partial<DuelView>) =>
      setView((current) => ({
        ...current,
        session: session.current ? { ...session.current } : null,
        ...next,
      })),
    [],
  );
  const modal = useCallback(
    (value: DuelModal | null) => update({ modal: value }),
    [update],
  );
  const baseUrl = () => location.origin + location.pathname;
  const shareLink = async (url: string, text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      game.toast('Enlace copiado. Pégalo en WhatsApp o donde quieras.', '🔗');
    } catch {
      prompt('Copia este enlace:', url);
    }
  };
  const seasonLabel = (
    season: { num: number; name: string } | null | undefined,
  ) => (season ? 'Temporada ' + season.num + ' · ' + season.name : '');
  const daysLeft = () => {
    const now = new Date(),
      next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 864e5));
  };
  const medalFor = (medal: SeasonMedal) =>
    medal.pos <= 50
      ? {
          icon:
            medal.pos === 1
              ? '🥇'
              : medal.pos === 2
                ? '🥈'
                : medal.pos === 3
                  ? '🥉'
                  : medal.pos <= 10
                    ? '🏅'
                    : '🎖️',
          text: 'TOP ' + medal.pos + ' TEMPORADA ' + medal.season,
        }
      : {
          icon: divOf(medal.elo, medal.pos).ico,
          text:
            divOf(medal.elo, medal.pos).name.toUpperCase() +
            ' TEMPORADA ' +
            medal.season,
        };
  const linkPlayRows = (link: LinkData, creatorName = ''): ModalPlayRow[] =>
    (link.plays || []).map((play) => {
      if (play.score == null)
        return {
          name: play.name,
          score: null,
          label: 'a medias',
          className: '',
        };
      return {
        name: play.name,
        score: play.score,
        label:
          play.score > link.creator_score
            ? 'ganó a ' + (creatorName || 'ti')
            : play.score < link.creator_score
              ? 'perdió'
              : 'empate',
        className:
          play.score > link.creator_score
            ? 'l'
            : play.score < link.creator_score
              ? 'w'
              : '',
      };
    });
  const fireConfetti = useCallback(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    game.patch({ confetti: true, confettiKey: game.state.confettiKey + 1 });
    if (confettiTimer.current !== null) clearTimeout(confettiTimer.current);
    confettiTimer.current = window.setTimeout(() => {
      confettiTimer.current = null;
      game.patch({ confetti: false });
    }, 3200);
  }, [game.patch, game.state.confettiKey]);
  const worldInfo = useCallback(
    async (identity?: DuelIdentity) => {
      const pid = identity?.pid || game.state.store.pid;
      if (!pid || !(identity?.name || game.state.store.name)) return null;
      const [me, top] = await Promise.all([
        rpc<DuelMeResponse>('duel_me', { pid }),
        rpc<DuelTopEntry[]>('duel_top'),
      ]);
      const games = me ? me.wins + me.losses + me.draws : 0;
      const elo = me?.elo || 1000,
        elo50 = top && top.length >= 50 ? top[49]!.elo : null;
      return {
        me,
        top: top || [],
        games,
        elo,
        pos: games ? (me?.pos ?? null) : null,
        elo50,
        summary: {
          ...(me || { wins: 0, losses: 0, draws: 0, elo: 1000, pos: null }),
          games,
          elo,
          pos: games ? (me?.pos ?? null) : null,
          elo50,
        },
      };
    },
    [game.state.store.pid, game.state.store.name],
  );
  const loadSeason = useCallback(
    async (quiet: boolean) => {
      const initialStore = storeRef.current;
      const initialIdentity =
        (initialStore.pid || '') + ':' + (initialStore.name || '');
      const stillCurrent = () =>
        alive.current &&
        initialIdentity ===
          (storeRef.current.pid || '') + ':' + (storeRef.current.name || '');
      try {
        await rpc('season_tick');
        if (!stillCurrent()) return;
        const info = await rpc<SeasonInfoResponse>('season_info', {
          pid: initialStore.pid || NOBODY,
        });
        if (!stillCurrent()) return;
        update({ season: info || null, seasonDaysLeft: daysLeft() });
        if (initialStore.pid && initialStore.name)
          void worldInfo({ pid: initialStore.pid, name: initialStore.name })
            .then((world) => {
              if (stillCurrent() && world)
                update({ world: world.summary, top: world.top });
            })
            .catch(() => {});
        if (quiet || !initialStore.pid || !initialStore.name || !info?.current)
          return;
        const current = info.current.num,
          seen = storeRef.current.seasonSeen;
        if (seen == null) {
          const store = { ...storeRef.current, seasonSeen: current };
          persist(store);
          game.patch({ store });
          return;
        }
        if (Number(seen) >= current) return;
        const store = { ...storeRef.current, seasonSeen: current };
        persist(store);
        game.patch({ store });
        const medal = (info.medals || []).find(
            (item) => item.season === current - 1,
          ),
          me = await rpc<DuelMeResponse>('duel_me', {
            pid: initialStore.pid,
          }).catch(() => null);
        if (!stillCurrent()) return;
        if (!medal) {
          const label = seasonLabel(info.current);
          game.toast('Empieza la ' + label, '🏆', [
            { text: 'Empieza la ' + label, strong: true },
          ]);
          return;
        }
        const decorated = medalFor(medal);
        const place =
          medal.pos <= 50
            ? medal.pos + 'º del mundo'
            : divOf(medal.elo, medal.pos).name;
        const line =
          'Fin de la Temporada ' +
          medal.season +
          ' (' +
          medal.name +
          '): ' +
          (medal.pos <= 50 ? 'quedaste ' + place : 'terminaste en ' + place) +
          ' con ' +
          fmt(medal.elo) +
          ' puntos (' +
          medal.wins +
          '-' +
          medal.losses +
          (medal.draws ? '-' + medal.draws : '') +
          ').';
        const extra =
          'Empieza la ' +
          seasonLabel(info.current) +
          '. Los puntos se han reiniciado a mitad de camino' +
          (me ? ': ahora tienes ' + fmt(me.elo) : '') +
          '. En los primeros duelos subes más rápido.';
        modal({
          icon: decorated.icon,
          title: decorated.text,
          text: line,
          textParts: [
            {
              text:
                'Fin de la Temporada ' +
                medal.season +
                ' (' +
                medal.name +
                '): ',
            },
            { text: medal.pos <= 50 ? 'quedaste ' : 'terminaste en ' },
            { text: place, strong: true },
            {
              text:
                ' con ' +
                fmt(medal.elo) +
                ' puntos (' +
                medal.wins +
                '-' +
                medal.losses +
                (medal.draws ? '-' + medal.draws : '') +
                ').',
            },
          ],
          extra,
          extraParts: [
            { text: 'Empieza la ' },
            { text: seasonLabel(info.current), strong: true },
            { text: '. Los puntos se han reiniciado a mitad de camino' },
            ...(me
              ? [
                  { text: ': ahora tienes ' },
                  { text: fmt(me.elo), strong: true },
                ]
              : []),
            { text: '. En los primeros duelos subes más rápido.' },
          ],
          buttons: [
            { label: '¡A por ello!', action: 'close' },
            { label: 'Ver mis medallas', action: 'duel-rank', ghost: true },
          ],
        });
        game.sound?.('win');
        if (medal.pos <= 3) fireConfetti();
      } catch {
        /* Preserve the seasonal ranking's silent fallback. */
      }
    },
    [
      game.state.store,
      game.patch,
      game.toast,
      game.sound,
      modal,
      update,
      worldInfo,
      fireConfetti,
    ],
  );
  const loadDuelTab = useCallback(async () => {
    const token = ++duelTabToken.current,
      stale = () =>
        !alive.current ||
        token !== duelTabToken.current ||
        game.state.view !== 'rank' ||
        game.state.rankTab !== 'duel';
    const currentStore = storeRef.current,
      pid = currentStore.pid || null;
    update({ error: '', rankLoading: true });
    let top: DuelTopEntry[] | null,
      me: DuelMeResponse | null,
      mine: DuelLinkMine | null;
    try {
      await rpc('bots_tick').catch(() => {});
      [top, me, mine] = await Promise.all([
        rpc<DuelTopEntry[]>('duel_top'),
        pid ? rpc<DuelMeResponse>('duel_me', { pid }) : Promise.resolve(null),
        Promise.resolve<DuelLinkMine | null>(null),
      ]);
    } catch {
      if (!stale())
        update({
          error: 'No se han podido cargar los duelos. Revisa la conexión.',
          rankLoading: false,
        });
      return;
    }
    if (stale()) return;
    const games = me ? me.wins + me.losses + me.draws : 0,
      elo = me?.elo || 1000;
    if (games) {
      const division = divOf(elo, me?.pos);
      if (currentStore.lastDiv !== division.name) {
        const store = { ...storeRef.current, lastDiv: division.name };
        persist(store);
        game.patch({ store });
      }
    }
    const gamesCount = me ? me.wins + me.losses + me.draws : 0;
    update({
      duelRows: top || [],
      duelMe: me,
      linkMine: mine,
      top: top || [],
      world: pid
        ? {
            ...(me || { wins: 0, losses: 0, draws: 0, elo: 1000, pos: null }),
            games: gamesCount,
            elo: me?.elo || 1000,
            pos: gamesCount ? (me?.pos ?? null) : null,
            elo50: top && top.length >= 50 ? top[49]!.elo : null,
          }
        : null,
      rankLoading: false,
    });
    try {
      const season = await rpc<SeasonInfoResponse>('season_info', {
        pid: pid || NOBODY,
      });
      if (!stale())
        update({ season: season || null, seasonDaysLeft: daysLeft() });
    } catch {
      /* The online ladder remains useful if seasonal history is unavailable. */
    }
  }, [
    game.state.view,
    game.state.rankTab,
    game.state.store.pid,
    game.state.store.name,
    game.patch,
    update,
  ]);
  useEffect(() => {
    if (game.state.view === 'rank' && game.state.rankTab === 'duel')
      void loadDuelTab();
    else duelTabToken.current++;
  }, [game.state.view, game.state.rankTab, loadDuelTab]);
  const worldIdentity = useRef(
    (game.state.store.pid || '') + ':' + (game.state.store.name || ''),
  );
  useEffect(() => {
    const key =
      (game.state.store.pid || '') + ':' + (game.state.store.name || '');
    if (key === worldIdentity.current) return;
    worldIdentity.current = key;
    const identity =
      game.state.store.pid && game.state.store.name
        ? { pid: game.state.store.pid, name: game.state.store.name }
        : null;
    if (!identity) {
      update({ world: null });
      return;
    }
    void worldInfo(identity)
      .then((world) => {
        if (alive.current && world && worldIdentity.current === key)
          update({ world: world.summary, top: world.top });
      })
      .catch(() => {});
  }, [game.state.store.pid, game.state.store.name, worldInfo, update]);
  const stop = useCallback(
    (cancelRemote = true) => {
      const current = session.current;
      if (
        cancelRemote &&
        current?.kind === 'online' &&
        current.id &&
        !current.started
      )
        void rpc('duel_cancel', {
          d: current.id,
          pid: current.pid || game.state.store.pid || '',
        }).catch(() => {});
      if (pickTimer.current) clearInterval(pickTimer.current);
      pickTimer.current = null;
      session.current = null;
      roomPeekToken.current++;
      linkFetchToken.current++;
      update({
        modal: null,
        session: null,
        countdown: 0,
        searchSeconds: 0,
        result: false,
        pickLeft: PICK_SECS,
      });
    },
    [game.state.store.pid, update],
  );
  const celebrateDuel = useCallback(
    (current: DuelSession) => {
      if (
        current.celebrated ||
        (current.error && current.state?.status !== 'done') ||
        (current.bot && Date.now() < current.bot.finishAt && !current.error)
      )
        return;
      if (
        current.kind === 'online' &&
        current.state?.status === 'done' &&
        !current.state.private &&
        current.move === undefined
      ) {
        const elo = current.state.my_elo || 1000,
          pos = current.state.my_pos ?? undefined;
        const store = storeRef.current,
          nextDivision = divOf(elo, pos).name;
        current.move = divMove(
          elo,
          pos,
          typeof store.lastDiv === 'string' ? store.lastDiv : undefined,
        );
        if (store.lastDiv !== nextDivision) {
          const nextStore = { ...store, lastDiv: nextDivision };
          storeRef.current = nextStore;
          persist(nextStore);
          game.patch({ store: nextStore });
        }
      }
      let result: 'win' | 'loss' | 'draw' | null = null;
      if (
        current.kind === 'online' &&
        current.state?.status === 'done' &&
        ['win', 'loss', 'draw'].includes(current.state.result || '')
      )
        result = current.state.result as 'win' | 'loss' | 'draw';
      else if (
        current.kind === 'enlace' &&
        current.role === 'rival' &&
        current.link &&
        current.myScore != null
      )
        result =
          current.myScore > current.link.creator_score
            ? 'win'
            : current.myScore < current.link.creator_score
              ? 'loss'
              : 'draw';
      if (!result) return;
      current.celebrated = true;
      if (result === 'win') {
        game.sound?.('win');
        fireConfetti();
      } else if (result === 'loss') game.sound?.('lose');
    },
    [fireConfetti, game.sound, game.patch],
  );
  const startOnline = useCallback(
    () =>
      game.requireIdentity((identity) => {
        stop();
        const current: DuelSession = {
          kind: 'online',
          pid: identity.pid,
          name: identity.name,
          t0: Date.now(),
        };
        session.current = current;
        void worldInfo(identity)
          .then((previous) => {
            if (session.current === current && previous)
              current.previous = previous;
          })
          .catch(() => {});
        update({ searchSeconds: 0 });
        modal({
          icon: '⚔️',
          title: 'Buscando rival',
          text: 'Te emparejamos con el primero que busque duelo. Los dos jugáis los mismos 17 jugadores a la vez, con 20 segundos por jugador. Gana quien más sume.',
          buttons: [
            { label: 'Invitar a alguien', action: 'invite' },
            { label: 'Cancelar', action: 'cancel', ghost: true },
          ],
        });
        void rpc<QueueResponse>('duel_queue', {
          pid: identity.pid,
          n: identity.name,
        })
          .then((id) => {
            if (session.current !== current) {
              if (alive.current && id)
                void rpc('duel_cancel', { d: id, pid: identity.pid }).catch(
                  () => {},
                );
              return;
            }
            current.id = id || undefined;
            update({ session: { ...current } });
            if (!id) throw new Error('empty queue');
          })
          .catch(() => {
            if (alive.current && session.current === current) {
              stop();
              game.toast(
                'No se ha podido buscar rival. Revisa la conexión.',
                '⚠️',
              );
            }
          });
      }),
    [
      game.requireIdentity,
      game.state.store.name,
      game.state.store.pid,
      modal,
      stop,
      update,
      game.toast,
      worldInfo,
    ],
  );
  const roomUrl = (code: string) => baseUrl() + '?sala=' + code;
  const startRoom = useCallback(
    () =>
      game.requireIdentity(async (identity) => {
        stop();
        const current: DuelSession = {
          kind: 'online',
          private: true,
          pid: identity.pid,
          name: identity.name,
          t0: Date.now(),
        };
        session.current = current;
        modal({ icon: '🔗', title: 'Creando la sala…', text: '', buttons: [] });
        try {
          const created = await rpc<RoomCreateResponse>('duel_room_create', {
            pid: identity.pid,
            n: identity.name,
          });
          if (!created) throw new Error('empty room result');
          if (!alive.current || session.current !== current) return;
          current.id = created.id;
          current.code = created.code;
          update({ session: { ...current } });
          modal({
            icon: '🔗',
            title: 'Reta a un amigo',
            text: 'Mándale el enlace. Cuando entre, empezáis los dos a la vez con los mismos 17 jugadores. No cierres esta página.',
            textParts: [
              {
                text: 'Mándale el enlace. Cuando entre, empezáis los dos a la vez con los mismos 17 jugadores. ',
              },
              { text: 'No cierres esta página.', strong: true },
            ],
            code: created.code,
            displayCode: created.code,
            extra: 'Código de la sala · caduca en 15 minutos',
            buttons: [
              { label: 'Enviar enlace', action: 'send' },
              { label: 'Cancelar', action: 'cancel', ghost: true },
            ],
          });
        } catch {
          if (alive.current && session.current === current) {
            stop();
            game.toast(
              'No se ha podido crear la sala. Revisa la conexión.',
              '⚠️',
            );
          }
        }
      }),
    [game.requireIdentity, modal, stop, update, game.toast],
  );
  const openRoom = useCallback(
    async (code: string) => {
      const token = ++roomPeekToken.current;
      try {
        const peek = await rpc<RoomPeekResponse>('duel_room_peek', { c: code });
        if (!alive.current || token !== roomPeekToken.current) return;
        if (!peek?.ok) {
          modal({
            icon: '⌛',
            title: 'Sala no disponible',
            text: peek
              ? 'La sala de ' +
                (peek.host || 'tu amigo') +
                ' ya ha empezado o ha caducado. Pídele que te mande un enlace nuevo.'
              : 'Ese enlace no es válido.',
            buttons: [
              { label: 'Crear mi sala', action: 'start-room' },
              { label: 'Cerrar', action: 'close', ghost: true },
            ],
          });
          return;
        }
        modal({
          icon: '⚔️',
          title: peek.host + ' te reta',
          text: 'Duelo en directo: jugáis los dos a la vez con los mismos 17 jugadores y 20 segundos por jugador. Gana quien más sume. Es amistoso: no cuenta para el ELO.',
          code,
          buttons: [
            { label: '¡Jugar!', action: 'join-room' },
            { label: 'Ahora no', action: 'close', ghost: true },
          ],
        });
      } catch {
        if (alive.current && token === roomPeekToken.current)
          game.toast(
            'No se ha podido abrir la sala. Revisa la conexión.',
            '⚠️',
          );
      }
    },
    [game.toast, modal],
  );
  const joinRoom = useCallback(
    (code: string) => {
      const requestToken = roomPeekToken.current;
      let activeToken = requestToken;
      modal(null);
      game.requireIdentity(async (identity) => {
        if (!alive.current || requestToken !== roomPeekToken.current) return;
        stop();
        const current: DuelSession = {
          kind: 'online',
          private: true,
          pid: identity.pid,
          name: identity.name,
          t0: Date.now(),
        };
        session.current = current;
        activeToken = roomPeekToken.current;
        modal({
          icon: '⚔️',
          title: 'Entrando en la sala…',
          text: '',
          buttons: [],
        });
        try {
          const joined = await rpc<RoomJoinResponse>('duel_room_join', {
            c: code,
            pid: identity.pid,
            n: identity.name,
          });
          if (
            !alive.current ||
            session.current !== current ||
            activeToken !== roomPeekToken.current
          )
            return;
          if (!joined || joined.error) {
            stop();
            if (joined?.error === 'own')
              game.toast(
                'Esa sala es tuya: mándale el enlace a tu amigo.',
                '🔗',
              );
            else void openRoom(code);
            return;
          }
          current.id = joined.id;
          current.rivalName = joined.host;
          update({ session: { ...current } });
          modal({
            icon: '🤝',
            title: '¡Dentro!',
            text: 'Esperando a que ' + joined.host + ' esté listo…',
            buttons: [{ label: 'Cancelar', action: 'cancel', ghost: true }],
          });
        } catch {
          if (alive.current && session.current === current) {
            stop();
            game.toast('No se ha podido entrar. Revisa la conexión.', '⚠️');
          }
        }
      });
    },
    [game.requireIdentity, game.toast, modal, openRoom, stop, update],
  );
  const startLink = useCallback(
    () =>
      game.requireIdentity((identity) => {
        stop();
        const code = newCode(),
          current: DuelSession = {
            kind: 'enlace',
            role: 'creator',
            code,
            seed: code,
            pid: identity.pid,
            name: identity.name,
            t0: Date.now(),
          };
        session.current = current;
        game.start(false, 'enlace', code);
        update({ session: { ...current }, modal: null, result: false });
      }),
    [game.requireIdentity, game.start, stop, update],
  );
  const openLink = useCallback(
    async (code: string) => {
      const token = ++linkFetchToken.current;
      let link: LinkData | null;
      try {
        link = await rpc<LinkData>('link_get', {
          c: code,
          pid: game.state.store.pid || NOBODY,
        });
      } catch {
        if (alive.current && token === linkFetchToken.current)
          game.toast(
            'No se ha podido abrir el reto. Revisa la conexión.',
            '⚠️',
          );
        return;
      }
      if (!alive.current || token !== linkFetchToken.current) return;
      if (!link) {
        game.toast('Ese reto no existe o el enlace está mal copiado.', '⚠️');
        return;
      }
      if (link.mine) {
        const score = fmt(link.creator_score);
        update({ linkData: link });
        modal({
          icon: '🔗',
          title: 'Tu reto',
          text: 'Hiciste ' + score + ' puntos.',
          textParts: [
            { text: 'Hiciste ' },
            { text: score, strong: true },
            { text: ' puntos.' },
          ],
          code,
          noPlays: !link.plays?.length,
          plays: linkPlayRows(link),
          buttons: [
            { label: 'Volver a mandarlo', action: 'send' },
            { label: 'Cerrar', action: 'close', ghost: true },
          ],
        });
        return;
      }
      update({ linkData: link });
      if (link.started && link.my_score != null) {
        const win = link.my_score > link.creator_score,
          draw = link.my_score === link.creator_score,
          myScore = fmt(link.my_score),
          creatorScore = fmt(link.creator_score);
        modal({
          icon: win ? '🏆' : draw ? '🤝' : '😬',
          title: win ? 'Le ganaste' : draw ? 'Empate' : 'Te ganó',
          text:
            'Tú ' + myScore + ' · ' + link.creator_name + ' ' + creatorScore,
          textParts: [
            { text: 'Tú ' },
            { text: myScore, strong: true },
            { text: ' · ' + link.creator_name + ' ' },
            { text: creatorScore, strong: true },
          ],
          plays: linkPlayRows(link, link.creator_name),
          buttons: [
            { label: 'Crear mi propio reto', action: 'new-link' },
            { label: 'Cerrar', action: 'close', ghost: true },
          ],
        });
        return;
      }
      if (link.started) {
        modal({
          icon: '⛔',
          title: 'Reto ya empezado',
          text:
            'Empezaste el reto de ' +
            link.creator_name +
            ' y lo dejaste a medias. Cada reto solo se puede jugar una vez.',
          buttons: [
            { label: 'Crear mi propio reto', action: 'new-link' },
            { label: 'Cerrar', action: 'close', ghost: true },
          ],
        });
        return;
      }
      modal({
        icon: '⚔️',
        title: link.creator_name + ' te reta',
        text:
          'Te tocarán los mismos 17 jugadores, en el mismo orden y con la misma liga ×5 que le tocaron a ' +
          link.creator_name +
          '. Verás su puntuación al terminar. Solo tienes un intento: si sales a medias, cuenta como jugado.',
        textParts: [
          {
            text: 'Te tocarán los mismos 17 jugadores, en el mismo orden y con la misma liga ×5 que le tocaron a ',
          },
          { text: link.creator_name },
          { text: '. Verás su puntuación al terminar. ' },
          { text: 'Solo tienes un intento', strong: true },
          { text: ': si sales a medias, cuenta como jugado.' },
        ],
        code,
        buttons: [
          { label: 'Aceptar el reto', action: 'accept-link' },
          { label: 'Ahora no', action: 'close', ghost: true },
        ],
      });
    },
    [game.state.store.pid, game.toast, modal, update],
  );
  const acceptLink = useCallback(
    (code: string, creator: string) => {
      const requestToken = linkFetchToken.current;
      modal(null);
      game.requireIdentity(async (identity) => {
        if (!alive.current || requestToken !== linkFetchToken.current) return;
        try {
          const ok = !!(await rpc<boolean>('link_start', {
            c: code,
            pid: identity.pid,
            n: identity.name,
          }));
          if (!alive.current || requestToken !== linkFetchToken.current) return;
          if (!ok) {
            void openLink(code);
            return;
          }
          stop();
          const current: DuelSession = {
            kind: 'enlace',
            role: 'rival',
            code,
            seed: code,
            creator,
            pid: identity.pid,
            name: identity.name,
            t0: Date.now(),
          };
          session.current = current;
          game.start(false, 'enlace', code);
          update({ session: { ...current }, modal: null, result: false });
        } catch {
          if (alive.current && requestToken === linkFetchToken.current)
            game.toast(
              'No se ha podido empezar el reto. Revisa la conexión.',
              '⚠️',
            );
        }
      });
    },
    [game.requireIdentity, game.start, game.toast, openLink, stop, update],
  );

  const pollOnline = useCallback(async () => {
    const current = session.current;
    if (!current || current.kind !== 'online' || !current.id || current.polling)
      return;
    current.polling = true;
    try {
      const snapshot = await rpc<OnlineState>('duel_state', {
        d: current.id,
        pid: current.pid || game.state.store.pid || '',
      });
      if (session.current !== current || !snapshot) return;
      current.state = snapshot;
      if (snapshot.rival) current.rivalName = snapshot.rival.name;
      if (current.revealed) celebrateDuel(current);
      if (snapshot.status === 'ready' && !current.readyShown) {
        current.readyShown = true;
        game.sound?.('big');
        modal({
          icon: '🤝',
          title: '¡' + (snapshot.rival?.name || 'Tu rival') + ' ha entrado!',
          text: 'Empezáis en cuanto los dos tengáis la web abierta…',
          buttons: [{ label: 'Cancelar', action: 'cancel', ghost: true }],
        });
      }
      if (snapshot.status === 'playing' && !current.started) {
        current.started = true;
        current.seed = snapshot.seed!;
        const rival = snapshot.rival!;
        const seconds = Math.max(
          1,
          Math.round(
            (new Date(snapshot.started_at!).getTime() -
              new Date(snapshot.now!).getTime()) /
              1000,
          ),
        );
        if (rival.bot) {
          current.bot = botPlan(
            snapshot.seed!,
            rival.elo,
            Date.now() + seconds * 1000,
          );
          const botSlots = current.bot.slots.filter(
            (slot): slot is [string, number] => !!slot,
          );
          current.botReq = rpc('duel_bot_submit', {
            d: current.id,
            pid: current.pid || game.state.store.pid || '',
            sc: current.bot.score,
            sl: botSlots,
          });
        }
        const rivalDivision = divOf(rival.elo, rival.pos);
        update({
          session: { ...current },
          countdown: seconds,
          modal: {
            icon: '⚔️',
            title: snapshot.private
              ? '¡Duelo con tu amigo!'
              : '¡Rival encontrado!',
            text: '',
            rival: {
              name: rival.name,
              note: snapshot.private
                ? 'Duelo amistoso · no cuenta para el ELO'
                : rivalDivision.ico +
                  ' ' +
                  rivalDivision.name +
                  ' · ' +
                  fmt(rival.elo) +
                  ' ELO',
            },
            buttons: [],
          },
        });
        game.sound?.('big');
      } else update({ session: { ...current } });
      if (
        snapshot.status === 'cancelled' &&
        !current.started &&
        current.private
      ) {
        stop(false);
        game.toast('La sala se ha cancelado.', '⚠️');
      } else if (
        snapshot.status === 'cancelled' &&
        !current.started &&
        !current.private
      ) {
        stop(false);
        game.toast('El duelo se ha cancelado.', '⚠️');
      }
      if (
        snapshot.status === 'cancelled' &&
        current.started &&
        current.revealed
      )
        update({ result: true, session: { ...current } });
      if (
        snapshot.status === 'done' &&
        current.revealed &&
        (!current.bot || current.error || Date.now() >= current.bot.finishAt)
      )
        update({ result: true, session: { ...current } });
    } catch {
      /* Polling errors are retried on the next interval. */
    } finally {
      current.polling = false;
    }
  }, [
    game.state.store.pid,
    modal,
    update,
    game.sound,
    game.toast,
    stop,
    celebrateDuel,
  ]);

  const rematch = useCallback(async () => {
    const old = session.current;
    if (!old?.private || !old.id) {
      startRoom();
      return;
    }
    const rival = old.rivalName || 'tu amigo';
    try {
      const answer = await rpc<RematchResponse>('duel_rematch', {
        d: old.id,
        pid: old.pid || game.state.store.pid || '',
      });
      if (!alive.current || session.current !== old) return;
      if (!answer || answer.error) {
        startRoom();
        return;
      }
      stop();
      const current: DuelSession = {
        kind: 'online',
        private: true,
        t0: Date.now(),
        id: answer.id,
        rivalName: rival,
      };
      current.pid = old.pid || game.state.store.pid || '';
      current.name = old.name || game.state.store.name || '';
      session.current = current;
      update({
        session: { ...current },
        modal: {
          icon: '🔁',
          title: answer.joined ? '¡Revancha!' : 'Revancha pedida',
          text: answer.joined
            ? 'Preparando el duelo con ' + rival + '…'
            : 'Esperando a que ' +
              rival +
              ' acepte. Le sale en su pantalla al acabar el duelo.',
          buttons: [{ label: 'Cancelar', action: 'cancel', ghost: true }],
        },
      });
    } catch {
      if (alive.current && session.current === old)
        game.toast(
          'No se ha podido pedir la revancha. Revisa la conexión.',
          '⚠️',
        );
    }
  }, [game.state.store.pid, game.toast, startRoom, stop, update]);

  const markProgress = useCallback(
    (current: DuelSession, count: number) => {
      if (!current.id || current.kind !== 'online') return Promise.resolve();
      const key = current.id + ':' + count;
      if (progressSent.current === key) return Promise.resolve();
      progressSent.current = key;
      return rpc('duel_progress', {
        d: current.id,
        pid: current.pid || game.state.store.pid || '',
        n: count,
      }).catch(() => {});
    },
    [game.state.store.pid],
  );
  const submitDuel = useCallback(
    (score: number, slots: Array<[string, number]>) => {
      const current = session.current;
      if (!current || current.submitted) return;
      current.submitted = true;
      current.myScore = Math.round(score);
      current.mySlots = slots;
      const pid = current.pid || game.state.store.pid || '',
        name = current.name || game.state.store.name || '';
      if (current.kind === 'online' && current.id) {
        const botState = current.bot;
        const botSlots = botState?.slots.filter(
          (slot): slot is [string, number] => !!slot,
        );
        const bot = botState
          ? (current.botReq || Promise.reject())
              .catch(() =>
                rpc('duel_bot_submit', {
                  d: current.id!,
                  pid,
                  sc: botState.score,
                  sl: botSlots || [],
                }),
              )
              .catch(() => {})
          : Promise.resolve();
        void markProgress(current, slots.length);
        current.request = bot
          .then(() =>
            rpc<OnlineState>('duel_submit', {
              d: current.id!,
              pid,
              sc: current.myScore!,
              sl: slots,
            }),
          )
          .then((snapshot) => {
            if (session.current === current && snapshot) {
              current.state = snapshot;
              if (current.revealed) celebrateDuel(current);
              update({
                session: { ...current },
                ...(snapshot.status === 'done' &&
                current.revealed &&
                (!current.bot ||
                  current.error ||
                  Date.now() >= current.bot.finishAt)
                  ? { result: true }
                  : {}),
              });
            }
          })
          .catch(() => {
            if (session.current === current) {
              current.error = true;
              update({ session: { ...current } });
            }
          });
      } else if (current.role !== 'rival' && current.code) {
        current.request = rpc('link_create', {
          code: current.code,
          pid,
          n: name,
          sc: current.myScore,
          sl: slots,
        })
          .then(() => {
            if (session.current === current) {
              current.saved = true;
              update({ session: { ...current } });
            }
          })
          .catch(() => {
            if (session.current === current) {
              current.error = true;
              update({ session: { ...current } });
            }
          });
      } else if (current.code) {
        current.request = rpc<LinkCompareData>('link_finish', {
          c: current.code,
          pid,
          sc: current.myScore!,
          sl: slots,
        })
          .then((link) => {
            if (session.current === current) {
              current.link = link || undefined;
              if (current.revealed) celebrateDuel(current);
              update({ session: { ...current } });
            }
          })
          .catch(() => {
            if (session.current === current) {
              current.error = true;
              update({ session: { ...current } });
            }
          });
      }
      update({ session: { ...current }, lastPrivate: !!current.private });
    },
    [
      game.state.store.name,
      game.state.store.pid,
      update,
      celebrateDuel,
      markProgress,
    ],
  );
  const revealDuel = useCallback(() => {
    const current = session.current;
    if (!current || current.revealed) return;
    current.revealed = true;
    celebrateDuel(current);
    update({
      session: { ...current },
      result: true,
      lastPrivate: !!current.private,
    });
    if (current.kind === 'online') void pollOnline();
  }, [celebrateDuel, pollOnline, update]);
  const retry = useCallback(() => {
    const current = session.current;
    if (
      !current ||
      current.kind !== 'enlace' ||
      current.myScore == null ||
      !current.mySlots ||
      !current.error
    )
      return;
    current.error = false;
    current.submitted = false;
    current.revealed = true;
    submitDuel(current.myScore, current.mySlots);
    update({ session: { ...current }, result: true });
  }, [submitDuel, update]);

  const act = useCallback(
    (action: ModalAction) => {
      const current = session.current;
      if (action === 'cancel') stop();
      else if (action === 'close') {
        roomPeekToken.current++;
        linkFetchToken.current++;
        modal(null);
      } else if (action === 'start-online') {
        modal(null);
        startOnline();
      } else if (action === 'start-room') {
        modal(null);
        startRoom();
      } else if (action === 'join-room' && view.modal?.code)
        joinRoom(view.modal.code);
      else if (action === 'accept-link' && view.modal?.code)
        acceptLink(view.modal.code, view.linkData?.creator_name || 'Tu amigo');
      else if (action === 'invite')
        void shareLink(
          baseUrl() + '?online=1',
          '⚔️ Te reto a un duelo en el Reto de los 15.000 goles. Entra y dale a buscar rival:',
        );
      else if (action === 'new-link') startLink();
      else if (action === 'rematch') void rematch();
      else if (action === 'duel-rank') {
        modal(null);
        game.patch({
          view: 'rank',
          rankTab: 'duel',
          scrollRequest: game.state.scrollRequest + 1,
        });
      } else if (action === 'retry') retry();
      else if (action === 'again') {
        if (current?.private) void rematch();
        else if (current?.kind === 'enlace') startLink();
        else startOnline();
      } else if (action === 'home') {
        stop();
        game.goHome();
      } else if (action === 'send') {
        if (current?.kind === 'online' && current.code)
          void shareLink(
            roomUrl(current.code),
            '⚔️ Te reto a un duelo en directo en el Reto de los 15.000 goles. Entra y jugamos a la vez:',
          );
        else if (current?.kind === 'enlace' && current.code)
          void shareLink(
            baseUrl() + '?reto=' + current.code,
            '⚔️ He hecho ' +
              fmt(current.myScore || 0) +
              ' puntos en el Reto de los 15.000 goles. Te tocan mis mismos 17 jugadores. ¿Me ganas?',
          );
        else if (view.modal?.code)
          void shareLink(
            baseUrl() + '?reto=' + view.modal.code,
            '⚔️ Te reto en el Reto de los 15.000 goles: te tocan mis mismos 17 jugadores. ¿Me ganas?',
          );
      }
    },
    [
      acceptLink,
      game.goHome,
      game.patch,
      joinRoom,
      modal,
      rematch,
      retry,
      startOnline,
      startRoom,
      startLink,
      stop,
      view.linkData?.creator_name,
      view.modal,
      view.session,
    ],
  );

  useEffect(() => {
    const current = session.current;
    if (
      !current?.id ||
      current.kind !== 'online' ||
      current.state?.status === 'cancelled' ||
      (!current.private && current.state?.status === 'done')
    )
      return;
    const timer = window.setInterval(() => void pollOnline(), 1500);
    void pollOnline();
    return () => window.clearInterval(timer);
  }, [
    view.session?.id,
    view.session?.state?.status,
    view.session?.private,
    pollOnline,
  ]);
  useEffect(() => {
    const current = session.current;
    if (!current || current.started || current.kind !== 'online' || !current.id)
      return;
    const delay = current.private ? null : 8000 + Math.random() * 8000;
    if (delay === null) return;
    const duelId = current.id,
      pid = current.pid || game.state.store.pid || '';
    const timer = window.setTimeout(() => {
      if (session.current === current && !current.started)
        void rpc('duel_bot', { d: duelId, pid })
          .then(pollOnline)
          .catch(() => {});
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    view.session?.id,
    view.session?.started,
    game.state.store.pid,
    pollOnline,
  ]);
  useEffect(() => {
    const current = session.current;
    if (!current || current.started || current.readyShown) return;
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - current.t0) / 1000);
      update({ searchSeconds: seconds });
      if (seconds === 45 && view.modal?.title === 'Buscando rival')
        modal({
          ...view.modal,
          text: 'Ahora mismo no hay nadie más buscando. Mándale el enlace a alguien: cuando entre y busque, os emparejamos al momento.',
        });
    }, 500);
    return () => window.clearInterval(timer);
  }, [view.session?.id, view.session?.started, view.modal, modal, update]);
  useEffect(() => {
    if (
      view.countdown <= 0 ||
      !view.session?.started ||
      view.session.kind !== 'online'
    )
      return;
    const timer = window.setTimeout(() => {
      const seconds = view.countdown - 1;
      if (seconds > 0) {
        update({ countdown: seconds });
        game.sound?.('skip');
      } else {
        modal(null);
        game.start(false, 'online', session.current?.seed);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [
    view.countdown,
    view.session?.started,
    view.session?.kind,
    game.start,
    game.sound,
    modal,
    update,
  ]);
  useEffect(() => {
    const current = session.current,
      bot = current?.bot;
    if (!current || current.kind !== 'online' || !current.started || !bot)
      return;
    const publish = () => {
      if (session.current !== current) return;
      current.botProgress = bot.times.length;
      if (current.revealed && current.state?.status === 'done') {
        celebrateDuel(current);
        update({ result: true, session: { ...current } });
      } else update({ session: { ...current } });
    };
    const finishIn = bot.finishAt - Date.now();
    if (finishIn <= 0) {
      publish();
      return;
    }
    const interval = window.setInterval(() => {
      if (session.current !== current) return;
      const progress = botProgress(bot);
      if (progress !== current.botProgress) {
        current.botProgress = progress;
        update({ session: { ...current } });
      }
    }, 1500);
    const finishTimer = window.setTimeout(() => {
      window.clearInterval(interval);
      publish();
    }, finishIn);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(finishTimer);
    };
  }, [
    view.session?.id,
    view.session?.started,
    view.session?.bot,
    view.session?.error,
    update,
    celebrateDuel,
  ]);
  useEffect(() => {
    const current = session.current;
    if (
      !current ||
      game.state.view !== 'play' ||
      game.state.mode !== 'online' ||
      current.kind !== 'online' ||
      !current.id ||
      !game.state.game ||
      !['card', 'counting'].includes(game.state.phase || '')
    )
      return;
    const count = game.state.game.slots.filter(Boolean).length;
    if (!count || count >= N) return;
    void markProgress(current, count);
  }, [
    game.state.game?.i,
    game.state.view,
    game.state.mode,
    game.state.phase,
    game.state.store.pid,
    markProgress,
  ]);
  useEffect(() => {
    const current = session.current,
      state = current?.state;
    if (
      !current ||
      !state ||
      state.status !== 'done' ||
      current.kind !== 'online'
    )
      return;
    if (!state.private && !current.topReq) {
      current.topReq = rpc<DuelTopEntry[]>('duel_top')
        .then((top) => {
          if (session.current !== current) return;
          current.topAfter = top || [];
          current.top = current.topAfter;
          update({ session: { ...current }, top: current.topAfter });
        })
        .catch(() => {});
    }
    if (
      current.revealed &&
      (!current.bot || current.error || Date.now() >= current.bot.finishAt)
    )
      update({ result: true });
    if (
      state.rematch &&
      !state.rematch.mine &&
      state.rematch.status === 'waiting' &&
      !current.doneBeep
    ) {
      current.doneBeep = true;
      game.sound?.('big');
    }
  }, [
    view.session?.state?.status,
    view.session?.state?.rematch,
    update,
    game.sound,
  ]);
  const bootActions = useRef({
    loadSeason,
    openRoom,
    openLink,
    modal,
    toast: game.toast,
  });
  bootActions.current = {
    loadSeason,
    openRoom,
    openLink,
    modal,
    toast: game.toast,
  };
  useEffect(() => {
    alive.current = true;
    let startTimer: number | null = null;
    if (!booted.current) {
      startTimer = window.setTimeout(() => {
        if (!alive.current || booted.current) return;
        booted.current = true;
        const params = new URLSearchParams(location.search),
          code = cleanCode(params.get('reto')),
          online = params.has('online'),
          room = cleanCode(params.get('sala'));
        if (code || online || room) {
          try {
            history.replaceState(null, '', baseUrl());
          } catch {
            /* Preserve the current URL if history is unavailable. */
          }
        }
        void bootActions.current
          .loadSeason(!!(code || online || room))
          .then(() => (alive.current ? rpc('bots_tick') : undefined))
          .catch(() => {});
        if (room) void bootActions.current.openRoom(room);
        else if (code) void bootActions.current.openLink(code);
        else if (online)
          bootActions.current.modal({
            icon: '⚔️',
            title: 'Duelo online',
            text: 'Te han invitado a un duelo. Dale a buscar rival y os emparejamos.',
            buttons: [
              { label: 'Buscar rival', action: 'start-online' },
              { label: 'Ahora no', action: 'close', ghost: true },
            ],
          });
        const identity = {
          pid: storeRef.current.pid || '',
          name: storeRef.current.name || '',
        };
        if (identity.pid && identity.name) {
          void rpc<DuelLinkMine>('link_mine', { pid: identity.pid })
            .then((mine) => {
              if (
                !alive.current ||
                !mine ||
                storeRef.current.pid !== identity.pid ||
                storeRef.current.name !== identity.name
              )
                return;
              const latestStore = storeRef.current;
              const seen = {
                ...((latestStore.linkSeen as
                  Record<string, number> | undefined) || {}),
              };
              const notices: {
                key: string;
                name: string;
                score: number;
                creatorScore: number;
              }[] = [];
              (mine.created || []).forEach((created) =>
                (created.plays || [])
                  .filter((play) => play.score != null)
                  .forEach((play) => {
                    const key = created.code + ':' + play.name;
                    if (seen[key]) return;
                    seen[key] = 1;
                    notices.push({
                      key,
                      name: play.name,
                      score: play.score!,
                      creatorScore: created.score,
                    });
                  }),
              );
              if (!notices.length) return;
              const nextStore = { ...latestStore, linkSeen: seen };
              persist(nextStore);
              game.patch({ store: nextStore });
              notices.forEach((notice, index) => {
                const name = notice.name,
                  score = fmt(notice.score),
                  own = fmt(notice.creatorScore);
                const outcome =
                  notice.creatorScore > notice.score
                    ? 'le has ganado'
                    : notice.creatorScore < notice.score
                      ? 'te ha ganado'
                      : 'empate';
                const message =
                  name +
                  ' ha jugado tu reto: ' +
                  score +
                  ' contra tus ' +
                  own +
                  ' · ' +
                  outcome;
                const timer = window.setTimeout(
                  () => {
                    if (
                      alive.current &&
                      storeRef.current.pid === identity.pid &&
                      storeRef.current.name === identity.name
                    )
                      bootActions.current.toast(message, '⚔️', undefined, 3600);
                  },
                  800 + index * 1200,
                );
                bootTimers.current.push(timer);
              });
            })
            .catch(() => {});
        }
      }, 0);
    }
    return () => {
      alive.current = false;
      if (startTimer !== null) clearTimeout(startTimer);
      bootTimers.current.forEach(clearTimeout);
      bootTimers.current = [];
    };
  }, []);
  useEffect(
    () => () => {
      if (pickTimer.current) clearInterval(pickTimer.current);
      pickTimer.current = null;
      if (confettiTimer.current !== null) clearTimeout(confettiTimer.current);
      confettiTimer.current = null;
      const current = session.current;
      if (current?.botTimer) clearTimeout(current.botTimer);
      if (current?.botView) clearTimeout(current.botView);
      session.current = null;
      roomPeekToken.current++;
      linkFetchToken.current++;
      duelTabToken.current++;
    },
    [],
  );
  useEffect(() => {
    const current = session.current;
    if (
      !current ||
      game.state.view !== 'play' ||
      game.state.mode !== 'online' ||
      current.kind !== 'online' ||
      !game.state.game ||
      game.state.phase !== 'card' ||
      !game.state.currentCard
    ) {
      if (pickTimer.current) clearInterval(pickTimer.current);
      pickTimer.current = null;
      return;
    }
    if (pickTimer.current) clearInterval(pickTimer.current);
    let left = PICK_SECS;
    update({ pickLeft: left });
    pickTimer.current = window.setInterval(() => {
      left--;
      update({ pickLeft: left });
      if (left <= 0) {
        if (pickTimer.current) clearInterval(pickTimer.current);
        pickTimer.current = null;
        const free = game.state.game!.slots.flatMap((pick, index) =>
          pick ? [] : [index],
        );
        if (free.length) {
          game.toast('Se acabó el tiempo: jugador colocado al azar', '⏱');
          game.place(free[Math.floor(Math.random() * free.length)]!);
        }
      }
    }, 1000);
    return () => {
      if (pickTimer.current) clearInterval(pickTimer.current);
      pickTimer.current = null;
    };
  }, [
    game.state.game?.i,
    game.state.view,
    game.state.mode,
    game.state.phase,
    game.state.currentCard,
    game.state.game?.slots,
    game.place,
    game.toast,
    update,
  ]);

  const shareCurrent = useCallback(() => act('send'), [act]);
  return {
    view,
    startOnline,
    startRoom,
    joinRoom,
    openRoom,
    startLink,
    openLink,
    acceptLink,
    rematch,
    stop,
    act,
    shareCurrent,
    submitDuel,
    revealDuel,
  };
}
