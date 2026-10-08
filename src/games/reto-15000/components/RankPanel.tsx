import { useEffect, useMemo, useRef } from 'react';
import { achievements, fmt, rankIndex, ranks, type Model } from '../model';
import { DIVS, MUNDIAL, divOf } from '../divisions';
import type { DuelView } from '../useDuel';
import type { useLanguage } from '../../../shared/i18n/provider';

type Translate = ReturnType<typeof useLanguage>['t'];
const rarityColor: Record<string, string> = {
  Mítica: '#ff6b5c',
  Legendaria: '#f3c545',
  Épica: '#c084fc',
  Rara: '#63e0a1',
  'Poco común': '#7dd3fc',
  Común: 'rgba(245,248,243,.6)',
};

function daysLeft() {
  const now = new Date();
  return Math.max(
    0,
    Math.ceil(
      (new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() -
        now.getTime()) /
        864e5,
    ),
  );
}

function SeasonPass({
  state,
  duel,
  t,
}: {
  state: Model;
  duel: DuelView;
  t: Translate;
}) {
  const best = state.store.best || 0;
  const index = rankIndex(best);
  const current = ranks[index]!;
  const next = ranks[index + 1];
  const duelMe = duel.duelMe;
  const games = duelMe ? duelMe.wins + duelMe.losses + duelMe.draws : 0;
  const division = divOf(duelMe?.elo || 1000, games ? duelMe?.pos : null);
  const ladder = DIVS.concat([MUNDIAL]);
  const activeIndex = ladder.findIndex((item) => item.name === division.name);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = track.current?.querySelector<HTMLElement>('.node.now');
    if (element && track.current)
      track.current.scrollLeft = Math.max(
        0,
        element.offsetLeft - track.current.clientWidth / 2 + 52,
      );
  }, [state.rankTab, activeIndex, index]);

  if (state.rankTab !== 'med' && state.rankTab !== 'duel') {
    return (
      <div className="pass" id="pass" hidden>
        <div className="pass-head">
          <span className="ph-ico" id="phIco" />
          <div className="ph-tx">
            <span className="ph-name" id="phName" />
            <span className="ph-sub" id="phSub" />
          </div>
        </div>
        <div className="track" id="track" ref={track} />
      </div>
    );
  }

  if (state.rankTab === 'med') {
    return (
      <div className="pass" id="pass">
        <div className="pass-head">
          <span className="ph-ico" id="phIco">
            {current.ico}
          </span>
          <div className="ph-tx">
            <span className="ph-name" id="phName">
              {t(current.name)}
            </span>
            <span className="ph-sub" id="phSub">
              {t('Mejor marca ' + fmt(best))}
              {next
                ? ' · ' +
                  t('te faltan ' + fmt(next.t - best) + ' para ' + next.name)
                : ' · ' + t('rango máximo')}
            </span>
          </div>
        </div>
        <div className="track" id="track" ref={track}>
          {ranks.map((medal, i) => (
            <div
              className={
                'node' + (i <= index ? ' on' : '') + (i === index ? ' now' : '')
              }
              key={medal.t}
            >
              {i === index && <span className="tagnow">{t('AQUÍ')}</span>}
              <span className="dot">{i <= index ? medal.ico : '🔒'}</span>
              <span className="nn">{t(medal.name)}</span>
              <span className="np">
                {fmt(medal.t)} {t('pts')}
              </span>
              <span className="nr" style={{ color: rarityColor[medal.rar] }}>
                {t(medal.rar)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const nextDivision = division === MUNDIAL ? null : ladder[activeIndex + 1];
  const personalSub = games
    ? `${duelMe!.wins} ${t(duelMe!.wins === 1 ? 'victoria' : 'victorias')} · ${duelMe!.losses} ${t(duelMe!.losses === 1 ? 'derrota' : 'derrotas')}${duelMe!.draws ? ' · ' + duelMe!.draws + ' ' + t(duelMe!.draws === 1 ? 'empate' : 'empates') : ''} · ${duelMe!.pos && duelMe!.pos <= 50 ? t('vas ' + duelMe!.pos + 'º') : t('fuera del top 50')}${games < 10 ? ' · ' + t('te quedan ' + (10 - games) + ' duelos de clasificación (subes más rápido)') : ''}`
    : t('Juega un duelo online para entrar en la clasificación');

  return (
    <div className="pass" id="pass">
      <div className="pass-head">
        <span className="ph-ico" id="phIco">
          {division.ico}
        </span>
        <div className="ph-tx">
          <span className="ph-name" id="phName">
            {t(division.name)}
          </span>
          <span className="ph-sub" id="phSub">
            {(games ? fmt(duelMe!.elo) + ' ' + t('puntos') + ' · ' : '') +
              t(
                division === MUNDIAL
                  ? 'Estás entre los 50 mejores del mundo'
                  : nextDivision === MUNDIAL
                    ? 'Para el Mundial: entrar en el top 50'
                    : 'Te faltan ' +
                      fmt((nextDivision?.t || 0) - (duelMe?.elo || 1000)) +
                      ' para ' +
                      (nextDivision?.name || ''),
              ) +
              ' · ' +
              personalSub}
          </span>
        </div>
      </div>
      <div className="track" id="track" ref={track}>
        {ladder.map((item, i) => (
          <div
            className={
              'node' +
              (i <= activeIndex ? ' on' : '') +
              (i === activeIndex ? ' now' : '')
            }
            key={item.name}
          >
            {i === activeIndex && <span className="tagnow">{t('AQUÍ')}</span>}
            <span className="dot">{i <= activeIndex ? item.ico : '🔒'}</span>
            <span className="nn">{t(item.name)}</span>
            <span className="np">
              {item === MUNDIAL ? t('Top 50') : fmt(item.t) + ' ' + t('pts')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RankPanel({
  state,
  duel,
  t,
  changeRank,
  openName,
}: {
  state: Model;
  duel: DuelView;
  t: Translate;
  changeRank: (tab: Model['rankTab']) => void;
  openName: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const rows = state.rankRows || [];
  const name = state.store.name?.trim().toLowerCase() || '';
  const registered = !!(state.store.pid && name);
  const mineIndex = registered
    ? rows.findIndex((row) => row.name.trim().toLowerCase() === name)
    : -1;
  const shown = useMemo(() => {
    const entries: Array<{ row: (typeof rows)[number]; index: number } | null> =
      rows.slice(0, 20).map((row, index) => ({ row, index }));
    if (mineIndex >= 20 && mineIndex < 50)
      entries.push(null, { row: rows[mineIndex]!, index: mineIndex });
    return entries;
  }, [rows, mineIndex]);
  useEffect(() => {
    if (
      state.scrollRequest &&
      state.view === 'rank' &&
      state.rankTab === 'duel'
    )
      panel.current?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      });
  }, [state.scrollRequest, state.view, state.rankTab]);

  return (
    <section className="panel" id="p-rank" ref={panel}>
      <div className="ranktabs">
        <button
          className="rtab"
          id="rt-day"
          aria-selected={state.rankTab === 'day'}
          onClick={() => changeRank('day')}
        >
          {t('🌍 Hoy')}
        </button>
        <button
          className="rtab"
          id="rt-all"
          aria-selected={state.rankTab === 'all'}
          onClick={() => changeRank('all')}
        >
          {t('🌍 Mejores de siempre')}
        </button>
        <button
          className="rtab"
          id="rt-med"
          aria-selected={state.rankTab === 'med'}
          onClick={() => changeRank('med')}
        >
          {t('Rangos y logros')}
        </button>
        <button
          className="rtab"
          id="rt-duel"
          aria-selected={state.rankTab === 'duel'}
          onClick={() => changeRank('duel')}
        >
          {t('⚔️ Duelos')}
        </button>
      </div>
      <SeasonPass state={state} duel={duel} t={t} />
      {state.rankTab === 'med' ? (
        <>
          <ol className="rank" id="rankList">
            <li className="medhead">
              <span>{t('Logros')}</span>
              <span className="s" />
            </li>
            {achievements.map(([id, title, desc, hidden]) => {
              const unlocked = !!state.store.ach[id];
              return (
                <li key={id} className={unlocked ? 'done' : 'locked'}>
                  <span>
                    {unlocked ? '🏅 ' : hidden ? '❓ ' : '🔒 '}
                    {!unlocked && hidden ? t('Logro oculto') : t(title)}
                    <span className="d">
                      {' '}
                      ·{' '}
                      {!unlocked && hidden ? t('Descúbrelo jugando') : t(desc)}
                    </span>
                  </span>
                  <span className="s">{unlocked ? '✓' : ''}</span>
                </li>
              );
            })}
          </ol>
          <p className="note" id="rankNote">
            {t(
              'Tu rango sube con tu mejor puntuación; una vez alcanzado no se pierde. Logros desbloqueados: ' +
                Object.keys(state.store.ach).filter((key) =>
                  achievements.some((item) => item[0] === key),
                ).length +
                ' de ' +
                achievements.length +
                ' (' +
                achievements.filter((item) => item[3]).length +
                ' ocultos).',
            )}
          </p>
        </>
      ) : state.rankTab === 'duel' ? (
        <>
          <DuelRows state={state} duel={duel} t={t} />
          <p className="note" id="rankNote">
            {duel.rankLoading && !duel.duelRows?.length
              ? t('Cargando duelos…')
              : duel.error && !duel.duelRows?.length
                ? t(duel.error)
                : t(
                    'Cada mes es una temporada: el día 1 se guarda tu clasificación como medalla y los puntos se reinician a mitad de camino de 1.000. Todos empiezan con 1.000 puntos en la Saudi Pro League. Ganar un duelo suma y perderlo resta; ganar a alguien de una liga mejor da más. En los 10 primeros duelos se sube más rápido, y desde la Premier cuesta más. Bonus: +5 si haces 12.000 en el reto y +10 si llegas a 15.000, ganes o pierdas. El Mundial es para los 50 mejores del mundo que estén a nivel Champions. Los retos por enlace son amistosos y no cuentan.',
                  )}
          </p>
        </>
      ) : (
        <>
          <ol className="rank" id="rankList">
            {shown.map((item, i) =>
              item ? (
                <li
                  key={item.row.name}
                  className={
                    registered && item.row.name.trim().toLowerCase() === name
                      ? 'mine'
                      : ''
                  }
                  style={{ counterSet: 'r ' + item.index }}
                >
                  <span>
                    {registered &&
                    item.row.name.trim().toLowerCase() === name ? (
                      <b>{item.row.name}</b>
                    ) : (
                      item.row.name
                    )}
                    {duel.season?.last?.podium?.[0]?.name
                      .trim()
                      .toLowerCase() === item.row.name.trim().toLowerCase()
                      ? ' 👑'
                      : ''}
                    <span className="d">
                      {' '}
                      · {ranks[rankIndex(item.row.score)]!.ico}{' '}
                      {t(ranks[rankIndex(item.row.score)]!.name)}
                      {state.rankTab === 'all' && item.row.day
                        ? ' · ' +
                          String(item.row.day)
                            .slice(0, 10)
                            .split('-')
                            .reverse()
                            .join('/')
                        : ''}
                    </span>
                  </span>
                  <span className="s">{fmt(item.row.score)}</span>
                </li>
              ) : (
                <li key={'gap-' + i} className="sep">
                  <span>⋯</span>
                </li>
              ),
            )}
          </ol>
          <p className="note" id="rankNote">
            {state.rankError
              ? t(state.rankError)
              : rows.length
                ? t(
                    rows.length +
                      ' jugador' +
                      (rows.length === 1 ? '' : 'es') +
                      (state.rankTab === 'day'
                        ? ' en el reto de hoy'
                        : ' con récord') +
                      (mineIndex >= 0
                        ? mineIndex < 50
                          ? ' · vas ' + (mineIndex + 1) + 'º'
                          : ' · aún no estás en el top 50'
                        : '') +
                      (state.rankTab === 'all'
                        ? '. Cada jugador aparece una vez, con su récord.'
                        : '.'),
                  )
                : t(
                    state.rankTab === 'day'
                      ? 'Nadie ha jugado aún el reto de hoy. ¡Sé el primero!'
                      : 'Todavía no hay puntuaciones. ¡Estrena el ranking!',
                  )}
          </p>
        </>
      )}
      <div
        className="rankfoot"
        id="rankFoot"
        hidden={state.rankTab === 'med' || state.rankTab === 'duel'}
      >
        <span id="rfName">
          {registered
            ? t('Juegas como: ' + state.store.name)
            : t('Aún no tienes nombre en el ranking')}
        </span>
        <button className="btn ghost" id="btnName" onClick={openName}>
          {state.store.name ? t('Cambiar nombre') : t('Elegir nombre')}
        </button>
      </div>
    </section>
  );
}

function DuelRows({
  state,
  duel,
  t,
}: {
  state: Model;
  duel: DuelView;
  t: Translate;
}) {
  const top = duel.duelRows || duel.top || [];
  const name = state.store.name?.trim().toLowerCase() || '';
  const registered = !!(state.store.pid && name);
  const mineIndex = registered
    ? top.findIndex((row) => row.name.trim().toLowerCase() === name)
    : -1;
  const rows: Array<{ row: (typeof top)[number]; index: number } | null> = top
    .slice(0, 20)
    .map((row, index) => ({ row, index }));
  if (mineIndex >= 20 && mineIndex < 50)
    rows.push(null, { row: top[mineIndex]!, index: mineIndex });
  const season = duel.season;
  const champion = season?.last?.podium?.[0];
  const medals = season?.medals || [];
  return (
    <ol
      className="rank"
      id="rankList"
      aria-label={t('Clasificación de duelos online')}
    >
      {season?.current && (
        <li className="medhead">
          <span>
            🏆{' '}
            {t('Temporada ' + season.current.num + ' · ' + season.current.name)}{' '}
            · {t('quedan ' + daysLeft() + ' días')}
          </span>
          <span className="s" />
        </li>
      )}
      {medals.length > 0 && (
        <li className="medhead">
          <span>{t('Tus medallas')}</span>
          <span className="s" />
        </li>
      )}
      {medals.map((medal, index) => {
        const div = divOf(medal.elo, medal.pos);
        const title =
          medal.pos <= 50
            ? 'TOP ' + medal.pos + ' TEMPORADA ' + medal.season
            : div.name.toUpperCase() + ' TEMPORADA ' + medal.season;
        return (
          <li className="plain" key={'medal-' + medal.season + '-' + index}>
            <span>
              {medal.pos === 1
                ? '🥇'
                : medal.pos === 2
                  ? '🥈'
                  : medal.pos === 3
                    ? '🥉'
                    : medal.pos <= 10
                      ? '🏅'
                      : medal.pos <= 50
                        ? '🎖️'
                        : div.ico}{' '}
              <b>{t(title)}</b>
              <span className="d"> · {t(medal.name)}</span>
            </span>
            <span className="s">{fmt(medal.elo)}</span>
          </li>
        );
      })}
      {champion && (
        <li className="medhead">
          <span>
            {t(
              'Campeones de la Temporada ' +
                season!.last!.num +
                ' · ' +
                season!.last!.name,
            )}
          </span>
          <span className="s" />
        </li>
      )}
      {season?.last?.podium?.map((player) => (
        <li className="plain" key={'podium-' + player.pos}>
          <span>
            {['🥇', '🥈', '🥉'][player.pos - 1] || '🏅'} {player.name}
            <span className="d">
              {' '}
              · {t('TOP ' + player.pos + ' TEMPORADA ' + season.last!.num)}
            </span>
          </span>
          <span className="s">{fmt(player.elo)}</span>
        </li>
      ))}
      <li className="medhead">
        <span>{t('Clasificación de duelos online')}</span>
        <span className="s" />
      </li>
      {!top.length && !duel.rankLoading && !duel.error && (
        <li className="plain">
          <span className="d">
            {t('Aún no se ha jugado ningún duelo. Estrena la clasificación.')}
          </span>
          <span />
        </li>
      )}
      {rows.map((item, index) =>
        item ? (
          <li
            key={item.row.name}
            className={
              registered && item.row.name.trim().toLowerCase() === name
                ? 'mine'
                : ''
            }
            style={{ counterSet: 'r ' + item.index }}
          >
            <span>
              {registered && item.row.name.trim().toLowerCase() === name ? (
                <b>{item.row.name}</b>
              ) : (
                item.row.name
              )}
              {champion?.name.trim().toLowerCase() ===
              item.row.name.trim().toLowerCase()
                ? ' 👑'
                : ''}
              <span className="d">
                {' '}
                · {divOf(item.row.elo, item.index + 1).ico}{' '}
                {t(divOf(item.row.elo, item.index + 1).name)}
              </span>
            </span>
            <span className="s">{fmt(item.row.elo)}</span>
          </li>
        ) : (
          <li className="sep" key={'sep-' + index}>
            <span>⋯</span>
          </li>
        ),
      )}
      {duel.linkMine?.created?.length || duel.linkMine?.answered?.length ? (
        <li className="medhead">
          <span>{t('Tus retos por enlace')}</span>
          <span className="s" />
        </li>
      ) : null}
      {(duel.linkMine?.created || []).map((challenge) =>
        (challenge.plays || [])
          .filter((play) => play.score != null)
          .map((play) => (
            <li
              className={
                'plain ' +
                (challenge.score > (play.score || 0)
                  ? 'w'
                  : challenge.score < (play.score || 0)
                    ? 'l'
                    : '')
              }
              key={challenge.code + play.name}
            >
              <span>
                {play.name} {t('jugó tu reto')}
                <span className="d">
                  {' '}
                  ·{' '}
                  {t(
                    challenge.score > (play.score || 0)
                      ? 'le ganaste'
                      : challenge.score < (play.score || 0)
                        ? 'te ganó'
                        : 'empate',
                  )}
                </span>
              </span>
              <span className="s">
                {fmt(challenge.score)}–{fmt(play.score || 0)}
              </span>
            </li>
          )),
      )}
      {(duel.linkMine?.answered || []).map((challenge, index) => (
        <li
          key={'answer-' + index}
          className={
            'plain ' +
            (challenge.score == null
              ? ''
              : challenge.score > challenge.rival_score
                ? 'w'
                : challenge.score < challenge.rival_score
                  ? 'l'
                  : '')
          }
        >
          <span>
            {t('Reto de ' + challenge.rival)}
            <span className="d">
              {' '}
              ·{' '}
              {t(
                challenge.score == null
                  ? 'a medias'
                  : challenge.score > challenge.rival_score
                    ? 'le ganaste'
                    : challenge.score < challenge.rival_score
                      ? 'te ganó'
                      : 'empate',
              )}
            </span>
          </span>
          <span className="s">
            {challenge.score == null
              ? '–'
              : fmt(challenge.score) + '–' + fmt(challenge.rival_score)}
          </span>
        </li>
      ))}
    </ol>
  );
}
