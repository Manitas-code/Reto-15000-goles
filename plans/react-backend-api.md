# Plan: backend API para GOALDAY

**Estado: implementado y validado localmente con upstream simulado.** Leer primero [el plan general](react-backend.md).

## Objetivo y límites

Mover al servidor las llamadas directas del navegador a Supabase sin cambiar las reglas, los datos enviados, las respuestas ni los flujos visibles. El backend será un BFF pequeño en Fastify 5 sobre Node 24. La URL y la clave publishable/anon de Supabase quedan en variables del servidor `SUPABASE_URL` y `SUPABASE_ANON_KEY`; no usar variables `VITE_*` ni una clave service-role.

El repositorio no contiene el esquema, las funciones SQL ni las políticas RLS. Los tipos de `src/games/reto-15000/rpc-types.ts` describen el consumo del cliente, no contratos verificados de Supabase. No explorar ni modificar Supabase para completar esta migración. La autorización actual del backend sigue siendo exactamente la que permitan la clave pública y las políticas existentes.

## Límites de seguridad

- No crear un proxy genérico de URL, tabla, query string ni nombre RPC. El backend acepta solamente las rutas explícitas de este documento.
- Para compatibilidad, reenviar con la clave publishable/anon actual y el mismo contexto público. No usar service-role para sortear RLS ni presentar el BFF como autorización.
- `pid` es un UUID generado en el navegador y guardado en almacenamiento local. Se puede inventar o copiar; es un identificador legado, no autenticación ni prueba de identidad. Las rutas conservan su función actual y no dan garantías de propiedad nuevas. Una futura migración de identidad firmada/cuenta requiere un diseño y cambio de producto separados.
- Validar forma y tipos de cada entrada, sin imponer límites de puntuación, reglas de juego o semántica de negocio que el cliente/servidor actual no tenga confirmadas. Establecer límites técnicos razonables al tamaño del JSON y al tiempo de upstream.
- Todas las llamadas upstream tienen timeout de 10 s. No reintentar escrituras: podrían duplicar o alterar una acción. No registrar claves, payloads personales ni bodies completos de error.

## Contrato HTTP

Las operaciones RPC de Reto usan `POST /api/v1/reto/rpc/<nombre>` con JSON. `<nombre>` debe pertenecer a la lista cerrada de la matriz siguiente. Se conserva el nombre por compatibilidad, pero cada nombre tiene validación de objeto y campos permitidos; los campos desconocidos se rechazan. RPC sin argumentos usa `{}`. No interpolar nombres no permitidos en URL.

Las RPC reenvían el JSON al `/rest/v1/rpc/<nombre>` con `apikey`, `Content-Type: application/json` y sin credenciales privilegiadas. Respuesta 2xx: conservar status, content-type y bytes de body; body vacío sigue vacío. Error upstream: conservar status y body si existen, sin reinterpretar el error. Esto mantiene el comportamiento del wrapper actual: `rpcVoid` ignora el body exitoso; `rpcJson` convierte body vacío a `null` y parsea JSON; los errores de cliente exponen `HTTP <status>` y `.status`, pero no inspeccionan body. El backend no inventa un envelope JSON.

Timeout upstream devuelve 504 y fallo de conexión 502. No se reintentan. Las llamadas que actualmente ignoran/capturan fallos siguen haciéndolo en el cliente.

Rutas de ranking, todas de parámetros tipados y cerrados:

| Ruta                                                                       | Consulta upstream fija                                                                                              | Respuesta                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `GET /api/v1/rankings/reto?tab=day&day=YYYY-MM-DD&includeVisibility=true`  | `scores`, columnas `name,score,day,show_at`, `daily=eq.true`, `day=eq.<day>`, score descendente, máximo actual 1000 | Array PostgREST sin transformar |
| `GET /api/v1/rankings/reto?tab=day&day=YYYY-MM-DD&includeVisibility=false` | `scores`, columnas `name,score,day`, mismo filtro/orden/límite                                                      | Array                           |
| `GET /api/v1/rankings/reto?tab=all&includeVisibility=true`                 | `scores`, columnas `name,score,day,show_at`, score descendente, máximo actual 2000                                  | Array                           |
| `GET /api/v1/rankings/reto?tab=all&includeVisibility=false`                | `scores`, columnas `name,score,day`, mismo orden/límite                                                             | Array                           |
| `GET /api/v1/rankings/mas-o-menos?tab=diario&day=YYYY-MM-DD`               | `hl_scores`, columnas `name,streak`, `mode=eq.diario`, día exacto, streak descendente, máximo actual 100            | Array                           |
| `GET /api/v1/rankings/mas-o-menos?tab=<CategoryKey>`                       | `hl_scores`, columnas `name,streak`, `mode=eq.<tab>`, streak descendente, máximo actual 500                         | Array                           |
| `GET /api/v1/rankings/blackjack?tab=diario&day=YYYY-MM-DD`                 | `bj10_scores`, columnas `name,chips`, modo diario/día exacto, chips descendente, máximo actual 100                  | Array                           |
| `GET /api/v1/rankings/blackjack?tab=<CategoryKey>`                         | `bj10_scores`, columnas `name,chips`, modo exacto, chips descendente, máximo actual 500                             | Array                           |
| `GET /api/v1/rankings/emoji-player?period=day&day=YYYY-MM-DD`              | `emoji_scores`, columnas `name,score,day`, día exacto, máximo actual 5000                                           | Array                           |
| `GET /api/v1/rankings/emoji-player?period=week&weekStart=YYYY-MM-DD`       | `emoji_scores`, mismas columnas, `day >= weekStart`, máximo actual 5000                                             | Array                           |

