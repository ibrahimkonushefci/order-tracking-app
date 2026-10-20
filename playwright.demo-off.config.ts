import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

/** `pnpm test:demo-off`: checks an app started with DEMO_MODE=false (README → Checks). No server is started here. */
export default defineConfig({
  testDir: 'tests/demo-off',
  workers: 1,
  use: { baseURL: process.env.DEMO_OFF_URL || 'http://127.0.0.1:3200' },
  projects: [{ name: 'laptop', use: { ...devices['Desktop Chrome'] } }],
});
