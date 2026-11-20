import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e', timeout: 180000, workers: 1,
  use: { actionTimeout: 10000, baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5189', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure', launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {} },
})
