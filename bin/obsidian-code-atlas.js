#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const TODAY = new Date().toISOString().slice(0, 10);

function printHelp() {
  console.log(`obsidian-code-atlas

Usage:
  obsidian-code-atlas capture --payload ./capture.json
  obsidian-code-atlas capture --repo /path/to/repo --vault /path/to/vault --question "..." --answer "..."
  obsidian-code-atlas bootstrap --repo /path/to/repo --vault /path/to/vault

Commands:
  capture     Capture a Q&A, investigation, decision, or task note.
  bootstrap   Create the base Obsidian directory and repository index notes.

Options:
  --payload <file>       JSON payload file.
  --repo <path>          Local repository path.
  --vault <path>         Obsidian vault root path.
  --repo-id <id>         Stable repository id. Defaults to git remote slug or folder name.
  --mode <mode>          qa-capture | investigation-capture | decision-capture | task-capture.
  --question <text>      User question.
  --answer <text>        Assistant answer or summary.
  --title <text>         Note title.
  --source-tool <name>   Source tool name, e.g. wiscode, cursor, vscode-copilot, trae, codex.
  --confidence <level>   high | medium | low.
  --status <status>      verified | needs-verification | draft.
  --related-file <item>  Related file, can be repeated. Example: src/a.ts:10.
  --related-symbol <s>   Related symbol, can be repeated.
  --help                 Show this help.
`);
}

function parseArgs(argv) {
  const args = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2);
    if (key === 'help') {
      args.help = true;
      continue;
    }

    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      args[key] = true;
      continue;
    }

    i += 1;

    if (key === 'related-file' || key === 'related-symbol') {
      args[key] = args[key] || [];
      args[key].push(value);
    } else {
      args[key] = value;
    }
  }

  return args;
}

