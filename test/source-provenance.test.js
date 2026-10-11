const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const cli = path.resolve(__dirname, '../bin/obsidian-code-atlas.js');

function git(dir, ...args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
}

test('capture records the reviewed HEAD and starts in needs-verification', (t) => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'code-atlas-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const repo = path.join(base, 'source');
  const vault = path.join(base, 'vault');
  fs.mkdirSync(repo);
  fs.mkdirSync(vault);
  git(repo, 'init', '-b', 'main');
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'user.email', 'test@example.invalid');
  fs.writeFileSync(path.join(repo, 'main.js'), 'const ready = true;\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'initial');
  const commit = git(repo, 'rev-parse', 'HEAD');
  const output = JSON.parse(execFileSync(process.execPath, [cli, 'capture', '--repo', repo, '--vault', vault,
    '--question', 'Where does it start?', '--answer', 'In main.js.', '--related-file', 'main.js:1'], { encoding: 'utf8' }));
  const note = fs.readFileSync(output.created[0], 'utf8');
  assert.match(note, new RegExp(`source_commit: "${commit}"`));
  assert.match(note, /source_worktree_dirty: false/);
  assert.match(note, /status: needs-verification/);
  fs.writeFileSync(path.join(repo, 'main.js'), 'const ready = false;\n');
  const dirtyOutput = JSON.parse(execFileSync(process.execPath, [cli, 'capture', '--repo', repo, '--vault', vault,
    '--question', 'What changed?', '--answer', 'The worktree changed.'], { encoding: 'utf8' }));
  assert.match(fs.readFileSync(dirtyOutput.created[0], 'utf8'), /source_worktree_dirty: true/);
});
