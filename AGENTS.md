# Guía para agentes

GOALDAY es una web multipágina. Los HTML de la raíz conservan las URL públicas; Vite compila las siete entradas. Bun 1.4.2 está fijado en `.bun-version`; `bun.lock` es el lockfile de dependencias. Node 24 (`.nvmrc`) solo se requiere para capturar o comparar la referencia exacta de geometría SVG de V8; desarrollo y producción usan Bun.

Los imports `node:*` existentes son compatibles con Bun en los usos actuales. No los sustituyas por el nombre del módulo; revisa la API concreta. El inventario y las comprobaciones están en [docs/backend.md](docs/backend.md#apis-compatibles-con-bun).

Lee solo la guía que necesites:

- [README.md](README.md): desarrollo, comandos y mapa general.
- [docs/arquitectura.md](docs/arquitectura.md): módulos, datos, persistencia y referencias de pruebas.
- [docs/docker.md](docs/docker.md): contenedores de desarrollo/producción y puertos.
- [docs/backend.md](docs/backend.md): configuración, endpoints y ejecución local de Fastify.
- [docs/juegos.md](docs/juegos.md): reglas y verificaciones manuales.
- [docs/verificacion-react.md](docs/verificacion-react.md): baseline visual/semántico y límites de las pruebas.
- [docs/verificacion.md](docs/verificacion.md): runbook vigente y selección de comprobaciones según riesgo.
- [docs/reto-flujos.md](docs/reto-flujos.md): modos, estados, hooks, RPC y temporizadores de Reto 15K.
- [docs/persistencia.md](docs/persistencia.md): formatos locales, lectores, escritores y recuperación tras abandono/recarga.
- [plans/react-frontend.md](plans/react-frontend.md): arquitectura de las vistas y migración de UI.
- [plans/react-backend.md](plans/react-backend.md): arquitectura del backend.
- [plans/react-backend-api.md](plans/react-backend-api.md): contratos y rutas API.
- [plans/migracion-typescript.md](plans/migracion-typescript.md): fases históricas y criterios de migración.

Al verificar cambios, revisar [goalday-verify](.agents/skills/goalday-verify/SKILL.md); al revisar un diff, [goalday-review](.agents/skills/goalday-review/SKILL.md); para trabajo que sobreviva a una sesión o pase entre worktrees, [goalday-long-task](.agents/skills/goalday-long-task/SKILL.md). Estas skills se descubren automáticamente por su descripción.

## Dónde cambiar código

| Trabajo                                      | Archivos                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Portada, navegación y metadatos              | `src/pages/home/App.tsx`, `src/pages/home/styles.css`, HTML raíz                       |
| UI de un juego                               | `src/games/<juego>/App.tsx`, `components/`, `styles.css`                               |
| Reglas y estado del juego                    | `engine.ts`, `model.ts`, `useGame.ts`, `persistence.ts` según el juego                 |
| Reto 15K: partida, bots, duelos y divisiones | `src/games/reto-15000/useReto.ts`, `model.ts`, `bots.ts`, `useDuel.ts`, `divisions.ts` |
| Fotos y editor                               | `src/tools/faces/`, `src/tools/goal-editor/`                                           |
| Catálogos                                    | `src/data/players.ts`, `extra-players.ts`, `emoji-players.ts`                          |
| API del navegador                            | `src/shared/api/` y los tipos en `contracts/`                                          |
| Rutas y transporte del servidor              | `server/app.ts`, `config.ts`, `supabase.ts`, `start.ts`                                |
| Identidad, idioma y estadio compartidos      | `src/shared/identity/`, `i18n/`, `stadiums/`                                           |
| Entradas, assets y prefijo de publicación    | HTML raíz, `src/**/main.tsx`, `vite.config.ts`                                         |

Docker usa `Dockerfile` con etapas `development` y `production`, y `compose.yaml` con los perfiles del mismo nombre. `.dockerignore` excluye credenciales y artefactos locales. Mantén la versión de la imagen alineada con `.bun-version`.

Los juegos montados con `mountPage` reciben `IdentityProvider`, `LanguageProvider` y `TeamProvider`. Usa `useLanguage()` y `useTeam()` para leer o cambiar esos estados. `TeamProvider` ya renderiza `#fgStadium` y el selector `#teamPick`; no los dupliques. Fotos y editor usan montaje React propio.

Las APIs globales `FG_LANG`, `FG_STADIUM` y `GD_face` se mantienen para compatibilidad. Emoji Player debe instalar sus datos de emojis antes de traducirlos. Los HTML restauran `fg_bg` temprano para evitar el parpadeo del fondo.

## Comprobaciones

```sh
make install
make check
make format-check
```

La matriz y el runbook vigentes están en [docs/verificacion.md](docs/verificacion.md). Para cambios de UI, navegación o montaje, asegúrate de tener Chromium instalado y ejecuta la comprobación E2E indicada allí. Para cambios en Fastify, compila frontend y servidor antes del smoke:

```sh
make build
make smoke
```

Para comprobar un prefijo de publicación:

```sh
VITE_BASE_PATH=/Reto-15000-goles/ make build-web
```

No actualices fixtures para hacer pasar una comparación. La referencia original es el commit `88552644372229ccd8e8157c3ac99c88965b5675`; los scripts de captura requieren una copia separada. La evidencia de migración anterior y sus límites están en [docs/verificacion-react.md](docs/verificacion-react.md); el runbook actual está en [docs/verificacion.md](docs/verificacion.md).

## Límites de compatibilidad

- Conserva aspecto, copy, reglas, tiempos, sonidos, animaciones, rutas, parámetros y enlaces.
- No alteres el orden de catálogos ni los algoritmos de azar. Las semillas determinan los retos diarios y los mazos de duelo.
- Conserva las claves y campos desconocidos de `localStorage`. No uses `localStorage.clear()`.
- Iniciar consume un intento en Reto, Más o Menos y Blackjack. Emoji Player permite reanudar.
- Los contratos del frontend describen payloads que consume el cliente. No prueban un esquema real de Supabase.
- No añadas claves de servidor al bundle del navegador. El editor sigue sin `goles.js`; no afirmes que Gol del día funciona.
