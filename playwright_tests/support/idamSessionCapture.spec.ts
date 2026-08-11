import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createIdamSessionCapture } from '../common/idamSessionCapture';
import { SessionManager } from '../common/sessionManagement';

const targetUrl = 'http://localhost:3000/#/media-viewer';
const identity = { key: 'capture-user', email: 'capture-user@example.test' };

test('captures an IDAM login and restores it for the media-viewer route', async ({ page }) => {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idam-session-capture-'));
  let loginPageRequests = 0;
  let authenticatedPageRequests = 0;

  try {
    await page.route('http://localhost:3000/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/' && !request.headers().cookie?.includes('session=opaque')) {
        await route.fulfill({
          headers: { 'content-type': 'text/html' },
          body: '<script>location.replace("/login")</script>',
        });
        return;
      }
      if (url.pathname === '/signed-in') {
        await route.fulfill({
          headers: { 'content-type': 'text/html', 'set-cookie': 'session=opaque; Path=/' },
          body: '<main data-authenticated>signed in</main>',
        });
        return;
      }

      if (request.headers().cookie?.includes('session=opaque')) {
        authenticatedPageRequests += 1;
        await route.fulfill({ headers: { 'content-type': 'text/html' }, body: '<main data-authenticated>media viewer</main>' });
        return;
      }

      if (url.pathname === '/login') loginPageRequests += 1;
      await route.fulfill({
        headers: { 'content-type': 'text/html' },
        body: '<form action="/signed-in"><label>Username<input name="username"></label><label>Password<input name="password" type="password"></label><button type="submit">Sign in</button></form>',
      });
    });

    const manager = new SessionManager({ storageDir, targetUrl, requiredCookieNames: ['session'] });
    const result = await manager.ensureAuthenticatedPage(
      page,
      identity,
      createIdamSessionCapture(page, { targetUrl, username: 'user@example.test', password: 'not-logged' }),
      { expectedUrl: /#\/media-viewer$/, readySelector: '[data-authenticated]' },
      true,
    );

    expect(result.reused).toBe(false);
    expect(loginPageRequests).toBe(1);
    expect(authenticatedPageRequests).toBe(1);
    await expect(page.locator('[data-authenticated]')).toHaveText('media viewer');
    await expect.poll(async () => (await page.context().cookies()).map(({ name }) => name)).toEqual(['session']);
  } finally {
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
});

test('captures an already-authenticated media-viewer state without using the login form', async ({ page }) => {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idam-session-capture-'));

  try {
    await page.context().addCookies([{ name: 'session', value: 'opaque', domain: 'localhost', path: '/' }]);
    await page.route('http://localhost:3000/**', (route) => route.fulfill({
      headers: { 'content-type': 'text/html' },
      body: '<main data-authenticated>media viewer</main>',
    }));

    const manager = new SessionManager({ storageDir, targetUrl, requiredCookieNames: ['session'] });
    const result = await manager.ensureAuthenticatedPage(
      page,
      identity,
      createIdamSessionCapture(page, { targetUrl, username: 'unused', password: 'unused' }),
      { expectedUrl: /#\/media-viewer$/, readySelector: '[data-authenticated]' },
      true,
    );

    expect(result.reused).toBe(false);
    await expect(page.locator('[data-authenticated]')).toHaveText('media viewer');
  } finally {
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
});
