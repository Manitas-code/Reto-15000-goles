# GOALDAY

Web estática de cuatro minijuegos de fútbol. El repositorio mantiene siete páginas HTML en la raíz para conservar las URL actuales. La aplicación usa DOM nativo y Vite como servidor de desarrollo y empaquetador multipágina; no usa un framework de UI ni necesita un backend local.

| Juego                    | Página                                       | Objetivo                                                                                                  |
| ------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Reto de los 15.000 goles | [reto-15000.html](reto-15000.html)           | Colocar futbolistas en 17 categorías y llegar a 15.000 puntos. Incluye diario, duelos y retos por enlace. |
| Más o Menos              | [mas-o-menos.html](mas-o-menos.html)         | Adivinar cuál de dos futbolistas tiene más goles y sostener la racha.                                     |
| Blackjack de goles       | [blackjack-goles.html](blackjack-goles.html) | Acercarse al objetivo de goles con cartas de futbolistas y fichas.                                        |
| Emoji Player             | [emoji-player.html](emoji-player.html)       | Adivinar cinco futbolistas diarios a partir de cuatro emojis.                                             |

Los diarios usan la fecha de `Europe/Madrid`. Supabase guarda rankings y coordina los duelos del Reto. `localStorage` conserva intentos, progreso, identidad compartida, idioma, equipo y fondos. La interfaz está en español e inglés.

## Desarrollo y comprobaciones

Requiere Node 24, fijado en `.nvmrc`.

```sh
npm ci
npm run dev
```

Vite muestra la URL local, normalmente `http://localhost:5173/`.

El servidor de desarrollo también escucha en la red local. Si el navegador está en otro equipo o entorno, usa la URL `Network` que muestra Vite: `localhost` apunta al equipo del navegador. Comprueba el puerto de la terminal, porque Vite usa otro si el habitual está ocupado.

| Comando                | Resultado                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run typecheck`    | Comprueba los módulos TypeScript en modo estricto.                   |
| `npm run lint`         | Revisa el código y las configuraciones TypeScript.                   |
| `npm run format:check` | Comprueba el formato de TypeScript, tests y scripts.                 |
| `npm test`             | Ejecuta tests unitarios de datos, reglas, RPC, DOM y compatibilidad. |
| `npm run e2e`          | Prueba navegación, partidas y capturas con Playwright.               |
| `npm run build`        | Ejecuta typecheck y compila las siete entradas a `dist/`.            |
| `npm run preview`      | Sirve el contenido compilado.                                        |
| `npm run check`        | Ejecuta typecheck, lint, tests y build.                              |

Para instalar Chromium antes de ejecutar los tests de navegador:

```sh
npx playwright install chromium
npm run e2e
```

El test de navegador bloquea servicios remotos y usa respuestas simuladas de ranking; no escribe en Supabase. Las capturas de referencia bloquean fuentes externas y usan `fg_team=none`, así que sirven para detectar cambios de layout con esa configuración, no para validar fondos de estadio ni tipografía remota.

## Código

- `index.html`, `reto-15000.html`, `mas-o-menos.html`, `blackjack-goles.html`, `emoji-player.html`, `caras.html` y `editor-goles.html` son entradas públicas. Vite conserva sus nombres en `dist/`.
- `src/games/<juego>/` contiene `main.ts`, `controller.ts`, `dom.ts`, `engine.ts` y `styles.css`. `dom.ts` declara los tipos de los elementos por ID; `engine.ts` contiene reglas puras cuando se han extraído. Blackjack también separa los tipos de estado en `state.ts`. Reto declara las respuestas RPC que consume el cliente en `rpc-types.ts`.
- `src/tools/<herramienta>/` organiza de forma similar las páginas de fotos y editor, con módulos DOM/estado/controlador.
- `src/data/` contiene los catálogos tipados y sus formatos históricos.
- `src/shared/` contiene bootstrap, almacenamiento, identidad, RPC, idiomas, estadios y acceso a fotos. El traductor guarda los textos originales con `WeakMap`; el selector y el renderer de estadios están en `stadiums/controller.ts` y `stadiums/geometry.ts`.
- `public/` contiene imágenes que se sirven con sus nombres públicos originales.
- `tests/` contiene fixtures del producto anterior, tests unitarios, pruebas Playwright y capturas golden.
- `scripts/capture-baseline.mjs`, `scripts/capture-game-rules-baseline.mjs` y `scripts/capture-stadium-baseline.mjs` reconstruyen fixtures desde una copia del código original. No los ejecutes para actualizar golden sin comparar primero los cambios.
- `plans/migracion-typescript.md` conserva el plan y sus criterios. No marques fases como cerradas hasta verificar los checks y capturas requeridos.

## Rutas de publicación

Para compilar bajo `/Reto-15000-goles/`:

```sh
VITE_BASE_PATH=/Reto-15000-goles/ npm run build
```

Vite compila el frontend estático; no crea ni configura Supabase. El origen y el estado de publicación se deben confirmar antes de desplegar. `editor-goles.html` mantiene el aviso de que `goles.js` no está en el repositorio.

## Documentación

- [AGENTS.md](AGENTS.md): mapa breve para agentes y reglas de compatibilidad.
- [docs/arquitectura.md](docs/arquitectura.md): datos, módulos, almacenamiento, baseline y servicios.
- [docs/juegos.md](docs/juegos.md): reglas, anclas y comprobaciones manuales.
- [plans/migracion-typescript.md](plans/migracion-typescript.md): fases previstas y criterios de aceptación.
