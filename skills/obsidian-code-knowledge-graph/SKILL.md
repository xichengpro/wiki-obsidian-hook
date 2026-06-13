---
name: obsidian-code-knowledge-graph
description: 为代码仓库构建并维护 Obsidian 知识图谱，沉淀仓库架构、模块、关键符号、设计决策，以及来自 AI 编程助手的可复用问答。
---

# Obsidian 代码仓库知识图谱 Skill

当用户希望理解、记录或持续维护某个代码仓库的知识时，使用这个 skill。

这个 skill 主要负责两件事：

1. 构建仓库知识图谱：包括架构、模块、数据流、关键符号、工程约定、设计决策和变更历史。
2. 沉淀 AI 辅助分析产生的高价值问答：支持 WisCode、Cursor、VS Code AI 插件、Trae、Codex、Claude Code、JetBrains AI、自建 LLM 脚本或其他任意 AI 编程助手。

## 输入参数

只有在无法从上下文推断时才询问用户。

- `repo_path`：本地仓库路径，默认使用当前工作目录。
- `vault_path`：Obsidian vault 根目录，默认使用 `/Users/dubingnan/Obsidian Vault`。
- `repo_id`：稳定的仓库 ID。优先使用 Git remote slug，例如 `owner.repo`；如果没有 remote，则使用目录名。
- `question`：可选，要保存的用户问题。
- `answer`：可选，要保存的模型回答或摘要。
- `mode`：保存模式，可选值包括 `bootstrap`、`update`、`qa-capture`、`decision-capture`、`investigation-capture`。
- `source_tool`：可选，来源工具标识。默认使用 `manual`；也可以使用 `wiscode`、`cursor`、`vscode-copilot`、`cline`、`continue`、`roo-code`、`trae`、`codex`、`claude-code`、`jetbrains-ai`、`custom-llm` 等。

## 默认行为

当用户在目标代码仓库中说出类似下面的话时：

- “初始化 Obsidian 知识图谱”
- “给这个仓库创建知识图谱”
- “初始化 code atlas”
- “把这个仓库接入 Obsidian”
- “用这个 skill 初始化当前仓库”

AI 助手应直接执行初始化，不需要再询问 vault 路径或 source_tool，除非用户明确指定其他值。

默认值：

```text
repo_path = 当前工作目录
vault_path = /Users/dubingnan/Obsidian Vault
source_tool = manual
mode = bootstrap
```

推荐执行命令：

```bash
obsidian-code-atlas bootstrap \
  --repo "$PWD" \
  --vault "/Users/dubingnan/Obsidian Vault" \
  --source-tool manual
```

如果当前环境没有注册 `obsidian-code-atlas` 命令，但可以访问本项目脚本，则使用：

```bash
node /Users/dubingnan/workCode/xichengpro/wiki-obsidian-hook/bin/obsidian-code-atlas.js bootstrap \
  --repo "$PWD" \
  --vault "/Users/dubingnan/Obsidian Vault" \
  --source-tool manual
```

初始化完成后，向用户报告创建或已存在的 Obsidian 目录和关键文件。

## 核心原则

- 不要把大量原始源码直接复制进 Obsidian，应保存稳定理解、证据位置、链接和少量关键摘录。
- 优先创建小而互相关联的笔记，而不是一个巨大的总文档。
- 每个仓库使用独立目录。
- frontmatter 字段保持稳定，方便后续用 Obsidian Dataview 查询。
- 只保存未来可复用的知识，不保存每一次普通闲聊或临时过程信息。
- 如果不确定一段问答是否值得保存，可以询问用户，或先写入 `_inbox` 等待后续整理。
- 不要保存密钥、token、账号、客户数据、隐私信息或其他敏感内容。

## 推荐 Obsidian 目录结构

在 Obsidian vault 中创建如下目录：

```text
<vault_path>/CodeAtlas/
  _index.md
  _inbox/
    ai-captures.md
  repositories/
    <repo_id>/
      index.md
      repo-profile.md
      architecture/
        overview.md
        runtime-flow.md
        dependency-map.md
        data-model.md
        api-surface.md
      modules/
        <module-name>.md
      symbols/
        <symbol-name>.md
      decisions/
        YYYY-MM-DD-<decision-slug>.md
      investigations/
        YYYY-MM-DD-<question-slug>.md
      qa/
        YYYY-MM-DD-<question-slug>.md
      tasks/
        YYYY-MM-DD-<task-slug>.md
      sources/
        files.md
        commands.md
```

对于大型 monorepo，可以在仓库目录下增加 package 层级：

```text
repositories/<repo_id>/packages/<package-name>/...
```

