import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { useLanguage } from '../../shared/i18n/provider';
import { readIdentity } from '../../shared/identity/store';
import { CHIP_COLORS, BETS, HANDS, MODES, MIN_BET } from './model';
import { useGame } from './useGame';
import type { BlackjackPlayer, Mode } from './state';

const PART = /^(van|von|der|den|de|di|del|della|da|dos|das|le|la)$/i;
const POSITIONS: Record<string, string> = {
  DEF: 'Defensa',
  MED: 'Medio',
  DEL: 'Delantero',
};
function splitName(name: string): [string, string] {
  const nick = name.match(/«(.+?)»/);
  if (nick) return ['', nick[1]!];
  const words = name.split(' ');
  if (words.length === 1) return ['', name];
  let index = words.length - 1;
  while (index > 1 && PART.test(words[index - 1]!)) index--;
  return [words.slice(0, index).join(' '), words.slice(index).join(' ')];
}
function lineSize(text: string, big: boolean) {
  const length = text.length;
  const size =
    length <= 5
      ? 17
      : length <= 7
        ? 15
        : length <= 9
          ? 13
          : length <= 11
            ? 11.5
            : 10;
  return (big ? size * 1.35 : size).toFixed(1) + 'px';
}
function overlap(count: number) {
  return count >= 8
    ? '-60px'
    : count >= 7
      ? '-56px'
      : count >= 6
        ? '-52px'
        : count >= 5
          ? '-46px'
          : count >= 4
            ? '-38px'
            : '-30px';
}

function FootballLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
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
  );
}

function Card({
  player,
  mode,
  fmt,
  positionText,
  show = true,
  down = false,
  big = false,
  className = '',
}: {
  player: BlackjackPlayer;
  mode: Mode;
  fmt: (value: number) => string;
  positionText: (text: string) => string;
  show?: boolean;
  down?: boolean;
  big?: boolean;
  className?: string;
}) {
  const [first, last] = splitName(player.name);
  const lastRef = useRef<HTMLDivElement>(null);
  const lastFontSize = lineSize(last, big);
  useLayoutEffect(() => {
    const fit = () => {
      const element = lastRef.current;
      if (!element) return;
      let size = parseFloat(element.style.fontSize) || parseFloat(lastFontSize);
      let steps = 0;
      while (
        element.scrollWidth > element.clientWidth + 1 &&
        size > 7 &&
        steps++ < 20
      ) {
        size -= 0.5;
        element.style.fontSize = size + 'px';
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [lastFontSize, last]);
  const position = player.pos as string;
  return (
    <div
      className={`card${big ? ' big' : ''}${down ? ' down' : ''} ${className}`}
    >
      <div className="in">
        <div className="f">
          <div className={`idx tl${show ? '' : ' unk'}`}>
            <b>{show ? fmt(player[mode.k] || 0) : '?'}</b>
          </div>
          <div className="c">
            <div className="fl">{player.flag}</div>
            {first && <div className="fn">{first}</div>}
            <div
              className="ln"
              ref={lastRef}
              style={{ fontSize: lastFontSize }}
            >
              {last}
            </div>
            <div className="ps">{positionText(POSITIONS[position] || '')}</div>
          </div>
          <div className={`idx br${show ? '' : ' unk'}`}>
            <b>{show ? fmt(player[mode.k] || 0) : '?'}</b>
          </div>
        </div>
        <div className="b">
          <FootballLogo />
        </div>
      </div>
    </div>
  );
}

function CardBack({ className = '' }: { className?: string }) {
  return (
    <div className={`card down ${className}`}>
      <div className="in">
        <div className="f" />
        <div className="b">
          <FootballLogo />
        </div>
      </div>
    </div>
  );
}

function ChipStack({ amount, minBet }: { amount: number; minBet: number }) {
  const count = Math.min(
    5,
    Math.max(1, Math.round(Math.log2(Math.max(1, amount / minBet)) + 1)),
  );
  return (
    <div className="stack">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="cchip"
          style={{ '--c': CHIP_COLORS[index % 4] } as CSSProperties}
        />
      ))}
    </div>
  );
}

