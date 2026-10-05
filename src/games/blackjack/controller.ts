import { $ } from './dom';
import { players } from '../../data/players';
import { extraPlayers } from '../../data/extra-players';
import { readIdentity, saveIdentity } from '../../shared/identity/store';
import {
  registerIdentity,
  getBlackjackRanking,
  postBlackjackScore,
} from '../../shared/api';
import { payoutFor, type HandOutcome } from './engine';
import type { RpcError } from '../../shared/supabase/rpc';
import type {
  BlackjackPlayer,
  Mode,
  Stats,
  DailyResult,
  SyncResult,
  HandSource,
  ScoreRow,
  RemoteError,
} from './state';

export function initBlackjack() {
  const store = {
    get<T>(k: string): T | null {
      try {
        return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null;
      } catch {
        return null;
      }
    },
    set(k: string, v: unknown) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {
        /* Storage is best-effort. */
      }
    },
  };
  const fmt = (n: number) => n.toLocaleString('es-ES');
  const POS_SHORT = { DEF: 'Defensa', MED: 'Medio', DEL: 'Delantero' };
  const P: BlackjackPlayer[] = [...players, ...extraPlayers];
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function share(t: string, el?: HTMLElement) {
    try {
      if (navigator.share) await navigator.share({ text: t });
      else {
        await navigator.clipboard.writeText(t);
        if (el) el.textContent = 'Copiado ✔';
      }
    } catch {
      /* Preserve best-effort behavior. */
    }
  }
  const esc = (x: unknown) =>
    String(x).replace(
      /[&<>"']/g,
      (c) =>
        (
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          }) as Record<string, string>
        )[c],
    );
  const LOGO = document.querySelector('.gdlogo svg')?.outerHTML || '';

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  function toast(m: string) {
    const t = $('toast');
    t.textContent = m;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  function dayKey(d: Date) {
    return (
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    );
  }
  // El día va por la hora de Madrid: mismo reto diario y mismo ranking para todo el mundo
  function madridDay() {
    const now = new Date();
    try {
      const p = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Madrid',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(now),
        g = (t: string) => +p.find((x) => x.type === t)!.value;
      return new Date(g('year'), g('month') - 1, g('day'));
    } catch {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }
  const today = madridDay(),
    TODAY = dayKey(today);
  function seeded(seedStr: string) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }
  const dmy = (d: Date, y?: number) =>
    pad(d.getDate()) +
    '/' +
    pad(d.getMonth() + 1) +
    (y ? '/' + d.getFullYear() : '');
  const manos = (n: number) => n + (n === 1 ? ' mano' : ' manos');

  // Modalidades. En cada mano sale un objetivo al azar entre lo y hi; la banca se planta al llegar al sf del objetivo.
  // Te reparten 2 jugadores de salida que nunca se pasan del objetivo.
  // Equilibrio (elegido con simulaciones, partidas cortas con apuesta fija): en Carrera la banca se planta
  // antes (80 % del objetivo) y en Selección los objetivos son más altos (100-150), así que la banca gana más a menudo.
  // A ciegas se pierde claramente, y el ranking lo deciden quienes saben de fútbol, no quien se lo juega todo a una mano.
  const MODES: Mode[] = [
    {
      k: 'carrera',
      n: 'Carrera',
      t: 'Goles en toda su carrera',
      lo: 600,
      hi: 1500,
      step: 50,
      sf: 0.8,
    },
    {
      k: 'seleccion',
      n: 'Selección',
      t: 'Goles con su selección',
      lo: 100,
      hi: 150,
      step: 5,
      sf: 0.75,
    },
  ];
  // Partida de ~1 minuto: 7 manos, 1.000 fichas de salida y apuesta fija de 100, 200 o 300 (doblar solo afecta a esa mano).
  // Con menos de 100 fichas la partida se acaba antes. La puntuación son las fichas finales.
  // (Las claves gd_bj10_* son internas y se mantienen aunque ahora sean 7 manos.)
  // Tras cada mano se pasa sola a la siguiente (o al resultado) a los AUTO ms; un toque lo adelanta.
  const START = 1000,
    HANDS = 7,
    AUTO = 1500,
    BETS = [100, 200, 300],
    MINBET = BETS[0],
    LIMIT = 10000,
    SKEY = 'gd_bj10_stats',
    DKEY = 'gd_bj10_daily';
  const CHIP_COLORS = ['#1f5fbf', '#1d8a4e', '#c8322a', '#16110b'];
  let gen = 0,
    T = 0,
    STAND = 0,
    mode = 'free',
    chips = 0,
    hand = 0,
    bet = MINBET,
    busy = false,
    doubled = false;
  let nextT: ReturnType<typeof setTimeout> | 0 = 0;
  let M!: Mode;
  let src!: HandSource;
  let deck: BlackjackPlayer[] = [];
  let pc: BlackjackPlayer[] = [];
  let dc: BlackjackPlayer[] = [];
  let nextCard: BlackjackPlayer | null = null;
  let log: string[] = [];

  // ---- ranking mundial (Supabase, mismo proyecto y mismo nombre que el resto de juegos de GOALDAY) ----
  const me = readIdentity;
  const saveMe = saveIdentity;
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
  }
  // 409 = ya estaba guardado (un solo resultado por jugador y día en el reto diario)
  async function postScore(o: ScoreRow) {
    const u = me();
    if (!u.pid || !u.name) return false;
    await postBlackjackScore({
      player_id: u.pid,
      name: u.name,
      ...o,
      mode: o.mode as 'diario' | 'carrera' | 'seleccion',
    });
    return true;
  }
  function errMsg(error: unknown) {
    const e = error as Partial<RemoteError>;
    const b = e.body || '';
    return e.status === 404 || /42P01|does not exist|schema cache/i.test(b)
      ? 'No se ha podido guardar: falta crear la tabla del ranking en Supabase.'
      : e.status === 401 ||
          e.status === 403 ||
          /42501|permission|policy/i.test(b)
        ? 'No se ha podido guardar: la tabla del ranking no tiene permisos.'
        : 'No se ha podido guardar en el ranking (' +
          (e.status || 'sin conexión') +
          ').';
  }
  const savedMsg = () => '🌍 Guardado en el ranking mundial como ' + me().name;
  // Reto diario: {'2026-09-25':{start:1,done:1,chips:1400,sent:1}}. Empezar ya cuenta como jugado.
  const daily = () => store.get<Record<string, DailyResult>>(DKEY) || {};
  function setDaily(d: string, o: Partial<DailyResult>) {
    const all = daily();
    all[d] = Object.assign(all[d] || {}, o);
    const ks = Object.keys(all).sort();
    while (ks.length > 7) delete all[ks.shift()!];
    store.set(DKEY, all);
    return all[d];
  }
  let sendingDaily = 0;
  async function sendDaily(d: string, rm?: HTMLElement) {
    const x = daily()[d];
    if (!x || !x.done) return;
    if (x.sent) {
      if (rm) rm.textContent = savedMsg();
      return;
    }
    if (!me().pid || !me().name) {
      if (rm) askName(rm, () => sendDaily(d, rm));
      return;
    }
    if (sendingDaily) return;
    sendingDaily = 1;
    if (rm) rm.textContent = 'Guardando en el ranking mundial…';
    try {
      await postScore({ mode: 'diario', day: d, chips: x.chips || 0 });
      setDaily(d, { sent: 1 });
      if (rm) rm.textContent = savedMsg();
      renderRank();
    } catch (e) {
      if (rm) rm.textContent = errMsg(e);
    } finally {
      sendingDaily = 0;
    }
  }
  // Récords de las partidas libres: se sube el mejor de cada modalidad que aún no esté en el ranking.
  // En cola, para no subir dos veces el mismo récord; se relee stats() tras el await (una partida puede haber guardado algo).
  let syncQ = Promise.resolve<SyncResult>({ done: {}, errs: {} });
  async function doSync() {
    const u = me(),
      s = stats(),
      done: Record<string, number> = {},
      errs: Record<string, unknown> = {};
    const pend = MODES.filter((m) => (s.best[m.k] || 0) > (s.sent[m.k] || 0));
    if (!pend.length || !u.pid || !u.name) return { done, errs };
    for (const m of pend) {
      const v = s.best[m.k];
      try {
        await postScore({ mode: m.k, chips: v });
        done[m.k] = v;
      } catch (e) {
        errs[m.k] = e;
      }
    }
    if (Object.keys(done).length) {
      const s2 = stats();
      for (const k in done) s2.sent[k] = Math.max(s2.sent[k] || 0, done[k]);
      store.set(SKEY, s2);
      renderRank();
    }
    return { done, errs };
  }
  const syncBest = () => (syncQ = syncQ.then(doSync, doSync));
  function saveBest(k: string, rm: HTMLElement) {
    rm.textContent = 'Guardando en el ranking mundial…';
    syncBest().then((r) => {
      rm.textContent = r.errs[k] ? errMsg(r.errs[k]) : savedMsg();
    });
  }
  function nameLine(k: string, rm: HTMLElement) {
    rm.innerHTML =
      '<div>Elige tu nombre para salir en el ranking</div><button class="btn small ghost" id="bName" style="margin-top:8px">Elegir nombre</button>';
    rm.querySelector<HTMLButtonElement>('#bName')!.onclick = () =>
      askName(rm, () => saveBest(k, rm));
  }
  function askName(rm: HTMLElement, then: () => void) {
    rm.innerHTML = `Elige tu nombre para salir en el ranking mundial:<div class="namebox"><input id="nmIn" maxlength="16" placeholder="Tu nombre"><button class="btn small" id="nmOk">Guardar</button></div><div id="nmErr" class="sm"></div>`;
    const inp = rm.querySelector<HTMLInputElement>('#nmIn')!,
      ok = rm.querySelector<HTMLButtonElement>('#nmOk')!,
      er = rm.querySelector<HTMLElement>('#nmErr')!;
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') ok.click();
    };
    setTimeout(() => inp.focus(), 50);
    ok.onclick = async () => {
      const n = (inp.value || '').replace(/\s+/g, ' ').trim().slice(0, 16);
      if (n.length < 2) {
        er.textContent = 'Mínimo 2 caracteres.';
        return;
      }
      ok.disabled = true;
      try {
        const pid = newId();
        await registerIdentity(pid, n);
        saveMe(pid, n);
        then();
      } catch (e) {
        ok.disabled = false;
        er.textContent =
          (e as Partial<RpcError>).status === 409
            ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
            : 'No se ha podido guardar. Revisa la conexión.';
      }
    };
  }
  const RTABS = [{ k: 'diario', n: 'Hoy' }].concat(
    MODES.map((m) => ({ k: m.k, n: m.n })),
  );
  let rankTab = 'diario',
    rankReq = 0;
  async function renderRank() {
    $('rTabs').innerHTML = RTABS.map(
      (t) =>
        `<button data-r="${t.k}" class="${t.k === rankTab ? 'on' : ''}">${t.n}</button>`,
    ).join('');
    $('rTabs')
      .querySelectorAll<HTMLButtonElement>('[data-r]')
      .forEach(
        (b) =>
          (b.onclick = () => {
            rankTab = b.dataset.r!;
            renderRank();
          }),
      );
    const ul = $('rankList'),
      tok = ++rankReq;
    ul.innerHTML = '<p class="muted">Cargando…</p>';
    try {
      const rows = await getBlackjackRanking<{ name: string; chips: number }>(
        rankTab === 'diario'
          ? { tab: 'diario', day: TODAY }
          : { tab: rankTab as 'carrera' | 'seleccion' },
      );
      if (tok !== rankReq) return;
      // un nombre por fila, con sus mejores fichas
      const best: Record<string, number> = {};
      rows.forEach((x) => {
        if (!(x.name in best) || x.chips > best[x.name]) best[x.name] = x.chips;
      });
      const list = Object.entries(best).sort((a, b) => b[1] - a[1]),
        my = me().name;
      if (!list.length) {
        ul.innerHTML =
          '<p class="muted">Todavía no hay nadie. ¡Sé el primero!</p>';
        return;
      }
      const row = ([n, v]: [string, number], i: number) =>
        `<div class="rrow${n === my ? ' me' : ''}"><span class="n">${i + 1}</span><span>${esc(n)}</span><span class="c">${fmt(v)}</span></div>`;
      const pos = my ? list.findIndex(([n]) => n === my) : -1;
      ul.innerHTML =
        list.slice(0, 10).map(row).join('') +
        (pos >= 10 ? row(list[pos], pos) : '');
    } catch {
      if (tok === rankReq)
        ul.innerHTML =
          '<p class="muted">Ranking no disponible ahora mismo.</p>';
    }
  }

  // ---- cartas ----
  const PART = /^(van|von|der|den|de|di|del|della|da|dos|das|le|la)$/i;
  function splitName(n: string): [string, string] {
    const nick = n.match(/«(.+?)»/);
    if (nick) return ['', nick[1]];
    const w = n.split(' ');
    if (w.length === 1) return ['', n];
    let i = w.length - 1;
    while (i > 1 && PART.test(w[i - 1])) i--;
    return [w.slice(0, i).join(' '), w.slice(i).join(' ')];
  }
  function lnSize(t: string, big: boolean) {
    const L = t.length;
    const b = L <= 5 ? 17 : L <= 7 ? 15 : L <= 9 ? 13 : L <= 11 ? 11.5 : 10;
    return (big ? b * 1.35 : b).toFixed(1);
  }
  function cardHTML(
    p: BlackjackPlayer,
    { show = true, down = false, big = false, cls = '' } = {},
  ) {
    const [fn, ln] = splitName(p.name),
      g = show ? fmt(V(p)) : '?';
    return `<div class="card${big ? ' big' : ''}${down ? ' down' : ''} ${cls}"><div class="in">
    <div class="f"><div class="idx tl${show ? '' : ' unk'}"><b>${g}</b></div>
      <div class="c"><div class="fl">${p.flag}</div>${fn ? `<div class="fn">${esc(fn)}</div>` : ''}<div class="ln" style="font-size:${lnSize(ln, big)}px">${esc(ln)}</div><div class="ps">${POS_SHORT[p.pos] || ''}</div></div>
      <div class="idx br${show ? '' : ' unk'}"><b>${g}</b></div></div>
    <div class="b">${LOGO}</div></div></div>`;
  }
  const backHTML = (cls = '') =>
    `<div class="card down ${cls}"><div class="in"><div class="f"></div><div class="b">${LOGO}</div></div></div>`;
  function addCard(box: HTMLElement, html: string) {
    const t = document.createElement('div');
    t.innerHTML = html.trim();
    const el = t.firstElementChild! as HTMLElement;
    box.appendChild(el);
    fitHand(box);
    return el;
  }
  function fitHand(box: HTMLElement) {
    const n = box.children.length;
    box.style.setProperty(
      '--ov',
      n >= 8
        ? '-60px'
        : n >= 7
          ? '-56px'
          : n >= 6
            ? '-52px'
            : n >= 5
              ? '-46px'
              : n >= 4
                ? '-38px'
                : '-30px',
    );
  }

  function stats() {
    const s = store.get<Stats>(SKEY) || ({} as Stats);
    s.best = s.best || {};
    s.sent = s.sent || {};
    s.games = s.games || 0;
    s.hands = s.hands || 0;
    return s;
  }
  const dayMsg = (dd: DailyResult) =>
    dd.done
      ? 'Hoy: ' + fmt(dd.chips || 0) + ' fichas · vuelve mañana'
      : 'Hoy lo dejaste a medias · vuelve mañana';
  function renderHome() {
    const s = stats(),
      dd = daily()[TODAY];
    const pick = (n: string) => P.find((p) => p.name === n);
    M = MODES[0];
    const h = [pick('Lionel Messi'), pick('Cristiano Ronaldo')].filter(Boolean);
    $('hero').innerHTML =
      (h[0] ? cardHTML(h[0]) : '') +
      (h[1] ? cardHTML(h[1], { show: false }) : '') +
      backHTML();
    $('modesBox').innerHTML =
      `<button class="mode gold day${dd ? ' done' : ''}" id="bDaily"><b>📅 Reto diario</b><span>Goles en toda su carrera. Las mismas 7 manos para todo el mundo. Un solo intento al día.${dd ? '<br>' + dayMsg(dd) : ''}</span></button>` +
      MODES.map(
        (c) =>
          `<button class="mode" data-m="${c.k}"><b>▶ ${c.n}</b><span>${c.t}. Objetivo entre ${fmt(c.lo)} y ${fmt(c.hi)}.<br>Récord: ${fmt(s.best[c.k] || 0)} fichas</span></button>`,
      ).join('');
    $('bDaily').onclick = startDaily;
    document
      .querySelectorAll<HTMLButtonElement>('[data-m]')
      .forEach((b) => (b.onclick = () => start(b.dataset.m!)));
    const best = Math.max(0, ...Object.values(s.best));
    $('homeStats').innerHTML =
      `<div class="stat"><b>${fmt(best)}</b><span>Récord de fichas</span></div><div class="stat"><b>${s.games}</b><span>Partidas</span></div><div class="stat"><b>${s.hands}</b><span>Manos</span></div>`;
    renderRank();
    syncBest();
  }
  function startDaily() {
    const dd = daily()[TODAY];
    if (dd) {
      toast(dayMsg(dd));
      return;
    }
    start('carrera', true);
  }
  function shuffle<T>(a: T[]): T[] {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const V = (p: BlackjackPlayer): number => p[M.k]!;
  const total = (cs: BlackjackPlayer[]) => cs.reduce((s, p) => s + V(p), 0);
  const cardPool = () => P.filter((p) => typeof V(p) === 'number' && V(p) >= 1);
  function draw() {
    if (!deck.length) deck = shuffle(cardPool());
    return deck.pop()!;
  }
  // Mano libre: objetivo al azar y cartas de la baraja barajada. Tus dos cartas de salida nunca se pasan del objetivo.
  function freeHand() {
    T = Math.round((M.lo + Math.random() * (M.hi - M.lo)) / M.step) * M.step;
    let a = draw(),
      b = draw();
    for (let k = 0; k < 200 && V(a) + V(b) > T; k++) {
      a = draw();
      b = draw();
    }
    return { pair: [a, b], p: draw, d: draw };
  }
  // Mano del reto diario: igual para todo el mundo decidas lo que decidas. Cada mano tiene tres generadores con semilla
  // (objetivo, tus cartas y las de la banca): cuántas cartas cojas no cambia ni las de la banca ni las de la mano siguiente.
  // Tus cartas son siempre la misma lista (las 2 de salida y luego las que te van ofreciendo, en orden);
  // la banca no repite ninguna de las 20 primeras de esa lista.
  function dailyHand(i: number) {
    const s = 'bj-' + TODAY + '-' + i,
      rt = seeded(s + '-t'),
      rp = seeded(s + '-p'),
      rd = seeded(s + '-d'),
      pool = cardPool();
    const one = (r: () => number, skip: Set<string>): BlackjackPlayer => {
      let c!: BlackjackPlayer;
      for (let k = 0; k < 60; k++) {
        c = pool[Math.floor(r() * pool.length)];
        if (!skip.has(c.name)) break;
      }
      return c;
    };
    T = Math.round((M.lo + rt() * (M.hi - M.lo)) / M.step) * M.step;
    let a = one(rp, new Set()),
      b = one(rp, new Set([a.name]));
    for (let k = 0; k < 200 && V(a) + V(b) > T; k++) {
      a = one(rp, new Set());
      b = one(rp, new Set([a.name]));
    }
    const used = new Set([a.name, b.name]),
      seq: BlackjackPlayer[] = [],
      more = () => {
        const c = one(rp, used);
        used.add(c.name);
        seq.push(c);
      };
    for (let k = 0; k < 20; k++) more();
    const dUsed = new Set(used);
    let n = 0;
    return {
      pair: [a, b],
      p: () => {
        if (n >= seq.length) more();
        return seq[n++];
      },
      d: () => {
        const c = one(rd, dUsed);
        dUsed.add(c.name);
        return c;
      },
    };
  }
  function setChips(v: number, anim: boolean) {
    const el = $('chips'),
      from = chips;
    chips = v;
    const box = $('hudChips');
    if (!anim) {
      el.textContent = fmt(v);
      box.className = 'hud-chips';
      return;
    }
    box.className = 'hud-chips ' + (v > from ? 'up' : 'down');
    const t0 = performance.now();
    const f = () => {
      const k = Math.min(1, (performance.now() - t0) / 700);
      el.textContent = fmt(
        Math.round(from + (v - from) * (1 - Math.pow(1 - k, 3))),
      );
      if (k < 1) requestAnimationFrame(f);
      else setTimeout(() => (box.className = 'hud-chips'), 900);
    };
    f();
  }
  function setTot(id: string, v: string, cls?: string) {
    const e = $(id);
    e.textContent = v;
    e.className = 'tot' + (cls ? ' ' + cls : '');
  }
  function stackHTML(v: number) {
    const n = Math.min(
      5,
      Math.max(1, Math.round(Math.log2(Math.max(1, v / MINBET)) + 1)),
    );
    let s = '';
    for (let i = 0; i < n; i++)
      s += `<span class="cchip" style="--c:${CHIP_COLORS[i % 4]}"></span>`;
    return `<div class="stack">${s}</div>`;
  }
  function feltHTML() {
    return `<div class="felt-t"><b>Objetivo ${fmt(T)}</b><small>La banca se planta en ${fmt(STAND)}</small></div>`;
  }
  const spotHTML = () =>
    `<div class="spot">${stackHTML(bet)}<b>${fmt(bet)}</b></div>`;

  // Esperas de la animación: si mientras tanto se sale a inicio o empieza otra partida (gen cambia), se corta.
  const pause = (ms: number) => {
    const g = gen;
    return wait(ms).then(() => g === gen);
  };
  function clearNext() {
    clearTimeout(nextT);
    nextT = 0;
  }
  function start(k: string, isDaily?: boolean) {
    tReset();
    clearNext();
    gen++;
    mode = isDaily ? 'daily' : 'free';
    M = isDaily ? MODES[0] : MODES.find((x) => x.k === k) || MODES[0];
    if (isDaily) setDaily(TODAY, { start: 1 });
    deck = isDaily ? [] : shuffle(cardPool());
    hand = 0;
    log = [];
    doubled = false;
    setChips(START, false);
    bet = MINBET;
    document.body.classList.add('playing');
    $('home').hidden = true;
    $('res').hidden = true;
    $('game').hidden = false;
    $('cat').textContent = isDaily ? 'Reto diario' : M.n;
    betPhase();
  }
  // Cada mano se prepara una sola vez (objetivo y cartas); cambiar la apuesta no la vuelve a sortear.
  function betPhase() {
    tReset();
    clearNext();
    pc = [];
    dc = [];
    nextCard = null;
    busy = false;
    src = mode === 'daily' ? dailyHand(hand) : freeHand();
    STAND = Math.round((T * M.sf) / M.step) * M.step;
    $('dCards').innerHTML = '';
    $('pCards').innerHTML = '';
    setTot('dSum', '–');
    setTot('pSum', '–');
    $('handLbl').textContent = String(hand + 1);
    if (bet > chips) bet = BETS.filter((v) => v <= chips).pop() || MINBET;
    renderBet();
  }
  function renderBet() {
    $('mid').innerHTML = feltHTML() + spotHTML();
    $('act').innerHTML =
      `<div class="chips-row">${BETS.map((v, i) => `<button class="pchip${v === bet ? ' on' : ''}" style="--c:${CHIP_COLORS[i]}" data-b="${v}"${v > chips ? ' disabled' : ''}><span>${fmt(v)}</span></button>`).join('')}</div>
    <button class="bigbtn" id="bDeal">Repartir</button>`;
    document.querySelectorAll<HTMLButtonElement>('[data-b]').forEach(
      (b) =>
        (b.onclick = () => {
          const v = +b.dataset.b!;
          if (busy || v > chips) return;
          bet = v;
          renderBet();
        }),
    );
    $('bDeal').onclick = deal;
  }
  async function deal() {
    if (busy) return;
    busy = true;
    $('act').innerHTML = '<div class="wait">Repartiendo…</div>';
    $('mid').innerHTML = feltHTML() + spotHTML();
    const [a, b] = src.pair;
    pc = [a];
    addCard($('pCards'), cardHTML(pc[0], { cls: 'deal' }));
    setTot('pSum', fmt(total(pc)));
    if (!(await pause(220))) return;
    dc = [src.d()];
    addCard($('dCards'), cardHTML(dc[0], { cls: 'deal' }));
    setTot('dSum', fmt(V(dc[0])) + '+');
    if (!(await pause(220))) return;
    pc.push(b);
    addCard($('pCards'), cardHTML(pc[1], { cls: 'deal' }));
    setTot('pSum', fmt(total(pc)), total(pc) > T ? 'bust' : '');
    if (!(await pause(220))) return;
    dc.push(src.d());
    addCard($('dCards'), cardHTML(dc[1], { down: true, cls: 'deal' }));
    if (!(await pause(260))) return;
    busy = false;
    if (total(pc) > T) {
      busy = true;
      return settle('bust');
    }
    if (total(pc) === T) {
      busy = true;
      return dealerPlay(true);
    }
    offer();
  }
  function offer() {
    nextCard = src.p();
    const canDouble = chips >= bet * 2;
    $('mid').innerHTML = `<div class="felt-t"><b>Objetivo ${fmt(T)}</b></div>
    <div class="nextbox"><div class="q">¿Lo coges?<b class="tsec" id="tSec">10</b></div>${cardHTML(nextCard, { show: false, big: true, cls: 'pop' })}<div class="minispot">${stackHTML(bet)}${fmt(bet)}</div></div>`;
    $('act').innerHTML =
      `<div class="acts3"><button class="t" id="bTake">✔ Lo cojo<small>suma sus goles</small></button><button class="s" id="bStand">✋ Me planto<small>juega la banca</small></button><button class="d" id="bDouble" ${canDouble ? '' : 'disabled'}>×2 Doblo<small>lo cojo y me planto</small></button></div>`;
    $('bTake').onclick = () => take(false);
    $('bStand').onclick = () => stand(false);
    $('bDouble').onclick = () => take(true);
    tStart();
  }
  // ---- reloj: 10 s por decisión, con hora límite (no se para aunque cambies de pestaña) ----
  let tEnd = 0,
    tRAF = 0;
  let tTO: ReturnType<typeof setTimeout> | 0 = 0;
  const tLeft = () => tEnd - performance.now();
  function tShow(ms: number) {
    const low = ms <= 3000,
      b = $('tBar'),
      t = $('tSec');
    b.hidden = false;
    b.style.transform = 'scaleX(' + Math.max(0, ms / LIMIT) + ')';
    b.classList.toggle('low', low);
    if (t) {
      t.className = 'tsec' + (low ? ' low' : '');
      t.textContent = String(Math.max(0, Math.ceil(ms / 1000)));
    }
  }
  function tStart() {
    tStop();
    tEnd = performance.now() + LIMIT;
    tTO = setTimeout(() => {
      if (tEnd) timeUp();
    }, LIMIT);
    tDraw();
  }
  function tDraw() {
    tRAF = 0;
    if (!tEnd) return;
    const l = tLeft();
    if (l <= 0) {
      timeUp();
      return;
    }
    tShow(l);
    tRAF = requestAnimationFrame(tDraw);
  }
  function tStop() {
    clearTimeout(tTO);
    if (tRAF) cancelAnimationFrame(tRAF);
    tEnd = 0;
    tTO = tRAF = 0;
  }
  function tReset() {
    tStop();
    $('tBar').hidden = true;
    $('tBar').classList.remove('low');
  }
  document.addEventListener('visibilitychange', () => {
    if (tEnd && tLeft() <= 0) timeUp();
  });
  // sin decidir a tiempo, te plantas
  function timeUp() {
    if (busy || !tEnd) return;
    tShow(0);
    stand(true);
  }
  async function take(dbl: boolean) {
    if (busy) return;
    if (tEnd && tLeft() <= 0) {
      timeUp();
      return;
    }
    if (dbl && chips < bet * 2) return;
    busy = true;
    tReset();
    if (dbl) {
      bet *= 2;
      doubled = true;
    }
    const c = nextCard!;
    nextCard = null;
    pc.push(c);
    $('act').innerHTML = '<div class="wait">&nbsp;</div>';
    $('mid').innerHTML = feltHTML() + spotHTML();
    addCard($('pCards'), cardHTML(c, { cls: 'deal' }));
    const s = total(pc);
    setTot('pSum', fmt(s), s > T ? 'bust' : '');
    if (!(await pause(320))) return;
    if (s > T) return settle('bust');
    if (s === T) return dealerPlay(true);
    if (dbl) return dealerPlay(false);
    busy = false;
    offer();
  }
  async function stand(late: boolean) {
    if (busy) return;
    if (!late && tEnd && tLeft() <= 0) {
      timeUp();
      return;
    }
    busy = true;
    tReset();
    $('act').innerHTML =
      '<div class="wait">' +
      (late ? '✋ Te plantas: se acabó el tiempo' : 'Juega la banca…') +
      '</div>';
    const el = $('mid').querySelector('.card');
    if (el) {
      el.classList.remove('pop');
      el.classList.add('gone');
    }
    if (!(await pause(150))) return;
    dealerPlay(false, late);
  }
  async function dealerPlay(exact: boolean, late?: boolean) {
    $('act').innerHTML =
      '<div class="wait">' +
      (late ? '✋ Te plantas: se acabó el tiempo' : 'Juega la banca…') +
      '</div>';
    $('mid').innerHTML = feltHTML() + spotHTML();
    // girar la carta oculta
    const hid = $('dCards').children[1];
    if (hid) {
      hid.outerHTML = cardHTML(dc[1], { down: true });
      const h2 = $('dCards').children[1] as HTMLElement;
      void h2.offsetWidth;
      if (!(await pause(60))) return;
      h2.classList.remove('down');
    }
    setTot('dSum', fmt(total(dc)));
    if (!(await pause(450))) return;
    while (total(dc) < STAND) {
      const c = src.d();
      dc.push(c);
      addCard($('dCards'), cardHTML(c, { cls: 'deal' }));
      if (!(await pause(200))) return;
      setTot('dSum', fmt(total(dc)), total(dc) > T ? 'bust' : '');
      if (!(await pause(260))) return;
    }
    const p = total(pc),
      d = total(dc);
    if (exact) return settle(d === p ? 'lose' : 'exact');
    if (d > T) return settle('dbust');
    if (p > d) return settle('win');
    return settle(p === d ? 'tie' : 'lose');
  }
  function settle(r: HandOutcome) {
    const p = total(pc),
      d = total(dc),
      delta = payoutFor(r, bet);
    let msg: string;
    if (r === 'exact') msg = '¡Clavado!';
    else if (r === 'win') msg = '¡Ganas la mano!';
    else if (r === 'dbust') msg = '¡La banca se pasa!';
    else if (r === 'bust') msg = 'Te has pasado';
    else if (r === 'tie') msg = 'Empate: gana la banca';
    else msg = 'Gana la banca';
    const good = delta > 0;
    hand++;
    log.push(good ? '🟩' : '🟥');
    setTot('pSum', fmt(p), good ? 'win' : 'lose');
    if (dc.length && r !== 'bust')
      setTot('dSum', fmt(d), good ? 'lose' : 'win');
    if (good) [...$('pCards').children].forEach((c) => c.classList.add('win'));
    else if (r !== 'bust')
      [...$('dCards').children].forEach((c) => c.classList.add('win'));
    $('mid').innerHTML =
      `<div class="banner ${good ? 'good' : 'bad'}"><b>${msg}</b><span>${good ? '+' : '−'}${fmt(Math.abs(delta))} fichas</span></div>`;
    setChips(chips + delta, true);
    const s = stats();
    s.hands++;
    store.set(SKEY, s);
    if (doubled) {
      bet /= 2;
      doubled = false;
    } // la siguiente mano vuelve a la apuesta de antes de doblar
    // se acaba tras 7 manos, o antes si ya no llegas a la apuesta mínima
    const over = hand >= HANDS || chips < MINBET;
    // pasa solo tras AUTO ms; tocar el cartel o el botón lo adelanta (una sola vez: el primero que llega limpia nextT)
    const go = () => {
      if (!nextT) return;
      clearNext();
      if (over) finish();
      else betPhase();
    };
    $('act').innerHTML =
      `<button class="bigbtn" id="bNext">${over ? 'Ver resultado ▸' : 'Siguiente mano ▸'}</button>`;
    $('bNext').onclick = go;
    $('mid').querySelector<HTMLElement>('.banner')!.onclick = go;
    nextT = setTimeout(go, AUTO);
    busy = false;
  }
  function finish() {
    tReset();
    clearNext();
    const s = stats(),
      isDaily = mode === 'daily',
      final = chips,
      k = M.k;
    s.games++;
    const prev = s.best[k] || 0,
      record = !isDaily && final > prev;
    if (isDaily) {
      s.bestDaily = Math.max(s.bestDaily || 0, final);
      setDaily(TODAY, { done: 1, chips: final });
    } else if (record) s.best[k] = final;
    store.set(SKEY, s);
    const strip = log.join(''),
      url = location.origin + location.pathname,
      title = isDaily ? 'Reto diario · ' + dmy(today, 1) : M.t;
    const line =
      hand < HANDS
        ? 'No te quedan fichas para apostar tras ' + manos(hand)
        : 'fichas tras ' + manos(hand);
    const sm =
      line +
      (isDaily
        ? ' · mañana hay otro reto'
        : record
          ? ' · ¡nuevo récord!'
          : ' · récord: ' + fmt(s.best[k] || 0) + ' fichas');
    const text = `GOALDAY ⚽ Blackjack · ${isDaily ? 'Reto diario ' + dmy(today, 1) : M.t}\n🃏 ${fmt(final)} fichas tras ${manos(hand)}\n${strip}\n${url}`;
    document.body.classList.remove('playing');
    $('game').hidden = true;
    $('res').hidden = false;
    $('res').innerHTML =
      `<div class="lbl">${title}</div><div class="big">${fmt(final)}</div>
   <div class="sm">${sm}</div>
   <div class="sm">${strip}</div>
   <div id="rankMsg" class="sm"></div>
   <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" id="bShare">Compartir</button>${isDaily ? '<button class="btn ghost" id="bHome">Volver</button>' : '<button class="btn ghost" id="bAgain">Otra vez</button><button class="btn ghost" id="bHome">Inicio</button>'}</div><div class="sm" id="shareOk"></div>`;
    $('bShare').onclick = () => share(text, $('shareOk'));
    if (!isDaily) $('bAgain').onclick = () => start(k);
    $('bHome').onclick = goHome;
    const rm = $('rankMsg');
    if (isDaily) sendDaily(TODAY, rm);
    else if (record) {
      if (me().pid && me().name) saveBest(k, rm);
      else nameLine(k, rm);
    }
  }
  function goHome() {
    tReset();
    clearNext();
    gen++;
    busy = false;
    document.body.classList.remove('playing');
    $('game').hidden = true;
    $('res').hidden = true;
    $('home').hidden = false;
    renderHome();
  }
  // encoger el apellido si no cabe en la carta
  function fitNames(root?: ParentNode) {
    (root || document)
      .querySelectorAll<HTMLElement>('.card .ln')
      .forEach((el) => {
        let fs = parseFloat(el.style.fontSize) || 15,
          g = 0;
        while (el.scrollWidth > el.clientWidth + 1 && fs > 7 && g++ < 20) {
          fs -= 0.5;
          el.style.fontSize = fs + 'px';
        }
      });
  }
  new MutationObserver(() => fitNames()).observe(
    document.querySelector('main')!,
    { childList: true, subtree: true },
  );
  renderHome();
  // si el reto diario (de hoy o de ayer) no llegó al ranking (sin conexión), se reintenta
  {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    [dayKey(y), TODAY].forEach((d) => {
      const x = daily()[d];
      if (x && x.done && !x.sent && me().pid && me().name) sendDaily(d);
    });
  }
}
