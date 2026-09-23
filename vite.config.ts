import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/crypto-lab-point-ledger/',
  test: {
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/ledger.ts', 'src/dialog.ts', 'src/fuzz.ts', 'src/kickmix-toy.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});