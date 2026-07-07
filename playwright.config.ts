import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

type ReporterName = 'dot' | 'html' | 'junit' | 'line' | 'list' | 'odhin';

const defaultOutputRoot = 'functional-output/tests/playwright';
const defaultOdhinReportFile = 'xui-playwright.html';
const smokeSpecPattern = 'playwright_tests/smoke/smokeTest.spec.ts';

const splitReporters = (raw: string | undefined): ReporterName[] =>
  (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is ReporterName => ['dot', 'html', 'junit', 'line', 'list', 'odhin'].includes(value));

const resolveReporters = (env: NodeJS.ProcessEnv): ReporterDescription[] => {
  const terminalReporter = (env.PLAYWRIGHT_DEFAULT_REPORTER as ReporterName | undefined) ?? (env.CI ? 'dot' : 'list');
  const requestedReporters = splitReporters(env.PLAYWRIGHT_REPORTERS);
  const reporterNames = requestedReporters.length ? requestedReporters : [terminalReporter, 'html', 'junit', 'odhin'];
  const uniqueReporterNames = [...new Set(reporterNames)];

  return uniqueReporterNames.map((reporterName) => {
    if (reporterName === 'html') {
      return [
        'html',
        {
          outputFolder: env.PLAYWRIGHT_HTML_REPORT ?? `${defaultOutputRoot}/html-report`,
          open: 'never',
        },
      ] as const;
    }

    if (reporterName === 'junit') {
      return [
        'junit',
        {
          outputFile: env.PLAYWRIGHT_JUNIT_OUTPUT ?? `${defaultOutputRoot}/playwright-junit.xml`,
        },
      ] as const;
    }

    if (reporterName === 'odhin') {
      return [
        './playwright_tests/common/reporters/odhin-adaptive.reporter.cjs',
        {
          outputFolder: env.PLAYWRIGHT_REPORT_FOLDER ?? `${defaultOutputRoot}/odhin-report`,
          indexFilename: env.PLAYWRIGHT_REPORT_INDEX_FILENAME ?? defaultOdhinReportFile,
          title: env.PLAYWRIGHT_REPORT_TITLE ?? 'RPX XUI Media Viewer Playwright',
          project: env.PLAYWRIGHT_REPORT_PROJECT ?? 'RPX XUI Media Viewer',
          release: env.PLAYWRIGHT_REPORT_RELEASE ?? 'local',
          startServer: false,
          consoleLog: Boolean(env.CI),
          consoleError: Boolean(env.CI),
          testOutput: 'only-on-failure',
        },
      ] as const;
    }

    return [reporterName] as const;
  });
};

export default defineConfig({
  testDir: '.',
  testMatch: ['playwright_tests/**/*.spec.ts'],
  outputDir: process.env.PLAYWRIGHT_TEST_OUTPUT_DIR ?? `${defaultOutputRoot}/test-results`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: resolveReporters(process.env),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? process.env.TEST_URL ?? 'http://localhost:3000/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'smoke',
      testMatch: [smokeSpecPattern],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