No exponer filtros PostgREST arbitrarios. Allowlist fija para Más o Menos y Blackjack: `diario`, `carrera`, `seleccion`. Más o Menos la declara en `controller.ts` (`CategoryKey`, `RTABS`); Blackjack en `state.ts` (`Mode.k`) y `controller.ts` (`RTABS`). En ambas rutas `day` es obligatorio únicamente para `diario`. Para Reto `tab` acepta `day|all`, `includeVisibility` es obligatorio (`true|false`) y `day` solo acompaña `day`. Emoji acepta `day|week` y exactamente la fecha correspondiente. Rechazar parámetros ajenos y construir consultas desde estos valores, nunca copiar la query entrante. El cliente conserva deduplicación, sumas, orden secundario efectivo, render, filtro `show_at` y fallback: para Reto pide primero `includeVisibility=true`, filtra filas cuya `show_at` esté en el futuro y, ante fallo, repite con `false`, como hoy. Así una caída de `show_at` conserva el fallback anterior. No mover ni alterar estas transformaciones en esta fase.

Escrituras de resultados, body validado contra campos explícitos y forwarded sin normalizar:

| Ruta                               | Upstream       | Body del navegador / headers relevantes                                                           | Resultado                                                                                |
| ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `POST /api/v1/scores/reto`         | `scores`       | `{name,score,daily,day,player_id}`; `Prefer: return=minimal`                                      | éxito vacío; otros status conservados                                                    |
| `POST /api/v1/scores/mas-o-menos`  | `hl_scores`    | `{player_id,name,mode,day?,streak}`; `Prefer: return=minimal`                                     | 409 se mantiene; cliente lo considera éxito; error trae body para extraer status y texto |
| `POST /api/v1/scores/blackjack`    | `bj10_scores`  | `{player_id,name,mode,day?,chips}` (usar la forma `ScoreRow` existente); `Prefer: return=minimal` | 409 se mantiene y cliente lo considera éxito; error body preservado                      |
| `POST /api/v1/scores/emoji-player` | `emoji_scores` | `{player_id,name,day,score}`; `Prefer: return=minimal,resolution=merge-duplicates`                | conservar status/body vacío; no cambiar upsert/dedupe                                    |

En los cuatro juegos el cliente combina `player_id`/`name` locales con el resultado. En Más o Menos, Blackjack y Emoji Player la UI depende del status y en errores del texto upstream (p. ej. tabla ausente); reenviar ese body es necesario para conservar mensajes actuales. Los POST de Reto usan return-minimal, actualizan `sbBest` solo tras éxito y no usan 409 especial.

## Identidad compartida

`POST /api/v1/identity/register` reenvía `register_name` y `POST /api/v1/identity/rename` reenvía `rename_player`. Ambos aceptan exactamente `{pid:string,n:string}` y conservan status (incluido 409) y body ignorado por el cliente. Registro se usa en los cuatro juegos; renombrado actualmente solo en Reto. No registrar otra vez automáticamente al montar React.

## Allowlist de RPC de Reto 15K

Argumentos son las claves compactas exactas que el SQL/PostgREST actual recibe. Tipos abajo reflejan el uso del frontend; no infieren reglas ni límites de base de datos. Campos opcionales únicamente donde el cliente realmente los omite.

