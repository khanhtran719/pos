import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareBoundaryViolations, normalizeViolation } from '../bin/check-boundaries.mjs';

test('normalizes source line changes without hiding the import target', () => {
  assert.equal(
    normalizeViolation('src/modules/a/application/a.ts:12 LAYER_DIRECTION: ../infrastructure/db'),
    'src/modules/a/application/a.ts LAYER_DIRECTION: ../infrastructure/db',
  );
});

test('rejects a new violation while allowing a recorded one', () => {
  const expected = ['src/modules/a/application/a.ts LAYER_DIRECTION: ../infrastructure/db'];
  const actual = [
    'src/modules/a/application/a.ts:19 LAYER_DIRECTION: ../infrastructure/db',
    'src/modules/b/application/b.ts:2 LAYER_DIRECTION: ../infrastructure/db',
  ];
  const result = compareBoundaryViolations(actual, expected);
  assert.equal(result.knownCount, 1);
  assert.match(result.newViolations.join('\n'), /modules\/b/);
  assert.deepEqual(result.resolvedViolations, []);
});

test('requires retiring baseline entries after refactoring', () => {
  const expected = ['src/modules/a/application/a.ts LAYER_DIRECTION: ../infrastructure/db'];
  const result = compareBoundaryViolations([], expected);
  assert.deepEqual(result.newViolations, []);
  assert.deepEqual(result.resolvedViolations, expected);
});

test('does not allow a missing source root to be grandfathered', () => {
  const result = compareBoundaryViolations(['NO_SOURCE_FILES: no source files found under src'],
    ['NO_SOURCE_FILES: no source files found under src']);
  assert.match(result.newViolations.join('\n'), /NO_SOURCE_FILES/);
});