## 触发策略：什么时候保存 AI 问答

当至少满足以下任意条件时，建议保存：

1. 回答解释了仓库架构、模块边界、运行流程、依赖关系或关键抽象。
2. 回答定位了 bug 根因、异常机制、非显然行为或调试路径。
3. 回答记录了设计决策、技术取舍、被拒绝的替代方案、迁移计划或实现计划。
4. 回答建立了文件、模块、类、函数、配置项与职责之间的映射。
5. 未来开发者或 AI 助手很可能再次问到相同或类似问题。
6. 用户明确说“保存”“记录”“写到 Obsidian”“加入知识库”“记住”等。
7. AI 完成了代码修改，并且最终说明中包含 git diff 本身无法直接表达的原因、风险或影响面。

以下情况不要自动保存：

1. 只是临时命令输出、构建日志、typo 修复、格式调整或一次性状态更新。
2. 回答属于未经验证的猜测。
3. 内容完全可以从 README 或代码注释中直接得到，且没有额外解释价值。
4. 内容包含密钥、token、账号、客户数据、隐私信息或敏感事故细节。
5. 回答置信度较低。此时如有保留价值，应写入 `_inbox/ai-captures.md`，并标记 `status: needs-verification`。

如果用户询问“什么时候触发保存”，推荐三档策略：

- `manual`：只有用户明确要求保存或记录时才保存。
- `smart`：保存稳定架构、根因、决策和可复用 Q&A。默认推荐此策略。
- `aggressive`：大部分仓库相关问答先进入 inbox，再定期整理。

## 笔记类型

### 仓库索引

路径：`repositories/<repo_id>/index.md`

用途：仓库知识入口。

应包含：

- 仓库名和本地路径；
- 仓库的高层目标；
- 当前理解状态；
- 指向架构、模块、决策、调查记录和 Q&A 的链接。

### 仓库画像

路径：`repositories/<repo_id>/repo-profile.md`

用途：保存稳定仓库元信息。

应包含语言栈、包管理器、主要入口、测试命令、运行命令、文档入口和 owner 线索。

### 架构笔记

用于保存稳定结构知识：

- `architecture/overview.md`：系统地图和关键概念。
- `architecture/runtime-flow.md`：请求、任务、事件或运行时流程。
- `architecture/dependency-map.md`：模块依赖和集成点。
- `architecture/data-model.md`：持久化实体、schema 和核心数据结构。
- `architecture/api-surface.md`：公开 API、CLI、端点或扩展点。

### 模块笔记

路径：`modules/<module-name>.md`

每个重要模块、package 或子系统创建一篇笔记。记录职责、关键文件、关键符号、依赖关系、不变量和常见修改点。

### 符号笔记

路径：`symbols/<symbol-name>.md`

只为核心类、函数、类型、配置项创建。记录签名、职责、调用关系、注意事项和源码链接。

### Q&A 笔记

路径：`qa/YYYY-MM-DD-<question-slug>.md`

用于保存可复用的问题和答案，但不一定是完整调查。

### 调查笔记

路径：`investigations/YYYY-MM-DD-<question-slug>.md`

用于调试、根因分析、性能分析、安全审查或复杂代码探索。

### 决策笔记

路径：`decisions/YYYY-MM-DD-<decision-slug>.md`

用于架构或实现决策。建议采用 ADR 风格：背景、决策、替代方案、影响。

## Frontmatter Schema

尽量使用如下 frontmatter：

```yaml
---
type: repo-index | repo-profile | architecture | module | symbol | qa | investigation | decision | task | source-index
repo: <repo_id>
repo_path: <repo_path>
title: <title>
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: draft | verified | needs-verification | stale
source_tools: [<source_tool>]
source_models: []
tags:
  - code-atlas
  - repo/<repo_id>
related_files: []
related_symbols: []
related_notes: []
confidence: high | medium | low
---
```

## 模板

### Q&A 笔记模板

```markdown
---
type: qa
repo: <repo_id>
repo_path: <repo_path>
title: <short question>
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: verified
source_tools: [<source_tool>]
tags: [code-atlas, repo/<repo_id>, qa]
related_files: []
related_symbols: []
confidence: medium
---

# <short question>

## Question

<原始问题或规范化后的问题>

## Short Answer

<2-5 句话的简短答案>

## Evidence

- `<file_path>:<line>` — <这条证据说明了什么>

## Details

<可长期复用的详细解释>

## Reuse Cues

当出现以下场景时，可以重新查看这篇笔记：

- <未来复用场景>

## Related

- [[../index|Repository index]]
```

### 调查笔记模板

