# AI 学术工作台开发 · 进阶班 skills 库

乔淼PhD · AI学术训练营·进阶班｜AI学术工作台开发。

用自然语言设计、搭建、改进自己的学术工作台。第二、三讲以造完“AI投稿-审稿工作台”为贯穿任务，同时把开发中验证有效的方法收回开发工具。HTML 保持四张工作流任务卡；第②张“流程设计与搭建”整合 workflow 与 subagent，开发 Skills 生成组件并自动试跑、修复、复测。

## 工具分工

| Skill | 用途 | 主要交接 |
|---|---|---|
| [project-setting](skills/project-setting/SKILL.md) | 立项、项目指令、目录、起步 HTML 和版本管理 | 第一讲的已有项目继续使用 |
| [workbench-builder](skills/workbench-builder/SKILL.md) | workflow / subagent 设计、搭建及自动试跑修复 | 工作台设计.md、场景、方法绑定与进度 |
| [skill-forge](skills/skill-forge/SKILL.md) | 从经验、规范、案例或方法文献制作/修订 skill，接回场景 | 方法源、执行路径/版本、接口、试跑结果 |
| [workbench-validator](skills/workbench-validator/SKILL.md) | 搭建后自动调用的试跑与修复工具，无独立任务卡 | 验收报告与有证据的开发工具改进建议 |

流程：立项 → 设计 workflow / subagent 并确认 → 搭建（按需制作/修订方法并绑定）→ 自动试跑、修复、复测。允许沿同一设计与同一工作台往返迭代，不是每次重建。

三类位置要分清：开发项目存工作台与设计；项目内 skills/ 存可编辑方法源；业务产物按任务及轮次分开。平台发现用的全局安装版是执行副本，更新后核对与源的一致性。开发期也可在场景指令中明确读取项目内 SKILL.md 执行，不依赖全局同名版本。

## 安装与更新

已下载或正在开发本仓库时，优先运行本地版本：

```bash
bash install.sh --source .
```

默认检测 Claude Code 的 `~/.claude/skills/` 和 Codex 的 `${CODEX_HOME:-$HOME/.codex}/skills/`。也可指定一个或多个安装目录：

```bash
bash install.sh --source . --target /你的目录/skills
```

安装器自动发现 skills/ 下的技能目录。**同名版本默认保留，不覆盖，不在管道输入中等待确认。** 比较差异并决定更新哪些后，逐个点名：

```bash
bash install.sh --source . --update workbench-builder --update skill-forge
```

更新先完整复制新版本，再把旧目录保存到目标 skills 目录旁的 `.ai-academic-vibecoding-backups/`，成功后显示备份路径。相同内容不重复更新；符号链接目标不自动替换。备份需保留，需要恢复时先保存当前版本，再将所选备份恢复到原技能位置。

远程安装先 clone 并检查内容，再执行：

```bash
git clone https://github.com/qiaomiaojoe/ai-academic-vibecoding.git
cd ai-academic-vibecoding
bash install.sh --source .
```

不传 --source 时安装脚本会下载远程仓库；本地修改未发布到远程之前，应使用 --source。仅安装最新版 HTML 不会自动升级 skills。重新加载目标平台的 skills 后验证四个技能是否可用；保留旧版不是已经升级。

安装前后状态、差异和备份可以交给 AI 检查。缺少 git/网络时可手动复制技能目录，也必须保护同名定制版本。不要直接用旧的远程安装脚本覆盖本地修改。

## 开始使用

- 已有第一讲项目：“使用 workbench-builder，读取这个项目和已有 HTML，先设计完整功能、场景衔接及验收标准。”
- 已确认设计：“按工作台设计.md 搭建全部已确认场景，在原 HTML 上继续，不另建一份。”
- 修订方法：“使用 skill-forge，按这些期刊要求修订现有方法，保留有效内容，并绑定回设计中的对应场景。”
- 搭建后无需另发测试指令：builder 自动调用 validator，技术问题修复后复测，业务判断或缺失材料如实交回。

场景指令沿用 `context + 方法引用 + 输出约定`。实际页面/方法/业务执行分别验收，生成了指令或安装了 skill 不等于成品功能通过。

## 原型与基础班仓库

原型随 skill 安装：project-setting/原型/ 提供多场景起步 HTML、快照脚本和版本日志模板；workbench-builder/原型/ 的单场景 HTML 仅用于明确需要的兜底。

基础班 [ai-academic-workflow](https://github.com/qiaomiaojoe/ai-academic-workflow) 提供用工作流做研究的方法，进阶班本仓库提供造工作台的方法。skill-forge 在两个仓库中可能同名且内容不同，不能假设可互相覆盖；更新前比较并保留备份，必要时使用项目内方法源。

## 本地验证

安装器有隔离测试，不写入真实全局 skills：

```bash
python3 tests/test_install.py
```

浏览器回归位于 `tests/browser-workbench.js`。在独立测试浏览器打开上级 AI开发工作台.html 的本地预览后，用 Playwright CLI 运行：

```bash
playwright-cli run-code --filename tests/browser-workbench.js
```

该检查临时写入旧版格式的项目列表，结束后恢复原存储；测试使用隔离浏览器，不依赖真实业务材料。

本轮变更和验证结果位于上级开发工作台的版本日志。自动检查不代替投稿/审稿产品的真实业务验收。

## 使用范围

本仓库为课程配套材料。可查看、可个人非商业学习试用；学员获得个人学术研究场景的完整使用授权。禁止再分发、商业使用、去除署名。详见 [LICENSE](LICENSE)。

## v1.3：四张任务卡，设计后搭建并自动试跑

- 第②张卡统一命名“流程设计与搭建”；workflow / subagent 以业务设想或草案输入整合其中，默认留空。
- 默认内容来自项目需求和已有设计，由 AI 提出并说明依据。v1.2 手写的通用示例不再自动预填；浏览器已有自定义配置转成草案，原配置保留。
- 删除独立“流程 · 角色 · 验收”及“试跑与修复”入口，移除验收配置界面。validator 保留为搭建后自动调用的内部工具。
- 运行配置由 builder 生成，生成器与 runtime/ 仍可复用；内部程序检查和必要的人工业务决定保留。
- 草案区源为 assets/designer.html、designer.js；用 `node skills/workbench-builder/scripts/sync-designer.cjs ../AI开发工作台.html` 同步独立 HTML。
- 检查：`node --test tests/runtime.test.cjs`；实际浏览器运行 tests/browser-workbench.js 和 tests/browser-meta.js。生成物运行面板检查见 tests/browser-runtime.js。
- 版本目录只放 HTML 快照与 CHANGELOG；校验 JSON、模拟运行 JSON 放上级 `日志/开发验证/<版本>/`。运行记录属于开发证据，不是学员需配置的文件。

协议详见 [meta-features.md](skills/workbench-builder/references/meta-features.md)。本地源技能更新不自动覆盖全局同名技能。
