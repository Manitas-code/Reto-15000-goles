export type Division = { t: number; ico: string; name: string; top?: number };
export const DIVS: Division[] = [
  { t: 0, ico: '🇸🇲', name: 'Liga de San Marino' },
  { t: 750, ico: '🇮🇳', name: 'Indian Super League' },
  { t: 825, ico: '🇦🇺', name: 'A-League' },
  { t: 900, ico: '🇺🇸', name: 'MLS' },
  { t: 950, ico: '🇸🇦', name: 'Saudi Pro League' },
  { t: 1050, ico: '🇦🇷', name: 'Liga Argentina' },
  { t: 1100, ico: '🇳🇱', name: 'Eredivisie' },
  { t: 1150, ico: '🇵🇹', name: 'Liga Portugal' },
  { t: 1200, ico: '🇫🇷', name: 'Ligue 1' },
  { t: 1250, ico: '🇩🇪', name: 'Bundesliga' },
  { t: 1300, ico: '🇮🇹', name: 'Serie A' },
  { t: 1350, ico: '🇪🇸', name: 'LaLiga' },
  {
    t: 1400,
    ico: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
    name: 'Premier League',
  },
  { t: 1450, ico: '🟢', name: 'Conference League' },
  { t: 1500, ico: '🟠', name: 'Europa League' },
  { t: 1550, ico: '🌎', name: 'Copa Libertadores' },
  { t: 1600, ico: '🏆', name: 'Champions League' },
];
export const MUNDIAL: Division = {
  t: 1600,
  ico: '🌍',
  name: 'Mundial',
  top: 50,
};
export function divOf(elo: number, pos: number | null | undefined): Division {
  if (pos && pos <= MUNDIAL.top! && elo >= MUNDIAL.t) return MUNDIAL;
  return (
    DIVS.slice()
      .reverse()
      .find((division) => elo >= division.t) || DIVS[0]!
  );
}
export function divMove(
  elo: number,
  pos: number | undefined,
  previous: string | undefined,
) {
  const current = divOf(elo, pos);
  if (!previous || previous === current.name) return '';
  const ladder = DIVS.concat(MUNDIAL),
    from = ladder.findIndex((division) => division.name === previous),
    to = ladder.indexOf(current);
  if (from < 0) return '';
  return to > from
    ? '⬆️ ¡Ascenso a ' + current.name + '!'
    : '⬇️ Desciendes a ' + current.name;
}
