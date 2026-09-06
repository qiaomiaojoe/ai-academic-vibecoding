# AI学术工作台开发 · 「AI学术训练营·进阶班」skills 库（乔淼PhD）

> 「**AI学术训练营·进阶班｜AI学术工作台开发**」（乔淼PhD）配套的 skills 库。
> 基础班教你**用工作流做研究**，进阶班教你**造工作流这件事本身**——本仓库装的就是"造"的那批 skill。
>
> **谁在用**：AI学术训练营·进阶班学员

---

## 一行安装

```bash
curl -fsSL https://raw.githubusercontent.com/qiaomiaojoe/ai-academic-workbench/main/install.sh | bash
```

脚本会自动认出你装的是 Claude Code（`~/.claude/skills/`）还是 Codex（`${CODEX_HOME:-$HOME/.codex}/skills/`），两个都有就都装。装完重启一次，然后在你的项目目录里说「**帮我搭我的工作台**」。

> 装不上（没有 git、网络不通）就手动：clone 本仓库，把 `skills/` 下每个含 `SKILL.md` 的目录拷进上面那个全局目录。

---

## 和基础班仓库的关系

两个仓库分工不交叉，进阶班学员通常两个都装：

| 仓库 | 装的是什么 | 一句话 |
|------|-----------|--------|
| [`ai-academic-workflow`](https://github.com/qiaomiaojoe/ai-academic-workflow) | 选题 / 文献搜索 / 文献分析 / 研究设计 / 数据分析 / 全文初稿的成套 skills | **用工作流做研究** |
| **`ai-academic-workbench`**（本仓库） | 造工作台、造 skill 的 skills | **造工作流本身** |

没上过基础班也能用本仓库——但装上那个仓库，你会多一批现成的 skill 当范例，知道"一个立得住的 skill 长什么样"。

---

## Skills 树

### 造工作台

| Skill | 用途 |
|-------|------|
| [`workbench-builder`](skills/workbench-builder/SKILL.md) | 工作台搭建教练：访谈你 → 把你的方法整理成一份 `SKILL.md` → 生成引用它的单场景 HTML。也能给已有工作台加场景卡，或只打磨 skill 不动 HTML。**单场景原型随 skill 一起装**（[`原型/单场景工作台-原型.html`](skills/workbench-builder/原型/单场景工作台-原型.html)），装完即可用，不用另外找文件 |

> **随课增加。** 进阶班五讲各有产出，后续讲次用到的 skill 会陆续进本仓库；重跑一次上面那行安装命令就是更新。

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

**学术判断全在 skill 里**——那是你的方法、你的品位、你的底线。`workbench-builder` 的职责是把它从你脑子里访谈出来、写成文件，**不替你发明**：你说不清的地方它标 `【待补】`留给你，不用通用学术流程填充。

**改工作台不用会代码**：把 HTML 拖给 Claude Code / Codex，说清楚**哪个部件 + 想要什么行为**就行。要你亲手写的是 skill，写的是学术判断。

---

## 使用范围

本仓库是「AI学术训练营」配套培训材料，**公开是为了学员安装方便，不等于开放授权**。
可查看、可个人非商业学习试用；学员获得个人学术研究场景的完整使用授权。
**禁止再分发、禁止商业使用、禁止去除署名。** 详见 [LICENSE](LICENSE)。

商业合作与授权咨询：微信公众号「乔淼PhD」。