export default function App() {
  const { t } = useLanguage();
  const game = useGame(t);
  const { state } = game;
  const { result } = state;
  const identity = readIdentity();
  const best = Math.max(0, ...Object.values(state.stats.best));
  const mode = game.currentMode;
  const active = !['home', 'result'].includes(state.phase);
  const playerTotalClass =
    state.phase === 'settled' && state.delta > 0
      ? 'win'
      : state.phase === 'settled'
        ? 'lose'
        : game.totalPlayer > state.target
          ? 'bust'
          : '';
  const dealerTotalClass =
    state.phase === 'settled'
      ? state.outcome === 'bust'
        ? ''
        : state.delta > 0
          ? 'lose'
          : 'win'
      : !state.holeDown &&
          state.dealerShownTotal != null &&
          state.dealerShownTotal > state.target
        ? 'bust'
        : '';
  const dailyText = game.dailyToday
    ? game.dailyToday.done
      ? t('Hoy: ' + game.fmt(game.dailyToday.chips || 0) + ' fichas') +
        t(' · vuelve mañana')
      : t('Hoy lo dejaste a medias · vuelve mañana')
    : '';
  const resultRecordNeedsName =
    !!result &&
    !result.isDaily &&
    result.record &&
    (!identity.pid || !identity.name);
  const betting = state.phase === 'betting';
  const dealing = state.phase === 'dealing';
  const decision = state.phase === 'decision';
  const standing = state.phase === 'standing';
  const dealer = state.phase === 'dealer';
  const settled = state.phase === 'settled';
  const dailyResult = !!result?.isDaily;
  const cardHand =
    settled || state.phase === 'result'
      ? Math.max(0, state.hand - 1)
      : state.hand;

  return (
    <>
      <main className="wrap">
        <div className="top">
          <a className="back" href="./">
            {t('← Juegos')}
          </a>
          <a className="brand gdlogo" href="./" aria-label="GOALDAY">
            <FootballLogo />
            <span>GOALDAY</span>
          </a>
        </div>
        <h1>
          Black<em>jack</em>
        </h1>
        <p className="sub" id="sub">
          {t(
            'Juega contra la banca con fichas. Ves el nombre del jugador, pero no sus goles: cógelo o plántate sin pasarte del objetivo.',
          )}
          <br />
          {t('Tienes')} <b>{t('10 segundos')}</b> {t('para decidir.')}
        </p>

        <div id="home" hidden={state.phase !== 'home'}>
          <div className="hero" id="hero">
            {game.homeCards.map((player, index) =>
              player ? (
                <Card
                  key={player.name}
                  player={player}
                  mode={MODES[0]}
                  fmt={game.fmt}
                  positionText={t}
                  show={index === 0}
                />
              ) : (
                <CardBack key={'back-' + index} />
              ),
            )}
            <CardBack />
          </div>
          <div className="modes" id="modesBox">
            <button
              className={`mode gold day${game.dailyToday ? ' done' : ''}`}
              id="bDaily"
              onClick={game.dailyStart}
            >
              <b>{t('📅 Reto diario')}</b>
              <span>
                {t(
                  'Goles en toda su carrera. Las mismas 7 manos para todo el mundo. Un solo intento al día.',
                )}
                {game.dailyToday && (
                  <>
                    <br />
                    {dailyText}
                  </>
                )}
              </span>
            </button>
            {MODES.map((choice) => (
              <button
                className="mode"
                data-m={choice.k}
                key={choice.k}
                onClick={() => game.start(choice.k)}
              >
                <b>{t('▶ ' + choice.n)}</b>
                <span>
                  {t(
                    choice.t +
                      '. Objetivo entre ' +
                      game.fmt(choice.lo) +
                      ' y ' +
                      game.fmt(choice.hi) +
                      '.',
                  )}
                  <br />
                  {t(
                    'Récord: ' +
                      game.fmt(state.stats.best[choice.k] || 0) +
                      ' fichas',
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="stats" id="homeStats">
            <div className="stat">
              <b>{game.fmt(best)}</b>
              <span>{t('Récord de fichas')}</span>
            </div>
            <div className="stat">
              <b>{game.fmt(state.stats.games)}</b>
              <span>{t('Partidas')}</span>
            </div>
            <div className="stat">
              <b>{game.fmt(state.stats.hands)}</b>
              <span>{t('Manos')}</span>
            </div>
          </div>
          <div className="rank" id="rankBox">
            <h3>{t('🌍 Ranking mundial')}</h3>
            <div className="rtabs" id="rTabs">
              {game.rankTabs.map((tab) => (
                <button
                  key={tab.key}
                  data-r={tab.key}
                  className={state.rankTab === tab.key ? 'on' : ''}
                  onClick={() => game.rankTab(tab.key)}
                >
                  {t(tab.name)}
                </button>
              ))}
            </div>
            <div id="rankList">
              {state.rankStatus === 'loading' && (
                <p className="muted">{t('Cargando…')}</p>
              )}
              {state.rankStatus === 'error' && (
                <p className="muted">
                  {t('Ranking no disponible ahora mismo.')}
                </p>
              )}
              {state.rankStatus === 'ready' && !state.ranking.length && (
                <p className="muted">
                  {t('Todavía no hay nadie. ¡Sé el primero!')}
                </p>
              )}
              {state.rankStatus === 'ready' && state.ranking.length > 0 && (
                <>
                  {state.ranking.slice(0, 10).map((row, index) => (
                    <div
                      key={row.name}
                      className={`rrow${row.name === identity.name ? ' me' : ''}`}
                    >
                      <span className="n">{index + 1}</span>
                      <span>{row.name}</span>
                      <span className="c">{game.fmt(row.chips)}</span>
                    </div>
                  ))}
                  {identity.name &&
                    state.ranking.findIndex(
                      (row) => row.name === identity.name,
                    ) >= 10 &&
                    (() => {
                      const index = state.ranking.findIndex(
                        (row) => row.name === identity.name,
                      );
                      const row = state.ranking[index]!;
                      return (
                        <div className="rrow me">
                          <span className="n">{index + 1}</span>
                          <span>{row.name}</span>
                          <span className="c">{game.fmt(row.chips)}</span>
                        </div>
                      );
                    })()}
                </>
              )}
            </div>
          </div>
          <details className="rules">
            <summary>{t('Cómo se juega')}</summary>
            <p>
              {t(
                'Empiezas con 1.000 fichas y juegas 7 manos. En cada mano apuestas 100, 200 o 300 fichas y te reparten dos jugadores; la banca también recibe dos, uno boca abajo.',
              )}
            </p>
            <p>
              {t(
                'Sale el siguiente jugador: lo coges (suma sus goles), te plantas o doblas la apuesta cogiéndolo y plantándote.',
              )}
            </p>
            <p>
              {t(
                'Si te pasas del objetivo, pierdes. Si no, la banca pide hasta llegar a su mínimo y gana quien más se acerque. El empate es para la banca.',
              )}
            </p>
            <p>
              {t(
                'Tienes 10 segundos para decidir: si se acaba el tiempo, te plantas. Clavar el objetivo paga el doble. Si te quedan menos de 100 fichas, la partida termina antes.',
              )}
            </p>
            <p>
              {t(
                'Tu puntuación son las fichas con las que acabas. El reto diario tiene las mismas 7 manos para todo el mundo y un solo intento.',
              )}
            </p>
          </details>
        </div>

        <div id="game" hidden={!active}>
          <div className="hud">
            <div className="hud-l">
              <span className="hud-mode" id="cat">
                {state.target === 0
                  ? ''
                  : state.mode === 'daily'
                    ? t('Reto diario')
                    : t(mode.n)}
              </span>
              <span className="hud-hand">
                {t('Mano')}{' '}
                <b id="handLbl">
                  {game.fmt(
                    state.phase === 'settled'
                      ? Math.max(1, state.hand)
                      : Math.min(state.hand + 1, HANDS),
                  )}
                </b>{' '}
                {t('de 7')}
              </span>
            </div>
            <div
              className={`hud-chips${state.chipTone ? ' ' + state.chipTone : ''}`}
              id="hudChips"
            >
              <span
                className="cchip"
                style={{ '--c': '#c8322a' } as CSSProperties}
              />
              <b id="chips">
                {state.target === 0 ? t('1.000') : game.fmt(game.chipDisplay)}
              </b>
            </div>
          </div>
          <div className="table" id="table">
            <div className="zone">
              <div className="zlabel">
                {t('Banca')}{' '}
                <span
                  className={`tot${dealerTotalClass ? ' ' + dealerTotalClass : ''}`}
                  id="dSum"
                >
                  {state.dealerCards.length === 0
                    ? '–'
                    : state.holeDown || state.dealerCards.length === 1
                      ? game.fmt(state.dealerCards[0]![mode.k] || 0) + '+'
                      : game.fmt(state.dealerShownTotal ?? game.totalDealer)}
                </span>
              </div>
              <div
                className="hand"
                id="dCards"
                style={
                  { '--ov': overlap(state.dealerCards.length) } as CSSProperties
                }
              >
                {state.dealerCards.map((card, index) => (
                  <Card
                    key={`${cardHand}-${index}`}
                    player={card}
                    mode={mode}
                    fmt={game.fmt}
                    positionText={t}
                    down={state.holeDown && index === 1}
                    className={[
                      index <= state.dealerAnimIndex &&
                        !(index === 1 && !state.holeDown) &&
                        'deal',
                      (settled || state.phase === 'result') &&
                        state.delta <= 0 &&
                        state.outcome !== 'bust' &&
                        'win',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ))}
              </div>
            </div>
            <div className="tmid" id="mid">
              {decision || standing ? (
                <>
                  <div className="felt-t">
                    <b>{t('Objetivo ' + game.fmt(state.target))}</b>
                  </div>
                  <div className="nextbox">
                    <div className="q">
                      {t('¿Lo coges?')}
                      <b
                        className={`tsec${state.remaining <= 3000 ? ' low' : ''}`}
                        id="tSec"
                      >
                        {decision
                          ? Math.max(0, Math.ceil(state.remaining / 1000))
                          : 0}
                      </b>
                    </div>
                    {state.nextCard && (
                      <Card
                        player={state.nextCard}
                        mode={mode}
                        fmt={game.fmt}
                        positionText={t}
                        show={false}
                        big
                        className={standing ? 'gone' : 'pop'}
                      />
                    )}
                    <div className="minispot">
                      <ChipStack amount={state.bet} minBet={MIN_BET} />
                      {game.fmt(state.bet)}
                    </div>
                  </div>
                </>
              ) : settled && state.outcome ? (
                <div
                  className={`banner ${state.delta > 0 ? 'good' : 'bad'}`}
                  onClick={game.nextHand}
                >
                  <b>{game.resultLabel(state.outcome)}</b>
                  <span>
                    {t(
                      (state.delta > 0 ? '+' : '−') +
                        game.fmt(Math.abs(state.delta)) +
                        ' fichas',
                    )}
                  </span>
                </div>
              ) : state.phase !== 'home' && state.phase !== 'result' ? (
                <>
                  <div className="felt-t">
                    <b>{t('Objetivo ' + game.fmt(state.target))}</b>
                    <small>
                      {t('La banca se planta en ' + game.fmt(state.standAt))}
                    </small>
                  </div>
                  <div className="spot">
                    <ChipStack amount={state.bet} minBet={MIN_BET} />
                    <b>{game.fmt(state.bet)}</b>
                  </div>
                </>
              ) : null}
            </div>
            <div className="zone">
              <div
                className="hand"
                id="pCards"
                style={
                  { '--ov': overlap(state.playerCards.length) } as CSSProperties
                }
              >
                {state.playerCards.map((card, index) => (
                  <Card
                    key={`${cardHand}-${index}`}
                    player={card}
                    mode={mode}
                    fmt={game.fmt}
                    positionText={t}
                    className={[
                      index <= state.playerAnimIndex && 'deal',
                      (settled || state.phase === 'result') &&
                        state.delta > 0 &&
                        'win',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ))}
              </div>
              <div className="zlabel">
                {t('Tú')}{' '}
                <span
                  className={`tot${playerTotalClass ? ' ' + playerTotalClass : ''}`}
                  id="pSum"
                >
                  {state.playerCards.length ? game.fmt(game.totalPlayer) : '–'}
                </span>
              </div>
            </div>
            <i
              className={`tbar${state.remaining <= 3000 ? ' low' : ''}`}
              id="tBar"
              hidden={!decision}
              style={{
                transform: `scaleX(${Math.max(0, state.remaining / 10_000)})`,
              }}
            />
          </div>
          <div className="panel" id="act">
            {betting && (
              <>
                <div className="chips-row">
                  {BETS.map((value, index) => (
                    <button
                      key={value}
                      className={`pchip${state.bet === value ? ' on' : ''}`}
                      data-b={value}
                      style={{ '--c': CHIP_COLORS[index] } as CSSProperties}
                      disabled={value > state.chips}
                      onClick={() => game.selectBet(value)}
                    >
                      <span>{game.fmt(value)}</span>
                    </button>
                  ))}
                </div>
                <button className="bigbtn" id="bDeal" onClick={game.deal}>
                  {t('Repartir')}
                </button>
              </>
            )}
            {dealing && (
              <div className="wait">
                {state.playerCards.length > 2 ? '\u00a0' : t('Repartiendo…')}
              </div>
            )}
            {(standing || dealer) && (
              <div className="wait">
                {state.lateStand
                  ? t('✋ Te plantas: se acabó el tiempo')
                  : t('Juega la banca…')}
              </div>
            )}
            {decision && (
              <div className="acts3">
                <button
                  className="t"
                  id="bTake"
                  onClick={() => game.take(false)}
                >
                  {t('✔ Lo cojo')}
                  <small>{t('suma sus goles')}</small>
                </button>
                <button
                  className="s"
                  id="bStand"
                  onClick={() => game.stand(false)}
                >
                  {t('✋ Me planto')}
                  <small>{t('juega la banca')}</small>
                </button>
                <button
                  className="d"
                  id="bDouble"
                  disabled={!game.canDouble}
                  onClick={() => game.take(true)}
                >
                  {t('×2 Doblo')}
                  <small>{t('lo cojo y me planto')}</small>
                </button>
              </div>
            )}
            {settled && (
              <button className="bigbtn" id="bNext" onClick={game.nextHand}>
                {t(game.over ? 'Ver resultado ▸' : 'Siguiente mano ▸')}
              </button>
            )}
          </div>
        </div>

        <div className="res" id="res" hidden={!result}>
          {result && (
            <>
              <div className="lbl">{t(result.title)}</div>
              <div className="big">{game.fmt(result.final)}</div>
              <div className="sm">{t(result.summary)}</div>
              <div className="sm">{state.log.join('')}</div>
              <div
                id="rankMsg"
                className={`sm${state.rankError ? ' bad' : ''}`}
              >
                {resultRecordNeedsName && !state.namePrompt ? (
                  <>
                    <div>{t('Elige tu nombre para salir en el ranking')}</div>
                    <button
                      className="btn small ghost"
                      id="bName"
                      style={{ marginTop: 8 }}
                      onClick={game.startNamePrompt}
                    >
                      {t('Elegir nombre')}
                    </button>
                  </>
                ) : state.namePrompt ? (
                  t('Elige tu nombre para salir en el ranking mundial:')
                ) : (
                  t(state.rankMessage)
                )}
                {state.namePrompt && (
                  <>
                    <div className="namebox">
                      <input
                        id="nmIn"
                        maxLength={16}
                        placeholder={t('Tu nombre')}
                        value={state.nameValue}
                        onChange={(event) => game.setName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void game.submitName();
                        }}
                      />
                      <button
                        id="nmOk"
                        className="btn small"
                        disabled={state.nameBusy}
                        onClick={() => void game.submitName()}
                      >
                        {t('Guardar')}
                      </button>
                    </div>
                    <div id="nmErr" className="sm">
                      {t(state.nameError)}
                    </div>
                  </>
                )}
              </div>
              <div
                className="row"
                style={{ justifyContent: 'center', marginTop: 12 }}
              >
                <button
                  className="btn"
                  id="bShare"
                  onClick={() => void game.submitShare()}
                >
                  {t('Compartir')}
                </button>
                {dailyResult ? (
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
                      onClick={() => game.start(state.modeKey)}
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
              </div>
              <div className="sm" id="shareOk">
                {t(state.shareMessage)}
              </div>
            </>
          )}
        </div>
      </main>
      <div className={`toast${state.toast ? ' on' : ''}`} id="toast">
        {t(state.toast)}
      </div>
    </>
  );
}
