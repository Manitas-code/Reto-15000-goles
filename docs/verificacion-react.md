# Verificación de la migración React y API

La implementación debe conservar el producto del commit `88552644372229ccd8e8157c3ac99c88965b5675`. Compilar y arrancar no demuestra equivalencia.

## Referencias independientes

- Las 24 capturas de `tests/e2e/visual.spec.ts-snapshots/` son las referencias previas a React. No se han regenerado durante esta migración.
- `tests/fixtures/react-semantic-baseline.json` se capturó ejecutando las siete páginas originales en ES y EN, con red externa bloqueada, fecha fija y sin equipo. `scripts/capture-react-semantic.mjs` documenta la captura y su procedencia. No usar el código migrado como origen.
- Las dos capturas de `tests/e2e/stadium.spec.ts-snapshots/` se tomaron del mismo original servido desde una copia separada, seleccionando Barcelona. Cubren el fondo rasterizado, el selector en inglés y viewport 390 × 844. Se añadieron después de las 24 referencias iniciales; no las sustituyen.
- Las imágenes de `tests/e2e/product.spec.ts-snapshots/` se capturaron desde el original al compartir el diario del 5 de octubre de 2026, con dos descartes y un récord previo de 30.000. Verifican el canvas exportado en ES y EN.
- Las tres imágenes de `tests/e2e/reto-visual.spec.ts-snapshots/` se capturaron desde el original en móvil: primera carta, cuatro colocaciones y resultado del diario sin descartes. Comprueban las previsualizaciones y el tablero durante una partida.
- Las tres referencias de `tests/e2e/blackjack-visual.spec.ts-snapshots/` se obtienen del original en 390 × 799: decisión inicial, victoria de la banca y banca pasada. El reloj se pausa y se espera al contador de fichas antes de capturar la página completa. Solo la barra de tiempo se oculta durante la captura mediante el mismo estilo de test en ambos productos; sus vencimientos se comprueban en los recorridos funcionales. El viewport evita el rasterizado fraccionario de las cartas con `zoom:1.1` de la rama alta. El reparto avanza por etapas de 220/220/220/260/80 ms, observando cada commit de cartas antes de seguir. La calibración se acepta después de dos repeticiones contra el original sin diferencias.

La comparación semántica conserva textos, árbol de elementos, atributos de controles, navegación y metadatos. Solo aplana el contenedor de montaje `#root` y aplica a ambos lados los defaults equivalentes `class=""` e input textual `value=""`. No elimina diferencias de copy ni estructura. Los scripts, estilos y geometría SVG se verifican por otras pruebas.

### Calibración de las nuevas capturas de Blackjack

Durante la creación de esta prueba, avanzar 1000 ms de una vez producía un historial de capas 3D diferente al reparto observado por etapas. El propio original falló contra esa primera captura con 400 píxeles distintos; original por etapas y React resultaron idénticos píxel a píxel. No se corrigió la UI ni se aumentó la tolerancia para resolverlo. La captura final procede exclusivamente del original con el arnés por etapas, reloj pausado antes de navegar y dos repeticiones de validación. No se modificaron las 24 referencias anteriores ni las fixtures de reglas, catálogos, SVG o DOM semántico.

El HTML servido para capturar tiene SHA-256 `c36ed7f90662e9a9c89afdec36eddb46e1ec948cf95b88d25e6e8d3c0d1ac4d5`, idéntico al archivo de `88552644372229ccd8e8157c3ac99c88965b5675`. Las tres imágenes del primer intento se conservaron durante el diagnóstico en `/tmp/goalday-bj-initial-capture-audit/`; sus hashes permiten identificar qué calibración se descartó:

| Imagen inicial                       | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `blackjack-first-decision-linux.png` | `3556c0b5be851b60962e58e2cf9104e6b1593f78e3bfe0b5af142088e564963b` |
| `blackjack-bank-wins-linux.png`      | `e48ad3bc58d24022677afd298bf86b19044a14536c0e38396168f245f3e9aaf4` |
| `blackjack-bank-bust-linux.png`      | `05513cdb94e670a466b9fae9119ccf9200151edb77d6a2a911e8f631ade99e36` |

