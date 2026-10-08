import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLanguage } from '../../shared/i18n/provider';
import { useTeam } from '../../shared/stadiums/provider';
import { N, SLOTS, todayKey } from './engine';
import { achievements, fmt } from './model';
import { useReto } from './useReto';
import { useDuel } from './useDuel';
import { DIVS, MUNDIAL, divOf } from './divisions';
import type { DuelView } from './useDuel';
import type { OnlineRival } from '../../../contracts/reto';
import { botProgress } from './bots';
import { Board } from './components/Board';
import { RankPanel } from './components/RankPanel';

const RARCOL: Record<string, string> = {
  Mítica: '#ff6b5c',
  Legendaria: '#f3c545',
  Épica: '#c084fc',
  Rara: '#63e0a1',
  'Poco común': '#7dd3fc',
  Común: 'rgba(245,248,243,.6)',
};
function dailyCaption(
  store: ReturnType<typeof useReto>['state']['store'],
  day: string,
) {
  const played = store.daily[day];
  return played
    ? 'Hoy ya lo has jugado: ' + fmt(played.t) + ' puntos'
    : store.dailyStart?.[day]
      ? 'Hoy lo dejaste a medias. Vuelve mañana'
      : 'Los mismos 17 jugadores para todo el mundo. Un solo intento';
}
const LOGO_SRC =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="gdhs5"><rect x="0" y="0" width="100" height="63"></rect></clipPath><clipPath id="gdds5"><circle cx="50" cy="60" r="31.5"></circle></clipPath></defs><g clip-path="url(#gdhs5)"><circle cx="50" cy="60" r="32" fill="#f5f8f3"></circle><g clip-path="url(#gdds5)"><polygon points="50.00,33.00 59.51,39.91 55.88,51.09 44.12,51.09 40.49,39.91" fill="#06241a"></polygon><path d="M50.00 33.00L50.00 26.00" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="50.00,25.50 40.96,18.94 44.42,8.31 55.58,8.31 59.04,18.94" fill="#06241a"></polygon><path d="M59.51 39.91L66.17 37.75" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="66.64,37.59 70.09,26.97 81.26,26.97 84.71,37.59 75.68,44.16" fill="#06241a"></polygon><path d="M55.88 51.09L59.99 56.75" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="60.29,57.16 71.45,57.16 74.91,67.78 65.87,74.34 56.84,67.78" fill="#06241a"></polygon><path d="M44.12 51.09L40.01 56.75" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="39.71,57.16 43.16,67.78 34.13,74.34 25.09,67.78 28.55,57.16" fill="#06241a"></polygon><path d="M40.49 39.91L33.83 37.75" stroke="#06241a" stroke-width="3" stroke-linecap="round"></path><polygon points="33.36,37.59 24.32,44.16 15.29,37.59 18.74,26.97 29.91,26.97" fill="#06241a"></polygon></g></g><path d="M9 72H91" stroke="#f5f8f3" stroke-width="7" stroke-linecap="round"></path></svg>',
  );
