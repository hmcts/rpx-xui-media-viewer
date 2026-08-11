import { test, expect } from '../fixtures/mediaViewerTest';

const username = process.env.PW_SESSION_USERNAME ?? process.env.CCD_CASEWORKER_E2E_EMAIL;
const password = process.env.PW_SESSION_PASSWORD ?? process.env.CCD_CASEWORKER_E2E_PASSWORD;
const readySelector = process.env.PW_SESSION_READY_SELECTOR;
const configured = Boolean(username && password && readySelector && process.env.PW_SESSION_AUTH_COOKIE_NAMES);

test.describe('authenticated media-viewer session', () => {
  test.skip(!configured, 'Requires explicit PW_SESSION credentials, cookie names, and ready selector');

  test('uses the repository-owned IDAM session capture before exercising the media viewer', async ({ authenticatedMediaViewer, page }) => {
    const result = await authenticatedMediaViewer.ensure(
      { key: username!, email: username! },
      { expectedUrl: /#\/media-viewer(?:$|[?#])/, readySelector: readySelector! },
    );

    expect(result.paths.storage).toContain('media-viewer');
    await expect(page.locator(readySelector!)).toBeVisible();
  });
});
