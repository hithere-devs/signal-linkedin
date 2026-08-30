import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
const errors = [];

const required = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'settings.html',
  'settings.js',
  'settings.css',
  'dashboard.html',
  'dashboard.js',
  'dashboard.css',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

for (const file of required) {
  try {
    if (!statSync(join(dist, file)).isFile()) errors.push(`Missing ${file}`);
  } catch {
    errors.push(`Missing ${file}`);
  }
}

if (manifest.manifest_version !== 3) errors.push('Manifest must use version 3');
if (manifest.version !== pkg.version) errors.push('Manifest and package versions differ');
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(['https://www.linkedin.com/*'])) {
  errors.push('Required host permissions must be limited to linkedin.com');
}
if (!manifest.optional_host_permissions?.includes('https://*/*')) {
  errors.push('Optional HTTPS host access is missing');
}
if (manifest.permissions?.some((permission) => !['storage', 'alarms'].includes(permission))) {
  errors.push('Unexpected required extension permission');
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

for (const file of walk(dist)) {
  const name = relative(dist, file);
  if (/\.map$/i.test(name)) errors.push(`Production source map found: ${name}`);
  if (/\.(pem|key|env)$/i.test(name)) errors.push(`Sensitive file type found: ${name}`);
  if (statSync(file).size > 2_000_000) errors.push(`Unexpectedly large file: ${name}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Verified Signal ${pkg.version}: ${required.length} required files, minimal required permissions.`);