| Nombre             | Argumentos aceptados                                                    | Uso/retorno que consume el cliente                                        |
| ------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `seed_daily`       | `{d:string,sc:number[],at:string[]}`                                    | Siembra diaria; JSON no consumido; fallo silencioso                       |
| `duel_cancel`      | `{d:string,pid:string}`                                                 | Cancelar/búsqueda abandonada; respuesta no consumida                      |
| `duel_progress`    | `{d:string,pid:string,n:number}`                                        | Actualización periódica; respuesta no consumida                           |
| `duel_queue`       | `{pid:string,n:string}`                                                 | Queue; string o null según `QueueResponse`; sondeo posterior cada 1500 ms |
| `duel_bot`         | `{d:string,pid:string}`                                                 | Pedir rival bot; cuerpo no consumido                                      |
| `duel_state`       | `{d:string,pid:string}`                                                 | Estado online (`OnlineState`) durante polling                             |
| `duel_bot_submit`  | `{d:string,pid:string,sc:number,sl:Array<[string,number]>}`             | Enviar resultado/slots bot; respuesta no consumida                        |
| `duel_submit`      | `{d:string,pid:string,sc:number,sl:Array<[string,number]>}`             | Enviar partida; devuelve `OnlineState` o null                             |
| `duel_rematch`     | `{d:string,pid:string}`                                                 | `RematchResponse` (id, joined, error opcional)                            |
| `duel_room_create` | `{pid:string,n:string}`                                                 | `RoomCreateResponse` (id, code)                                           |
| `duel_room_peek`   | `{c:string}`                                                            | `RoomPeekResponse` (ok, host opcional)                                    |
| `duel_room_join`   | `{c:string,pid:string,n:string}`                                        | `RoomJoinResponse` (id, host, error opcional)                             |
| `link_get`         | `{c:string,pid:string}`                                                 | `LinkData`; `pid` usa sentinel `NOBODY` si no hay identidad local         |
| `link_start`       | `{c:string,pid:string,n:string}`                                        | `LinkStartResponse` boolean consumido como éxito/fallo                    |
| `link_create`      | `{code:string,pid:string,n:string,sc:number,sl:Array<[string,number]>}` | Crear intento de reto; body no consumido                                  |
| `link_finish`      | `{c:string,pid:string,sc:number,sl:Array<[string,number]>}`             | Devuelve `LinkCompareData`                                                |
| `link_mine`        | `{pid:string}`                                                          | `DuelLinkMine`                                                            |
| `duel_top`         | `{}`                                                                    | Lista `DuelTopEntry[]`; invocado sin args en varias pantallas             |
| `duel_me`          | `{pid:string}`                                                          | `DuelMeResponse`                                                          |
| `season_info`      | `{pid:string}`                                                          | `SeasonInfoResponse`; pid también puede ser sentinel `NOBODY`             |
| `season_tick`      | `{}`                                                                    | Tick de temporada; cuerpo no consumido                                    |
| `bots_tick`        | `{}`                                                                    | Tick de bots; cuerpo no consumido y fallo ignorado                        |

Hay 22 operaciones RPC de Reto en esta tabla y dos operaciones de identidad separadas, 24 nombres upstream en total. No duplicar registro/renombrado como rutas de Reto. Los puntos/slots se validan como JSON con la forma mostrada, no contra reglas de juego. Los RPC vacíos se invocan con `{}`. Conservar polling/event timing del cliente (incluye `duel_state`, intervalos existentes y disparos de `bots_tick`); este backend no implementa workers ni agenda ticks.

## Implementación por etapas

1. Añadir el servidor Fastify y configuración de upstream del lado servidor, con validación de entorno al arranque y timeout común de 10 s. El despliegue debe servir `/api/v1/*` en el mismo origen que el sitio o aplicar CORS al origen exacto.
2. Implementar passthrough restringido para RPC y rankings/resultados con esquema fijo, preservación de status/body/headers necesarios y respuestas vacías. No añadir service-role, retries, caché, colas, lógica de ranking, scoring ni persistencia local del servidor.
3. Cambiar los cuatro controladores para usar el cliente tipado con base `/api/v1` o URL absoluta configurada, conservando los payloads, queries tipadas, secuencias de llamadas, polling, fallbacks, deduplicación y manejo de 409. Quitar configuración Supabase del bundle solo cuando no queden referencias.
4. Desplegar primero en un entorno compatible con el mismo proyecto/políticas Supabase y comparar manualmente respuestas y comportamiento de registro, ranking, guardado idempotente y duelos. No hacer escrituras exploratorias a producción.

## Criterios de aceptación

