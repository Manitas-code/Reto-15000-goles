# Arquitectura, datos e integraciones

## Estructura y carga

La web mantiene siete entradas HTML en la raíz y navegación entre documentos. Vite compila cada entrada a `dist/`; no hay SPA ni rutas de servidor. Los recursos públicos viven en `public/`.

| Entrada                | Módulo principal                 |
| ---------------------- | -------------------------------- |
| `index.html`           | `src/pages/home/main.ts`         |
| `reto-15000.html`      | `src/games/reto-15000/main.ts`   |
| `mas-o-menos.html`     | `src/games/mas-o-menos/main.ts`  |
| `blackjack-goles.html` | `src/games/blackjack/main.ts`    |
| `emoji-player.html`    | `src/games/emoji-player/main.ts` |
| `caras.html`           | `src/tools/faces/main.ts`        |
| `editor-goles.html`    | `src/tools/goal-editor/main.ts`  |

Cada juego y herramienta tiene `main.ts` como entrada, `controller.ts` para coordinar el flujo y DOM, y `dom.ts` para tipar los elementos por ID. Las reglas independientes viven en `engine.ts`; Blackjack y las herramientas separan también tipos de estado en `state.ts`. Los módulos son TypeScript y el CSS permanece en `styles.css` junto a cada entrada.

`src/shared/bootstrap.ts` conserva el orden de inicialización original. Reto 15K inicia su controlador, estadios e idiomas, en ese orden. Los otros juegos inician controlador, idiomas y estadios. La portada inicia idiomas y estadios. Fotos y editor tienen sus propias entradas sin el bootstrap de juegos.

Los módulos compartidos incluyen `storage/json.ts`, `identity/store.ts`, `supabase/rpc.ts`, `i18n/controller.ts`, `stadiums/controller.ts` y `stadiums/geometry.ts`. Sus catálogos tipados viven en `i18n/dictionary.ts` y `stadiums/teams.ts`. Las APIs globales se mantienen por compatibilidad con las páginas.

`index.html` conserva la redirección temprana de enlaces con `reto`, `online` o `sala` a `reto-15000.html`, preservando query y hash. Los scripts tempranos que restauran el fondo también siguen en los HTML para conservar el momento de ejecución.

TypeScript usa `strict`, `noEmit` y `allowJs: false`, e incluye el código de aplicación, configuraciones y tests. Los pequeños scripts tempranos del HTML conservan su momento de ejecución; no forman parte de la comprobación de TypeScript. Consulta el [plan](../plans/migracion-typescript.md) para el estado de las fases, sin inferir que están cerradas por existir estos módulos.

## Catálogos de jugadores

Los recuentos efectivos son 200 jugadores base, 408 adicionales y 200 entradas de emojis. El formato del Reto 15K deriva de esos mismos 200 jugadores.

### Base de goles

`src/data/players.ts` contiene `playerRows` y los overrides de posición, extraídos del antiguo `players.js`. Los tipos están en `player-types.ts`. Una fila tiene el formato:

```text
[nombre, bandera, posición opcional, ...16 valores de goles]
```

Si el tercer campo es un string, es la posición. Si no, se consulta `POS_EX` y se usa `DEL` por defecto. Las posiciones son `DEF`, `MED` y `DEL`. El orden de los valores es contractual:

| Índice | Clave en `GD_PLAYERS` | Categoría                  |
| ------ | --------------------- | -------------------------- |
| 0      | `champions`           | Champions                  |
| 1      | `premier`             | Premier League             |
| 2      | `laliga`              | La Liga                    |
| 3      | `seriea`              | Serie A                    |
| 4      | `bundesliga`          | Bundesliga                 |
| 5      | `ligue1`              | Ligue 1                    |
| 6      | `erepor`              | Eredivisie / Primeira Liga |
| 7      | `seleccion`           | Selección                  |
| 8      | `america`             | América                    |
| 9      | `carrera`             | Carrera                    |
| 10     | `cabeza`              | Goles de cabeza            |
| 11     | `olimpicos`           | Goles olímpicos            |
| 12     | `mundiales`           | Mundiales                  |
| 13     | `fchampions`          | Final de Champions         |
| 14     | `flibertadores`       | Final de Libertadores      |
| 15     | `fmundial`            | Final del Mundial          |

`players` exporta objetos `{name, flag, pos, champions, ...}`. La conversión conserva el tratamiento original de valores falsy como `0`.

