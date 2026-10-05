# API y backend

El navegador envía rankings, identidad y RPC de Reto a `/api/v1`. `server/` implementa esa API con Fastify y reenvía las operaciones a Supabase REST con `fetch` nativo de Node. La clave anon se lee desde el entorno del proceso servidor; no la pongas en variables `VITE_*` ni en el bundle del navegador.

El backend no contiene un esquema de base de datos. `contracts/api.ts` y `contracts/reto.ts` describen los payloads usados por el cliente, no confirman tablas, funciones, columnas o políticas del proyecto remoto.

## Desarrollo local

Se necesita Node 24 y una URL Supabase HTTPS con la clave anon del proyecto.

```sh
npm ci
cp .env.example .env
```

Edita `.env` y completa `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Después inicia Vite y Fastify:

```sh
npm run dev
```

El script inicia `dev:server` y `dev:web`, y detiene ambos al cerrar el proceso. Vite sirve la web, normalmente en `http://localhost:5173`; su proxy envía `/api` a `http://127.0.0.1:3001`.

Se pueden iniciar por separado:

```sh
npm run dev:web
npm run dev:server
```

`dev:web` no necesita credenciales, pero las llamadas API requieren un servidor aparte. `dev:server` carga `.env` y termina si faltan `SUPABASE_URL` o `SUPABASE_ANON_KEY`.

## Configuración

`.env.example` documenta las opciones actuales:

| Variable              | Uso                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`        | Origen HTTPS del proyecto Supabase, sin ruta ni query. Obligatorio.                                                                                        |
| `SUPABASE_ANON_KEY`   | Clave anon que Fastify envía como header `apikey`. Obligatoria. No es una clave de service role.                                                           |
| `PORT`                | Puerto HTTP. Por defecto, `3001`.                                                                                                                          |
| `HOST`                | Dirección de escucha. Por defecto, `127.0.0.1`, apropiada para desarrollo local.                                                                           |
| `WEB_ORIGINS`         | Orígenes permitidos por CORS, separados por comas y sin rutas. `.env.example` incluye los dos orígenes locales de Vite; si se omite, no se habilita CORS.  |
| `SERVE_WEB`           | Con `true`, Fastify sirve los archivos compilados de `dist/`. Por defecto, `false`.                                                                        |
| `WEB_BASE_PATH`       | Prefijo con `/` al inicio y al final para servir la web. Por defecto, `/`.                                                                                 |
| `SUPABASE_TIMEOUT_MS` | Límite de espera de la petición upstream. Por defecto, `10000`; admite valores de 1 a 60000.                                                               |
| `VITE_API_BASE_URL`   | Variable opcional de build del frontend para usar una API aparte. Por defecto, `/api/v1`. Admite una ruta relativa o una URL HTTPS terminada en `/api/v1`. |

La URL Supabase debe ser un origen HTTPS, sin path adicional. `WEB_ORIGINS` debe coincidir con el origen del navegador, por ejemplo `https://juego.example`. Si se deja vacío, Fastify no registra el plugin CORS. CORS controla qué páginas puede llamar el navegador; no autentica usuarios ni sustituye las políticas de datos del proyecto.

## Rutas

La API valida el cuerpo JSON con esquemas Fastify antes de reenviar la operación. Los cuerpos que exceden el límite de 64 KiB reciben error; los POST que no declaran `application/json` reciben `415`.

