import { emojiPlayers } from '../../data/emoji-players';
import { SB_URL, SB_H } from '../../shared/supabase/config';
import { readIdentity, saveIdentity } from '../../shared/identity/store';
import { rpcVoid as sbRpc } from '../../shared/supabase/rpc';
import {
  dayKey,
  matchesPlayerName,
  normalizePlayerName,
  picksFor,
} from './engine';

import { $ } from './dom';

interface StoredDay {
  res: number[];
  score: number;
  done: boolean;
  sent?: boolean;
  cur?: { i: number; fails: string[] };
}
interface EmojiState extends Record<string, unknown> {
  days: Record<string, StoredDay>;
  streak: number;
  lastDone?: string;
}
interface EmojiPlayer {
  name: string;
  emojis: string[];
  why: string;
}
interface ScoreError extends Error {
  status?: number;
  body?: string;
}
interface ScoreRow {
  name: string;
  score: number;
  day: string;
}
function errorDetails(error: unknown): { status?: number; body?: string } {
  if (typeof error !== 'object' || error === null) return {};
  const candidate = error as { status?: unknown; body?: unknown };
  return {
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
    body: typeof candidate.body === 'string' ? candidate.body : undefined,
  };
}
export function initEmojiPlayer() {
  const store = {
    get<T>(key: string): T | null {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? null : (JSON.parse(raw) as T);
      } catch {
        return null;
      }
    },
    set(key: string, value: unknown): void {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Persistir es opcional si el almacenamiento está bloqueado.
      }
    },
  };
  const pad = (n: number) => String(n).padStart(2, '0');
  // El día va por la hora de Madrid: mismo reto y mismo ranking para todo el mundo
  function madridDay() {
    const now = new Date();
    try {
      const p = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Madrid',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(now),
        g = (t: Intl.DateTimeFormatPartTypes) =>
          +p.find((x) => x.type === t)!.value;
      return new Date(g('year'), g('month') - 1, g('day'));
    } catch {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }
  const today = madridDay(),
    TODAY = dayKey(today);
  const fmt = (n: number) => n.toLocaleString('es-ES');
  const POINTS = [600, 400, 200],
    TRIES = 3,
    PER_DAY = 5;

  // ---------- jugadores ----------
  const ALL: EmojiPlayer[] = emojiPlayers.map((r) => ({
    name: r[0],
    emojis: r.slice(1, 5),
    why: r[5] || '',
  }));
  const norm = normalizePlayerName;
  function matches(q: string, p: EmojiPlayer) {
    return matchesPlayerName(q, p.name);
  }

  // ---------- estado ----------
  const SKEY = 'gd_emoji_v1';
  function S(): EmojiState {
    const s = store.get<Partial<EmojiState>>(SKEY) || {};
    s.days = s.days || {};
    s.streak = s.streak || 0;
    return s as EmojiState;
  }
  function saveS(s: EmojiState) {
    store.set(SKEY, s);
  }
  const st = S();
  let day: StoredDay | null = st.days[TODAY] || null;
  const picks = picksFor(today, ALL);
  let cur = 0,
    fails: string[] = [],
    busy = false;
  function currentDay(): StoredDay {
    if (!day) throw new Error('Daily game has not started');
    return day;
  }

  function updateStreak(s: EmojiState) {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    if (s.lastDone === TODAY) return;
    s.streak = s.lastDone === dayKey(y) ? s.streak + 1 : 1;
    s.lastDone = TODAY;
  }
  function renderHome() {
    const language = (window as Window & { FG_LANG?: { get(): string } })
      .FG_LANG;
    $('homeDate').textContent = today.toLocaleDateString(
      language && language.get() === 'en' ? 'en-GB' : 'es-ES',
      { weekday: 'long', day: 'numeric', month: 'long' },
    );
    const s = S(),
      y = new Date(today);
    y.setDate(y.getDate() - 1);
    const sk = s.lastDone === TODAY || s.lastDone === dayKey(y) ? s.streak : 0;
    $('streakLine').textContent = sk
      ? '🔥 Racha: ' + sk + (sk === 1 ? ' día' : ' días')
      : '';
    $('btnStart').textContent = day
      ? day.done
        ? 'Ver mi resultado de hoy'
        : '▶ Continuar el reto de hoy'
      : '▶ Jugar el reto de hoy';
  }
  function start() {
    if (!day) {
      day = { res: [], score: 0, done: false };
      st.days[TODAY] = day;
      saveS(st);
    }
    const current = currentDay();
    if (current.done) {
      showEnd();
      if (current.sent || (me().pid && me().name)) sendScore();
      return;
    }
    if (current.res.length >= PER_DAY) {
      finish();
      return;
    }
    cur = current.res.length;
    $('home').hidden = true;
    $('end').hidden = true;
    $('game').hidden = false;
    renderPlayer();
  }
  function renderDots() {
    const current = currentDay();
    const d = $('dots');
    d.innerHTML = '';
    for (let i = 0; i < PER_DAY; i++) {
      const s = document.createElement('span');
      const r = current.res[i];
      if (r !== undefined)
        s.className = r === 1 ? 'g' : r === 2 ? 'y' : r === 3 ? 'o' : 'k';
      else if (i === cur) s.className = 'now';
      d.appendChild(s);
    }
  }
  function renderPlayer() {
    const current = currentDay();
    fails =
      current.cur && current.cur.i === cur ? current.cur.fails.slice() : [];
    busy = false;
    const p = picks[cur];
    $('idx').textContent = String(cur + 1);
    $('pts').textContent = fmt(current.score);
    renderDots();
    $('emojis').innerHTML = p.emojis
      .map((e) => '<span>' + e + '</span>')
      .join('');
    $('worth').textContent = String(POINTS[fails.length]);
    $('tries')
      .querySelectorAll('span')
      .forEach((x, i) => (x.className = i < fails.length ? 'x' : ''));
    $('guesses').innerHTML = '';
    fails.forEach((n) => {
      $('guesses').appendChild(document.createElement('span')).textContent = n;
    });
    $('fb').textContent = '';
    $('fb').className = 'fb';
    $('reveal').hidden = true;
    $('inp').value = '';
    $('inp').disabled = false;
    $('btnGo').disabled = false;
    hideSug();
    setTimeout(() => $('inp').focus(), 50);
  }
  function hideSug() {
    $('sug').hidden = true;
    $('sug').innerHTML = '';
    sugList = [];
    sugIdx = 0;
  }
  let sugIdx = 0,
    sugList: EmojiPlayer[] = [];
  function showSug() {
    const q = $('inp').value;
    if (norm(q).length < 2) {
      hideSug();
      return;
    }
    sugList = ALL.filter((p) => matches(q, p) && !fails.includes(p.name)).slice(
      0,
      5,
    );
    if (!sugList.length) {
      hideSug();
      return;
    }
    sugIdx = 0;
    const b = $('sug');
    b.innerHTML = '';
    sugList.forEach((p, i) => {
      const x = document.createElement('button');
      x.type = 'button';
      x.textContent = p.name;
      x.className = i === 0 ? 'on' : '';
      x.onclick = () => {
        $('inp').value = p.name;
        hideSug();
        guess(p);
      };
      b.appendChild(x);
    });
    b.hidden = false;
  }
  $('inp').addEventListener('input', showSug);
  $('inp').addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' && sugList.length) {
      sugIdx = (sugIdx + 1) % sugList.length;
      paintSug();
      e.preventDefault();
    } else if (e.key === 'ArrowUp' && sugList.length) {
      sugIdx = (sugIdx - 1 + sugList.length) % sugList.length;
      paintSug();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      $('btnGo').click();
    } else if (e.key === 'Escape') hideSug();
  });
  function paintSug() {
    $('sug')
      .querySelectorAll('button')
      .forEach((b, i) => (b.className = i === sugIdx ? 'on' : ''));
  }
  $('btnGo').addEventListener('click', () => {
    if (busy) return;
    const q = $('inp').value;
    let p =
      !$('sug').hidden && sugList.length
        ? sugList[sugIdx]
        : ALL.find((x) => norm(x.name) === norm(q));
    if (!p) {
      const l = ALL.filter((x) => matches(q, x));
      if (l.length === 1) p = l[0];
    }
    if (!p) {
      $('fb').textContent = 'Elige un jugador de la lista.';
      $('fb').className = 'fb bad';
      return;
    }
    hideSug();
    guess(p);
  });
  function guess(p: EmojiPlayer) {
    if (busy) return;
    const target = picks[cur];
    if (p.name === target.name) {
      resolve(fails.length + 1);
      return;
    }
    if (fails.includes(p.name)) {
      $('inp').value = '';
      $('fb').textContent = 'Ya lo has probado. Elige otro jugador.';
      $('fb').className = 'fb bad';
      return;
    }
    fails.push(p.name);
    currentDay().cur = { i: cur, fails: fails.slice() };
    saveS(st);
    const sp = $('guesses').appendChild(document.createElement('span'));
    sp.textContent = p.name;
    $('tries').querySelectorAll('span')[fails.length - 1].className = 'x';
    $('inp').value = '';
    if (fails.length >= TRIES) {
      resolve(0);
      return;
    }
    $('worth').textContent = String(POINTS[fails.length]);
    $('fb').textContent =
      fails.length === 1
        ? 'No es él. Te quedan 2 intentos.'
        : 'Tampoco. Último intento.';
    $('fb').className = 'fb bad';
    setTimeout(() => $('inp').focus(), 30);
  }
  function resolve(attempt: number) {
    busy = true;
    const p = picks[cur];
    const pts = attempt ? POINTS[attempt - 1] : 0,
      current = currentDay();
    current.res[cur] = attempt;
    current.score += pts;
    delete current.cur;
    saveS(st);
    $('inp').disabled = true;
    $('btnGo').disabled = true;
    $('pts').textContent = fmt(current.score);
    renderDots();
    $('fb').textContent = attempt ? '¡Acertaste!' : 'Se acabaron los intentos.';
    $('fb').className = 'fb ' + (attempt ? 'good' : 'bad');
    $('rvName').textContent = p.name;
    $('rvPts').textContent = attempt
      ? '+' + pts + ' puntos · intento ' + attempt
      : '0 puntos';
    $('rvWhy').textContent = p.why;
    $('btnNext').textContent =
      cur === PER_DAY - 1 ? 'Ver resultado' : 'Siguiente jugador →';
    $('reveal').hidden = false;
  }
  $('btnNext').addEventListener('click', () => {
    cur++;
    if (cur >= PER_DAY) {
      finish();
    } else renderPlayer();
  });
  function finish() {
    currentDay().done = true;
    updateStreak(st);
    saveS(st);
    showEnd();
    sendScore();
  }
  function showEnd() {
    const current = currentDay();
    $('home').hidden = true;
    $('game').hidden = true;
    $('end').hidden = false;
    const g = $('endGrid');
    g.innerHTML = '';
    current.res.forEach((r) => {
      const c = document.createElement('div');
      c.className =
        'cell ' + (r === 1 ? 'g' : r === 2 ? 'y' : r === 3 ? 'o' : 'k');
      c.textContent = r === 1 ? '🟩' : r === 2 ? '🟨' : r === 3 ? '🟧' : '⬛';
      g.appendChild(c);
    });
    $('endPts').textContent = fmt(current.score);
    $('endHits').textContent = String(current.res.filter((r) => r > 0).length);
    $('endStreak').textContent = String(S().streak);
    const rv = $('review');
    rv.innerHTML = '';
    picks.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'reveal';
      const r = current.res[i];
      d.innerHTML =
        '<div class="emoji" style="font-size:26px">' +
        p.emojis.join(' ') +
        '</div><div class="nm">' +
        esc(p.name) +
        '</div><div class="mt">' +
        (r
          ? 'intento ' + r + ' · +' + POINTS[r - 1] + ' puntos'
          : 'no acertado') +
        '</div><p>' +
        esc(p.why) +
        '</p>';
      rv.appendChild(d);
    });
  }
  $('btnReview').addEventListener('click', () => {
    $('review').hidden = !$('review').hidden;
  });
  function shareText() {
    const current = currentDay();
    const sq = current.res
      .map((r) => (r === 1 ? '🟩' : r === 2 ? '🟨' : r === 3 ? '🟧' : '⬛'))
      .join('');
    const d = today.getDate() + '/' + pad(today.getMonth() + 1);
    return (
      'GOALDAY · Emoji Player ' +
      d +
      '\n' +
      sq +
      ' ' +
      fmt(current.score) +
      ' pts' +
      (S().streak > 1 ? ' · 🔥' + S().streak : '') +
      '\n' +
      location.origin +
      location.pathname
    );
  }
  $('btnShare').addEventListener('click', async () => {
    const t = shareText();
    try {
      if (navigator.share) await navigator.share({ text: t });
      else {
        await navigator.clipboard.writeText(t);
        toast('Copiado ✔');
      }
    } catch {
      // Compartir puede cancelarse o no estar disponible.
    }
  });
  function esc(value: unknown): string {
    return String(value).replace(
      /[&<>"']/g,
      (character: string) =>
        (
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          }) as Record<string, string>
        )[character],
    );
  }
  function toast(m: string) {
    const t = $('toast');
    t.textContent = m;
    t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 1600);
  }
  $('btnStart').addEventListener('click', () => {
    if (!day || !day.done) {
      const u = me();
      if (!u.pid || !u.name) {
        $('nameBox').hidden = false;
        $('btnStart').hidden = true;
        setTimeout(() => $('nmIn0').focus(), 50);
        return;
      }
    }
    start();
  });
  $('nmSkip0').addEventListener('click', () => {
    $('nameBox').hidden = true;
    $('btnStart').hidden = false;
    start();
  });
  $('nmIn0').addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') $('nmOk0').click();
  });
  $('nmOk0').addEventListener('click', async () => {
    const n = ($('nmIn0').value || '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (n.length < 2) {
      $('nmErr0').textContent = 'Mínimo 2 caracteres.';
      return;
    }
    $('nmOk0').disabled = true;
    $('nmOk0').textContent = 'Comprobando…';
    $('nmErr0').textContent = '';
    try {
      const pid = newId();
      await sbRpc('register_name', { pid, n });
      saveMe(pid, n);
      toast('Nombre registrado: ' + n);
      $('nameBox').hidden = true;
      $('btnStart').hidden = false;
      start();
    } catch (e) {
      $('nmErr0').textContent =
        errorDetails(e).status === 409
          ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
          : 'No se ha podido guardar. Revisa la conexión.';
    } finally {
      $('nmOk0').disabled = false;
      $('nmOk0').textContent = 'Guardar y jugar';
    }
  });

  // ---------- ranking mundial (Supabase, mismo nombre que el Reto) ----------
  const me = readIdentity;
  const saveMe = saveIdentity;
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      (c: string) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      },
    );
  }
  function weekStart(d: Date) {
    const x = new Date(d);
    const w = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - w);
    return dayKey(x);
  }
  async function postScore() {
    const u = me();
    if (!u.pid || !u.name) return false;
    const r = await fetch(SB_URL + '/rest/v1/emoji_scores', {
      method: 'POST',
      headers: Object.assign(
        { Prefer: 'return=minimal,resolution=merge-duplicates' },
        SB_H,
      ),
      body: JSON.stringify({
        player_id: u.pid,
        name: u.name,
        day: TODAY,
        score: currentDay().score,
      }),
    });
    if (!r.ok) {
      const e = Object.assign(new Error('HTTP ' + r.status), {
        status: r.status,
      }) as ScoreError;
      try {
        e.body = await r.text();
      } catch {
        // Conservamos el error HTTP aunque el cuerpo no pueda leerse.
      }
      throw e;
    }
    return true;
  }
  async function sendScore() {
    if (!day || !day.done) return;
    const current = currentDay();
    if (current.sent) {
      $('rankMsg').textContent = '🌍 Guardado en el ranking como ' + me().name;
      return;
    }
    if (!me().pid || !me().name) {
      askName();
      return;
    }
    try {
      await postScore();
      current.sent = true;
      saveS(st);
      $('rankMsg').textContent =
        '🌍 Guardado en el ranking mundial como ' + me().name;
      renderRank();
    } catch (e) {
      const failure = errorDetails(e),
        b = failure.body || '';
      $('rankMsg').textContent =
        failure.status === 404 || /42P01|does not exist|schema cache/i.test(b)
          ? 'No se ha podido guardar: falta crear la tabla del ranking en Supabase.'
          : failure.status === 401 ||
              failure.status === 403 ||
              /42501|permission|policy/i.test(b)
            ? 'No se ha podido guardar: la tabla del ranking no tiene permisos.'
            : 'No se ha podido guardar en el ranking (' +
              (failure.status || 'sin conexión') +
              ').';
    }
  }
  function askName() {
    $('rankMsg').innerHTML =
      'Elige tu nombre para salir en el ranking mundial:<div class="namebox"><input id="nmIn" maxlength="16" placeholder="Tu nombre"><button class="btn small" id="nmOk">Guardar</button></div><div id="nmErr" class="sm"></div>';
    $('nmOk').onclick = async () => {
      const n = ($('nmIn').value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 16);
      if (n.length < 2) {
        $('nmErr').textContent = 'Mínimo 2 caracteres.';
        return;
      }
      $('nmOk').disabled = true;
      try {
        const pid = newId();
        await sbRpc('register_name', { pid, n });
        saveMe(pid, n);
        sendScore();
      } catch (e) {
        $('nmOk').disabled = false;
        $('nmErr').textContent =
          errorDetails(e).status === 409
            ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
            : 'No se ha podido guardar. Revisa la conexión.';
      }
    };
  }
  let rankTab = 'week',
    rankReq = 0;
  $('tabWeek').onclick = () => {
    rankTab = 'week';
    $('tabWeek').className = 'on';
    $('tabDay').className = '';
    renderRank();
  };
  $('tabDay').onclick = () => {
    rankTab = 'day';
    $('tabDay').className = 'on';
    $('tabWeek').className = '';
    renderRank();
  };
  async function renderRank() {
    const ul = $('rankList'),
      tok = ++rankReq;
    ul.innerHTML = '<li class="muted">Cargando…</li>';
    try {
      const q =
        rankTab === 'week' ? 'day=gte.' + weekStart(today) : 'day=eq.' + TODAY;
      const r = await fetch(
        SB_URL +
          '/rest/v1/emoji_scores?select=name,score,day&' +
          q +
          '&limit=5000',
        { headers: SB_H },
      );
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = (await r.json()) as ScoreRow[],
        sum: Record<string, number> = {};
      if (tok !== rankReq) return;
      rows.forEach((x) => {
        sum[x.name] = (sum[x.name] || 0) + (x.score || 0);
      });
      const list = Object.entries(sum).sort((a, b) => b[1] - a[1]);
      ul.innerHTML = '';
      if (!list.length) {
        ul.innerHTML =
          '<li class="muted">Todavía no hay nadie. ¡Sé el primero!</li>';
        return;
      }
      const my = me().name;
      list.slice(0, 20).forEach(([n, s], i) => {
        const li = document.createElement('li');
        li.className = n === my ? 'me' : '';
        li.innerHTML =
          '<span><span class="n">' +
          (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) +
          '</span>' +
          esc(n) +
          '</span><span>' +
          fmt(s) +
          '</span>';
        ul.appendChild(li);
      });
      const pos = list.findIndex(([n]) => n === my);
      if (pos >= 20) {
        const li = document.createElement('li');
        li.className = 'me';
        li.innerHTML =
          '<span><span class="n">' +
          (pos + 1) +
          '</span>' +
          esc(my) +
          '</span><span>' +
          fmt(list[pos][1]) +
          '</span>';
        ul.appendChild(li);
      }
    } catch {
      if (tok === rankReq)
        ul.innerHTML =
          '<li class="muted">Ranking no disponible ahora mismo.</li>';
    }
  }
  renderHome();
  renderRank();
  // la fecha de la portada, ya con el idioma de lang.js
  document.addEventListener('DOMContentLoaded', renderHome);
  // si el resultado de hoy no llegó al ranking (sin conexión), se reintenta
  if (day && day.done && !day.sent && me().pid && me().name) sendScore();
}