function DuelResult({
  result,
  onAction,
  t,
  hidden = false,
}: {
  result: DuelView;
  onAction: (action: import('./useDuel').ModalAction) => void;
  t: (value: string) => string;
  hidden?: boolean;
}) {
  const session = result.session,
    online = session?.kind === 'online',
    state = session?.state;
  if (!session || !result.result)
    return <div className="duelres" id="duelRes" hidden />;
  const currentScore = session.myScore ?? state?.my_score ?? 0;
  if (!online && session.kind === 'enlace') {
    if (session.error)
      return (
        <div className="duelres" id="duelRes" hidden={hidden}>
          <div className="dr-top">
            {t(
              session.role === 'rival'
                ? 'Sin conexión'
                : 'No se ha podido crear el reto',
            )}
          </div>
          <ScoreBox
            mine={currentScore}
            rival={session.creator || 'Rival'}
            t={t}
          />
          <p className="dr-sub">
            {t(
              session.role === 'rival'
                ? 'No se ha podido enviar tu resultado.'
                : 'Revisa la conexión y vuelve a intentarlo.',
            )}
          </p>
          <div className="actions">
            <button
              className="btn"
              id="drRetry"
              onClick={() => onAction('retry')}
            >
              {t('Reintentar')}
            </button>
          </div>
        </div>
      );
    if (session.role !== 'rival')
      return (
        <div className="duelres" id="duelRes" hidden={hidden}>
          <div className="dr-top">
            {t(session.saved ? '🔗 Reto listo' : 'Creando tu reto…')}
          </div>
          <ScoreBox
            mine={currentScore}
            rival={session.creator || 'Rival'}
            t={t}
          />
          {session.saved && (
            <>
              <p className="dr-sub">
                {t(
                  'Mándale el enlace a quien quieras: jugará tus mismos 17 jugadores sin ver tu puntuación hasta el final. Verás quién te gana en la pestaña ⚔️ Duelos.',
                )}
              </p>
              <div className="actions">
                <button
                  className="btn"
                  id="drSend"
                  onClick={() => onAction('send')}
                >
                  {t('Enviar el reto')}
                </button>
              </div>
            </>
          )}
        </div>
      );
    if (!session.link)
      return (
        <div className="duelres" id="duelRes" hidden={hidden}>
          <div className="dr-top">{t('Comparando…')}</div>
          <ScoreBox
            mine={currentScore}
            rival={session.creator || 'Rival'}
            t={t}
          />
        </div>
      );
    const link = session.link,
      win = (session.myScore || 0) > link.creator_score,
      draw = session.myScore === link.creator_score;
    return (
      <div
        className={'duelres' + (win ? ' win' : draw ? '' : ' loss')}
        id="duelRes"
        hidden={hidden}
      >
        <div className="dr-top">
          {t(win ? '🏆 ¡Le has ganado!' : draw ? '🤝 Empate' : 'Te ha ganado')}
        </div>
        <ScoreBox
          mine={session.myScore || 0}
          rival={link.creator_name}
          theirs={link.creator_score}
          t={t}
        />
        <div className="actions">
          <button
            className="btn ghost"
            id="drMine"
            onClick={() => onAction('new-link')}
          >
            {t('Crear mi propio reto')}
          </button>
        </div>
        <CompareSlots
          mine={session.mySlots}
          theirs={link.creator_slots}
          rival={link.creator_name}
          t={t}
        />
      </div>
    );
  }
  const rival: OnlineRival = Object.assign(
    { name: session.rivalName || 'Rival', elo: 1000 },
    state?.rival || {},
  );
  if (session.bot && Date.now() < session.bot.finishAt && !session.error)
    return (
      <div className="duelres" id="duelRes" hidden={hidden}>
        <div className="dr-top">{t('Esperando a ' + rival.name + '…')}</div>
        <ScoreBox mine={currentScore} rival={rival.name} t={t} />
        <p className="dr-sub">
          {t(
            'Va por el jugador ' +
              Math.min(N, botProgress(session.bot) + 1) +
              ' de ' +
              N +
              '. Si se va, ganas tú.',
          )}
        </p>
      </div>
    );
  if (session.error && state?.status !== 'done')
    return (
      <div className="duelres" id="duelRes" hidden={hidden}>
        <div className="dr-top">{t('Sin conexión')}</div>
        <ScoreBox mine={currentScore} rival={rival.name} t={t} />
        <p className="dr-sub">
          {t(
            'No se ha podido enviar tu resultado. Comprueba la conexión: el duelo sigue abierto unos minutos.',
          )}
        </p>
      </div>
    );
  if (state?.status === 'cancelled')
    return (
      <div className="duelres" id="duelRes" hidden={hidden}>
        <div className="dr-top">{t('Duelo anulado')}</div>
        <ScoreBox
          mine={currentScore}
          rival={rival.name}
          theirs={state.rival?.score}
          t={t}
        />
        <p className="dr-sub">
          {t('Ninguno de los dos terminó. No cuenta para el ELO.')}
        </p>
      </div>
    );
  if (state?.status !== 'done')
    return (
      <div className="duelres" id="duelRes" hidden={hidden}>
        <div className="dr-top">{t('Esperando a ' + rival.name + '…')}</div>
        <ScoreBox mine={currentScore} rival={rival.name} t={t} />
        <p className="dr-sub">
          {t(
            rival.done
              ? 'Ya ha terminado, calculando…'
              : 'Va por el jugador ' +
                  Math.min(N, (rival.prog || 0) + 1) +
                  ' de ' +
                  N +
                  '. Si se va, ganas tú.',
          )}
        </p>
      </div>
    );
  const won = state.result === 'win',
    lost = state.result === 'loss',
    isPrivate = !!state.private;
  const title = won
    ? state.forfeit
      ? '🏆 Ganas: ' + rival.name + ' no terminó'
      : isPrivate
        ? '🏆 ¡Le has ganado!'
        : '🏆 ¡Has ganado el duelo!'
    : lost
      ? state.forfeit
        ? 'Pierdes: no terminaste a tiempo'
        : isPrivate
          ? 'Te ha ganado'
          : 'Has perdido el duelo'
      : '🤝 Empate';
  const classes = won ? 'win' : lost ? 'loss' : '';
  const division = divOf(state.my_elo || 1000, state.my_pos);
  const score = state.my_score ?? session.myScore ?? 0;
  const top = session.topAfter || session.top || result.top;
  const nextPlayer =
    state.my_pos && state.my_pos > 1 ? top[state.my_pos - 2] : null;
  const games = Number(state.my_games) || 0;
  const delta = Number(state.my_delta) || 0;
  const prevPos = session.previous?.pos;
  const movement = session.move ? t(session.move) : '';
  const nextDivision =
    DIVS.find((item) => item.t > (state.my_elo || 1000)) || MUNDIAL;
  const nextNeedPoints = Math.max(
    1,
    nextDivision === MUNDIAL
      ? Math.max(
          MUNDIAL.t - (state.my_elo || 1000),
          top.length >= 50
            ? top[49]!.elo - (state.my_elo || 1000) + 1
            : session.previous?.elo50 != null
              ? session.previous.elo50 - (state.my_elo || 1000) + 1
              : 0,
        )
      : nextDivision.t - (state.my_elo || 1000),
  );
  const bonus = Number(state.my_bonus) || 0;
  const publicSummary = (
    <>
      {movement && (
        <>
          <span className={movement.startsWith('⬆️') ? 'up' : 'down'}>
            {movement}
          </span>
          <br />
        </>
      )}
      {bonus > 0 && (
        <>
          <span className="up">
            🔥 {t('Bonus ' + (bonus >= 10 ? '15K' : '12K') + ' +' + bonus)}
          </span>
          <br />
        </>
      )}
      {division.ico} <b>{t(division.name)}</b> · {fmt(state.my_elo || 1000)}{' '}
      {t('puntos')}{' '}
      <span className={delta >= 0 ? 'up' : 'down'}>
        ({delta >= 0 ? '+' : ''}
        {delta})
      </span>
      {division === MUNDIAL && ' · ' + state.my_pos + 'º ' + t('del mundo')}
      {games > 0 && games <= 10 && (
        <>
          <br />
          {t(
            'Duelo ' +
              games +
              ' de 10 de clasificación: subes y bajas más rápido',
          )}
        </>
      )}
    </>
  );
  const privateRematch =
    state.rematch && !state.rematch.mine && state.rematch.status === 'waiting';
  const showWorld = !isPrivate;
  const worldMessage = !showWorld ? null : state.my_pos != null &&
    state.my_pos <= 50 ? (
    <>
      🌍 {t('Vas ' + state.my_pos + 'º del mundo en duelos')}
      {prevPos != null && prevPos > 50 && (
        <span className="up"> ⬆️ {t('¡entras en el top 50!')}</span>
      )}
      {prevPos != null && prevPos <= 50 && prevPos !== state.my_pos && (
        <span className={prevPos > state.my_pos ? 'up' : 'down'}>
          {' '}
          {prevPos > state.my_pos ? '⬆️ ' : '⬇️ '}
          {t(
            (prevPos > state.my_pos ? 'subes ' : 'bajas ') +
              Math.abs(prevPos - state.my_pos) +
              ' ' +
              (Math.abs(prevPos - state.my_pos) === 1 ? 'puesto' : 'puestos'),
          )}
        </span>
      )}
      {state.my_pos === 1 ? (
        <> · {t('👑 ¡Eres el número 1 del mundo!')}</>
      ) : (
        nextPlayer && (
          <>
            {' '}
            · {t('Te faltan')}{' '}
            <b>
              {fmt(Math.max(1, nextPlayer.elo - (state.my_elo || 1000) + 1))}
            </b>{' '}
            {t(
              'puntos para pasar a ' +
                nextPlayer.name +
                ' (' +
                (state.my_pos - 1) +
                'º)',
            )}
          </>
        )
      )}
    </>
  ) : (
    <>
      {prevPos != null && prevPos <= 50 && (
        <span className="down">
          ⬇️ {t('Sales del top 50')}
          <br />
        </span>
      )}
      {nextDivision === MUNDIAL ? (
        <>
          {t('Siguiente categoría: 🌍 Mundial a')} <b>{fmt(nextNeedPoints)}</b>{' '}
          {t('puntos')}
        </>
      ) : (
        <>
          {t(
            'Siguiente categoría: ' +
              nextDivision.ico +
              ' ' +
              nextDivision.name +
              ' a',
          )}{' '}
          <b>{fmt(nextNeedPoints)}</b> {t('puntos')}
        </>
      )}
    </>
  );

  return (
    <div
      className={'duelres' + (classes ? ' ' + classes : '')}
      id="duelRes"
      hidden={hidden}
    >
      <div className="dr-top">{t(title)}</div>
      <ScoreBox
        mine={score}
        rival={rival.name}
        theirs={state.rival?.score}
        t={t}
      />
      <p className="dr-sub">
        {isPrivate
          ? t('🤝 Duelo amistoso: no cuenta para el ELO')
          : publicSummary}
      </p>
      {worldMessage && <p className="worldpos">{worldMessage}</p>}
      <div className="actions">
        {privateRematch && (
          <p className="dr-sub" style={{ width: '100%' }}>
            <span className="up">
              🔁 {t(rival.name + ' quiere la revancha')}
            </span>
          </p>
        )}
        <button
          className="btn"
          id="drAgain"
          onClick={() => onAction(isPrivate ? 'rematch' : 'again')}
        >
          {t(
            privateRematch
              ? '¡Revancha!'
              : isPrivate
                ? '🔁 Jugar otra vez'
                : '⚔️ Jugar otra vez',
          )}
        </button>
        <button
          className="btn ghost"
          id="drHome"
          onClick={() => onAction('home')}
        >
          {t('Inicio')}
        </button>
      </div>
      <CompareSlots
        mine={session.mySlots}
        theirs={state.rival?.slots}
        rival={rival.name}
        t={t}
      />
    </div>
  );
}

