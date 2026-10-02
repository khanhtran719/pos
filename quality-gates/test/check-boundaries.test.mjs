import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { test } from 'node:test';
import { checkBoundaries } from '../bin/check-boundaries.mjs';

function fixture(files, run) {
  const root = mkdtempSync(join(tmpdir(), 'boundary-gate-'));
  try {
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@app/*': ['src/*'] } } }));
    for (const [path, content] of Object.entries(files)) {
      const full = join(root, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    return run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('allows a public facade and same-module domain import', () => fixture({
  'src/modules/a/application/use-cases/run.ts': "import { BFacade } from '@app/modules/b/application/facades/b.facade'; import type { A } from '../../domain/a';",
  'src/modules/a/domain/a.ts': 'export interface A {}',
  'src/modules/b/application/facades/b.facade.ts': 'export class BFacade {}',
}, root => assert.deepEqual(checkBoundaries(root), [])));

test('allows a cross-module Nest module import through the module root', () => fixture({
  'src/modules/a/a.module.ts': "import { BModule } from '../b/b.module'; export class AModule {}",
  'src/modules/b/b.module.ts': 'export class BModule {}',
}, root => assert.deepEqual(checkBoundaries(root), [])));

test('rejects domain framework imports and application TypeORM imports', () => fixture({
  'src/modules/a/domain/a.ts': "import { Injectable } from '@nestjs/common';",
  'src/modules/a/application/use-cases/run.ts': "import { Repository } from 'typeorm';",
}, root => {
  const violations = checkBoundaries(root).join('\n');
  assert.match(violations, /DOMAIN_PACKAGE/);
  assert.match(violations, /APPLICATION_PACKAGE/);
}));

test('rejects cross-module private imports including type-only imports', () => fixture({
  'src/modules/a/application/use-cases/run.ts': "import type { B } from '@app/modules/b/infrastructure/b';",
  'src/modules/b/infrastructure/b.ts': 'export interface B {}',
}, root => assert.match(checkBoundaries(root).join('\n'), /CROSS_MODULE_PRIVATE/)));

test('rejects application imports from its own infrastructure', () => fixture({
  'src/modules/a/application/run.ts': "import { Db } from '../infrastructure/db';",
  'src/modules/a/infrastructure/db.ts': 'export class Db {}',
}, root => assert.match(checkBoundaries(root).join('\n'), /LAYER_DIRECTION/)));

test('checks string-literal dynamic imports', () => fixture({
  'src/modules/a/domain/a.ts': "const loaded = import('../infrastructure/db');",
  'src/modules/a/infrastructure/db.ts': 'export const db = 1;',
}, root => assert.match(checkBoundaries(root).join('\n'), /LAYER_DIRECTION/)));

test('rejects exporting an ORM entity through a public barrel', () => fixture({
  'src/modules/a/index.ts': "export { AOrmEntity } from './infrastructure/a.orm-entity';",
  'src/modules/a/infrastructure/a.orm-entity.ts': 'export class AOrmEntity {}',
}, root => assert.match(checkBoundaries(root).join('\n'), /PUBLIC_EXPORT_PRIVATE/)));

test('rejects domain imports from shared infrastructure', () => fixture({
  'src/modules/a/domain/a.ts': "import { cache } from '@app/shared/infrastructure/cache';",
  'src/shared/infrastructure/cache.ts': 'export const cache = 1;',
}, root => assert.match(checkBoundaries(root).join('\n'), /LAYER_DIRECTION/)));

test('rejects shared code depending on a business module', () => fixture({
  'src/shared/application/helper.ts': "import { A } from '@app/modules/a/domain/a';",
  'src/modules/a/domain/a.ts': 'export class A {}',
}, root => assert.match(checkBoundaries(root).join('\n'), /SHARED_TO_MODULE/)));

test('rejects imports between deployable apps', () => fixture({
  '.architecture-checks.json': JSON.stringify({
    sourceRoots: ['apps'],
    moduleRoots: ['apps/central/src/modules', 'apps/ipos/src/modules'],
    sharedRoots: ['libs/shared/src'],
    appsDir: 'apps',
  }),
  'apps/central/src/modules/a/application/run.ts': "import { B } from '../../../../../ipos/src/modules/b/domain/b';",
  'apps/ipos/src/modules/b/domain/b.ts': 'export class B {}',
}, root => assert.match(checkBoundaries(root).join('\n'), /CROSS_APP_IMPORT/)));

test('rejects shared kernel imports from shared infrastructure', () => fixture({
  '.architecture-checks.json': JSON.stringify({
    sourceRoots: ['libs'],
    moduleRoots: [],
    sharedRoots: ['libs/shared/src'],
    infrastructureRoots: ['libs/infrastructure/src'],
  }),
  'libs/shared/src/application/run.ts': "import { Db } from '../../../infrastructure/src/db';",
  'libs/infrastructure/src/db.ts': 'export class Db {}',
}, root => assert.match(checkBoundaries(root).join('\n'), /SHARED_TO_INFRASTRUCTURE/)));

test('fails if no source files are found', () => fixture({}, root => {
  assert.match(checkBoundaries(root).join('\n'), /NO_SOURCE_FILES/);
}));
