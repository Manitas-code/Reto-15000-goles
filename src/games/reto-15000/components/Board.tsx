import { fmt } from '../model';
import type { ReactNode } from 'react';
import { goalsFor, multiplierFor, pointsFor, N, SLOTS } from '../engine';
import { botProgress } from '../bots';
import type { Model, Pick } from '../model';
import type { DuelView } from '../useDuel';
import type { useLanguage } from '../../../shared/i18n/provider';

type Translate = ReturnType<typeof useLanguage>['t'];

function shortName(name: string) {
  const nick = name.match(/«(.+?)»/);
  if (nick) return nick[1]!;
  const words = name.split(' ');
  if (name.length <= 14 || words.length < 2) return name;
  const short = words[0]![0] + '. ' + words.slice(1).join(' ');
  return short.length <= 15 ? short : words.at(-1)!;
}

export function Board({
  state,
  t,
  place,
  skip,
  children,
  duel,
}: {
  state: Model;
  t: Translate;
  place: (index: number) => void;
  skip: () => void;
  children?: ReactNode;
  duel?: DuelView;
}) {
  const game = state.game;
  const result = state.result;
  const player = state.currentCard;
  const available = !!game && state.slotsOpen && !state.busy;
  const preview = (index: number) =>
    !!player && !!game && !game.slots[index] && state.previewVisible;
  const previewMax =
    player && game
      ? Math.max(
          0,
          ...SLOTS.map((_, index) =>
            game.slots[index]
              ? 0
              : pointsFor(player, index, multiplierFor(index, game.boost)),
          ),
        )
      : 0;
  const countShown = game ? state.displayedTotal : (result?.total ?? 0);
  const progressShown = state.counting
    ? state.progressTotal
    : (game?.total ?? result?.total ?? 0);
  const showProgress = !!result || state.counting;
  const rivalProgress = duel?.session?.bot
    ? (duel.session.botProgress ?? botProgress(duel.session.bot))
    : duel?.session?.state?.rival?.prog || 0;

  return (
    <>
      <section id="p-play" className="panel">
        <div className="dock">
          <div className="dock-row">
            <div
              className={'flip' + (state.flip ? ' flipped' : '')}
              id="flip"
              aria-live="polite"
            >
              <div className="inner">
                <div className="face front" aria-hidden="true">
                  ?
                </div>
                <div
                  className={
                    'face back' +
                    (player
                      ? ' ' +
                        (Number(player.v[9]) >= 350
                          ? 't-gold'
                          : Number(player.v[9]) >= 120
                            ? 't-silver'
                            : 't-bronze')
                      : '')
                  }
                  id="cardBack"
                >
                  <span className="flag" id="cFlag">
                    {player?.flag || ''}
                  </span>
                  <span className="name" id="cName">
                    {player?.name || ''}
                  </span>
                  <span className="pos" id="cPos">
                    {player
                      ? t(
                          (
                            {
                              DEF: 'Defensa',
                              MED: 'Centrocampista',
                              DEL: 'Delantero',
                            } as Record<string, string>
                          )[player.pos] || '',
                        )
                      : ''}
                  </span>
                </div>
              </div>
            </div>
            <div className="dock-info">
              <div className="step" id="step">
                {state.dailyMessage
                  ? t('Reto diario completado')
                  : state.counting
                    ? t('Recuento')
                    : state.view === 'result'
                      ? t('Partida terminada')
                      : t('Jugador ' + ((game?.i || 0) + 1) + ' de ' + N)}
              </div>
              <div className="cta" id="cta">
                {state.dailyMessage ? (
                  t('Cambia a partida libre para seguir jugando.')
                ) : state.counting ? (
                  t('Sumando tus 17 casillas…')
                ) : state.view === 'result' ? (
                  t('Este ha sido tu resultado.')
                ) : state.phase === 'placing' &&
                  player &&
                  game?.transition === 'place' ? (
                  (() => {
                    const placed = game.slots[state.flashSlots[0] ?? -1];
                    return placed ? (
                      <>
                        <b>{player.name}</b> →{' '}
                        {SLOTS[state.flashSlots[0]!]!.ico}{' '}
                        <span>{t(SLOTS[state.flashSlots[0]!]!.label)}</span>{' '}
                        <b>+{fmt(state.slotPoints || 0)}</b>
                      </>
                    ) : (
                      t('Sacando al siguiente jugador…')
                    );
                  })()
                ) : player ? (
                  <>
                    {game?.i === 0 && (
                      <>
                        {t('Esta partida')} <b>{t(SLOTS[game.boost]!.label)}</b>{' '}
                        {t('vale ×5.')}{' '}
                      </>
                    )}
                    {t('¿Dónde colocas a')} <b>{player.name}</b>?
                  </>
                ) : (
                  t('Sacando al primer jugador…')
                )}
              </div>
              <div
                className="dock-total"
                id="dockTotal"
                hidden={!game && !result}
              >
                <div className="tlabel">{t('Total')}</div>
                <div
                  className={'num' + (progressShown >= 15000 ? ' gold' : '')}
                  id="total"
                  data-v={countShown}
                >
                  {fmt(countShown)}
                </div>
              </div>
            </div>
          </div>
          <div
            className={'progress' + (progressShown >= 15000 ? ' over' : '')}
            id="progress"
            hidden={!showProgress}
          >
            <b id="pctLabel">
              {showProgress
                ? progressShown >= 15000
                  ? t('Objetivo superado')
                  : t(fmt(15000 - progressShown) + ' para el objetivo')
                : ''}
            </b>
            <i
              style={{
                width: Math.min(100, (100 * progressShown) / 15000) + '%',
              }}
            />
          </div>
          <div
            className="duelbar"
            id="duelBar"
            hidden={
              state.mode !== 'online' ||
              !game ||
              state.counting ||
              state.view === 'result'
            }
          >
            <span className="dbn" id="dbName">
              {state.mode === 'online' && game ? (
                <>
                  ⚔️ {duel?.session?.rivalName || 'Rival'} {rivalProgress}/{N}
                </>
              ) : (
                ''
              )}
            </span>
            <span className="dbprog">
              <i
                id="dbFill"
                style={{
                  width: Math.min(100, (100 * rivalProgress) / N) + '%',
                }}
              />
            </span>
            <span
              className={
                'dbtime' +
                (state.mode === 'online' &&
                game &&
                state.phase === 'card' &&
                (duel?.pickLeft || 0) <= 5
                  ? ' hot'
                  : '')
              }
              id="dbTime"
            >
              {state.mode === 'online' && game && state.phase === 'card'
                ? '⏱' + (duel?.pickLeft || 0)
                : ''}
            </span>
          </div>
          <div
            className="skips"
            id="skips"
            hidden={!game || state.view !== 'play'}
          >
            <button
              className="btn ghost small"
              id="btnSkip"
              disabled={!!game && (game.skips <= 0 || state.busy)}
              onClick={skip}
            >
              {t('Descartar jugador')}
            </button>
            <span className="skipdots" id="skipDots">
              {game
                ? t(
                    'Descartes: ' +
                      '●'.repeat(game.skips) +
                      '○'.repeat(2 - game.skips),
                  )
                : ''}
            </span>
          </div>
        </div>

        <ul className="board" id="board">
          {SLOTS.map((slot, index) => {
            const pick: Pick | null =
              game?.slots[index] || result?.slots[index] || null;
            const multiplier = multiplierFor(index, game?.boost ?? null);
            const isPreview = preview(index);
            const goals = isPreview ? goalsFor(player!, index) : 0;
            const points = isPreview
              ? pointsFor(player!, index, multiplier)
              : 0;
            const best = isPreview && points > 0 && points === previewMax;
            const placeFlash =
              state.flashSlots.includes(index) ||
              (game?.transition === 'place' && pick?.player === player);
            const recapVisited =
              !!pick &&
              ((state.view === 'result' && !state.counting) ||
                (state.counting && index <= state.recountIndex));
            const slotClass =
              'slot' +
              (game?.boost === index ? ' boost' : '') +
              (pick ? ' filled' : available ? ' open' : '') +
              (isPreview && points >= 1000
                ? ' big'
                : isPreview && points >= 300
                  ? ' mid'
                  : '') +
              (pick && !recapVisited && pick.points >= 1000
                ? ' big'
                : pick && !recapVisited && pick.points >= 300
                  ? ' mid'
                  : '') +
              (best ? ' best' : '') +
              (isPreview && points === 0 ? ' nil' : '') +
              (placeFlash ? ' flash' : '');
            const pointsClass = pick
              ? 'pts' +
                (pick.points === 0 ? ' zero' : '') +
                (pick.points >= 1000 ? ' big' : '') +
                (pick.points >= 300 && pick.points < 1000 ? ' mid' : '') +
                (pick.points >= 10000 && !recapVisited ? ' xl' : '')
              : 'pts' +
                (isPreview
                  ? ' preview' +
                    (points >= 1000
                      ? ' hot'
                      : points >= 300
                        ? ' mid'
                        : points === 0
                          ? ' nil'
                          : '')
                  : '');
            const score =
              state.counting && index <= state.recountIndex
                ? state.displayedSlotPoints[index]
                : pick?.points;
            const who = pick
              ? (state.view === 'result' && !state.counting) ||
                (state.counting && index <= state.recountIndex)
                ? `${pick.player.flag} ${pick.player.name}  ·  ${fmt(pick.goals)} × ${pick.mult}`
                : shortName(pick.player.name)
              : t('Libre');
            return (
              <li key={slot.label + index}>
                <button
                  type="button"
                  className={slotClass}
                  data-i={index}
                  disabled={!available || !!pick}
                  title={pick?.player.name}
                  onClick={() => place(index)}
                >
                  <span className="ico" aria-hidden="true">
                    {slot.ico}
                  </span>
                  <span className="lab">
                    <span className="lt">{t(slot.label)}</span>
                    <span className="mul">{'×' + multiplier}</span>
                  </span>
                  <span className="who">{who}</span>
                  <span
                    className="gl"
                    title={
                      isPreview
                        ? t(goals === 1 ? '1 gol' : fmt(goals) + ' goles')
                        : undefined
                    }
                  >
                    {isPreview ? fmt(goals) : ''}
                  </span>
                  <span className={pointsClass} data-v={score || 0}>
                    {isPreview
                      ? points
                        ? '+' + fmt(points)
                        : '0'
                      : score == null
                        ? ''
                        : fmt(score)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {children}
      </section>
    </>
  );
}
