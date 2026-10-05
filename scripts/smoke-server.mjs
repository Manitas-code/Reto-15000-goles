import assert from 'node:assert/strict';
import { buildApp } from '../dist-server/server/app.js';

const basePath = process.env.WEB_BASE_PATH || '/';
const requests = [];
const app = await buildApp({
  config: {
    supabaseUrl: 'https://upstream.example.test',
    supabaseAnonKey: 'server-only-smoke-key',
    timeoutMs: 1000,
    webOrigins: ['https://mobile.example.test'],
    serveWeb: true,
    webBasePath: basePath,
  },
  fetchImpl: async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response('[]', {
      headers: { 'content-type': 'application/json' },
    });
  },
});

try {
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  assert(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const health = await fetch(origin + '/api/v1/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  assert.equal(requests.length, 0);
  for (const page of [
    'index.html',
    'reto-15000.html',
    'mas-o-menos.html',
    'blackjack-goles.html',
    'emoji-player.html',
    'caras.html',
    'editor-goles.html',
  ]) {
    const response = await fetch(origin + basePath + page);
    assert.equal(response.status, 200, page);
    assert(!response.headers.get('cache-control')?.includes('immutable'));
    const html = await response.text();
    assert(!html.includes('server-only-smoke-key'));
    const assets = [
      ...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^\"]+)"/g),
    ];
    assert(assets.length > 0, `${page}: compiled assets`);
    for (const [, asset] of assets) {
      assert(asset.startsWith(basePath), `${page}: ${asset} base path`);
      const resource = await fetch(origin + asset);
      assert.equal(resource.status, 200, asset);
      assert(
        resource.headers.get('cache-control')?.includes('immutable'),
        asset,
      );
    }
  }
  assert.equal((await fetch(origin + basePath)).status, 200);
  assert.equal(
    (await fetch(origin + basePath + 'missing-page.html')).status,
    404,
  );
  const ranking = await fetch(
    origin + '/api/v1/rankings/reto?tab=all&includeVisibility=true',
    {
      headers: { Origin: 'https://mobile.example.test' },
    },
  );
  assert.equal(ranking.status, 200);
  assert.equal(
    ranking.headers.get('access-control-allow-origin'),
    'https://mobile.example.test',
  );
  assert(!ranking.headers.get('cache-control')?.includes('immutable'));
  assert.equal(requests.length, 1);
  assert(
    requests[0].url.startsWith('https://upstream.example.test/rest/v1/scores?'),
  );
  assert.equal(
    new Headers(requests[0].options.headers).get('apikey'),
    'server-only-smoke-key',
  );
  console.log(
    `Compiled server smoke passed at ${basePath}, using a local fake upstream.`,
  );
} finally {
  await app.close();
}
