# Arquitectura, datos y compatibilidad

## Entradas y montaje

Los siete archivos HTML de la raíz conservan las direcciones públicas. Vite compila cada uno como una entrada HTML independiente; no hace falta un router para navegar entre juegos.

| HTML                   | Entrada React                                 |
| ---------------------- | --------------------------------------------- |
| `index.html`           | `src/pages/home/main.tsx` → `App.tsx`         |
| `reto-15000.html`      | `src/games/reto-15000/main.tsx` → `App.tsx`   |
| `mas-o-menos.html`     | `src/games/mas-o-menos/main.tsx` → `App.tsx`  |
| `blackjack-goles.html` | `src/games/blackjack/main.tsx` → `App.tsx`    |
| `emoji-player.html`    | `src/games/emoji-player/main.tsx` → `App.tsx` |
| `caras.html`           | `src/tools/faces/main.tsx` → `App.tsx`        |
| `editor-goles.html`    | `src/tools/goal-editor/main.tsx` → `App.tsx`  |

Cada juego concentra la presentación en `App.tsx` y sus componentes. `engine.ts` conserva reglas puras; `model.ts`, `useGame.ts` y `persistence.ts` organizan estado y guardado según el juego. Reto 15K separa el flujo base en `useReto.ts` y los duelos en `useDuel.ts`; sus algoritmos de bots y divisiones viven en `bots.ts` y `divisions.ts`.

`src/app/mount.tsx` monta portada y juegos con `IdentityProvider`, `LanguageProvider` y `TeamProvider`. Las vistas leen estos estados mediante `useIdentity()`, `useLanguage()` y `useTeam()`. El provider de equipos monta `#fgStadium` y `#teamPick`; la página Reto puede abrir el selector en la primera visita. Fotos y editor montan React directamente; Fotos instala además las funciones de compatibilidad de `GD_face`.

La capa compartida está bajo `src/shared/`: API HTTP, almacenamiento, identidad, idioma, fotos y estadios. El renderizador de estadios dibuja el SVG con Canvas y guarda una imagen de fondo en `fg_bg`. Los HTML restauran esa caché antes de pintar el contenido. Conserva ese orden al tocar los scripts iniciales.

Los globals `FG_LANG`, `FG_STADIUM` y `GD_face` siguen disponibles para consumidores existentes. La API del navegador vive en `src/shared/api/`; los contratos de solicitudes están en `contracts/`; Fastify valida y reenvía las llamadas desde `server/`. [backend.md](backend.md) describe el transporte y su configuración.

## Catálogos

Los recuentos efectivos son 200 jugadores base, 408 jugadores adicionales y 200 entradas Emoji Player. El orden de las filas interviene en las selecciones aleatorias y forma parte de la compatibilidad.

### Base de goles

`src/data/players.ts` transforma `playerRows` y los overrides de posición heredados en objetos tipados. Si el tercer campo es un string, indica la posición. Si no, se consulta `POS_EX` y se usa `DEL` por defecto. Las posiciones son `DEF`, `MED` y `DEL`.

El orden de los 16 valores de goles es contractual:

| Índice | Clave histórica | Categoría                  |
| ------ | --------------- | -------------------------- |
| 0      | `champions`     | Champions                  |
| 1      | `premier`       | Premier League             |
| 2      | `laliga`        | La Liga                    |
| 3      | `seriea`        | Serie A                    |
| 4      | `bundesliga`    | Bundesliga                 |
| 5      | `ligue1`        | Ligue 1                    |
| 6      | `erepor`        | Eredivisie / Primeira Liga |
| 7      | `seleccion`     | Selección                  |
| 8      | `america`       | América                    |
| 9      | `carrera`       | Carrera                    |
| 10     | `cabeza`        | Goles de cabeza            |
| 11     | `olimpicos`     | Goles olímpicos            |
| 12     | `mundiales`     | Mundiales                  |
| 13     | `fchampions`    | Final de Champions         |
| 14     | `flibertadores` | Final de Libertadores      |
| 15     | `fmundial`      | Final del Mundial          |

`retoPlayers` comparte el catálogo base y conserva la forma `{name, flag, pos, base, v}`. `SLOTS[i].src` escoge la estadística de cada casilla. Las cifras son manuales y aproximadas.

### Catálogos adicionales

`src/data/extra-players.ts` convierte filas `[nombre, bandera, posición, carrera, selección]` en `extraPlayers`. Más o Menos y Blackjack los combinan con el catálogo base. Un `null` representa un dato sin confirmar y excluye al jugador de esa modalidad; no lo cambies a cero.

`src/data/emoji-players.ts` contiene filas `[nombre, e1, e2, e3, e4, explicación ES, explicación EN]`. Emoji Player conserva las explicaciones bilingües al traducir. No reordenes las filas: afectan la selección diaria.

## Persistencia local

