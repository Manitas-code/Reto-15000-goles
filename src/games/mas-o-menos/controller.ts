import { players } from '../../data/players';
import { extraPlayers } from '../../data/extra-players';
import { SB_URL, SB_H } from '../../shared/supabase/config';
import { readIdentity, saveIdentity } from '../../shared/identity/store';
import { rpcVoid as sbRpc } from '../../shared/supabase/rpc';
import {
  difficultyTier,
  isHigherLowerCorrect,
  relativeDifference,
} from './engine';

import { $ } from './dom';
import type { Position } from '../../data/player-types';
export function initMasOMenos() {
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
        g = (t: Intl.DateTimeFormatPartTypes) =>
          +p.find((x) => x.type === t)!.value;
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
  const fmt = (n: number) => n.toLocaleString('es-ES');
  const esc = (value: unknown): string =>
    String(value).replace(
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
  const POS_NAME: Record<Position, string> = {
    DEF: 'Defensa',
    MED: 'Centrocampista',
    DEL: 'Delantero',
  };
  interface GamePlayer {
    name: string;
    flag: string;
    pos: Position;
    carrera: number | null;
    seleccion: number | null;
  }
  type PlayablePlayer = GamePlayer & Record<CategoryKey, number>;
  const P: GamePlayer[] = [...players, ...extraPlayers];
  async function share(t: string, el: HTMLElement | null) {
    try {
      if (navigator.share) await navigator.share({ text: t });
      else {
        await navigator.clipboard.writeText(t);
        if (el) el.textContent = 'Copiado ✔';
      }
    } catch {
      // Compartir puede cancelarse o no estar disponible.
    }
  }
  function countUp(el: Element, to: number, ms: number) {
    const t0 = performance.now();
    const f = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(f);
    };
    f();
  }
  type Toast = ((message: string) => void) & {
    timer?: ReturnType<typeof setTimeout>;
  };
  const toast: Toast = (message) => {
    const element = $('toast');
    element.textContent = message;
    element.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('on'), 2200);
  };

  type CategoryKey = 'carrera' | 'seleccion';
  interface Category {
    k: CategoryKey;
    t: string;
    n: string;
    d: string;
    min: number;
  }
  const CATS: Category[] = [
    {
      k: 'carrera',
      t: 'Goles en toda su carrera',
      n: 'Carrera',
      d: 'Goles totales en toda su carrera',
      min: 0,
    },
    {
      k: 'seleccion',
      t: 'Goles con su selección',
      n: 'Selección',
      d: 'Goles con su selección nacional',
      min: 1,
    },
  ];
  // Elige el rival B para el jugador A (misma categoría toda la partida).
  // Dificultad progresiva según la racha:
  //   0-4 aciertos  -> solo jugadores famosos (los 200 del Reto) y diferencias grandes (40 %+)
  //   5-14          -> entran todos, diferencias medias (20-60 %)
  //   15 o más      -> duelos ajustados (10-55 %)
  // Nunca menos de un 10 % de diferencia (nada de 148 contra 150).
  // rnd: Math.random en las partidas libres; en el reto diario, el generador con semilla del día
  // (la racha también es igual para todos mientras aciertan, así que la cadena es la misma).
  const FAMOUS = new Set(players.map((p) => p.name));
  function currentCategory(): Category {
    if (!cat) throw new Error('No game category selected');
    return cat;
  }
  function currentPlayer(player: PlayablePlayer | null): PlayablePlayer {
    if (!player) throw new Error('Game player is not initialized');
    return player;
  }
  function pickB(
    a: PlayablePlayer,
    pool: PlayablePlayer[],
    used: Set<string>,
    rnd: () => number,
  ): PlayablePlayer | null {
    let base = pool.filter(
      (p) =>
        p !== a &&
        !used.has(p.name) &&
        p[currentCategory().k] !== a[currentCategory().k],
    );
    if (streak < 5) {
      const f = base.filter((p) => FAMOUS.has(p.name));
      if (f.length) base = f;
    }
    const [lo, hi] = difficultyTier(streak);
    const tries = [
      [lo, hi],
      [0.1, Math.max(hi, 0.85)],
      [0.1, 1],
    ];
    for (const [l, h] of tries) {
      const list = base.filter((p) => {
        const d = relativeDifference(
          a[currentCategory().k],
          p[currentCategory().k],
        );
        return d >= l && d <= h;
      });
      if (list.length) return list[Math.floor(rnd() * list.length)];
    }
    return base.length ? base[Math.floor(rnd() * base.length)] : null;
  }
  type GameMode = 'daily' | 'free';
  type DailyEntry = {
    start?: number;
    done?: number;
    streak?: number;
    sent?: number;
    [key: string]: unknown;
  };
  interface GameStats extends Record<string, unknown> {
    best: number;
    games: number;
    total: number;
    bestByCat: Partial<Record<CategoryKey, number>>;
    sent: Partial<Record<CategoryKey, number>>;
    bestDaily?: number;
  }
  let mode: GameMode | null = null,
    cat: Category | null = null,
    pool: PlayablePlayer[] = [],
    used = new Set<string>(),
    A: PlayablePlayer | null = null,
    B: PlayablePlayer | null = null,
    streak = 0,
    busy = false,
    rnd: () => number = Math.random,
    flowT: ReturnType<typeof setTimeout> | 0 = 0;
  function currentA(): PlayablePlayer {
    return currentPlayer(A);
  }
  function currentB(): PlayablePlayer {
    return currentPlayer(B);
  }
  const SKEY = 'gd_mm_stats',
    DKEY = 'gd_mm_daily',
    LIMIT = 10000;
  function stats(): GameStats {
    const s = store.get<Partial<GameStats>>(SKEY) || {};
    s.best = s.best || 0;
    s.games = s.games || 0;
    s.total = s.total || 0;
    s.bestByCat = s.bestByCat || {};
    s.sent = s.sent || {};
    return s as GameStats;
  }
  // Reto diario: {'2026-09-25':{start:1,done:1,streak:7,sent:1}}. Empezar ya cuenta como jugado.
  const daily = (): Record<string, DailyEntry> =>
    store.get<Record<string, DailyEntry>>(DKEY) || {};
  function setDaily(d: string, o: Partial<DailyEntry>): DailyEntry {
    const all = daily();
    all[d] = Object.assign(all[d] || {}, o);
    const ks = Object.keys(all).sort();
    while (ks.length > 7) {
      const oldest = ks.shift();
      if (oldest) delete all[oldest];
    }
    store.set(DKEY, all);
    return all[d];
  }
  const dmy = (d: Date, y: boolean | number = false) =>
    pad(d.getDate()) +
    '/' +
    pad(d.getMonth() + 1) +
    (y ? '/' + d.getFullYear() : '');
  function renderHome() {
    const s = stats(),
      dd = daily()[TODAY];
    const dl = dd
      ? dd.done
        ? 'Hoy: racha ' + (dd.streak || 0) + ' · vuelve mañana'
        : 'Hoy lo dejaste a medias · vuelve mañana'
      : '';
    $('modesBox').innerHTML =
      `<button class="mode gold day${dd ? ' done' : ''}" id="bDaily"><b>📅 Reto diario</b><span>Los mismos jugadores para todo el mundo. Un solo intento al día.${dl ? '<br>' + dl : ''}</span></button>` +
      CATS.map(
        (c) =>
          `<button class="mode" data-cat="${c.k}"><b>▶ ${c.n}</b><span>${c.d}.<br>Récord: ${s.bestByCat[c.k] || 0}</span></button>`,
      ).join('');
    $('bDaily').onclick = startDaily;
    document.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(
      (b) =>
        (b.onclick = () => {
          const key = b.dataset.cat;
          if (key) start(key);
        }),
    );
    $('homeStats').innerHTML =
      `<div class="stat"><b>${s.best}</b><span>Mejor racha</span></div><div class="stat"><b>${s.games}</b><span>Partidas</span></div><div class="stat"><b>${s.total}</b><span>Aciertos</span></div>`;
    renderRank();
    syncBest();
  }
  function startDaily() {
    const dd = daily()[TODAY];
    if (dd) {
      toast(
        dd.done
          ? 'Hoy: racha ' + (dd.streak || 0) + ' · vuelve mañana'
          : 'Hoy lo dejaste a medias · vuelve mañana',
      );
      return;
    }
    start('carrera', true);
  }
  function start(k: string, isDaily = false) {
    tStop();
    clearTimeout(flowT);
    mode = isDaily ? 'daily' : 'free';
    cat = isDaily ? CATS[0] : CATS.find((c) => c.k === k) || CATS[0];
    rnd = isDaily ? seeded('hl-' + TODAY) : Math.random;
    if (isDaily) setDaily(TODAY, { start: 1 });
    const category = currentCategory();
    pool = P.filter((p): p is PlayablePlayer => {
      const value = p[category.k];
      return typeof value === 'number' && value >= category.min;
    });
    streak = 0;
    used = new Set();
    const fam = pool.filter((p) => FAMOUS.has(p.name));
    const st = fam.length ? fam : pool;
    A = st[Math.floor(rnd() * st.length)];
    used.add(currentA().name);
    B = pickB(currentA(), pool, used, rnd);
    used.add(currentB().name);
    document.body.classList.add('playing');
    $('home').hidden = true;
    $('res').hidden = true;
    $('game').hidden = false;
    $('cat').textContent = isDaily
      ? 'Reto diario'
      : 'Goles · ' + currentCategory().n;
    $('rec').textContent = String(
      isDaily
        ? stats().bestDaily || 0
        : stats().bestByCat[currentCategory().k] || 0,
    );
    render(false);
  }
  // Tras acertar, el de la derecha pasa a la izquierda y sale uno nuevo.
  function next() {
    let nb = pickB(currentB(), pool, used, rnd);
    if (!nb) {
      used = new Set([currentB().name]);
      nb = pickB(currentB(), pool, used, rnd);
    }
    A = currentB();
    B = nb;
    used.add(currentB().name);
    render(true);
  }
  function fill(el: Element, p: PlayablePlayer) {
    el.querySelector<HTMLElement>('.flag')!.textContent = p.flag;
    el.querySelector<HTMLElement>('.nm')!.textContent = p.name;
    el.querySelector<HTMLElement>('.pn')!.textContent = POS_NAME[p.pos] || '';
  }
  function render(anim: boolean) {
    const cA = $('cA'),
      cB = $('cB');
    fill(cA, currentA());
    fill(cB, currentB());
    cA.querySelector<HTMLElement>('.led')!.textContent = fmt(
      currentA()[currentCategory().k],
    );
    const v = cB.querySelector<HTMLElement>('.led')!;
    v.className = 'led q';
    v.textContent = '???';
    cA.className = 'side';
    cB.className = 'side';
    if (anim) {
      void cA.offsetWidth;
      cA.classList.add('inA');
      cB.classList.add('inB');
    }
    $('choice').hidden = false;
    $('fb').textContent = '';
    $('fb').className = 'fb2';
    $('streak').textContent = String(streak);
    // los botones se activan (y arranca el reloj) cuando termina la animación de entrada
    busy = true;
    tShow(LIMIT);
    flowT = setTimeout(
      () => {
        busy = false;
        tStart();
      },
      anim ? 450 : 0,
    );
  }
  // ---- reloj: 10 s por respuesta, con hora límite (no se para aunque cambies de pestaña) ----
  let tEnd = 0,
    tTO: ReturnType<typeof setTimeout> | 0 = 0,
    tRAF = 0;
  const tLeft = () => tEnd - performance.now();
  function tShow(ms: number) {
    const low = ms <= 3000;
    $('tBar').style.transform = 'scaleX(' + Math.max(0, ms / LIMIT) + ')';
    $('tBar').classList.toggle('low', low);
    const t = $('tSec');
    t.className = 't' + (low ? ' low' : '');
    t.textContent = String(Math.max(0, Math.ceil(ms / 1000)));
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
    $('tBar').style.transform = '';
    $('tBar').classList.remove('low');
    $('tSec').className = '';
    $('tSec').textContent = 'VS';
  }
  document.addEventListener('visibilitychange', () => {
    if (tEnd && tLeft() <= 0) timeUp();
  });
  function timeUp() {
    if (busy || !tEnd) return;
    tShow(0);
    reveal(false, true);
  }
  function answer(more: boolean) {
    if (busy) return;
    if (tEnd && tLeft() <= 0) {
      timeUp();
      return;
    }
    reveal(
      isHigherLowerCorrect(
        currentA()[currentCategory().k],
        currentB()[currentCategory().k],
        more,
      ),
      false,
    );
  }
  function reveal(ok: boolean, late: boolean) {
    busy = true;
    if (late) tStop();
    else tReset();
    $('choice').hidden = true;
    const v = $('cB').querySelector<HTMLElement>('.led')!;
    v.className = 'led';
    countUp(v, currentB()[currentCategory().k], 700);
    $('cB').className = 'side ' + (ok ? 'ok' : 'ko');
    if (ok) {
      streak++;
      $('streak').textContent = String(streak);
      flowT = setTimeout(next, 1300);
      return;
    }
    $('fb').className = 'fb2 bad';
    $('fb').textContent = '';
    $('fb').append(
      late ? '⏱️ Se acabó el tiempo. ' : '',
      `${currentB().name} tiene ${fmt(currentB()[currentCategory().k])} y ${currentA().name} ${fmt(currentA()[currentCategory().k])}.`,
    );
    flowT = setTimeout(finish, late ? 2600 : 2000);
  }
  function finish() {
    tReset();
    clearTimeout(flowT);
    const s = stats(),
      isDaily = mode === 'daily';
    s.games++;
    s.total += streak;
    s.best = Math.max(s.best, streak);
    const prevBest = s.bestByCat[currentCategory().k] || 0,
      record = !isDaily && streak > 0 && streak > prevBest;
    if (isDaily) {
      s.bestDaily = Math.max(s.bestDaily || 0, streak);
      setDaily(TODAY, { done: 1, streak });
    } else s.bestByCat[currentCategory().k] = Math.max(prevBest, streak);
    store.set(SKEY, s);
    const big = streak,
      unit = streak === 1 ? 'acierto seguido' : 'aciertos seguidos';
    const sm = isDaily
      ? unit + ' · mañana hay otro reto'
      : unit +
        (record
          ? ' · ¡nuevo récord!'
          : ' · récord: ' + s.bestByCat[currentCategory().k]);
    const url = location.origin + location.pathname;
    const text = isDaily
      ? `GOALDAY ⚽ Higher or Lower · Reto diario ${dmy(today)}\n🔥 Racha de ${streak}\n${url}`
      : `GOALDAY ⚽ Higher or Lower · ${currentCategory().t}\n🔥 Racha de ${streak}\n${url}`;
    document.body.classList.remove('playing');
    $('game').hidden = true;
    $('res').hidden = false;
    $('res').innerHTML =
      `<div class="lbl">${isDaily ? 'Reto diario · ' + dmy(today, 1) : currentCategory().t}</div><div class="big">${big}</div><div class="sm">${sm}</div><div id="rankMsg" class="sm"></div><div class="row" style="justify-content:center"><button class="btn" id="bShare">Compartir</button>${isDaily ? '<button class="btn ghost" id="bHome">Volver</button>' : '<button class="btn ghost" id="bAgain">Otra vez</button><button class="btn ghost" id="bHome">Inicio</button>'}<span class="muted" id="shareOk"></span></div>`;
    $('bShare').onclick = () => share(text, $('shareOk'));
    if (!isDaily) $('bAgain').onclick = () => start(currentCategory().k);
    $('bHome').onclick = goHome;
    const rm = $('rankMsg'),
      k = currentCategory().k;
    if (isDaily) sendDaily(TODAY, rm);
    else if (record) {
      if (me().pid && me().name) saveBest(k, rm);
      else nameLine(k, rm);
    }
  }
  function goHome() {
    tReset();
    clearTimeout(flowT);
    document.body.classList.remove('playing');
    $('game').hidden = true;
    $('res').hidden = true;
    $('home').hidden = false;
    renderHome();
  }
  $('bMore').onclick = () => answer(true);
  $('bLess').onclick = () => answer(false);

  // ---- ranking mundial (Supabase, mismo proyecto y mismo nombre que el resto de juegos de GOALDAY) ----
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
  // 409 = ya estaba guardado (un solo resultado por jugador y día en el reto diario)
  interface ScoreSubmission {
    mode: 'diario' | CategoryKey;
    day?: string;
    streak: number;
  }
  interface ScoreError extends Error {
    status?: number;
    body?: string;
  }
  interface ScoreRow {
    name: string;
    streak: number;
  }
  function errorDetails(error: unknown): { status?: number; body?: string } {
    if (typeof error !== 'object' || error === null) return {};
    const candidate = error as { status?: unknown; body?: unknown };
    return {
      status:
        typeof candidate.status === 'number' ? candidate.status : undefined,
      body: typeof candidate.body === 'string' ? candidate.body : undefined,
    };
  }
  async function postScore(o: ScoreSubmission): Promise<boolean> {
    const u = me();
    if (!u.pid || !u.name) return false;
    const r = await fetch(SB_URL + '/rest/v1/hl_scores', {
      method: 'POST',
      headers: Object.assign({ Prefer: 'return=minimal' }, SB_H),
      body: JSON.stringify(
        Object.assign({ player_id: u.pid, name: u.name }, o),
      ),
    });
    if (r.status === 409) return true;
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
  function errMsg(error: unknown) {
    const failure = errorDetails(error),
      b = failure.body || '';
    return failure.status === 404 ||
      /42P01|does not exist|schema cache/i.test(b)
      ? 'No se ha podido guardar: falta crear la tabla del ranking en Supabase.'
      : failure.status === 401 ||
          failure.status === 403 ||
          /42501|permission|policy/i.test(b)
        ? 'No se ha podido guardar: la tabla del ranking no tiene permisos.'
        : 'No se ha podido guardar en el ranking (' +
          (failure.status || 'sin conexión') +
          ').';
  }
  const savedMsg = () => '🌍 Guardado en el ranking mundial como ' + me().name;
  let sendDailyBusy = false;
  async function sendDaily(
    d: string,
    rm: HTMLElement | null = null,
  ): Promise<void> {
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
    if (sendDailyBusy) return;
    sendDailyBusy = true;
    if (rm) rm.textContent = 'Guardando en el ranking mundial…';
    try {
      await postScore({ mode: 'diario', day: d, streak: x.streak || 0 });
      setDaily(d, { sent: 1 });
      if (rm) rm.textContent = savedMsg();
      renderRank();
    } catch (e) {
      if (rm) rm.textContent = errMsg(e);
    } finally {
      sendDailyBusy = false;
    }
  }
  // Récords de las partidas libres: se sube el mejor de cada categoría que aún no esté en el ranking.
  // En cola, para no subir dos veces el mismo récord; se relee stats() tras el await (una partida puede haber guardado algo).
  interface SyncResult {
    done: Partial<Record<CategoryKey, number>>;
    errs: Partial<Record<CategoryKey, unknown>>;
  }
  let syncQ: Promise<SyncResult> = Promise.resolve({ done: {}, errs: {} });
  async function doSync(): Promise<SyncResult> {
    const u = me(),
      s = stats(),
      done: Partial<Record<CategoryKey, number>> = {},
      errs: Partial<Record<CategoryKey, unknown>> = {};
    const pend = CATS.filter(
      (c) => (s.bestByCat[c.k] || 0) > (s.sent[c.k] || 0),
    );
    if (!pend.length || !u.pid || !u.name) return { done, errs };
    for (const c of pend) {
      const v = s.bestByCat[c.k];
      if (v === undefined) continue;
      try {
        await postScore({ mode: c.k, streak: v });
        done[c.k] = v;
      } catch (e) {
        errs[c.k] = e;
      }
    }
    if (Object.keys(done).length) {
      const s2 = stats();
      for (const key of Object.keys(done) as CategoryKey[]) {
        const value = done[key];
        if (value !== undefined)
          s2.sent[key] = Math.max(s2.sent[key] || 0, value);
      }
      store.set(SKEY, s2);
      renderRank();
    }
    return { done, errs };
  }
  const syncBest = () => (syncQ = syncQ.then(doSync, doSync));
  function saveBest(k: CategoryKey, rm: HTMLElement) {
    rm.textContent = 'Guardando en el ranking mundial…';
    syncBest().then((r) => {
      rm.textContent = r.errs[k] ? errMsg(r.errs[k]) : savedMsg();
    });
  }
  function nameLine(k: CategoryKey, rm: HTMLElement) {
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
        await sbRpc('register_name', { pid, n });
        saveMe(pid, n);
        then();
      } catch (e) {
        ok.disabled = false;
        er.textContent =
          errorDetails(e).status === 409
            ? 'Ese nombre ya lo tiene otro jugador. Elige otro.'
            : 'No se ha podido guardar. Revisa la conexión.';
      }
    };
  }
  const RTABS: { k: 'diario' | CategoryKey; n: string }[] = [
    { k: 'diario', n: 'Hoy' },
    ...CATS.map((c) => ({ k: c.k, n: c.n })),
  ];
  let rankTab: 'diario' | CategoryKey = 'diario',
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
            {
              const tab = b.dataset.r;
              if (
                tab === 'diario' ||
                tab === 'carrera' ||
                tab === 'seleccion'
              ) {
                rankTab = tab;
                renderRank();
              }
            }
          }),
      );
    const ul = $('rankList'),
      tok = ++rankReq;
    ul.innerHTML = '<p class="muted">Cargando…</p>';
    try {
      const q =
        rankTab === 'diario'
          ? 'mode=eq.diario&day=eq.' + TODAY + '&order=streak.desc&limit=100'
          : 'mode=eq.' + rankTab + '&order=streak.desc&limit=500';
      const r = await fetch(
        SB_URL + '/rest/v1/hl_scores?select=name,streak&' + q,
        { headers: SB_H },
      );
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = (await r.json()) as ScoreRow[];
      if (tok !== rankReq) return;
      // un nombre por fila, con su mejor racha
      const best: Record<string, number> = {};
      rows.forEach((x) => {
        if (!(x.name in best) || x.streak > best[x.name])
          best[x.name] = x.streak;
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
