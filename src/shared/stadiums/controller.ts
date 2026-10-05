import { teams as TEAMS } from './teams';
import { svg } from './geometry';
import type { LanguageApi } from '../i18n/controller';

declare global {
  interface Window {
    FG_LANG: LanguageApi;
    FG_STADIUM: { teams: typeof TEAMS; svg: typeof svg; open: () => void };
  }
}

type CacheEntry = { k: string; t: string; url: string };
type League = [
  id: string,
  name: string,
  code: string,
  teams: string,
  color: string,
];

// Compatibility bridge: the original implementation runs only when explicitly initialized.
export function initStadiums() {
  /* ===== GOALDAY · estadios de fondo ===== */
  (function () {
    // Catalog imported from the typed data module.
    const KEY = 'fg_team';
    let bgEl: HTMLElement | null = null;
    let pick: HTMLElement | null = null;
    function team() {
      let id: string | null = null;
      try {
        id = localStorage.getItem(KEY);
      } catch {
        // Fall back to no saved team when storage is unavailable.
      }
      return (
        TEAMS.find(function (t) {
          return t.id === id;
        }) || null
      );
    }
    let lastUrl: string | null = null,
      curTeam: (typeof TEAMS)[number] | null = null,
      gen = 0,
      lbl: string | null = null,
      done = false;
    const CKEY = 'fg_bg';
    function sizeKey(id: string): string {
      return (
        id +
        '|' +
        window.innerWidth +
        'x' +
        window.innerHeight +
        '|' +
        Math.min(window.devicePixelRatio || 1, 2)
      );
    }
    // mismo equipo, ancho y dpr, y alto parecido (barra de URL del móvil): vale la imagen, que se pinta en modo cover
    function fits(a: string, b: string): boolean {
      const x = String(a).split('|'),
        y = String(b).split('|');
      if (x.length < 3 || y.length < 3 || x[0] !== y[0] || x[2] !== y[2])
        return false;
      const dimensionsX = x[1]!.split('x'),
        dimensionsY = y[1]!.split('x');
      const heightX = Number(dimensionsX[1]),
        heightY = Number(dimensionsY[1]);
      return (
        dimensionsX[0] === dimensionsY[0] &&
        Math.abs(heightX - heightY) < 0.25 * Math.max(heightX, heightY)
      );
    }
    function readCache(): CacheEntry | null {
      try {
        const value: unknown = JSON.parse(localStorage.getItem(CKEY) || 'null');
        if (
          value &&
          typeof value === 'object' &&
          'k' in value &&
          't' in value &&
          'url' in value &&
          typeof value.k === 'string' &&
          typeof value.t === 'string' &&
          typeof value.url === 'string'
        )
          return { k: value.k, t: value.t, url: value.url };
        return null;
      } catch {
        return null;
      }
    }
    function writeCache(k: string, id: string, url: string): void {
      try {
        localStorage.setItem(CKEY, JSON.stringify({ k: k, t: id, url: url }));
      } catch {
        try {
          localStorage.removeItem(CKEY);
        } catch {
          // Cache cleanup is best-effort when storage is unavailable.
        }
      }
    }
    function show(u: string | null): void {
      bgEl = bgEl || document.getElementById('fgStadium');
      if (u === lastUrl) return;
      lastUrl = u;
      if (!bgEl) return;
      bgEl.style.backgroundImage = u ? 'url("' + u + '")' : '';
    }
    function paint(): void {
      const my = ++gen,
        t = curTeam;
      if (!t) return;
      const activeTeam = t,
        teamId = t.id;
      const k = sizeKey(teamId),
        cached = readCache();
      if (cached && cached.t === t.id) {
        show(cached.url);
        if (fits(cached.k, k)) return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2),
        vw = window.innerWidth,
        vh = window.innerHeight;
      // en pantallas anchas se abre el encuadre a los lados en vez de ampliar el dibujo
      const vbH = 640,
        vbW = Math.max(390, Math.round((vbH * vw) / vh));
      const blob = new Blob([svg(activeTeam.spec, vbW, vbH)], {
          type: 'image/svg+xml;charset=utf-8',
        }),
        url = URL.createObjectURL(blob),
        img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        if (my !== gen) return; // ya hay otro dibujo más nuevo (otro equipo u otro tamaño)
        const c = document.createElement('canvas');
        c.width = Math.round(vw * dpr);
        c.height = Math.round(vh * dpr);
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);
        const sc = Math.max(vw / vbW, vh / vbH),
          w = vbW * sc,
          h = vbH * sc;
        ctx.fillStyle = '#050912';
        ctx.fillRect(0, 0, vw, vh);
        ctx.drawImage(img, (vw - w) / 2, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.86);
        show(dataUrl);
        // si la ventana cambió mientras se dibujaba, no se guarda y se vuelve a dibujar
        if (fits(k, sizeKey(teamId))) writeCache(k, teamId, dataUrl);
        else {
          clearTimeout(rt);
          rt = setTimeout(paint, 250);
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
    function apply(t: (typeof TEAMS)[number] | null): void {
      bgEl = bgEl || document.getElementById('fgStadium');
      curTeam = t;
      if (!t) {
        gen++;
        try {
          localStorage.removeItem(CKEY);
        } catch {
          // Removing a cached background is best-effort.
        }
        document.documentElement.classList.remove('fgbg');
        document.body.classList.remove('hasteam');
        show(null);
        delete document.body.dataset.bg;
        const b0 = document.getElementById('btnTeam');
        if (b0 && lbl != null) b0.textContent = lbl;
        document.dispatchEvent(new CustomEvent('fg:team', { detail: null }));
        return;
      }
      document.body.classList.add('hasteam');
      paint();
      // clasificar el estadio para elegir el color de acento del texto
      function hex(c: string): number[] {
        c = c.replace('#', '');
        return [
          parseInt(c.substr(0, 2), 16),
          parseInt(c.substr(2, 2), 16),
          parseInt(c.substr(4, 2), 16),
        ];
      }
      const sp = t.spec,
        cols: string[] = [],
        stands = sp.open ? [sp.far, sp.side, sp.sideR || sp.side] : [sp];
      stands.forEach(function (st) {
        st?.tiers?.forEach(function (tr) {
          cols.push(tr[2]);
        });
        if (st?.roofCol) cols.push(st.roofCol);
      });
      if (sp.roof === 'lattice') cols.push('#c9ccd3');
      let yellow = 0,
        light = 0;
      cols.forEach(function (c) {
        const r = hex(c),
          lum = (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255;
        if (r[0] > 180 && r[1] > 150 && r[2] < 120) yellow++;
        if (lum > 0.7) light++;
      });
      document.body.dataset.bg =
        yellow >= 1 ? 'yellow' : light >= 2 ? 'light' : 'normal';
      const b = document.getElementById('btnTeam');
      if (b) b.textContent = (b.dataset.plain ? '' : '🏟️ ') + t.name;
      document.dispatchEvent(new CustomEvent('fg:team', { detail: t }));
    }
    let rt: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(paint, 250);
    });
    const LEAGUES: League[] = [
      ['LL', 'LaLiga', 'LL', '20 equipos', '#f3c545'],
      ['PL', 'Premier League', 'PL', '20 equipos', '#c9a3ff'],
      ['SA', 'Serie A', 'SA', '20 equipos', '#8ad1ff'],
      ['BL', 'Bundesliga', 'BL', '18 equipos', '#ff8a80'],
      ['L1', 'Ligue 1', 'L1', '18 equipos', '#9ad0a8'],
      ['AR', 'Liga Argentina', 'AR', '30 equipos', '#7fd3ff'],
      ['MX', 'Liga MX', 'MX', '18 equipos', '#8fe3b0'],
      ['US', 'MLS', 'MLS', '30 equipos', '#7fb2ff'],
    ];
    function open(): void {
      const picker = pick || document.getElementById('teamPick');
      if (!picker) return;
      pick = picker;
      const cur = team(),
        stepL = picker.querySelector<HTMLElement>('[data-step="league"]'),
        stepT = picker.querySelector<HTMLElement>('[data-step="team"]');
      if (!stepL || !stepT) return;
      const leagueStep = stepL,
        teamStep = stepT;
      function showLeagues() {
        teamStep.hidden = true;
        leagueStep.hidden = false;
        const box = leagueStep.querySelector<HTMLElement>('.tp-leagues');
        if (!box) return;
        box.innerHTML = '';
        const leagueBox = box;
        const LG = LEAGUES.slice();
        try {
          if (window.FG_LANG && window.FG_LANG.get() === 'en') {
            const us = /^en-us/i.test(
              (navigator.languages && navigator.languages[0]) ||
                navigator.language ||
                '',
            );
            const first = us ? ['US', 'PL', 'LL'] : ['PL', 'LL'];
            LG.sort(function (a, b) {
              const ia = first.indexOf(a[0]),
                ib = first.indexOf(b[0]);
              return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib);
            });
          }
        } catch {
          // Keep the default league ordering when language state is unavailable.
        }
        LG.forEach(function (L) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'tp-lg';
          b.innerHTML =
            '<span class="fl" style="--lc:' +
            L[4] +
            '">' +
            L[2] +
            '</span><b>' +
            L[1] +
            '</b><small>' +
            L[3] +
            '</small>';
          b.onclick = function () {
            showTeams(L);
          };
          leagueBox.appendChild(b);
        });
      }
      function showTeams(L: League): void {
        leagueStep.hidden = true;
        teamStep.hidden = false;
        const leagueName = teamStep.querySelector<HTMLElement>('.tp-lgname');
        if (leagueName)
          leagueName.innerHTML =
            '<span class="fl" style="--lc:' +
            L[4] +
            '">' +
            L[2] +
            '</span>' +
            L[1];
        const grid = teamStep.querySelector<HTMLElement>('.tp-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const teamGrid = grid;
        TEAMS.filter(function (t) {
          return t.league === L[0];
        }).forEach(function (t) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'tp-team' + (cur && cur.id === t.id ? ' on' : '');
          b.style.setProperty('--c', t.color);
          b.innerHTML =
            '<span class="tp-dot"></span><span class="tp-txt"><span class="tp-n">' +
            t.name +
            '</span><span class="tp-s">' +
            t.stadium +
            '</span></span>';
          b.onclick = function () {
            try {
              localStorage.setItem(KEY, t.id);
            } catch {
              // Persisting the selected team is best-effort.
            }
            done = true;
            apply(t);
            shut();
          };
          teamGrid.appendChild(b);
        });
        const sc = teamStep.querySelector<HTMLElement>('.tp-scroll');
        if (sc) sc.scrollTop = 0;
      }
      const back = teamStep.querySelector<HTMLButtonElement>('.tp-back'),
        skip = leagueStep.querySelector<HTMLButtonElement>('.tp-skip');
      if (back) back.onclick = showLeagues;
      if (skip)
        skip.onclick = function () {
          try {
            localStorage.setItem(KEY, 'none');
          } catch {
            // Persisting the no-team choice is best-effort.
          }
          done = true;
          apply(null);
          shut();
        };
      // cerrar sin elegir (×, Escape o clic fuera) solo si ya hay una elección guardada; la primera vez hay que elegir
      let x = picker.querySelector<HTMLButtonElement>('.tp-x');
      if (!x) {
        x = document.createElement('button');
        x.type = 'button';
        x.className = 'tp-x';
        x.setAttribute('aria-label', 'Cerrar');
        x.textContent = '×';
        picker.querySelector('.tp-in')?.appendChild(x);
      }
      x.onclick = function () {
        if (canClose()) shut();
      };
      x.hidden = !canClose();
      picker.onclick = function (e) {
        if (e.target === picker && canClose()) shut();
      };
      if (cur) {
        const leagueId = cur.league;
        showTeams(
          LEAGUES.filter(function (L) {
            return L[0] === leagueId;
          })[0] || LEAGUES[0]!,
        );
      } else showLeagues();
      picker.hidden = false;
      document.body.classList.add('tp-open');
    }
    function canClose(): boolean {
      let s = null;
      try {
        s = localStorage.getItem(KEY);
      } catch {
        // Keep the picker usable when storage is unavailable.
      }
      return done || !!s;
    }
    function shut(): void {
      if (pick) pick.hidden = true;
      document.body.classList.remove('tp-open');
    }
    document.addEventListener('keydown', function (e) {
      if (
        (e.key === 'Escape' || e.key === 'Esc') &&
        pick &&
        !pick.hidden &&
        canClose()
      )
        shut();
    });
    /* Si la página no trae el fondo ni el selector (portada y otros juegos), se crean aquí */
    function ensure(): void {
      let css =
        '.tp-in{position:relative}.tp-x{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));right:10px;z-index:1;width:40px;height:40px;border-radius:50%;border:1px solid rgba(245,248,243,.14);background:rgba(255,255,255,.06);color:#f5f8f3;font:400 26px/1 system-ui,sans-serif;cursor:pointer;padding:0}.tp-x[hidden]{display:none}#teamPick .tp-h{padding-right:44px}';
      if (!document.getElementById('fgStadium')) {
        const d = document.createElement('div');
        d.id = 'fgStadium';
        d.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(d, document.body.firstChild);
        css +=
          '#fgStadium{position:fixed;inset:0;z-index:-1;pointer-events:none;background:#050912 center top / cover no-repeat;transform:translateZ(0)}body.hasteam{background:#050912!important}';
      }
      if (!document.getElementById('teamPick')) {
        const w = document.createElement('div');
        w.id = 'teamPick';
        w.hidden = true;
        w.innerHTML =
          '<div class="tp-in"><div class="tp-step" data-step="league"><h2 class="tp-h">¿De qué equipo eres?</h2><p class="tp-p">Elige tu liga. Tu estadio será el fondo de todos los juegos y puedes cambiarlo cuando quieras.</p><div class="tp-scroll"><div class="tp-leagues"></div></div><button type="button" class="tp-skip">Sin equipo, gracias</button></div><div class="tp-step" data-step="team" hidden><button type="button" class="tp-back">‹ Ligas</button><h2 class="tp-h tp-lgname"></h2><div class="tp-scroll"><div class="tp-grid"></div></div></div></div>';
        document.body.appendChild(w);
        css +=
          '#teamPick{position:fixed;inset:0;z-index:60;background:rgba(3,8,16,.94);display:flex;align-items:stretch;justify-content:center;color:#f5f8f3;font-family:Barlow,system-ui,sans-serif}#teamPick[hidden]{display:none}body.tp-open{overflow:hidden}.tp-in{width:100%;max-width:560px;height:100%;display:flex;flex-direction:column;background:#0d1424;padding:calc(16px + env(safe-area-inset-top,0px)) 16px calc(16px + env(safe-area-inset-bottom,0px));box-sizing:border-box;overflow:hidden}@media (min-width:640px){#teamPick{align-items:center;padding:24px}.tp-in{height:auto;max-height:86vh;border-radius:22px;border:1px solid rgba(245,248,243,.14)}}.tp-step{display:flex;flex-direction:column;min-height:0;flex:1}.tp-step[hidden]{display:none}.tp-h{font:900 30px/1 "Barlow Condensed",sans-serif;margin:0 0 4px}.tp-p{margin:0 0 14px;color:rgba(245,248,243,.68);font-size:14px;line-height:1.35}.tp-scroll{overflow-y:auto;-webkit-overflow-scrolling:touch;min-height:0;flex:1;padding-bottom:6px}.tp-leagues,.tp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tp-grid{gap:8px}.tp-lg{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;border:1px solid rgba(245,248,243,.14);background:rgba(255,255,255,.05);color:#f5f8f3;border-radius:14px;padding:14px;cursor:pointer;min-height:84px;min-width:0}.tp-lg:last-child:nth-child(odd){grid-column:1 / -1;flex-direction:row;align-items:center;gap:12px;min-height:64px}.tp-lg b{font:900 20px/1 "Barlow Condensed",sans-serif}.tp-lg small{font-size:12px;color:rgba(245,248,243,.4)}.tp-lg .fl,.tp-lgname .fl{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 7px;border-radius:7px;font:900 13px/1 "Barlow Condensed",sans-serif;color:#0b0f1c;background:var(--lc,#f3c545);vertical-align:middle;margin-right:6px}.tp-back{background:none;border:0;color:#f3c545;font-weight:700;font-size:15px;cursor:pointer;padding:4px 0 10px;text-align:left;align-self:flex-start}.tp-team{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid rgba(245,248,243,.14);background:rgba(255,255,255,.04);color:#f5f8f3;border-radius:12px;padding:10px 12px;cursor:pointer;min-height:54px;min-width:0}.tp-team.on{border-color:#f3c545;background:rgba(243,197,69,.12)}.tp-dot{width:16px;height:16px;border-radius:50%;background:var(--c);flex:none;border:2px solid rgba(255,255,255,.35)}.tp-txt{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.tp-n,.tp-s{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}.tp-n{font:800 15px/1.1 "Barlow Condensed",sans-serif;white-space:normal;overflow:hidden;text-overflow:clip;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.tp-s{font-size:11px;color:rgba(245,248,243,.4)}.tp-skip{display:block;margin:12px auto 0;background:none;border:0;color:rgba(245,248,243,.68);font-weight:600;cursor:pointer;padding:8px 12px;flex:none}';
      }
      if (css) {
        const st = document.createElement('style');
        st.textContent = css;
        document.head.appendChild(st);
      }
    }
    function boot(): void {
      ensure();
      const b0 = document.getElementById('btnTeam');
      if (b0) lbl = b0.textContent;
      const t = team();
      apply(t);
      let has = false;
      try {
        has = !!localStorage.getItem(KEY);
      } catch {
        // The picker may still work for this session without storage.
      }
      // el selector solo sale solo en páginas con botón de equipo (portada y reto)
      if (!has && document.getElementById('btnTeam')) open();
      const b = document.getElementById('btnTeam');
      if (b) b.onclick = open;
    }
    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot);
    window.FG_STADIUM = { teams: TEAMS, svg: svg, open: open };
  })();
}
