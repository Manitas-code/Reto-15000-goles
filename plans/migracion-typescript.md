# Plan de migración a TypeScript

## Estado y alcance

Fecha de la propuesta: 2026-10-05.

Este documento conserva el plan presentado al usuario para reestructurar GOALDAY. La petición inicial autorizó guardar el plan en `plans/`. Después el usuario pidió renombrar la rama y comenzar a implementarlo con subagentes gpt-6-luna, priorizando el trabajo en paralelo. Esa petición autoriza la implementación; la publicación y los cambios de producto siguen fuera de este alcance.

| Acción                                                                    | Estado                              |
| ------------------------------------------------------------------------- | ----------------------------------- |
| Documentar el plan                                                        | Autorizado                          |
| Ejecutar las fases 0–5 y añadir las herramientas propuestas               | Autorizado; implementación iniciada |
| Publicar la versión migrada                                               | Pendiente de aprobación posterior   |
| Cambiar comportamiento, reglas o corregir errores que afecten al producto | Requiere decisión explícita aparte  |

La primera entrega de implementación se integra en la rama `refactor/typescript-foundation`. La documentación del proyecto actual está en [README.md](../README.md), [AGENTS.md](../AGENTS.md), [arquitectura.md](../docs/arquitectura.md) y [juegos.md](../docs/juegos.md).

Al retomar el trabajo, consultar este documento y las aprobaciones posteriores de la conversación. Actualizar el estado con evidencias de los cambios y verificaciones realizados; no marcar fases como completadas por haber creado su estructura de archivos.

## Objetivo

Migrar gradualmente a TypeScript con Vite, manteniendo las páginas actuales y el DOM existente. Separar archivos y responsabilidades, establecer comprobaciones reproducibles y conservar el producto tal como funciona hoy.

Cada fase debe dejar una aplicación utilizable y demostrar que mantiene el comportamiento anterior. La compatibilidad visual y funcional es el criterio principal.

El mayor riesgo está en el orden de ejecución, las semillas de los retos, el almacenamiento y los contratos de Supabase. Cambiarlos puede alterar el producto aunque las pantallas parezcan iguales.

## Punto de partida

- Web estática con cuatro juegos, portada y dos herramientas auxiliares.
- HTML, CSS y JavaScript concentrados en cada página de juego.
- Scripts compartidos cargados mediante `<script>` y APIs en `window`.
- Sin framework, gestor de paquetes, build, tests ni CI en el repositorio actual.
- Dos copias de la base de 200 futbolistas: `players.js` y `RAW` dentro de `reto-15000.html`, con esquemas distintos.
- Rankings, identidad y duelos conectados directamente a Supabase mediante `fetch`.
- Backend sin SQL, políticas ni configuración reproducible incluidos en el repositorio.
- Progreso e identidad local en `localStorage`.
- Traducción dinámica en `lang.js`, con observación del DOM e interceptores de APIs del navegador.
- Fondos de estadios generados localmente y restaurados mediante un script temprano.
- Editor legado que depende de `goles.js`, ausente. Esa limitación también forma parte del estado que hay que conservar.

## Herramientas elegidas

| Herramienta                  | Responsabilidad                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| TypeScript                   | Tipar datos, estado, reglas, elementos del DOM y contratos remotos.                       |
| Vite                         | Servidor de desarrollo y compilación de las páginas actuales a una web estática.          |
| npm y Node 24                | Entorno reproducible, versión de Node declarada y dependencias fijadas mediante lockfile. |
| Vitest                       | Pruebas de reglas, puntuaciones, semillas y compatibilidad de datos.                      |
| Playwright                   | Pruebas de flujos completos y comparación visual.                                         |
| ESLint con typescript-eslint | Detección de errores y criterios comunes para el código migrado.                          |
| Prettier                     | Formato consistente, sin mezclar reformateos masivos con cambios de lógica.               |

Vite admite múltiples entradas HTML. La comprobación de tipos se ejecutará de forma independiente mediante `tsc --noEmit`, porque la compilación de Vite no la sustituye.

Se mantendrán el DOM nativo y el CSS actual. Introducir React o Vue exigiría reconstruir las vistas y ampliaría el riesgo sin una ventaja necesaria para esta migración.

