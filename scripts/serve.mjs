import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { root, siteFiles } from './site-files.mjs';

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};
const port = Number(process.env.PORT || 4173);
const from = process.argv.includes('--dist') ? join(root, 'dist') : resolve(root);
const project = '/The-Art-of-You';
const allowed = new Set(siteFiles);

createServer(async (request, response) => {
  const end = (code, text, headers) => { response.writeHead(code, headers); response.end(text); };
  if (request.method !== 'GET' && request.method !== 'HEAD') return end(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://static.local').pathname); }
  catch { return end(400, 'Bad request'); }
  if (pathname === project) return end(308, '', { Location: `${project}/` });
  if (pathname.startsWith(`${project}/`)) pathname = pathname.slice(project.length);
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  const path = resolve(from, name);
  if (!allowed.has(name.split('/')[0]) || !path.startsWith(from + sep) || name.includes('\0')) return end(404, 'Not found');
  let info;
  try { info = await stat(path); } catch { return end(404, 'Not found'); }
  if (!info.isFile()) return end(404, 'Not found');
  const headers = { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Content-Length': info.size };
  let range;
  if (request.headers.range) {
    const parts = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    if (!parts || !(parts[1] || parts[2]) || !info.size) return end(416, '', { 'Content-Range': `bytes */${info.size}` });
    const start = parts[1] ? Number(parts[1]) : Math.max(0, info.size - Number(parts[2]));
    const endByte = parts[1] && parts[2] ? Math.min(Number(parts[2]), info.size - 1) : info.size - 1;
    if (start >= info.size || endByte < start) return end(416, '', { 'Content-Range': `bytes */${info.size}` });
    range = { start, end: endByte };
    headers['Content-Range'] = `bytes ${start}-${endByte}/${info.size}`;
    headers['Content-Length'] = endByte - start + 1;
  }
  response.writeHead(range ? 206 : 200, headers);
  if (request.method === 'HEAD') return response.end();
  const stream = createReadStream(path, range);
  stream.on('error', () => response.destroy());
  response.on('close', () => stream.destroy());
  stream.pipe(response);
}).listen(port, '0.0.0.0', () => console.log(`The Art of You · http://0.0.0.0:${port}`));
