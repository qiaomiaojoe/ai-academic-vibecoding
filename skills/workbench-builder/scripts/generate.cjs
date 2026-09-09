#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assets = path.resolve(__dirname, '../assets/runtime');
const { validate, VERSION } = require(path.join(assets, 'engine.js'));
function generate(configPath, output) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const errors = validate(config); if (errors.length) throw Error(errors.join('\n'));
  const target = path.resolve(output);
  if (fs.existsSync(target)) throw Error('输出目录已存在；请用新版本目录生成，再比较合并，保留运行记录：' + target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const staging = fs.mkdtempSync(path.join(path.dirname(target), '.workbench-build-'));
  try {
    fs.cpSync(assets, staging, { recursive: true });
    fs.writeFileSync(path.join(staging, 'workflow.json'), JSON.stringify(config, null, 2) + '\n');
    fs.writeFileSync(path.join(staging, '使用说明.md'), `# ${config.name}\n\n由 AI开发工作台生成，配置版本 ${config.version}，运行组件 ${VERSION}。\n\n需要 Node.js 18 或更新版本。\n\n1. 在本目录终端运行 \`node server.cjs --demo\`，打开终端显示的完整本机链接，验证流程机制。模拟输出不能作业务验收证据。\n2. 停止模拟服务后，确认本机 Codex CLI 已登录，再运行 \`node server.cjs\`。点击“执行当前步骤”才调用 AI。可通过 CODEX_BIN 指定 Codex 可执行文件，通过 WORKBENCH_MODEL 指定已可用模型。\n3. 填任务要求与材料正文，创建任务。每步同组角色并行、组间顺序执行；汇总必须放在下一步。\n4. 根据验收证据决定继续或退回。关键词/非空检查只证明格式条件，学术判断使用人工验收。\n5. 运行记录保存在 runs/demo 或 runs/codex；服务重启后可选择已有任务继续。正在运行时中断的步骤标失败，不自动重跑。\n\n当前适配器只使用输入正文、已验收上游结果与返工意见；不自动读取用户填入的路径或外部资料，不执行正式投稿或发送。需要文件解析、其他工具或写入权限时，由搭建工具按项目需求扩展适配器并单独验收。Codex 不可用、超时、输出格式错误都记失败，不降级成模拟成功。\n\n修改 workflow.json 只影响新建任务；旧任务持有原配置快照。更新组件先生成到新目录，对照 manifest.json 合并，保留 runs/。停止旧服务后再更新。已有产品需将运行面板整合回原 HTML，保留原场景。\n`);
    const hashes = {};
    for (const name of fs.readdirSync(staging).sort()) hashes[name] = crypto.createHash('sha256').update(fs.readFileSync(path.join(staging, name))).digest('hex');
    fs.writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify({ engineVersion: VERSION, configVersion: config.version, generatedAt: new Date().toISOString(), features: ['workflow', 'roles', 'acceptance'], files: hashes }, null, 2) + '\n');
    fs.renameSync(staging, target);
  } catch (error) { fs.rmSync(staging, { recursive: true, force: true }); throw error; }
  return target;
}
if (require.main === module) {
  if (process.argv.length !== 4) { console.error('用法：node generate.cjs <工作台配置.json> <新的输出目录>'); process.exit(1); }
  try { console.log(generate(process.argv[2], process.argv[3])); } catch (error) { console.error(error.message); process.exit(1); }
}
module.exports = { generate };
