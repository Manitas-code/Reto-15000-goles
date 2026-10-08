import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  writeFile,
  access,
  copyFile,
  lstat,
  readlink,
  open,
  unlink,
} from 'node:fs/promises';
import { resolve } from 'node:path';

export async function output(
  command,
  args = [],
  { includeStderr = false, raw = false, signal, timeoutMs = 30000 } = {},
) {
  signal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
  signal?.throwIfAborted();
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let killTimer;
  const abort = () => {
    child.kill('SIGTERM');
    killTimer = setTimeout(() => child.kill('SIGKILL'), 2000);
  };
  signal?.addEventListener('abort', abort, { once: true });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
  } finally {
    signal?.removeEventListener('abort', abort);
    clearTimeout(killTimer);
  }
  signal?.throwIfAborted();
  if (code !== 0) throw new Error(`${command} failed (${code}): ${stderr}`);
  const result = stdout + (includeStderr ? stderr : '');
  return raw ? result : result.trim();
}

export async function acquireWorkspaceLock() {
  const path = resolve('.artifacts/workspace.lock');
  await mkdir(resolve(path, '..'), { recursive: true });
  const token = randomUUID();
  try {
    const file = await open(path, 'wx');
    await file.writeFile(
      JSON.stringify({ pid: process.pid, cwd: process.cwd(), token }),
    );
    await file.close();
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = JSON.parse(await readFile(path, 'utf8'));
    try {
      process.kill(owner.pid, 0);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
      await unlink(path);
      return acquireWorkspaceLock();
    }
    if (owner.token === process.env.GOALDAY_LOCK_TOKEN)
      return { token: owner.token, release: async () => {} };
    throw new Error(
      `This checkout is being built or verified by PID ${owner.pid}. Use a separate worktree or wait for it to finish. Lock: ${path}`,
    );
  }
  return {
    token,
    release: async () => {
      const owner = JSON.parse(await readFile(path, 'utf8'));
      if (owner.token === token) await unlink(path);
    },
  };
}

export async function runContext(kind) {
  const dir = resolve(
    process.env.GOALDAY_RUN_DIR ??
      `.artifacts/${new Date().toISOString().replaceAll(':', '-')}-${kind}-${randomUUID().slice(0, 8)}`,
  );
  await mkdir(dir, { recursive: true });
  try {
    await access(resolve(dir, 'manifest.json'));
    throw new Error(`Evidence directory already contains a run: ${dir}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const head = await output('git', ['rev-parse', 'HEAD']);
  const status = await output('git', ['status', '--porcelain']);
  const diff = await output('git', ['diff', '--binary', 'HEAD'], { raw: true });
  await writeFile(resolve(dir, 'changes.patch'), diff);
  const untracked = (
    await output('git', ['ls-files', '--others', '--exclude-standard'])
  )
    .split('\n')
    .filter(Boolean);
  const tree = async () => {
    const paths = (
      await output('git', [
        'ls-files',
        '--cached',
        '--others',
        '--exclude-standard',
        '-z',
      ])
    )
      .split('\0')
      .filter(Boolean);
    const hashes = {};
    for (const path of paths) {
      try {
        const stat = await lstat(path);
        const data = stat.isSymbolicLink()
          ? await readlink(path)
          : stat.isFile()
            ? await readFile(path)
            : 'directory';
        hashes[path] = createHash('sha256').update(data).digest('hex');
      } catch (error) {
        if (error.code === 'ENOENT') hashes[path] = 'deleted';
        else throw error;
      }
    }
    return {
      hashes,
      digest: createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),
    };
  };
  const initialTree = await tree();
  const snapshotOmissions = [];
  for (const path of untracked) {
    const source =
      /^(src|server|contracts|tests|scripts|docs|plans)\/.+\.(ts|tsx|mjs|js|css|html|md|png|svg|webp|jpg|jpeg|avif|woff2?|mp3|wav|ogg)$/.test(
        path,
      ) ||
      /^tests\/fixtures\/.+\.json$/.test(path) ||
      /^\.github\/workflows\/.+\.ya?ml$/.test(path) ||
      /^\.agents\/skills\/.+\.(md|py|mjs|yaml)$/.test(path) ||
      /^(AGENTS\.md|README\.md|Makefile|Dockerfile|compose\.yaml|package\.json|bun\.lock|[^/]+\.config\.(ts|js)|tsconfig[^/]*\.json)$/.test(
        path,
      );
    if (!source) {
      snapshotOmissions.push(path);
      continue;
    }
    const stat = await lstat(path);
    if (!stat.isFile()) continue;
    const destination = resolve(dir, 'untracked', path);
    await mkdir(resolve(destination, '..'), { recursive: true });
    await copyFile(path, destination);
  }
  const manifest = {
    kind,
    head,
    status,
    untracked: Object.fromEntries(
      untracked.map((path) => [path, initialTree.hashes[path]]),
    ),
    treeDigest: initialTree.digest,
    snapshotOmissions,
    startedAt: new Date().toISOString(),
    bun: process.versions.bun,
    nodeCompatibility: process.versions.node,
    nodeForSvg: await output('node', ['--version']).catch(() => null),
  };
  await writeFile(
    resolve(dir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  return {
    dir,
    manifest,
    async finish(code, extra = {}) {
      const finalTree = await tree();
      const treeChanged = initialTree.digest !== finalTree.digest;
      const finalCode = code || (treeChanged ? 1 : 0);
      await writeFile(
        resolve(dir, 'manifest.json'),
        JSON.stringify(
          {
            ...manifest,
            ...extra,
            exitCode: finalCode,
            treeChanged,
            finalTreeDigest: finalTree.digest,
            finishedAt: new Date().toISOString(),
            finalStatus: await output('git', ['status', '--porcelain']),
          },
          null,
          2,
        ),
      );
      console.log(`Evidence: ${dir}`);
      if (treeChanged)
        console.error(
          'Source tree changed during verification; run the checks again on the final snapshot.',
        );
      return finalCode;
    },
  };
}
