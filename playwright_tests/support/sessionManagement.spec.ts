import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect, test } from '../fixtures/mediaViewerTest';
import { SessionManager, assertAuthenticatedSurface, isReusableSession, sessionPaths, type SessionIdentity } from '../common/sessionManagement';

const identity: SessionIdentity = { key: 'media-viewer-user', email: 'user@example.test' };
const targetUrl = 'https://xui.aat.platform.hmcts.net/#/media-viewer';
const cookie = { name: 'session', value: 'opaque', domain: 'xui.aat.platform.hmcts.net', path: '/', expires: -1 };

function tempDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'media-viewer-session-'));
}

function writeState(storagePath: string, cookies = [cookie]): void {
  fs.writeFileSync(storagePath, JSON.stringify({ cookies }));
}

test.describe('media-viewer session management', () => {
  test('reuses fresh state only when it is live and compatible with the target host', () => {
    const directory = tempDirectory();
    const storagePath = path.join(directory, 'session.json');
    writeState(storagePath);

    expect(isReusableSession(storagePath, targetUrl, { requiredCookieNames: ['session'] })).toBe(true);
    expect(isReusableSession(storagePath, 'https://manage-case.aat.platform.hmcts.net/', { requiredCookieNames: ['session'] })).toBe(false);
    expect(isReusableSession(storagePath, 'https://idam-web-public.aat.platform.hmcts.net/login', { requiredCookieNames: ['session'] })).toBe(false);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('rejects expired, empty and incompatible state', () => {
    const directory = tempDirectory();
    const expiredPath = path.join(directory, 'expired.json');
    const emptyPath = path.join(directory, 'empty.json');
    const wrongHostPath = path.join(directory, 'wrong-host.json');
    writeState(expiredPath, [{ ...cookie, expires: Math.floor(Date.now() / 1_000) - 1 }]);
    writeState(emptyPath, []);
    writeState(wrongHostPath, [{ ...cookie, domain: '.other.example' }]);

    expect(isReusableSession(expiredPath, targetUrl, { requiredCookieNames: ['session'] })).toBe(false);
    expect(isReusableSession(emptyPath, targetUrl, { requiredCookieNames: ['session'] })).toBe(false);
    expect(isReusableSession(wrongHostPath, targetUrl, { requiredCookieNames: ['session'] })).toBe(false);
    expect(isReusableSession(expiredPath, targetUrl, { requiredCookieNames: ['csrf'] })).toBe(false);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('allows an explicit parent-domain authentication cookie but rejects it by default', () => {
    const directory = tempDirectory();
    const storagePath = path.join(directory, 'parent-domain.json');
    writeState(storagePath, [{ ...cookie, domain: '.aat.platform.hmcts.net' }]);

    expect(isReusableSession(storagePath, targetUrl, { requiredCookieNames: ['session'] })).toBe(false);
    expect(isReusableSession(storagePath, targetUrl, {
      requiredCookieNames: ['session'],
      allowedCookieDomains: ['aat.platform.hmcts.net'],
    })).toBe(true);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('serialises concurrent capture and lets the waiter reuse the result', async () => {
    const directory = tempDirectory();
    const manager = new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], lockTimeoutMs: 2_000 });
    let captures = 0;
    const capture = async (_identity: SessionIdentity, storagePath: string) => {
      captures += 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      writeState(storagePath);
    };

    const results = await Promise.all([manager.ensure(identity, capture), manager.ensure(identity, capture)]);
    expect(captures).toBe(1);
    expect(results.map((result) => result.reused).sort()).toEqual([false, true]);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('uses separate temporary directories for concurrent identities', async () => {
    const directory = tempDirectory();
    const manager = new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'] });
    const captureDirectories: string[] = [];
    const capture = async (_identity: SessionIdentity, storagePath: string) => {
      captureDirectories.push(path.dirname(storagePath));
      await new Promise((resolve) => setTimeout(resolve, 25));
      writeState(storagePath);
    };

    await Promise.all([
      manager.ensure(identity, capture),
      manager.ensure({ key: 'another-media-viewer-user', email: 'another@example.test' }, capture),
    ]);
    expect(new Set(captureDirectories).size).toBe(2);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('does not steal an existing lock when the owner is slow or unavailable', async () => {
    const directory = tempDirectory();
    const manager = new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], lockTimeoutMs: 100 });
    const lockPath = manager.paths(identity).lock;
    fs.writeFileSync(lockPath, 'owned-by-another-worker', { mode: 0o600 });

    await expect(manager.ensure(identity, async () => undefined)).rejects.toThrow(/Timed out waiting for session lock/);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('bounds a non-cooperative capture and releases its lock', async () => {
    const directory = tempDirectory();
    const manager = new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], captureTimeoutMs: 30, lockTimeoutMs: 100, failureTtlMs: 0 });
    await expect(manager.ensure(identity, async () => new Promise<void>(() => undefined))).rejects.toThrow(/exceeded 30ms/);
    expect(fs.existsSync(manager.paths(identity).lock)).toBe(false);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('removes a timed-out capture directory before a late callback write', async () => {
    const directory = tempDirectory();
    const manager = new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], captureTimeoutMs: 20, failureTtlMs: 0 });
    await expect(manager.ensure(identity, async (_identity, storagePath) => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      fs.writeFileSync(storagePath, JSON.stringify({ cookies: [cookie] }));
    })).rejects.toThrow(/exceeded 20ms/);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(fs.readdirSync(directory).filter((entry) => entry.startsWith('.capture-'))).toEqual([]);
    expect(fs.existsSync(manager.paths(identity).storage)).toBe(false);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('rejects invalid session timeout configuration', () => {
    const directory = tempDirectory();
    try {
      expect(() => new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], captureTimeoutMs: 0 })).toThrow(/captureTimeoutMs/);
      expect(() => new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], lockTimeoutMs: -1 })).toThrow(/lockTimeoutMs/);
      expect(() => new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], failureTtlMs: -1 })).toThrow(/failureTtlMs/);
      expect(() => new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], failureTtlMs: Number.NaN })).toThrow(/failureTtlMs/);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('isolates identities and target hosts in storage paths', () => {
    const first = sessionPaths(identity, { storageDir: '/tmp/media-viewer', targetUrl });
    const second = sessionPaths({ ...identity, email: 'other@example.test' }, { storageDir: '/tmp/media-viewer', targetUrl });
    const third = sessionPaths(identity, { storageDir: '/tmp/media-viewer', targetUrl: 'https://xui.ithc.platform.hmcts.net/' });
    expect(first.storage).not.toBe(second.storage);
    expect(first.storage).not.toBe(third.storage);
  });

  test('uses a bounded failure cooldown and redacts sensitive capture errors', async () => {
    const directory = tempDirectory();
    const manager = new SessionManager({ storageDir: directory, targetUrl, requiredCookieNames: ['session'], failureTtlMs: 10_000 });
    const capture = async () => {
      const paths = manager.paths(identity);
      writeState(paths.storage);
      throw new Error('login failed password=secret-token authorization: Bearer bearer-secret url=https://x.test/?access_token=query-secret');
    };

    await expect(manager.ensure(identity, capture)).rejects.toThrow('password=[redacted]');
    await expect(manager.ensure(identity, capture)).rejects.toThrow('password=[redacted]');
    const failure = JSON.parse(fs.readFileSync(manager.paths(identity).failure, 'utf8')) as { message: string };
    expect(failure.message).toContain('authorization: [redacted]');
    expect(failure.message).toContain('access_token=[redacted]');
    expect(failure.message).not.toContain('secret-token');
    expect(failure.message).not.toContain('bearer-secret');
    expect(failure.message).not.toContain('query-secret');
    expect(fs.existsSync(manager.paths(identity).storage)).toBe(false);
    expect(fs.statSync(directory).mode & 0o777).toBe(0o700);
    expect(fs.statSync(manager.paths(identity).failure).mode & 0o777).toBe(0o600);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('rejects login, service-down, wrong-route and browser-error surfaces', () => {
    for (const pageUrl of [
      'https://idam-web-public.aat.platform.hmcts.net/login',
      'https://xui.aat.platform.hmcts.net/service-down',
      'https://xui.aat.platform.hmcts.net/#/not-authorised',
      'chrome-error://chromewebdata/',
    ]) {
      expect(() => assertAuthenticatedSurface(pageUrl, { expectedUrl: /#\/media-viewer$/ })).toThrow();
    }
    expect(() => assertAuthenticatedSurface(targetUrl, { expectedUrl: /#\/media-viewer$/ })).not.toThrow();
  });

  test('applies cookies and origin storage through the opt-in authenticated fixture', async ({ page, sessionManager }) => {
    test.skip(process.env.PW_SESSION_AUTH_COOKIE_NAMES !== 'session', 'Requires the synthetic session-cookie contract');
    await page.route('http://localhost:3000/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<main data-authenticated>ready</main>' })
    );

    const result = await sessionManager.ensureAuthenticatedPage(
      page,
      { key: 'browser-readiness-test', email: 'browser-readiness@example.test' },
      async (_identity, storagePath) => {
        fs.writeFileSync(
          storagePath,
          JSON.stringify({
            cookies: [
              { ...cookie, domain: 'localhost' },
              { ...cookie, name: 'sibling', domain: 'other.localhost' },
            ],
            origins: [{ origin: 'http://localhost:3000', localStorage: [{ name: 'auth-marker', value: 'ready' }] }],
          })
        );
      },
      { expectedUrl: /#\/media-viewer$/, readySelector: '[data-authenticated]' },
      true
    );

    expect(result.reused).toBe(false);
    expect((await page.context().cookies()).map((item) => item.name)).toEqual(['session']);
    await expect(page.locator('[data-authenticated]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('auth-marker'))).toBe('ready');
  });
});
