import { createFakeUpstream } from '../tests/helpers/fake-upstream.ts';
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';

const source = process.env.SOURCE ?? 'dev';
if (!['dev', 'prod'].includes(source))
  throw new Error('SOURCE must be dev or prod');
const port = Number(process.env.PORT ?? 0);
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw new Error('Invalid PORT');
const host = process.env.HOST ?? '127.0.0.1';
const { buildApp } = await import(
  source === 'prod' ? '../dist-server/server/app.js' : '../server/app.ts'
);
const { fetchImpl } = await createFakeUpstream();
const app = await buildApp({
  config: {
    supabaseUrl: 'https://offline.example.test',
    supabaseAnonKey: 'offline-placeholder',
    timeoutMs: 1000,
    webOrigins: [],
    serveWeb: source === 'prod',
    webBasePath: process.env.WEB_BASE_PATH ?? '/',
    logLevel: 'info',
  },
  fetchImpl,
});
let vite;
let webServer;
let closing;
const close = () =>
  (closing ??= (async () => {
    await vite?.close();
    await Promise.all([
      app.close(),
      webServer?.listening
        ? new Promise((resolve, reject) =>
            webServer.close((error) => (error ? reject(error) : resolve())),
          )
        : undefined,
    ]);
  })());
process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
try {
  await app.listen({ host, port: source === 'prod' ? port : 0 });
  const address = app.server.address();
  const apiOrigin = `http://127.0.0.1:${address.port}`;
  let origin = apiOrigin;
  if (source === 'dev') {
    process.env.VITE_API_BASE_URL = '/api/v1';
    const { createServer } = await import('vite');
    webServer = createHttpServer((request, response) =>
      vite.middlewares(request, response, () => {
        response.statusCode = 404;
        response.end();
      }),
    );
    vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: { server: webServer },
        proxy: { '/api': { target: apiOrigin } },
      },
    });
    webServer.listen({ host, port });
    await once(webServer, 'listening');
    origin = `http://127.0.0.1:${webServer.address().port}`;
  }
  console.log(
    JSON.stringify({
      event: 'offline.ready',
      source,
      origin,
      apiOrigin,
      pid: process.pid,
    }),
  );
} catch (error) {
  await close();
  throw error;
}
