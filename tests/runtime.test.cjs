'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const base = path.resolve(__dirname, '../skills/workbench-builder');
const engine = require(path.join(base, 'assets/runtime/engine.js'));
const { generate } = require(path.join(base, 'scripts/generate.cjs'));
const { createServer } = require(path.join(base, 'assets/runtime/server.cjs'));
const { codexAdapter } = require(path.join(base, 'assets/runtime/adapter.cjs'));
const example = () => JSON.parse(fs.readFileSync(path.join(base, 'assets/workflow.example.json')));
const result = (content = '完整结果', decision = 'pass') => ({ summary: '摘要', content, decision });
const run = config => engine.createRun(config || example(), crypto.randomUUID(), '测试材料', 'demo');
const noHuman = () => { const c = example(); c.steps.forEach(s => s.checks = s.checks.filter(c => c.type !== 'human')); return c; };
const temp = t => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-meta-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
test('reject invalid IDs, references, empty checks, successful cycles and unreachable steps', () => {
  assert.deepEqual(engine.validate(example()), []);
  for (const change of [c => c.roles[0].id = 'constructor', c => c.steps[0].roles = ['missing'], c => c.steps[0].checks = [], c => c.steps[1].next = 'process', c => c.steps[0].next = null, c => c.steps[0].checks[0].role = 'integrator', c => c.steps[0].checks[0].type = 'shell']) {
    const c = example(); change(c); assert.ok(engine.validate(c).length);
  }
  assert.ok(engine.validate({ roles: [null], steps: [null] }).length);
});
test('roles really overlap and receive isolated same-step context; next step gets accepted upstream', async () => {
  const r = run(noHuman()); let release; const gate = new Promise(resolve => release = resolve); const seen = [];
  const executing = engine.execute(r, async job => { seen.push(job); job.context.input = 'private'; if (seen.length === 2) release(); await gate; return result(job.role.id); });
  await executing; assert.equal(seen.length, 2); assert.equal(r.status, 'ready'); assert.deepEqual(Object.keys(r.outputs), ['process']);
  await engine.execute(r, async job => { assert.equal(job.context.input, '测试材料'); assert.equal(job.context.upstream.process.maker.content, 'maker'); return result(); });
  assert.equal(r.status, 'completed');
});
test('human gate blocks execution and requires recorded rationale', async () => {
  const r = run(); await engine.execute(r, async () => result()); assert.equal(r.status, 'awaiting_review');
  assert.throws(() => engine.begin(r)); assert.throws(() => engine.decide(r, true, ''));
  engine.decide(r, true, '已核对方向与材料'); assert.equal(r.current, 'integrate'); assert.equal(r.history.filter(e => e.type === 'human-decision').length, 1);
});
test('conflicting role opinions require review even without a human check', async () => {
  const r = run(noHuman()); await engine.execute(r, async j => result('结果', j.role.id === 'maker' ? 'pass' : 'fail')); assert.equal(r.status, 'awaiting_review');
});
test('deterministic failure cannot be bypassed by human approval', async () => {
  const c = example(); c.steps[0].checks[0] = { id: 'required', name: '必须包含证据', type: 'contains', role: 'maker', value: '证据' };
  const r = run(c); await engine.execute(r, async () => result('无目标文字')); assert.equal(r.current, 'process'); assert.equal(r.status, 'ready');
  assert.throws(() => engine.decide(r, true, '强行通过')); assert.ok(r.history.some(e => e.type === 'rejected'));
});
test('rework invalidates old outputs and retains history; bounded attempts stop loops', async () => {
  const r = run(); await engine.execute(r, async () => result()); engine.decide(r, true, '通过');
  await engine.execute(r, async () => result()); engine.decide(r, false, '需返工'); assert.deepEqual(r.outputs, {}); assert.equal(r.current, 'process');
  for (let i = 0; i < 2; i++) { await engine.execute(r, async () => result()); engine.decide(r, false, '仍需返工'); }
  assert.equal(r.status, 'blocked'); assert.equal(r.attempts.process, 3); assert.ok(r.history.some(e => e.type === 'passed'));
});
test('rework to an intermediate step preserves unaffected upstream', async () => {
  const c = noHuman(); c.steps[1].next = 'finish'; c.steps.push({ id: 'finish', name: '最终', roles: ['integrator'], next: null, failTo: 'integrate', maxAttempts: 3, checks: [{ id: 'judge', name: '确认', type: 'human' }] });
  const r = run(c); await engine.execute(r, async () => result()); await engine.execute(r, async () => result()); await engine.execute(r, async () => result());
  engine.decide(r, false, '重做汇总'); assert.equal(r.current, 'integrate'); assert.deepEqual(Object.keys(r.outputs), ['process']);
});
test('role exceptions and malformed outputs fail without silent demo fallback', async () => {
  for (const adapter of [async () => { throw Error('额度不足'); }, async () => ({ content: 'x' })]) {
    const r = run(); await engine.execute(r, adapter); assert.equal(r.status, 'failed'); assert.equal(Object.keys(r.pending.errors).length, 2); assert.equal(Object.keys(r.outputs).length, 0);
  }
});
test('run configuration and separate tasks cannot contaminate each other', async () => {
  const c = example(), a = run(c), b = run(c); c.roles[0].instructions = 'changed'; await engine.execute(a, async () => result());
  assert.notEqual(a.config.roles[0].instructions, 'changed'); assert.equal(b.status, 'ready'); assert.equal(b.history.length, 0);
});
test('generator produces portable components with correct manifest and refuses overwrite', t => {
  const root = temp(t), out = path.join(root, '生成物'); generate(path.join(base, 'assets/workflow.example.json'), out);
  assert.equal(require(path.join(out, 'engine.js')).VERSION, engine.VERSION);
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json')));
  for (const [file, hash] of Object.entries(manifest.files)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(out, file))).digest('hex'), hash);
  fs.writeFileSync(path.join(out, 'custom.txt'), '用户修改'); assert.throws(() => generate(path.join(base, 'assets/workflow.example.json'), out)); assert.equal(fs.readFileSync(path.join(out, 'custom.txt'), 'utf8'), '用户修改');
});
async function start(t, options = {}) {
  const root = options.directory || temp(t), directory = options.directory || path.join(root, 'product');
  if (!options.directory) generate(path.join(base, 'assets/workflow.example.json'), directory);
  const app = createServer({ directory, demo: true, ...options });
  const full = new URL(await app.listen()), origin = full.origin;
  t.after(() => new Promise(resolve => { app.server.close(resolve); app.server.closeAllConnections(); }));
  const api = async (route, data, headers = {}) => {
    const response = await fetch(origin + '/api/' + route, { method: data === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + app.token, 'Content-Type': 'application/json', ...headers }, body: data === undefined ? undefined : JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  };
  return { app, api, directory, origin };
}
test('HTTP authentication, same-origin access, static allowlist and stale revisions', async t => {
  const { api, origin } = await start(t);
  assert.equal((await api('config', undefined, { Authorization: '' })).status, 401);
  assert.equal((await api('config', undefined, { Origin: 'https://evil.invalid' })).status, 403);
  assert.equal((await fetch(origin + '/workflow.json')).status, 404);
  const r = (await api('runs', { input: 'HTTP 材料' })).data;
  assert.equal((await api(`runs/${r.id}/advance`, { revision: -1 })).status, 409);
  assert.equal((await api(`runs/${r.id}/advance`, { revision: r.revision })).status, 202);
});
test('double submission cannot execute the same step twice', async t => {
  let release; const gate = new Promise(resolve => release = resolve); let calls = 0;
  const { api } = await start(t, { adapter: async () => { calls++; await gate; return result(); } });
  const r = (await api('runs', { input: '材料' })).data;
  await api(`runs/${r.id}/advance`, { revision: r.revision });
  const current = (await api(`runs/${r.id}`)).data;
  assert.equal((await api(`runs/${r.id}/advance`, { revision: current.revision })).status, 409);
  release(); await new Promise(resolve => setImmediate(resolve)); assert.equal(calls, 2);
});
test('restart resumes saved config and marks interrupted steps failed', async t => {
  const root = temp(t), directory = path.join(root, 'product'); generate(path.join(base, 'assets/workflow.example.json'), directory);
  const first = createServer({ directory, demo: true }); const r = run(); engine.begin(r); first.save(r);
  const config = example(); config.version = '0.2'; fs.writeFileSync(path.join(directory, 'workflow.json'), JSON.stringify(config));
  const second = createServer({ directory, demo: true }); const restored = second.runs.get(r.id);
  assert.equal(restored.status, 'failed'); assert.equal(restored.config.version, '0.1'); assert.equal(restored.attempts.process, 1);
  const real = createServer({ directory, demo: false }); assert.equal(real.runs.size, 0);
});
test('Codex process adapter supplies protocol, reads structured result and uses no shell', async t => {
  const directory = temp(t), fake = path.join(directory, 'fake.cjs');
  fs.writeFileSync(fake, "const fs=require('fs');const args=process.argv;let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>fs.writeFileSync(args[args.indexOf('--output-last-message')+1],JSON.stringify({summary:'fake',content:s,decision:'pass'})));");
  let observed;
  const adapter = codexAdapter({ directory, spawnImpl: (command, args, opts) => { observed = { command, args, opts }; return spawn(process.execPath, [fake, ...args], opts); } });
  const response = await adapter({ role: example().roles[0], step: example().steps[0], context: { input: 'literal $(touch x)' }, runId: crypto.randomUUID(), attempt: 1 });
  assert.equal(observed.opts.shell, false); assert.ok(observed.args.includes('--ignore-user-config')); assert.ok(observed.args.includes('read-only')); assert.ok(response.content.includes('literal $(touch x)')); assert.equal(fs.existsSync(path.join(directory, 'x')), false);
});
test('Codex timeout and missing executable surface as failures', async t => {
  const directory = temp(t), job = { role: example().roles[0], step: example().steps[0], context: {}, runId: crypto.randomUUID(), attempt: 1 };
  await assert.rejects(codexAdapter({ directory, command: path.join(directory, 'missing') })(job), /无法启动/);
  await assert.rejects(codexAdapter({ directory, timeout: 30, spawnImpl: () => spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: ['pipe', 'pipe', 'pipe'] }) })(job), /超时/);
});