function ScoreBox({
  mine,
  rival,
  theirs,
  t,
}: {
  mine: number;
  rival: string;
  theirs?: number | null;
  t: (value: string) => string;
}) {
  return (
    <div className="dr-score">
      <div
        className={'dr-p' + (theirs != null && mine >= theirs ? ' best' : '')}
      >
        <span className="dr-n">{t('Tú')}</span>
        <span className="dr-s">{fmt(mine)}</span>
      </div>
      <span className="dr-vs">vs</span>
      <div
        className={'dr-p' + (theirs != null && theirs >= mine ? ' best' : '')}
      >
        <span className="dr-n">{rival}</span>
        <span className="dr-s">{theirs == null ? '?' : fmt(theirs)}</span>
      </div>
    </div>
  );
}

function CompareSlots({
  mine,
  theirs,
  rival,
  t,
}: {
  mine?: [string, number][];
  theirs?: [string, number][];
  rival: string;
  t: (value: string) => string;
}) {
  if (!Array.isArray(mine) || !Array.isArray(theirs) || theirs.length !== N)
    return null;
  return (
    <details className="cmp">
      <summary>{t('Comparar casilla por casilla')}</summary>
      <div className="cmphead">
        <span />
        <span>{t('Tú')}</span>
        <span>{rival}</span>
      </div>
      <ul>
        {Array.from({ length: N }, (_, index) => {
          const a = mine[index] || ['', 0],
            b = theirs[index] || ['', 0],
            pointsA = Number(a[1]) || 0,
            pointsB = Number(b[1]) || 0;
          return (
            <li
              key={index}
              className={pointsA > pointsB ? 'w' : pointsB > pointsA ? 'l' : ''}
            >
              <span className="cs">
                {SLOTS[index]!.ico} {t(SLOTS[index]!.label)}
              </span>
              <span className="ca">
                {a[0]} <b>{fmt(pointsA)}</b>
              </span>
              <span className="cb">
                <b>{fmt(pointsB)}</b> {b[0]}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export default function App() {
  const { t } = useLanguage();
  const { team, openPicker } = useTeam();
  const game = useReto();
  const duel = useDuel(game);
  game.attachDuel(duel);
  const { state } = game;
  const [dailySub, setDailySub] = useState(() =>
    dailyCaption(state.store, todayKey()),
  );
  const result = state.result;
  const dailyDone = state.phase === 'daily-done';
  const canvas = useRef<HTMLCanvasElement>(null);
  const previousScreen = useRef({
    phase: state.phase,
    view: state.view,
    counting: state.counting,
  });
  const shareImage = useRef<HTMLImageElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const shareUrl = useRef('');
  const shareBlob = useRef<Blob | null>(null);
  const shareJob = useRef(0);
  const mounted = useRef(true);
  const latestResult = useRef(result);
  const confetti = useRef<HTMLCanvasElement>(null);
  const day = todayKey();
  const next = game.nextRank;
  const activeRankup = state.rankUp || state.rankup;
  const newAchievements = useMemo(
    () => achievements.filter(([id]) => result?.newlyUnlocked.includes(id)),
    [result],
  );
  latestResult.current = result;

  useLayoutEffect(() => {
    document.body.classList.toggle(
      'playing',
      state.view === 'play' && !dailyDone,
    );
    document.body.classList.toggle(
      'done',
      state.view === 'result' ||
        dailyDone ||
        (state.view === 'rank' && !!state.result),
    );
    return () => document.body.classList.remove('playing', 'done');
  }, [state.view, dailyDone, state.result]);
  useLayoutEffect(() => {
    const previous = previousScreen.current;
    previousScreen.current = {
      phase: state.phase,
      view: state.view,
      counting: state.counting,
    };
    const behavior: ScrollBehavior = matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
      ? 'auto'
      : 'smooth';
    if (
      state.view === 'play' &&
      state.phase === 'card' &&
      previous.view !== 'play'
    ) {
      window.scrollTo(0, 0);
      return;
    }
    if (state.counting && !previous.counting) {
      document
        .getElementById('p-play')
        ?.scrollIntoView({ behavior, block: 'start' });
      return;
    }
    if (previous.counting && !state.counting && state.view === 'result') {
      document
        .getElementById(
          state.mode === 'online' || state.mode === 'enlace'
            ? 'duelRes'
            : 'result',
        )
        ?.scrollIntoView({ behavior, block: 'start' });
    }
  }, [state.counting, state.mode, state.phase, state.view]);
  useLayoutEffect(() => {
    if (
      state.scrollRequest > 0 &&
      state.view === 'rank' &&
      state.rankTab === 'duel'
    ) {
      const behavior: ScrollBehavior = matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
        ? 'auto'
        : 'smooth';
      document
        .getElementById('p-rank')
        ?.scrollIntoView({ behavior, block: 'start' });
    }
  }, [state.rankTab, state.scrollRequest, state.view]);
  useEffect(() => {
    if (
      !state.confetti ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const canvasEl = confetti.current;
    const ctx = canvasEl?.getContext('2d');
    if (!canvasEl || !ctx) return;
    const width = innerWidth,
      height = innerHeight;
    canvasEl.width = width;
    canvasEl.height = height;
    const colors = ['#f3c545', '#ffe08a', '#63e0a1', '#f5f8f3', '#ff6b5c'];
    const bits = Array.from({ length: 140 }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.5,
      vx: -1 + Math.random() * 2,
      vy: 2 + Math.random() * 3,
      r: 4 + Math.random() * 5,
      a: Math.random() * 6,
      va: -0.1 + Math.random() * 0.2,
      c: colors[Math.floor(Math.random() * colors.length)]!,
    }));
    const started = performance.now();
    let raf = 0,
      stopped = false;
    const draw = (time: number) => {
      if (stopped) return;
      ctx.clearRect(0, 0, width, height);
      bits.forEach((bit) => {
        bit.x += bit.vx;
        bit.y += bit.vy;
        bit.a += bit.va;
        ctx.save();
        ctx.translate(bit.x, bit.y);
        ctx.rotate(bit.a);
        ctx.fillStyle = bit.c;
        ctx.fillRect(-bit.r / 2, -bit.r / 2, bit.r, bit.r * 1.6);
        ctx.restore();
      });
      if (time - started < 3200) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, width, height);
    };
  }, [state.confettiKey, state.confetti]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      shareJob.current++;
      if (shareUrl.current) URL.revokeObjectURL(shareUrl.current);
    };
  }, []);
  useEffect(() => {
    shareJob.current++;
    shareBlob.current = null;
    if (shareUrl.current) URL.revokeObjectURL(shareUrl.current);
    shareUrl.current = '';
  }, [result]);
  useEffect(() => {
    if (state.modal !== 'name') return;
    if (nameInput.current) nameInput.current.value = state.name;
    const id = window.setTimeout(() => nameInput.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [state.modal]);

  function closeModal() {
    if (state.modal === 'share') shareJob.current++;
    if (state.modal === 'share' && shareUrl.current) {
      URL.revokeObjectURL(shareUrl.current);
      shareUrl.current = '';
      shareBlob.current = null;
    }
    game.closeModal();
  }
  function startDaily() {
    game.start(false, 'diario');
  }
  function startFree() {
    game.start(false, 'libre');
  }
  function startOnline() {
    if (state.counting) {
      game.toast('Espera a que termine el recuento', '⏳');
      return;
    }
    duel.startOnline();
  }
  function startRoom() {
    if (state.counting) {
      game.toast('Espera a que termine el recuento', '⏳');
      return;
    }
    duel.startRoom();
  }
  function openDuelRank() {
    game.changeRank('duel');
    game.patch({ scrollRequest: state.scrollRequest + 1 });
  }
  function showRank() {
    game.showRankup(true);
  }
  function startAgain() {
    shareJob.current++;
    if (state.mode === 'online' || state.mode === 'enlace') duel.act('again');
    else if (state.mode === 'diario') game.start(false, 'libre');
    else game.again();
  }
  function goHome() {
    shareJob.current++;
    setDailySub(dailyCaption(state.store, todayKey()));
    game.goHome();
  }
  function openName() {
    game.closeModal();
    game.patch({
      modal: 'name',
      name: state.store.name || '',
      nameError: '',
      nameBusy: false,
    });
  }

  async function drawShare() {
    if (!result || !canvas.current) return;
    const resultSnapshot = result;
    const job = ++shareJob.current;
    const c = canvas.current,
      x = c.getContext('2d');
    if (!x) return;
    const logo = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = LOGO_SRC;
    });
    try {
      await document.fonts.load('600 46px Jost');
    } catch {
      /* Use fallback fonts. */
    }
    if (
      !mounted.current ||
      shareJob.current !== job ||
      latestResult.current !== resultSnapshot ||
      !canvas.current
    )
      return;
    const W = c.width,
      H = c.height;
    x.fillStyle = '#06241a';
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 150) {
      x.fillStyle = (i / 150) % 2 ? '#0d4a33' : '#0b4530';
      x.fillRect(i, 0, 150, H);
    }
    const glow = x.createRadialGradient(W / 2, 0, 0, W / 2, 0, H);
    glow.addColorStop(0, 'rgba(255,255,220,.18)');
    glow.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = glow;
    x.fillRect(0, 0, W, H);
    x.textAlign = 'center';
    x.fillStyle = '#f3c545';
    x.font = '700 34px Barlow, sans-serif';
    x.fillText(
      (result.daily
        ? t('RETO DIARIO') + ' · ' + result.date.split('-').reverse().join('/')
        : t('RETO DE LOS 15.000 GOLES')
      ).toUpperCase(),
      W / 2,
      110,
    );
    x.fillStyle = '#f5f8f3';
    x.font = '900 96px "Barlow Condensed", Impact, sans-serif';
    x.fillText(t('RETO DE LOS'), W / 2, 215);
    x.fillStyle = '#f3c545';
    x.fillText(t('15.000 GOLES'), W / 2, 305);
    x.font = '900 200px "Barlow Condensed", Impact, sans-serif';
    x.fillStyle = result.pass ? '#63e0a1' : '#f5f8f3';
    x.fillText(fmt(result.total), W / 2, 520);
    x.font = '700 40px Barlow, sans-serif';
    x.fillStyle = '#f5f8f3';
    x.fillText(t('puntos'), W / 2, 575);
    x.font = '900 56px "Barlow Condensed", sans-serif';
    x.fillStyle = '#f3c545';
    x.save();
    x.font = '90px "Noto Color Emoji",sans-serif';
    x.fillText(result.med.ico, W / 2, 700);
    x.restore();
    x.fillText(t(result.med.name).toUpperCase(), W / 2, 770);
    x.font = '700 28px Barlow, sans-serif';
    x.fillStyle = 'rgba(245,248,243,.72)';
    x.fillText(
      t(
        'Medalla ' +
          result.med.rar.toUpperCase() +
          ' · la consiguen ' +
          result.med.pct +
          ' de los jugadores',
      ),
      W / 2,
      815,
    );
    result.slots
      .map((pick, i) => ({ ...pick, i }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .forEach((pick, index) => {
        const y = 880 + index * 100;
        x.fillStyle = 'rgba(255,255,255,.08)';
        x.fillRect(90, y - 48, W - 180, 72);
        x.fillStyle = '#f5f8f3';
        x.textAlign = 'left';
        x.font = '700 38px Barlow, sans-serif';
        const name =
          pick.player.name.length > 22
            ? pick.player.name.slice(0, 21) + '…'
            : pick.player.name;
        x.fillText(name + '  ·  ' + t(SLOTS[pick.i]!.label), 120, y);
        x.textAlign = 'right';
        x.fillStyle = '#f3c545';
        x.font = '900 46px "Barlow Condensed", sans-serif';
        x.fillText(fmt(pick.points), W - 120, y);
      });
    x.textAlign = 'center';
    x.fillStyle = 'rgba(245,248,243,.75)';
    x.font = '600 34px Barlow, sans-serif';
    x.fillText(
      t(
        result.pass
          ? '¡Reto superado!'
          : 'Me faltaron ' + fmt(result.goal - result.total) + ' puntos',
      ),
      W / 2,
      1210,
    );
    x.fillStyle = 'rgba(245,248,243,.5)';
    x.font = '600 30px Barlow, sans-serif';
    x.fillText(t('¿Lo superas tú?'), W / 2, 1255);
    x.font = '600 46px Jost, "Century Gothic", sans-serif';
    if ('letterSpacing' in x) x.letterSpacing = '6px';
    const textWidth = x.measureText('GOALDAY').width,
      mark = 64,
      gap = 14,
      left = W / 2 - (mark + gap + textWidth) / 2;
    if (logo) x.drawImage(logo, left, 1264, mark, mark);
    x.textAlign = 'left';
    x.fillStyle = '#f5f8f3';
    x.fillText('GOALDAY', left + mark + gap, 1318);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    x.textAlign = 'center';
    shareBlob.current = await new Promise<Blob | null>((resolve) =>
      c.toBlob(resolve, 'image/png'),
    );
    if (
      !shareBlob.current ||
      !mounted.current ||
      shareJob.current !== job ||
      latestResult.current !== resultSnapshot
    )
      return;
    if (shareUrl.current) URL.revokeObjectURL(shareUrl.current);
    shareUrl.current = URL.createObjectURL(shareBlob.current);
    game.patch({ modal: 'share' });
  }
  async function shareNow() {
    if (!shareBlob.current || !result) return;
    const text =
      t(
        (result.daily ? 'Reto diario ' : '') +
          'Reto de los 15.000 goles ⚽ ' +
          fmt(result.total) +
          ' puntos · ' +
          result.med.name +
          '. ¿Lo superas? ',
      ) + location.href;
    try {
      const file = new File([shareBlob.current], 'goalday-15000.png', {
        type: 'image/png',
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      const a = document.createElement('a');
      a.href = shareUrl.current;
      a.download = 'goalday-15000.png';
      a.click();
    } catch {
      /* Sharing can be cancelled. */
    }
  }

  const xpLevels = [0, 3000, 9000, 20000, 40000, 70000, 110000, 170000, 250000];
  const xpStart = xpLevels[game.xpLevel] || 0;
  const nextXp = xpLevels[game.xpLevel + 1];
  const xpProgress = nextXp
    ? Math.max(
        0,
        Math.min(100, (100 * (state.store.xp - xpStart)) / (nextXp - xpStart)),
      )
    : 100;
  const champ = duel.view.season?.last?.podium?.[0];
  const world = duel.view.world;
  const myDivision = world ? divOf(world.elo, world.pos) : null;
  const worldGames = world ? world.wins + world.losses + world.draws : 0;
  const elo50 = duel.view.top.length >= 50 ? duel.view.top[49]!.elo : null;
  const worldGap =
    world && worldGames ? (
      world.pos && world.pos <= 50 ? (
        world.elo >= MUNDIAL.t ? (
          <>
            {t('Estás en el')} <b>{t('top 50')}</b> {t('y juegas el Mundial')}
          </>
        ) : (
          <>
            {t('Estás en el')} <b>{t('top 50')}</b> · {t('te faltan')}{' '}
            <b>{fmt(MUNDIAL.t - world.elo)}</b> {t('puntos para el Mundial')}
          </>
        )
      ) : elo50 == null ? (
        t('Top 50 por llenar: gana duelos para entrar')
      ) : (
        <>
          {t('Te faltan')} <b>{fmt(Math.max(1, elo50 - world.elo + 1))}</b>{' '}
          {t('puntos para entrar en el top 50')}
        </>
      )
    ) : (
      t('Juega un duelo online para entrar en la clasificación')
    );
  const showDailyBar =
    !!(state.game || result || dailyDone) &&
    ['diario', 'online', 'enlace'].includes(state.mode);
  const dailyBarText =
    state.dailyMessage ||
    (state.mode === 'diario'
      ? 'Reto diario del ' +
        day.split('-').reverse().join('/') +
        ' · mismos 17 jugadores para todo el mundo, una sola partida'
      : state.mode === 'online'
        ? (duel.view.session?.private
            ? '🤝 Duelo amistoso contra '
            : '⚔️ Duelo contra ') +
          (duel.view.session?.rivalName || 'Rival') +
          ' · mismos 17 jugadores para los dos'
        : duel.view.session?.role === 'rival'
          ? '🔗 Reto de ' +
            (duel.view.session.creator || '') +
            ' · te tocan sus mismos 17 jugadores'
          : '🔗 Tu reto · al terminar tendrás el enlace para mandarlo');

  return (
    <>
      <canvas id="confetti" ref={confetti} hidden={!state.confetti} />
      <div className="toasts" id="toasts">
        {state.toasts.map((toast) => (
          <div className="toast on" key={toast.id}>
            <span>{toast.icon}</span>
            <span>
              {toast.parts
                ? toast.parts.map((part, i) =>
                    part.strong ? (
                      <b key={i}>{t(part.text)}</b>
                    ) : (
                      <Fragment key={i}>{t(part.text)}</Fragment>
                    ),
                  )
                : t(toast.message)}
            </span>
          </div>
        ))}
      </div>
      <div
        className="rankup"
        id="rankUp"
        hidden={!activeRankup}
        onClick={(e) => {
          if (e.target === e.currentTarget)
            game.patch({ rankUp: null, rankup: null });
        }}
      >
        <div className="ru-in">
          <span className="ru-tag">
            {t(
              activeRankup?.review ? 'TU RANGO ACTUAL' : 'HAS SUBIDO DE RANGO',
            )}
          </span>
          <span className="ru-ico" id="ruIco">
            {activeRankup?.rank.ico}
          </span>
          <span className="ru-name" id="ruName">
            {t(activeRankup?.rank.name || '')}
          </span>
          <span
            className="ru-rar"
            id="ruRar"
            style={{
              color: activeRankup ? RARCOL[activeRankup.rank.rar] : undefined,
              borderColor: activeRankup
                ? RARCOL[activeRankup.rank.rar]
                : undefined,
            }}
          >
            {activeRankup?.rank.rar.toUpperCase()}
          </span>
          <span className="ru-rew" id="ruRew">
            {activeRankup
              ? next
                ? t(
                    'Siguiente rango: ' +
                      next.ico +
                      ' ' +
                      next.name +
                      ' · desde ' +
                      fmt(next.t) +
                      ' puntos',
                  )
                : t('Has llegado al rango máximo')
              : ''}
          </span>
          <button
            className="btn"
            id="ruOk"
            onClick={() => game.patch({ rankUp: null, rankup: null })}
          >
            {t('Continuar')}
          </button>
        </div>
      </div>
      <div
        className={'intro' + (state.intro ? ' go' : '')}
        id="intro"
        hidden={!state.intro}
      >
        <div className="intro-in">
          <span className="ib">⚽</span>
          <span className="it" id="introTit">
            {state.intro
              ? t(
                  state.mode === 'online'
                    ? 'DUELO ONLINE'
                    : state.mode === 'enlace'
                      ? 'RETO A UN AMIGO'
                      : state.mode === 'diario'
                        ? 'RETO DIARIO'
                        : 'PARTIDA LIBRE',
                )
              : ''}
          </span>
          <span className="is" id="introSub">
            {state.game
              ? t('Liga ×5 de hoy: ') + t(SLOTS[state.game.boost]!.label)
              : ''}
          </span>
        </div>
      </div>
      <main
        className="wrap"
        style={
          state.view === 'play' && !dailyDone
            ? { height: '100dvh', minHeight: '100dvh' }
            : undefined
        }
      >
        <a className="home-link" href="./">
          {t('← Juegos')}
        </a>
        <header className="hero">
          <div className="brand" aria-label="GOALDAY">
            <span className="logo-mark" aria-hidden="true">
              <svg
                width="44"
                height="44"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id="gdhh4">
                    <rect x="0" y="0" width="100" height="63" />
                  </clipPath>
                  <clipPath id="gddh4">
                    <circle cx="50" cy="60" r="31.5" />
                  </clipPath>
                </defs>
                <g clipPath="url(#gdhh4)">
                  <circle cx="50" cy="60" r="32" fill="#f5f8f3" />
                  <g clipPath="url(#gddh4)">
                    <polygon
                      points="50.00,33.00 59.51,39.91 55.88,51.09 44.12,51.09 40.49,39.91"
                      fill="#06241a"
                    />
                    <path
                      d="M50.00 33.00L50.00 26.00"
                      stroke="#06241a"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="50.00,25.50 40.96,18.94 44.42,8.31 55.58,8.31 59.04,18.94"
                      fill="#06241a"
                    />
                    <path
                      d="M59.51 39.91L66.17 37.75"
                      stroke="#06241a"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="66.64,37.59 70.09,26.97 81.26,26.97 84.71,37.59 75.68,44.16"
                      fill="#06241a"
                    />
                    <path
                      d="M55.88 51.09L59.99 56.75"
                      stroke="#06241a"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="60.29,57.16 71.45,57.16 74.91,67.78 65.87,74.34 56.84,67.78"
                      fill="#06241a"
                    />
                    <path
                      d="M44.12 51.09L40.01 56.75"
                      stroke="#06241a"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="39.71,57.16 43.16,67.78 34.13,74.34 25.09,67.78 28.55,57.16"
                      fill="#06241a"
                    />
                    <path
                      d="M40.49 39.91L33.83 37.75"
                      stroke="#06241a"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="33.36,37.59 24.32,44.16 15.29,37.59 18.74,26.97 29.91,26.97"
                      fill="#06241a"
                    />
                  </g>
                </g>
                <path
                  d="M9 72H91"
                  stroke="#f5f8f3"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="bname">GOALDAY</span>
          </div>
          <span className="kicker">
            {t('GOALDAY · 17 jugadores · 17 casillas · un objetivo')}
          </span>
          <h1>
            {t('Reto de los')}
            <em>{t('15.000 goles')}</em>
          </h1>
          <p className="lead">
            {t(
              'Van saliendo futbolistas al azar, uno a uno, y tú decides en qué casilla colocar a cada uno. Ves lo que sumaría en cada casilla, pero cada una solo se usa una vez: ¿la ocupas ya o guardas el hueco para alguien mejor?',
            )}
          </p>
          <details className="how">
            <summary>{t('Cómo se juega')}</summary>
            <ol>
              <li>
                {t(
                  'Sale una carta con un jugador. Verás cuántos puntos daría en cada casilla: elige bien dónde ponerlo, porque cada casilla solo se usa una vez y no sabes quién vendrá después.',
                )}
              </li>
              <li>
                {t(
                  'Suma sus goles en esa categoría por el multiplicador: Champions ×10, Selección ×10, Mundiales ×100, final del Mundial ×1000…',
                )}
              </li>
              <li>
                {t(
                  'En cada partida una de las seis ligas vale ×5 en vez de ×1.',
                )}
              </li>
              <li>
                {t(
                  'Si un jugador no te convence, puedes descartarlo: tienes 2 descartes por partida.',
                )}
              </li>
              <li>
                {t(
                  'Tras 17 jugadores, si pasas del objetivo has superado el reto. Al final verás cuántos puntos daba la mejor colocación posible.',
                )}
              </li>
            </ol>
          </details>
        </header>
        <div className="champ" id="champ" hidden={!champ}>
          {champ && (
            <>
              <span className="ch-ico">👑</span>
              <span className="ch-tx">
                <span className="ch-tag">
                  {state.store.pid &&
                  state.store.name?.trim().toLowerCase() ===
                    champ.name.trim().toLowerCase()
                    ? t('¡Eres el campeón!')
                    : t('Campeón de la temporada pasada')}
                </span>
                <span className="ch-name">{champ.name}</span>
                <span className="ch-sub">
                  {t(
                    'TOP 1 TEMPORADA ' +
                      duel.view.season?.last?.num +
                      ' · ' +
                      duel.view.season?.last?.name +
                      ' · ' +
                      fmt(champ.elo) +
                      ' puntos',
                  )}
                </span>
              </span>
            </>
          )}
        </div>
        <button
          className="mypos"
          id="myPos"
          hidden={!state.store.pid || !state.store.name || !world}
          onClick={openDuelRank}
        >
          {world && myDivision && (
            <>
              <span>
                ⚔️ {t('Duelos:')}{' '}
                <b>
                  {world.pos && world.pos <= 50
                    ? world.pos + 'º ' + t('del mundo')
                    : world.pos
                      ? t('fuera del top 50')
                      : t('sin clasificar')}
                </b>{' '}
                · {myDivision.ico} {t(myDivision.name)} · {fmt(world.elo)}{' '}
                {t('pts')}
              </span>
              <span className="mp-sub">{worldGap}</span>
              {duel.view.season?.current && (
                <span className="mp-sub">
                  🏆{' '}
                  {t(
                    'Temporada ' +
                      duel.view.season.current.num +
                      ' · ' +
                      duel.view.season.current.name,
                  )}{' '}
                  · {t('quedan ' + duel.view.seasonDaysLeft + ' días')}
                </span>
              )}
            </>
          )}
        </button>
        <div className="modes" id="modes">
          <button className="mode" id="tab-diario" onClick={startDaily}>
            <span className="mtit">{t('Reto diario')}</span>
            <span className="msub" id="dailySub">
              {t(dailySub)}
            </span>
          </button>
          <button className="mode ghost" id="tab-libre" onClick={startFree}>
            <span className="mtit">{t('Partida libre')}</span>
            <span className="msub">{t('Juega las veces que quieras')}</span>
          </button>
          <button className="mode duel" id="tab-online" onClick={startOnline}>
            <span className="mtit">{t('⚔️ Duelo online')}</span>
            <span className="msub">
              {t(
                'Contra un rival en directo, mismos 17 jugadores. Asciende de la liga de San Marino al Mundial',
              )}
            </span>
          </button>
          <button className="mode duel" id="tab-enlace" onClick={startRoom}>
            <span className="mtit">{t('🔗 Reta a un amigo')}</span>
            <span className="msub">
              {t(
                'Le mandas un enlace y jugáis a la vez los mismos 17, en directo',
              )}
            </span>
          </button>
        </div>
        <div className="bar">
          <button
            className="icon-btn"
            id="btnSound"
            aria-label={t('Sonido')}
            title={t('Sonido')}
            onClick={game.toggleSound}
          >
            {state.sound ? '🔊' : '🔇'}
          </button>
          {team && (
            <button
              className="icon-btn"
              title={t('Cambiar estadio')}
              onClick={openPicker}
            >
              🏟️
            </button>
          )}
        </div>
        <p className="dailybar" id="dailyBar" hidden={!showDailyBar}>
          {showDailyBar ? t(dailyBarText) : ''}
        </p>
        <Board
          state={state}
          t={t}
          place={game.place}
          skip={game.skip}
          duel={duel.view}
        >
          <div className="result" id="result" hidden={!result}>
            <DuelResult
              result={duel.view}
              onAction={duel.act}
              t={t}
              hidden={
                !result || (state.mode !== 'online' && state.mode !== 'enlace')
              }
            />
            <div
              className={'medal' + (result ? ' pop' : '')}
              id="medal"
              hidden={!result}
            >
              <span className={'mtag' + (result?.up ? ' up' : '')} id="mTag">
                {result
                  ? t(result.up ? '¡HAS SUBIDO DE RANGO!' : 'TU RANGO')
                  : ''}
              </span>
              <span className="mico" id="mIco">
                {result?.med.ico}
              </span>
              <span className="mname" id="mName">
                {result ? t(result.med.name) : ''}
              </span>
              <span
                className="mpct"
                id="mPct"
                style={{
                  color: result ? RARCOL[result.med.rar] : undefined,
                  borderColor: result ? RARCOL[result.med.rar] : undefined,
                }}
              >
                {result && (
                  <>
                    <b>{t(result.med.rar).toUpperCase()}</b> ·{' '}
                    {t(game.pct[result.med.t] || '100%')}{' '}
                    {t('de los jugadores llega aquí')}
                  </>
                )}
              </span>
              <div className="rankbar">
                <i
                  id="rankFill"
                  style={{
                    width:
                      (result && next
                        ? Math.max(
                            3,
                            Math.min(
                              100,
                              (100 * (state.store.best - result.med.t)) /
                                Math.max(1, next.t - result.med.t),
                            ),
                          )
                        : result
                          ? 100
                          : 0) + '%',
                  }}
                />
              </div>
              <span className="msubt" id="mSub">
                {result
                  ? next
                    ? t(
                        'Siguiente: ' +
                          next.ico +
                          ' ' +
                          next.name +
                          ' · te faltan ' +
                          fmt(next.t - state.store.best) +
                          ' puntos en una partida',
                      )
                    : t('Rango máximo alcanzado')
                  : ''}
              </span>
              <span className="mrew" id="mRew" />
            </div>
            <div className="rlabel">{t('Puntos totales')}</div>
            <div className="num gold" id="rNum" data-v={state.displayedResult}>
              {fmt(state.displayedResult)}
            </div>
            <div
              className={
                'verdict' + (result ? (result.pass ? ' pass' : ' fail') : '')
              }
              id="rVerdict"
            >
              {result
                ? result.pass
                  ? t('¡Reto superado!')
                  : t('No llegas: te faltan ' + fmt(result.goal - result.total))
                : ''}
            </div>
            <div className="lvlbar">
              <i
                id="lvlFill"
                style={{ width: result ? xpProgress + '%' : '0%' }}
              />
            </div>
            <p className="lvltext" id="lvlText">
              {result
                ? t(
                    'Nivel ' +
                      (game.xpLevel + 1) +
                      ' · ' +
                      game.levelName +
                      (nextXp
                        ? ' · ' +
                          fmt(Math.max(0, nextXp - state.store.xp)) +
                          ' XP para el siguiente nivel'
                        : ' · máximo'),
                  )
                : ''}
            </p>
            <p className="opt" id="rOpt">
              {result
                ? t(
                    result.best > result.total
                      ? 'La mejor colocación posible de estos 17 daba ' +
                          fmt(result.best) +
                          ' puntos' +
                          (result.best >= result.goal && !result.pass
                            ? ', suficientes para el reto.'
                            : '.')
                      : 'Colocación perfecta: no se podía sacar más con estos 17.',
                  )
                : ''}
            </p>
            <p
              className="worldpos"
              id="worldPos"
              hidden={!state.scoreWorldPosition?.visible}
            >
              {state.scoreWorldPosition?.parts.map((part, index) =>
                part.strong ? (
                  <b key={index}>{t(part.text)}</b>
                ) : (
                  <Fragment key={index}>{t(part.text)}</Fragment>
                ),
              )}
            </p>
            <ul
              className="unlocked"
              id="unlocked"
              hidden={!result || !newAchievements.length}
            >
              {newAchievements.map(([id, title, , hidden]) => (
                <li key={id}>
                  {t(hidden ? '❓ Logro oculto: ' : '🏅 Logro: ')}
                  {t(title)}
                </li>
              ))}
            </ul>
            <div className="actions">
              <button className="btn" id="btnAgain" onClick={startAgain}>
                {t(
                  state.mode === 'online'
                    ? duel.view.lastPrivate
                      ? '🔁 Jugar otra vez'
                      : '⚔️ Jugar otra vez'
                    : state.mode === 'enlace'
                      ? 'Crear otro reto'
                      : 'Jugar otra vez',
                )}
              </button>
              <button
                className="btn ghost"
                id="btnShare"
                onClick={() => void drawShare()}
              >
                {t('Compartir imagen')}
              </button>
              <button className="btn ghost" id="btnRank" onClick={showRank}>
                {t('Ver mi rango')}
              </button>
              <button className="btn ghost" id="btnHome" onClick={goHome}>
                {t('Inicio')}
              </button>
            </div>
            <ul className="summary" id="summary">
              {result?.slots
                .map((pick, i) => ({ pick, i }))
                .sort((a, b) => b.pick.points - a.pick.points)
                .map(({ pick, i }, index) => (
                  <li
                    key={i}
                    className={index < 3 && pick.points > 0 ? 'top' : ''}
                  >
                    <span>
                      {`${SLOTS[i]!.ico} `}
                      <b>{pick.player.name}</b>
                      {` ${t('en')} ${t(SLOTS[i]!.label)} ×${pick.mult}`}
                    </span>
                    <span className="p">{fmt(pick.points)}</span>
                  </li>
                ))}
            </ul>
          </div>
          <dl className="stats">
            <div>
              <dt>{t('Partidas')}</dt>
              <dd id="sGames">{state.store.games}</dd>
            </div>
            <div>
              <dt>{t('Retos superados')}</dt>
              <dd id="sWins">{state.store.wins}</dd>
            </div>
            <div>
              <dt>{t('Mejor total')}</dt>
              <dd id="sBest">
                {state.store.best ? fmt(state.store.best) : '–'}
              </dd>
            </div>
          </dl>
        </Board>
        <RankPanel
          state={state}
          duel={duel.view}
          t={t}
          changeRank={game.changeRank}
          openName={openName}
        />
        <footer>
          {t(
            'Basado en el reto viral de los 15.000 goles. Cifras de goles aproximadas.',
          )}
          <br />
          {t('Tus resultados se guardan en este dispositivo.')}
          <br />
          <b style={{ color: 'var(--gold)' }}>v53</b>
        </footer>
        <div className="modal" id="nameModal" hidden={state.modal !== 'name'}>
          <div className="namebox">
            <span className="nb-ico">🌍</span>
            <span className="nb-tit">{t('Ranking mundial')}</span>
            <p className="note">
              {t(
                'Elige tu nombre para salir en el ranking (2 a 16 caracteres). Es único: nadie más podrá usarlo.',
              )}
            </p>
            <input
              id="nameInput"
              ref={nameInput}
              maxLength={16}
              autoComplete="nickname"
              placeholder={t('Tu nombre')}
              onChange={(e) => game.patch({ name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void game.saveName();
              }}
            />
            <p className="nb-err" id="nameErr">
              {t(state.nameError)}
            </p>
            <div className="actions">
              <button
                className="btn"
                id="btnNameOk"
                disabled={state.nameBusy}
                onClick={() => void game.saveName()}
              >
                {t(state.nameBusy ? 'Comprobando…' : 'Guardar')}
              </button>
              <button
                className="btn ghost"
                id="btnNameSkip"
                onClick={closeModal}
              >
                {t('Ahora no')}
              </button>
            </div>
          </div>
        </div>
        <div
          className="modal"
          id="duelModal"
          hidden={!state.dailyConfirm && !duel.view.modal}
        >
          <div className="namebox duelbox">
            <span className="nb-ico" id="dmIco">
              {state.dailyConfirm ? '📅' : duel.view.modal?.icon}
            </span>
            <span className="nb-tit" id="dmTit">
              {t(
                state.dailyConfirm
                  ? 'Reto diario'
                  : duel.view.modal?.title || '',
              )}
            </span>
            <p className="note" id="dmTxt">
              {state.dailyConfirm ? (
                <>
                  {t('Tienes')} <b>{t('un solo intento')}</b>{' '}
                  {t(
                    'al día. Si sales a medias o cierras la página, cuenta como jugado y no podrás volver a entrar hasta mañana.',
                  )}
                </>
              ) : duel.view.modal?.rival ? (
                ''
              ) : duel.view.modal?.textParts ? (
                duel.view.modal.textParts.map((part, index) =>
                  part.strong ? (
                    <b key={index}>{t(String(part.text))}</b>
                  ) : (
                    <Fragment key={index}>{t(String(part.text))}</Fragment>
                  ),
                )
              ) : (
                t(duel.view.modal?.text || '')
              )}
            </p>
            <div id="dmExtra">
              {!state.dailyConfirm &&
                (duel.view.modal?.extraParts ? (
                  <p className="note">
                    {duel.view.modal.extraParts.map((part, index) =>
                      part.strong ? (
                        <b key={index}>{t(String(part.text))}</b>
                      ) : (
                        <Fragment key={index}>{t(String(part.text))}</Fragment>
                      ),
                    )}
                  </p>
                ) : (
                  duel.view.modal?.extra && (
                    <p className="note">{t(duel.view.modal.extra)}</p>
                  )
                ))}
              {!state.dailyConfirm && duel.view.modal?.plays?.length ? (
                <ol
                  className="rank"
                  style={{ textAlign: 'left', width: '100%', marginTop: 8 }}
                >
                  {duel.view.modal.plays.map((play, index) => (
                    <li
                      className={'plain ' + play.className}
                      key={play.name + index}
                    >
                      <span>
                        {play.name}
                        <span className="d"> · {t(play.label)}</span>
                      </span>
                      <span className="s">
                        {play.score == null ? '–' : fmt(play.score)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {!state.dailyConfirm && duel.view.modal?.noPlays && (
                <p className="note">{t('Todavía no lo ha jugado nadie.')}</p>
              )}
              {!state.dailyConfirm && duel.view.modal?.rival && (
                <div className="dm-rival">
                  <b>{duel.view.modal.rival.name}</b>
                  <span className="note">{t(duel.view.modal.rival.note)}</span>
                </div>
              )}
              {!state.dailyConfirm && duel.view.modal?.displayCode && (
                <div className="dm-clock">{duel.view.modal.displayCode}</div>
              )}
              {!state.dailyConfirm &&
                duel.view.modal?.title === 'Buscando rival' && (
                  <div className="dm-clock" id="dmClock">
                    {Math.floor(duel.view.searchSeconds / 60)}:
                    {String(duel.view.searchSeconds % 60).padStart(2, '0')}
                  </div>
                )}
              {!state.dailyConfirm && duel.view.countdown > 0 && (
                <div
                  className="dm-clock"
                  id={
                    duel.view.modal?.title === 'Buscando rival'
                      ? undefined
                      : 'dmClock'
                  }
                >
                  {duel.view.countdown}
                </div>
              )}
            </div>
            <div className="actions" id="dmAct">
              {state.dailyConfirm ? (
                <>
                  <button
                    className="btn"
                    onClick={() => game.start(true, 'diario')}
                  >
                    {t('Empezar')}
                  </button>
                  <button className="btn ghost" onClick={goHome}>
                    {t('Ahora no')}
                  </button>
                </>
              ) : (
                duel.view.modal?.buttons.map((button, index) => (
                  <button
                    key={button.action + index}
                    className={'btn' + (button.ghost ? ' ghost' : '')}
                    onClick={() => duel.act(button.action)}
                  >
                    {t(button.label)}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        <canvas
          id="shareCanvas"
          width="1080"
          height="1350"
          ref={canvas}
          hidden
        />
        <div
          className="modal"
          id="shareModal"
          hidden={state.modal !== 'share'}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal-in">
            <img
              id="shareImg"
              ref={shareImage}
              src={shareUrl.current || undefined}
              alt={t('Resultado')}
            />
            <p className="note">
              {t('Mantén pulsada la imagen para guardarla, o usa el botón.')}
            </p>
            <div className="actions">
              <button
                className="btn"
                id="btnShareNow"
                onClick={() => {
                  void shareNow();
                }}
              >
                {t('Compartir')}
              </button>
              <button
                className="btn ghost"
                id="btnCloseShare"
                onClick={closeModal}
              >
                {t('Cerrar')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
