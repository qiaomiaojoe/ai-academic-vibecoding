#!/usr/bin/env node
'use strict';
/* 实际浏览器回归 runner。
 *
 *   node tests/run-browser.cjs <AI开发工作台.html> [运行组件 index.html 的 http 地址]
 *
 * browser-workbench.js / browser-meta.js 跑工作台 HTML；
 * browser-runtime.js 跑生成的运行组件，需要先起本机服务，不给地址就跳过。
 *
 * playwright 不是本仓库的依赖（学员 clone 不需要装）。跑之前自己装一次：
 *   npm i -g playwright && npx playwright install chromium
 * 或在任意目录 npm i playwright，再用 NODE_PATH 指过来。
 */
const path = require('node:path'), fs = require('node:fs');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { 
  console.error('未找到 playwright —— 这三个脚本要真浏览器才能跑。');
  console.error('装法：npm i -g playwright && npx playwright install chromium');
  console.error('（本仓库不把 playwright 列为依赖，学员安装 skills 不需要它。）');
  process.exit(2);
}

const [htmlArg, runtimeUrl] = process.argv.slice(2);
if (!htmlArg) { console.error('用法：node tests/run-browser.cjs <AI开发工作台.html> [运行组件地址]'); process.exit(2); }
const htmlPath = path.resolve(htmlArg);
if (!fs.existsSync(htmlPath)) { console.error('找不到 HTML：' + htmlPath); process.exit(2); }

const suites = [
  { file: 'browser-workbench.js', url: 'file://' + htmlPath },
  { file: 'browser-meta.js',      url: 'file://' + htmlPath },
  { file: 'browser-runtime.js',   url: runtimeUrl || null }
];

(async () => {
  const browser = await chromium.launch();
  let failed = 0, total = 0;
  for (const s of suites) {
    if (!s.url) { console.log(`⏭  ${s.file}：未提供运行组件地址，跳过（不计为通过）`); continue; }
    const run = require(path.join(__dirname, s.file));
    const page = await browser.newPage({ acceptDownloads: true });
    try {
      await page.goto(s.url);
      const r = await run(page);
      total += r.passed;
      console.log(`✅ ${s.file}：${r.passed} 项通过`);
      if (process.env.VERBOSE) r.checks.forEach(c => console.log('     · ' + c));
    } catch (e) {
      failed++;
      console.log(`❌ ${s.file}：${e.message}`);
    } finally { await page.close(); }
  }
  await browser.close();
  console.log(`\n合计 ${total} 项通过，${failed} 个套件失败。`);
  process.exit(failed ? 1 : 0);
})();
