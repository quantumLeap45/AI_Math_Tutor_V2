/**
 * Vitest Configuration
 * AI Math Tutor V2
 *
 * Comprehensive test configuration with coverage thresholds and proper aliases.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'happy-dom',

    // Global setup files
    setupFiles: ['./src/__tests__/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.d.ts',
        'src/types/',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/chat/page.tsx',
      ],
      // Coverage thresholds - enforce comprehensive testing
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },

    // Test file patterns
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'out'],

    // Timeout for tests
    testTimeout: 10000,

    // Global configuration
    globals: true,
    mockReset: true,
    restoreMocks: true,

    // Reporter configuration
    reporters: ['default', 'html'],

    // Display options
    onConsoleLog: (log) => {
      if (log.includes('⚠️')) {
        // Suppress expected warnings in tests
        return false;
      }
    },
  },

  // Path aliases (matching tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
