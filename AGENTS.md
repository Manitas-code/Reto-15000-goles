# Guía para agentes

## Antes de editar

GOALDAY es un sitio multipágina estático con cuatro juegos de fútbol. Las páginas HTML de la raíz conservan las URL públicas. Vite compila las siete entradas; la UI usa DOM y CSS nativos. Node 24 está fijado en `.nvmrc`.

Lee solo el documento que necesites:

- [README.md](README.md): ejecutar, probar y ubicar módulos.
- [docs/arquitectura.md](docs/arquitectura.md): estructura, datos, persistencia, servicios y baseline original.
- [docs/juegos.md](docs/juegos.md): reglas de cada juego y verificaciones manuales.
- [plans/react-backend.md](plans/react-backend.md): propuesta de React y API propia, pendiente de aprobación; incluye anexos de frontend y contratos.
- [plans/migracion-typescript.md](plans/migracion-typescript.md): fases y criterios de la migración. No cambies el estado de las fases sin completar sus checks.

## Dónde cambiar código

| Trabajo                                | Archivos                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Portada, navegación y metadatos        | `index.html`, `src/pages/home/`                                            |
| Reglas y estado por juego              | `src/games/<juego>/engine.ts`, `state.ts` si existe                        |
| Render y flujo de juego                | `src/games/<juego>/controller.ts`                                          |
| Tipos de elementos por ID              | `src/games/<juego>/dom.ts`                                                 |
| Contratos RPC consumidos por Reto      | `src/games/reto-15000/rpc-types.ts`; sus llamadas están en `controller.ts` |
| Catálogo de futbolistas                | `src/data/players.ts`, `extra-players.ts`, `emoji-players.ts`              |
| Persistencia e identidad compartidas   | `src/shared/storage/json.ts`, `src/shared/identity/store.ts`               |
| Supabase RPC y configuración           | `src/shared/supabase/`                                                     |
| Traducciones                           | `src/shared/i18n/dictionary.ts`, `src/shared/i18n/controller.ts`           |
| Equipos, selector y renderer de fondos | `src/shared/stadiums/teams.ts`, `controller.ts`, `geometry.ts`             |
| Cache y APIs de fotos                  | `src/shared/browser/faces.ts`, `src/tools/faces/`                          |
| Editor del Gol del día                 | `src/tools/goal-editor/`; los datos `goles.js` faltan                      |
| Inicialización común                   | `src/shared/bootstrap.ts`, invocado por cada `main.ts`                     |
| Entradas, build y base URL             | HTML raíz, `vite.config.ts`                                                |

Cada juego tiene su propio `main.ts`. Conserva el orden de bootstrap configurado allí. En Reto 15K se inicia el controlador antes de estadios y después idioma; en los otros juegos, idioma precede a estadios. Consulta `src/shared/bootstrap.ts` antes de alterar este orden.

## Comprobar cambios

```sh
npm ci
npm run check
```

Para cambios de UI, navegación o bootstrap, instala Chromium una vez y ejecuta `npm run e2e`. Si cambian rutas o recursos, verifica también:

```sh
VITE_BASE_PATH=/Reto-15000-goles/ npm run build
```

No actualices fixtures golden para silenciar una diferencia. La referencia original es el commit `88552644372229ccd8e8157c3ac99c88965b5675`; los scripts de captura requieren una copia separada de ese código. Consulta [arquitectura.md](docs/arquitectura.md#referencia-y-pruebas-de-equivalencia).

Las capturas Playwright bloquean orígenes externos, usan ranking simulado, `fg_team=none` y no cargan fuentes remotas. No demuestran equivalencia del renderer de estadios ni de las fuentes en producción.

## Límites de compatibilidad

- Mantén aspecto, copy, reglas, tiempos, sonidos, animaciones, navegación, parámetros y enlaces durante esta migración.
- No alteres el orden de catálogos ni los algoritmos de azar. Las semillas y los datos determinan los diarios y duelos que comparten los clientes.
- Conserva claves, formatos y campos desconocidos en `localStorage`. Evita `localStorage.clear()`.
- Los tests usan almacenamiento de navegador aislado. Iniciar consume intento en Reto, Más o Menos y Blackjack; Emoji permite reanudar.
- El script temprano del `<head>` restaura `fg_bg` antes de pintar. Conserva ese momento para evitar parpadeos.
- `src/shared/i18n/controller.ts` usa `WeakMap` para recordar textos y atributos originales que traduce. Revisa ES/EN y los wrappers de Canvas, compartir, portapapeles y diálogos al cambiar copy.
- `window.GD_EMOJI` debe estar listo antes de inicializar idiomas en Emoji Player. Las APIs globales `FG_LANG`, `FG_STADIUM` y `GD_face` se mantienen por compatibilidad.
- Los tipos RPC documentan lo que consume el cliente. No son un esquema Supabase confirmado. No hagas escrituras remotas solo para explorar.
- No coloques secretos de servidor en el frontend. No hay SQL, esquema, políticas ni migraciones Supabase en este repositorio.
- El editor sigue dependiendo del `goles.js` ausente. No afirmes que Gol del día está operativo.
