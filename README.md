# GOALDAY

GOALDAY es un sitio multipágina de cuatro juegos de fútbol y dos herramientas. Los siete HTML de la raíz conservan las direcciones públicas; Vite los compila por separado a `dist/`.

| Página                                       | Contenido                                                            |
| -------------------------------------------- | -------------------------------------------------------------------- |
| [index.html](index.html)                     | Portada                                                              |
| [reto-15000.html](reto-15000.html)           | Reto de los 15.000 goles, con modo diario, duelos y retos por enlace |
| [mas-o-menos.html](mas-o-menos.html)         | Más o Menos                                                          |
| [blackjack-goles.html](blackjack-goles.html) | Blackjack de goles                                                   |
| [emoji-player.html](emoji-player.html)       | Emoji Player                                                         |
| [caras.html](caras.html)                     | Herramienta interna para revisar fotos                               |
| [editor-goles.html](editor-goles.html)       | Editor legado de vídeos del Gol del día                              |

Las interfaces de las páginas de producto usan React. Los juegos guardan sus reglas y progreso local en módulos separados; los rankings, la identidad y los duelos pasan por la API Fastify del repositorio y ésta reenvía las operaciones a Supabase. Los datos de `goles.js` siguen ausentes, así que el editor informa que no puede cargar el calendario.

## Desarrollo

Se requiere Node 24, fijado en `.nvmrc`. Para ejecutar el frontend y la API a la vez:

```sh
npm ci
cp .env.example .env
```

Completa `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `.env` con los valores existentes del proyecto y arranca ambos procesos:

```sh
npm run dev
```

Vite suele quedar en `http://localhost:5173/`; la API escucha en `http://127.0.0.1:3001/` y Vite reenvía `/api` a ese puerto. No publiques `.env`.

También puedes iniciar cada proceso por separado. `dev:web` solo inicia Vite; las llamadas de API necesitan que el servidor esté iniciado. `dev:server` inicia Fastify y requiere `.env`.

```sh
npm run dev:web
npm run dev:server
```

La API exige `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Los demás valores de `.env.example` tienen valores de desarrollo. Su uso y los endpoints están en [docs/backend.md](docs/backend.md).

## Comprobaciones

| Comando                | Qué comprueba                                         |
| ---------------------- | ----------------------------------------------------- |
| `npm run typecheck`    | TypeScript del frontend, servidor y contratos         |
| `npm run lint`         | ESLint del repositorio                                |
| `npm run format:check` | Formato de fuentes, tests y scripts                   |
| `npm test`             | Reglas e integración de React y API con Vitest        |
| `npm run e2e`          | Pruebas de navegador con Playwright                   |
| `npm run build`        | Typecheck, build web y compilación del servidor       |
| `npm run check`        | Typecheck, lint, tests y build                        |
| `npm run smoke:server` | Smoke del servidor compilado con un upstream simulado |

Para los tests de navegador, instala Chromium una vez:

```sh
npx playwright install chromium
npm run e2e
```

El smoke requiere primero `npm run build`. No consulta una base real. Las capturas de referencia bloquean servicios externos y usan `fg_team=none`; sirven para comparar la página con esa configuración, no validan fuentes remotas. Las referencias adicionales de estadio y partidas están documentadas en la guía de verificación.

## Estructura

- `src/pages/home/`, `src/games/` y `src/tools/` contienen las entradas React `main.tsx` y las vistas `App.tsx`.
- Cada juego mantiene sus modelos, reglas y hooks cerca de su UI. Reto 15K separa `useReto`, `useDuel`, los algoritmos de bot y las vistas de tablero y ranking.
- `src/app/mount.tsx` monta los juegos con providers compartidos de idioma, identidad y equipo/estadio.
- `src/shared/api/` es el cliente HTTP del frontend; `contracts/` define los payloads; `server/` implementa la API Fastify y el transporte hacia Supabase.
- `src/data/` contiene los catálogos tipados. `public/` contiene recursos estáticos.
- `tests/` contiene pruebas y referencias del producto original. Consulta [docs/verificacion-react.md](docs/verificacion-react.md) antes de tocar fixtures visuales o semánticas.

## Publicación bajo un subdirectorio

Para alojar la web bajo `/Reto-15000-goles/`, genera los recursos con esa base:

```sh
VITE_BASE_PATH=/Reto-15000-goles/ npm run build
```

Este comando no configura una API alojada. La página estática necesita una API en el mismo origen o una URL HTTPS configurada mediante `VITE_API_BASE_URL`. Si Fastify también sirve `dist/`, configura `SERVE_WEB=true` y el mismo prefijo en `WEB_BASE_PATH`. Consulta [docs/backend.md](docs/backend.md) para el runbook.

## Documentación

- [AGENTS.md](AGENTS.md): mapa de archivos y reglas para colaborar en el repositorio.
- [docs/arquitectura.md](docs/arquitectura.md): entradas, datos, persistencia, providers y pruebas de referencia.
- [docs/backend.md](docs/backend.md): configuración y operación de la API.
- [docs/juegos.md](docs/juegos.md): reglas de juego y guía manual.
- [docs/verificacion-react.md](docs/verificacion-react.md): referencias y comprobaciones de equivalencia.
