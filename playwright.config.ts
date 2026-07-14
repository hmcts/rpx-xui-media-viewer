import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { execSync } from 'node:child_process';
import { cpus, totalmem } from 'node:os';
import { version as appVersion } from './package.json';

type ReporterName = 'dot' | 'html' | 'junit' | 'line' | 'list' | 'odhin' | 'odhin-progress';
type EnvMap = NodeJS.ProcessEnv;

const defaultOutputRoot = 'functional-output/tests/playwright';
const defaultOdhinReportFile = 'xui-playwright.html';
const smokeSpecPattern = 'playwright_tests/smoke/smokeTest.spec.ts';
const supportSpecPattern = 'playwright_tests/support/**/*.spec.ts';
const maxWorkerCount = 64;

const resolveBaseUrl = (env: EnvMap): string =>
  env.PLAYWRIGHT_BASE_URL ?? env.TEST_URL ?? 'http://localhost:3000/';

const resolveBranchName = (env: EnvMap): string => {
  const envBranch =
    env.PLAYWRIGHT_REPORT_BRANCH ||
    env.CHANGE_BRANCH ||
    env.GIT_BRANCH ||
    env.BRANCH_NAME ||
    env.GITHUB_HEAD_REF ||
    env.GITHUB_REF_NAME ||
    env.BUILD_SOURCEBRANCHNAME;
  if (envBranch) {
    return envBranch.replace(/^(?:refs\/heads\/|origin\/)/, '').trim();
  }
  try {
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .replace(/^(?:refs\/heads\/|origin\/)/, '');
    if (gitBranch && gitBranch !== 'HEAD') {
      return gitBranch;
    }
  } catch {
    // The local label is used when the report is generated outside a Git checkout.
  }
  return 'local';
};

const resolveEnvironmentFromUrl = (baseUrl: string): string => {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local';
    }
    for (const environment of ['aat', 'ithc', 'demo', 'perftest']) {
      if (hostname.includes(`.${environment}.`) || hostname.includes(`-${environment}.`)) {
        return environment;
      }
    }
    return hostname;
  } catch {
    return 'unknown';
  }
};

const resolveTestEnvironmentLabel = (env: EnvMap, workerCount: number): string => {
  const targetEnvironment = env.TEST_TYPE ?? resolveEnvironmentFromUrl(resolveBaseUrl(env));
  const runContext = env.CI ? 'ci' : 'local-run';
  const cpuCores = cpus().length;
  const totalRamGiB = Math.round((totalmem() / 1024 ** 3) * 10) / 10;
  return `${targetEnvironment} | ${runContext} | workers=${workerCount} | agent_cpu_cores=${cpuCores} | agent_ram_gib=${totalRamGiB}`;
};

const resolveWorkerCount = (raw: string | undefined): number => {
  const configured = raw?.trim();
  if (!configured) {
    return 7;
  }
  if (!/^[1-9]\d*$/.test(configured)) {
    throw new Error(`FUNCTIONAL_TESTS_WORKERS must be an integer between 1 and ${maxWorkerCount}`);
  }
  const workers = Number(configured);
  if (!Number.isSafeInteger(workers) || workers > maxWorkerCount) {
    throw new Error(`FUNCTIONAL_TESTS_WORKERS must be an integer between 1 and ${maxWorkerCount}`);
  }
  return workers;
};

const splitReporters = (raw: string | undefined): ReporterName[] =>
  (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is ReporterName =>
      ['dot', 'html', 'junit', 'line', 'list', 'odhin', 'odhin-progress'].includes(value)
    );

const resolveReporters = (env: EnvMap, workerCount: number): ReporterDescription[] => {
  const terminalReporter = (env.PLAYWRIGHT_DEFAULT_REPORTER as ReporterName | undefined) ?? (env.CI ? 'dot' : 'list');
  const requestedReporters = splitReporters(env.PLAYWRIGHT_REPORTERS);
  const reporterNames = requestedReporters.length
    ? requestedReporters
    : [terminalReporter, 'html', 'junit', 'odhin-progress', 'odhin'];
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
          release: env.PLAYWRIGHT_REPORT_RELEASE ?? `${appVersion} | branch=${resolveBranchName(env)}`,
          testEnvironment:
            env.PLAYWRIGHT_REPORT_TEST_ENVIRONMENT ??
            env.PW_ODHIN_ENV ??
            resolveTestEnvironmentLabel(env, workerCount),
          startServer: false,
          consoleLog: Boolean(env.CI),
          consoleError: Boolean(env.CI),
          testOutput: 'only-on-failure',
        },
      ] as const;
    }

    if (reporterName === 'odhin-progress') {
      return [
        './playwright_tests/common/reporters/odhin-progress.reporter.cjs',
        {
          enabled: Boolean(env.CI),
          graceMs: 1_500,
          intervalMs: 5_000,
          hardTimeoutMs: 0,
          forceExitOnCompletion: Boolean(env.CI),
        },
      ] as const;
    }

    return [reporterName] as const;
  });
};

const workerCount = resolveWorkerCount(process.env.FUNCTIONAL_TESTS_WORKERS);

export default defineConfig({
  testDir: '.',
  testMatch: ['playwright_tests/**/*.spec.ts'],
  outputDir: process.env.PLAYWRIGHT_TEST_OUTPUT_DIR ?? `${defaultOutputRoot}/test-results`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: workerCount,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: resolveReporters(process.env, workerCount),
  use: {
    baseURL: resolveBaseUrl(process.env),
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
    {
      name: 'support',
      testMatch: [supportSpecPattern],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