- Ningún navegador llama directamente a `*.supabase.co` ni contiene `SUPABASE_ANON_KEY`; servidor solo usa esa clave pública desde env y nunca service-role.
- Método, tabla/RPC, argumentos, filtros, orden, límites, payload y Prefer coinciden con esta matriz. No hay proxy de tabla/query/RPC arbitraria.
- 2xx vacío sigue vacío; los JSON mantienen su forma; los errores upstream conservan status y texto; 409 de Más o Menos y Blackjack sigue siendo éxito para el cliente; Emoji Player mantiene merge-duplicates.
- Reto conserva fallback con y sin `show_at`, filtro de visibilidad en frontend y deduplicación por nombre. Los otros rankings conservan cálculo/dedup frontend.
- `pid` sigue siendo compatibilidad de identidad legada y no se declara autenticación.
- No se actualiza esquema/políticas ni se afirma que el backend proteja contra suplantación. Si RLS/functions no permiten el nuevo flujo o requieren secretos privilegiados, detener y diseñar una fase separada con evidencia del propietario del backend.

## Esquemas y transporte sin decisiones pendientes para agentes

- `server/app.ts` recibe configuración y `fetchImpl`; `server/start.ts` es el único módulo que escucha. `GET /api/v1/health` devuelve `{status:"ok"}` sin visitar Supabase.
- Body máximo 64 KiB; entradas RPC con `additionalProperties:false`, tipos exactos y todos los campos de la tabla requeridos. `sl` es array de tuplas `[string,number]`; `sc` y `at` de seed son arrays de número y string. No exigir exactamente 17 slots ni añadir techo de puntos: conservar los envíos parciales/formatos existentes. JSON no representa NaN/Infinity; nunca convertir strings en puntuaciones.
- Desactivar mutación silenciosa de Ajv para cuerpos (`removeAdditional:false`, `useDefaults:false`, `coerceTypes:false`). Para query validar fechas con formato YYYY-MM-DD y enum/string cerrados; convertir el literal `true|false` explícitamente en ruta. La validación devuelve 400; body no JSON devuelve 415; tamaño excesivo 413. Probarlo y no reenviar al upstream.
- DTO de scores requiere los campos de su fila; `day` opcional solo MM/Blackjack porque sus récords libres no lo incluyen. `mode` usa la allowlist anterior. Identidad permite el sentinel `00000000-0000-0000-0000-000000000000` en las lecturas Reto que ya lo utilizan; no reemplazarlo ni forzar sesión. Los esquemas no recortan/modifican nombres, fechas o códigos. La UI conserva normalización/longitud de nombres actual.
- Construir URL upstream a partir de origen configurado validado y tabla/RPC literal; usar URLSearchParams para fechas y filtros. No recibir URL upstream, SQL, nombre de tabla, limit o select desde el navegador. No reenviar cookies, Authorization ni headers arbitrarios del navegador. Reutilizar exactamente los headers actuales (`apikey`, JSON Content-Type, Prefer cuando corresponda); no inventar Bearer distinto.
- Respuestas upstream se reenvían sin serializers que eliminen propiedades desconocidas. Copiar solo Content-Type y status/body necesarios, no cookies/headers administrativos. Errores propios 400/502/504 usan cuerpo genérico sin URL/clave/stack; el cliente sigue exponiendo HTTP status. Probar 204 sin body, 200 JSON/null, body vacío y errores con texto.
- `src/shared/api/http.ts` concentra fetch, ApiError (`status`, `body` opcional) y parseo vacío. Wrappers de identidad ignoran body, Reto RPC acepta null, scores MM/BJ tratan 409 como éxito en su adaptador, ranking mantiene errores existentes. Tipos compartidos en `contracts/api.ts` y `contracts/reto.ts`; no importar contratos desde el controlador frontend en servidor.
- `tests/server/` inyecta fetch falso y verifica para cada operación método/ruta/headers/body y ausencia de salida de red. Cubre parámetros extra, RPC desconocida, JSON incorrecto, 409 y errores/timeout; cliente cubre fallback show_at y parseo vacío. `tests/helpers/fake-api.ts` modela respuestas secuenciadas y duelos compartidos por dos clientes, nunca usa el upstream real.

## Cierre local

Los contratos y endpoints de este documento están implementados en `contracts/`, `server/app.ts` y `src/shared/api/`. El navegador y el bundle compilado no contienen el cliente ni la configuración Supabase. Pasan las integraciones de transporte/cliente, las 22 RPC y los smokes del servidor compilado en raíz y subruta. El [registro general](react-backend.md#cierre-de-implementación-2026-10-05) documenta el cierre; la validación y publicación contra un proyecto Supabase real no se han realizado.
