import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const DEFAULTS = {
  sourceRoot: 'src',
  modulesDir: 'src/modules',
  sharedDir: 'src/shared',
  publicCrossModulePrefixes: ['application/facades/', 'application/ports/', 'application/queries/', 'public/'],
  excludedFileNames: ['.spec.ts', '.test.ts', '.e2e-spec.ts'],
  domainForbiddenPackages: ['@nestjs/', 'typeorm', 'ioredis', 'redis', 'kafkajs', 'axios', 'express', 'fastify'],
  applicationForbiddenPackages: ['typeorm', '@nestjs/typeorm', 'ioredis', 'redis', 'kafkajs', 'axios'],
};

function loadConfig(root) {
  const path = join(root, '.architecture-checks.json');
  const overrides = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  return { ...DEFAULTS, ...overrides };
}

function configuredPaths(root, config, plural, singular) {
  return (config[plural] ?? [config[singular]]).filter(Boolean).map(path => resolve(root, path));
}

function loadCompilerOptions(root) {
  const configFile = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (!configFile) return { baseUrl: root, allowJs: true };
  const read = ts.readConfigFile(configFile, ts.sys.readFile);
  if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(configFile));
  if (parsed.errors.length) throw new Error(parsed.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
  return { ...parsed.options, allowJs: true };
}

function sourceFiles(dir, exclusions) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build', 'coverage', '__tests__'].includes(entry.name)) files.push(...sourceFiles(path, exclusions));
    } else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name) && !exclusions.some(suffix => entry.name.endsWith(suffix))) files.push(path);
  }
  return files;
}

function importSpecifiers(sourceFile) {
  const found = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      found.push({ specifier: node.moduleSpecifier.text, pos: node.getStart(sourceFile), kind: ts.isExportDeclaration(node) ? 'export' : 'import' });
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
      found.push({ specifier: node.moduleReference.expression.text, pos: node.getStart(sourceFile), kind: 'import' });
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      found.push({ specifier: node.arguments[0].text, pos: node.getStart(sourceFile), kind: 'import' });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function moduleInfo(path, modulesDir) {
  const rel = relative(modulesDir, path);
  if (rel.startsWith('..' + sep) || rel === '..' || rel.startsWith(sep)) return null;
  const segments = rel.split(sep);
  if (segments.length < 2) return null;
  return { module: segments[0], layer: segments[1], internal: segments.slice(1).join('/') };
}

function architecturalInfo(path, modulesDirs, sharedDirs) {
  for (const modulesDir of modulesDirs) {
    const business = moduleInfo(path, modulesDir);
    if (business) {
      return {
        ...business,
        moduleName: business.module,
        module: `${modulesDir}:${business.module}`,
      };
    }
  }
  for (const sharedDir of sharedDirs) {
    const rel = relative(sharedDir, path);
    if (rel.startsWith('..' + sep) || rel === '..' || rel.startsWith(sep)) continue;
    const segments = rel.split(sep);
    if (segments.length >= 2) {
      return {
        module: `__shared__:${sharedDir}`,
        moduleName: '__shared__',
        layer: segments[0],
        internal: segments.slice(1).join('/'),
      };
    }
  }
  return null;
}

function matchesPackage(specifier, patterns) {
  return patterns.some(pattern => specifier === pattern || specifier.startsWith(pattern.endsWith('/') ? pattern : pattern + '/'));
}

function isWithin(path, parent) {
  const rel = relative(parent, path);
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !rel.startsWith(sep));
}

function directChild(path, parent) {
  if (!isWithin(path, parent)) return null;
  return relative(parent, path).split(sep)[0] || null;
}

