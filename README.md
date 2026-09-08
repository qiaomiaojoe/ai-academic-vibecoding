# AI学术工作台开发 · 「AI学术训练营·进阶班」skills 库（乔淼PhD）

> 「**AI学术训练营·进阶班｜AI学术工作台开发**」（乔淼PhD）配套的 skills 库。
> 基础班教你**用工作流做研究**，进阶班教你**造工作流这件事本身**——本仓库装的就是"造"的那批 skill。
>
> **谁在用**：AI学术训练营·进阶班学员

> **关于仓库名里的 vibecoding**
> 进阶班全程**零代码**：改工作台是把 HTML 拖给 Claude Code / Codex，用大白话说"哪个部件、想要什么行为"，
> 像跟一个人类程序员沟通——这正是 vibe coding。
> 但学术场景的 vibe coding 有一个别处没有的重点：**你亲手写的不是代码，是 skill，写的是学术判断。**
> 界面可以说人话让 AI 改，方法不行——那部分没人能替你写。

---

## 一行安装

```bash
curl -fsSL https://raw.githubusercontent.com/qiaomiaojoe/ai-academic-vibecoding/main/install.sh | bash
```

脚本会自动认出你装的是 Claude Code（`~/.claude/skills/`）还是 Codex（`${CODEX_HOME:-$HOME/.codex}/skills/`），两个都有就都装。装完重启一次，`cd` 进你想放项目的目录，说「**帮我建开发项目**」——AI 会开始问你问题。

> 装不上（没有 git、网络不通）就手动：clone 本仓库，把 `skills/` 下每个含 `SKILL.md` 的目录拷进上面那个全局目录。

---

## 和基础班仓库的关系

两个仓库分工不交叉，进阶班学员通常两个都装：

| 仓库 | 装的是什么 | 一句话 |
|------|-----------|--------|
| [`ai-academic-workflow`](https://github.com/qiaomiaojoe/ai-academic-workflow) | 选题 / 文献搜索 / 文献分析 / 研究设计 / 数据分析 / 全文初稿的成套 skills | **用工作流做研究** |
| **`ai-academic-vibecoding`**（本仓库） | 造工作台、造 skill 的 skills | **造工作流本身** |

**进阶班五讲只需要本仓库**，不装另一个也能跑完。装上那个仓库的好处是多三十多个现成 skill 当范例——写自己的 skill 时照着看，比听讲十遍管用。

> `skill-forge` 两个仓库里都有（本仓库是第 3 讲要用的那份）。重复安装会互相覆盖成同一份，不影响使用。

---

## Skills 树

三个 skill 对应前三讲，一讲一个：

| Skill | 对应 | 用途 |
|-------|------|------|
| [`project-setting`](skills/project-setting/SKILL.md) | **第 1 讲** | 项目规格教练：分轮拷问你（**每一问都先给你草案**，你只改 / 认 / 说不知道）→ 建文件夹体系 + 写 `AGENTS.md` + `CLAUDE.md` 指针 → 从原型拷一个**起步工作台**（入口 + 三张空场景卡）并配好版本管理。第二种用法：给已经臃肿的 `AGENTS.md` 做减法 |
| [`workbench-builder`](skills/workbench-builder/SKILL.md) | **第 2 讲** | 工作台搭建教练：访谈你 → 把你的方法整理成一份 `SKILL.md` → **往你工作台的空场景卡里装真场景**（不另生成文件）。也能加新卡，或只打磨 skill 不动 HTML |
| [`skill-forge`](skills/skill-forge/SKILL.md) | **第 3 讲** | skill 工坊：从源材料（教科书章节 / 方法论文 / 你的笔记）造出成品 skill 的 5 阶段 2 停点链路。硬约束与软建议分开写，软约束词保留原词不许升级成"必须" |

**原型随 skill 一起装**，不用另外找文件：

- [`project-setting/原型/`](skills/project-setting/原型/) —— 多场景工作台原型 + `快照.sh` + CHANGELOG 模板
- [`workbench-builder/原型/`](skills/workbench-builder/原型/) —— 单场景原型（兜底用：没上过第 1 讲、或工作台丢了）

> **随课增加。** 第 4、5 讲用到的 skill 会陆续进本仓库；重跑一次上面那行安装命令就是更新。

---

## 一个场景长什么样

进阶班的工作台，一个场景只有三个部件：

```
部件① 交互输入   收变量的交互零件：tab切换 / 文本框 / 下拉菜单 / 勾选框 / 上传 .md
部件② skill      场景的学术逻辑，固化成一份 SKILL.md；HTML 只"引用"它
部件③ prompt生成  两个机械件：context（来自部件①）+ 落盘

        prompt = context  +  调用你的 skill  +  落盘
                 (机械)       (你的方法)        (机械)
```

三张卡共享一个「入口」——项目名、领域、一句话主题填一次，每张卡生成 prompt 时自动带上。

**学术判断全在 skill 里**——那是你的方法、你的品位、你的底线。`workbench-builder` 的职责是把它从你脑子里访谈出来、写成文件，**不替你发明**：你说不清的地方它标 `【待补】`留给你，不用通用学术流程填充。

**改工作台不用会代码**：把 HTML 拖给 Claude Code / Codex，说清楚**哪个部件 + 想要什么行为**就行。要你亲手写的是 skill，写的是学术判断。

---

## 使用范围

本仓库是「AI学术训练营」配套培训材料，**公开是为了学员安装方便，不等于开放授权**。
可查看、可个人非商业学习试用；学员获得个人学术研究场景的完整使用授权。
**禁止再分发、禁止商业使用、禁止去除署名。** 详见 [LICENSE](LICENSE)。

商业合作与授权咨询：微信公众号「乔淼PhD」。
