# Frontend React: diseño e implementación

**Registro de diseño implementado; no es el mapa vigente de archivos ni de comandos.** La implementación actual usa `useReto.ts`, `useDuel.ts` y `contracts/reto.ts`; el controlador DOM propuesto aquí no existe. Consulta [los flujos actuales de Reto](../docs/reto-flujos.md), [la arquitectura](../docs/arquitectura.md) y [el runbook vigente](../docs/verificacion.md). Este documento conserva las decisiones históricas de migración.

La aplicación conservará las siete páginas HTML y sus URL. Cada documento seguirá siendo una entrada independiente de Vite; React montará la vista de esa página. No habrá SPA ni router. El backend BFF y sus contratos se describen en [react-backend.md](react-backend.md) y [react-backend-api.md](react-backend-api.md).

## Decisiones de arquitectura

- Mantener `index.html`, `reto-15000.html`, `mas-o-menos.html`, `blackjack-goles.html`, `emoji-player.html`, `caras.html` y `editor-goles.html` en la raíz y como entradas de `vite.config.ts`. Conservar metadatos, enlaces, query, hash, redirección temprana de `index.html`, y los scripts de `<head>` que restauran `fg_bg` antes del primer pintado.
- Añadir React, React DOM, `@vitejs/plugin-react` y los tipos de React/React DOM. Habilitar JSX en TypeScript y mantener modo estricto. Vite compilará las mismas siete entradas y los HTML seguirán publicándose con sus nombres actuales.
- Crear un `App.tsx` por página y montar React en un único nodo raíz propio. El HTML conservará metadatos, scripts tempranos y el punto de montaje; las vistas y sus estados pasarán a React. El CSS existente seguirá siendo la referencia visual durante la migración.
- Usar providers compartidos solo para idioma, equipo/estadio e identidad. El progreso y el estado de cada juego pertenecen a ese juego. Cada juego usará `useReducer`; no se añadirá Redux.
- Mantener `engine.ts` y los modelos puros separados de la interfaz. No generar azar en un reducer ni durante el render: una acción de usuario o un orquestador crea las muestras aleatorias y las incluye en la acción. El reducer calcula el siguiente estado de forma determinista.
- El reducer no escribirá almacenamiento ni red. Las acciones de aplicación y los adaptadores de persistencia efectuarán esas operaciones en el límite del evento. Las acciones que no se pueden repetir usan bloqueos de operación, guardas de fase y tokens de sesión/montaje. El coordinador comprueba su vigencia antes de enviar o guardar y después de resolver respuestas tardías. No se reintentan mutaciones automáticamente.
- No se envolverán los controladores DOM actuales en un `useEffect` general. Cada vista se reconstruirá como componentes React; se reutilizarán reglas, catálogos y funciones puras ya extraídas.

## Estructura por página y juego

En cada carpeta se crearán únicamente los módulos que la vista real necesite:

```text
src/pages/home/
  main.tsx
  App.tsx
  components/...
src/games/<juego>/
  main.tsx
  App.tsx
  useGame.ts
  model.ts
  persistence.ts
  components/...
```

`main.tsx` leerá el nodo raíz y montará `App` con `createRoot`. `App.tsx` compondrá la pantalla. `useGame.ts` conectará `useReducer` con acciones de aplicación y efectos de lectura/cancelación que sí necesiten ciclo de vida. `model.ts` contendrá estado y transiciones puras. `persistence.ts` adaptará los formatos actuales de `localStorage`; no definirá un formato nuevo. `components/` contendrá solo vistas que tengan límites visibles y responsabilidad propia, con nombres basados en el producto (`GameBoard`, `RankPanel`, etc.), no archivos de plantilla vacíos.

Los adaptadores existentes en `src/shared/storage/json.ts` y `src/shared/identity/store.ts` serán la base. Deben mantener las claves y formas actuales (`reto15k-v2`, `gd_mm_stats`, `gd_mm_daily`, `gd_bj10_stats`, `gd_bj10_daily`, `gd_emoji_v1`, entre otras), incluidos campos desconocidos. La identidad seguirá compartida. La lectura inicial podrá hidratar un reducer, pero no provocará una partida ni consumirá un intento.

## Vistas por página

La portada migrará primero. Su vista está en `index.html` y el comportamiento de idioma y selección de estadio está en los servicios compartidos. `src/pages/home/App.tsx` reunirá marca, tarjetas de juegos y navegación. La prueba de este paso será el recorrido a cada URL, incluidos enlaces con `reto`, `online` y `sala` que `index.html` redirige.

Emoji Player fue el piloto planeado. Las referencias a `controller.ts`, `model.ts` y `persistence.ts` describen la separación propuesta entonces, no rutas vigentes. Para los archivos presentes, consulta `src/games/emoji-player/`.

