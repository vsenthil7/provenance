import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 100, branches: 100, functions: 100, statements: 100,
      },
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',           // entrypoint — covered by integration test
        'src/migrate.ts',         // requires a real Postgres; covered by integration test
        'src/schema.graphql.ts',  // type defs only
        '**/*.d.ts',
        '**/test/**',
      ],
    },
    exclude: ['node_modules', 'dist', '.ponder'],
  },
});