Antes de migrar, Reto 15K mantenía su propio `RAW`. Se comprobaron los valores y el orden de las dos copias, y eran equivalentes. Ahora `retoPlayers`, exportado desde el mismo módulo de datos, conserva el formato `{name, flag, pos, base, v}`. `base` y `v` son arrays de valores; `SLOTS[i].src` selecciona su índice. Las cifras son manuales y el juego las describe como aproximadas.

### Jugadores adicionales

`src/data/extra-players.ts` transforma filas `[nombre, bandera, posición, carrera, selección]` en objetos exportados como `extraPlayers`. Más o Menos y Blackjack concatenan ese array con `players`. El Reto 15K no lo utiliza. Un `null` indica un dato sin confirmar y excluye al jugador de esa modalidad; no lo conviertas en cero. El comentario del archivo sitúa la revisión de cifras en septiembre de 2026, sin un proceso automático de actualización.

### Emojis

`emojiPlayers`, en `src/data/emoji-players.ts`, tiene filas `[nombre, e1, e2, e3, e4, explicación ES, explicación EN]`. El controlador de Emoji Player crea objetos `{name, emojis, why}` con la explicación española. El bootstrap de Emoji instala también `window.GD_EMOJI` para que el traductor heredado incorpore las parejas ES/EN al iniciar. El orden de las filas interviene en la selección diaria.

## Persistencia local

Las claves pertenecen al origen del navegador. No hay cuentas con contraseña ni sincronización completa del progreso. La identidad observada es un UUID `pid` y un `name` almacenados localmente y registrados mediante RPC.

| Clave               | Contenido y consumidores                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reto15k-v2`        | Reto 15K: `games`, `wins`, `best`, `scores`, `daily`, `dailyStart`, `ach`, `xp`, `sound`, datos de temporada y ranking. Todos los juegos comparten `pid` y `name` dentro de este objeto. |
| `gd_mm_stats`       | Récords, partidas, aciertos y marcas enviadas de Más o Menos.                                                                                                                            |
| `gd_mm_daily`       | Por fecha: `start`, `done`, `streak`, `sent`; conserva los últimos siete días.                                                                                                           |
| `gd_bj10_stats`     | Récords por modalidad, marcas enviadas, partidas y manos de Blackjack. El nombre histórico `bj10` permanece aunque ahora son siete manos.                                                |
| `gd_bj10_daily`     | Por fecha: `start`, `done`, `chips`, `sent`; conserva los últimos siete días.                                                                                                            |
| `gd_emoji_v1`       | `days`, `streak`, `lastDone`; cada día guarda resultados, puntos, finalización, envío y progreso en curso.                                                                               |
| `fg_lang`           | Idioma `es` o `en`.                                                                                                                                                                      |
| `fg_team`           | ID del equipo seleccionado o `none`.                                                                                                                                                     |
| `fg_bg`             | Caché `{k, t, url}` del fondo, con clave de tamaño, ID de equipo y Data URL.                                                                                                             |
| `gd_faces_v2`       | Caché de fotos resueltas por `src/shared/browser/faces.ts`.                                                                                                                              |
| `gd_caras_elegidas` | Fotos elegidas manualmente en `caras.html`.                                                                                                                                              |
| `gd_editor_v1`      | Cambios de vídeo y tiempos por índice de gol en el editor legado.                                                                                                                        |

`src/shared/storage/json.ts` captura errores de lectura/escritura; `src/shared/identity/store.ts` actualiza la identidad preservando campos del objeto existente. Los controladores mantienen además helpers locales todavía pendientes de extracción. Si el navegador bloquea el almacenamiento, no puede garantizarse persistencia. Borrar `reto15k-v2` también borra la identidad usada por el resto de juegos. No uses `localStorage.clear()` para un arreglo de caché de imágenes.

## Idiomas

`src/shared/i18n/controller.ts` expone `window.FG_LANG={tr, set, get}`. El español es el texto fuente. El diccionario de `dictionary.ts`, copiado a `D` al iniciar, y las reglas de traducción cubren textos fijos y variables. `MutationObserver` traduce cambios del DOM. Dos `WeakMap` conservan el texto de nodos y atributos para restaurarlo al volver a español sin añadir propiedades a nodos del navegador.

El idioma inicial sale de `fg_lang` o del navegador. `es`, `ca`, `gl` y `eu` seleccionan español; el resto, inglés. El botón `btnLang` cambia el idioma. El script también intercepta `CanvasRenderingContext2D.fillText`, `navigator.share`, `navigator.clipboard.writeText`, `prompt`, `alert` y `confirm`. Un cambio de copy puede afectar la traducción por coincidencia; comprueba la salida de ambos idiomas.

## Equipos y estadios

`src/shared/stadiums/teams.ts` contiene el catálogo y los tipos geométricos. `stadiums/controller.ts` conserva estado, selector de equipo y rasterización; `stadiums/geometry.ts` genera las capas y compone el SVG. `paint` convierte el dibujo con Canvas a una Data URL JPEG. No descarga fotografías de estadios.

`window.FG_STADIUM={teams, svg, open}` ofrece el catálogo y selector. `apply` cambia fondo, colores y botón `btnTeam`, y emite el evento `fg:team`. La primera visita abre el selector si hay `btnTeam` y falta una elección. Se puede omitir con `none`. Los scripts del `<head>` de las páginas principales restauran la caché para evitar el parpadeo del fondo. La caché incluye tamaño y densidad de píxel, y el script vuelve a pintar al redimensionar.

## Supabase

Los cuatro juegos importan la configuración pública de `src/shared/supabase/config.ts`: URL `https://mvcvqzbosnwkhnlfvsuf.supabase.co`, `SB_KEY` y headers. Mantienen `fetch` contra `/rest/v1/`. No usan el SDK de Supabase. Esta sección recoge llamadas del frontend; el repositorio no incluye SQL, políticas RLS, migraciones, funciones ni configuración de autenticación. No confirma que los contratos remotos sigan disponibles.