Más o Menos y Blackjack se describieron como migraciones paralelas. Las rutas `controller.ts` de esta sección son históricas; consulta `src/games/mas-o-menos/` y `src/games/blackjack/` para el código actual.

El diseño de Blackjack describía siete manos, animaciones, límite de 10 segundos y varias transiciones temporizadas. La implementación actual y sus temporizadores están en `src/games/blackjack/`; esta propuesta no es su estructura ejecutable.

Reto 15K se migró al final. El estado actual separa `useReto.ts`, `useDuel.ts`, `engine.ts`, `model.ts`, `bots.ts`, `divisions.ts` y componentes de vista. `rpc-types.ts` fue retirado; los consumidores importan contratos desde `contracts/reto.ts`. Usa [docs/reto-flujos.md](../docs/reto-flujos.md) como referencia vigente.

Las páginas `caras.html` y `editor-goles.html` también pasarán a React al final. `caras` conserva la selección manual y la caché de fotos existentes. El editor seguirá mostrando el aviso cuando falten datos: `goles.js` no está en el repositorio. Si se restaura, el binding léxico global `GOLES` que declara ese script clásico debe seguir funcionando; no se reemplazará por `window.GOLES` ni se afirmará que Gol del día está disponible.

## Contrato de modelos y acciones de aplicación

Estos nombres son del diseño nuevo; su semántica se toma de las funciones actuales. Antes de borrar una función original, mover todos sus efectos a la acción o módulo indicado y cubrir el camino correspondiente.

| Juego       | Estado mínimo y fases                                                                                                                                           | Acciones y efectos que deben quedar ubicados                                                                                                                                                                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emoji       | `home → guessing → revealed → result`; día/progreso, índice, errores únicos, resultados, puntos y envío; sugerencias/input como estado UI                       | `START_OR_RESUME` hidrata `start()`; `GUESS` aplica `guess()` y guarda errores o `resolve()`; `NEXT` avanza y llama transición equivalente a `finish()` al quinto. Persistir acierto/error antes de revelar. `SUBMIT_RESULT` mantiene `sent` y manejo de errores.                                                                         |
| Más o Menos | `home → question → reveal → question/result`; modalidad/categoría, jugadores, racha, deadline, busy                                                             | `START_DAILY/FREE` corresponde a `startDaily/start`; `ANSWER/TIMEOUT` a `answer/reveal`; `REVEAL_DONE` a `next/finish`. Timeout cuenta como fallo; animación numérica 700 ms, siguiente tras acierto 1300 ms, cierre por fallo 2000 ms o timeout 2600 ms, igual que `reveal()`.                                                           |
| Blackjack   | `home → betting → dealing → decision → dealer → settled → betting/result`; modalidad, mano, mazo/fuentes, cartas, fichas, apuesta, doblado, deadline y busy     | `START`, `SELECT_BET`, `TAKE`, `DOUBLE`, `STAND`, `TIMEOUT`, `ANIMATION_DONE`, `NEXT_HAND`. Mapear `start`, `renderBet`, `take`, `stand` y cierre real, sin suponer reglas estándar de blackjack. Timeout equivale a `stand(true)`; conservar siete manos, fichas iniciales 1000, apuestas 100/200/300 y fin anticipado con menos de 100. |
| Reto        | sesión local: inicio, selección/colocación, resultado; estado online separado con búsqueda/espera/juego/resultado/cancelación; links/salas con su estado propio | `START_DAILY/FREE`, `PLACE`, `DISCARD`, `PICK_TIMEOUT`, `FINISH`; acciones online `QUEUE/CANCEL/STATE_RECEIVED/SUBMIT/REMATCH`, sala `CREATE/PEEK/JOIN`, enlace `LOAD/START/CREATE/FINISH`. Conservar 17 casillas, `seededDeal`, `packSlots`, bonus y cada modalidad, sin aplicar una única regla de inicio al online.                    |

El coordinador calcula una transición con el snapshot actual, ejecuta su persistencia obligatoria y publica el siguiente estado. No leer state capturado por un callback antiguo: usar snapshot/ref vigente y guardas de fase. El reducer es puro y tolera dobles invocaciones de React; la deduplicación de eventos es local a la sesión y no garantiza idempotencia del servidor. Una petición abortada puede haber sido ejecutada remotamente: no reintentar mutaciones ni enviar cancelaciones desde cleanup de montaje; reservar acciones de negocio para los eventos de usuario/transiciones originales. Cancelación de recursos y cancelación de duelo son responsabilidades distintas.

No introducir un reloj global nuevo. Más o Menos y Blackjack conservan el deadline basado en `performance.now()` y comprobación al volver a la página; ocultar la pestaña no pausa ni reinicia los 10 segundos. Los deadlines y ticks se generan fuera del reducer, que recibe el tiempo en la acción. Reto y bots conservan sus bases `Date.now()`/tiempos originales. Extraer duraciones literales por juego con su valor actual, sin armonizarlas.

