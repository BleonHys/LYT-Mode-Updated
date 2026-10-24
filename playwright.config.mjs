import { defineConfig } from '@playwright/test';
const artifacts = process.env.ARTIFACT_ROOT || 'output/playwright';
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: `${artifacts}/results`,
  reporter: [['list'], ['html', { outputFolder: `${artifacts}/report`, open: 'never' }], ['json', { outputFile: `${artifacts}/results.json` }]],
  use: { viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
