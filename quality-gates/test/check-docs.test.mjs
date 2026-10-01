import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkDocs } from '../bin/check-docs.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'docs-gate-'));
  mkdirSync(join(root, '.ai'));
  mkdirSync(join(root, 'docs'));
  writeFileSync(join(root, 'AGENTS.md'), '');
  for (const name of ['rules', 'architecture', 'workflow', 'overview', 'conventions', 'module-template']) {
    writeFileSync(join(root, '.ai', `${name}.md`), '');
  }
  writeFileSync(join(root, 'CONTRACT-TESTS.md'), '');
  writeFileSync(join(root, 'docs', 'project-profile.md'), '');
  writeFileSync(join(root, 'docs', 'test-inventory.md'), '');
  writeFileSync(join(root, '.architecture-checks.json'), '{}');
  try { return run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('accepts valid local links and rule references', () => fixture(root => {
  writeFileSync(join(root, 'AGENTS.md'), '[Rules](.ai/rules.md) R-02 §27A\n');
  writeFileSync(join(root, '.ai/rules.md'), '## 2. Boundary (R-02)\n');
  writeFileSync(join(root, '.ai/architecture.md'), '# 27A. Contract\n');
  assert.deepEqual(checkDocs(root), []);
}));

test('reports broken links, missing rule IDs, and unbalanced fences', () => fixture(root => {
  writeFileSync(join(root, 'AGENTS.md'), '[Gone](missing.md) R-99\n```ts\n');
  const errors = checkDocs(root).join('\n');
  assert.match(errors, /broken link/);
  assert.match(errors, /R-99/);
  assert.match(errors, /unbalanced code fence/);
}));

test('reports missing architecture section referenced by AGENTS', () => fixture(root => {
  writeFileSync(join(root, 'AGENTS.md'), 'Read §27A\n');
  writeFileSync(join(root, '.ai/architecture.md'), '# 27. Public API\n');
  assert.match(checkDocs(root).join('\n'), /§27A/);
}));

test('checks workflow references against workflow headings', () => fixture(root => {
  writeFileSync(join(root, 'AGENTS.md'), '| Task | `workflow.md` §58 |\n');
  writeFileSync(join(root, '.ai/architecture.md'), '# 58. Architecture section\n');
  writeFileSync(join(root, '.ai/workflow.md'), '## 57. Workflow section\n');
  assert.match(checkDocs(root).join('\n'), /missing workflow section §58/);
}));

test('fails when a required standard document is absent', () => fixture(root => {
  rmSync(join(root, '.ai', 'rules.md'));
  assert.match(checkDocs(root).join('\n'), /missing required file .*rules.md/);
}));

test('rejects stale project and database context', () => fixture(root => {
  writeFileSync(join(root, '.ai', 'overview.md'), 'Legacy Customer v2 on MSSQL.\n');
  const errors = checkDocs(root).join('\n');
  assert.match(errors, /stale standard context Customer v2/);
  assert.match(errors, /stale standard context MSSQL/);
}));
