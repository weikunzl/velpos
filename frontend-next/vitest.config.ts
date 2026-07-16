import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/shared/**/*.ts', 'src/shared/**/*.tsx'],
      exclude: [
        'src/shared/**/*.test.*',
        'src/shared/**/*.spec.*',
        'src/shared/**/__tests__/**',
        'src/shared/**/*.d.ts',
        'src/shared/api/wsClient.ts',
        'src/shared/types/**',
      ],
      thresholds: {
        lines: 100,
        branches: 80,
        functions: 95,
        statements: 100,
      },
    },
  },
})