Esta corrección del arnés durante su creación no autoriza regenerar referencias cuando cambie el producto. Los tests aceptados conservan sus expectativas. El `playwright.config.ts` vigente fija dos workers y no reutiliza un servidor existente.

## Comprobaciones de la migración

Esta sección conserva evidencia y procedimientos de la migración. Para la matriz por riesgo y comandos actuales, usa [verificacion.md](verificacion.md).

La suite se ejecuta con Bun mediante `make test`. La comparación exacta de geometría SVG usa una fixture creada con V8 y se ejecuta aparte con Node 24, fijado en `.nvmrc`; esta excepción afecta a esa prueba y al script que capturó su referencia original.

```sh
make check
make format-check
make browsers
make e2e
make build
make smoke
VITE_BASE_PATH=/Reto-15000-goles/ make build-web
WEB_BASE_PATH=/Reto-15000-goles/ make smoke
```

`tests/server/` conecta el cliente HTTP real con la aplicación Fastify y un transporte Supabase falso. Comprueba payloads y headers, las 22 operaciones RPC, validación, errores, conflictos, respuestas vacías y campos de respuesta futuros. `scripts/smoke-server.mjs` importa el servidor compilado, abre un puerto local y comprueba páginas, recursos, caché, CORS, health y API sin contactar una base de datos.

Las pruebas de integración React montan los cuatro juegos con sus providers y StrictMode, inician una partida y desmontan la página con el ranking pendiente. Comprueban cancelación de temporizadores y RAF, limpieza de globals y ausencia de solicitudes o escrituras nuevas tras resolver la respuesta tardía. Dos casos adicionales desmontan con una subida de récord pendiente y comprueban que no se escriba ni se inicie una segunda subida al resolverla. Otra integración arranca los dos procesos reales de desarrollo y comprueba su cierre en sistemas POSIX.

Los recorridos de navegador también cubren candidatos/selección/deshacer/exportación de Caras, rankings con visibilidad y fallback, temporadas/podio/medallas, y Selección libre de Más o Menos y Blackjack con secuencias deterministas extraídas del original. Los registros atraviesan validación mínima, conflicto 409, respuesta pendiente, Enter repetido, ES/EN y una sola subida del récord. Un diario consumido en otra pestaña impide empezar una segunda partida.

Los recorridos de navegador incluyen las siete manos del Blackjack diario con pagos obtenidos del original, aciertos y fallo de Más o Menos, reanudación y registro tardío en Emoji, y recuento animado de Reto con cambios de sonido durante el guardado. Los duelos cubren dos clientes, sala, revancha, enlaces, cancelación de cola, colocación por vencimiento y resultado de bot. El reloj de la prueba de bot se detiene al iniciar su solicitud para comparar el mismo momento del countdown independientemente del transporte de red.

Las pruebas de navegador de diario, recarga, partidas completas y herramientas se contrastan primero con la copia original antes de usarse como criterio para React. Para ese contraste:

```sh
SOURCE=baseline GOALDAY_VISUAL_BASELINE_ORIGIN=http://127.0.0.1:8011 bun run e2e -- tests/e2e/product.spec.ts tests/e2e/editor.spec.ts tests/e2e/stadium.spec.ts tests/e2e/duels.spec.ts tests/e2e/blackjack-payout.spec.ts tests/e2e/reto-recount.spec.ts tests/e2e/reto-visual.spec.ts tests/e2e/blackjack-visual.spec.ts tests/e2e/faces.spec.ts tests/e2e/rankings.spec.ts tests/e2e/selection-registration.spec.ts
```

