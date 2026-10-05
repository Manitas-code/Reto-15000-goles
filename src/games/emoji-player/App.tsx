import { useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import { useLanguage } from '../../shared/i18n/provider';
import { dayKey } from './engine';
import { POINTS } from './model';
import { useGame } from './useGame';
import { useIdentity } from '../../shared/identity/provider';

const pad = (value: number) => String(value).padStart(2, '0');
const scoreText = (value: number) => value.toLocaleString('es-ES');

function NameForm({
  name,
  error,
  busy,
  submit,
  onChange,
  inputId,
  buttonLabel,
  buttonId,
  errorId,
  busyLabel,
  inputRef,
}: {
  name: string;
  error: string;
  busy: boolean;
  submit: () => void;
  onChange: (value: string) => void;
  inputId: string;
  buttonLabel: string;
  buttonId: string;
  errorId: string;
  busyLabel?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const { t } = useLanguage();
  return (
    <>
      <div className="namebox">
        <input
          ref={inputRef}
          id={inputId}
          value={name}
          maxLength={16}
          placeholder={t('Tu nombre')}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !busy) submit();
          }}
        />
        <button
          id={buttonId}

          className="btn small"
          disabled={busy}
          onClick={submit}
        >
          {t(busy && busyLabel ? busyLabel : buttonLabel)}
        </button>
      </div>
      <div id={errorId} className="sm">
        {t(error)}
      </div>
    </>
  );
}

