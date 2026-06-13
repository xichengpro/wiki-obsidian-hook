# wiki-obsidian-hook

`wiki-obsidian-hook` 是一个面向 **AI 编程助手 / 大模型工具** 的 Obsidian 知识沉淀方案，用于把代码仓库分析、架构理解、调试结论、设计决策和可复用问答整理成 Obsidian 知识图谱。

它不绑定某一个 IDE、模型或平台。只要工具能够做到以下任意一种方式，就可以接入：

- 导出 JSON；
- 调用本地命令；
- 通过 Hook / MCP / 插件机制触发脚本；
- 让模型按固定结构输出内容；
- 手动复制问答内容后交给 CLI 写入。

因此它可以用于 WisCode、Cursor、VS Code AI 插件、Trae、Codex、Claude Code、JetBrains AI、Cline、Continue、Roo Code、自建 LLM 工具、本地模型脚本等任意大模型工作流。

## 解决什么问题

在使用 AI 工具分析代码仓库时，经常会产生一些有价值的信息：

- 这个仓库的整体架构是什么；
- 某个模块负责什么；
- 某个类、函数、配置项为什么这样设计；
- 一个 bug 的根因是什么；
- 某次方案选择背后的取舍是什么；
- 未来很可能还会被问到的仓库问题。

如果这些内容只留在聊天窗口里，后续很难检索、复用和积累。本项目的目标是把这些内容沉淀到 Obsidian，形成按仓库组织、可链接、可检索、可持续更新的知识图谱。

## 核心能力

1. **仓库知识图谱**
   - 仓库总览
   - 技术栈和运行命令
   - 架构说明
   - 模块职责
   - 关键符号
   - 依赖关系
   - 数据流 / 调用链

2. **AI 问答沉淀**
   - 用户问题
   - 模型回答摘要
   - 相关文件和符号
   - 证据位置
   - 后续复用场景

3. **调试和根因记录**
   - 问题现象
   - 排查路径
   - 根因结论
   - 修复建议
   - 后续待办

4. **设计决策记录**
   - 决策背景
   - 最终选择
   - 替代方案
   - 影响和风险

## 项目内容

```text
wiki-obsidian-hook/
  bin/
    obsidian-code-atlas.js          # CLI 工具
  examples/
    capture-payload.json            # JSON payload 示例
  skills/
    obsidian-code-knowledge-graph/
      SKILL.md                      # Skill 说明
      templates/                    # Obsidian 笔记模板
  package.json                      # 本地 bin 注册
  README.md
```

## 推荐 Obsidian 目录结构

建议在 Obsidian vault 中统一使用 `CodeAtlas` 作为知识库根目录，并按仓库隔离：

