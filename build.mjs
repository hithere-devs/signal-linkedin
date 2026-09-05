import { build, context } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const watch = process.argv.includes('--watch');

const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
}

const aiDefaults = {
  baseUrl: process.env.SIGNAL_AI_BASE_URL || '',
  model: process.env.SIGNAL_AI_MODEL || ''
};

const cloudConfig = {
  url: process.env.SIGNAL_SUPABASE_URL || '',
  anonKey: process.env.SIGNAL_SUPABASE_ANON_KEY || ''
};

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const common = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome116'],
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': '"production"',
    '__SIGNAL_VERSION__': JSON.stringify(packageJson.version),
    '__SIGNAL_WEB_PREVIEW__': 'false',
    '__AI_DEFAULTS__': JSON.stringify(aiDefaults),
    '__SIGNAL_CLOUD_CONFIG__': JSON.stringify(cloudConfig)
  }
};

const entries = {
  content: 'src/content/index.ts',
  background: 'src/background/service-worker.ts',
  popup: 'src/popup/main.tsx',
  settings: 'src/settings/main.tsx',
  dashboard: 'src/dashboard/main.tsx',
  demo: 'src/demo/main.tsx'
};

async function run() {
  if (!watch) rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  const options = {
    ...common,
    entryPoints: Object.fromEntries(
      Object.entries(entries).map(([name, p]) => [name, join(root, p)])
    ),
    entryNames: '[name]',
    outdir: dist
  };

  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    console.log('[signal] watching for changes...');
  } else {
    await build(options);
  }

  cpSync(join(root, 'public'), dist, { recursive: true });
  const manifestPath = join(dist, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = packageJson.version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
