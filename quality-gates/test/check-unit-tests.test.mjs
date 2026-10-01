import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkUnitTests } from '../bin/check-unit-tests.mjs';

function fixture(files, run) {
  const root = mkdtempSync(join(tmpdir(), 'unit-layout-gate-'));
  try {
    for (const [path, content] of Object.entries(files)) {
      const full = join(root, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    return run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('accepts a unit test in a sibling __tests__ directory', () => fixture({
  'src/modules/invoice/domain/entities/invoice.ts': 'export class Invoice {}',
  'src/modules/invoice/domain/entities/__tests__/invoice.unit.spec.ts': 'it("works", () => {});',
}, root => assert.deepEqual(checkUnitTests(root), [])));

test('accepts a package-level unit test backed by its index', () => fixture({
  'src/application/pagination/index.ts': 'export const pagination = true;',
  'src/application/pagination/__tests__/pagination.unit.spec.ts': 'it("works", () => {});',
}, root => assert.deepEqual(checkUnitTests(root), [])));

test('rejects a unit test next to its source file', () => fixture({
  'src/modules/invoice/domain/entities/invoice.ts': 'export class Invoice {}',
  'src/modules/invoice/domain/entities/invoice.unit.spec.ts': 'it("works", () => {});',
}, root => assert.match(checkUnitTests(root).join('\n'), /UNIT_TEST_LOCATION/)));

test('rejects a unit test without a sibling subject file', () => fixture({
  'src/modules/invoice/domain/entities/__tests__/invoice.unit.spec.ts': 'it("works", () => {});',
}, root => assert.match(checkUnitTests(root).join('\n'), /UNIT_TEST_SUBJECT/)));

test('does not classify integration tests as unit tests', () => fixture({
  'src/modules/invoice/infrastructure/repository.integration.spec.ts': 'it("works", () => {});',
}, root => assert.deepEqual(checkUnitTests(root), [])));

test('uses the configured source root', () => fixture({
  '.architecture-checks.json': JSON.stringify({ sourceRoot: 'apps/api/src' }),
  'apps/api/src/invoice/invoice.ts': 'export class Invoice {}',
  'apps/api/src/invoice/invoice.unit.spec.ts': 'it("works", () => {});',
}, root => assert.match(checkUnitTests(root).join('\n'), /UNIT_TEST_LOCATION/)));

test('rejects a newly added legacy spec name', () => fixture({
  'src/feature.ts': 'export const feature = 1;',
  'src/feature.spec.ts': 'it("works", () => {});',
}, root => assert.match(checkUnitTests(root).join('\n'), /UNCLASSIFIED_TEST/)));

test('allows an inventoried legacy unit test during migration', () => fixture({
  '.architecture-checks.json': JSON.stringify({ legacyUnitTests: ['src/feature.spec.ts'] }),
  'src/feature.ts': 'export const feature = 1;',
  'src/feature.spec.ts': 'it("works", () => {});',
}, root => assert.deepEqual(checkUnitTests(root), [])));

test('requires removing a legacy entry after the file is migrated', () => fixture({
  '.architecture-checks.json': JSON.stringify({ legacyUnitTests: ['src/feature.spec.ts'] }),
  'src/feature.ts': 'export const feature = 1;',
  'src/__tests__/feature.unit.spec.ts': 'it("works", () => {});',
}, root => assert.match(checkUnitTests(root).join('\n'), /STALE_LEGACY_TEST/)));
