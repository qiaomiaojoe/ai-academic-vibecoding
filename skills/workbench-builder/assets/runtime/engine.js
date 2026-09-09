/* Shared by the designer, generator and generated workbenches. No business-specific rules. */
(function (root) {
  'use strict';
  const VERSION = '1.0.0';
  const clone = value => JSON.parse(JSON.stringify(value));
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const idOK = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value) && !['constructor', 'prototype'].includes(value);
  function validate(config) {
    const errors = [];
    const need = (ok, message) => { if (!ok) errors.push(message); };
    if (!config || typeof config !== 'object') return ['配置必须是对象'];
    need(config.schemaVersion === 1, 'schemaVersion 必须为 1');
    need(text(config.name), '填写工作台名称');
    need(text(config.version), '填写配置版本');
    const roles = Array.isArray(config.roles) ? config.roles : [];
    const steps = Array.isArray(config.steps) ? config.steps : [];
    need(roles.length > 0 && roles.length <= 12, '角色数量为 1–12');
    need(steps.length > 0 && steps.length <= 40, '步骤数量为 1–40');
    const roleIds = new Set(), stepIds = new Set(), checkIds = new Set();
    roles.forEach(r => {
      if (!r || typeof r !== 'object') { errors.push('角色必须是对象'); return; }
      need(idOK(r.id) && !roleIds.has(r.id), '角色 ID 无效或重复：' + r.id);
      roleIds.add(r.id);
      need(text(r.name) && text(r.instructions), '角色需名称和职责：' + r.id);
    });
    steps.forEach(s => {
      if (!s || typeof s !== 'object') { errors.push('步骤必须是对象'); return; }
      need(idOK(s.id) && !stepIds.has(s.id), '步骤 ID 无效或重复：' + s.id);
      stepIds.add(s.id);
      need(text(s.name), '步骤需名称：' + s.id);
      need(Array.isArray(s.roles) && s.roles.length > 0 && s.roles.length <= 4 && new Set(s.roles).size === s.roles.length && s.roles.every(r => roleIds.has(r)), '步骤需绑定 1–4 个有效且不同的角色：' + s.id);
      need(Number.isInteger(s.maxAttempts) && s.maxAttempts >= 1 && s.maxAttempts <= 5, '重试上限为 1–5：' + s.id);
      const checks = Array.isArray(s.checks) ? s.checks : [];
      need(checks.length > 0, '每步至少一个验收条件：' + s.id);
      checks.forEach(c => {
        if (!c || typeof c !== 'object') { errors.push('验收条件必须是对象'); return; }
        need(idOK(c.id) && !checkIds.has(c.id), '验收 ID 无效或重复：' + c.id); checkIds.add(c.id);
        need(text(c.name), '验收条件需名称：' + c.id);
        need(['nonempty', 'contains', 'human'].includes(c.type), '未知验收类型：' + c.id);
        if (c.type !== 'human') need(Array.isArray(s.roles) && s.roles.includes(c.role), '验收需绑定本步角色：' + c.id);
        if (c.type === 'contains') need(text(c.value), '包含检查需填写目标文字：' + c.id);
      });
    });
    need(stepIds.has(config.start), '起始步骤不存在');
    steps.filter(Boolean).forEach(s => {
      need(s.next === null || stepIds.has(s.next), '通过分支不存在：' + s.id);
      need(s.failTo === null || stepIds.has(s.failTo), '退回分支不存在：' + s.id);
    });
    if (errors.length) return errors;
    // A successful path must terminate; rework cycles are bounded by maxAttempts.
    for (const first of steps) {
      let current = first.id; const seen = new Set();
      while (current !== null && !seen.has(current)) { seen.add(current); current = steps.find(s => s.id === current).next; }
      if (current !== null) { errors.push('通过分支成环：' + first.id); break; }
    }
    const reachable = new Set();
    function visit(id) { if (id === null || reachable.has(id)) return; reachable.add(id); const s = steps.find(s => s.id === id); visit(s.next); visit(s.failTo); }
    visit(config.start);
    steps.forEach(s => need(reachable.has(s.id), '步骤无法到达：' + s.id));
    return errors;
  }
  function createRun(config, id, input, mode) {
    const errors = validate(config); if (errors.length) throw Error(errors.join('\n'));
    if (!text(input)) throw Error('请提供任务材料或要求');
    return { id, config: clone(config), engineVersion: VERSION, mode, input, status: 'ready', current: config.start,
      attempts: {}, outputs: {}, outputOrder: [], history: [], revision: 0, createdAt: new Date().toISOString() };
  }
  function event(run, type, data = {}) { run.history.push({ at: new Date().toISOString(), type, ...clone(data) }); run.revision++; }
  function stepOf(run) { return run.config.steps.find(s => s.id === run.current); }
  function begin(run) {
    if (!['ready', 'failed'].includes(run.status)) throw Error('当前状态不能执行：' + run.status);
    const step = stepOf(run), attempt = (run.attempts[step.id] || 0) + 1;
    if (attempt > step.maxAttempts) { run.status = 'blocked'; event(run, 'limit', { step: step.id }); return null; }
    run.attempts[step.id] = attempt; run.status = 'running'; run.pending = { step: step.id, attempt, outputs: {}, errors: {}, checks: [] };
    event(run, 'started', { step: step.id, attempt }); return clone(step);
  }
  function acceptResult(run, role, result) {
    if (run.status !== 'running') throw Error('没有正在执行的步骤');
    if (!stepOf(run).roles.includes(role)) throw Error('角色不属于当前步骤');
    if (!result || !text(result.content) || !text(result.summary) || !['pass', 'fail', 'review'].includes(result.decision)) throw Error('角色输出不符合协议：' + role);
    run.pending.outputs[role] = clone(result); event(run, 'role-completed', { role, step: run.current });
  }
  function route(run, passed) {
    const step = stepOf(run);
    if (passed) {
      run.outputs[step.id] = clone(run.pending.outputs);
      run.outputOrder.push(step.id);
      run.current = step.next;
      run.status = run.current === null ? 'completed' : 'ready';
    } else {
      // A rejected branch cannot expose stale downstream outputs to a later role.
      const target = step.failTo || step.id, index = run.outputOrder.indexOf(target);
      if (index >= 0) {
        run.outputOrder.splice(index).forEach(id => delete run.outputs[id]);
      }
      run.current = step.failTo || step.id;
      run.status = step.failTo ? 'ready' : 'failed';
    }
    if (run.current !== null && (run.attempts[run.current] || 0) >= stepOf(run).maxAttempts) run.status = 'blocked';
    event(run, passed ? 'passed' : 'rejected', { step: step.id, next: run.current, evidence: run.pending });
    delete run.pending;
  }
  function finish(run) {
    const step = stepOf(run);
    if (run.status !== 'running') throw Error('没有正在执行的步骤');
    if (step.roles.some(r => !run.pending.outputs[r])) {
      run.status = 'failed'; event(run, 'execution-failed', { step: step.id, evidence: run.pending }); return;
    }
    run.pending.checks = step.checks.map(c => ({ id: c.id, name: c.name, type: c.type,
      status: c.type === 'human' ? 'pending' : (c.type === 'nonempty' ? text(run.pending.outputs[c.role].content) : run.pending.outputs[c.role].content.includes(c.value)) ? 'pass' : 'fail',
      evidence: c.type === 'human' ? '等待人工判断' : { role: c.role, content: run.pending.outputs[c.role].content } }));
    if (run.pending.checks.some(c => c.status === 'fail')) { route(run, false); return; }
    const decisions = step.roles.map(r => run.pending.outputs[r].decision);
    // Role opinions are not acceptance evidence; any concern or disagreement requires a recorded decision.
    if (decisions.some(d => d !== 'pass') || run.pending.checks.some(c => c.type === 'human')) {
      run.status = 'awaiting_review'; event(run, 'review-needed', { step: step.id });
    } else route(run, true);
  }
  function decide(run, passed, note) {
    if (run.status !== 'awaiting_review' || typeof passed !== 'boolean' || !text(note)) throw Error('仅待确认任务可决定，且必须填写判断依据');
    run.pending.checks.filter(c => c.type === 'human').forEach(c => { c.status = passed ? 'pass' : 'fail'; c.evidence = note; });
    event(run, 'human-decision', { step: run.current, passed, note }); route(run, passed);
  }
  async function execute(run, adapter, save = () => {}) {
    const step = begin(run); save(run); if (!step) return;
    // Independent roles get the same immutable snapshot; aggregation belongs to a subsequent step.
    const context = { input: run.input, upstream: clone(run.outputs), history: clone(run.history.filter(e => ['rejected', 'human-decision'].includes(e.type)).slice(-6)) };
    await Promise.allSettled(step.roles.map(async roleId => {
      const role = run.config.roles.find(r => r.id === roleId);
      try { acceptResult(run, roleId, await adapter({ role: clone(role), step: clone(step), context: clone(context), runId: run.id, attempt: run.pending.attempt })); }
      catch (error) { run.pending.errors[roleId] = error.message; event(run, 'role-failed', { step: step.id, role: roleId, error: error.message }); }
      save(run);
    }));
    finish(run); save(run);
  }
  const api = { VERSION, validate, createRun, begin, acceptResult, finish, decide, execute, event };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WorkbenchRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
