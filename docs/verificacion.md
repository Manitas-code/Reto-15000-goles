# Verificación vigente

Esta guía describe cómo comprobar el árbol actual. La evidencia de la migración React/Bun del 5–6 de octubre de 2026 queda en [verificacion-react.md](verificacion-react.md); sirve como procedencia, no como resultado de una ejecución presente.

## Runbook

1. Identifica el riesgo afectado en la matriz y deja anotado el estado inicial del árbol (`git status --short`). Mantén evidencia asociada al commit/diff exacto.
2. Para la batería completa, usa `make verify`. Guarda una ejecución enfocada con `make e2e`; el wrapper crea `.artifacts/<fecha>-e2e-dev-<id>/` con `manifest.json`, `changes.patch`, copias de archivos no rastreados en `untracked/`, `results.json`, `report/`, `test-results/` y `server.log`. `make e2e-prod` prueba el build local y requiere `make build` previo. `make e2e-docker` construye una imagen con tag propio y la prueba, salvo que `GOALDAY_DOCKER_IMAGE` señale una imagen existente. Los E2E offline no necesitan `.env` ni llaman a Supabase.
   Si falta Chromium, instala el navegador una vez con `make browsers`.
3. Usa `make offline SOURCE=dev` para Vite/Fastify locales con upstream falso, o `make offline SOURCE=prod` para el artefacto compilado. Por defecto `PORT=0` elige puerto libre y `HOST` queda en loopback; el proceso imprime `offline.ready` con `origin` y `apiOrigin`. Para evidencia de recorrido visual, `make evidence` genera capturas/video en el modo prod y requiere build. `make report RUN_DIR=<directorio-fase>` abre el visor en loopback y un puerto libre.
4. Registra comando, estado, commit/diff, directorio, resultados y fallos. `make verify` usa una raíz única y tag Docker único, registra comando/resultado por fase (`check`, formato, smoke, E2E dev, E2E prod, build de imagen y E2E Docker), y se detiene en la primera fase fallida. El manifiesto compara hashes del árbol al inicio y al final; si cambia un archivo durante la verificación, el proceso termina con error y el resultado no representa el árbol final. Una simulación demuestra el comportamiento frente a esa simulación. No confirma Supabase, fuentes, fotos ni servicios externos reales.

La fuente de verdad para flags y valores admitidos es `make help` y el `Makefile` de la rama. Cada invocación debe tener su propio directorio. Si `GOALDAY_RUN_DIR` apunta a un directorio con `manifest.json`, el wrapper lo rechaza para no mezclar ejecuciones. Revisa manifiesto y fases si algo no corrió o falló; no describas una verificación parcial como completa.

## Matriz por riesgo

| Riesgo del cambio                                        | Cobertura mínima                                                                                    | Límite de la evidencia                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reglas puras, fechas, semillas, orden de catálogos       | `make test`                                                                                         | Fixtures y secuencias locales; no demuestra equivalencia remota.                                                                                  |
| Estado, persistencia, abandono o recarga                 | `make test` y E2E del juego afectado                                                                | Usa almacenamiento de navegador aislado; no representa datos de otros orígenes.                                                                   |
| UI, navegación, query/hash, idioma, accesibilidad visual | `make e2e`; `make e2e-prod` para el artefacto compilado; `make evidence` para recorrido visual      | Chromium offline; revisa fallos contra la referencia aceptada.                                                                                    |
| Animaciones, sonido y temporizadores                     | `make e2e` con el recorrido afectado                                                                | El tiempo virtual, `reduced-motion` o la red falsa pueden cambiar el ritmo. Comprueba el recorrido de vencimiento con su temporizador real.       |
| API Fastify, validación, errores o headers               | `make check`, `make smoke`, `make e2e-prod`                                                         | Upstream local falso; no prueba esquema, permisos RLS ni datos de Supabase.                                                                       |
| Runtime y build Docker                                   | `make e2e-docker`                                                                                   | Imagen de producción con proceso offline y helpers montados en solo lectura. No necesita `.env`, dependencias de desarrollo ni acceso a Supabase. |
| Build y prefijo de publicación                           | `VITE_BASE_PATH=/Reto-15000-goles/ make build-web`; smoke con `WEB_BASE_PATH` si cambia el servidor | Build local. No implica despliegue.                                                                                                               |
| Recursos o datos remotos                                 | Revisión de URL y manejo de error; prueba controlada solo si hay entorno autorizado                 | Mock ≠ remoto. No añadir claves al bundle ni afirmar funcionamiento real sin esa prueba.                                                          |

