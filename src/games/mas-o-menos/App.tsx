import { useMemo } from 'react';
import { useLanguage } from '../../shared/i18n/provider';
import { CATEGORIES, POSITION_NAMES, type CategoryKey } from './model';
import { useGame } from './useGame';

const pad = (number: number) => String(number).padStart(2, '0');
const resultDate = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
};

function Logo() {
  return (
    <a className="brand gdlogo" href="./" aria-label="GOALDAY">
      <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <clipPath id="gdhh4">
            <rect x="0" y="0" width="100" height="63"></rect>
          </clipPath>
          <clipPath id="gddh4">
            <circle cx="50" cy="60" r="31.5"></circle>
          </clipPath>
        </defs>
        <g clipPath="url(#gdhh4)">
          <circle cx="50" cy="60" r="32" fill="#f5f8f3"></circle>
          <g clipPath="url(#gddh4)">
            <polygon
              points="50.00,33.00 59.51,39.91 55.88,51.09 44.12,51.09 40.49,39.91"
              fill="#06241a"
            ></polygon>
            <path
              d="M50.00 33.00L50.00 26.00"
              stroke="#06241a"
              strokeWidth="3"
              strokeLinecap="round"
            ></path>
            <polygon
              points="50.00,25.50 40.96,18.94 44.42,8.31 55.58,8.31 59.04,18.94"
              fill="#06241a"
            ></polygon>
            <path
              d="M59.51 39.91L66.17 37.75"
              stroke="#06241a"
              strokeWidth="3"
              strokeLinecap="round"
            ></path>
            <polygon
              points="66.64,37.59 70.09,26.97 81.26,26.97 84.71,37.59 75.68,44.16"
              fill="#06241a"
            ></polygon>
            <path
              d="M55.88 51.09L59.99 56.75"
              stroke="#06241a"
              strokeWidth="3"
              strokeLinecap="round"
            ></path>
            <polygon
              points="60.29,57.16 71.45,57.16 74.91,67.78 65.87,74.34 56.84,67.78"
              fill="#06241a"
            ></polygon>
            <path
              d="M44.12 51.09L40.01 56.75"
              stroke="#06241a"
              strokeWidth="3"
              strokeLinecap="round"
            ></path>
            <polygon
              points="39.71,57.16 43.16,67.78 34.13,74.34 25.09,67.78 28.55,57.16"
              fill="#06241a"
            ></polygon>
            <path
              d="M40.49 39.91L33.83 37.75"
              stroke="#06241a"
              strokeWidth="3"
              strokeLinecap="round"
            ></path>
            <polygon
              points="33.36,37.59 24.32,44.16 15.29,37.59 18.74,26.97 29.91,26.97"
              fill="#06241a"
            ></polygon>
          </g>
        </g>
        <path
          d="M9 72H91"
          stroke="#f5f8f3"
          strokeWidth="7"
          strokeLinecap="round"
        ></path>
      </svg>
      <span>GOALDAY</span>
    </a>
  );
}

function RegisterForm({
  busy,
  error,
  value,
  onChange,
  onSubmit,
  inputRef,
}: {
  busy: boolean;
  error: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useLanguage();
  return (
    <>
      <div className="namebox">
        <input
          ref={inputRef}
          id="nmIn"
          value={value}
          maxLength={16}
          placeholder={t('Tu nombre')}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !busy) onSubmit();
          }}
        />
        <button
          id="nmOk"
          className="btn small"
          disabled={busy}
          onClick={onSubmit}
        >
          {t('Guardar')}
        </button>
      </div>
      <div id="nmErr" className="sm">
        {t(error)}
      </div>
    </>
  );
}