Ese servidor debe servir una copia del commit original en loopback. El wrapper solo admite `localhost`, `127.0.0.1` o `[::1]` en modo baseline. `make e2e` ordinario rechaza las variables de origen explícito; solo el modo `SOURCE=baseline` usa el original. La configuración/CLI Playwright directa admite origen explícito para diagnóstico experto. Las pruebas de duelos reproducen los contratos del cliente con un servicio simulado; nunca hacen escrituras remotas.

## Límites de la evidencia

Las pruebas aíslan los servicios externos. Las fotos remotas, fuentes descargadas, un iframe real de YouTube y el esquema/políticas reales de Supabase requieren comprobación aparte antes de publicar. El editor se prueba con un calendario inyectado; el repositorio sigue sin `goles.js`, y esto no convierte Gol del día en un producto operativo.

No cambiar una expectativa porque React produzca otro resultado. Ante un fallo, revisar primero el original, el montaje del test y la implementación. Los cambios de infraestructura de un test deben conservar su expectativa y documentar por qué el montaje previo no representaba el escenario.

## Evidencia histórica del cierre local (2026-10-05)

Estas comprobaciones se ejecutaron antes de migrar el proyecto a Bun. Los comandos npm de este registro describen la evidencia obtenida entonces; para ejecutar las comprobaciones actuales, usa los targets Make de la sección anterior.

- Instalación limpia con `npm ci`: completada.
- `npm run check`: tipos de frontend/servidor, ESLint, 31 pruebas Vitest en 9 archivos y ambos builds pasan.
- `npm run format:check`: pasa.
- `npm run e2e`: 38 pruebas en 13 archivos pasan juntas; incluyen 34 PNG y 14 proyecciones semánticas de las siete páginas en ES/EN.
- Nuevas capturas de Blackjack: dos repeticiones contra el original y comparación React pasan con cero diferencias.
- Build y servidor compilado: smoke en `/` y `/Reto-15000-goles/` pasa con upstream falso. El build final queda en la base `/`.
- `src/` y `dist/`: sin URL Supabase, `/rest/v1` ni variables/clave de su configuración.
- Fixtures previas, 24 PNG originales, CSS, catálogos y geometría SVG: sin cambios.

La advertencia de Vite sobre el script clásico `goles.js` refleja la dependencia ausente del editor que ya tenía el producto original. No se sustituyó por datos inventados ni se afirma que el calendario esté operativo.

## Migración a Bun y Make (2026-10-06)

- Bun 1.4.2 fijado en `.bun-version` y `packageManager`; instalación limpia con `bun install --frozen-lockfile` desde `bun.lock` comprobada sin reutilizar `node_modules`.
- `make check` pasa: tipos, lint, 30 pruebas Vitest en Bun y la prueba de geometría en Node 24, build web/servidor y formato.
- `bun run e2e --workers=2` pasa las 38 pruebas, incluidas las comparaciones visuales y semánticas existentes. Dos workers son ahora el valor por defecto tanto local como en CI. Con cuatro workers se observaron una captura intermitente de Blackjack y fallos de temporización bajo carga; no se cambiaron pruebas, expectativas ni PNG para resolverlos.
- Smoke con Bun en `/` y `/Reto-15000-goles/` pasa. El build final queda en `/`.
- `make start` con `SERVE_WEB=true` y el flujo completo de `make prod` responden health y las siete entradas en un entorno cuyo `PATH` no contiene Node ni npm. `make prod` instala, compila y ejecuta smoke antes de servir la web y la API. Se usaron credenciales falsas y no se llamó a Supabase.

La prueba de geometría conserva Node/V8 porque `Math.sin` en Bun/JavaScriptCore produce un último bit distinto en ciertos valores. En Charlotte 390×640 cambian seis opacidades serializadas y 31 bytes del SVG, aunque las coordenadas y rutas coinciden. Se conserva la comparación exacta original ejecutándola en su motor, sin alterar la geometría del producto ni la fixture. `make test` incluye esa comprobación automáticamente; no uses `bun test` como sustituto de Vitest.
