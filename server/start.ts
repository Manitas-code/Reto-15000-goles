import { buildApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65_535)
  throw new Error('PORT must be between 1 and 65535');

const app = await buildApp({ config });
await app.listen({ port, host });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void app.close().finally(() => process.exit(0)));
}
