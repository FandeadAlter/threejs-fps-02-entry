import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('./game/', import.meta.url));
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
createServer((req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(base, '.' + path);
    if (!file.startsWith(resolve(base) + sep)) { res.writeHead(403).end(); return; }
    const stat = statSync(file);
    if (!stat.isFile()) throw Error('missing');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(8080, '0.0.0.0', () => console.log('Duskline Protocol: http://localhost:8080'));