export default function App() {
  const { t } = useLanguage();
  const fmt = (number: number) => t(number.toLocaleString('es-ES'));
  const game = useGame();
  const { state } = game;
  const active =
    state.phase === 'entering' ||
    state.phase === 'active' ||
    state.phase === 'reveal';
  const playerA = state.playerA;
  const playerB = state.playerB;
  const category = state.category;
  const dailyEntry = state.daily[state.todayKey];
  const left = Math.max(0, state.remaining);
  const low = left <= 3000;
  const clockVisible =
    state.phase === 'entering' ||
    state.phase === 'active' ||
    (state.phase === 'reveal' && state.isLate);
  const dailyDate = useMemo(() => resultDate(state.todayKey), [state.todayKey]);
  const clockText =
    state.phase === 'reveal' && !state.isLate
      ? 'VS'
      : String(Math.max(0, Math.ceil(left / 1000)));
  const clockClass =
    't' + (low && (state.phase === 'active' || state.isLate) ? ' low' : '');
  const barStyle = clockVisible
    ? { transform: 'scaleX(' + left / 10_000 + ')' }
    : undefined;
  const rankTabs: { key: 'diario' | CategoryKey; label: string }[] = [
    { key: 'diario', label: 'Hoy' },
    ...CATEGORIES.map((item) => ({ key: item.k, label: item.n })),
  ];

  const isReveal = state.phase === 'reveal';
  const result = state.result;
  const resultSmall = result
    ? result.mode === 'daily'
      ? (result.streak === 1 ? 'acierto seguido' : 'aciertos seguidos') +
        ' · mañana hay otro reto'
      : (result.streak === 1 ? 'acierto seguido' : 'aciertos seguidos') +
        (result.record ? ' · ¡nuevo récord!' : ' · récord: ' + result.best)
    : '';
  const resultLabel = result
    ? result.mode === 'daily'
      ? t('Reto diario') +
        ' · ' +
        pad(dailyDate.getDate()) +
        '/' +
        pad(dailyDate.getMonth() + 1) +
        '/' +
        dailyDate.getFullYear()
      : t(result.category.t)
    : '';

  return (
    <>
      <main className="wrap">
        <div className="top">
          <a className="back" href="./">
            {t('← Juegos')}
          </a>
          <Logo />
        </div>
        <h1>
          Higher or <em>Lower</em>
        </h1>
        <p className="sub" id="sub">
          {t('Sale un jugador con sus goles. ¿El siguiente tiene más o menos?')}
          <br />
          {t('Tienes')} <b>{t('10 segundos')}</b> {t('para cada respuesta.')}
        </p>

        <div id="home" hidden={state.phase !== 'home'}>
          <div className="modes" id="modesBox">
            <button
              className={'mode gold day' + (dailyEntry ? ' done' : '')}
              id="bDaily"
              onClick={game.startDaily}
            >
              <b>{t('📅 Reto diario')}</b>
              <span>
                {t(
                  'Los mismos jugadores para todo el mundo. Un solo intento al día.',
                )}
                {dailyEntry && (
                  <>
                    <br />
                    {dailyEntry.done
                      ? t('Hoy: racha ' + (dailyEntry.streak || 0)) +
                        ' · ' +
                        t('vuelve mañana')
                      : t('Hoy lo dejaste a medias') +
                        ' · ' +
                        t('vuelve mañana')}
                  </>
                )}
              </span>
            </button>
            {CATEGORIES.map((item) => (
              <button
                key={item.k}
                className="mode"
                data-cat={item.k}
                onClick={() => game.startFree(item.k)}
              >
                <b>{t('▶ ' + item.n)}</b>
                <span>
                  {t(item.d + '.')}
                  <br />
                  {t('Récord: ' + fmt(state.stats.bestByCat[item.k] || 0))}
                </span>
              </button>
            ))}
          </div>
          <div className="stats" id="homeStats">
            <div className="stat">
              <b>{fmt(state.stats.best)}</b>
              <span>{t('Mejor racha')}</span>
            </div>
            <div className="stat">
              <b>{fmt(state.stats.games)}</b>
              <span>{t('Partidas')}</span>
            </div>
            <div className="stat">
              <b>{fmt(state.stats.total)}</b>
              <span>{t('Aciertos')}</span>
            </div>
          </div>
          <div className="rank" id="rankBox">
            <h3>{t('🌍 Ranking mundial')}</h3>
            <div className="rtabs" id="rTabs">
              {rankTabs.map((tab) => (
                <button
                  key={tab.key}
                  data-r={tab.key}
                  className={state.rankTab === tab.key ? 'on' : ''}
                  onClick={() => game.selectRank(tab.key)}
                >
                  {t(tab.label)}
                </button>
              ))}
            </div>
            <div id="rankList">
              {state.rankLoading ? (
                <p className="muted">{t('Cargando…')}</p>
              ) : state.rankRows === null ? (
                <p className="muted">
                  {t('Ranking no disponible ahora mismo.')}
                </p>
              ) : state.rankRows.length === 0 ? (
                <p className="muted">
                  {t('Todavía no hay nadie. ¡Sé el primero!')}
                </p>
              ) : (
                state.rankRows.map((row) => (
                  <div
                    key={row.name}
                    className={
                      'rrow' + (row.name === state.identityName ? ' me' : '')
                    }
                  >
                    <span className="n">{row.position + 1}</span>
                    <span>{row.name}</span>
                    <span className="c">{fmt(row.streak)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div id="game" hidden={!active}>
          <div className="board">
            <div className="strip">
              <span className="ct" id="cat">
                {category
                  ? t(
                      state.mode === 'daily'
                        ? 'Reto diario'
                        : 'Goles · ' + category.n,
                    )
                  : ''}
              </span>
              <span>
                {t('Racha')}
                <b id="streak">{state.streak}</b>
              </span>
              <span>
                {t('Récord')}
                <b id="rec">
                  {category
                    ? state.mode === 'daily'
                      ? state.stats.bestDaily || 0
                      : state.stats.bestByCat[category.k] || 0
                    : 0}
                </b>
              </span>
              <i
                className={
                  'tbar' +
                  (low &&
                  (state.phase === 'active' ||
                    (state.phase === 'reveal' && state.isLate))
                    ? ' low'
                    : '')
                }
                id="tBar"
                style={barStyle}
              />
            </div>
            <div className="duel2">
              <section
                className={
                  'side' +
                  (state.phase === 'entering' && state.animating ? ' inA' : '')
                }
                id="cA"
              >
                <div className="nm">{playerA?.name || ''}</div>
                <div className="pos">
                  <span className="flag emoji">{playerA?.flag || ''}</span>{' '}
                  <span className="pn">
                    {playerA ? t(POSITION_NAMES[playerA.pos]) : ''}
                  </span>
                </div>
                <div className="led">
                  {playerA && category ? fmt(playerA[category.k]) : ''}
                </div>
                <div className="unit">{t('goles')}</div>
                <div className="foot" />
              </section>
              <div className="mid">
                <span
                  className={clockVisible ? clockClass : undefined}
                  id="tSec"
                >
                  {clockVisible ? clockText : 'VS'}
                </span>
              </div>
              <section
                className={
                  'side' +
                  (isReveal && state.isCorrect
                    ? ' ok'
                    : isReveal && !state.isCorrect
                      ? ' ko'
                      : '') +
                  (state.phase === 'entering' && state.animating ? ' inB' : '')
                }
                id="cB"
              >
                <div className="nm">{playerB?.name || ''}</div>
                <div className="pos">
                  <span className="flag emoji">{playerB?.flag || ''}</span>{' '}
                  <span className="pn">
                    {playerB ? t(POSITION_NAMES[playerB.pos]) : ''}
                  </span>
                </div>
                <div className={'led' + (!isReveal ? ' q' : '')}>
                  {isReveal ? fmt(state.shownGoals) : '???'}
                </div>
                <div className="unit">{t('goles')}</div>
                <div className="foot">
                  <div className="choice2" id="choice" hidden={isReveal}>
                    <button
                      className="up"
                      id="bMore"
                      onClick={() => game.answer(true)}
                    >
                      {t('▲ Más')}
                    </button>
                    <button
                      className="down"
                      id="bLess"
                      onClick={() => game.answer(false)}
                    >
                      {t('▼ Menos')}
                    </button>
                  </div>
                </div>
              </section>
            </div>
            <div
              className={'fb2' + (isReveal && !state.isCorrect ? ' bad' : '')}
              id="fb"
            >
              {isReveal && !state.isCorrect && (
                <>
                  {state.isLate && <>⏱️ {t('Se acabó el tiempo')}. </>}
                  {t(
                    `${playerB?.name || ''} tiene ${fmt(playerB && category ? playerB[category.k] : 0)} y ${playerA?.name || ''} ${fmt(playerA && category ? playerA[category.k] : 0)}.`,
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="res" id="res" hidden={state.phase !== 'result'}>
          {result && (
            <>
              <div className="lbl">{resultLabel}</div>
              <div className="big">{result.streak}</div>
              <div className="sm">{t(resultSmall)}</div>
              <div id="rankMsg" className="sm">
                {t(state.rankMessage)}
                {state.namePrompt === 'free-choice' && (
                  <>
                    <div>{t('Elige tu nombre para salir en el ranking')}</div>
                    <button
                      id="bName"
                      className="btn small ghost"
                      style={{ marginTop: 8 }}
                      onClick={() =>
                        game.patch({
                          namePrompt: 'free',
                          rankMessage: '',
                          nameInput: '',
                          nameError: '',
                        })
                      }
                    >
                      {t('Elegir nombre')}
                    </button>
                  </>
                )}
                {(state.namePrompt === 'free' ||
                  state.namePrompt === 'daily') && (
                  <>
                    {t('Elige tu nombre para salir en el ranking mundial:')}
                    <RegisterForm
                      busy={state.nameBusy}
                      error={state.nameError}
                      value={state.nameInput}
                      onChange={(nameInput) =>
                        game.patch({ nameInput, nameError: '' })
                      }
                      onSubmit={game.registerName}
                      inputRef={
                        state.namePrompt === 'daily'
                          ? game.resultInput
                          : game.rankingInput
                      }
                    />
                  </>
                )}
              </div>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button
                  className="btn"
                  id="bShare"
                  onClick={() => void game.share()}
                >
                  {t('Compartir')}
                </button>
                {result.mode === 'daily' ? (
                  <button
                    className="btn ghost"
                    id="bHome"
                    onClick={game.goHome}
                  >
                    {t('Volver')}
                  </button>
                ) : (
                  <>
                    <button
                      className="btn ghost"
                      id="bAgain"
                      onClick={() => game.startFree(result.category.k)}
                    >
                      {t('Otra vez')}
                    </button>
                    <button
                      className="btn ghost"
                      id="bHome"
                      onClick={game.goHome}
                    >
                      {t('Inicio')}
                    </button>
                  </>
                )}
                <span className="muted" id="shareOk">
                  {state.copied ? t('Copiado ✔') : ''}
                </span>
              </div>
            </>
          )}
        </div>
      </main>
      <div className={'toast' + (state.toast ? ' on' : '')} id="toast">
        {t(state.toast)}
      </div>
    </>
  );
}
