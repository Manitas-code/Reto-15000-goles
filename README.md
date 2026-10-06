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

El desarrollo, las comprobaciones, la build y el servidor de producción usan Bun 1.4.2, fijado en `.bun-version`. Las dependencias se instalan desde `bun.lock` en modo congelado. Prepara el entorno:

```sh
make install
cp .env.example .env
```

Completa `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `.env` con los valores existentes del proyecto y arranca ambos procesos:

```sh
make dev
```

Vite suele quedar en `http://localhost:5173/`; la API escucha en `http://127.0.0.1:3001/` y Vite reenvía `/api` a ese puerto. No publiques `.env`.

También puedes iniciar cada proceso por separado. `dev-web` solo inicia Vite; las llamadas de API necesitan que el servidor esté iniciado. `dev-server` inicia Fastify y requiere `.env`.

```sh
make dev-web
make dev-server
```

La API exige `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Los demás valores de `.env.example` tienen valores de desarrollo. Su uso y los endpoints están en [docs/backend.md](docs/backend.md).

## Comprobaciones

| Comando             | Qué hace                                                        |
| ------------------- | --------------------------------------------------------------- |
| `make help`         | Muestra los comandos disponibles                                |
| `make install`      | Instala dependencias desde `bun.lock` sin cambiarlo             |
| `make dev`          | Inicia Vite y Fastify con recarga                               |
| `make dev-web`      | Inicia solo Vite                                                |
| `make dev-server`   | Inicia solo Fastify con recarga                                 |
| `make typecheck`    | TypeScript del frontend, servidor y contratos                   |
| `make lint`         | ESLint del repositorio                                          |
| `make format-check` | Comprueba el formato sin editar archivos                        |
| `make test`         | Reglas e integración de React y API con Vitest                  |
| `make browsers`     | Instala Chromium para Playwright                                |
| `make e2e`          | Pruebas de navegador con Playwright                             |
| `make check`        | Typecheck, lint, tests, build y formato                         |
| `make build`        | Build web y compilación del servidor                            |
| `make build-web`    | Compila solo el frontend                                        |
| `make build-server` | Compila solo el servidor                                        |
| `make smoke`        | Smoke del servidor compilado con un upstream simulado           |
| `make preview`      | Previsualiza el build web                                       |
| `make start`        | Inicia el servidor compilado                                    |
| `make prod`         | Instala en modo congelado, compila, ejecuta smoke y arranca API |
| `make clean`        | Borra builds y resultados de pruebas generados                  |

Para los tests de navegador, instala Chromium una vez:

```sh
make browsers
make e2e
```

`make test` ejecuta la suite con Bun y usa Node 24, fijado en `.nvmrc`, solo para la prueba exacta de geometría SVG que compara una fixture de V8. Node no se usa en desarrollo ni en producción.

`make smoke` requiere primero `make build`, que genera la web y el servidor. No consulta una base real. Las capturas de referencia bloquean servicios externos y usan `fg_team=none`; sirven para comparar la página con esa configuración, no validan fuentes remotas. Las referencias adicionales de estadio y partidas están documentadas en la guía de verificación.

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
VITE_BASE_PATH=/Reto-15000-goles/ make build-web
```

Este comando no configura una API alojada. La página estática necesita una API en el mismo origen o una URL HTTPS configurada mediante `VITE_API_BASE_URL`. Si Fastify también sirve `dist/`, configura `SERVE_WEB=true` y el mismo prefijo en `WEB_BASE_PATH`. `make prod` inicia el servidor en primer plano; ejecútalo bajo un supervisor de procesos y termina TLS en un proxy o servicio frontal. No hay un destino ni un despliegue remoto configurado en el repositorio. Consulta [docs/backend.md](docs/backend.md) para el runbook.

## Documentación

- [AGENTS.md](AGENTS.md): mapa de archivos y reglas para colaborar en el repositorio.
- [docs/arquitectura.md](docs/arquitectura.md): entradas, datos, persistencia, providers y pruebas de referencia.
- [docs/backend.md](docs/backend.md): configuración y operación de la API.
- [docs/juegos.md](docs/juegos.md): reglas de juego y guía manual.
- [docs/verificacion-react.md](docs/verificacion-react.md): referencias y comprobaciones de equivalencia.
