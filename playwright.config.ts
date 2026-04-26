import { defineConfig } from '@playwright/test';

const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL ?? 'http://localhost:8080';
const REMOTE_BASE_URL =
  process.env.REMOTE_BASE_URL ?? 'https://piemonte-site-5rjgg.ondigitalocean.app';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  expect: {
    timeout: 10_000,
  },
  // Share visual snapshots across the local and remote projects. The card
  // markup is identical in both deploys; without this template, each project
  // would maintain its own baseline directory.
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'local',
      use: {
        baseURL: LOCAL_BASE_URL,
      },
    },
    {
      name: 'remote',
      use: {
        baseURL: REMOTE_BASE_URL,
      },
    },
  ],
});
