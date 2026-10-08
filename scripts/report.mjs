import Fastify from 'fastify';
import staticFiles from '@fastify/static';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

if (!process.env.RUN_DIR)
  throw new Error(
    'Set RUN_DIR to an E2E phase directory containing report/index.html',
  );
const report = resolve(process.env.RUN_DIR, 'report');
await access(resolve(report, 'index.html'));
const port = Number(process.env.PORT ?? 0);
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw new Error('Invalid PORT');
const app = Fastify();
await app.register(staticFiles, { root: report });
await app.listen({ host: '127.0.0.1', port });
console.log(`Report: http://127.0.0.1:${app.server.address().port}`);
for (const [signal, code] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
])
  process.once(
    signal,
    () =>
      void app.close().finally(() => {
        process.exitCode = code;
      }),
  );