Las versiones concretas de las dependencias se elegirán y fijarán al ejecutar la fase 1, comprobando su compatibilidad con Node 24. La instalación forma parte de la implementación autorizada; las versiones resueltas están en `package-lock.json`.

## Estructura propuesta

```text
/
├── index.html
├── reto-15000.html
├── mas-o-menos.html
├── blackjack-goles.html
├── emoji-player.html
├── caras.html
├── editor-goles.html
├── public/
│   ├── apple-touch-icon.png
│   └── og-image.png
├── src/
│   ├── pages/
│   │   └── home/
│   ├── games/
│   │   ├── reto-15000/
│   │   ├── mas-o-menos/
│   │   ├── blackjack/
│   │   └── emoji-player/
│   ├── shared/
│   │   ├── identity/
│   │   ├── storage/
│   │   ├── supabase/
│   │   ├── i18n/
│   │   ├── stadiums/
│   │   └── browser/
│   ├── data/
│   │   ├── players.ts
│   │   ├── extra-players.ts
│   │   └── emoji-players.ts
│   └── tools/
│       ├── faces/
│       └── goal-editor/
├── tests/
│   ├── unit/
│   ├── e2e/
│   └── fixtures/
├── docs/
├── plans/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── configuraciones de pruebas y calidad
```

Los HTML permanecerán en la raíz como entradas públicas para conservar sus direcciones. Contendrán estructura, metadatos y referencias a estilos y módulos. Los recursos de `public/` deberán mantener sus URL públicas actuales en el resultado compilado.

Dentro de cada juego se separarán las responsabilidades que existan:

| Módulo           | Responsabilidad                               |
| ---------------- | --------------------------------------------- |
| `main.ts`        | Inicialización y conexión entre módulos.      |
| `engine.ts`      | Reglas, decisiones y cálculo del resultado.   |
| `state.ts`       | Tipos y estado de la partida.                 |
| `view.ts`        | Representación del DOM y eventos de interfaz. |
| `persistence.ts` | Lectura y escritura del progreso.             |
| `ranking.ts`     | Integración del ranking.                      |
| `styles.css`     | Estilos actuales.                             |

El Reto 15K tendrá además módulos para duelos, salas, retos por enlace, bots, temporadas y generación de imágenes. No se crearán archivos vacíos para imponer esta estructura a juegos que no los necesiten.

Las reglas no accederán al DOM, `localStorage` ni la red. La inicialización conectará las reglas con esos servicios. Se compartirán los servicios que realmente coincidan, manteniendo las particularidades de cada juego y sus contratos.

## Compatibilidad obligatoria

La migración conservará:

- Aspecto, textos, fuentes, animaciones, sonidos, tiempos e interacción.
- Rutas `.html`, metadatos y enlaces con `reto`, `online` y `sala`.
- Reglas, multiplicadores, puntuaciones, pagos y comportamiento de los empates.
- Orden de los catálogos, algoritmos de azar, semillas y fecha de `Europe/Madrid`.
- Claves y formatos de `localStorage`, incluidos campos desconocidos que ya existan.
- Identidad compartida, progreso, récords e intentos diarios.
- Tablas, RPC, payloads y tratamiento de errores de Supabase.
- Herramientas auxiliares y sus limitaciones actuales.

Los errores existentes que impliquen cambiar resultados o interacción se registrarán aparte. Corregirlos requiere una decisión explícita, porque supondría un cambio de producto.

## Fases de ejecución

Las fases 0–5 están autorizadas y su avance se registra más abajo. El orden de integración se mantiene, aunque las tareas independientes de extracción y verificación se han repartido en paralelo. La publicación queda fuera de esta aprobación.

### Fase 0. Referencia del producto actual

Fijar el estado inicial del código y guardar escenarios, capturas, resultados deterministas y ejemplos de almacenamiento. Los resultados esperados deben proceder de la versión original, antes de sustituir sus implementaciones.

Criterio de cierre: disponer de referencias independientes que permitan comparar comportamiento, apariencia y datos persistidos durante las siguientes fases.

### Fase 1. Base del proyecto

