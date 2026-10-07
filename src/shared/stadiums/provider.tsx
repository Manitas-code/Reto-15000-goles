import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { teams, type StadiumTeam } from './teams';
import { createStadiumRenderer, stadiumTone } from './renderer';
import { svg } from './geometry';
import { useLanguage } from '../i18n/provider';
import { pickerBaseStyle, pickerInjectedStyle } from './picker-style';

const leagues = [
  ['LL', 'LaLiga', 'LL', '20 equipos', '#f3c545'],
  ['PL', 'Premier League', 'PL', '20 equipos', '#c9a3ff'],
  ['SA', 'Serie A', 'SA', '20 equipos', '#8ad1ff'],
  ['BL', 'Bundesliga', 'BL', '18 equipos', '#ff8a80'],
  ['L1', 'Ligue 1', 'L1', '18 equipos', '#9ad0a8'],
  ['AR', 'Liga Argentina', 'AR', '30 equipos', '#7fd3ff'],
  ['MX', 'Liga MX', 'MX', '18 equipos', '#8fe3b0'],
  ['US', 'MLS', 'MLS', '30 equipos', '#7fb2ff'],
] as const;
type League = (typeof leagues)[number];
function savedTeam() {
  try {
    return localStorage.getItem('fg_team');
  } catch {
    return null;
  }
}
type TeamContextValue = {
  team: StadiumTeam | null;
  openPicker: () => void;
  chooseTeam: (team: StadiumTeam) => void;
  chooseNone: () => void;
};
const TeamContext = createContext<TeamContextValue | null>(null);
export function TeamProvider({
  children,
  autoPrompt,
}: {
  children: ReactNode;
  autoPrompt: boolean;
}) {
  const { lang, t } = useLanguage();
  const [id, setId] = useState(savedTeam);
  const team = teams.find((item) => item.id === id) || null;
  const [visible, setVisible] = useState(() => autoPrompt && !savedTeam());
  const [opened, setOpened] = useState(() => autoPrompt && !savedTeam());
  const isReto = /\/reto-15000\.html$/.test(location.pathname);
  const [league, setLeague] = useState<League | null>(() =>
    team ? leagues.find((item) => item[0] === team.league) || null : null,
  );
  const [background, setBackground] = useState<string | null>(null);
  const renderer = useRef<ReturnType<typeof createStadiumRenderer> | null>(
    null,
  );
  const close = useCallback(() => {
    if (id) setVisible(false);
  }, [id]);
  const openPicker = useCallback(() => {
    setLeague(
      team ? leagues.find((item) => item[0] === team.league) || null : null,
    );
    setOpened(true);
    setVisible(true);
  }, [team]);
  useEffect(() => {
    const api = { teams, svg, open: openPicker };
    window.FG_STADIUM = api;
    return () => {
      if (window.FG_STADIUM === api)
        delete (window as Partial<Window>).FG_STADIUM;
    };
  }, [openPicker]);
  const choose = useCallback((next: string) => {
    try {
      localStorage.setItem('fg_team', next);
    } catch {
      /* Storage is optional. */
    }
    setId(next);
    setVisible(false);
  }, []);
  const value = useMemo(
    () => ({
      team,
      openPicker,
      chooseTeam: (next: StadiumTeam) => choose(next.id),
      chooseNone: () => choose('none'),
    }),
    [team, openPicker, choose],
  );
  useLayoutEffect(() => {
    renderer.current = createStadiumRenderer(setBackground);
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    document.body.classList.toggle('hasteam', !!team);
    if (team) document.body.dataset.bg = stadiumTone(team);
    else {
      delete document.body.dataset.bg;
      document.documentElement.classList.remove('fgbg');
    }
    renderer.current?.setTeam(team);
    document.dispatchEvent(new CustomEvent('fg:team', { detail: team }));
  }, [team]);
  useEffect(() => {
    document.body.classList.toggle('tp-open', visible);
    return () => document.body.classList.remove('tp-open');
  }, [visible]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') close();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [close]);
  const ordered = [...leagues];
  if (lang === 'en') {
    const us = /^en-us/i.test(
      (navigator.languages && navigator.languages[0]) ||
        navigator.language ||
        '',
    );
    const first = us ? ['US', 'PL', 'LL'] : ['PL', 'LL'];
    ordered.sort((a, b) => {
      const ia = first.indexOf(a[0]),
        ib = first.indexOf(b[0]);
      return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib);
    });
  }
  const flag = (item: League) => (
    <span className="fl" style={{ '--lc': item[4] } as CSSProperties}>
      {item[2]}
    </span>
  );
  const picker = (
    <div
      id="teamPick"
      hidden={!visible}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="tp-in">
        <div className="tp-step" data-step="league" hidden={!!league}>
          <h2 className="tp-h">{t('¿De qué equipo eres?')}</h2>
          <p className="tp-p">
            {t(
              isReto
                ? 'Elige primero tu liga. Tu estadio será el fondo del juego y podrás cambiarlo cuando quieras.'
                : 'Elige tu liga. Tu estadio será el fondo de todos los juegos y puedes cambiarlo cuando quieras.',
            )}
          </p>
          <div className="tp-scroll">
            <div className="tp-leagues">
              {(opened ? ordered : []).map((item) => (
                <button
                  key={item[0]}
                  type="button"
                  className="tp-lg"
                  onClick={() => setLeague(item)}
                >
                  {flag(item)}
                  <b>{t(item[1])}</b>
                  <small>{t(item[3])}</small>
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="tp-skip" onClick={value.chooseNone}>
            {t('Sin equipo, gracias')}
          </button>
        </div>
        <div className="tp-step" data-step="team" hidden={!league}>
          <button
            type="button"
            className="tp-back"
            onClick={() => setLeague(null)}
          >
            {t('‹ Ligas')}
          </button>
          <h2 className="tp-h tp-lgname">
            {league && (
              <>
                {flag(league)}
                {t(league[1])}
              </>
            )}
          </h2>
          <div className="tp-scroll">
            <div className="tp-grid">
              {opened &&
                league &&
                teams
                  .filter((item) => item.league === league[0])
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        'tp-team' + (team?.id === item.id ? ' on' : '')
                      }
                      style={{ '--c': item.color } as CSSProperties}
                      onClick={() => value.chooseTeam(item)}
                    >
                      <span className="tp-crest-wrap" aria-hidden="true">
                        <img
                          className="tp-crest"
                          src={`${import.meta.env.BASE_URL}team-crests/${item.id}.png`}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      </span>
                      <span className="tp-txt">
                        <span className="tp-n">{t(item.name)}</span>
                        <span className="tp-s">{t(item.stadium)}</span>
                      </span>
                    </button>
                  ))}
            </div>
          </div>
        </div>
        {opened && (
          <button
            type="button"
            className="tp-x"
            aria-label={t('Cerrar')}
            hidden={!id}
            onClick={close}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
  return (
    <TeamContext.Provider value={value}>
      <style>{pickerBaseStyle + (isReto ? '' : pickerInjectedStyle)}</style>
      <div
        id="fgStadium"
        aria-hidden="true"
        style={{ backgroundImage: background ? `url("${background}")` : '' }}
      />
      {isReto && picker}
      {children}
      {!isReto && picker}
    </TeamContext.Provider>
  );
}
export function useTeam() {
  const value = useContext(TeamContext);
  if (!value) throw new Error('TeamProvider is required');
  return value;
}