Las claves pertenecen al origen del navegador. La identidad local usa UUID `pid` y `name`; no hay contraseña ni sincronización integral del progreso.

| Clave               | Contenido                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `reto15k-v2`        | Partidas, récords, resultados, diario, logros, XP, sonido, datos de temporadas e identidad compartida. |
| `gd_mm_stats`       | Récords, partidas, aciertos y marcas enviadas de Más o Menos.                                          |
| `gd_mm_daily`       | Progreso diario y racha de Más o Menos; conserva los últimos siete días.                               |
| `gd_bj10_stats`     | Récords por modalidad, partidas, manos y marcas enviadas de Blackjack. El nombre `bj10` es histórico.  |
| `gd_bj10_daily`     | Partida diaria y estado enviado de Blackjack; conserva los últimos siete días.                         |
| `gd_emoji_v1`       | Días, racha y progreso de Emoji Player, incluida la partida en curso.                                  |
| `fg_lang`           | Idioma `es` o `en`.                                                                                    |
| `fg_team`           | ID del equipo elegido o `none`.                                                                        |
| `fg_bg`             | Imagen de estadio en caché, con equipo y dimensiones de pantalla.                                      |
| `gd_faces_v2`       | Caché de fotos resueltas por `src/shared/browser/faces.ts`.                                            |
| `gd_caras_elegidas` | Fotos seleccionadas en la herramienta `caras.html`.                                                    |
| `gd_editor_v1`      | Cambios de vídeos y tiempos del editor legado.                                                         |

`src/shared/storage/json.ts` maneja errores de lectura y escritura. `src/shared/identity/store.ts` actualiza la identidad y preserva campos desconocidos. No borres claves ni campos que no reconozcas; no uses `localStorage.clear()` para arreglar una entrada de caché.

Los diarios usan la fecha de `Europe/Madrid`. Iniciar consume el intento de Reto 15K, Más o Menos y Blackjack aunque la partida se abandone. Emoji Player permite reanudar.

## Idioma, identidad y estadio

`LanguageProvider` expone `lang`, `t` y `setLanguage` mediante `useLanguage()`, conserva `fg_lang` y actualiza el título y `document.documentElement.lang`. El español es el texto fuente. `src/shared/i18n/translation.ts` resuelve las cadenas del diccionario.

`IdentityProvider` lee la identidad compartida y escucha cambios locales y del evento `goalday:identity`. `TeamProvider` comparte equipo y selector entre las páginas que usan `mountPage`. Mantén los globals `FG_LANG` y `FG_STADIUM` por compatibilidad.

El selector y el renderizador de estadios usan `src/shared/stadiums/teams.ts`, `geometry.ts` y `renderer.ts`. `fg_team=none` evita elegir equipo. Las capturas automatizadas usan esa opción y no verifican todos los fondos seleccionables.

## API y límites del backend

El cliente usa `fetch` desde `src/shared/api/`. Los tipos de payload y consultas están en `contracts/api.ts`; las entradas RPC de Reto 15K están en `contracts/reto.ts`. Fastify ejecuta validación de forma, limita cuerpos y reenvía las solicitudes a Supabase REST usando el `fetch` integrado de Bun.

El repositorio no define SQL, esquema, políticas RLS ni migraciones. Los tipos describen lo que usa el frontend y no confirman que esas operaciones existan o estén protegidas en el proyecto remoto. El smoke local usa un upstream falso. No se documenta aquí como probada una base de datos real. Consulta [backend.md](backend.md) antes de configurar o publicar el servidor.

## Referencias de pruebas

La referencia original es el commit `88552644372229ccd8e8157c3ac99c88965b5675`. Las capturas, hashes y fixtures viven en `tests/fixtures/` y `tests/e2e/*-snapshots/`. Los scripts `scripts/capture-baseline.mjs`, `capture-game-rules-baseline.mjs` y `capture-stadium-baseline.mjs` necesitan una copia separada de esa revisión y sobrescriben fixtures; no los uses para hacer pasar una prueba.

Las capturas de página bloquean servicios externos, fijan la fecha y usan `fg_team=none`. No comprueban fuentes remotas, YouTube real ni una base de Supabase. [verificacion-react.md](verificacion-react.md) detalla las referencias disponibles y la forma de ejecutar las comparaciones. La presencia de esas fixtures no demuestra que todas las verificaciones estén cerradas.

## Herramientas

`caras.html` es una herramienta interna sin indexación. Usa el catálogo de jugadores y las APIs de `src/shared/browser/faces.ts`; puede consultar miniaturas de Wikipedia y Wikimedia Commons y guarda las elecciones manuales por separado.

`editor-goles.html` también es una herramienta interna. Edita identificadores de YouTube y tiempos de clips y genera un `goles.js`, pero el repositorio no incluye ese archivo ni el calendario requerido (`GOLES` e `INICIO`). La página muestra el aviso correspondiente. No afirmes que Gol del día esté operativo.
