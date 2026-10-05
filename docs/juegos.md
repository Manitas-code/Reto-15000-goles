# Reglas y mapa de los juegos

Los HTML de la raíz conservan las rutas públicas. Cada página monta su `App.tsx` desde `main.tsx`; los hooks del juego coordinan el estado y `engine.ts` contiene reglas puras. Los estilos siguen en `styles.css`. Las rutas de esta guía apuntan a los módulos actuales, no a la implementación anterior.

## Reto de los 15.000 goles

Entrada `reto-15000.html`; módulos en `src/games/reto-15000/`. Se colocan 17 jugadores, uno en cada casilla, para sumar al menos 15.000 puntos. El juego prepara 19 cartas y permite dos descartes. Una liga por partida tiene multiplicador ×5. Las vistas previas muestran los puntos del jugador en las casillas disponibles. Las respuestas consumidas del backend están descritas en `rpc-types.ts`; son contratos inferidos del cliente, no una definición confirmada del servidor.

`SLOTS`, en `engine.ts`, define las 17 casillas sobre las 16 estadísticas del catálogo, con Carrera repetida:

| Casilla                                                               | Multiplicador base                |
| --------------------------------------------------------------------- | --------------------------------- |
| Champions                                                             | ×10                               |
| Premier, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie / Primeira | ×1; una de estas ligas pasa a ×5  |
| Selección                                                             | ×10                               |
| América                                                               | ×4                                |
| Carrera                                                               | ×1 y ×3 en dos casillas distintas |
| Goles de cabeza                                                       | ×10                               |
| Goles olímpicos                                                       | ×500                              |
| Mundiales                                                             | ×100                              |
| Final de Champions                                                    | ×300                              |
| Final de Libertadores                                                 | ×500                              |
| Final del Mundial                                                     | ×1000                             |

Modos:

- Libre: azar sin semilla diaria y partidas repetibles.
- Diario: semilla de la fecha de Madrid, mismo mazo y liga ×5. Iniciar consume el intento local, aunque se abandone.
- Online: mismo mazo para los rivales, 20 segundos por carta, Elo y temporadas. Puede asignar un bot si no aparece rival.
- Sala privada: duelo en directo mediante enlace con `?sala=<código>`.
- Reto a un amigo: enlace `?reto=<código>`, mazo compartido y comparación posterior.

| Zona                 | Módulos actuales                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Datos y reglas       | `engine.ts`, `model.ts`: `SLOTS`, `PLAYERS`, `SKIPS`, `LEAGUE_SLOTS`, `makeGame`, `placePlayer`, `optimalScore`    |
| Fecha y azar         | `engine.ts`, `model.ts`, `bots.ts`: semillas, mezcla y mazos para bot, diario y duelo                              |
| Partida              | `useReto.ts`: `start`, `place`, `skip`, recuento final y resultado                                                 |
| Tablero y puntuación | `components/Board.tsx`, `engine.ts`, `model.ts`                                                                    |
| Progreso             | `model.ts` guarda el estado, `useReto.ts` coordina los cambios y `components/RankPanel.tsx` muestra rango y logros |
| Nombre y ranking     | `useReto.ts`, `components/RankPanel.tsx`, `src/shared/api/`; contratos en `rpc-types.ts` y `contracts/`            |
| Duelo, sala y enlace | `useDuel.ts`: cola, polling, cuenta atrás, salas, enlaces, temporada, Elo; `bots.ts` contiene la lógica del bot    |
| Imagen compartida    | Canvas en `App.tsx`                                                                                                |

`useReto` guarda resultado, progreso y logros, y muestra el resumen y una asignación óptima como comparación. `useDuel` procesa `reto`, `online` y `sala` desde la query y limpia la URL con `history.replaceState`. El progreso usa `reto15k-v2`; los servicios se describen en [arquitectura.md](arquitectura.md) y [backend.md](backend.md).

## Más o Menos

Entrada `mas-o-menos.html`; módulos en `src/games/mas-o-menos/`. Se compara el número de goles de dos jugadores. Tras acertar, el segundo pasa a ser el primero y se elige otro rival. Un error o agotar los 10 segundos termina la partida. Hay Carrera y Selección, además del diario con secuencia sembrada por fecha y un intento local.

`ALL_PLAYERS` en `model.ts` concatena `players` y `extraPlayers`. `CATEGORIES` define la estadística y el mínimo admitido. `pickOpponent` busca pares sin igualdad y ajusta la diferencia según la racha. Al principio favorece los 200 jugadores de la base; después incorpora el catálogo completo. Los intervalos preferidos son 40–85% para 0–4 aciertos, 20–60% para 5–14 y 10–55% desde 15; hay alternativas si no encuentra pares.

| Zona                   | Módulos actuales                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Dificultad y jugadores | `engine.ts`: `difficultyTier`, `relativeDifference`, `isHigherLowerCorrect`; `model.ts`: `pickOpponent`, `CATEGORIES`, `FAMOUS` |
| Partida                | `useGame.ts`: inicio, respuesta, avance de racha y finalización                                                                 |
| Guardado/ranking       | `persistence.ts`, `useGame.ts`, `App.tsx`; solicitudes mediante `src/shared/api/`                                               |

El resultado es la racha de aciertos. El diario registra el inicio y conserva los últimos siete días. Los récords libres pendientes de envío se sincronizan por modalidad. Persistencia `gd_mm_stats` y `gd_mm_daily`; ranking `hl_scores`.

## Blackjack de goles

Entrada `blackjack-goles.html`; módulos en `src/games/blackjack/`. El valor de una carta es el total de goles del jugador en la modalidad. Hay que acercarse a un objetivo variable sin superarlo. La banca se planta al llegar a una fracción del objetivo.

