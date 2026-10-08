import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { output } from './run-context.mjs';

export async function startDockerOffline({ dir, signal }) {
  signal?.throwIfAborted();
  const docker = process.env.DOCKER_BIN ?? 'docker';
  const name = `goalday-e2e-${randomUUID().slice(0, 12)}`;
  const image =
    process.env.GOALDAY_DOCKER_IMAGE ??
    `goalday:verification-${randomUUID().slice(0, 12)}`;
  const ownedImage = !process.env.GOALDAY_DOCKER_IMAGE;
  const mounts = [
    'scripts/offline.mjs',
    'tests/helpers/fake-api.ts',
    'tests/helpers/fake-upstream.ts',
  ];
  let stopping;
  const stop = () =>
    (stopping ??= (async () => {
      try {
        const exists = await output(docker, ['inspect', name]).then(
          () => true,
          () => false,
        );
        if (!exists) return;
        await output(docker, ['stop', '--timeout', '10', name]);
        await writeFile(
          resolve(dir, 'server.log'),
          await output(docker, ['logs', '--timestamps', name], {
            includeStderr: true,
          }),
        );
      } finally {
        try {
          const exists = await output(docker, ['inspect', name]).then(
            () => true,
            () => false,
          );
          if (exists) await output(docker, ['rm', '--force', name]);
        } finally {
          if (
            ownedImage &&
            (await output(docker, ['image', 'inspect', image]).then(
              () => true,
              () => false,
            ))
          )
            await output(docker, ['image', 'rm', image]);
        }
      }
    })());
  try {
    if (ownedImage) {
      try {
        const buildLog = await output(
          docker,
          ['build', '--target', 'production', '--tag', image, '.'],
          { includeStderr: true, signal, timeoutMs: 600000 },
        );
        await writeFile(resolve(dir, 'docker-build.log'), buildLog);
      } catch (error) {
        await writeFile(resolve(dir, 'docker-build.log'), error.message);
        throw error;
      }
    }
    signal?.throwIfAborted();
    await output(
      docker,
      [
        'run',
        '--detach',
        '--init',
        '--name',
        name,
        '--publish',
        '127.0.0.1::3001',
        '--env',
        'SOURCE=prod',
        '--env',
        'PORT=3001',
        '--env',
        'HOST=0.0.0.0',
        ...mounts.flatMap((path) => [
          '--volume',
          `${resolve(path)}:/app/${path}:ro`,
        ]),
        image,
        'bun',
        'scripts/offline.mjs',
      ],
      { signal },
    );
    signal?.throwIfAborted();
    const mapped = await output(docker, ['port', name, '3001/tcp'], { signal });
    const origin = `http://${mapped}`;
    const deadline = Date.now() + 30000;
    while (true) {
      signal?.throwIfAborted();
      try {
        if (
          (
            await fetch(origin + '/api/v1/health', {
              signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(1000)])
                : AbortSignal.timeout(1000),
            })
          ).ok
        )
          return {
            origin,
            stop,
            imageId: await output(docker, [
              'inspect',
              '--format',
              '{{.Image}}',
              name,
            ]),
          };
      } catch {
        /* Container startup is asynchronous. */
      }
      if (Date.now() > deadline)
        throw new Error('Docker offline server startup timed out');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } catch (error) {
    await stop().catch((cleanupError) =>
      console.error('Docker cleanup failed:', cleanupError.message),
    );
    throw error;
  }
}
