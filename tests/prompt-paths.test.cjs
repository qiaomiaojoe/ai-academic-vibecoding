// Regression for prompts generated from source HTML and frozen snapshots.
// Runs actual inline JavaScript with minimal DOM fixtures; no model calls.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const html = fs.readFileSync(process.env.WORKBENCH_HTML || path.resolve(__dirname, '../../AI开发工作台.html'), 'utf8');
const scripts = [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const script = scripts.join('\n');
function fixture(url, explicit='') {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){}}});
    return elements.get(id);
  };
  const context = vm.createContext({location:new URL(url),document:{getElementById:get},setTimeout(){}});
  vm.runInContext(script.slice(0,script.indexOf('/* ═══════════ 起飞')),context);
  get('install-source').value=explicit;
  vm.runInContext('STATE.current={name:"投稿项目",goal:"投稿与审稿"}; FLOW_DRAFT={workflow:"",subagent:"",source:"未预设"};',context);
  return {get,run:code=>vm.runInContext(code,context)};
}
test('all HTML inline scripts parse',()=>{ for(const s of scripts) new vm.Script(s); assert.ok(scripts.length); });

const urls=[
  'file:///Users/teacher-private/Course/AI开发工作台.html',
  'file:///Users/teacher-private/Course/工作台版本/AI开发工作台-v1.5.html',
  'file:///C:/Users/student-private/Downloads/AI开发工作台.html',
  'file:///tmp/%ZZ/index.html',
  'https://example.test/shared/AI开发工作台.html'
];
test('page location is never accessed to create a tool source',()=>{
  const f=fixture(urls[0]);
  f.run('Object.defineProperty(globalThis,"location",{get(){throw new Error("page location read")}})');
  assert.equal(f.run('toolSource().path'),'');
  assert.equal(f.run('toolSource().explicit'),false);
  assert.match(f.run('devToolContext()'),/已安装的课程 Skills/);
});
test('default tool instruction is identical across machines, snapshots and hosting',()=>{
  const all=urls.map(url=>fixture(url).run('devToolContext()'));
  assert.ok(all.every(s=>s===all[0]));
  assert.match(all[0],/无需提供本地源码仓库/);
  assert.match(all[0],/版本不匹配/);
  assert.match(all[0],/不扫描整个电脑/);
});
test('explicit local override is preserved without changing its path',()=>{
  for(const source of ['./ai-academic-vibecoding','/my/custom/repo']) {
    const f=fixture(urls[0],source);
    assert.equal(f.run('toolSource().path'),source);
    assert.equal(f.run('toolSource().explicit'),true);
    assert.match(f.run('devToolContext()'),/不存在或版本不匹配时，说明差异并问清/);
    assert.ok(f.run('devToolContext()').includes(source));
  }
});
test('clearing override restores installed-skill instructions',()=>{
  const f=fixture(urls[0],'/my/custom/repo'); f.get('install-source').value='';
  assert.match(f.run('devToolContext()'),/已安装的课程 Skills/);
  assert.ok(!f.run('devToolContext()').includes('/my/custom/repo'));
});
test('design prompt keeps first-design continuation and save confirmation',()=>{
  const f=fixture(urls[0]); f.get('f-mode').value='design'; f.run('genFlow()');
  const prompt=f.run('LAST.flow.full');
  assert.match(prompt,/无需先问是否按首次设计处理/);
  assert.match(prompt,/关键判断确认后再保存设计/);
  assert.match(prompt,/本次先做设计，不自动搭建/);
});
test('build prompt retains design confirmation and automatic trial',()=>{
  const f=fixture(urls[0]); f.get('f-mode').value='build'; f.run('genFlow()');
  const prompt=f.run('LAST.flow.full');
  assert.match(prompt,/等待关键设计确认后再搭建/);
  assert.match(prompt,/搭建完成后立即调用同一套已核实开发工具中的 workbench-validator/);
});
test('default install uses public course repo without requiring a local checkout',()=>{
  const f=fixture(urls[0]); f.run('copyText=text=>{globalThis.copied=text}; copyInstall()');
  const s=f.run('copied');
  assert.match(s,/未指定本地开发版仓库/);
  assert.match(s,/https:\/\/github.com\/qiaomiaojoe\/ai-academic-vibecoding/);
  assert.match(s,/不要自动使用 --update 覆盖我的定制方法/);
  assert.ok(!s.includes('teacher-private'));
});
test('install honors explicit local source and protects custom skills',()=>{
  const f=fixture(urls[0],'./local-tools'); f.run('copyText=text=>{globalThis.copied=text}; copyInstall()');
  assert.match(f.run('copied'),/用户填写的开发工具源仓库：\.\/local-tools/);
  assert.ok(!f.run('copied').includes('未指定本地开发版仓库'));
  assert.match(f.run('copied'),/不要自动使用 --update/);
});
test('all prompt entry points are portable across page locations',()=>{
  function prompts(url) {
    const f=fixture(url);
    f.run('copyText=text=>{globalThis.copied=text}; upsertProject=()=>{}');
    f.get('e-name').value='练习工作台'; f.run('genEntry()');
    const result=[f.run('LAST.entry.full')];
    for(const mode of ['design','build']) {f.get('f-mode').value=mode; f.run('genFlow()'); result.push(f.run('LAST.flow.full'));}
    f.get('s-name').value='review-response';
    for(const bind of [true,false]) {f.get('s-bind').checked=bind;f.run('genForge()');result.push(f.run('LAST.forge.full'));}
    for(const level of ['1','2','3','4','5','6']) {f.get('u-level').value=level;f.run('genShip()');result.push(f.run('LAST.ship.full'));}
    f.run('copyInstall()');result.push(f.run('copied'));
    return result;
  }
  const baseline=prompts(urls[0]);
  for(const url of urls) assert.deepEqual(prompts(url),baseline);
  for(const s of baseline) assert.ok(!/teacher-private|student-private|file:\/\/|\/Users\/|C:\//.test(s));
});
test('user-entered project and material paths remain in prompts',()=>{
  const f=fixture(urls[0]); f.get('d-root').value='/my/project'; f.get('f-materials').value='/my/paper.docx'; f.run('genFlow()');
  const s=f.run('LAST.flow.full');
  assert.ok(s.includes('/my/project')&&s.includes('/my/paper.docx'));
});
test('distribution source has no absolute home paths or page location reader',()=>{
  assert.ok(!/\/Users\/|\/home\/|[A-Z]:\\\\Users\\\\/.test(html));
  assert.ok(!/location\.(pathname|href|protocol)|document\.(URL|baseURI)/.test(script));
});