| Modalidad libre | Objetivo              | Umbral de la banca |
| --------------- | --------------------- | ------------------ |
| Carrera         | 600–1500, pasos de 50 | 80%                |
| Selección       | 100–150, pasos de 5   | 75%                |

Se empieza con 1.000 fichas y se juegan hasta siete manos. Se apuesta 100, 200 o 300 por mano; con menos de 100 fichas termina la partida. Se reparten dos jugadores de inicio. Se puede pedir, plantarse o doblar, que duplica la apuesta de esa mano y obliga a pedir una carta y plantarse. Hay 10 segundos por decisión; al agotarse, el jugador se planta. La siguiente mano llega automáticamente a los 1.500 ms o antes con un toque.

Pasarse pierde la apuesta. Si la banca se pasa o el jugador queda por encima, gana una apuesta. El empate favorece a la banca, incluso si ambos alcanzan el objetivo. Llegar exactamente al objetivo gana dos apuestas si la banca no lo iguala. La puntuación final son las fichas restantes.

El diario usa Carrera y semillas por fecha y mano. Comenzarlo consume el intento local. Los catálogos son los mismos que en Más o Menos.

| Zona             | Módulos actuales                                                                  |
| ---------------- | --------------------------------------------------------------------------------- |
| Reglas           | `model.ts`, `state.ts`; `payoutFor` en `engine.ts`                                |
| Partida          | `useGame.ts`: inicio, apuesta, reparto, acción, turno de banca y liquidación      |
| Guardado/ranking | `persistence.ts`, `useGame.ts`, `App.tsx`; solicitudes mediante `src/shared/api/` |

Las claves `gd_bj10_stats`, `gd_bj10_daily` y la tabla `bj10_scores` mantienen el nombre histórico. No interpretes `10` como el número actual de manos ni cambies esas claves por ese motivo.

## Emoji Player

Entrada `emoji-player.html`; módulos en `src/games/emoji-player/` y catálogo `src/data/emoji-players.ts`. Solo hay reto diario: cinco jugadores, cuatro emojis por jugador y tres intentos. Acertar en el primero da 600 puntos; en el segundo, 400; en el tercero, 200. Fallar los tres da cero. Máximo diario 3.000 puntos.

Cada día selecciona tres jugadores del grupo fácil, cuyas pistas incluyen una bandera, y dos del difícil, sin bandera entre sus pistas. El motor obtiene órdenes sembrados para los grupos fácil y difícil; `picksFor` los recorre desde la época del 28-09-2026 y mezcla la selección diaria. Al recorrer las listas con módulo, los jugadores se repiten en días posteriores. Modificar el catálogo o su orden altera el calendario.

`normalizePlayerName`, en el motor, normaliza tildes, caracteres especiales y separadores. `matchesPlayerName` permite buscar desde cualquier palabra del nombre. El juego ofrece sugerencias; `guess` comprueba la respuesta y `resolve` guarda el resultado y muestra su explicación. Se puede reanudar un reto incompleto.

| Zona                  | Módulos actuales                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Calendario y búsqueda | `engine.ts`: `dayKey`, `picksFor`, normalización y coincidencia de nombres; `model.ts`: estado y sugerencias |
| Partida               | `useGame.ts`: inicio, intentos, avance, resolución y reanudación                                             |
| Progreso              | `model.ts`, `persistence.ts`, `useGame.ts`                                                                   |
| Ranking               | `useGame.ts`, `App.tsx`; `weekStart` está en `model.ts`                                                      |

`gd_emoji_v1` conserva días, intentos en curso y racha. `emoji_scores` recibe el resultado diario; el ranking puede mostrar el día o la suma semanal desde el lunes.

## Comprobaciones según el cambio

Hay pruebas de datos, reglas, API, estadios y flujos de navegador en `tests/`. Las capturas de referencia se toman del original con fuentes remotas bloqueadas, `fg_team=none` y backend simulado. Detectan diferencias con esa configuración; no verifican fuentes remotas, todos los estadios seleccionados ni la base Supabase real. Estas pruebas complementan la lista manual, pero no significan que todos los casos manuales se hayan ejecutado. Consulta [verificacion-react.md](verificacion-react.md) para conocer las referencias y sus límites.

| Cambio               | Qué comprobar                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Portada o navegación | Abrir los cuatro enlaces y probar la redirección de una query heredada.                                                       |
| Copy o traducción    | Cambiar ES/EN antes y después de empezar; revisar mensajes dinámicos y textos de compartir.                                   |
| Estadios             | Elegir equipo, cambiar de página, recargar, redimensionar y seleccionar la opción de omitir.                                  |
| Datos                | Comprobar el formato, orden de columnas, derivación del formato del Reto 15K y tratamiento de `null` en extras.               |
| Reto 15K             | Verificar previews y suma, liga ×5, dos descartes, casillas llenas y finalización con 17 colocaciones.                        |
| Más o Menos          | Acertar, fallar, agotar el reloj y revisar récords de ambas modalidades.                                                      |
| Blackjack            | Pedir, plantarse, doblar, pasarse, empate, objetivo exacto y final por siete manos o falta de fichas.                         |
| Emoji Player         | Acertar en cada intento, fallar tres veces, reanudar tras recarga y comprobar explicación ES/EN.                              |
| Diario               | Usar un contexto de pruebas; comprobar determinismo y comportamiento tras abandono/recarga.                                   |
| API                  | Revisar errores y payloads con las pruebas de `tests/server/`; éstas usan transporte simulado y no escriben en Supabase real. |

Los catálogos y el azar determinista unen reglas, datos y backend. Antes de cambiar una semilla, el orden de jugadores o una categoría, revisa las funciones que crean la partida y las que calculan el resultado del rival.
