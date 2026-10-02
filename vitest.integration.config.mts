import path from 'node:path';

import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.spec.ts'],
    globals: true,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(root, 'libs/shared/src/index.ts'),
      '@infrastructure': path.resolve(root, 'libs/infrastructure/src/index.ts'),
    },
  },
});
