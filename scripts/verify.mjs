import { spawn } from 'node:child_process';
import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runContext, acquireWorkspaceLock, output } from './run-context.mjs';

const run = await runContext('verify');
let lock;
const dockerImage = `goalday:verification-${randomUUID().slice(0, 12)}`;
const phases = [
  ['check', process.execPath, ['run', 'check']],
  ['format', process.execPath, ['run', 'format:check']],
  ['smoke', process.execPath, ['run', 'smoke:server']],
  ['dev', process.execPath, ['scripts/e2e.mjs'], { SOURCE: 'dev' }],
  ['prod', process.execPath, ['scripts/e2e.mjs'], { SOURCE: 'prod' }],
  [
    'docker-build',
    process.env.DOCKER_BIN ?? 'docker',
    ['build', '--target', 'production', '--tag', dockerImage, '.'],
  ],
  [
    'docker',
    process.execPath,
    ['scripts/e2e.mjs'],
    { SOURCE: 'docker', GOALDAY_DOCKER_IMAGE: dockerImage },
  ],
];
let active;
let code = 0;
const results = [];
let interrupted = false;
let imageAttempted = false;
const interrupt = () => {
  interrupted = true;
  active?.kill('SIGTERM');
};
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
try {
  lock = await acquireWorkspaceLock();
  for (const [phase, command, args, env = {}] of phases) {
    if (interrupted) {
      code = 1;
      break;
    }
    const dir = resolve(run.dir, phase);
    await mkdir(dir, { recursive: true });
    console.log(`\nVerification: ${phase}`);
    if (phase === 'docker-build') imageAttempted = true;
    active = spawn(command, args, {
      env: {
        ...process.env,
        ...env,
        GOALDAY_RUN_DIR: dir,
        GOALDAY_LOCK_TOKEN: lock.token,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let writes = Promise.resolve();
    const log = (stream) => (chunk) => {
      stream.write(chunk);
      writes = writes.then(() =>
        appendFile(resolve(dir, 'command.log'), chunk),
      );
    };
    active.stdout.on('data', log(process.stdout));
    active.stderr.on('data', log(process.stderr));
    const result = await new Promise((resolve, reject) => {
      active.on('error', reject);
      active.on('close', (code) => resolve(code ?? 1));
    });
    await writes;
    results.push({ phase, command, args, exitCode: result });
    await writeFile(
      resolve(run.dir, 'phases.json'),
      JSON.stringify(results, null, 2),
    );
    if (result !== 0) {
      code = result;
      break;
    }
  }
} catch (error) {
  code = 1;
  throw error;
} finally {
  if (imageAttempted) {
    const docker = process.env.DOCKER_BIN ?? 'docker';
    if (
      await output(docker, ['image', 'inspect', dockerImage]).then(
        () => true,
        () => false,
      )
    ) {
      try {
        await output(docker, ['image', 'rm', dockerImage]);
      } catch (error) {
        code = 1;
        console.error('Owned image cleanup failed:', error.message);
      }
    }
  }
  await lock?.release();
  code = await run.finish(code, { phases: results, dockerImage });
}
process.exitCode = code;
