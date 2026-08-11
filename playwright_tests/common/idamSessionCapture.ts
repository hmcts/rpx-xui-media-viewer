import type { Page } from '@playwright/test';
import type { SessionCapture } from './sessionManagement';

export type IdamSessionCaptureOptions = {
  targetUrl: string;
  username: string;
  password: string;
  timeoutMs?: number;
};

const DEFAULT_LOGIN_TIMEOUT_MS = 60_000;

const assertNotAborted = (signal: AbortSignal): void => {
  if (signal.aborted) throw new Error('IDAM session capture was aborted');
};

const isLoginUrl = (url: URL): boolean => /\/login|idam-web-public/i.test(url.toString());

export function createIdamSessionCapture(page: Page, options: IdamSessionCaptureOptions): SessionCapture {
  return async (_identity, storagePath, signal) => {
    assertNotAborted(signal);
    await page.goto(options.targetUrl, { waitUntil: 'domcontentloaded' });
    assertNotAborted(signal);

    if (!isLoginUrl(new URL(page.url()))) {
      await page.context().storageState({ path: storagePath });
      return;
    }

    await page.locator('input[name="username"]').fill(options.username);
    await page.locator('input[name="password"]').fill(options.password);
    await Promise.all([
      page.waitForURL((url) => !isLoginUrl(url), { timeout: options.timeoutMs ?? DEFAULT_LOGIN_TIMEOUT_MS }),
      page.getByRole('button', { name: /^sign in$/i }).click(),
    ]);
    assertNotAborted(signal);
    await page.context().storageState({ path: storagePath });
  };
}
