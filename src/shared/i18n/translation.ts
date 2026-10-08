import { baseDictionary } from './dictionary';
import { emojiPlayers } from '../../data/emoji-players';

export type Language = 'es' | 'en';
type TranslationRule = [
  RegExp,
  string | ((match: RegExpMatchArray) => string | null),
];

export function createTranslator(lang: Language) {
  const D: Record<string, string> = { ...baseDictionary };
  for (const r of emojiPlayers) if (r[5] && r[6]) D[r[5]] = r[6];
  function ord(n: string | number): string {
    n = +n;
    const t = n % 100,
      u = n % 10;
    return (
      n +
      (t > 10 && t < 14
        ? 'th'
        : u === 1
          ? 'st'
          : u === 2
            ? 'nd'
            : u === 3
              ? 'rd'
              : 'th')
    );
  }
  function pl(n: string | number, a: string, b: string): string {
    return n + ' ' + (n === '1' || n === 1 ? a : b);
  }
  const RULES: TranslationRule[] = [
    [
      /^(\d+)º$/,
      function (m) {
        return ord(m[1]);
      },
    ],
    [
      /^(\d+)º del mundo$/,
      function (m) {
        return ord(m[1]) + ' in the world';
      },
    ],
    [
      /^vas (\d+)º$/,
      function (m) {
        return "you're " + ord(m[1]);
      },
    ],
    [/^([\d.]+) puntos$/, '$1 points'],
    [/^desde ([\d.]+) puntos$/, 'from $1 points'],
    [/^intento (\d+)$/, 'guess $1'],
    [
      /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo), (\d+) de (\S+)$/,
      function (m) {
        return (
          (
            {
              lunes: 'Monday',
              martes: 'Tuesday',
              miércoles: 'Wednesday',
              jueves: 'Thursday',
              viernes: 'Friday',
              sábado: 'Saturday',
              domingo: 'Sunday',
            } as Record<string, string>
          )[m[1]] +
          ' ' +
          m[2] +
          ' ' +
          tr1(m[3])
        );
      },
    ],
    [
      /^(\S+) (\d{4})$/,
      function (m) {
        const x = get(m[1]);
        return x && /^[A-Z][a-z]+$/.test(x) ? x + ' ' + m[2] : null;
      },
    ],
    [
      /^No se ha podido guardar en el ranking \((.+)\)\.$/,
      "Couldn't save to the ranking ($1).",
    ],
    [
      /^🌍 Guardado en el ranking( mundial)? como (.+)$/,
      function (m) {
        return (
          '🌍 Saved to the ' + (m[1] ? 'world ' : '') + 'ranking as ' + m[2]
        );
      },
    ],
    [/^Nombre registrado: (.+)$/, 'Name registered: $1'],
    [
      /^🔥 Racha: (\d+) días?$/,
      function (m) {
        return '🔥 Streak: ' + pl(m[1], 'day', 'days');
      },
    ],
    // blackjack y más o menos
    [
      /^Goles en toda su carrera\. Objetivo entre ([\d.]+) y ([\d.]+)\.$/,
      'Career goals. Target between $1 and $2.',
    ],
    [
      /^Goles con su selección\. Objetivo entre ([\d.]+) y ([\d.]+)\.$/,
      'National team goals. Target between $1 and $2.',
    ],
    [/^Objetivo ([\d.]+)$/, 'Target $1'],
    [/^La banca se planta en ([\d.]+)$/, 'House stands on $1'],
    [/^([+−])([\d.]+) fichas$/, '$1$2 chips'],
    [
      /^([\d.]+ )?fichas tras (\d+) manos?$/,
      function (m) {
        return (m[1] || '') + 'chips after ' + pl(m[2], 'hand', 'hands');
      },
    ],
    [
      /^No te quedan fichas para apostar tras (\d+) manos?$/,
      function (m) {
        return (
          'Not enough chips left to bet after ' + pl(m[1], 'hand', 'hands')
        );
      },
    ],
    [/^Hoy: ([\d.]+) fichas$/, 'Today: $1 chips'],
    [/^récord: ([\d.]+) fichas$/, 'record: $1 chips'],
    [/^Récord: ([\d.]+) fichas$/, 'Record: $1 chips'],
    [/^Récord: (\d+)$/, 'Record: $1'],
    [/^aciertos? seguidos? · récord: (\d+)$/, 'correct in a row · record: $1'],
    [/^Hoy: racha (\d+)$/, 'Today: streak $1'],
    [/^Reto diario (\d+\/\d+(?:\/\d+)?)$/, 'Daily challenge $1'],
    [/^(.+) tiene ([\d.]+) y (.+?) ([\d.]+)\.$/, '$1 has $2 and $3 has $4.'],
    [/^🔥 Racha de (\d+)$/, '🔥 Streak of $1'],
    // reto: partida
    [/^Jugador (\d+) de (\d+)$/, 'Player $1 of $2'],
    [/^([\d.]+) goles$/, '$1 goals'],
    [/^Liga ×5 de hoy: (.+)$/, "Today's ×5 league: $1"],
    [/^Descartes: (.*)$/, 'Discards: $1'],
    [/^Reto diario del (.+)$/, 'Daily challenge · $1'],
    [
      /^Ya has jugado el reto diario de hoy: ([\d.]+) puntos\. Vuelve mañana\.$/,
      "You've already played today's daily challenge: $1 points. Come back tomorrow.",
    ],
    [
      /^Hoy ya lo has jugado: ([\d.]+) puntos$/,
      "You've already played today: $1 points",
    ],
    [/^([\d.]+) para el objetivo$/, '$1 to the target'],
    [/^No llegas: te faltan ([\d.]+)$/, 'Not there yet: $1 short'],
    [
      /^La mejor colocación posible de estos 17 daba ([\d.]+) puntos(, suficientes para el reto)?\.$/,
      function (m) {
        return (
          'The best possible placement of these 17 would have given ' +
          m[1] +
          ' points' +
          (m[2] ? ', enough for the challenge.' : '.')
        );
      },
    ],
    [/^en (.+) ×(\d+)$/, 'in $1 ×$2'],
    [/^(.+?) de los jugadores llega aquí$/, '$1 of players get here'],
    [/^Siguiente rango: (.+)$/, 'Next rank: $1'],
    [/^Siguiente: (.+)$/, 'Next: $1'],
    [
      /^te faltan ([\d.]+) puntos en una partida$/,
      'you need $1 points in a single game',
    ],
    [/^Nivel (\d+)$/, 'Level $1'],
    [/^([\d.]+) XP para el siguiente nivel$/, '$1 XP to the next level'],
    [/^🏅 Logro: (.+)$/, '🏅 Achievement: $1'],
    [/^❓ Logro oculto: (.+)$/, '❓ Hidden achievement: $1'],
    [/^Mejor marca ([\d.]+)$/, 'Best score $1'],
    [/^[Tt]e faltan ([\d.]+) para (.+)$/, '$1 more to reach $2'],
    [
      /^Tu rango sube con tu mejor puntuación; una vez alcanzado no se pierde\. Logros desbloqueados: (\d+) de (\d+) \((\d+) ocultos\)\.$/,
      "Your rank rises with your best score; once reached, it's never lost. Achievements unlocked: $1 of $2 ($3 hidden).",
    ],
    [
      /^(\d+) jugador(es)? (en el reto de hoy|con récord)$/,
      function (m) {
        return (
          pl(m[1], 'player', 'players') +
          (m[3] === 'con récord' ? ' with a record' : " in today's challenge")
        );
      },
    ],
    [
      /^(.+)\. Cada jugador aparece una vez, con su récord\.$/,
      '$1. Each player appears once, with their best score.',
    ],
    [/^Juegas como: (.+)$/, 'Playing as: $1'],
    // duelos
    [/^⬆️ ¡Ascenso a (.+?)!$/, '⬆️ Promoted to $1!'],
    [/^⬇️ Desciendes a (.+)$/, '⬇️ Relegated to $1'],
    [/^⚔️ Duelo contra (.+)$/, '⚔️ Duel against $1'],
    [/^🤝 Duelo amistoso contra (.+)$/, '🤝 Friendly duel against $1'],
    [/^🔗 Reto de (.+?) · (.+)$/, "🔗 $1's challenge · $2"],
    [/^Preparando el duelo con (.+?)…$/, 'Preparing the duel with $1…'],
    [
      /^Esperando a que (.+?) acepte\. Le sale en su pantalla al acabar el duelo\.$/,
      "Waiting for $1 to accept. They'll see it on their screen when the duel ends.",
    ],
    [/^Esperando a que (.+?) esté listo…$/, 'Waiting for $1 to be ready…'],
    [/^Esperando a (.+?)…$/, 'Waiting for $1…'],
    [
      /^La sala de (.+?) ya ha empezado o ha caducado\. Pídele que te mande un enlace nuevo\.$/,
      "$1's room has already started or expired. Ask them to send you a new link.",
    ],
    [/^🔁 (.+?) quiere la revancha$/, '🔁 $1 wants a rematch'],
    [/^(.+?) ha jugado tu reto: (.+)$/, '$1 played your challenge: $2'],
    [/^([\d.]+) contra tus ([\d.]+)$/, '$1 vs your $2'],
    [/^(.+?) te reta$/, '$1 challenges you'],
    [/^¡(.+?) ha entrado!$/, '$1 has joined!'],
    [/^ganó a (.+)$/, 'beat $1'],
    [/^🏆 Ganas: (.+?) no terminó$/, "🏆 You win: $1 didn't finish"],
    [
      /^Va por el jugador (\d+) de (\d+)\. Si se va, ganas tú\.$/,
      "They're on player $1 of $2. If they leave, you win.",
    ],
    [
      /^Duelo (\d+) de 10 de clasificación: subes y bajas más rápido$/,
      'Placement duel $1 of 10: you move up and down faster',
    ],
    [/^Siguiente categoría: (.+) a$/, 'Next tier: $1 in'],
    [
      /^puntos para pasar al? (.+) \((\d+)º\)$/,
      function (m) {
        return 'points to pass ' + m[1] + ' (' + ord(m[2]) + ')';
      },
    ],
    [
      /^⬆️ subes (\d+) puestos?$/,
      function (m) {
        return '⬆️ up ' + pl(m[1], 'place', 'places');
      },
    ],
    [
      /^⬇️ bajas (\d+) puestos?$/,
      function (m) {
        return '⬇️ down ' + pl(m[1], 'place', 'places');
      },
    ],
    [
      /^(\d+) (victoria|derrota|empate)s?$/,
      function (m) {
        const w = (
          {
            victoria: ['win', 'wins'],
            derrota: ['loss', 'losses'],
            empate: ['draw', 'draws'],
          } as Record<string, string[]>
        )[m[2]];
        return w ? pl(m[1], w[0], w[1]) : null;
      },
    ],
    [
      /^te quedan (\d+) duelos de clasificación \(subes más rápido\)$/,
      function (m) {
        return (
          pl(m[1], 'placement duel', 'placement duels') +
          ' left (you climb faster)'
        );
      },
    ],
    // temporadas
    [
      /^🏆 (.+?) · quedan (\d+) días$/,
      function (m) {
        return '🏆 ' + tr1(m[1]) + ' · ' + pl(m[2], 'day', 'days') + ' left';
      },
    ],
    [/^Temporada (\d+) · (.+)$/, 'Season $1 · $2'],
    [/^Campeones de la Temporada (\d+) · (.+)$/, 'Season $1 champions · $2'],
    [/^(.+) TEMPORADA (\d+)$/, '$1 · SEASON $2'],
    [/^Empieza la (.+)$/, '$1 starts'],
    [
      /^Fin de la Temporada (\d+) \((.+?)\): (quedaste|terminaste en)$/,
      function (m) {
        return (
          'Season ' +
          m[1] +
          ' (' +
          tr1(m[2]) +
          ') is over: you finished' +
          (m[3] === 'quedaste' ? '' : ' in')
        );
      },
    ],
    [/^con ([\d.]+) puntos \((.+)\)\.$/, 'with $1 points ($2).'],
    // retos por enlace y textos para compartir
    [
      /^Empezaste el reto de (.+?) y lo dejaste a medias\. Cada reto solo se puede jugar una vez\.$/,
      "You started $1's challenge and left it unfinished. Each challenge can only be played once.",
    ],
    [
      /^Te tocarán los mismos 17 jugadores, en el mismo orden y con la misma liga ×5 que le tocaron a (.+?)\. Verás su puntuación al terminar\.$/,
      "You'll get the same 17 players, in the same order and with the same ×5 league as $1. You'll see their score when you finish.",
    ],
    [
      /^⚔️ He hecho ([\d.]+) puntos en el Reto de los 15\.000 goles\. Te tocan mis mismos 17 jugadores\. ¿Me ganas\?$/,
      '⚔️ I scored $1 points in the 15,000 Goals Challenge. You get my same 17 players. Can you beat me?',
    ],
    [
      /^⚔️ Te reto a un duelo en directo en el Reto de los 15\.000 goles\. Entra y jugamos a la vez:(.*)$/,
      '⚔️ I challenge you to a live duel in the 15,000 Goals Challenge. Join and we play at the same time:$1',
    ],
    [
      /^⚔️ Te reto a un duelo en el Reto de los 15\.000 goles\. Entra y dale a buscar rival:(.*)$/,
      '⚔️ I challenge you to a duel in the 15,000 Goals Challenge. Join and tap find opponent:$1',
    ],
    [
      /^⚔️ Te reto en el Reto de los 15\.000 goles: te tocan mis mismos 17 jugadores\. ¿Me ganas\?(.*)$/,
      '⚔️ I challenge you in the 15,000 Goals Challenge: you get my same 17 players. Can you beat me?$1',
    ],
    [
      /^(Reto diario )?Reto de los 15\.000 goles ⚽ ([\d.]+) puntos · (.+?)\. ¿Lo superas\?(.*)$/,
      function (m) {
        return (
          (m[1] ? 'Daily challenge · ' : '') +
          '15,000 Goals Challenge ⚽ ' +
          m[2] +
          ' points · ' +
          tr1(m[3]) +
          '. Can you beat it?' +
          m[4]
        );
      },
    ],
    [
      /^Medalla (.+?) · la consiguen (.+?) de los jugadores$/,
      '$1 medal · achieved by $2 of players',
    ],
    [/^Me faltaron ([\d.]+) puntos$/, 'I was $1 points short'],
  ];
  function get(k: string): string | null {
    return Object.prototype.hasOwnProperty.call(D, k) ? D[k] : null;
  }
  // claves en MAYÚSCULAS (medallas y rarezas de la imagen, títulos de temporada…)
  let UP: Record<string, string> | null = null;
  function upper(k: string): string | null {
    if (!UP) {
      UP = {};
      for (const x in D)
        if (Object.prototype.hasOwnProperty.call(D, x) && x.toUpperCase() !== x)
          UP[x.toUpperCase()] = D[x].toUpperCase();
    }
    return Object.prototype.hasOwnProperty.call(UP, k) ? UP[k] : null;
  }
  // Traduce un texto: frase exacta, reglas (con sus huecos traducidos también), sin el prefijo de emoji/símbolos,
  // sin el punto final o por trozos separados con ' · ' o saltos de línea. Lo que no se reconoce se deja igual.
  function tr1(s: string): string {
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m) return s;
    const c = m[2];
    let o: string | null = null,
      p: RegExpMatchArray | null = null,
      i: string,
      separator: string;
    if (!c) return s;
    o = get(c);
    if (o == null && c === c.toUpperCase()) o = upper(c);
    for (
      let ruleIndex = 0;
      o == null && ruleIndex < RULES.length;
      ruleIndex++
    ) {
      const rule = RULES[ruleIndex]!;
      p = c.match(rule[0]);
      if (p) {
        const translation = rule[1];
        o =
          typeof translation === 'function'
            ? translation(p)
            : translation.replace(
                /\$(\d)/g,
                function (_whole: string, number: string) {
                  return tr1(p?.[Number(number)] || '');
                },
              );
      }
    }
    [
      /^([^0-9A-Za-zÀ-ÿ¿¡]+)([\s\S]*[0-9A-Za-zÀ-ÿ¿][\s\S]*)$/,
      /^([^0-9A-Za-zÀ-ÿ¿]+)([\s\S]*[0-9A-Za-zÀ-ÿ¿][\s\S]*)$/,
    ].forEach(function (r) {
      if (o == null && (p = c.match(r))) {
        i = tr1(p[2]);
        if (i !== p[2]) o = p[1] + i;
      }
    });
    if (o == null && /[^.]\.$/.test(c)) {
      i = tr1(c.slice(0, -1));
      if (i !== c.slice(0, -1)) o = i + '.';
    }
    if (o == null && /\n| · /.test(c)) {
      separator = c.indexOf('\n') >= 0 ? '\n' : ' · ';
      o = c.split(separator).map(tr1).join(separator);
    }
    return m[1] + (o == null ? c : o) + m[3];
  }
  // números: 12.405 → 12,405 y 0,7 → 0.7 (las fechas 25/09/2026 no se tocan)
  function num(s: string): string {
    return s.replace(/\d+(?:[.,]\d+)+/g, function (x) {
      if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(x)) return x.replace(/\./g, ',');
      if (/^\d+,\d+$/.test(x) && (/^0,/.test(x) || !/,\d{3}$/.test(x)))
        return x.replace(',', '.');
      return x;
    });
  }
  function tr(s: string): string {
    if (lang !== 'en' || !s) return s;
    return num(tr1(String(s)));
  }

  return tr;
}
