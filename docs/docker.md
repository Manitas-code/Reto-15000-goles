# Contenedores

Se requiere Docker Engine o Docker Desktop con Compose v2 y acceso al daemon. Bun no necesita estar instalado en el host. `Dockerfile` usa `oven/bun:1.4.2`, la misma versión de `.bun-version`, y `bun.lock` con instalación congelada.

Los targets Compose de Make asignan por defecto un nombre de proyecto derivado del path del checkout, para que varios worktrees no compartan contenedores ni volúmenes. `COMPOSE_PROJECT` o `COMPOSE_PROJECT_NAME` permite fijar otro nombre. Si invocas `docker compose` directamente, usa `-p <nombre-único>` para mantener el aislamiento. Los wrappers de verificación que lanzan el ejecutable Docker aceptan `DOCKER_BIN` como una sola ruta de ejecutable; no admite una cadena de varios tokens como `sudo docker`.

Copia `.env.example` a `.env` si todavía no existe y completa `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Compose entrega el entorno al contenedor al iniciarlo. `.env`, `.git`, dependencias y builds locales se excluyen del contexto de build; las credenciales no se copian a la imagen. No se añade una base de datos: la API continúa usando el Supabase existente.

## Desarrollo

```sh
make docker-dev
# Equivalente:
docker compose -p <nombre-único> --profile development up --build development
```

El contenedor ejecuta Vite y Fastify con recarga. La web está en `http://localhost:5173` y la API en `http://localhost:3001`. Vite reenvía `/api` a Fastify dentro del mismo contenedor.

El código se monta desde el repositorio; `node_modules` utiliza un volumen propio y no las dependencias del host. En cada arranque se ejecuta la instalación congelada para recoger cambios de `bun.lock`. Al cambiar dependencias, reinicia el contenedor. Si modificas `.env`, vuelve a ejecutar `make docker-dev` para recrear el servicio con el entorno nuevo.

Dockerfile y Compose ejecutan la aplicación como el usuario `bun`. El servidor escucha en `0.0.0.0` dentro del contenedor; los puertos del host se publican en loopback. `DEV_WEB_PORT` y `DEV_API_PORT` cambian los puertos publicados, por ejemplo:

```sh
DEV_WEB_PORT=5174 DEV_API_PORT=3002 make docker-dev
```

Los mounts conservan las notificaciones normales de Vite y Bun. Si tu sistema no entrega eventos al contenedor, usa el desarrollo local mientras revisas la configuración de compartición de archivos de Docker Desktop.

### Acceso mediante Cloudflare Tunnel

Con `make docker-dev` activo, ejecuta en otra terminal del mismo servidor:

```sh
make cloudflare
# Equivalente:
cloudflared tunnel --url http://127.0.0.1:5173 --http-host-header localhost
```

Requiere `cloudflared` instalado en el host. Abre la URL HTTPS de `trycloudflare.com` que imprime el comando y mantén ambos procesos activos. Si cambias `DEV_WEB_PORT`, utiliza ese puerto con `make cloudflare TUNNEL_URL=http://127.0.0.1:5174`. La cabecera `localhost` permite que Vite acepte las solicitudes del túnel; sin ella, el dominio aleatorio puede recibir un 403 por la comprobación de hosts. No hace falta cambiar `server.allowedHosts`. La API viaja por el mismo túnel mediante el proxy `/api` de Vite.

Para producción, levanta `make docker-prod` y ejecuta `make cloudflare TUNNEL_URL=http://127.0.0.1:3001` (o usa el `PROD_PORT` configurado). Ese puerto sirve tanto la web compilada como la API.

## Producción

```sh
make docker-prod
# Equivalente:
docker compose -p <nombre-único> --profile production up --build -d production
```

La etapa de build comprueba tipos, compila las siete entradas y el servidor, y ejecuta el smoke existente con un upstream simulado. La imagen final contiene dependencias de producción, `dist/`, `dist-server/` y `package.json`; no contiene fuentes, pruebas ni credenciales. Bun ejecuta directamente el servidor compilado; no se necesita Node.

Web y API se sirven en `http://localhost:3001`, con `SERVE_WEB=true`. Compose activa reinicio `unless-stopped`, un proceso init y healthcheck de `/api/v1/health`. Health confirma el proceso, no la conexión a Supabase. `make docker-build` construye esta imagen sin iniciarla.

