# syntax=docker/dockerfile:1
FROM oven/bun:1.4.2 AS base
WORKDIR /app
RUN chown bun:bun /app
USER bun

FROM base AS dependencies
COPY --chown=bun:bun package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS development
COPY --chown=bun:bun . .
USER bun
ENV NODE_ENV=development HOST=0.0.0.0 PORT=3001
EXPOSE 3001 5173
CMD ["bun", "scripts/dev.mjs", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

FROM dependencies AS build
COPY . .
ARG VITE_BASE_PATH=/
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_BASE_PATH=$VITE_BASE_PATH VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN bun run build && WEB_BASE_PATH="$VITE_BASE_PATH" bun run smoke:server

FROM base AS production-dependencies
COPY --chown=bun:bun package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS production
COPY --from=production-dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/dist-server ./dist-server
COPY --chown=bun:bun package.json ./
USER bun
ARG VITE_BASE_PATH=/
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 SERVE_WEB=true WEB_BASE_PATH=$VITE_BASE_PATH
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e 'const r = await fetch("http://127.0.0.1:3001/api/v1/health"); if (!r.ok) process.exit(1)'
CMD ["bun", "dist-server/server/start.js"]