## Modos de prueba

- **Fake/offline:** `make offline SOURCE=dev` inicia Vite con proxy a Fastify y upstream simulado; `make offline SOURCE=prod` sirve el build Fastify con ese upstream. Playwright usa `FakeGoaldayApi`; smoke y E2E-prod no usan `.env`. Repiten respuestas, errores y concurrencia sin escritura remota.
- **E2E ordinario:** `make e2e` inicia su propio servidor offline y rechaza `GOALDAY_E2E_ORIGIN` y `GOALDAY_VISUAL_BASELINE_ORIGIN` heredados. Así una variable de shell no puede dirigir por accidente una prueba normal a otro servidor.
- **Baseline original:** sirve una copia independiente del commit original en loopback, puerto 8011, y llama `SOURCE=baseline GOALDAY_VISUAL_BASELINE_ORIGIN=http://127.0.0.1:8011 bun run e2e`. El modo baseline solo acepta `localhost`, `127.0.0.1` o `[::1]`. Nunca apuntes a un baseline remoto.
- **Origen explícito para expertos:** la configuración Playwright y su CLI admiten un origen configurado explícitamente. Para omitir el wrapper, invoca directamente `GOALDAY_E2E_ORIGIN=http://127.0.0.1:<puerto> bun --bun run playwright test ...`; ese modo permite cualquier origen indicado y traslada al operador la responsabilidad de comprobar el destino y el alcance.
- **Desarrollo conectado:** `make dev` inicia Vite/Fastify con configuración local; la API conectada requiere `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Para E2E de desarrollo, `make e2e` usa el entorno offline del wrapper.
- **Producción local:** `make e2e-prod` ejecuta el build compilado y confirma rutas, assets y contrato del artefacto; no confirma despliegue ni políticas remotas.
- **Remoto autorizado:** solo para comprobar una incertidumbre que fake/offline no cubra, con el entorno y alcance ya autorizados. Registra exactamente qué operación se hizo y qué no se verificó.

`make e2e`, `make e2e-prod`, `make e2e-docker`, `make verify` y `make evidence` guardan logs y resultados en `.artifacts/`. El árbol se hashea al inicio y al cierre; un cambio durante la ejecución da estado fallido aunque las pruebas pasen. No reutilices `GOALDAY_RUN_DIR` con un `manifest.json` previo. `make report RUN_DIR=<directorio-fase>` sirve su `report/index.html` en loopback y un puerto libre. No subas los artifacts a la aplicación salvo que se solicite.

Los wrappers envían `SIGTERM` a los procesos que iniciaron y esperan el cierre del servidor/container antes de terminar. En `SOURCE=baseline`, el servidor original es externo al wrapper y queda a cargo de quien lo inició.

No actualices snapshots para silenciar una diferencia. Contrasta primero con el baseline independiente de `88552644372229ccd8e8157c3ac99c88965b5675`; scripts de captura pueden sobrescribir fixtures y requieren una copia separada.

## Concurrencia y snapshot

Los wrappers de build, E2E, evidencia y verificación bloquean `.artifacts/workspace.lock` mientras usan el checkout. Otro proceso debe esperar o utilizar un worktree separado. El token de bloqueo permite las fases hijas de `make verify`; no es un control de permisos. Los comandos Vite/tsc directos quedan fuera de ese bloqueo.

El manifiesto incluye hashes de los archivos nuevos y `snapshotOmissions` para los que no se copian. El snapshot conserva el patch rastreado y copia a `untracked/` los archivos nuevos de código/documentación, fixtures JSON, assets permitidos, skills y configuración raíz. Las rutas fuera de esa allowlist quedan nombradas y hashadas en el manifiesto, pero su contenido no se copia. El digest incluye archivos rastreados y no ignorados, también las omisiones, para detectar cambios durante la ejecución. No publiques el informe de un árbol que contenga secretos en código versionado.

CI ejecuta `make verify` y conserva sus logs, informes y manifiestos durante 14 días incluso al fallar. Después comprueba el prefijo con build y smoke. El calendario ausente del editor sigue siendo un límite documentado.