```text
CodeAtlas/
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

### 为什么每个仓库一个目录

推荐使用“每个仓库一个目录”的方式，原因是：

- 不同仓库的模块名、文件名、问题名可能重复；
- 仓库知识可以独立迁移、重建和归档；
- AI 工具写入时边界明确，不容易污染其他项目；
- Obsidian 中可以通过 `repo/<repo_id>` 标签做跨仓库检索；
- 适合后续扩展到 monorepo、多 package、多服务场景。

### repo_id 命名建议

`repo_id` 是 Obsidian 中识别仓库的稳定 ID，建议按以下优先级生成：

1. Git remote slug，例如 `owner.repo`；
2. 没有 remote 时使用目录名，例如 `wiki-obsidian-hook`；
3. monorepo 可以追加 package 维度，例如 `owner.repo/packages/admin-web`。

## 什么时候应该保存

建议默认使用 **smart 智能触发策略**，不要把所有聊天内容都写入 Obsidian。

### 适合保存的内容

满足任意一条就建议保存：

1. **架构理解**：解释了仓库架构、模块边界、运行流程、依赖关系或关键抽象；
2. **根因定位**：定位了 bug 根因、非显然行为、调试路径或性能瓶颈；
3. **设计决策**：包含方案选择、取舍、替代方案、迁移计划或实现计划；
4. **文件 / 符号地图**：说明了哪些文件、类、函数、配置项分别负责什么；
5. **高复用问题**：未来开发者或 AI 助手很可能再次问到；
6. **显式保存指令**：用户说“保存”“记录”“写到 Obsidian”“加入知识库”等；
7. **代码变更解释**：改动背后的原因、影响面、风险点不是 git diff 能直接看出来的。

### 不建议保存的内容

以下内容通常不需要保存：

1. 临时命令输出；
2. 构建日志；
3. 一次性状态更新；
4. typo、格式、简单样式改动；
5. README 或代码注释里已经清楚写明，且没有额外解释价值的内容；
6. 低置信度、未经验证的猜测；
7. 密钥、token、账号、客户数据、隐私信息等敏感内容。

低置信度但可能有价值的内容，可以先写入：

```text
CodeAtlas/_inbox/ai-captures.md
```

并标记为：

```yaml
status: needs-verification
confidence: low
```

后续再人工整理。

## 三种触发策略

| 策略 | 说明 | 适用场景 |
| --- | --- | --- |
| `manual` | 只有用户明确要求时保存 | 敏感项目、试用阶段 |
| `smart` | 自动保存架构、根因、决策、可复用 Q&A | 日常推荐 |
| `aggressive` | 大部分仓库相关问答先进入 inbox | 集中分析陌生大仓库 |

默认推荐：`smart`。

## 笔记类型

| 类型 | 保存位置 | 用途 |
| --- | --- | --- |
| 仓库总览 | `index.md` | 仓库入口和导航 |
| 仓库画像 | `repo-profile.md` | 技术栈、命令、入口、约定 |
| 架构说明 | `architecture/` | 系统结构、流程、依赖、数据模型 |
| 模块说明 | `modules/` | 子系统 / package / 模块职责 |
| 关键符号 | `symbols/` | 核心类、函数、类型、配置 |
| 普通问答 | `qa/` | 可复用问题和答案 |
| 调查记录 | `investigations/` | 调试、根因、性能、安全等分析 |
| 设计决策 | `decisions/` | ADR 风格的方案取舍 |
| 后续任务 | `tasks/` | 待办、重构建议、跟进项 |
| 来源索引 | `sources/` | 文件索引、命令索引、证据入口 |

## 通用接入协议

不同 AI 工具只需要统一输出或传入下面的 payload：

```json
{
  "repo_path": "/path/to/repo",
  "vault_path": "/path/to/obsidian-vault",
  "repo_id": "owner.repo-or-folder-name",
  "mode": "qa-capture",
  "question": "用户原始问题",
  "answer": "模型回答摘要",
  "related_files": ["src/example.ts:10"],
  "related_symbols": ["ExampleService"],
  "source_tool": "cursor",
  "confidence": "medium",
  "status": "verified"
}
```

### source_tool 建议命名

`source_tool` 只用于标识内容来源，建议使用稳定的小写名称：

```text
wiscode
cursor
vscode-copilot
cline
continue
roo-code
trae
codex
claude-code
jetbrains-ai
custom-llm
```

也可以按团队规范自定义，例如：

```text
internal-agent
local-qwen
local-deepseek
repo-review-bot
```

## CLI 安装

项目已提供本地 CLI：

```bash
node ./bin/obsidian-code-atlas.js --help
```

也可以通过 npm scripts 调用：

```bash
npm run help
```

如果希望在任意目录直接使用 `obsidian-code-atlas`，可以在当前项目目录执行：

```bash
npm link
```

之后即可运行：

```bash
obsidian-code-atlas --help
```

### npm link 后命令找不到怎么办

如果 `npm link` 执行成功，但下面命令没有输出：

```bash
which obsidian-code-atlas
```

通常说明 npm 的全局 bin 目录没有加入当前 shell 的 `PATH`。

先查看 npm 全局安装前缀：

```bash
npm prefix -g
```

npm 全局命令一般会放在：

```text
<npm-prefix>/bin
```

例如，如果 `npm prefix -g` 输出：

```text
/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/nodejs_wheel
```

那么需要加入 PATH 的目录就是：

```text
/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/nodejs_wheel/bin
```

可以先检查命令是否已经被 link 到该目录：

```bash
ls -l "$(npm prefix -g)/bin/obsidian-code-atlas"
```

如果文件存在，把 npm 全局 bin 目录加入 shell 配置。

bash 用户通常写入 `~/.bash_profile`：

```bash
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```

zsh 用户通常写入 `~/.zshrc`：

```bash
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

然后重新验证：

