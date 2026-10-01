import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function markdownFiles(root) {
  const files = [];
  const entry = join(root, 'AGENTS.md');
  if (existsSync(entry)) files.push(entry);
  const ai = join(root, '.ai');
  function visit(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
    }
  }
  visit(ai);
  for (const relativePath of ['CONTRACT-TESTS.md', 'docs/project-profile.md', 'docs/test-inventory.md']) {
    const path = join(root, relativePath);
    if (existsSync(path)) files.push(path);
  }
  return files;
}

function anchors(text) {
  const slugs = new Set();
  const repeats = new Map();
  for (const line of text.split(/\r?\n/)) {
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const base = heading[1].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
    const count = repeats.get(base) ?? 0;
    slugs.add(count ? `${base}-${count}` : base);
    repeats.set(base, count + 1);
  }
  return slugs;
}

function checkFences(text) {
  let open = null;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line);
    if (!fence) continue;
    if (!open) open = { char: fence[1][0], size: fence[1].length, line: index + 1 };
    else if (fence[1][0] === open.char && fence[1].length >= open.size) open = null;
  }
  return open;
}

export function checkDocs(root) {
  root = resolve(root);
  const files = markdownFiles(root);
  const errors = [];
  for (const required of ['AGENTS.md', '.ai/rules.md', '.ai/architecture.md', '.ai/workflow.md', '.ai/overview.md', '.ai/conventions.md', '.ai/module-template.md', 'CONTRACT-TESTS.md', 'docs/project-profile.md', 'docs/test-inventory.md', '.architecture-checks.json']) {
    if (!existsSync(join(root, required))) errors.push(`missing required file ${required}`);
  }

  const textByFile = new Map(files.map(file => [file, readFileSync(file, 'utf8')]));
  const staleStandardPattern = /360 Customer|Customer v2|MSSQL|SQL Server|v1 migration|docs\/migration\.md/gi;
  for (const [file, text] of textByFile) {
    for (const match of text.matchAll(staleStandardPattern)) {
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      errors.push(`${file.slice(root.length + 1)}:${line}: stale standard context ${match[0]}`);
    }
  }
  const rules = textByFile.get(join(root, '.ai', 'rules.md')) ?? '';
  const architecture = textByFile.get(join(root, '.ai', 'architecture.md')) ?? '';
  const declaredRules = new Set([...rules.matchAll(/^##\s+\d+[A-Z]?\.\s+.*?\((R-\d{2})\)/gm)].map(match => match[1]));
  const declaredArchitecture = new Set([...architecture.matchAll(/^#\s+(\d+[A-Z]?)\.\s/gm)].map(match => match[1]));
  const workflow = textByFile.get(join(root, '.ai', 'workflow.md')) ?? '';
  const declaredWorkflow = new Set([...workflow.matchAll(/^##\s+(\d+[A-Z]?)\.\s/gm)].map(match => match[1]));
  if (declaredRules.size !== [...rules.matchAll(/^##\s+\d+[A-Z]?\.\s+.*?\((R-\d{2})\)/gm)].length) {
    errors.push('.ai/rules.md: duplicate rule ID');
  }

  for (const [file, text] of textByFile) {
    const label = file.slice(root.length + 1);
    const openFence = checkFences(text);
    if (openFence) errors.push(`${label}:${openFence.line}: unbalanced code fence`);
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].trim();
      if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#')) continue;
      const [path, fragment] = target.split('#', 2);
      const resolved = resolve(dirname(file), decodeURIComponent(path));
      if (!existsSync(resolved) || !statSync(resolved).isFile()) {
        errors.push(`${label}: broken link ${target}`);
      } else if (fragment && !anchors(readFileSync(resolved, 'utf8')).has(decodeURIComponent(fragment))) {
        errors.push(`${label}: missing anchor ${target}`);
      }
    }
  }

  const agent = textByFile.get(join(root, 'AGENTS.md')) ?? '';
  for (const match of agent.matchAll(/R-\d{2}/g)) {
    if (!declaredRules.has(match[0])) errors.push(`AGENTS.md: missing rule ID ${match[0]}`);
  }
  for (const line of agent.split(/\r?\n/)) {
    for (const segment of line.split(';')) {
      const isWorkflow = segment.includes('workflow.md');
      const declared = isWorkflow ? declaredWorkflow : declaredArchitecture;
      const name = isWorkflow ? 'workflow' : 'architecture';
      for (const match of segment.matchAll(/§{1,2}\s*(\d+[A-Z]?)(?:\s*[–-]\s*(\d+[A-Z]?))?/g)) {
        for (const number of [match[1], match[2]].filter(Boolean)) {
          if (!declared.has(number)) errors.push(`AGENTS.md: missing ${name} section §${number}`);
        }
      }
    }
  }
  return [...new Set(errors)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.argv[2] ?? process.cwd();
  const errors = checkDocs(root);
  if (errors.length) {
    for (const error of errors) process.stderr.write(`${error}\n`);
    process.exitCode = 1;
  } else process.stdout.write(`Documentation checks passed (${basename(resolve(root))}).\n`);
}