Traducciones con negritas/enlaces se representan como nodos React conservando markup, no concatenando nombres de usuario en `dangerouslySetInnerHTML`. Los textos de Canvas/share/clipboard se traducen al producirse la acción. No cambiar copy para facilitar un componente.

## Estado compartido, idioma y estadios

`LanguageProvider` expondrá idioma y `t`; persistirá el valor `es`/`en` en `fg_lang`. `TeamProvider` mantendrá el ID de `fg_team`, el selector y el renderer. Reutilizará el catálogo de `src/shared/stadiums/teams.ts` y la geometría de `src/shared/stadiums/geometry.ts`; extraerá del controlador actual la rasterización y aplicación visual necesarias. El HTML seguirá restaurando `fg_bg` temprano. No se esperará al montaje de React para pintar el fondo, porque eso causaría un destello. La inicialización debe conservar el orden especial de Reto 15K mientras existan páginas mixtas con el arranque DOM anterior.

El diseño propuso una función pura en `src/shared/i18n/translation.ts`, con proveedor y diccionario compartidos. `src/shared/i18n/controller.ts` no existe; la implementación actual está en `translation.ts` y `provider.tsx`.

El controlador de traducción DOM actual observa todo `document.body` con `MutationObserver`, conserva originales en `WeakMap` e intercepta Canvas, compartir, portapapeles y diálogos. React no compartirá nodos con ese observador: en páginas React se renderizarán las cadenas traducidas y no se instalarán esos parches globales. Los puentes `FG_LANG`, `FG_STADIUM` y `GD_face` podrán seguir disponibles solo para páginas heredadas que aún los necesiten. Una página que combine React con un módulo DOM debe asignar a cada uno un subárbol distinto y no permitir que el observador legado traduzca el raíz React. Al migrar `caras` y editor se retirarán sus puentes solo tras confirmar que ningún consumidor los usa.

## Temporizadores y montaje de React

React StrictMode monta, limpia y vuelve a montar efectos en desarrollo. Cada efecto que posea un recurso devolverá su limpieza: `clearTimeout`, `clearInterval`, `cancelAnimationFrame`, `AbortController.abort()` o `disconnect()` para un observer. Las respuestas de red llevarán un `sessionId` o comprobación de vigencia para que una respuesta antigua no modifique la partida nueva.

Reto 15K tiene intervalos de búsqueda y polling de duelos cada 1.5 segundos, temporizadores de bot y de presentación, además de observadores y animaciones. Blackjack tiene cuenta regresiva, reparto y animación por `requestAnimationFrame`, y escucha `visibilitychange`. Más o Menos tiene temporizadores de pregunta y flujo; Emoji Player tiene demoras para foco y avisos. Cada temporizador dependerá de una fase/partida identificada y se cancelará al cambiar esa fase o desmontar la página. No se conservará una tarea async iniciada desde el módulo o durante el render.

El evento de inicio diario requiere un tratamiento especial. AGENTS.md establece que iniciar consume intento en Reto, Más o Menos y Blackjack, aunque la partida se abandone; Emoji Player, en cambio, debe reanudarse. La acción `START_DAILY` solo se despachará desde el clic del usuario, después de comprobar elegibilidad. El coordinador guardará de inmediato el marcador de inicio antes de presentar la primera pregunta/mano. El render, la hidratación, un efecto de montaje o StrictMode nunca iniciarán partidas. Conservar exactamente los helpers de fecha de cada juego, sin unificarlos: los cuatro diarios usan `Europe/Madrid`, con implementaciones distintas de `todayKey`/`madridDay`/`dayKey` y aritmética de calendario que debe permanecer igual; Reto conservará `dailyStart`, y los otros juegos conservarán sus campos históricos `start`/`done`. Las pruebas cubrirán recarga justo después del inicio, abandono, regreso el mismo día y cambio de día.

## Secuencia propuesta

1. Registrar pruebas y contratos actuales; no modificar fixtures originales.
2. Incorporar JSX y el montaje React, manteniendo las siete entradas. Migrar la portada y comprobar rutas, redirección y captura visual.
3. Migrar Emoji Player como piloto de `useReducer`, persistencia de reanudación, i18n y componentes.
4. Migrar Más o Menos y Blackjack en paralelo una vez que el patrón de estado y temporizadores esté revisado.
5. Migrar Reto 15K por áreas; verificar por separado modo diario, modo libre, duelo, sala y enlace.
6. Migrar `caras` y editor, mantener la ausencia de `goles.js` visible y retirar puentes DOM que ya no tengan consumidores.
7. Documentar los puntos de integración para una fase Capacitor posterior, sin instalarlo ni empaquetar aplicaciones en esta fase. Las páginas conservarán URL, head, clases/CSS y contenido semántico verificado; se revisarán safe areas, navegación externa, compartir y portapapeles en WebView.

