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

Esta corrección del arnés durante su creación no autoriza regenerar referencias cuando cambie el producto. Los tests aceptados conservan sus expectativas. Playwright limita los workers a cuatro localmente y dos en CI para no saturar el navegador con cargas simultáneas.

## Comprobaciones

```sh
npm run check
npm run format:check
npx playwright install chromium
npm run e2e
npm run smoke:server
VITE_BASE_PATH=/Reto-15000-goles/ npm run build:web
WEB_BASE_PATH=/Reto-15000-goles/ npm run smoke:server
```

`tests/server/` conecta el cliente HTTP real con la aplicación Fastify y un transporte Supabase falso. Comprueba payloads y headers, las 22 operaciones RPC, validación, errores, conflictos, respuestas vacías y campos de respuesta futuros. `scripts/smoke-server.mjs` importa el servidor compilado, abre un puerto local y comprueba páginas, recursos, caché, CORS, health y API sin contactar una base de datos.

Las pruebas de integración React montan los cuatro juegos con sus providers y StrictMode, inician una partida y desmontan la página con el ranking pendiente. Comprueban cancelación de temporizadores y RAF, limpieza de globals y ausencia de solicitudes o escrituras nuevas tras resolver la respuesta tardía. Dos casos adicionales desmontan con una subida de récord pendiente y comprueban que no se escriba ni se inicie una segunda subida al resolverla. Otra integración arranca los dos procesos reales de desarrollo y comprueba su cierre en sistemas POSIX.

Los recorridos de navegador también cubren candidatos/selección/deshacer/exportación de Caras, rankings con visibilidad y fallback, temporadas/podio/medallas, y Selección libre de Más o Menos y Blackjack con secuencias deterministas extraídas del original. Los registros atraviesan validación mínima, conflicto 409, respuesta pendiente, Enter repetido, ES/EN y una sola subida del récord. Un diario consumido en otra pestaña impide empezar una segunda partida.

Los recorridos de navegador incluyen las siete manos del Blackjack diario con pagos obtenidos del original, aciertos y fallo de Más o Menos, reanudación y registro tardío en Emoji, y recuento animado de Reto con cambios de sonido durante el guardado. Los duelos cubren dos clientes, sala, revancha, enlaces, cancelación de cola, colocación por vencimiento y resultado de bot. El reloj de la prueba de bot se detiene al iniciar su solicitud para comparar el mismo momento del countdown independientemente del transporte de red.

Las pruebas de navegador de diario, recarga, partidas completas y herramientas se contrastan primero con la copia original antes de usarse como criterio para React. Para ese contraste:

```sh
GOALDAY_VISUAL_BASELINE_ORIGIN=http://127.0.0.1:8011 npx playwright test tests/e2e/product.spec.ts tests/e2e/editor.spec.ts tests/e2e/stadium.spec.ts tests/e2e/duels.spec.ts tests/e2e/blackjack-payout.spec.ts tests/e2e/reto-recount.spec.ts tests/e2e/reto-visual.spec.ts tests/e2e/blackjack-visual.spec.ts tests/e2e/faces.spec.ts tests/e2e/rankings.spec.ts tests/e2e/selection-registration.spec.ts
```

Ese servidor debe servir una copia del commit original. Las pruebas de duelos permiten reproducir los contratos originales de Supabase con el mismo servicio simulado utilizado para la API propia; nunca hacen escrituras remotas.

## Límites de la evidencia

Las pruebas aíslan los servicios externos. Las fotos remotas, fuentes descargadas, un iframe real de YouTube y el esquema/políticas reales de Supabase requieren comprobación aparte antes de publicar. El editor se prueba con un calendario inyectado; el repositorio sigue sin `goles.js`, y esto no convierte Gol del día en un producto operativo.

No cambiar una expectativa porque React produzca otro resultado. Ante un fallo, revisar primero el original, el montaje del test y la implementación. Los cambios de infraestructura de un test deben conservar su expectativa y documentar por qué el montaje previo no representaba el escenario.

## Resultado del cierre local (2026-10-05)

- Instalación limpia con `npm ci`: completada.
- `npm run check`: tipos de frontend/servidor, ESLint, 31 pruebas Vitest en 9 archivos y ambos builds pasan.
- `npm run format:check`: pasa.
- `npm run e2e`: 38 pruebas en 13 archivos pasan juntas; incluyen 34 PNG y 14 proyecciones semánticas de las siete páginas en ES/EN.
- Nuevas capturas de Blackjack: dos repeticiones contra el original y comparación React pasan con cero diferencias.
- Build y servidor compilado: smoke en `/` y `/Reto-15000-goles/` pasa con upstream falso. El build final queda en la base `/`.
- `src/` y `dist/`: sin URL Supabase, `/rest/v1` ni variables/clave de su configuración.
- Fixtures previas, 24 PNG originales, CSS, catálogos y geometría SVG: sin cambios.

La advertencia de Vite sobre el script clásico `goles.js` refleja la dependencia ausente del editor que ya tenía el producto original. No se sustituyó por datos inventados ni se afirma que el calendario esté operativo.
