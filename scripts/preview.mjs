import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = process.argv.includes('--site');
const root = resolve(dirname(fileURLToPath(import.meta.url)), site ? '../site-dist' : '../dist');
const port = Number(process.env.PORT || 4317);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
    if (path === '/' && !site) {
      response.writeHead(302, { Location: '/dashboard.html' });
      response.end();
      return;
    }
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root, `.${path}`);
    if (!file.startsWith(`${root}${sep}`)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const contents = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(contents);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found. Run npm run build first.');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Signal preview: http://127.0.0.1:${port}/${site ? '' : 'dashboard.html'}`);
  console.log('Fictional sample data. No extension installation or cloud credentials required.');
});
