# Escudos de clubes

El selector de estadio carga escudos PNG alojados localmente en `public/team-crests/`, con el ID existente del equipo como nombre de archivo. El catálogo de clubes y su orden siguen en `src/shared/stadiums/teams.ts`. Las rutas usan `import.meta.env.BASE_URL` para funcionar también bajo un prefijo de publicación.

Los archivos se obtuvieron el 7 de octubre de 2026 de los endpoints públicos de equipos y logos de ESPN. [team-crests-sources.json](team-crests-sources.json) registra el nombre e ID de ESPN, el URL maestro, el URL de descarga redimensionada, el SHA-256 y el tamaño de cada recurso. Se descargaron variantes PNG de 128 × 128 desde el combiner de ESPN; la correspondencia con los IDs del proyecto es explícita en ese inventario.

Para actualizar los recursos, consulta de nuevo la API de equipos de cada liga (`esp.1`, `eng.1`, `ita.1`, `ger.1`, `fra.1`, `arg.1`, `mex.1`, `usa.1`), revisa cada nombre y la correspondencia con el catálogo existente, y descarga el logo de ESPN a 128 × 128. Actualiza el inventario y sus hashes junto con los archivos. La fuente se documenta como procedencia; este proyecto no hace afirmaciones sobre licencias.