`PROD_PORT` cambia el puerto publicado. `PROD_BIND_ADDRESS` vale `127.0.0.1` por defecto para usar un proxy HTTPS delante; puedes poner `0.0.0.0` si necesitas publicar el puerto en todas las interfaces del host. El proxy y TLS se configuran en el servicio de hosting.

Para servir un prefijo, Compose usa `WEB_BASE_PATH` tanto en el build web como en Fastify:

```sh
WEB_BASE_PATH=/Reto-15000-goles/ PROD_PORT=8080 make docker-prod
```

La web quedará en `http://localhost:8080/Reto-15000-goles/`; la API conserva `/api/v1`. `VITE_API_BASE_URL` es opcional y se incorpora al build, por defecto `/api/v1`. Al cambiar una variable de build hay que reconstruir la imagen. Las claves de Supabase son variables de ejecución, nunca argumentos de build.

Los puertos de desarrollo y producción coinciden por defecto para la API. Usa `make docker-down` antes de cambiar de modo, o elige puertos distintos si necesitas ambos a la vez.

## Operación y comprobaciones

```sh
make docker-build
make docker-smoke
make docker-logs
make docker-down
# Verificar la configuración sin imprimir las variables privadas:
docker compose --profile development --profile production config --quiet
```

`docker-smoke` reutiliza el smoke existente dentro de la imagen final mediante un montaje de solo lectura; valida HTTP, las siete páginas y assets con un upstream falso. Requiere haber construido la imagen con `docker-build`.

`docker-down` detiene solo el proyecto Compose derivado de este checkout y conserva el volumen de dependencias. No borra progreso del navegador ni datos de Supabase. Para gestionar directamente varias copias, usa un `docker compose -p <nombre-único>` por checkout con los mismos perfiles.

Ejecuta `make check` y `make e2e` en desarrollo o CI antes de publicar. La imagen solo incorpora build/typecheck y smoke; la prueba exacta de geometría V8 sigue necesitando Node 24 en la suite local. CI también construye la imagen de producción y ejecuta ese smoke dentro de ella. Estos comandos construyen y arrancan en el host actual; no publican en un registro ni realizan un despliegue remoto.

## Evidencia histórica de Docker, 2026-10-06

`make check` pasa los tipos, lint, 31 tests, ambos builds y formato. La suite de desarrollo obtuvo 37/38 en una ejecución por un timeout con el modal de ascenso de Reto interceptando un clic; ese caso pasó al repetirlo aisladamente. No se modificaron sus expectativas.

Se construyeron y arrancaron ambos perfiles con credenciales falsas, sin escrituras en Supabase. Se comprobaron health, las siete entradas, la invalidación de módulos de Vite tras editar un archivo montado, usuario no root, ausencia de fuentes/credenciales/dependencias de desarrollo en la imagen final y cierre con SIGTERM: ambos contenedores terminaron con código 0. El smoke de la imagen final pasa en `/` y `/Reto-15000-goles/`.

La suite completa contra la imagen compilada obtuvo 34/38 en su primera ejecución. La comparación visual detectó diferencias localizadas en Blackjack: 495/481 píxeles en el texto de la carta de portada móvil ES/EN y 21 píxeles en una carta durante una partida. El fallo de temporización de Más o Menos pasa al repetir su caso aislado. La diferencia de portada también se reprodujo con el build local servido por Fastify, incluso sin minificación; no dependía de Docker. Ese registro dejó pendiente la paridad visual del build compilado.

## Verificación de autonomía, 2026-10-07

`make verify` pasó 33 pruebas de reglas/integración y 39 recorridos de navegador en cada modo: desarrollo, build local e imagen Docker. El ajuste de nombre de la portada de Blackjack repite la medición en el siguiente frame, tras estabilizarse el layout. Los relojes y la interacción con el modal de ascenso del arnés se corrigieron. No se modificaron fixtures ni snapshots.

El manifiesto, los informes y los logs de esa ejecución están en `.artifacts/2026-10-07T11-28-17.194Z-verify-d085ad71/`. CI utiliza el mismo comando y conserva la evidencia 14 días. El contenedor de prueba monta solo el servidor offline y sus adaptadores de contratos; la imagen normal continúa arrancando `server/start.js` con su configuración de ejecución.
