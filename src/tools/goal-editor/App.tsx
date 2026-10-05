import { useEffect, useRef, useState } from 'react';
import type { Goal, TimeKey, YouTubePlayer } from './state';
import { readGoals, saveGoals, goalFileText, idFrom } from './persistence';
const marks = ['desde', 'corte', 'hasta'] as const;
const labels = {
  desde: 'Inicio de la jugada',
  corte: 'Corte (antes del gol)',
  hasta: 'Fin del clip',
};
const buttons = {
  desde: 'Inicio aquí',
  corte: 'Corte aquí',
  hasta: 'Fin aquí',
};
const done = (g: Goal) => g.yt && g.corte! > g.desde!;
export function App() {
  const [goals, setGoals] = useState(readGoals);
  const [cur, setCur] = useState(0);
  const [ready, setReady] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copiar goles.js');
  const [videoError, setVideoError] = useState('');
  const [input, setInput] = useState('');
  const player = useRef<YouTubePlayer | null>(null);
  const watch = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const playerGeneration = useRef(0);
  const host = useRef<HTMLDivElement>(null);
  const g = goals?.[cur];
  const latest = useRef(g);
  latest.current = g;
  const time = () =>
    player.current && player.current.getCurrentTime
      ? Math.round(player.current.getCurrentTime() * 10) / 10
      : 0;
  function update(patch: Partial<Goal>) {
    if (!goals) return;
    const next = goals.map((item, i) =>
      i === cur ? { ...item, ...patch } : item,
    );
    saveGoals(next);
    setGoals(next);
    setVideoError('');
  }
  useEffect(() => {
    setInput(g?.yt ? 'https://youtu.be/' + g.yt : '');
    setVideoError('');
  }, [cur]);
  useEffect(() => {
    if (!goals) return;
    const old = window.onYouTubeIframeAPIReady;
    const onReady = () => {
      old?.();
      setReady(true);
    };
    window.onYouTubeIframeAPIReady = onReady;
    if (typeof YT !== 'undefined') setReady(true);
    else if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
    return () => {
      if (window.onYouTubeIframeAPIReady === onReady)
        window.onYouTubeIframeAPIReady = old;
    };
  }, [!!goals]);
  useEffect(() => {
    clearInterval(watch.current);
    watch.current = undefined;
    const generation = ++playerGeneration.current;
    if (!ready || !g?.yt || !host.current) return;
    // YouTube owns this dedicated empty host; React never reconciles its descendants.
    const target = document.createElement('div');
    target.id = 'ytp';
    host.current.appendChild(target);
    let active = true;
    player.current = new YT.Player('ytp', {
      videoId: g.yt,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onError: (e) => {
          if (active && playerGeneration.current === generation)
            setVideoError(
              e.data === 101 || e.data === 150
                ? 'Este vídeo no deja insertarse en otras webs. Busca otro.'
                : 'Vídeo no disponible. Prueba otro enlace.',
            );
        },
      },
    });
    return () => {
      active = false;
      clearInterval(watch.current);
      watch.current = undefined;
      if (playerGeneration.current === generation) playerGeneration.current++;
      player.current?.destroy();
      player.current = null;
      target.remove();
    };
  }, [ready, cur, g?.yt]);
  function test() {
    const currentPlayer = player.current;
    if (!currentPlayer?.seekTo) return;
    currentPlayer.seekTo(g?.desde || 0, true);
    currentPlayer.playVideo();
    clearInterval(watch.current);
    const generation = playerGeneration.current;
    const timer = setInterval(() => {
      if (watch.current !== timer) return;
      if (
        player.current !== currentPlayer ||
        playerGeneration.current !== generation
      ) {
        clearInterval(timer);
        watch.current = undefined;
        return;
      }
      if (
        latest.current?.corte !== undefined &&
        time() >= latest.current.corte
      ) {
        currentPlayer.pauseVideo();
        clearInterval(timer);
        watch.current = undefined;
      }
    }, 100);
    watch.current = timer;
  }
  function download() {
    if (!goals) return;
    const url = URL.createObjectURL(
      new Blob([goalFileText(goals)], { type: 'text/javascript' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goles.js';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  async function copy() {
    if (!goals) return;
    try {
      await navigator.clipboard.writeText(goalFileText(goals));
      setCopyLabel('Copiado ✔');
    } catch {
      setCopyLabel('No se pudo copiar');
    }
  }
  const warn =
    videoError ||
    (!g?.yt
      ? 'Falta el vídeo.'
      : !(g.corte! > (g.desde || 0))
        ? 'El corte tiene que ir después del inicio.'
        : g.hasta && g.hasta <= g.corte!
          ? 'El fin tiene que ir después del corte.'
          : '');
  return (
    <div className="wrap">
      <h1>Editor del Gol del día</h1>
      <p className="help">
        Elige un gol, busca el vídeo en YouTube, copia el enlace y pégalo abajo.
        Dale al play y pulsa los botones en el momento justo: <b>inicio</b> de
        la jugada, <b>corte</b> justo antes de que entre el balón y <b>fin</b>{' '}
        después de la celebración. Se guarda solo en este navegador. Cuando
        acabes, descarga el goles.js y súbelo a GitHub.
      </p>
      <div className="bar">
        <button className="b" id="dl" disabled={!goals} onClick={download}>
          Descargar goles.js
        </button>
        <button className="b g" id="cp" disabled={!goals} onClick={copy}>
          {copyLabel}
        </button>
        <span className="n" id="count">
          {goals
            ? `${goals.filter(done).length} de ${goals.length} listos`
            : ''}
        </span>
      </div>
      <div className="layout">
        <nav className="list" id="list">
          {goals?.map((item, i) => (
            <button
              key={i}
              className={'it' + (i === cur ? ' on' : '')}
              data-i={i}
              onClick={() => setCur(i)}
            >
              <span className={'dot' + (done(item) ? ' ok' : '')} />
              <span>
                Día {i + 1} · {item.name}
                <small>{item.mt.split('·')[0]}</small>
              </span>
            </button>
          ))}
        </nav>
        <section className="ed" id="ed">
          {!goals ? (
            <p className="warn">
              Falta goles.js: sube goles.js junto a este archivo para usar el
              editor.
            </p>
          ) : (
            g && (
              <>
                <h2>
                  Día {cur + 1} · {g.name}
                </h2>
                <p className="mt">{g.mt}</p>
                <label htmlFor="url">Enlace de YouTube</label>
                <input
                  type="text"
                  id="url"
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    const id = idFrom(e.target.value);
                    if (id && id !== g.yt) update({ yt: id });
                  }}
                />
                <div className="row">
                  <a
                    className="b g"
                    style={{
                      textDecoration: 'none',
                      padding: '9px 12px',
                      borderRadius: 8,
                    }}
                    target="_blank"
                    rel="noopener"
                    href={
                      'https://www.youtube.com/results?search_query=' +
                      encodeURIComponent(
                        g.name +
                          ' ' +
                          g.mt.split('·').slice(0, 2).join(' ') +
                          ' gol',
                      )
                    }
                  >
                    Buscar en YouTube
                  </a>
                </div>
                <div className="player">
                  <div id="yt">
                    {g.yt ? (
                      <div ref={host} />
                    ) : (
                      <div className="empty">
                        Pega un enlace para cargar el vídeo
                      </div>
                    )}
                  </div>
                </div>
                <div className="marks">
                  {marks.map((k) => (
                    <div key={k} className="mk">
                      <b>{labels[k]}</b>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        id={'f_' + k}
                        value={g[k] ?? ''}
                        onChange={(e) =>
                          update({
                            [k]:
                              e.target.value === ''
                                ? undefined
                                : +e.target.value,
                          })
                        }
                      />
                      <button
                        className="b"
                        data-k={k}
                        onClick={() => update({ [k as TimeKey]: time() })}
                      >
                        {buttons[k]}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="row">
                  <button className="b g" id="test" onClick={test}>
                    ▶ Probar la pregunta (inicio → corte)
                  </button>
                  <button
                    className="b g"
                    id="next"
                    onClick={() => setCur((cur + 1) % goals.length)}
                  >
                    Siguiente gol
                  </button>
                </div>
                <div
                  className="warn"
                  id="warn"
                  style={{ color: warn ? 'var(--bad)' : 'var(--ok)' }}
                >
                  {warn || 'Listo ✔'}
                </div>
              </>
            )
          )}
        </section>
      </div>
    </div>
  );
}
