import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['--bun', 'run', 'dev:server'], {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  }),
  spawn(
    process.execPath,
    ['--bun', 'run', 'dev:web', ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      detached: process.platform !== 'win32',
    },
  ),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