Añadir Vite, TypeScript, scripts de desarrollo y verificación, configuración de herramientas y pruebas. Declarar el entorno y fijar dependencias. Configurar todas las entradas HTML, incluidas las herramientas auxiliares.

Criterio de cierre: la versión compilada conserva las rutas y carga los juegos actuales. La ausencia de `goles.js` se trata como limitación conocida del editor, sin inventar datos ni reactivar un producto retirado.

### Fase 2. Extracción mecánica

Sacar CSS, JavaScript y datos de los HTML conservando su orden y comportamiento. Separar la extracción de cualquier rediseño de métodos para que los cambios sean revisables.

Criterio de cierre: las pruebas visuales y funcionales siguen coincidiendo con la referencia original.

### Fase 3. Servicios compartidos

Tipar y extraer almacenamiento, identidad, transporte HTTP, idiomas y estadios. Centralizar la configuración pública de Supabase, manteniendo `fetch` y el contrato existente.

Criterio de cierre: cada consumidor conserva sus formatos y efectos observables, incluidos el tratamiento de errores y la preservación de datos locales.

### Fase 4. Juegos en TypeScript

Migrar en este orden:

1. Portada.
2. Emoji Player.
3. Más o Menos.
4. Blackjack.
5. Reto 15K, incluidos sus modos online.

Separar reglas y vista en cada paso. Migrar también los controladores de las herramientas auxiliares durante el trabajo correspondiente, preservando su comportamiento actual.

Criterio de cierre: cada juego supera sus pruebas antes de continuar con el siguiente. La fase termina con las páginas y herramientas migradas, sin funcionalidad perdida.

### Fase 5. Consolidación

Resolver duplicación comprobada, retirar adaptadores temporales, completar CI de verificación y actualizar README, AGENTS y documentación.

Criterio de cierre: código de aplicación en TypeScript estricto, sin dependencias heredadas innecesarias, con comprobaciones reproducibles y documentación de la estructura final.

### Fase 6. Preparación de publicación

Verificar el artefacto estático bajo la ruta de alojamiento real y documentar despliegue y reversión. Servir `dist/` manteniendo el mismo origen para que los usuarios conserven su almacenamiento.

Criterio de cierre: versión lista para publicar, con la publicación pendiente de aprobación. La equivalencia de los modos online necesita además una comprobación controlada con un entorno autorizado.

## Precauciones de implementación

### TypeScript durante la transición

Usar `allowJs` como puente temporal para convivir con JavaScript. Mantener `strict` para los módulos TypeScript y ejecutar `tsc --noEmit`. Evitar convertir la migración en una colección de `any` o `@ts-ignore`. Retirar el puente cuando termine la conversión.

### Orden de ejecución

Los módulos cambian el momento de ejecución. Hacer explícita la inicialización y preservar el pequeño script temprano que restaura el fondo para evitar parpadeos. Revisar la relación con `DOMContentLoaded`, la carga de catálogos y los listeners actuales.

### Bases de jugadores

Comparar las dos bases campo por campo antes de unificarlas. Conservar cualquier diferencia hasta decidir cómo tratarla. La estructura propuesta muestra una base compartida final, pero no autoriza escoger silenciosamente una copia cuando difieran.

No cambiar el orden de jugadores, semillas ni algoritmos al normalizar los datos. Conservar el significado de `null` en las estadísticas de los jugadores adicionales.

### Traducción

Mantener inicialmente el mecanismo actual de traducción, incluidos sus interceptores y el observador del DOM. Sustituirlo sería una intervención adicional que conviene abordar después de demostrar equivalencia.

### Persistencia

Probar con almacenamiento anterior a la migración. Preservar las claves y los campos existentes, especialmente el objeto `reto15k-v2`, que contiene tanto progreso del Reto 15K como identidad compartida.

### Servicios remotos

Centralizar la configuración pública sin modificar el servicio utilizado ni añadir claves privadas. El repositorio no permite confirmar el esquema o la validación del backend. Los tipos de contratos inferidos del frontend no deben presentarse como definiciones confirmadas del servidor.

## Estrategia de verificación

Las pruebas tendrán resultados esperados obtenidos de la versión original:

- Partidas con semillas y decisiones fijas, comprobando cartas, puntos y resultados.
- Casos de reglas: descartes, timeout, doble apuesta, objetivo exacto y empates.
- Carga de almacenamiento antiguo, actualización y recarga sin pérdida de campos.
- Diario consumido al empezar en Reto 15K, Más o Menos y Blackjack, y reanudación de Emoji Player.
- Rankings, duelos y salas con respuestas remotas simuladas.
- Capturas de pantallas principales en móvil y escritorio, en español e inglés.

Para las capturas se fijarán fecha, estado, fuentes y respuestas de red. Se revisarán las diferencias; no se actualizarán referencias automáticamente para hacer pasar una prueba.

Las pruebas automatizadas no escribirán en el Supabase actual. Su backend no está incluido en el repositorio, por lo que la equivalencia real de los modos online requerirá una comprobación controlada con un entorno autorizado. Las simulaciones verifican el cliente y sus contratos esperados, no el funcionamiento real del servidor.

## Resultado esperado

- Desarrollo local y build reproducible.
- Comprobación de tipos, lint y pruebas con comandos documentados.
- CI de verificación.
- Responsabilidades separadas y código de aplicación en TypeScript estricto.
- Configuración pública de Supabase centralizada y contratos conservados.
- Artefacto estático en `dist/` con las rutas existentes.
- Compatibilidad con el progreso y la identidad local de los usuarios actuales.
- README, AGENTS y documentación actualizados.
- Procedimiento de despliegue y reversión antes de publicar.

## Estado de implementación

La referencia del código original es el commit `88552644372229ccd8e8157c3ac99c88965b5675`. Antes de editar se copiaron los HTML, JavaScript y recursos originales para obtener referencias independientes. Los contratos persistentes se guardan en `tests/fixtures/product-baseline.json`.

| Fase | Estado de la primera entrega                                                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Referencias independientes de DOM/CSS, datos, reglas y SVG capturadas desde el commit original. 24 capturas de escritorio/móvil, ES/EN, procedentes del producto original.                                          |
| 1    | Vite con siete entradas, Node 24, npm/lockfile, TypeScript estricto, ESLint, Prettier, Vitest, Playwright y CI de verificación.                                                                                     |
| 2    | CSS y controladores extraídos de las siete páginas. DOM, rutas y recursos públicos conservados.                                                                                                                     |
| 3    | Datos, almacenamiento, identidad, fotos, transporte RPC, idiomas y estadios convertidos a módulos TypeScript. SVG separado del selector y su caché.                                                                 |
| 4    | Los cuatro juegos y las dos herramientas tienen controladores TypeScript. Reglas puras en `engine.ts`, tipos DOM por página y contratos RPC del Reto en módulos separados. Tipos, lint y pruebas locales superados. |
| 5    | Duplicados y puentes JS retirados. `allowJs: false`; tipos estrictos también para los tests. Documentación actualizada y CI configurada. Comprobaciones finales locales superadas, registradas abajo.               |
| 6    | Sin publicación. La comprobación con backend real y la autorización de despliegue siguen pendientes.                                                                                                                |

Trabajo integrado:

- Entradas `main.ts` con inicialización explícita y orden original de los servicios comunes.
- Fuente común de jugadores, equivalente a las dos bases originales y conservando sus formatos históricos.
- Reto: casillas, puntos, multiplicadores, fecha y algoritmos deterministas en `engine.ts`; contratos observados del cliente en `rpc-types.ts`.
- Emoji: normalización/búsqueda y calendario diario en `engine.ts`.
- Más o Menos: dificultad, diferencia relativa y comparación en `engine.ts`.
- Blackjack: pagos en `engine.ts`, tipos de mano, modo y persistencia en `state.ts`.
- Identidad y transporte RPC reutilizados por los juegos; fotos migradas a TypeScript.
- Traducciones con diccionario separado y memoria de textos originales en `WeakMap`.
- Estadios con catálogo tipado, selector/controlador y renderizador SVG separados. Comparación exacta del SVG de todos los equipos en dos encuadres contra el original.
- Tests de DOM, CSS, catálogos, reglas, almacenamiento, errores RPC y fotos; tests de navegación, inicio y fin de partida, y capturas visuales.

### Verificación y límites

Verificación final local del 2026-10-05:

| Comprobación                                      | Resultado                                                                                                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                   | Pasa: tipos estrictos, lint, 28 tests unitarios en seis archivos y build.                                                                                                                                               |
| `npm run format:check`                            | Pasa para todo el código, configuraciones, tests y scripts incluidos.                                                                                                                                                   |
| `npm run e2e`                                     | Nueve tests pasan; incluyen las 24 capturas originales sin actualizar, inicio de los cuatro juegos, partida libre completa de Reto, preservación de identidad/campos adicionales y reversión ES/EN de textos dinámicos. |
| Build con base `/`                                | Pasa; genera las siete entradas HTML.                                                                                                                                                                                   |
| `VITE_BASE_PATH=/Reto-15000-goles/ npm run build` | Pasa; siete entradas y recursos enlazados comprobados bajo esa base. Las imágenes públicas conservan los bytes originales.                                                                                              |
| Geometría de estadios                             | SVG exactos de todos los equipos en dos encuadres contra el original.                                                                                                                                                   |

La CI está configurada; esta entrega verifica su batería local, sin afirmar que se haya ejecutado en GitHub. En el cierre de esa entrega no se había publicado, creado una PR ni hecho un commit. Posteriormente el usuario pidió guardar todos los cambios: commits `027769f` y `3bbe3c6`. Sigue sin publicación ni PR.

Los tests de navegador aíslan servicios externos. Las 24 capturas usan fuentes locales de sustitución y `fg_team=none`; cubren esas condiciones concretas. La geometría se valida por separado contra SVG originales. Ninguna prueba automatizada escribe en Supabase. Los contratos RPC se han tipado por el consumo del frontend: no sustituyen un esquema confirmado del servidor ni una prueba de dos clientes contra el backend real.

`goles.js` y la página histórica `gol-del-dia.html` siguen ausentes. El editor conserva el aviso y su contrato de globals. Vite puede avisar que el script clásico opcional `goles.js` no se empaqueta; si se restaurase, se serviría desde `public/goles.js`.

### Próximos incrementos de estructura

La conversión estricta permite trabajar sobre módulos comprobados. Los controladores todavía reúnen muchos flujos de UI: en especial, Reto mantiene bot, duelos, rankings, temporadas y compartir en su controlador. Extraer cada uno a módulos más pequeños es el siguiente incremento, conservando inicialización y ciclo de vida. No introducir una arquitectura nueva de estado o un framework para conseguirlo.

Prioridad: aislar los contratos y llamadas de duelos; después separar coordinación de online/salas/enlaces, rankings/temporadas y render de compartir. En Blackjack, separar reparto/objetivos y temporizador de la vista. Añadir pruebas de cada extracción contra el comportamiento existente antes de retirar la implementación anterior.

Para publicar, servir `dist/` bajo el origen y ruta originales. Mantener el origen conserva `localStorage`; cambiarlo exige una decisión de producto. Verificar un duelo entre dos clientes en un entorno autorizado, comprobar rankings y preparar reversión al artefacto anterior. Publicar requiere aprobación posterior.

## Aprobaciones pendientes

La implementación descrita está autorizada. La publicación y cualquier cambio de comportamiento requieren aprobación posterior, conforme a la petición del usuario. No pedir otra vez autorización para tareas ya incluidas en la migración.

## Referencias técnicas de la propuesta

- [Vite: funcionalidades y TypeScript](https://vite.dev/guide/features.html).
- [Vite: compilación y múltiples entradas HTML](https://vite.dev/guide/build).
- [TypeScript: convivencia con JavaScript mediante allowJs](https://www.typescriptlang.org/tsconfig/allowJs.html).
- [Vitest: configuración inicial](https://vitest.dev/guide/).
- [Playwright: comparación visual](https://playwright.dev/docs/test-snapshots).
- [Playwright: interceptar y simular solicitudes de red](https://playwright.dev/docs/network).
- [typescript-eslint: configuración inicial](https://typescript-eslint.io/getting-started/).

## Propuesta posterior

El usuario ha solicitado un diseño de React y un backend propio pequeño. Consultar [el plan React y backend](react-backend.md) y sus anexos. Es una propuesta pendiente de revisión: no autoriza implementar ni sustituye las verificaciones históricas anteriores.
