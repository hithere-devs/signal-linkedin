import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'site-dist');
const app = resolve(output, 'app');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
await rm(output, { recursive: true, force: true });
await cp(resolve(root, 'site'), output, { recursive: true });
await mkdir(app, { recursive: true });

// Separate preview build: no .env loading, cloud configuration, keys, background
// worker, or LinkedIn content script is included in the published web workspace.
await build({
  entryPoints: Object.fromEntries(
    ['dashboard', 'settings', 'popup', 'demo'].map((page) => [
      page,
      resolve(root, `src/${page}/main.tsx`),
    ])
  ),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome116'],
  outdir: app,
  minify: true,
  sourcemap: false,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': '"production"',
    __SIGNAL_WEB_PREVIEW__: 'true',
    __SIGNAL_VERSION__: JSON.stringify(pkg.version),
    __AI_DEFAULTS__: JSON.stringify({ baseUrl: '', model: '' }),
    __SIGNAL_CLOUD_CONFIG__: JSON.stringify({ url: '', anonKey: '' }),
  },
});
for (const page of ['dashboard', 'settings', 'popup', 'demo']) {
  await cp(resolve(root, `public/${page}.html`), resolve(app, `${page}.html`));
}
await cp(resolve(root, 'public/icons'), resolve(app, 'icons'), { recursive: true });
// Version asset URLs so a newly deployed page does not reuse the previous UI's
// CSS or JavaScript from a browser/CDN cache.
for (const file of [
  'index.html',
  'privacy.html',
  'terms.html',
  ...['dashboard', 'settings', 'popup', 'demo'].map((page) => `app/${page}.html`),
]) {
  const path = resolve(output, file);
  const html = await readFile(path, 'utf8');
  await writeFile(
    path,
    html.replace(
      /((?:href|src)=["'])([^:"'?]+\.(?:css|js|png|woff2))(["'])/g,
      `$1$2?v=${pkg.version}$3`
    )
  );
}
await writeFile(resolve(output, '.nojekyll'), '');
console.log('Built the public site and isolated interactive preview in site-dist/.');
