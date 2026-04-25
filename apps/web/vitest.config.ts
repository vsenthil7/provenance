import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // 100% gates per Operating Rule 4
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      exclude: [
        'app/**/layout.tsx',
        'app/**/page.tsx', // pages are e2e-tested via Playwright
        'lib/api/types.ts', // type definitions only
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        '**/__mocks__/**',
        // exemptions managed in apps/web/COVERAGE.md
      ],
    },
    exclude: ['node_modules', '.next', 'e2e', 'playwright-report', 'test-results'],
  },
});
