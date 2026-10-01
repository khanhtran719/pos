import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function specFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', 'dist', 'build', 'coverage'].includes(entry.name)) {
      files.push(...specFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(path);
    }
  }
  return files;
}

export function checkUnitTests(root) {
  root = resolve(root);
  const configPath = join(root, '.architecture-checks.json');
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const sourceRoots = config.sourceRoots ?? [config.sourceRoot ?? 'src'];
  const files = sourceRoots.flatMap(path => specFiles(resolve(root, path)));
  const legacy = new Set(config.legacyUnitTests ?? []);
  const seenLegacy = new Set();
  const errors = [];
  for (const file of files) {
    const label = relative(root, file);
    if (!file.endsWith('.unit.spec.ts')) {
      if (file.endsWith('.integration.spec.ts')) continue;
      if (legacy.has(label)) seenLegacy.add(label);
      else errors.push(`${label} UNCLASSIFIED_TEST: rename as unit/integration or add to legacyUnitTests inventory`);
      continue;
    }
    if (basename(dirname(file)) !== '__tests__') {
      errors.push(`${label} UNIT_TEST_LOCATION: place unit tests in a sibling __tests__ directory`);
      continue;
    }
    const stem = basename(file, '.unit.spec.ts');
    const sourceDir = dirname(dirname(file));
    const packageIndex = stem === basename(sourceDir) && existsSync(join(sourceDir, 'index.ts'));
    if (!packageIndex && !['.ts', '.tsx'].some(ext => existsSync(join(sourceDir, stem + ext)))) {
      errors.push(`${label} UNIT_TEST_SUBJECT: expected ${stem}.ts or ${stem}.tsx beside __tests__`);
    }
  }
  for (const label of legacy) {
    if (!seenLegacy.has(label)) errors.push(`${label} STALE_LEGACY_TEST: remove the entry after renaming or deleting the old spec`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const errors = checkUnitTests(process.argv[2] ?? process.cwd());
    if (errors.length) {
      for (const error of errors) process.stderr.write(`${error}\n`);
      process.exitCode = 1;
    } else process.stdout.write('Unit test layout checks passed.\n');
  } catch (error) {
    process.stderr.write(`Unit test layout checker failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}
