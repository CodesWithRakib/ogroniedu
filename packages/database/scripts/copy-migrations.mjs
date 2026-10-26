import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(dir, '..', 'src', 'migrations');
const dist = path.resolve(dir, '..', 'dist', 'migrations');

if (fs.existsSync(src)) {
  fs.mkdirSync(dist, { recursive: true });
  fs.cpSync(src, dist, { recursive: true });
}
