# Guía para agentes

GOALDAY es una web multipágina. Los HTML de la raíz conservan las URL públicas; Vite compila las siete entradas. Node 24 está fijado en `.nvmrc`.

Lee solo la guía que necesites:

- [README.md](README.md): desarrollo, comandos y mapa general.
- [docs/arquitectura.md](docs/arquitectura.md): módulos, datos, persistencia y referencias de pruebas.
- [docs/backend.md](docs/backend.md): configuración, endpoints y ejecución local de Fastify.
- [docs/juegos.md](docs/juegos.md): reglas y verificaciones manuales.
- [docs/verificacion-react.md](docs/verificacion-react.md): baseline visual/semántico y límites de las pruebas.
- [plans/react-frontend.md](plans/react-frontend.md): arquitectura de las vistas y migración de UI.
- [plans/react-backend.md](plans/react-backend.md): arquitectura del backend.
- [plans/react-backend-api.md](plans/react-backend-api.md): contratos y rutas API.
- [plans/migracion-typescript.md](plans/migracion-typescript.md): fases históricas y criterios de migración.

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

Los juegos montados con `mountPage` reciben `IdentityProvider`, `LanguageProvider` y `TeamProvider`. Usa `useLanguage()` y `useTeam()` para leer o cambiar esos estados. `TeamProvider` ya renderiza `#fgStadium` y el selector `#teamPick`; no los dupliques. Fotos y editor usan montaje React propio.

Las APIs globales `FG_LANG`, `FG_STADIUM` y `GD_face` se mantienen para compatibilidad. Emoji Player debe instalar sus datos de emojis antes de traducirlos. Los HTML restauran `fg_bg` temprano para evitar el parpadeo del fondo.

## Comprobaciones

```sh
npm ci
npm run check
npm run format:check
```

Para cambios de UI, navegación o montaje, ejecuta `npx playwright install chromium` una vez y después `npm run e2e`. Para cambios en Fastify, compila antes del smoke:

```sh
npm run build
npm run smoke:server
```

Para comprobar un prefijo de publicación:

```sh
VITE_BASE_PATH=/Reto-15000-goles/ npm run build
```

No actualices fixtures para hacer pasar una comparación. La referencia original es el commit `88552644372229ccd8e8157c3ac99c88965b5675`; los scripts de captura requieren una copia separada. La evidencia y sus límites están en [docs/verificacion-react.md](docs/verificacion-react.md).

## Límites de compatibilidad

- Conserva aspecto, copy, reglas, tiempos, sonidos, animaciones, rutas, parámetros y enlaces.
- No alteres el orden de catálogos ni los algoritmos de azar. Las semillas determinan los retos diarios y los mazos de duelo.
- Conserva las claves y campos desconocidos de `localStorage`. No uses `localStorage.clear()`.
- Iniciar consume un intento en Reto, Más o Menos y Blackjack. Emoji Player permite reanudar.
- Los contratos del frontend describen payloads que consume el cliente. No prueban un esquema real de Supabase.
- No añadas claves de servidor al bundle del navegador. El editor sigue sin `goles.js`; no afirmes que Gol del día funciona.
