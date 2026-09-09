'use strict';
const $ = id => document.getElementById(id);
let token = location.hash.slice(1) || sessionStorage.getItem('workbench-token'), selected = '', run = null, busy = false;
if (location.hash) { sessionStorage.setItem('workbench-token', token); history.replaceState(null, '', location.pathname); }
const labels = { ready: '待执行', running: '执行中', awaiting_review: '等待人工判断', failed: '执行失败，可重试', blocked: '达到重试上限，请检查设计或材料后新建任务', completed: '流程验收完成' };
async function api(url, method = 'GET', data) {
  const response = await fetch('/api/' + url, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json(); if (!response.ok) throw Error(result.error); return result;
}
function element(tag, content) { const el = document.createElement(tag); el.textContent = content; return el; }
function render() {
  for (const id of ['create', 'runs', 'approve', 'reject']) $(id).disabled = busy;
  $('task').hidden = !run; if (!run) return;
  $('status').textContent = labels[run.status] + (run.mode === 'demo' ? ' · 模拟' : '');
  $('current').textContent = `任务 ${run.id} · 配置 ${run.config.version}`;
  $('advance').disabled = busy || !['ready', 'failed'].includes(run.status);
  $('review').hidden = run.status !== 'awaiting_review';
  $('flow').replaceChildren(...run.config.steps.map(s => { const el = element('span', s.name + ' → ' + (s.next || '完成')); el.className = 'node' + (s.id === run.current ? ' active' : '') + (run.outputs[s.id] ? ' done' : ''); return el; }));
  $('evidence').replaceChildren();
  const evidence = run.pending || [...run.history].reverse().find(e => e.evidence)?.evidence;
  if (evidence) {
    for (const [role, output] of Object.entries(evidence.outputs || {})) { const card = document.createElement('article'); card.append(element('h4', role + ' · 建议 ' + output.decision), element('p', output.summary), element('pre', output.content)); $('evidence').append(card); }
    for (const check of evidence.checks || []) $('evidence').append(element('p', `${check.name}：${check.status}（${check.type === 'human' ? '人工判断' : '程序检查'}）`));
    for (const [role, error] of Object.entries(evidence.errors || {})) $('evidence').append(element('p', role + '：' + error));
  }
  $('history').textContent = JSON.stringify(run.history, null, 2);
}
async function refresh() { if (selected) { const id = selected, value = await api('runs/' + id); if (selected === id && (!run || value.revision >= run.revision)) { run = value; render(); } } }
async function list() { const rows = await api('runs'); $('runs').replaceChildren(new Option('请选择', ''), ...rows.reverse().map(r => new Option(`${r.name} / ${r.createdAt} / ${labels[r.status]}`, r.id))); $('runs').value = selected; }
async function action(fn) { if (busy) return; busy = true; render(); $('error').textContent = ''; try { await fn(); } catch (e) { $('error').textContent = e.message; } finally { busy = false; render(); } }
$('create').onclick = () => action(async () => { run = await api('runs', 'POST', { input: $('input').value }); selected = run.id; $('note').value = ''; await list(); });
$('runs').onchange = () => action(async () => { selected = $('runs').value; run = null; $('note').value = ''; await refresh(); });
$('advance').onclick = () => action(async () => { run = await api(`runs/${selected}/advance`, 'POST', { revision: run.revision }); });
for (const [id, passed] of [['approve', true], ['reject', false]]) $(id).onclick = () => action(async () => { run = await api(`runs/${selected}/decision`, 'POST', { revision: run.revision, passed, note: $('note').value }); $('note').value = ''; });
$('export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = run.id + '-evidence.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
action(async () => { const info = await api('config'); $('name').textContent = info.config.name; document.title = info.config.name; $('mode').textContent = info.mode === 'demo' ? '模拟模式：用于验证流程机制，未调用 AI' : 'Codex 执行模式：点击执行将调用 AI；业务判断按验收条件保留人工确认'; await list(); });
setInterval(() => { if (!busy && selected) refresh().catch(e => { $('error').textContent = e.message; }); }, 1500);