export default function App() {
  const { lang, t, setLanguage } = useLanguage();
  const game = useGame();
  const { state, day, index, fails, target, picks, inputRef, suggestions } =
    game;
  const [rankName, setRankName] = useState('');
  const todayDate = useMemo(() => {
    const [year, month, date] = state.today.split('-').map(Number);
    return new Date(year!, month! - 1, date!);
  }, [state.today]);
  const streak = useMemo(() => {
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return state.store.lastDone === state.today ||
      state.store.lastDone === dayKey(yesterday)
      ? state.store.streak
      : 0;
  }, [state.store.lastDone, state.store.streak, state.today, todayDate]);
  const formattedDate = todayDate.toLocaleDateString(
    lang === 'en' ? 'en-GB' : 'es-ES',
    { weekday: 'long', day: 'numeric', month: 'long' },
  );
  const identity = useIdentity();

  function shareText() {
    if (!day) return '';
    const squares = day.res
      .map((result) =>
        result === 1 ? '🟩' : result === 2 ? '🟨' : result === 3 ? '🟧' : '⬛',
      )
      .join('');
    return (
      'GOALDAY · Emoji Player ' +
      todayDate.getDate() +
      '/' +
      pad(todayDate.getMonth() + 1) +
      '\n' +
      squares +
      ' ' +
      scoreText(day.score) +
      ' pts' +
      (state.store.streak > 1 ? ' · 🔥' + state.store.streak : '') +
      '\n' +
      location.origin +
      location.pathname
    );
  }

  async function share() {
    const text = t(shareText());
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        game.toast('Copiado ✔');
      }
    } catch {
      // User cancellation and unavailable share targets leave the result intact.
    }
  }

  const startLabel = day
    ? day.done
      ? 'Ver mi resultado de hoy'
      : '▶ Continuar el reto de hoy'
    : '▶ Jugar el reto de hoy';
  const worth = POINTS[Math.min(fails.length, 2)];
  const statusClass =
    'fb' + (state.feedbackKind ? ' ' + state.feedbackKind : '');
  const onGuessKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      game.patch({
        suggestionIndex: (state.suggestionIndex + 1) % suggestions.length,
      });
      event.preventDefault();
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      game.patch({
        suggestionIndex:
          (state.suggestionIndex - 1 + suggestions.length) % suggestions.length,
      });
      event.preventDefault();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      game.submitQuery();
    } else if (event.key === 'Escape') {
      game.patch({ suggestionsOpen: false });
    }
  };

  return (
    <>
      <main className="wrap">
        <div className="top">
          <a className="back" href="index.html">
            {t('← Juegos')}
          </a>
          <span className="brand">GOALDAY</span>
          <button
            className="set-btn"
            id="btnLang"

            title={t('Idioma / Language')}
            onClick={() => setLanguage(lang === 'es' ? 'en' : 'es')}
          >
            {lang === 'es' ? '🌐 EN' : '🌐 ES'}
          </button>
        </div>
        <h1>
          Emoji <em>Player</em>
        </h1>
        <p className="sub" id="subTitle">
          {t('5 futbolistas escondidos en emojis. ')}
          <b>{t('3 intentos')}</b>
          {t(' para cada uno.')}
        </p>

        <section id="home" hidden={state.phase !== 'home'}>
          <div className="stage">
            <div className="emojis">
              <span>🐐</span>
              <span>🔟</span>
              <span>❓</span>
              <span>❓</span>
            </div>
            <p className="worth">
              {t('Hoy:')} <b id="homeDate">{formattedDate}</b>
            </p>
            <p className="muted">
              {t(
                'Acierta a la primera: 600 puntos · a la segunda: 400 · a la tercera: 200. Los mismos 5 jugadores para todo el mundo. Un solo intento al día.',
              )}
            </p>
            <p className="muted" id="streakLine">
              {streak
                ? t('🔥 Racha: ' + streak + (streak === 1 ? ' día' : ' días'))
                : ''}
            </p>
            <div
              className="row"
              hidden={state.nameOpen}
              style={{ marginTop: 10 }}
            >
              <button
                className="btn"
                id="btnStart"

                onClick={() => game.start()}
              >
                {t(startLabel)}
              </button>
            </div>
            <div
              id="nameBox"
              hidden={!state.nameOpen}
              style={{ marginTop: 14, textAlign: 'left' }}
            >
              <p className="worth" style={{ margin: '0 0 4px' }}>
                {t('Elige tu nombre para el ranking mundial:')}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                {t(
                  'Vale para todos los juegos de GOALDAY. Máximo 16 caracteres.',
                )}
              </p>
              <NameForm
                name={state.name}
                error={state.nameError}
                busy={state.registrationBusy}
                submit={() => void game.register(state.name)}
                onChange={(name) => game.patch({ name, nameError: '' })}
                inputId="nmIn0"
                buttonId="nmOk0"
                errorId="nmErr0"
                buttonLabel="Guardar y jugar"
                busyLabel="Comprobando…"
                inputRef={game.nameInputRef}
              />
              <button
                className="set-btn"
                id="nmSkip0"

                style={{ marginTop: 10 }}
                onClick={() => {
                  game.patch({ nameOpen: false, nameError: '' });
                  game.start(true);
                }}
              >
                {t('Ahora no')}
              </button>
            </div>
          </div>
        </section>

        <section id="game" hidden={state.phase !== 'game'}>
          <div className="bar">
            <span>
              {t('Jugador')}{' '}
              <b id="idx">{state.phase === 'game' ? index + 1 : 1}</b>{' '}
              {t('de 5')}
            </span>
            <div className="dots" id="dots">
              {state.phase === 'game' &&
                Array.from({ length: 5 }, (_, dot) => {
                  const result = day?.res[dot];
                  const className =
                    result !== undefined
                      ? result === 1
                        ? 'g'
                        : result === 2
                          ? 'y'
                          : result === 3
                            ? 'o'
                            : 'k'
                      : dot === index
                        ? 'now'
                        : '';
                  return <span key={dot} className={className} />;
                })}
            </div>
            <span className="pts" id="pts">
              {scoreText(state.phase === 'game' ? day?.score || 0 : 0)}
            </span>
          </div>
          <div className="stage">
            <div className="emojis" id="emojis">
              {state.phase === 'game' &&
                target?.emojis.map((emoji, emojiIndex) => (
                  <span key={emojiIndex}>{emoji}</span>
                ))}
            </div>
            <p className="worth">
              {t('Vale')}{' '}
              <b id="worth">{state.phase === 'game' ? worth : 600}</b>{' '}
              {t('puntos')}
            </p>
            <div className="tries" id="tries">
              {[0, 1, 2].map((attempt) => (
                <span
                  key={attempt}
                  className={
                    state.phase === 'game' && attempt < fails.length ? 'x' : ''
                  }
                />
              ))}
            </div>
            <div className="guesses" id="guesses">
              {state.phase === 'game' &&
                fails.map((name) => <span key={name}>{name}</span>)}
            </div>
            <div className="guess">
              <div className="sug" id="sug" hidden={!suggestions.length}>
                {suggestions.map((player, suggestion) => (
                  <button
                    key={player.name}

                    className={suggestion === state.suggestionIndex ? 'on' : ''}
                    onClick={() => game.chooseGuess(player, true)}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
              <input
                ref={inputRef}
                id="inp"
                value={state.query}
                placeholder={t('Escribe el nombre del jugador')}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={state.reveal}
                onChange={(event) =>
                  game.patch({
                    query: event.target.value,
                    suggestionsOpen: true,
                    suggestionIndex: 0,
                  })
                }
                onKeyDown={onGuessKey}
              />
              <button
                className="btn small"
                id="btnGo"

                disabled={state.reveal}
                onClick={game.submitQuery}
              >
                {t('Probar')}
              </button>
            </div>
            <div className={statusClass} id="fb">
              {t(state.feedback)}
            </div>
            <div
              className="reveal"
              id="reveal"
              hidden={!state.reveal || !target}
            >
              <div className="nm" id="rvName">
                {state.reveal ? target?.name : ''}
              </div>
              <div className="mt" id="rvPts">
                {state.reveal
                  ? day?.res[index]
                    ? '+' +
                      POINTS[day.res[index]! - 1] +
                      ' ' +
                      t('puntos') +
                      ' · ' +
                      t('intento ' + day.res[index])
                    : '0 ' + t('puntos')
                  : ''}
              </div>
              <p id="rvWhy">{state.reveal && target ? t(target.why) : ''}</p>
              <button
                className="btn"
                id="btnNext"

                onClick={game.nextPlayer}
              >
                {t(
                  state.reveal && index === 4
                    ? 'Ver resultado'
                    : 'Siguiente jugador →',
                )}
              </button>
            </div>
          </div>
        </section>

        <section id="end" hidden={state.phase !== 'end'}>
          <div className="stage done">
            <div
              className="nm"
              style={{
                fontFamily: 'Barlow Condensed',
                fontWeight: 900,
                fontSize: 34,
                textTransform: 'uppercase',
              }}
            >
              {t('Reto de hoy completado')}
            </div>
            <div className="grid" id="endGrid">
              {state.phase === 'end'
                ? (day?.res || []).map((result, cell) => (
                    <div
                      key={cell}
                      className={
                        'cell ' +
                        (result === 1
                          ? 'g'
                          : result === 2
                            ? 'y'
                            : result === 3
                              ? 'o'
                              : 'k')
                      }
                    >
                      {result === 1
                        ? '🟩'
                        : result === 2
                          ? '🟨'
                          : result === 3
                            ? '🟧'
                            : '⬛'}
                    </div>
                  ))
                : null}
            </div>
            <div className="stats">
              <div className="stat">
                <b id="endPts">
                  {state.phase === 'end' ? scoreText(day?.score || 0) : '0'}
                </b>
                <span>{t('puntos de 3.000')}</span>
              </div>
              <div className="stat">
                <b id="endHits">
                  {state.phase === 'end'
                    ? day?.res.filter((result) => result > 0).length || 0
                    : 0}
                </b>
                <span>{t('aciertos de 5')}</span>
              </div>
              <div className="stat">
                <b id="endStreak">
                  {state.phase === 'end' ? state.store.streak : 0}
                </b>
                <span>{t('días seguidos')}</span>
              </div>
            </div>
            <div className="row">
              <button
                className="btn"
                id="btnShare"

                onClick={() => void share()}
              >
                {t('📤 Compartir resultado')}
              </button>
              <button
                className="btn ghost"
                id="btnReview"

                onClick={() => game.patch({ review: !state.review })}
              >
                {t('Ver los jugadores')}
              </button>
            </div>
            <p className="muted" id="endNote">
              {t('Mañana hay 5 jugadores nuevos.')}
            </p>
            <div id="rankMsg" className="muted" style={{ marginTop: 8 }}>
              {t(state.rankMessage)}
              {day?.done &&
                (!identity.pid || !identity.name) &&
                !state.rankMessage && (
                  <>
                    {t('Elige tu nombre para salir en el ranking mundial:')}
                    <NameForm
                      name={rankName}
                      error={state.nameError}
                      busy={state.registrationBusy}
                      submit={() => void game.register(rankName, true)}
                      onChange={(name) => {
                        setRankName(name);
                        game.patch({ nameError: '' });
                      }}
                      inputId="nmIn"
                      buttonId="nmOk"
                      errorId="nmErr"
                      buttonLabel="Guardar"
                    />
                  </>
                )}
            </div>
          </div>
          <div id="review" hidden={!state.review}>
            {state.phase === 'end' &&
              picks.map((player, playerIndex) => {
                const result = day?.res[playerIndex] || 0;
                return (
                  <div className="reveal" key={player.name}>
                    <div className="emoji" style={{ fontSize: 26 }}>
                      {player.emojis.join(' ')}
                    </div>
                    <div className="nm">{player.name}</div>
                    <div className="mt">
                      {result
                        ? t('intento ' + result) +
                          ' · +' +
                          POINTS[result - 1] +
                          ' ' +
                          t('puntos')
                        : t('no acertado')}
                    </div>
                    <p>{t(player.why)}</p>
                  </div>
                );
              })}
          </div>
        </section>

        <section className="rank" id="rankBox">
          <h2>{t('🌍 Ranking semanal')}</h2>
          <div className="tabs">
            <button
              className={state.rankTab === 'week' ? 'on' : ''}
              id="tabWeek"

              onClick={() => game.changeRankTab('week')}
            >
              {t('Esta semana')}
            </button>
            <button
              className={state.rankTab === 'day' ? 'on' : ''}
              id="tabDay"

              onClick={() => game.changeRankTab('day')}
            >
              {t('Hoy')}
            </button>
          </div>
          <ol id="rankList">
            {state.rankLoading ? (
              <li className="muted">{t('Cargando…')}</li>
            ) : state.rankRows === null ? (
              <li className="muted">
                {t('Ranking no disponible ahora mismo.')}
              </li>
            ) : state.rankRows.length === 0 ? (
              <li className="muted">
                {t('Todavía no hay nadie. ¡Sé el primero!')}
              </li>
            ) : (
              state.rankRows.map(({ name, score, position }) => (
                <li key={name} className={name === identity.name ? 'me' : ''}>
                  <span>
                    <span className="n">
                      {position < 3
                        ? ['🥇', '🥈', '🥉'][position]
                        : position + 1}
                    </span>
                    {name}
                  </span>
                  <span>{t(scoreText(score))}</span>
                </li>
              ))
            )}
          </ol>
          <p className="muted">
            {t(
              'La semana se cierra el domingo a medianoche y el lunes empieza de cero. Los 3 primeros de cada semana ganan medalla.',
            )}
          </p>
        </section>
      </main>
      <div id="toast" className={'toast' + (state.toast ? ' on' : '')}>
        {t(state.toast)}
      </div>
    </>
  );
}
