import { test as base } from '@playwright/test';
import * as os from 'node:os';
import * as path from 'node:path';
import { MediaViewerPage } from '../pages/mediaViewerPage';
import { createIdamSessionCapture } from '../common/idamSessionCapture';
import { type AuthenticatedPageOptions, type SessionIdentity, type SessionResult, SessionManager } from '../common/sessionManagement';
export { mediaAssets } from './mediaAssets';

type AuthenticatedMediaViewer = {
  ensure: (identity: SessionIdentity, options: AuthenticatedPageOptions, force?: boolean) => Promise<SessionResult>;
};

const positiveEnv = (name: string): number | undefined => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a finite positive number`);
  return value;
};

export const test = base.extend<{
  mediaViewer: MediaViewerPage;
  sessionManager: SessionManager;
  authenticatedMediaViewer: AuthenticatedMediaViewer;
}>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses();
    await use(mediaViewer);
  },
  sessionManager: async ({}, use, testInfo) => {
    const storageDir = process.env.PW_SESSION_STORAGE_DIR ?? path.join(os.tmpdir(), 'hmcts-media-viewer-playwright-sessions');
    const baseUrl = testInfo.project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000/';
    const allowedCookieDomains = (process.env.PW_SESSION_ALLOWED_COOKIE_DOMAINS ?? '').split(',').map((domain) => domain.trim()).filter(Boolean);
    await use(new SessionManager({
      storageDir,
      targetUrl: new URL('/#/media-viewer', baseUrl).toString(),
      requiredCookieNames: (process.env.PW_SESSION_AUTH_COOKIE_NAMES ?? '').split(',').map((name) => name.trim()).filter(Boolean),
      allowedCookieDomains: allowedCookieDomains.length ? allowedCookieDomains : undefined,
      captureTimeoutMs: positiveEnv('PW_SESSION_CAPTURE_TIMEOUT_MS'),
    }));
  },
  authenticatedMediaViewer: async ({ page, sessionManager }, use, testInfo) => {
    const username = process.env.PW_SESSION_USERNAME ?? process.env.CCD_CASEWORKER_E2E_EMAIL;
    const password = process.env.PW_SESSION_PASSWORD ?? process.env.CCD_CASEWORKER_E2E_PASSWORD;
    if (!username || !password) {
      throw new Error('Authenticated media-viewer tests require PW_SESSION_USERNAME/PW_SESSION_PASSWORD or CCD_CASEWORKER_E2E_EMAIL/CCD_CASEWORKER_E2E_PASSWORD');
    }
    const baseUrl = testInfo.project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000/';
    const capture = createIdamSessionCapture(page, {
      targetUrl: new URL('/#/media-viewer', baseUrl).toString(),
      username,
      password,
      timeoutMs: positiveEnv('PW_SESSION_CAPTURE_TIMEOUT_MS'),
    });
    await use({
      ensure: (identity, options, force = false) => sessionManager.ensureAuthenticatedPage(page, identity, capture, options, force),
    });
  },
});

export { expect } from '@playwright/test';
