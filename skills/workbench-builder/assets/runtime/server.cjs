'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const engine = require('./engine.js');
const { codexAdapter, demoAdapter } = require('./adapter.cjs');

function createServer({ directory = __dirname, demo = false, adapter, port = 0 } = {}) {
  const config = JSON.parse(fs.readFileSync(path.join(directory, 'workflow.json'), 'utf8'));
  const errors = engine.validate(config); if (errors.length) throw Error(errors.join('\n'));
  const mode = demo ? 'demo' : 'codex';
  const dataDir = path.join(directory, 'runs', mode);
  fs.mkdirSync(dataDir, { recursive: true });
  const executeRole = adapter || (demo ? demoAdapter() : codexAdapter({ directory: dataDir }));
  const token = crypto.randomBytes(24).toString('hex'), runs = new Map(), active = new Set();
  function save(run) {
    const target = path.join(dataDir, run.id + '.json'), tmp = target + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(run, null, 2), { mode: 0o600 }); fs.renameSync(tmp, target);
  }
  for (const name of fs.readdirSync(dataDir).filter(n => /^[a-f0-9-]{36}\.json$/.test(n))) {
    const run = JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
    if (run.id + '.json' !== name || run.mode !== mode || engine.validate(run.config).length) throw Error('无效运行记录：' + name);
    if (run.status === 'running') { run.status = 'failed'; engine.event(run, 'interrupted', { message: '服务重启；需手动重试，不自动重复调用 AI' }); save(run); }
    runs.set(run.id, run);
  }
  function send(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
  async function body(req) {
    let data = ''; for await (const chunk of req) { data += chunk; if (Buffer.byteLength(data) > 1024 * 1024) throw Error('请求过大'); }
    return JSON.parse(data || '{}');
  }
  const server = http.createServer(async (req, res) => {
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) return send(res, 403, { error: '仅允许本机工作台访问' });
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/api/')) {
        if (req.headers.authorization !== 'Bearer ' + token) return send(res, 401, { error: '请使用启动时给出的完整链接打开工作台' });
        if (req.method === 'GET' && url.pathname === '/api/config') return send(res, 200, { config, mode, engineVersion: engine.VERSION });
        if (req.method === 'GET' && url.pathname === '/api/runs') return send(res, 200, [...runs.values()].map(r => ({ id: r.id, status: r.status, createdAt: r.createdAt, name: r.config.name, version: r.config.version })));
        if (req.method === 'POST' && url.pathname === '/api/runs') {
          const { input } = await body(req), run = engine.createRun(config, crypto.randomUUID(), input, mode);
          runs.set(run.id, run); save(run); return send(res, 201, run);
        }
        const match = url.pathname.match(/^\/api\/runs\/([a-f0-9-]{36})(?:\/(advance|decision))?$/);
        if (!match || !runs.has(match[1])) return send(res, 404, { error: '任务不存在' });
        const run = runs.get(match[1]);
        if (req.method === 'GET' && !match[2]) return send(res, 200, run);
        if (req.method !== 'POST') return send(res, 405, { error: '不支持此操作' });
        const request = await body(req);
        if (request.revision !== run.revision) return send(res, 409, { error: '任务已更新，请刷新状态后操作' });
        if (active.has(run.id)) return send(res, 409, { error: '本步骤正在运行' });
        if (match[2] === 'advance') {
          if (!['ready', 'failed'].includes(run.status)) return send(res, 409, { error: '当前状态不能执行' });
          if (active.size >= 2) return send(res, 409, { error: '已有两个任务运行，请稍后执行' });
          active.add(run.id);
          const pending = engine.execute(run, executeRole, save);
          send(res, 202, run);
          pending.catch(e => { run.status = 'failed'; engine.event(run, 'service-error', { error: e.message }); save(run); }).finally(() => active.delete(run.id));
          return;
        }
        if (match[2] === 'decision') { engine.decide(run, request.passed, request.note); save(run); return send(res, 200, run); }
        return send(res, 404, { error: '操作不存在' });
      }
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      if (req.method !== 'GET' || !files[url.pathname]) return send(res, 404, { error: '文件不存在' });
      const [name, type] = files[url.pathname];
      res.writeHead(200, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
      res.end(fs.readFileSync(path.join(directory, name)));
    } catch (error) { if (!res.headersSent) send(res, 400, { error: error.message }); else res.end(); }
  });
  return { server, token, runs, active, save, port, listen() { return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}/#${token}`)); }); } };
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(a => a !== '--demo')) { console.error('用法：node server.cjs [--demo]'); process.exit(1); }
  const app = createServer({ demo: args.includes('--demo') });
  app.listen().then(url => console.log(`${args.includes('--demo') ? '模拟模式：未调用 AI' : 'Codex 模式：点击执行才调用 AI'}\n${url}\n保持终端开启。运行记录保存在本目录 runs/。`));
}
module.exports = { createServer };