### Rankings e identidad

| Juego        | Tabla REST     | Campos enviados por el cliente                                      |
| ------------ | -------------- | ------------------------------------------------------------------- |
| Reto 15K     | `scores`       | `name`, `score`, `daily`, `day`, `player_id`                        |
| Más o Menos  | `hl_scores`    | `player_id`, `name`, `mode`, `streak`; también `day` para el diario |
| Blackjack    | `bj10_scores`  | `player_id`, `name`, `mode`, `chips`; también `day` para el diario  |
| Emoji Player | `emoji_scores` | `player_id`, `name`, `day`, `score`                                 |

Reto 15K también lee `show_at` cuando está disponible para filtrar resultados visibles. Más o Menos y Blackjack tratan HTTP 409 al enviar el diario como resultado ya guardado. Emoji Player pide `resolution=merge-duplicates`; las restricciones y claves que permiten ese comportamiento no están definidas aquí. Su ranking suma filas por nombre desde el lunes o para el día actual y descarga hasta 5.000 filas.

`register_name` recibe `{pid,n}` en los cuatro juegos; `rename_player` recibe `{pid,n}` en el Reto 15K. El cliente normaliza espacios, exige al menos dos caracteres y limita el nombre a 16. La UI interpreta HTTP 409 como nombre ocupado. No equivale a un sistema de inicio de sesión.

### Duelo, salas y temporadas del Reto 15K

`rpcJson` y `rpcVoid`, en `src/shared/supabase/rpc.ts`, centralizan el transporte. Reto importa `rpcJson` como `sbCall`; todos los juegos importan `rpcVoid` como `sbRpc` para nombres. Se conservan payloads, errores HTTP y el manejo de cuerpo vacío de duelos. Busca estas llamadas en `src/games/reto-15000/controller.ts`:

| Funciones RPC observadas                                            | Uso del cliente                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `duel_queue`, `duel_cancel`, `duel_state`, `duel_progress`          | Emparejamiento, cancelación, consulta periódica y progreso. |
| `duel_submit`, `duel_rematch`                                       | Resultado y revancha.                                       |
| `duel_bot`, `duel_bot_submit`                                       | Rival bot y resultado calculado por el cliente.             |
| `duel_room_create`, `duel_room_peek`, `duel_room_join`              | Salas privadas por código.                                  |
| `link_create`, `link_get`, `link_start`, `link_finish`, `link_mine` | Retos por enlace y su historial.                            |
| `duel_me`, `duel_top`                                               | Elo propio y clasificación.                                 |
| `season_info`, `season_tick`, `bots_tick`                           | Información y actualización de temporadas/bots.             |
| `seed_daily`                                                        | Siembra de resultados diarios desde el cliente.             |

Las llamadas usan abreviaturas: `pid` para identidad, `d` para ID de duelo o día según función, `c`/`code` para código, `n` para nombre o progreso, `sc` para puntos y `sl` para los pares `[nombre, puntos]` de las casillas. `packSlots` construye esos pares. Consulta cada llamada antes de modificar un payload: las abreviaturas no significan lo mismo en todas las RPC.

