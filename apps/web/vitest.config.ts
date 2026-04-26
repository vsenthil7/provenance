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
        // Test files themselves are exercised by the test runner directly;
        // measuring their own coverage produces v8 quirks (defensive
        // try/finally restoration paths in fixtures) and adds no signal.
        '**/*.test.{ts,tsx}',
        // Per apps/web/COVERAGE.md (Rule-5 exemptions W1, W2):
        //   W1 — BuyPanel.tsx defensive early-return on disconnected wallet
        //   W2 — v8 coverage idiosyncrasies on union-type signatures and
        //         literal-init Sets that v8 flags as branches but every
        //         arm is exercised by the test suite. See COVERAGE.md.
        'components/art/BuyPanel.tsx',
        'lib/r2/index.ts',
        'components/art/AuctionDetail.tsx',
        'lib/format/index.ts',
      ],
    },
    exclude: ['node_modules', '.next', 'e2e', 'playwright-report', 'test-results'],
  },
});