function readJson(filePath) {
  const resolved = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function writeFileIfMissing(filePath, content) {
  if (fileExists(filePath)) {
    return false;
  }

  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function appendUnique(filePath, line) {
  const current = fileExists(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (current.includes(line)) {
    return false;
  }

  const next = current.endsWith('\n') || current.length === 0 ? current + line + '\n' : current + '\n' + line + '\n';
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function normalizePayload(args) {
  const payload = args.payload ? readJson(args.payload) : {};
  const merged = {
    ...payload,
    repo_path: args.repo || payload.repo_path,
    vault_path: args.vault || payload.vault_path,
    repo_id: args['repo-id'] || payload.repo_id,
    mode: args.mode || payload.mode,
    question: args.question || payload.question,
    answer: args.answer || payload.answer,
    title: args.title || payload.title,
    source_tool: args['source-tool'] || payload.source_tool,
    confidence: args.confidence || payload.confidence,
    status: args.status || payload.status,
    related_files: args['related-file'] || payload.related_files || [],
    related_symbols: args['related-symbol'] || payload.related_symbols || [],
  };

  merged.repo_path = merged.repo_path ? path.resolve(merged.repo_path) : process.cwd();
  merged.vault_path = merged.vault_path ? path.resolve(merged.vault_path) : undefined;
  merged.mode = merged.mode || 'qa-capture';
  merged.source_tool = merged.source_tool || 'unknown';
  merged.confidence = merged.confidence || 'medium';
  merged.status = merged.status || (merged.confidence === 'low' ? 'needs-verification' : 'verified');
  merged.related_files = Array.isArray(merged.related_files) ? merged.related_files : [merged.related_files].filter(Boolean);
  merged.related_symbols = Array.isArray(merged.related_symbols) ? merged.related_symbols : [merged.related_symbols].filter(Boolean);

  return merged;
}

function requireFields(payload, fields) {
  const missing = fields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.join(', ')}`);
  }
}

function runGit(repoPath, command) {
  try {
    return execSync(command, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_) {
    return '';
  }
}

function inferRepoId(repoPath) {
  const remote = runGit(repoPath, 'git config --get remote.origin.url');
  const match = remote.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
  if (match) {
    return match[1].replace('/', '.');
  }

  return path.basename(repoPath);
}

function slugify(input) {
  const text = String(input || 'untitled')
    .trim()
    .toLowerCase()
    .replace(/[一-龥]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  if (text) {
    return text;
  }

  return crypto.createHash('sha1').update(String(input || 'untitled')).digest('hex').slice(0, 10);
}

function yamlArray(items) {
  if (!items || items.length === 0) {
    return '[]';
  }

  return `[${items.map((item) => JSON.stringify(item)).join(', ')}]`;
}

function repoRoot(vaultPath, repoId) {
  return path.join(vaultPath, 'CodeAtlas', 'repositories', repoId);
}

function notePathFor(payload) {
  const title = payload.title || payload.question || 'untitled';
  const slug = slugify(title);
  const root = repoRoot(payload.vault_path, payload.repo_id);

  if (payload.mode === 'investigation-capture') {
    return path.join(root, 'investigations', `${TODAY}-${slug}.md`);
  }

  if (payload.mode === 'decision-capture') {
    return path.join(root, 'decisions', `${TODAY}-${slug}.md`);
  }

  if (payload.mode === 'task-capture') {
    return path.join(root, 'tasks', `${TODAY}-${slug}.md`);
  }

  return path.join(root, 'qa', `${TODAY}-${slug}.md`);
}

function frontmatter(payload, type, title) {
  return `---
type: ${type}
repo: ${payload.repo_id}
repo_path: ${payload.repo_path}
title: ${JSON.stringify(title)}
created: ${TODAY}
updated: ${TODAY}
status: ${payload.status}
source_tools: [${payload.source_tool}]
source_models: []
tags: [code-atlas, repo/${payload.repo_id}, ${type}]
related_files: ${yamlArray(payload.related_files)}
related_symbols: ${yamlArray(payload.related_symbols)}
related_notes: []
confidence: ${payload.confidence}
---`;
}

function evidenceBlock(payload) {
  if (!payload.related_files || payload.related_files.length === 0) {
    return '- 暂未记录文件证据。';
  }

  return payload.related_files.map((item) => `- \`${item}\` — 相关证据`).join('\n');
}

function createQaNote(payload) {
  const title = payload.title || payload.question || '未命名问答';
  return `${frontmatter(payload, 'qa', title)}

# ${title}

## 问题

${payload.question || title}

## 简短回答

${payload.answer || '暂未记录回答。'}

## 证据

${evidenceBlock(payload)}

## 详细说明

${payload.details || payload.answer || '暂未记录详细说明。'}

## 复用场景

当未来问题涉及相同文件、符号或行为时，可以重新查看这篇笔记。

## 相关笔记

- [[../index|仓库索引]]
`;
}

function createInvestigationNote(payload) {
  const title = payload.title || payload.question || '未命名调查';
  return `${frontmatter(payload, 'investigation', title)}

# ${title}

## 问题

${payload.question || title}

## 结论

${payload.answer || '暂未记录结论。'}

## 证据

${evidenceBlock(payload)}

## 推理路径

${payload.reasoning || '1. 该记录来自一次 AI 辅助的仓库分析。'}

## 修复 / 建议

${payload.recommendation || '暂未记录建议。'}

## 后续事项

- [ ] 必要时复核并补充这篇调查笔记。
`;
}

function createDecisionNote(payload) {
  const title = payload.title || payload.question || '未命名决策';
  return `${frontmatter(payload, 'decision', title)}

# ${title}

## 背景

${payload.question || title}

## 决策

${payload.answer || '暂未记录决策。'}

## 备选方案

${payload.alternatives || '- 暂未记录。'}

## 影响

${payload.consequences || '- 正向影响：知识被沉淀，便于后续复用。\n- 风险：该笔记后续可能需要复核。'}

## 复审日期

${payload.review_date || TODAY}
`;
}

function createTaskNote(payload) {
  const title = payload.title || payload.question || '未命名任务';
  return `${frontmatter(payload, 'task', title)}

# ${title}

## 任务

${payload.question || title}

## 背景

${payload.answer || '暂未记录背景。'}

## 相关证据

${evidenceBlock(payload)}

## 检查清单

- [ ] 完成任务
- [ ] 如果实现改变了架构或行为，更新仓库知识图谱
`;
}

function createRepoIndex(payload) {
  const repoName = path.basename(payload.repo_path);
  return `---
type: repo-index
repo: ${payload.repo_id}
repo_path: ${payload.repo_path}
title: ${JSON.stringify(repoName)}
created: ${TODAY}
updated: ${TODAY}
status: draft
source_tools: [${payload.source_tool}]
source_models: []
tags: [code-atlas, repo/${payload.repo_id}]
related_files: []
related_symbols: []
related_notes: []
confidence: medium
---

# ${repoName}

## 仓库目标

仓库知识入口。请在完成仓库分析后补充该仓库的业务目标、技术目标和核心职责。

## 当前地图

- [[repo-profile|仓库画像]]
- [[architecture/overview|架构概览]]
- [[architecture/runtime-flow|运行流程]]
- [[architecture/dependency-map|依赖地图]]
- [[architecture/data-model|数据模型]]
- [[architecture/api-surface|API / 接口面]]

## 重要模块

-

## 重要决策

-

## 最近调查

-

## 可复用问答

-

## 待补充

- [ ] 补充仓库目标和架构地图。
`;
}

function createRepoProfile(payload) {
  const remote = runGit(payload.repo_path, 'git config --get remote.origin.url') || 'unknown';
  const branch = runGit(payload.repo_path, 'git branch --show-current') || 'unknown';
  return `---
type: repo-profile
repo: ${payload.repo_id}
repo_path: ${payload.repo_path}
title: 仓库画像
created: ${TODAY}
updated: ${TODAY}
status: draft
source_tools: [${payload.source_tool}]
tags: [code-atlas, repo/${payload.repo_id}, profile]
related_files: []
related_symbols: []
confidence: medium
---

# 仓库画像

## 元信息

- 本地路径：\`${payload.repo_path}\`
- 远程仓库：${remote}
- 当前分支：${branch}
- 主要语言：待补充
- 包管理器：待补充

## 入口文件

-

## 运行命令

\`\`\`bash
# 补充已验证的运行命令
\`\`\`

## 测试命令

\`\`\`bash
# 补充已验证的测试命令
\`\`\`

## 文档来源

- README：
- Docs：

## 工程约定

-

## 给未来 AI 助手的提示

-
`;
}

function createArchitectureStub(payload, name, title) {
  return `---
type: architecture
repo: ${payload.repo_id}
repo_path: ${payload.repo_path}
title: ${JSON.stringify(title)}
created: ${TODAY}
updated: ${TODAY}
status: draft
source_tools: [${payload.source_tool}]
tags: [code-atlas, repo/${payload.repo_id}, architecture]
related_files: []
related_symbols: []
confidence: low
---

# ${title}

## 摘要

等待仓库分析后补充。

## 笔记

-

## 相关笔记

- [[../index|仓库索引]]
`;
}

function bootstrap(payload) {
  requireFields(payload, ['repo_path', 'vault_path']);
  payload.repo_id = payload.repo_id || inferRepoId(payload.repo_path);

  const root = repoRoot(payload.vault_path, payload.repo_id);
  const created = [];

  [
    root,
    path.join(root, 'architecture'),
    path.join(root, 'modules'),
    path.join(root, 'symbols'),
    path.join(root, 'decisions'),
    path.join(root, 'investigations'),
    path.join(root, 'qa'),
    path.join(root, 'tasks'),
    path.join(root, 'sources'),
    path.join(payload.vault_path, 'CodeAtlas', '_inbox'),
  ].forEach(ensureDir);

  const files = [
    [path.join(payload.vault_path, 'CodeAtlas', '_index.md'), '# CodeAtlas\n\n## 仓库列表\n'],
    [path.join(payload.vault_path, 'CodeAtlas', '_inbox', 'ai-captures.md'), '# AI 捕获收件箱\n\n这里用于暂存低置信度、尚未整理或需要复核的 AI 分析记录。\n'],
    [path.join(root, 'index.md'), createRepoIndex(payload)],
    [path.join(root, 'repo-profile.md'), createRepoProfile(payload)],
    [path.join(root, 'architecture', 'overview.md'), createArchitectureStub(payload, 'overview', '架构概览')],
    [path.join(root, 'architecture', 'runtime-flow.md'), createArchitectureStub(payload, 'runtime-flow', '运行流程')],
    [path.join(root, 'architecture', 'dependency-map.md'), createArchitectureStub(payload, 'dependency-map', '依赖地图')],
    [path.join(root, 'architecture', 'data-model.md'), createArchitectureStub(payload, 'data-model', '数据模型')],
    [path.join(root, 'architecture', 'api-surface.md'), createArchitectureStub(payload, 'api-surface', 'API / 接口面')],
    [path.join(root, 'sources', 'files.md'), '# 源码文件\n\n等待仓库分析后补充。\n'],
    [path.join(root, 'sources', 'commands.md'), '# 命令\n\n用于记录已验证的运行、测试、构建和维护命令。\n'],
  ];

  files.forEach(([filePath, content]) => {
    if (writeFileIfMissing(filePath, content)) {
      created.push(filePath);
    }
  });

  appendUnique(path.join(payload.vault_path, 'CodeAtlas', '_index.md'), `- [[repositories/${payload.repo_id}/index|${payload.repo_id}]]`);

  return { repo_id: payload.repo_id, root, created };
}

function capture(payload) {
  requireFields(payload, ['repo_path', 'vault_path']);
  payload.repo_id = payload.repo_id || inferRepoId(payload.repo_path);
  bootstrap(payload);

  const notePath = notePathFor(payload);
  let content;

  if (payload.mode === 'investigation-capture') {
    content = createInvestigationNote(payload);
  } else if (payload.mode === 'decision-capture') {
    content = createDecisionNote(payload);
  } else if (payload.mode === 'task-capture') {
    content = createTaskNote(payload);
  } else {
    content = createQaNote(payload);
  }

  if (fileExists(notePath)) {
    const suffix = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex').slice(0, 8);
    const parsed = path.parse(notePath);
    const uniquePath = path.join(parsed.dir, `${parsed.name}-${suffix}${parsed.ext}`);
    fs.writeFileSync(uniquePath, content, 'utf8');
    return { repo_id: payload.repo_id, created: [uniquePath], duplicate_renamed_from: notePath };
  }

  ensureDir(path.dirname(notePath));
  fs.writeFileSync(notePath, content, 'utf8');
  return { repo_id: payload.repo_id, created: [notePath] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (args.help || !command) {
    printHelp();
    return;
  }

  const payload = normalizePayload(args);
  let result;

  if (command === 'bootstrap') {
    result = bootstrap(payload);
  } else if (command === 'capture') {
    result = capture(payload);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
