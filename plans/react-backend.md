# React y backend pequeño para GOALDAY

## Estado y lectura

Diseño del 2026-10-05, **aprobado mediante la instrucción `/goal` del usuario**. Implementación completada y validada localmente. Capacitor sigue siendo una fase futura; la aprobación no incluye publicación ni cambios remotos en Supabase.

Orden de lectura para implementar tras aprobación:

1. Este documento: decisiones, estructura, fases y reparto.
2. [Frontend](react-frontend.md): componentes, estado, traducciones y ciclo de vida.
3. [API y backend](react-backend-api.md): contratos y equivalencia de llamadas.
4. [Arquitectura actual](../docs/arquitectura.md) y [reglas](../docs/juegos.md) solo para la responsabilidad asignada.

Referencias de partida ya guardadas:

- `027769f`: `refactor: migrate static games to a strict TypeScript foundation`.
- `3bbe3c6`: `docs: document project architecture and TypeScript migration`.
- Producto original: `88552644372229ccd8e8157c3ac99c88965b5675`.

El [plan anterior](migracion-typescript.md) conserva el histórico de la primera migración. La propuesta actual sustituye su decisión de mantener DOM nativo **tras la aprobación**; no cambia retroactivamente sus evidencias ni cierra la validación remota pendiente.

## Resultado que se busca

La misma web y los mismos cuatro juegos, implementados con React, TypeScript y Vite. El navegador accede a una API propia; solamente el backend conoce las tablas y RPC de Supabase. Backend pequeño, desplegable por separado y ampliable por dominio sin introducir una segunda base de datos.

Compatibilidad obligatoria: aspecto, copy ES/EN, rutas HTML, query/hash, sonidos, animaciones, tiempos, semillas, orden de catálogos, diarios, intentos, identidad, campos desconocidos de almacenamiento, rankings, bots, salas, enlaces, temporadas y errores observables. Las dos herramientas también conservan su comportamiento, incluido el editor incompleto por ausencia de `goles.js`.

No se implementan en esta fase cuentas, sincronización de progreso, nuevos algoritmos, protección completa contra trampas, Realtime, una SPA ni Capacitor. Los controles de entrada y separación de credenciales del servidor sí forman parte de la API.

## Decisiones concretas

| Área         | Decisión y motivo                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend     | React y React DOM con Vite existente. Siete entradas HTML independientes; no React Router.                                                                     |
| Estado       | `useReducer` por juego, estado local para controles simples y contextos únicamente para idioma, equipo e identidad compartida dentro de cada página. No Redux. |
| Estilos      | CSS actual por página, sin biblioteca visual ni Tailwind. Conservar jerarquía/clases de la UI.                                                                 |
| Backend      | Fastify 5 sobre Node 24, TypeScript estricto y `fetch` nativo para Supabase REST/RPC.                                                                          |
| Contratos    | `contracts/` compartido, sin imports de DOM, Node o React. Rutas explícitas y tipos de peticiones/respuestas.                                                  |
| Validación   | JSON Schema de Fastify para entradas; no añadir otra biblioteca de esquemas inicialmente. Tests cruzan tipos y ejemplos de contratos.                          |
| Datos        | Supabase existente. Misma clave pública y permisos actuales en el adaptador del servidor; ninguna sustitución por `service_role`.                              |
| Repositorio  | Un `package.json`, un lockfile y carpetas `src/`, `server/`, `contracts/`. Sin monorepo ni workspaces por ahora.                                               |
| Tests        | Vitest y Playwright actuales; React DOM/`act` con jsdom para ciclo de vida e `app.inject()` para API.                                                          |
| Móvil futuro | Capacitor reutilizará el build web y API; no se instalan proyectos Android/iOS ahora.                                                                          |

Fastify aporta validación, logging y tests sin abrir un puerto. Elegir Express, Nest o un ORM no resuelve una necesidad adicional aquí. Las versiones compatibles se fijarán en lockfile al ejecutar la fase A; no actualizar dependencias actuales por rutina.

## Estructura final y límites de imports

