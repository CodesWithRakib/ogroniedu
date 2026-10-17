/**
 * @ogroniedu/api dev runner (Phase 24 Pre-Gate PG-1).
 *
 * Why not a register-based runner: this repo builds with TypeScript 7
 * (native) — ts-node and @swc-node/register depend on the TypeScript JS
 * compiler API and crash under it. tsx/esbuild runs, but cannot emit
 * `design:paramtypes` decorator metadata, which silently no-ops the global
 * ValidationPipe in dev (F-3: malformed input reached services/SQL and
 * answered 500 where a built server answers 400). Running the tsc-built
 * output keeps the dev runtime identical to prod and guarantees metadata
 * reaches Nest's DI and pipes.
 *
 * Lifecycle: `tsc -p tsconfig.build.json --watch` (incremental rebuild) +
 * `node --watch --watch-path=dist dist/main.js` (restart when the compiled
 * output changes; watching the whole module graph let node_modules churn
 * from other tooling restart the API mid-request). Ctrl+C stops both.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(appDir, '..', '..');
const ENTRY = path.join(appDir, 'dist', 'main.js');

function resolveTypescriptBin() {
  const candidates = [
    path.join(workspaceRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
    path.join(appDir, 'node_modules', 'typescript', 'bin', 'tsc'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    console.error('[dev] typescript is not installed — run `pnpm install` first.');
    process.exit(1);
  }
  return found;
}

const tscBin = resolveTypescriptBin();
const children = [];
let shuttingDown = false;

function stop({ child }) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32' && child.pid !== undefined) {
    // Kill the whole tree: `node --watch` parents a child that owns the port.
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function maybeExit() {
  if (
    shuttingDown &&
    children.every(({ child }) => child.exitCode !== null || child.signalCode !== null)
  ) {
    process.exit(process.exitCode ?? 0);
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;
  for (const entry of children) stop(entry);
  // Hard-exit fallback if a child refuses to die.
  setTimeout(() => process.exit(code), 3000).unref();
  maybeExit();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function start(label, args) {
  console.log(`[dev] starting ${label}`);
  const child = spawn(process.execPath, args, { cwd: appDir, stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      maybeExit();
      return;
    }
    if (signal !== null || (code ?? 0) !== 0) {
      console.error(
        `[dev] ${label} exited unexpectedly (code=${code}, signal=${signal ?? 'none'}) — shutting down.`,
      );
      shutdown(typeof code === 'number' ? code : 1);
    }
  });
  children.push({ label, child });
  return child;
}

if (!existsSync(ENTRY)) {
  console.log('[dev] dist/main.js not found — running the initial build...');
  const initial = spawnSync(process.execPath, [tscBin, '-p', 'tsconfig.build.json'], {
    cwd: appDir,
    stdio: 'inherit',
  });
  if (initial.status !== 0) {
    console.error('[dev] initial build failed — fix the errors above and re-run `pnpm dev`.');
    process.exit(initial.status ?? 1);
  }
}

start('tsc --watch (incremental build)', [
  tscBin,
  '-p',
  'tsconfig.build.json',
  '--watch',
  '--preserveWatchOutput',
]);
start('api server (node --watch --watch-path=dist dist/main.js)', [
  '--watch',
  '--watch-path=dist',
  'dist/main.js',
]);
