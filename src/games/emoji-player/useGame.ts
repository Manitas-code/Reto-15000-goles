import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { emojiPlayers as rows } from '../../data/emoji-players';
import {
  getEmojiRanking,
  postEmojiScore,
  registerIdentity,
} from '../../shared/api';
import { readIdentity, saveIdentity } from '../../shared/identity/store';
import {
  dayKey,
  matchesPlayerName,
  normalizePlayerName,
  picksFor,
  type EmojiPlayer,
} from './engine';
import {
  createModel,
  currentDay,
  currentFails,
  findSuggestions,
  PLAYER_COUNT,
  resolveGuess,
  updateStreak,
  weekStart,
  type EmojiStore,
  type GameModel,
} from './model';
import { readEmojiStore, writeEmojiStore } from './persistence';

const players: EmojiPlayer[] = rows.map((row) => ({
  name: row[0],
  emojis: row.slice(1, 5),
  why: row[5] || '',
}));

function madridDay(): Date {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((item) => item.type === type)?.value);
    return new Date(part('year'), part('month') - 1, part('day'));
  } catch {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

function reducer(
  state: GameModel,
  action: Partial<GameModel> & { type: 'patch' },
): GameModel {
  const changes: Partial<GameModel> = { ...action };
  delete (changes as Partial<GameModel> & { type?: 'patch' }).type;
  return { ...state, ...changes };
}

function errorDetails(error: unknown): { status?: number; body?: string } {
  if (!error || typeof error !== 'object') return {};
  const value = error as { status?: unknown; body?: unknown };
  return {
    status: typeof value.status === 'number' ? value.status : undefined,
    body: typeof value.body === 'string' ? value.body : undefined,
  };
}

function sortRows(
  rowsFromApi: { name: string; score: number }[],
  mine: string,
): { name: string; score: number; position: number }[] {
  const totals: Record<string, number> = {};
  for (const row of rowsFromApi)
    totals[row.name] = (totals[row.name] || 0) + (row.score || 0);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const visible = sorted
    .slice(0, 20)
    .map(([name, score], position) => ({ name, score, position }));
  const own = sorted.findIndex(([name]) => name === mine);
  if (own >= 20)
    visible.push({
      name: sorted[own]![0],
      score: sorted[own]![1],
      position: own,
    });
  return visible;
}

function newId(): string {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

export function useGame() {
  const today = useMemo(madridDay, []);
  const picks = useMemo(() => picksFor(today, players), [today]);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createModel(readEmojiStore(), today),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const rankTabRef = useRef(state.rankTab);
  rankTabRef.current = state.rankTab;
  const submitted = useRef(new Set<string>());
  const toastTimer = useRef<number | undefined>(undefined);
  const focusTimer = useRef<number | undefined>(undefined);

  const patch = useCallback((changes: Partial<GameModel>) => {
    dispatch({ type: 'patch', ...changes });
  }, []);

  const day = currentDay(state);
  const index = (day?.res.length ?? 0) - (state.reveal ? 1 : 0);
  const fails = state.reveal ? state.revealFails : currentFails(state);
  const target = picks[index];
  const suggestions = useMemo(
    () =>
      state.phase === 'game' && !state.reveal && state.suggestionsOpen
        ? findSuggestions(
            state.query,
            fails,
            players,
            matchesPlayerName,
            normalizePlayerName,
          )
        : [],
    [fails, state.phase, state.query, state.reveal, state.suggestionsOpen],
  );

  useEffect(() => {
    if (state.phase !== 'game' || state.reveal) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [index, state.phase, state.reveal]);

  useEffect(() => {
    if (!state.nameOpen) return;
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [state.nameOpen]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(focusTimer.current);
    },
    [],
  );

  const loadRanking = useCallback(
    async (tab: 'week' | 'day') => {
      const token = ++requestId.current;
      patch({ rankLoading: true, rankRows: null });
      try {
        const result = await getEmojiRanking(
          tab === 'week'
            ? { period: 'week', weekStart: weekStart(today) }
            : { period: 'day', day: dayKey(today) },
        );
        if (token !== requestId.current) return;
        const identity = readIdentity();
        patch({
          rankRows: sortRows(
            result as { name: string; score: number }[],
            identity.name || '',
          ),
          rankLoading: false,
        });
      } catch {
        if (token === requestId.current)
          patch({ rankRows: null, rankLoading: false });
      }
    },
    [patch, today],
  );

  useEffect(() => {
    let timer = 0;
    timer = window.setTimeout(() => {
      void loadRanking(rankTabRef.current);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current++;
    };
  }, [loadRanking, state.rankTab]);

  const submitScore = useCallback(
    async (store: EmojiStore) => {
      const completed = store.days[state.today];
      if (!completed?.done) return;
      const identity = readIdentity();
      if (!identity.pid || !identity.name) {
        patch({ rankMessage: '', nameOpen: false });
        return;
      }
      if (completed.sent) {
        patch({
          rankMessage: '🌍 Guardado en el ranking como ' + identity.name,
        });
        return;
      }
      const eventId = state.today + ':' + completed.score;
      if (submitted.current.has(eventId)) return;
      submitted.current.add(eventId);
      try {
        await postEmojiScore({
          player_id: identity.pid,
          name: identity.name,
          day: state.today,
          score: completed.score,
        });
        const latestStore = readEmojiStore();
        const next = {
          ...latestStore,
          days: {
            ...latestStore.days,
            [state.today]: { ...completed, sent: true },
          },
        };
        writeEmojiStore(next);
        patch({
          store: next,
          rankMessage:
            '🌍 Guardado en el ranking mundial como ' + identity.name,
        });
        void loadRanking(rankTabRef.current);
      } catch (error) {
        submitted.current.delete(eventId);
        const failure = errorDetails(error);
        const body = failure.body || '';
        const message =
          failure.status === 404 ||
          /42P01|does not exist|schema cache/i.test(body)
            ? 'No se ha podido guardar: falta crear la tabla del ranking en Supabase.'
            : failure.status === 401 ||
                failure.status === 403 ||
                /42501|permission|policy/i.test(body)
              ? 'No se ha podido guardar: la tabla del ranking no tiene permisos.'
              : 'No se ha podido guardar en el ranking (' +
                (failure.status || 'sin conexión') +
                ').';
        patch({ rankMessage: message });
      }
    },
    [loadRanking, patch, state.rankTab, state.today],
  );

  // Retry one previously completed unsent score on page entry, matching the legacy client.
  useEffect(() => {
    const storedDay = state.store.days[state.today];
    const identity = readIdentity();
    if (!storedDay?.done || storedDay.sent || !identity.pid || !identity.name)
      return;
    const timer = window.setTimeout(() => {
      void submitScore(state.store);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []); // The delayed, guarded initial retry must not follow later state changes.

  const start = useCallback(
    (skipName = false) => {
      const current = stateRef.current;
      const identity = readIdentity();
      const existing = current.store.days[current.today];
      if (
        !skipName &&
        (!existing || !existing.done) &&
        (!identity.pid || !identity.name)
      ) {
        patch({ nameOpen: true, name: '', nameError: '' });
        return;
      }
      if (existing?.done) {
        patch({ phase: 'end', review: false });
        if (identity.pid && identity.name) void submitScore(current.store);
        return;
      }
      if (existing && existing.res.length >= PLAYER_COUNT) {
        const next = {
          ...current.store,
          days: {
            ...current.store.days,
            [current.today]: { ...existing, done: true },
          },
        };
        updateStreak(next, today);
        writeEmojiStore(next);
        patch({ store: next, phase: 'end', review: false });
        void submitScore(next);
        return;
      }
      let nextStore = current.store;
      if (!existing) {
        nextStore = {
          ...current.store,
          days: {
            ...current.store.days,
            [current.today]: { res: [], score: 0, done: false },
          },
        };
        writeEmojiStore(nextStore);
      }
      patch({
        store: nextStore,
        phase: 'game',
        query: '',
        suggestionsOpen: false,
        feedback: '',
        feedbackKind: '',
        reveal: false,
        review: false,
        rankMessage: '',
      });
    },
    [patch, submitScore, today],
  );

  const chooseGuess = useCallback(
    (guess: EmojiPlayer | undefined, selectedFromList = false) => {
      const active = state.store.days[state.today];
      if (!active || !target || state.reveal) return;
      if (!guess) {
        patch({
          feedback: 'Elige un jugador de la lista.',
          feedbackKind: 'bad',
        });
        return;
      }
      const result = resolveGuess(active, index, target, guess);
      if (result.result === 'duplicate') {
        patch({
          query: '',
          suggestionsOpen: false,
          feedback: 'Ya lo has probado. Elige otro jugador.',
          feedbackKind: 'bad',
        });
        return;
      }
      const nextStore = {
        ...state.store,
        days: { ...state.store.days, [state.today]: result.day },
      };
      writeEmojiStore(nextStore);
      if (result.result === 'wrong') {
        patch({
          store: nextStore,
          query: '',
          suggestionsOpen: false,
          feedback:
            fails.length === 0
              ? 'No es él. Te quedan 2 intentos.'
              : 'Tampoco. Último intento.',
          feedbackKind: 'bad',
        });
        window.clearTimeout(focusTimer.current);
        focusTimer.current = window.setTimeout(
          () => inputRef.current?.focus(),
          30,
        );
      } else {
        patch({
          store: nextStore,
          query:
            result.result === 'right'
              ? selectedFromList
                ? guess.name
                : state.query
              : '',
          suggestionsOpen: false,
          reveal: true,
          revealFails:
            result.result === 'failed' ? [...fails, guess.name] : fails.slice(),
          feedback:
            result.result === 'right'
              ? '¡Acertaste!'
              : 'Se acabaron los intentos.',
          feedbackKind: result.result === 'right' ? 'good' : 'bad',
        });
      }
    },
    [
      fails.length,
      index,
      patch,
      state.reveal,
      state.query,
      state.store,
      state.today,
      target,
    ],
  );

  const submitQuery = useCallback(() => {
    const picked = suggestions[state.suggestionIndex];
    const exact = players.find(
      (player) =>
        normalizePlayerName(player.name) === normalizePlayerName(state.query),
    );
    const matches = players.filter((player) =>
      matchesPlayerName(state.query, player.name),
    );
    chooseGuess(
      picked || exact || (matches.length === 1 ? matches[0] : undefined),
    );
  }, [chooseGuess, state.query, state.suggestionIndex, suggestions]);

  const nextPlayer = useCallback(() => {
    const active = state.store.days[state.today];
    if (!active || !state.reveal) return;
    if (active.res.length >= PLAYER_COUNT) {
      const next = {
        ...state.store,
        days: { ...state.store.days, [state.today]: { ...active, done: true } },
      };
      updateStreak(next, today);
      writeEmojiStore(next);
      patch({
        store: next,
        phase: 'end',
        review: false,
      });
      void submitScore(next);
      return;
    }
    patch({
      query: '',
      suggestionsOpen: false,
      feedback: '',
      feedbackKind: '',
      reveal: false,
    });
  }, [patch, state.reveal, state.store, state.today, submitScore, today]);

  const toast = useCallback(
    (message: string) => {
      window.clearTimeout(toastTimer.current);
      patch({ toast: message });
      toastTimer.current = window.setTimeout(() => patch({ toast: '' }), 1600);
    },
    [patch],
  );

  const register = useCallback(
    async (rawName: string, forScore = false) => {
      if (state.registrationBusy) return;
      const name = rawName.replace(/\s+/g, ' ').trim().slice(0, 16);
      if (name.length < 2) {
        patch({ nameError: 'Mínimo 2 caracteres.' });
        return;
      }
      patch({ registrationBusy: true, nameError: '', rankMessage: '' });
      const pid = newId();
      try {
        await registerIdentity(pid, name);
        saveIdentity(pid, name);
        patch({
          registrationBusy: false,
          nameOpen: false,
          name: '',
          nameError: '',
        });
        if (!forScore) toast('Nombre registrado: ' + name);
        if (forScore) {
          const current = stateRef.current;
          const active = current.store.days[current.today];
          if (active?.done) void submitScore(current.store);
        } else start();
      } catch (error) {
        patch({
          registrationBusy: false,
          nameError:
            errorDetails(error).status === 409
              ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
              : 'No se ha podido guardar. Revisa la conexión.',
        });
      }
    },
    [
      patch,
      start,
      state.store,
      state.today,
      state.registrationBusy,
      submitScore,
      toast,
    ],
  );

  const changeRankTab = useCallback(
    (rankTab: 'week' | 'day') => {
      if (rankTab === rankTabRef.current) void loadRanking(rankTab);
      else patch({ rankTab });
    },
    [patch, loadRanking],
  );

  return {
    state,
    day,
    index,
    fails,
    target,
    picks,
    inputRef,
    nameInputRef,
    suggestions,
    start,
    chooseGuess,
    submitQuery,
    nextPlayer,
    register,
    changeRankTab,
    toast,
    patch,
  };
}
