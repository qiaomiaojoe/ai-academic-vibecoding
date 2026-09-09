#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../assets');
const target = process.argv[2];
if (!target) throw Error('用法：node sync-designer.cjs <AI开发工作台.html>');
let html = fs.readFileSync(target, 'utf8');
const escapeScript = s => s.replace(/<\/script/gi, '<\\/script');
const blocks = {
  'meta-panel': fs.readFileSync(path.join(root, 'designer.html'), 'utf8'),
  'meta-designer': 'const LEGACY_EXAMPLE = ' + escapeScript(fs.readFileSync(path.join(root, 'workflow.example.json'), 'utf8')) + ';\n' + fs.readFileSync(path.join(root, 'designer.js'), 'utf8')
};
for (const [name, content] of Object.entries(blocks)) {
  const start = name === 'meta-designer' ? '/* BEGIN meta-designer */' : `<!-- BEGIN ${name} -->`;
  const end = name === 'meta-designer' ? '/* END meta-designer */' : `<!-- END ${name} -->`;
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b < a) throw Error('缺少同步标记：' + name);
  html = html.slice(0, a + start.length) + '\n' + content + '\n' + html.slice(b);
}
fs.writeFileSync(target, html);
console.log('已同步第②张卡的 workflow / subagent 草案区');