`src/games/reto-15000/rpc-types.ts` describe las formas de respuesta que consume el frontend: duelos, salas, retos por enlace, Elo, temporadas e historial. Son tipos de uso del cliente, no un esquema de Supabase confirmado. El juego consulta el estado por polling con `pollOnline`; no utiliza suscripciones Realtime. Los algoritmos de bot están en el cliente, en `botPlan`, `botResult`, `botRatio` y funciones relacionadas. La validación real de resultados y los permisos del servidor no pueden auditarse con este repositorio.

## Referencia y pruebas de equivalencia

`tests/fixtures/product-baseline.json` guarda hashes del DOM y CSS de las siete páginas originales, huellas de catálogos y diccionario, y valores de referencia del azar. `tests/fixtures/stadium-baseline.json` guarda hashes del SVG original de cada estadio en 390×640 y 1440×640. `tests/fixtures/game-rules-baseline.json` añade resultados originales de reglas, semillas, fechas y pagos de los cuatro juegos. Las pruebas unitarias comparan los módulos actuales con esas fixtures.

La referencia es el commit original `88552644372229ccd8e8157c3ac99c88965b5675`. Los scripts de captura necesitan una carpeta con ese código original, incluidos `players.js`, `lang.js` y `stadiums.js`. El segundo argumento es la revisión que se escribe como procedencia en la fixture; el script no comprueba que el directorio coincida con ella. Por ejemplo:

```sh
git worktree add --detach /tmp/goalday-original 88552644372229ccd8e8157c3ac99c88965b5675
node scripts/capture-baseline.mjs /tmp/goalday-original 88552644372229ccd8e8157c3ac99c88965b5675
node scripts/capture-game-rules-baseline.mjs /tmp/goalday-original 88552644372229ccd8e8157c3ac99c88965b5675
node scripts/capture-stadium-baseline.mjs /tmp/goalday-original 88552644372229ccd8e8157c3ac99c88965b5675
```

Los tres comandos sobrescriben su fixture. No los ejecutes para resolver un test rojo: primero compara la diferencia con el código original y confirma si el cambio de producto era intencional.

`tests/e2e/visual.spec.ts-snapshots/` conserva 24 capturas del original, en español para las siete entradas y en inglés para las cinco páginas de producto, en escritorio y móvil. Usan fecha fija, `fg_team=none`, fuentes externas bloqueadas y Supabase simulado con listas vacías. La suite no valida la tipografía remota, fondos de estadios seleccionados ni el backend. Para recrear las capturas originales, sirve la copia original en un origen local y pasa `GOALDAY_VISUAL_BASELINE_ORIGIN=http://127.0.0.1:<puerto>` al test de Playwright con `--update-snapshots`. No actualices snapshots usando el servidor migrado como referencia.

## Herramientas auxiliares y otros servicios

`caras.html` es una herramienta interna con `noindex`. Su controlador importa `players` y usa las APIs globales `GD_face`, `GD_faces`, `GD_FACE_FIX`, `GD_faces_reset`, instaladas por `src/shared/browser/faces.ts`. Este último consulta miniaturas de Wikipedia ES en lotes de 50, resuelve títulos ambiguos y tiene búsqueda de respaldo. El mapa de fotos fijas está vacío al iniciar. El selector busca candidatas en Wikipedia ES/EN y Wikimedia Commons; guarda elecciones en su propia clave y permite copiar el resultado. No modifica el módulo de fotos automáticamente.

`editor-goles.html` también tiene `noindex`. Su controlador está en `src/tools/goal-editor/controller.ts`. El editor original requería `GOLES` e `INICIO` de `goles.js`; esos datos siguen ausentes y la entrada conserva el aviso. La entrada conserva un script clásico opcional `./goles.js`; Vite no lo empaqueta. Para restaurar los datos, su ubicación sería `public/goles.js`. Se mantiene el binding global léxico `GOLES` que declara el archivo generado; no se sustituye por `window.GOLES`. Permite editar ID/URL de YouTube y tiempos `desde`, `corte`, `hasta`, probar el vídeo y generar un archivo `goles.js`. Usa la API IFrame de YouTube. Aquí faltan `goles.js` y `gol-del-dia.html`; el editor detecta la ausencia de datos y muestra un aviso. La referencia `gol-del-dia.html?dia=5` aparece en el texto generado, no es una ruta de juego disponible.

Las páginas principales cargan Google Fonts. Compartir usa Web Share API, portapapeles o descarga según el juego y el navegador. El Reto 15K genera una imagen con Canvas. Las APIs de compartir/portapapeles dependen de su disponibilidad y del contexto del navegador; comprueba también sus alternativas.
