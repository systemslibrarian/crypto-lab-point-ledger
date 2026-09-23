import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 90000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4679/crypto-lab-point-ledger/',
    viewport: { width: 1280, height: 900 },
    colorScheme: 'dark',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4679 --strictPort',
    url: 'http://localhost:4679/crypto-lab-point-ledger/',
    reuseExistingServer: false,
    timeout: 120000,
  },
});