| Método y ruta                       | Operación                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/health`                | Comprueba que responde el proceso; no consulta Supabase.                                                                       |
| `POST /api/v1/reto/rpc/:name`       | RPC de Reto 15K definidas en `contracts/reto.ts`, como `duel_queue`, `duel_state`, `link_start`, `season_info` y `seed_daily`. |
| `POST /api/v1/scores/reto`          | Inserta una puntuación del Reto.                                                                                               |
| `POST /api/v1/scores/mas-o-menos`   | Inserta una puntuación de Más o Menos.                                                                                         |
| `POST /api/v1/scores/blackjack`     | Inserta una puntuación de Blackjack.                                                                                           |
| `POST /api/v1/scores/emoji-player`  | Inserta o combina un resultado diario de Emoji Player.                                                                         |
| `POST /api/v1/identity/register`    | Reenvía `register_name`.                                                                                                       |
| `POST /api/v1/identity/rename`      | Reenvía `rename_player`.                                                                                                       |
| `GET /api/v1/rankings/reto`         | Ranking diario o total, con opción de incluir visibilidad.                                                                     |
| `GET /api/v1/rankings/mas-o-menos`  | Rankings diario, de carrera o de selección.                                                                                    |
| `GET /api/v1/rankings/blackjack`    | Rankings diario, de carrera o de selección.                                                                                    |
| `GET /api/v1/rankings/emoji-player` | Ranking del día o de la semana.                                                                                                |

Los parámetros de cada ranking y sus límites están implementados en `server/app.ts`. No construyas consultas Supabase desde el navegador: usa las funciones tipadas de `src/shared/api/index.ts`.

Fastify reenvía cuerpos y respuestas REST; para las escrituras añade `Prefer` según el juego. `server/supabase.ts` aplica un `AbortController` con el timeout configurado. Un timeout upstream responde `504`, un fallo de conexión responde `502`, y los errores de validación se devuelven sin propagar detalles internos.

## Build, arranque y prefijos

El build completo ejecuta ambos typechecks, genera `dist/` con Vite y compila Fastify a `dist-server/`:

```sh
npm run build
```

El servidor compilado requiere el mismo `.env`:

```sh
npm start
```

Por defecto, Fastify sirve solo la API. Para que también sirva `dist/`, establece `SERVE_WEB=true` antes del arranque. Si publicas la aplicación bajo un prefijo, usa el mismo en el build web y en Fastify:

```sh
VITE_BASE_PATH=/Reto-15000-goles/ npm run build
```

Y en `.env`:

```dotenv
SERVE_WEB=true
WEB_BASE_PATH=/Reto-15000-goles/
```

En una web estática alojada en otro servicio, `npm run build` solo crea los archivos; no despliega la API. Publica Fastify por separado y define `VITE_API_BASE_URL` con su URL HTTPS antes de compilar el frontend. Añade el origen real de la web a `WEB_ORIGINS`.

Para un futuro shell Capacitor, configura `VITE_API_BASE_URL` con el origen HTTPS de una API alojada y añade a `WEB_ORIGINS` el origen web que use la configuración concreta de la app. No hay soporte nativo ni deployment móvil configurado en este repositorio.

## Smoke local y límites

Después de `npm run build`, puedes comprobar el servidor compilado:

```sh
npm run smoke:server
```

El script levanta Fastify en un puerto local y sustituye Supabase por un upstream falso. Comprueba health, CORS, rankings, HTML y assets compilados, errores de ruta y caché. No valida credenciales, tablas, RPC, RLS ni datos de un proyecto real. Las pruebas en `tests/server/` también usan un transporte falso para verificar solicitudes y respuestas.

Este repositorio no incluye SQL, migraciones, configuración de autenticación ni políticas RLS. No se ha confirmado aquí que el proyecto Supabase real contenga las tablas/RPC esperadas o que sus políticas protejan cada operación. Antes de publicar, verifica esos puntos en el proyecto autorizado. No uses una clave service role como `SUPABASE_ANON_KEY` ni incluyas claves de servidor en el frontend.

## Publicación y reversión

La migración prepara los artefactos; no publica ni modifica Supabase. Antes de una publicación autorizada, conservar el release anterior completo (`dist/`, `dist-server/` y su lockfile), la configuración del servicio y las variables del entorno fuera del repositorio. Verificar el build nuevo con el smoke y después rankings y un duelo entre dos clientes en el entorno autorizado. Mantener el origen web y las rutas públicas conserva el almacenamiento local de los usuarios.

Si falla la verificación del release, restaurar juntos los artefactos web y servidor del release anterior, usando su configuración API compatible, y reiniciar el servicio Node con el procedimiento del proveedor. Comprobar health y las siete entradas. Esta migración no aplica SQL ni cambia formatos de progreso: la reversión no exige una migración inversa de base de datos ni borrar almacenamiento. No restaurar solo un frontend cuyo contrato requiera otra versión de API.
