import { spawn } from 'node:child_process';
import { acquireWorkspaceLock } from './run-context.mjs';

const mode = process.argv[2] ?? 'all';
if (!['all', 'web', 'server'].includes(mode))
  throw new Error('Build mode must be all, web or server');
const lock = await acquireWorkspaceLock();
const commands =
  mode === 'all'
    ? [
        ['tsc', '--noEmit'],
        ['tsc', '--noEmit', '-p', 'tsconfig.server.json'],
        ['vite', 'build'],
        ['tsc', '-p', 'tsconfig.server.json'],
      ]
    : mode === 'web'
      ? [['vite', 'build']]
      : [['tsc', '-p', 'tsconfig.server.json']];
let child;
let interrupted = false;
const stop = () => {
  interrupted = true;
  child?.kill('SIGTERM');
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
let code = 0;
try {
  for (const args of commands) {
    if (interrupted) {
      code = 1;
      break;
    }
    child = spawn(process.execPath, ['--bun', 'run', ...args], {
      stdio: 'inherit',
      env: { ...process.env, GOALDAY_LOCK_TOKEN: lock.token },
    });
    code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code) => resolve(code ?? 1));
    });
    if (code) break;
  }
} finally {
  await lock.release();
}
process.exitCode = code;