```text
contracts/
  api.ts                     # DTO y mapa cerrado de operaciones, sin implementación
  reto.ts                    # respuestas RPC actualmente en rpc-types.ts
server/
  app.ts                     # buildApp({ config, fetchImpl }), no escucha al importar
  start.ts                   # configuración, listen, señales y cierre
  config.ts                  # variables y validación de arranque
  supabase.ts                # transporte único hacia origen fijo
                             # rutas explícitas y JSON Schema en app.ts
src/
  app/                       # providers y montaje común
  shared/api/                # http.ts (transporte) + index.ts (funciones por dominio)
  shared/i18n/               # dictionary + translation + React provider; puente legado temporal
  shared/stadiums/           # teams + geometry + rasterización + selector React
  games/<juego>/             # main.tsx, App.tsx, model.ts, useGame.ts, persistence.ts,
                             # engine.ts actual, componentes reales y styles.css
  pages/home/
  tools/faces/
  tools/goal-editor/
tests/server/                # contratos HTTP e inyección de transporte falso
tests/react/                 # eventos/efectos con StrictMode y almacenamiento previo
tests/e2e/                   # producto original + API simulada explícita
tests/helpers/fake-api.ts    # estado determinista de pruebas, nunca datos de producción
scripts/dev.mjs              # arranque/cierre de Vite y servidor
tsconfig.json                # frontend y contratos, jsx react-jsx
tsconfig.server.json         # NodeNext; server + contracts, sin frontend
dist/                       # web estática, generado
dist-server/                # servidor compilado, generado
```

Frontend puede importar `contracts/`, nunca `server/`. Backend puede importar contratos, nunca controladores, globals o módulos DOM. Las reglas puras existentes no se mueven ni se recalculan en servidor en esta fase. Evitar archivos vacíos y capas de repositorios/interfaces sin un consumidor real.

## Desarrollo, build y configuración

Dependencias nuevas propuestas: `react`, `react-dom`, `fastify`, `@fastify/cors` para API separada y `@fastify/static` para probar/servir web y API bajo un origen. Desarrollo: `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `tsx`. Reutilizar jsdom, ESLint, Prettier, TypeScript y tests existentes.

Scripts a implementar exactamente:

| Script         | Ejecución/responsabilidad                                                         |
| -------------- | --------------------------------------------------------------------------------- |
| `dev`          | `node scripts/dev.mjs`: Vite 5173 y API 3001, cerrar ambos al salir o fallar uno. |
| `dev:web`      | `vite`; proxy `/api` hacia `http://127.0.0.1:3001`, sin reescribir prefijo.       |
| `dev:server`   | `tsx watch server/start.ts`.                                                      |
| `typecheck`    | Comprobar frontend/tests y `tsc --noEmit -p tsconfig.server.json`.                |
| `build:web`    | Build Vite conservando siete entradas y `VITE_BASE_PATH`.                         |
| `build:server` | `tsc -p tsconfig.server.json`.                                                    |
| `build`        | Tipos, `build:web`, `build:server`.                                               |
| `start`        | `node dist-server/server/start.js`.                                               |
| `preview`      | Mantener preview web estático; usar `start` para probar integración compilada.    |
| `test`         | Vitest de reglas, contratos, React y backend en entornos Node/jsdom separados.    |
| `e2e`          | Playwright con Vite y API falsa, cerrados por `webServer`.                        |
| `check`        | Tipos, lint, reglas/integración y ambos builds. CI ejecuta además formato y E2E.  |

`tsconfig.server.json`: `module`/`moduleResolution: NodeNext`, `rootDir: .`, `outDir: dist-server`, `strict: true`, incluye `server/**/*.ts` y `contracts/**/*.ts`, sin tests en emisión. Imports relativos del backend con extensión `.js` para ejecución ESM tras compilar. Frontend mantiene resolución Bundler. Tests tienen comprobación de tipos también; no `any`, `ts-ignore` o `allowJs` para esquivar problemas.

