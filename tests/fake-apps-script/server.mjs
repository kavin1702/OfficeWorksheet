// Serves the real apps-script/Code.gs over HTTP the way Google does:
// POST /macros/s/<id>/exec answers 302 → GET /echo?k=... returns the JSON.
// Also: GET /__sheet returns the current sheet contents (for checking output).
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRuntime } from './runtime.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4010);
const runtime = createRuntime(path.join(dir, '../../apps-script/Code.gs'), {
  secret: process.env.API_SECRET || 'test-secret'
});
const pending = new Map();
let counter = 0;
export const requestLog = [];

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'POST' && /^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname)) {
      const out = runtime.doPost(body);
      let action = '?';
      try { action = JSON.parse(body).action; } catch {}
      requestLog.push({ action, at: new Date().toISOString() });
      const key = String(++counter);
      pending.set(key, out);
      res.writeHead(302, { Location: `/echo?k=${key}` });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/echo') {
      const out = pending.get(url.searchParams.get('k'));
      pending.delete(url.searchParams.get('k'));
      res.writeHead(out ? 200 : 404, { 'Content-Type': 'application/json' });
      return res.end(out || '{"ok":false,"error":"expired"}');
    }
    if (url.pathname === '/__sheet') {
      const sheet = runtime.sheet();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ table: sheet ? sheet.toTable() : [], formulaWrites: sheet ? sheet.formulaWrites : 0, requests: requestLog }));
    }
    res.writeHead(404);
    res.end();
  });
});
server.listen(port, '127.0.0.1', () => console.log(`fake Apps Script on http://127.0.0.1:${port}`));
