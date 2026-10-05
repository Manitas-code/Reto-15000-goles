import type { Goal, YouTubePlayer, TimeKey } from './state';
import { $ } from './dom';

export function initGoalEditor() {
  const KEY = 'gd_editor_v1';
  const saved = (() => {
    try {
      return (
        (JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<
          number,
          Partial<Goal>
        >) || {}
      );
    } catch {
      return {};
    }
  })();
  // goles.js puede faltar (el Gol del día se retiró): entonces G es null y el editor avisa sin romperse
  const G =
    typeof GOLES === 'undefined'
      ? null
      : GOLES.map((g, i) => Object.assign({}, g, saved[i] || {}));
  let cur = 0,
    player: YouTubePlayer | null = null,
    apiReady = false;

  function persist() {
    const o: Record<number, Partial<Goal>> = {};
    G!.forEach((g, i) => {
      o[i] = { yt: g.yt, desde: g.desde, corte: g.corte, hasta: g.hasta };
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch {
      /* Preserve best-effort behavior. */
    }
  }
  function idFrom(s: string) {
    s = (s || '').trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
    return m ? m[1] : '';
  }
  function done(g: Goal) {
    return g.yt && g.corte! > g.desde!;
  }
  function renderList() {
    $('list').innerHTML = G!
      .map(
        (g, i) =>
          `<button class="it${i === cur ? ' on' : ''}" data-i="${i}"><span class="dot${done(g) ? ' ok' : ''}"></span><span>Día ${i + 1} · ${g.name}<small>${g.mt.split('·')[0]}</small></span></button>`,
      )
      .join('');
    $('list')
      .querySelectorAll<HTMLButtonElement>('.it')
      .forEach(
        (b) =>
          (b.onclick = () => {
            cur = +b.dataset.i!;
            renderList();
            renderEd();
          }),
      );
    $('count').textContent = `${G!.filter(done).length} de ${G!.length} listos`;
  }
  function t() {
    return player && player.getCurrentTime
      ? Math.round(player.getCurrentTime() * 10) / 10
      : 0;
  }
  function renderEd() {
    const g = G![cur];
    $('ed').innerHTML =
      `<h2>Día ${cur + 1} · ${g.name}</h2><p class="mt">${g.mt}</p>
  <label for="url">Enlace de YouTube</label>
  <input type="text" id="url" placeholder="https://www.youtube.com/watch?v=…" value="${g.yt ? 'https://youtu.be/' + g.yt : ''}">
  <div class="row"><a class="b g" style="text-decoration:none;padding:9px 12px;border-radius:8px" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(g.name + ' ' + g.mt.split('·').slice(0, 2).join(' ') + ' gol')}">Buscar en YouTube</a></div>
  <div class="player"><div id="yt">${g.yt ? '' : '<div class="empty">Pega un enlace para cargar el vídeo</div>'}</div></div>
  <div class="marks">
    ${(['desde', 'corte', 'hasta'] as const)
      .map(
        (
          k,
        ) => `<div class="mk"><b>${{ desde: 'Inicio de la jugada', corte: 'Corte (antes del gol)', hasta: 'Fin del clip' }[k]}</b>
      <input type="number" step="0.1" min="0" id="f_${k}" value="${g[k] ?? ''}">
      <button class="b" data-k="${k}">${{ desde: 'Inicio aquí', corte: 'Corte aquí', hasta: 'Fin aquí' }[k]}</button></div>`,
      )
      .join('')}
  </div>
  <div class="row"><button class="b g" id="test">▶ Probar la pregunta (inicio → corte)</button><button class="b g" id="next">Siguiente gol</button></div>
  <div class="warn" id="warn"></div>`;
    $('url').oninput = (e) => {
      const id = idFrom((e.target as HTMLInputElement).value);
      if (id && id !== g.yt) {
        g.yt = id;
        persist();
        renderList();
        load();
      }
    };
    (['desde', 'corte', 'hasta'] as const).forEach((k) => {
      ($('f_' + k) as HTMLInputElement).onchange = (e) => {
        g[k] =
          (e.target as HTMLInputElement).value === ''
            ? undefined
            : +(e.target as HTMLInputElement).value;
        persist();
        renderList();
        check();
      };
    });
    $('ed')
      .querySelectorAll<HTMLButtonElement>('.mk button')
      .forEach(
        (b) =>
          (b.onclick = () => {
            g[b.dataset.k as TimeKey] = t();
            ($('f_' + b.dataset.k) as HTMLInputElement).value = String(
              g[b.dataset.k as TimeKey],
            );
            persist();
            renderList();
            check();
          }),
      );
    $('test').onclick = () => {
      if (!player || !player.seekTo) return;
      player.seekTo(g.desde || 0, true);
      player.playVideo();
      clearInterval(window._w);
      window._w = setInterval(() => {
        if (t() >= g.corte!) {
          player!.pauseVideo();
          clearInterval(window._w);
        }
      }, 100);
    };
    $('next').onclick = () => {
      cur = (cur + 1) % G!.length;
      renderList();
      renderEd();
    };
    load();
    check();
  }
  function check() {
    const g = G![cur],
      w = $('warn');
    if (!w) return;
    w.textContent = !g.yt
      ? 'Falta el vídeo.'
      : !(g.corte! > (g.desde || 0))
        ? 'El corte tiene que ir después del inicio.'
        : g.hasta && g.hasta <= g.corte!
          ? 'El fin tiene que ir después del corte.'
          : '';
    w.style.color = w.textContent ? 'var(--bad)' : 'var(--ok)';
    if (!w.textContent) w.textContent = 'Listo ✔';
  }
  function load() {
    const g = G![cur];
    if (!g.yt || !apiReady) return;
    if (player && player.destroy) {
      player.destroy();
      player = null;
    }
    $('yt').innerHTML = '<div id="ytp"></div>';
    player = new YT.Player('ytp', {
      videoId: g.yt,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onError: (e) => {
          $('warn').style.color = 'var(--bad)';
          $('warn').textContent =
            e.data === 101 || e.data === 150
              ? 'Este vídeo no deja insertarse en otras webs. Busca otro.'
              : 'Vídeo no disponible. Prueba otro enlace.';
        },
      },
    });
  }
  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    load();
  };

  function fileText() {
    const q = (s: unknown) =>
      "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    const out = G!.map((g) => {
      const p = [];
      p.push(`yt:${q(g.yt || '')}`);
      if (g.video) p.push(`video:${q(g.video)}`);
      p.push(`desde:${g.desde || 0}`, `corte:${g.corte || 0}`);
      if (g.hasta) p.push(`hasta:${g.hasta}`);
      if (g.tapar) p.push(`tapar:${JSON.stringify(g.tapar)}`);
      if (g.color) p.push('color:true');
      return `{${p.join(',')},\n name:${q(g.name)},flag:${q(g.flag)},\n h:[${g.h.map(q).join(',')}],\n mt:${q(g.mt)},\n tx:${q(g.tx)}}`;
    });
    return `/* GOL DEL DÍA · calendario de goles (generado con editor-goles.html)\n   Para probar un gol concreto antes de su día:  gol-del-dia.html?dia=5 */\nconst INICIO=${q(INICIO)};\n\nconst GOLES=[\n${out.join(',\n\n')}\n];\n`;
  }
  $('dl').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([fileText()], { type: 'text/javascript' }),
    );
    a.download = 'goles.js';
    a.click();
  };
  $('cp').onclick = async () => {
    try {
      await navigator.clipboard.writeText(fileText());
      $('cp').textContent = 'Copiado ✔';
    } catch {
      $('cp').textContent = 'No se pudo copiar';
    }
  };

  if (!G) {
    $('dl').disabled = $('cp').disabled = true;
    $('ed').innerHTML =
      '<p class="warn">Falta goles.js: sube goles.js junto a este archivo para usar el editor.</p>';
  } else {
    renderList();
    renderEd();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
}
