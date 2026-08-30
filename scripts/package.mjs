import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = join(root, 'dist');
const outDir = join(root, 'release');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const zipName = `signal-linkedin-v${pkg.version}.zip`;
const zipPath = join(outDir, zipName);
const stableTime = new Date('2020-01-01T00:00:00Z');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const files = walk(dist).sort();
for (const file of files) utimesSync(file, stableTime, stableTime);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
execFileSync('zip', ['-X', '-q', zipPath, ...files.map((file) => relative(dist, file))], { cwd: dist });

const digest = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
writeFileSync(`${zipPath}.sha256`, `${digest}  ${zipName}\n`);
console.log(`${zipPath}\nsha256 ${digest}`);
