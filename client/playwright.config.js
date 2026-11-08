import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/responsive',
  fullyParallel: true,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'npm run preview --prefix client -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
