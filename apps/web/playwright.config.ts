import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  workers: 2,
  reporter: [['list']],
  use: { baseURL: process.env.PW_BASE_URL ?? 'http://localhost:3100', browserName: 'chromium' },
  webServer: process.env.PW_BASE_URL ? undefined : {
    command: 'npx next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { NEXT_PUBLIC_AGENT_API_URL: 'http://localhost:8787' },
  },
});