```bash
which obsidian-code-atlas
obsidian-code-atlas --help
```

如果 `which obsidian-code-atlas` 能输出路径，并且 `obsidian-code-atlas --help` 能显示帮助信息，说明全局命令注册成功。

## CLI 使用

### 初始化仓库知识目录

```bash
obsidian-code-atlas bootstrap \
  --repo /path/to/repo \
  --vault /path/to/obsidian-vault \
  --source-tool cursor
```

该命令会创建：

```text
<vault>/CodeAtlas/repositories/<repo_id>/
```

并生成仓库索引、仓库画像、架构占位文档和来源索引。

### 保存普通问答

```bash
obsidian-code-atlas capture \
  --repo /path/to/repo \
  --vault /path/to/obsidian-vault \
  --mode qa-capture \
  --question "这个仓库的 Provider 初始化流程是什么？" \
  --answer "配置先加载，然后注册 Provider，最后创建运行时 session。" \
  --related-file src/config.ts:12 \
  --related-file src/providers/index.ts:30 \
  --source-tool cursor
```

### 保存调试或根因分析

```bash
obsidian-code-atlas capture \
  --repo /path/to/repo \
  --vault /path/to/obsidian-vault \
  --mode investigation-capture \
  --question "为什么登录后 session 丢失？" \
  --answer "cookie domain 与本地回调地址不一致，导致浏览器没有带回 session cookie。" \
  --related-file src/auth/session.ts:42 \
  --confidence high \
  --status verified
```

### 保存设计决策

```bash
obsidian-code-atlas capture \
  --repo /path/to/repo \
  --vault /path/to/obsidian-vault \
  --mode decision-capture \
  --title "Use per-repository Obsidian directories" \
  --question "如何组织多个仓库的知识图谱？" \
  --answer "每个仓库一个目录，跨仓库关系通过标签和 wiki link 连接。" \
  --source-tool custom-llm
```

### 使用 JSON payload

```bash
obsidian-code-atlas capture --payload examples/capture-payload.json
```

适合让 Cursor、VS Code 插件、Hook、自建 Agent 或其他大模型工具自动生成 payload 后统一写入。

## Skill 位置

Skill 定义位于：

```text
skills/obsidian-code-knowledge-graph/SKILL.md
```

模板位于：

```text
skills/obsidian-code-knowledge-graph/templates/
```

该 skill 描述了：

- 目录结构；
- 触发策略；
- 笔记类型；
- frontmatter schema；
- Q&A、investigation、decision 模板；
- bootstrap / capture / update 工作流。

## 推荐工作流

### 第一次接入某个仓库

1. 确认 Obsidian vault 路径；
2. 对目标仓库执行 `bootstrap`；
3. 让 AI 工具分析仓库结构；
4. 将架构结论写入 `architecture/` 和 `modules/`；
5. 后续问答通过 `capture` 持续追加。

### 日常使用

1. 在任意 AI 编程助手中正常提问；
2. 判断回答是否满足 smart 触发策略；
3. 如果值得保存，生成 payload；
4. 调用 `obsidian-code-atlas capture --payload <file>`；
5. 在 Obsidian 中通过仓库目录、标签和 wiki link 检索。

### 多工具协作

不同工具无需共享内部实现，只要遵循同一 payload schema 即可。例如：

- Cursor 负责日常代码问答；
- VS Code 插件负责局部文件解释；
- WisCode 负责项目级重构和验证；
- 自建脚本负责批量扫描仓库；
- 所有结果最终统一写入同一个 `CodeAtlas`。

## 注意事项

- 不要把完整源码大量复制进 Obsidian；应保存结构化理解、证据位置和少量关键摘录。
- 不要保存密钥、token、账号、客户数据等敏感内容。
- 未验证内容应标记 `needs-verification`。
- 已存在相同主题笔记时，应优先更新旧笔记，而不是创建重复笔记。
- 仓库重构后，应及时更新或标记过期内容。

## 后续可扩展方向

- 增加去重逻辑：相似问题自动合并到已有笔记；
- 增加 Obsidian Dataview 查询模板；
- 增加 Mermaid 架构图生成；
- 增加 Cursor / VS Code / JetBrains 的示例 Hook；
- 增加批量仓库扫描和模块索引；
- 增加定期整理 `_inbox` 的自动任务。