function resolveImport(specifier, file, options, host) {
  const resolved = ts.resolveModuleName(specifier, file, options, host).resolvedModule?.resolvedFileName;
  if (resolved) return resolve(resolved);
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(file), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function publicCrossModule(info, config) {
  return info.internal === 'index.ts' || info.internal === `${info.moduleName}.module.ts` || config.publicCrossModulePrefixes.some(prefix => info.internal.startsWith(prefix));
}

export function checkBoundaries(root) {
  root = resolve(root);
  const config = loadConfig(root);
  const modulesDirs = configuredPaths(root, config, 'moduleRoots', 'modulesDir');
  const sharedDirs = configuredPaths(root, config, 'sharedRoots', 'sharedDir');
  const infrastructureDirs = configuredPaths(root, config, 'infrastructureRoots', 'infrastructureDir');
  const sourceRoots = configuredPaths(root, config, 'sourceRoots', 'sourceRoot');
  const appsDir = resolve(root, config.appsDir ?? 'apps');
  const files = sourceRoots.flatMap(path => sourceFiles(path, config.excludedFileNames));
  if (files.length === 0) return ['NO_SOURCE_FILES: no source files found under configured roots'];
  const options = loadCompilerOptions(root);
  const host = ts.createCompilerHost(options);
  const violations = [];
  for (const file of files) {
    const sourceInfo = architecturalInfo(file, modulesDirs, sharedDirs);
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const { specifier, pos, kind } of importSpecifiers(source)) {
      const resolved = resolveImport(specifier, file, options, host);
      const targetInfo = resolved ? architecturalInfo(resolved, modulesDirs, sharedDirs) : null;
      const line = source.getLineAndCharacterOfPosition(pos).line + 1;
      const label = `${relative(root, file)}:${line}`;
      const sourceApp = directChild(file, appsDir);
      const targetApp = resolved ? directChild(resolved, appsDir) : null;
      if (sourceApp && targetApp && sourceApp !== targetApp) {
        violations.push(`${label} CROSS_APP_IMPORT: ${specifier}`);
      }
      if (resolved && sharedDirs.some(dir => isWithin(file, dir)) &&
          infrastructureDirs.some(dir => isWithin(resolved, dir))) {
        violations.push(`${label} SHARED_TO_INFRASTRUCTURE: ${specifier}`);
      }
      if (!sourceInfo) continue;
      if (sourceInfo.layer === 'domain' && matchesPackage(specifier, config.domainForbiddenPackages)) {
        violations.push(`${label} DOMAIN_PACKAGE: ${specifier}`);
      }
      if (sourceInfo.layer === 'application' && matchesPackage(specifier, config.applicationForbiddenPackages)) {
        violations.push(`${label} APPLICATION_PACKAGE: ${specifier}`);
      }
      if (!targetInfo) continue;
      if (kind === 'export' && ['index.ts', 'public/index.ts'].includes(sourceInfo.internal) &&
          (targetInfo.internal.startsWith('infrastructure/') || /(^|\/)repositories\/|orm-entity/.test(targetInfo.internal))) {
        violations.push(`${label} PUBLIC_EXPORT_PRIVATE: ${specifier}`);
      }
      if (sourceInfo.module.startsWith('__shared__:') && !targetInfo.module.startsWith('__shared__:')) {
        violations.push(`${label} SHARED_TO_MODULE: ${specifier}`);
      } else if (!sourceInfo.module.startsWith('__shared__:') && !targetInfo.module.startsWith('__shared__:') && sourceInfo.module !== targetInfo.module && !publicCrossModule(targetInfo, config)) {
        violations.push(`${label} CROSS_MODULE_PRIVATE: ${specifier}`);
      }
      if ((sourceInfo.layer === 'domain' && targetInfo.layer !== 'domain') ||
          (sourceInfo.layer === 'application' && ['infrastructure', 'presentation'].includes(targetInfo.layer)) ||
          (sourceInfo.layer === 'presentation' && targetInfo.layer === 'infrastructure')) {
        violations.push(`${label} LAYER_DIRECTION: ${specifier}`);
      }
    }
  }
  return violations;
}

export function normalizeViolation(violation) {
  return violation.replace(/^(.*?):\d+ ([A-Z_]+: .*)$/, '$1 $2');
}

export function compareBoundaryViolations(actual, expected) {
  const remaining = new Map();
  for (const violation of expected) {
    remaining.set(violation, (remaining.get(violation) ?? 0) + 1);
  }
  const newViolations = [];
  let knownCount = 0;
  for (const violation of actual) {
    if (violation.startsWith('NO_SOURCE_FILES:')) {
      newViolations.push(violation);
      continue;
    }
    const key = normalizeViolation(violation);
    const count = remaining.get(key) ?? 0;
    if (count === 0) newViolations.push(violation);
    else {
      remaining.set(key, count - 1);
      knownCount++;
    }
  }
  const resolvedViolations = [];
  for (const [violation, count] of remaining) {
    for (let index = 0; index < count; index++) resolvedViolations.push(violation);
  }
  return { newViolations, resolvedViolations, knownCount };
}

export function checkBoundaryGate(root) {
  root = resolve(root);
  const actual = checkBoundaries(root);
  const baselinePath = join(root, '.architecture-boundary-baseline.json');
  if (!existsSync(baselinePath)) {
    return { ...compareBoundaryViolations(actual, []), baselineUsed: false };
  }
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  if (baseline.version !== 1 || !Array.isArray(baseline.violations) ||
      !baseline.violations.every(value => typeof value === 'string')) {
    throw new Error('invalid boundary baseline format');
  }
  return { ...compareBoundaryViolations(actual, baseline.violations), baselineUsed: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = checkBoundaryGate(process.argv[2] ?? process.cwd());
    if (result.newViolations.length || result.resolvedViolations.length) {
      for (const error of result.newViolations) process.stderr.write(`NEW_BOUNDARY: ${error}\n`);
      for (const error of result.resolvedViolations) process.stderr.write(`STALE_BOUNDARY_BASELINE: ${error}\n`);
      process.exitCode = 1;
    } else if (result.baselineUsed) {
      process.stdout.write(`No new boundary violations; ${result.knownCount} existing baseline finding(s) remain.\n`);
    } else process.stdout.write('Boundary checks passed.\n');
  } catch (error) {
    process.stderr.write(`Boundary checker failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}