Cada etapa debe poder desplegarse como frontend estático multipágina. Las páginas aún no migradas pueden seguir usando su entrada DOM, pero no compartirán el mismo subárbol ni el mismo inicializador de idioma con React.

## Verificación y criterios de aceptación

- Mantener la fixture original de `tests/fixtures/product-baseline.json`, `tests/fixtures/game-rules-baseline.json` y `tests/fixtures/stadium-baseline.json`. La fixture de producto contiene hashes, no un árbol semántico recuperable. La fase A captura por separado `tests/fixtures/react-semantic-baseline.json` desde el runtime del commit original, documentando procedencia y proyección. Comparar el runtime React contra esa referencia independiente y mantener checks existentes de CSS/catálogos/reglas/SVG. Sustituir el check de DOM del HTML migrado por este check de runtime; no afirmar que el hash del HTML fuente puede comparar la vista React. Si el test necesita añadir el nodo raíz como arnés de montaje, excluir únicamente ese wrapper técnico de la normalización y revisar que no incluya ni oculte contenido de producto. No regenerar fixtures para hacer pasar una diferencia.
- El diseño original registró `npm run check` y `npm run e2e`; el repositorio actual usa Bun y targets Make. Para ejecutar comprobaciones hoy, sigue [docs/verificacion.md](../docs/verificacion.md).
- Añadir pruebas de integración con el montaje real de React DOM/`act` y recorridos Playwright que ejerciten los flujos visibles. Reutilizar las pruebas existentes de reglas puras y sus referencias; no añadir una batería de unitarios de cada reducer.
- Envolver pruebas de ciclo de vida en `StrictMode` con temporizadores falsos: tras desmontar no deben quedar intervalos, timeouts, RAF, listeners u observers activos ni solicitudes duplicadas. Las pruebas del polling verifican una sola consulta activa y que una respuesta tardía no modifica otra partida.
- Para cada juego, inicializar el almacenamiento con una copia de referencia y comparar las claves, campos y campos desconocidos después de iniciar, completar, reanudar y abandonar. Comprobar explícitamente que no se usa `localStorage.clear()`.
- Probar diario de Reto, Más o Menos y Blackjack: un inicio elegible marca un solo intento; renderizar, hidratar o remontar en StrictMode no marca otro; recargar mantiene el intento consumido. Probar que Emoji retoma el mismo día, jugador y progreso. Fijar fechas alrededor de medianoche en Madrid.
- Confirmar que el orden de jugadores, la salida del azar con semillas conocidas, multiplicadores, desempates y pagos coincide con las pruebas actuales. No actualizar snapshots o resultados golden para ocultar cambios.
- Para idioma, comparar las cadenas estáticas y dinámicas ES/EN, incluidas fechas, ordinales, Canvas de compartir, portapapeles, Web Share y diálogos. Confirmar que React no instala el MutationObserver global ni los parches de APIs del navegador.
- Las pruebas visuales actuales bloquean recursos externos, simulan ranking vacío y usan `fg_team=none`; no acreditan la fuente ni los fondos de estadio en producción. Hacer una revisión manual del selector y fondo seleccionado, y reservar para la fase móvil la comprobación Capacitor de safe areas, enlaces, compartir y acceso al BFF.

La propuesta se considera implementada cuando las siete URL siguen siendo entradas independientes, cada vista se representa desde estado React, las reglas/datos existentes conservan sus resultados y formatos, no hay doble propiedad del DOM, y las verificaciones anteriores pasan sin alterar las referencias originales.

## Concreción de la implementación

El montaje compartido está en `src/app/mount.tsx`. Los juegos separan reglas/datos, persistencia, modelo y coordinación de efectos de sus vistas. Reto separa `useReto.ts` y `useDuel.ts`, los algoritmos de bot, divisiones y componentes de tablero/ranking. Las herramientas tienen montaje independiente.

La deduplicación utiliza guardas de fase, bloqueos de operaciones y tokens de sesión/montaje, en lugar de añadir un registro genérico de `eventId` para toda acción. Los reducers permanecen puros; red, azar y almacenamiento se ejecutan fuera del render. Las pruebas de integración montan la página real con React DOM/`act` y StrictMode; Testing Library no se necesita. Las referencias originales y escenarios cubiertos están en [la guía de verificación](../docs/verificacion-react.md).

Cierre: las siete entradas usan React y los 38 recorridos de navegador pasan, incluidas 34 imágenes independientes del original y 14 proyecciones semánticas ES/EN. Los tests de ciclo de vida pasan con StrictMode y respuestas pendientes. El [registro general](react-backend.md#cierre-de-implementación-2026-10-05) y la [guía de verificación](../docs/verificacion-react.md) contienen evidencia, calibración y límites.
