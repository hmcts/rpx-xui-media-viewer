import { test, expect } from '../fixtures/mediaViewerTest';

const username = process.env.PW_SESSION_USERNAME ?? process.env.CCD_CASEWORKER_E2E_EMAIL;
const password = process.env.PW_SESSION_PASSWORD ?? process.env.CCD_CASEWORKER_E2E_PASSWORD;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.TEST_URL;
const readySelector = process.env.PW_SESSION_READY_SELECTOR;
const LIVE_AUTH_TEST_TIMEOUT_MS = 3 * 60_000;

const isRemoteTarget = (value: string | undefined): boolean => {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname;
    return hostname !== 'localhost' && !hostname.endsWith('.localhost');
  } catch {
    return false;
  }
};

const configured = Boolean(username && password && readySelector && process.env.PW_SESSION_AUTH_COOKIE_NAMES) && isRemoteTarget(baseUrl);

test.describe('authenticated media-viewer session', () => {
  test.skip(!configured, 'Requires a non-local PLAYWRIGHT_BASE_URL/TEST_URL, credentials, cookie names, and ready selector');
  test.setTimeout(LIVE_AUTH_TEST_TIMEOUT_MS);

  test('captures and reuses an authenticated media-viewer session', async ({ authenticatedMediaViewer, page }) => {
    const first = await authenticatedMediaViewer.ensure(
      { key: username!, email: username! },
      { expectedUrl: /#\/media-viewer(?:$|[?#])/, readySelector: readySelector! },
      true,
    );

    const second = await authenticatedMediaViewer.ensure(
      { key: username!, email: username! },
      { expectedUrl: /#\/media-viewer(?:$|[?#])/, readySelector: readySelector! },
    );

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(first.paths.storage).toContain('media-viewer');
    await expect(page.locator(readySelector!)).toBeVisible();
  });
});