```markdown
---
type: investigation
repo: <repo_id>
repo_path: <repo_path>
title: <investigation title>
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: verified
source_tools: [<source_tool>]
tags: [code-atlas, repo/<repo_id>, investigation]
related_files: []
related_symbols: []
confidence: high
---

# <investigation title>

## Problem

<正在调查的问题>

## Conclusion

<根因或最终结论>

## Evidence

- `<file_path>:<line>` — <证据>

## Reasoning Path

1. <推理步骤>
2. <推理步骤>

## Fix / Recommendation

<修复建议或行动建议>

## Follow-ups

- [ ] <后续事项>
```

### 决策笔记模板

```markdown
---
type: decision
repo: <repo_id>
repo_path: <repo_path>
title: <decision title>
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: accepted
source_tools: [<source_tool>]
tags: [code-atlas, repo/<repo_id>, decision]
related_files: []
related_symbols: []
confidence: high
---

# <decision title>

## Context

<为什么需要这个决策>

## Decision

<最终决定是什么>

## Alternatives Considered

- <替代方案> — <为什么没有选择>

## Consequences

- Positive: <正向影响>
- Negative / Risk: <负面影响或风险>

## Review Date

YYYY-MM-DD
```

## 工作流：初始化仓库知识图谱

如果用户没有提供额外参数，按以下默认值初始化：

```text
repo_path = 当前工作目录
vault_path = /Users/dubingnan/Obsidian Vault
source_tool = manual
```

优先使用已注册命令：

```bash
obsidian-code-atlas bootstrap --repo "$PWD" --vault "/Users/dubingnan/Obsidian Vault" --source-tool manual
```

如果命令不存在，使用绝对路径脚本：

```bash
node /Users/dubingnan/workCode/xichengpro/wiki-obsidian-hook/bin/obsidian-code-atlas.js bootstrap --repo "$PWD" --vault "/Users/dubingnan/Obsidian Vault" --source-tool manual
```

然后继续：

1. 确定 `repo_path`、`repo_id`、主要语言、包管理器和顶层目录结构。
2. 阅读 README、项目配置、文档入口和主要运行入口。
3. 生成或更新：
   - `repositories/<repo_id>/index.md`
   - `repositories/<repo_id>/repo-profile.md`
   - 架构概览笔记
   - 重要模块笔记
   - `sources/files.md`
4. 使用 Obsidian wiki link 建立笔记之间的链接。
5. 标记置信度和验证状态。
6. 对未检查的区域列入 `Unknowns`，不要猜测。

## 工作流：保存用户问题

1. 判断问题和回答是否符合触发策略。
2. 将问题规范化成简短标题和 slug。
3. 选择笔记类型：
   - 可复用解释 -> `qa/`
   - 调试或根因 -> `investigations/`
   - 架构或实现选择 -> `decisions/`
   - 实施跟进项 -> `tasks/`
4. 尽量加入 `file:line` 形式的源码证据。
5. 链接到仓库索引、相关模块、相关符号和历史 Q&A。
6. 如果结论未经验证，设置 `status: needs-verification` 和 `confidence: low`。

## 工作流：更新已有知识

创建新笔记前：

1. 先搜索该仓库的 Obsidian 目录，确认是否已有相关笔记。
2. 如果已有笔记覆盖同一主题，优先更新旧笔记，而不是创建重复笔记。
3. 对历史结论可保留其上下文，但应明确标记已过期部分。
4. 添加 “Updated on YYYY-MM-DD” 小节，记录新的证据和结论。

## 建议的自动化 Hook

默认使用 `smart` 策略：

- 完成仓库架构分析后：保存架构或模块笔记。
- 回答带有文件证据的仓库问题后：保存 Q&A 笔记。
- 完成非平凡 bug 调试后：保存调查笔记。
- 做出实现方案或架构方案选择后：保存决策笔记。
- 完成代码修改后：只保存有价值的原因、影响面和知识更新，不保存完整 diff。

跨工具接入时，可以使用一个接收 JSON 的 CLI。这个集成方式与具体工具无关：任何 AI 工具只要能导出 payload、调用本地命令、触发 hook，或让模型输出该 schema，都可以接入：

```json
{
  "repo_path": "/path/to/repo",
  "vault_path": "/path/to/obsidian-vault",
  "mode": "qa-capture",
  "source_tool": "cursor",
  "question": "Why does X happen?",
  "answer": "...",
  "related_files": ["src/a.ts:10"]
}
```

## 输出要求

当这个 skill 写入或更新笔记后，应向用户报告：

- 创建了哪些文件；
- 更新了哪些文件；
- 跳过了哪些内容以及原因；
- 当前结论的置信度；
- 建议下一步索引或整理的目标。