Variables server-only: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT` (3001), `HOST`, `WEB_ORIGINS` (lista explícita para CORS), `SERVE_WEB` (false por defecto), `WEB_BASE_PATH` (`/` por defecto), `SUPABASE_TIMEOUT_MS` (10000). Validar al arrancar; `.env.example` contiene placeholders y `.env` queda ignorado. Usar soporte `--env-file` de Node/tsx comprobado al implementar, sin añadir dotenv automáticamente.

Frontend: `VITE_API_BASE_URL`, default `/api/v1`. En build para hosting separado es URL HTTPS completa que termina en `/api/v1`; jamás URL/clave Supabase. Resolver operaciones concatenando segmentos conocidos, no `new URL('/ruta', base)` que perdería el prefijo. `VITE_BASE_PATH` controla recursos web, no el origen API. Un test cubre base API relativa y absoluta y web bajo subruta.

## Hosting y compatibilidad de origen

GitHub Pages puede conservar la web estática, pero no ejecutar Fastify. Para el primer despliegue se propone **mantener exactamente el origen web actual** y alojar la API Node por separado, configurando su URL y CORS para ese origen. Esto conserva el almacenamiento de los usuarios. La elección de proveedor, coste e infraestructura se revisa antes de publicar; no requiere elegir proveedor para implementar/probar el plan.

La implementación también soportará web/API bajo un origen: `SERVE_WEB=true` sirve `dist/` mediante `@fastify/static`, prefijo `WEB_BASE_PATH`, `/api/v1` sigue en raíz. No usar fallback SPA; archivo/ruta desconocida debe devolver 404. No cachear HTML ni API como immutable; solo assets de Vite con hash. Probar `/` y `/Reto-15000-goles/`, incluyendo imágenes, navegación relativa y metadatos. Migrar el origen web necesita una decisión adicional sobre progreso e identidad.

No afirmar que interponer API bloquea el acceso público previo a Supabase: sus políticas, claves públicas y clientes antiguos siguen existiendo. Tampoco convertir un `pid` local en autenticación mediante un header. La mejora inicial es separar responsabilidades y centralizar contratos. Autenticación y validación autoritativa de partidas son propuestas posteriores, con migración de identidad explícita.

## Fases y criterios de cierre

Las fases siguientes están aprobadas. Su cierre depende de las comprobaciones indicadas y de la referencia original. Cada entrega debe seguir ejecutándose; no dejar una página parcialmente React con dos propietarios del mismo DOM.

| Fase | Trabajo concreto                                                                                                                                | Cierre verificable                                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Congelar DTO/rutas del anexo API; capturar ejemplos de storage y referencia semántica desde el original; configurar TSX/servidor/scripts/tests. | Builds web/server, health sin consultar BD, contratos de 409/cuerpo vacío y fixtures originales sin modificaciones.                       |
| B    | API completa y cliente tipado; sustituir llamadas Supabase de los cuatro controladores todavía DOM.                                             | Todas las operaciones pasan por API, mismo payload/status/resultado; navegador sin requests/imports Supabase y tests sin salida remota.   |
| C    | Providers/idioma/equipo React y portada piloto, conservando bootstrap temprano.                                                                 | Portada ES/EN/móvil/escritorio equivalente, selector de equipo y enlaces, ausencia de observers sobre React y CSS original.               |
| D    | Emoji completo: modelo, persistencia, eventos y vista.                                                                                          | Diario reanudable, puntuación y ranking, errores/envío, ES→EN→ES; StrictMode no duplica efectos.                                          |
| E    | Más o Menos y Blackjack como tareas independientes sobre interfaces cerradas.                                                                   | Partidas completas diarias/libres y modalidades, límites de intento, pagos/empates, animaciones y temporizadores con referencia original. |
| F    | Extraer y migrar Reto: sesión base, bots, online/salas/enlaces, rankings/temporadas y compartir, en ese orden.                                  | Reto libre completo, diarios, cada flujo online con fake de dos clientes, cancelación/revancha, canvas/compartir y resultados iguales.    |
| G    | Caras y editor React; retirar puentes/globals no consumidos y controladores sustituidos; actualizar docs/CI.                                    | Siete entradas React, herramientas conservadas, ausencia de React/DOM mixto por página, batería completa y límites documentados.          |
| H    | Preparar artefactos y runbook; comprobar backend autorizado, despliegue y rollback.                                                             | No publicar automáticamente. Validación remota y publicación sujetas a autorización posterior.                                            |

Capacitor será una fase posterior independiente. Su aceptación como dirección no implica que empaquetar la web garantice experiencia móvil o aceptación en tiendas.

## Reparto de tareas para subagentes

Usar `gpt-6-luna` con instrucciones cerradas: documento concreto, archivos permitidos, DTO aprobados, casos de prueba y cambios prohibidos. Máximo tres subagentes junto al coordinador.

1. **A, en paralelo:** agente API redacta/implementa `contracts/` + `server/` + `tests/server/`; agente frontend prepara providers/portada en `src/app`, `src/shared/i18n`, `src/shared/stadiums`, `src/pages/home`; agente verificación captura referencia semántica independiente y prepara fake/E2E en `tests/`. Coordinador es único dueño de package/lock/config/scripts/CI y HTML raíz. Primero integrar contratos, después consumidores; comunicar cambios de interfaz, no deducirlos.
2. **B:** agente API conserva servidor; agente cliente modifica `src/shared/api` y llamadas de los cuatro controladores; agente verificación cubre contratos. No iniciar dos tareas sobre un mismo controlador. La portada C puede integrarse mientras se completa B si no depende de red.
3. **D:** piloto Emoji con un dueño del juego; los otros dos revisan API/infra y flujos equivalentes. Cierra D antes de copiar patrones a E.
4. **E:** un dueño para Más o Menos y otro para Blackjack; tercero prepara extracción Reto sin editar esos juegos. Config, traducciones y componentes comunes se cambian solo por el dueño acordado.
5. **F:** un solo dueño de `reto/controller.ts` durante extracción. Tras separar módulos, repartir bots/sesión, online/salas/enlaces y ranking/temporadas/compartir entre archivos disjuntos. No asignar tres agentes al controlador monolítico. Integrar extracción antes de arrancar reparto.
6. **G:** herramientas independientes en paralelo; coordinador revisa cobertura, docs y eliminación de puentes.

Plantilla obligatoria de tarea: fase y dependencias cumplidas; archivos permitidos; operaciones/modelo/componentes esperados; comportamiento original a preservar; comando/casos de cierre; prohibición de tocar golden, configuración ajena, secretos, servidor remoto o estilos; resumen final de cambios y evidencia. Commit convencional en inglés por entrega funcional, nunca solo scaffolding vacío.

## Verificación transversal

- Conservar fixtures originales de reglas, datos, SVG y las 24 capturas; no actualizarlas para aceptar React.
- El test que hash-ea HTML fuente debe evolucionar: React mueve la UI al render. Capturar antes una proyección semántica del **runtime original**, con procedencia; comparar runtime migrado con esa referencia independiente. Mantener comprobaciones de CSS/datos/reglas y head/metadatos. Definir exclusiones mínimas (contenedor de montaje y detalles internos de React), revisar toda exclusión y no eliminar controles/textos/clases relevantes. Esto no autoriza regenerar golden desde la app migrada.
- Ampliar E2E: completar los cuatro juegos, todas las modalidades, diario recargado, campos desconocidos, ES/EN dinámico, errores de red/409, salas/enlaces/duelos/revancha con dos clientes de la API falsa.
- Componentes bajo StrictMode: montar/desmontar/remontar, fake timers y respuestas tardías; cero intervalos/listeners huérfanos, cero submits repetidos, no consumir intento al montar.
- Tests API usan `buildApp` y `fetchImpl` falso, verifican consulta, headers y body exactos. E2E intercepta nuestra API con fixtures o fake estatal; no stub genérico `200 []` para operaciones de escritura.
- Prohibir salida a Supabase en navegador migrado y tests; Wikipedia/Commons siguen como servicios de fotos permitidos. No afirmar ausencia de toda red externa.
- CI: `npm ci`, tipos/lint/formato/reglas e integración, ambos builds, Chromium/E2E, build con subruta y smoke de servidor compilado sirviendo artefacto. Servidor de smoke usa upstream fake, nunca producción.
- Las capturas actuales no cubren fuentes remotas, fondos seleccionados ni backend real. Añadir escenarios de equipo a la verificación manteniendo test SVG independiente; comprobar tipografías reales antes de publicar sin cambiar las capturas originales.

## Preparación para Capacitor

Separar llamadas de compartir/portapapeles, persistencia y API del modelo de juego, sin crear adaptadores vacíos. Mantener funciones reales con fallback web. La app móvil configurará API HTTPS; `/api` relativa dentro del bundle local no llegará al backend público.

Revisar en la fase móvil: pausa/reanudación y tiempos, botón atrás, enlaces de reto, safe areas, audio, compartir y almacenamiento persistente. Web y WebView tienen almacenes distintos: no prometer traslado automático del progreso actual. Elegir entonces Preferences/almacenamiento adecuado y migración; Capacitor advierte que `localStorage` móvil puede ser eliminado por el sistema.

## Decisiones para esta revisión

La aprobación solicitada es para React multipágina + Fastify adaptador + contratos propios, conservando Supabase y producto. Hosting con coste, autenticación, cambios de reglas y publicación quedan fuera. Antes de fase H se necesitará un entorno backend autorizado; se puede completar A–G con transporte falso y contratos observados sin explorar producción.

## Fuentes técnicas consultadas

- [React: adopción incremental](https://react.dev/learn/add-react-to-an-existing-project).
- [React: StrictMode y repetición de efectos en desarrollo](https://react.dev/reference/react/StrictMode).
- [Fastify: validación JSON Schema](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).
- [Fastify: pruebas con inject y separación de arranque](https://fastify.dev/docs/latest/Guides/Testing/).
- [Vite: proxy del servidor de desarrollo](https://vite.dev/config/server-options.html#server-proxy).
- [Fastify Static: servicio de archivos y prefijos](https://github.com/fastify/fastify-static).
- [Capacitor: almacenamiento móvil](https://capacitorjs.com/docs/guides/storage).

## Decisiones registradas durante la implementación

- Las rutas y sus esquemas quedan juntos en `server/app.ts` (API de 373 líneas), con configuración, arranque y transporte en módulos propios. Los dominios siguen usando rutas explícitas; no se crearon archivos de routing vacíos. `src/shared/api/index.ts` reúne las funciones tipadas y `http.ts` el transporte.
- Las integraciones React usan `act` y el montaje real con React DOM, jsdom y StrictMode. Se prescinde de Testing Library porque no era necesaria para estos escenarios; no se añadieron pruebas unitarias de cada reducer.
- Se mantienen `FG_LANG`, `FG_STADIUM`, `GD_face` y `GD_EMOJI` como compatibilidad pública. Se eliminan los controladores DOM y el cliente Supabase del frontend. `rpc-types.ts` queda como reexport de los contratos compartidos para imports existentes.
- Los scripts Node/tsx cargan `.env` con `--env-file-if-exists`. Los artefactos y la reversión se describen en [backend.md](../docs/backend.md); no se ha publicado ni cambiado Supabase.

La evidencia y los límites de equivalencia se registran en [verificacion-react.md](../docs/verificacion-react.md). Los criterios históricos de TypeScript se conservan.

## Cierre de implementación (2026-10-05)

| Fase | Estado y entrega                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A    | Completada: contratos compartidos, Fastify, TSX, scripts y referencia semántica del runtime original.                                                                                                                    |
| B    | Completada: API restringida, cliente tipado y eliminación de Supabase del frontend. Payloads, errores y cuerpos vacíos verificados con upstream simulado.                                                                |
| C    | Completada: montaje/proveedores compartidos y portada React; CSS, metadatos, enlaces y restauración temprana del fondo conservados.                                                                                      |
| D    | Completada: Emoji con reanudación, respuestas parciales, revisión, identidad, ranking y ES/EN.                                                                                                                           |
| E    | Completada: Más o Menos y Blackjack con modos Carrera/Selección/diario, secuencias, tiempos, pagos, intentos y registro.                                                                                                 |
| F    | Completada: Reto separado en partida, bots, duelos, divisiones y componentes; salas/enlaces/revancha/cola, temporada/ranking y compartir comprobados.                                                                    |
| G    | Completada: siete entradas React, Caras y editor conservados, controladores DOM retirados, documentación e integración actualizadas. El editor sigue sin `goles.js`.                                                     |
| H    | Preparación local completada: builds web/servidor y runbook de despliegue/reversión. Los smokes pasan en `/` y `/Reto-15000-goles/`. La publicación y validación contra Supabase real quedan fuera de esta autorización. |

Validación final: `npm ci`, `npm run check`, `npm run format:check`, 38 recorridos Playwright (13 archivos), 31 pruebas Vitest (9 archivos), 34 imágenes de referencia y 14 comparaciones semánticas ES/EN. Ambos builds y los smokes del servidor compilado pasan con upstream local simulado. Las reglas, datos, estilos y referencias anteriores permanecen intactos. La calibración independiente de las nuevas capturas de Blackjack se documenta en [verificacion-react.md](../docs/verificacion-react.md).

No quedan tareas de implementación local de estos tres planes. Capacitor, hosting, publicación, tipografías/fotos remotas, YouTube real y comprobación del esquema/políticas Supabase requieren sus fases posteriores; no se declaran verificados por estas pruebas.

Entregas convencionales: `f0506d9` (API y contratos), `a34eaa9` (siete páginas React y retirada del legado) y `a0bf791` (integración y equivalencia visual/funcional).
