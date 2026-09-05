import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../site-dist');
const errors = [];
const required = [
  'index.html',
  'privacy.html',
  'terms.html',
  'styles.css',
  ...['dashboard', 'settings', 'popup', 'demo'].flatMap((page) => [
    `app/${page}.html`,
    `app/${page}.js`,
    `app/${page}.css`,
  ]),
];
for (const file of required) {
  try {
    await stat(resolve(root, file));
  } catch {
    errors.push(`Missing ${file}`);
  }
}
for (const file of [
  'index.html',
  'privacy.html',
  'terms.html',
  ...['dashboard', 'settings', 'popup', 'demo'].map((page) => `app/${page}.html`),
]) {
  const path = resolve(root, file);
  let html;
  try {
    html = await readFile(path, 'utf8');
  } catch {
    continue;
  }
  for (const [, href] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(href)) continue;
    let target = resolve(dirname(path), href.split(/[?#]/)[0] || '.');
    if (href.endsWith('/')) target = resolve(target, 'index.html');
    try {
      await stat(target);
    } catch {
      errors.push(`Broken link in ${file}: ${href}`);
    }
  }
}
const appFiles = await readdir(resolve(root, 'app'));
for (const forbidden of ['background.js', 'content.js', 'manifest.json', '.env']) {
  if (appFiles.includes(forbidden)) errors.push(`Extension-only file published: ${forbidden}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Verified public preview: ${required.length} required files, local links, and extension-only file exclusions.`
);
