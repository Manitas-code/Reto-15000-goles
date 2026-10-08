import { useLanguage } from '../../shared/i18n/provider';
import { useTeam } from '../../shared/stadiums/provider';
export function App() {
  const { lang, t, setLanguage } = useLanguage();
  const { team, openPicker } = useTeam();
  return (
    <main className={'wrap'}>
      <div className={'brand'} aria-label={'GOALDAY'}>
        <svg
          width={'44'}
          height={'44'}
          viewBox={'0 0 100 100'}
          aria-hidden={'true'}
        >
          <defs>
            <clipPath id={'gdhh4'}>
              <rect x={'0'} y={'0'} width={'100'} height={'63'}></rect>
            </clipPath>
            <clipPath id={'gddh4'}>
              <circle cx={'50'} cy={'60'} r={'31.5'}></circle>
            </clipPath>
          </defs>
          <g clipPath={'url(#gdhh4)'}>
            <circle cx={'50'} cy={'60'} r={'32'} fill={'#f5f8f3'}></circle>
            <g clipPath={'url(#gddh4)'}>
              <polygon
                points={
                  '50.00,33.00 59.51,39.91 55.88,51.09 44.12,51.09 40.49,39.91'
                }
                fill={'#06241a'}
              ></polygon>
              <path
                d={'M50.00 33.00L50.00 26.00'}
                stroke={'#06241a'}
                strokeWidth={'3'}
                strokeLinecap={'round'}
              ></path>
              <polygon
                points={
                  '50.00,25.50 40.96,18.94 44.42,8.31 55.58,8.31 59.04,18.94'
                }
                fill={'#06241a'}
              ></polygon>
              <path
                d={'M59.51 39.91L66.17 37.75'}
                stroke={'#06241a'}
                strokeWidth={'3'}
                strokeLinecap={'round'}
              ></path>
              <polygon
                points={
                  '66.64,37.59 70.09,26.97 81.26,26.97 84.71,37.59 75.68,44.16'
                }
                fill={'#06241a'}
              ></polygon>
              <path
                d={'M55.88 51.09L59.99 56.75'}
                stroke={'#06241a'}
                strokeWidth={'3'}
                strokeLinecap={'round'}
              ></path>
              <polygon
                points={
                  '60.29,57.16 71.45,57.16 74.91,67.78 65.87,74.34 56.84,67.78'
                }
                fill={'#06241a'}
              ></polygon>
              <path
                d={'M44.12 51.09L40.01 56.75'}
                stroke={'#06241a'}
                strokeWidth={'3'}
                strokeLinecap={'round'}
              ></path>
              <polygon
                points={
                  '39.71,57.16 43.16,67.78 34.13,74.34 25.09,67.78 28.55,57.16'
                }
                fill={'#06241a'}
              ></polygon>
              <path
                d={'M40.49 39.91L33.83 37.75'}
                stroke={'#06241a'}
                strokeWidth={'3'}
                strokeLinecap={'round'}
              ></path>
              <polygon
                points={
                  '33.36,37.59 24.32,44.16 15.29,37.59 18.74,26.97 29.91,26.97'
                }
                fill={'#06241a'}
              ></polygon>
            </g>
          </g>
          <path
            d={'M9 72H91'}
            stroke={'#f5f8f3'}
            strokeWidth={'7'}
            strokeLinecap={'round'}
          ></path>
        </svg>
        <span className={'bname'}>{t('GOALDAY')}</span>
      </div>
      <p className={'tag'}>{t('Juegos de fútbol. Uno nuevo cada día.')}</p>
      <div className={'settings'}>
        <button
          className={'set-btn'}
          id={'btnTeam'}
          title={t('Elige tu equipo')}
          onClick={openPicker}
        >
          {team ? '🏟️ ' + team.name : t('🏟️ Equipo')}
        </button>
        <button
          className={'set-btn'}
          id={'btnLang'}
          title={t('Idioma / Language')}
          onClick={() => setLanguage(lang === 'en' ? 'es' : 'en')}
        >
          {lang === 'en' ? '🌐 ES' : '🌐 EN'}
        </button>
      </div>

      <nav className={'grid'} aria-label={t('Juegos')}>
        <a className={'game g1'} href={'reto-15000.html'}>
          <span className={'pill'}>{t('Diario · Duelos')}</span>
          <span className={'ico'}>{t('🏆')}</span>
          <span className={'tt'}>{t('Reto de los 15.000 goles')}</span>
          <span className={'ds'}>
            {t(
              '17 futbolistas, 17 casillas con multiplicadores. ¿Llegas a 15.000?',
            )}
          </span>
        </a>
        <a className={'game g3'} href={'mas-o-menos.html'}>
          <span className={'pill'}>{t('Nuevo')}</span>
          <span className={'ico'}>{t('⚖️')}</span>
          <span className={'tt'}>{t('Higher or Lower')}</span>
          <span className={'ds'}>
            {t(
              'Sale un jugador con sus goles. ¿El siguiente tiene más o menos? Aguanta la racha.',
            )}
          </span>
        </a>
        <a className={'game g4'} href={'blackjack-goles.html'}>
          <span className={'pill'}>{t('Nuevo')}</span>
          <span className={'ico'}>{t('🃏')}</span>
          <span className={'tt'}>{t('Blackjack de goles')}</span>
          <span className={'ds'}>
            {t(
              'Suma goles de jugadores y plántate antes de pasarte del objetivo.',
            )}
          </span>
        </a>
        <a className={'game g5'} href={'emoji-player.html'}>
          <span className={'pill'}>{t('Diario')}</span>
          <span className={'ico'}>{t('🕵️')}</span>
          <span className={'tt'}>{t('Emoji Player')}</span>
          <span className={'ds'}>
            {t(
              '5 futbolistas escondidos en emojis. 3 intentos para cada uno. ¿Los pillas todos?',
            )}
          </span>
        </a>
      </nav>

      <p className={'foot'}>{t('GOALDAY')}</p>
    </main>
  );
}
