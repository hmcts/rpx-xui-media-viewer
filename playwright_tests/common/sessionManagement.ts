import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Cookie, Page } from '@playwright/test';

const DEFAULT_MAX_AGE_MS = 60 * 60_000;
const DEFAULT_FAILURE_TTL_MS = 120_000;
const DEFAULT_LOCK_TIMEOUT_MS = 2 * 60_000;
const DEFAULT_CAPTURE_TIMEOUT_MS = 90_000;

const positive = (value: number, name: string): number => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a finite positive number`);
  return value;
};

const nonNegative = (value: number, name: string): number => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a finite non-negative number`);
  return value;
};

export type SessionIdentity = {
  key: string;
  email?: string;
};

export type SessionPaths = {
  storage: string;
  lock: string;
  failure: string;
};

export type SessionManagerOptions = {
  storageDir: string;
  targetUrl: string;
  requiredCookieNames: string[];
  allowedCookieDomains?: string[];
  maxAgeMs?: number;
  failureTtlMs?: number;
  lockTimeoutMs?: number;
  captureTimeoutMs?: number;
  now?: () => number;
};

export type SessionCapture = (identity: SessionIdentity, storagePath: string, signal: AbortSignal) => Promise<void>;

export type SessionResult = {
  identity: SessionIdentity;
  paths: SessionPaths;
  reused: boolean;
};

export type AuthenticatedPageOptions = {
  expectedUrl?: RegExp;
  readySelector: string;
  timeoutMs?: number;
};

type StorageState = {
  cookies?: Cookie[];
  origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }>;
};

const slug = (value: string): string => value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');

const redact = (message: string): string =>
  message
    .replace(/(password|token|cookie|authorization|secret|client_secret|access_token|code)(\s*[:=]\s*)(?:Bearer\s+)?[^&\s,}]+/gi, '$1$2[redacted]')
    .replace(/([?&](?:password|token|secret|client_secret|access_token|code)=)[^&#\s]+/gi, '$1[redacted]')
    .slice(0, 500);

const hostFor = (targetUrl: string): string => {
  try {
    return new URL(targetUrl).hostname.toLowerCase();
  } catch {
    return 'invalid-target';
  }
};

const cookieMatchesHost = (cookie: Cookie, host: string, allowedDomains: string[]): boolean => {
  const domain = cookie.domain?.replace(/^\./, '').toLowerCase();
  const normalisedAllowedDomains = allowedDomains.map((allowed) => allowed.replace(/^\./, '').toLowerCase());
  const appliesToHost = (candidate: string): boolean => host === candidate || host.endsWith(`.${candidate}`);
  return Boolean(domain && appliesToHost(domain) && (domain === host || normalisedAllowedDomains.some((allowed) => allowed === domain)));
};

const hasLiveCompatibleCookie = (
  cookies: Cookie[],
  targetUrl: string,
  now: number,
  requiredCookieNames: string[],
  allowedCookieDomains: string[]
): boolean => {
  if (requiredCookieNames.length === 0) return false;
  const host = hostFor(targetUrl);
  const nowSeconds = Math.floor(now / 1_000);
  return requiredCookieNames.every((requiredName) => cookies.some((cookie) => {
    const live = cookie.expires <= 0 || cookie.expires > nowSeconds + 60;
    return cookie.name === requiredName && live && cookieMatchesHost(cookie, host, allowedCookieDomains);
  }));
};

const compatibleCookies = (cookies: Cookie[], targetUrl: string, allowedCookieDomains: string[]): Cookie[] => {
  const host = hostFor(targetUrl);
  return cookies.filter((cookie) => cookieMatchesHost(cookie, host, allowedCookieDomains));
};

export function sessionPaths(identity: SessionIdentity, options: Pick<SessionManagerOptions, 'storageDir' | 'targetUrl'>): SessionPaths {
  const identityMaterial = `${hostFor(options.targetUrl)}:${identity.key}:${identity.email ?? ''}`;
  const digest = createHash('sha256').update(identityMaterial).digest('hex').slice(0, 16);
  const name = `${slug(identity.key)}-${digest}`;
  return {
    storage: path.join(options.storageDir, `${name}.storage.json`),
    lock: path.join(options.storageDir, `${name}.lock`),
    failure: path.join(options.storageDir, `${name}.capture-failed.json`),
  };
}

export function isReusableSession(
  storagePath: string,
  targetUrl: string,
  options: { maxAgeMs?: number; now?: () => number; fsApi?: typeof fs; requiredCookieNames?: string[]; allowedCookieDomains?: string[] } = {}
): boolean {
  const fsApi = options.fsApi ?? fs;
  const now = options.now ?? Date.now;
  try {
    if (!fsApi.existsSync(storagePath)) return false;
    const stat = fsApi.statSync(storagePath);
    if (now() - stat.mtimeMs >= (options.maxAgeMs ?? DEFAULT_MAX_AGE_MS)) return false;
    const state = JSON.parse(fsApi.readFileSync(storagePath, 'utf8')) as StorageState;
    const allowedCookieDomains = options.allowedCookieDomains ?? [hostFor(targetUrl)];
    return Array.isArray(state.cookies) && state.cookies.length > 0 && hasLiveCompatibleCookie(
      state.cookies,
      targetUrl,
      now(),
      options.requiredCookieNames ?? [],
      allowedCookieDomains
    );
  } catch {
    return false;
  }
}

export function assertAuthenticatedSurface(pageUrl: string, options: Pick<AuthenticatedPageOptions, 'expectedUrl'>): void {
  const lowerUrl = pageUrl.toLowerCase();
  if (/\/login|idam-web-public|\/service-down|not[-_]authori[sz]ed|chrome-error:/.test(lowerUrl)) {
    throw new Error(`Authenticated media-viewer page rejected unsafe surface: ${pageUrl}`);
  }
  if (options.expectedUrl && !options.expectedUrl.test(pageUrl)) {
    throw new Error(`Authenticated media-viewer page reached an unexpected route: ${pageUrl}`);
  }
}

const isLoginSurface = (pageUrl: string): boolean => /\/login|idam-web-public/i.test(pageUrl);

export class SessionManager {
  private readonly options: Required<SessionManagerOptions>;

  constructor(options: SessionManagerOptions) {
    this.options = {
      ...options,
      requiredCookieNames: options.requiredCookieNames,
      allowedCookieDomains: options.allowedCookieDomains ?? [hostFor(options.targetUrl)],
      maxAgeMs: positive(options.maxAgeMs ?? DEFAULT_MAX_AGE_MS, 'maxAgeMs'),
      failureTtlMs: nonNegative(options.failureTtlMs ?? DEFAULT_FAILURE_TTL_MS, 'failureTtlMs'),
      lockTimeoutMs: positive(options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS, 'lockTimeoutMs'),
      captureTimeoutMs: positive(options.captureTimeoutMs ?? DEFAULT_CAPTURE_TIMEOUT_MS, 'captureTimeoutMs'),
      now: options.now ?? Date.now,
    };
    fs.mkdirSync(this.options.storageDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(this.options.storageDir, 0o700);
  }

  paths(identity: SessionIdentity): SessionPaths {
    return sessionPaths(identity, this.options);
  }

  async ensure(identity: SessionIdentity, capture: SessionCapture, force = false): Promise<SessionResult> {
    const paths = this.paths(identity);
    if (!force && this.isReusable(paths.storage)) {
      return { identity, paths, reused: true };
    }

    const recentFailure = this.recentFailure(paths.failure);
    if (recentFailure && !force) {
      throw new Error(`Session capture is cooling down for ${identity.key}: ${recentFailure}`);
    }

    const release = await this.acquire(paths.lock, identity.key);
    try {
      if (!force && this.isReusable(paths.storage)) {
        return { identity, paths, reused: true };
      }
      const lockedFailure = this.recentFailure(paths.failure);
      if (lockedFailure && !force) {
        throw new Error(`Session capture is cooling down for ${identity.key}: ${lockedFailure}`);
      }
      try {
        const abortController = new AbortController();
        const captureDirectory = fs.mkdtempSync(path.join(this.options.storageDir, '.capture-'));
        const temporaryStoragePath = path.join(captureDirectory, path.basename(paths.storage));
        fs.chmodSync(captureDirectory, 0o700);
        const abortTimer = setTimeout(() => abortController.abort(), this.options.captureTimeoutMs);
        try {
          await Promise.race([
            capture(identity, temporaryStoragePath, abortController.signal),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Session capture exceeded ${this.options.captureTimeoutMs}ms for ${identity.key}`)), this.options.captureTimeoutMs)),
          ]);
          if (abortController.signal.aborted) throw new Error(`Session capture exceeded ${this.options.captureTimeoutMs}ms for ${identity.key}`);
          if (!this.isReusable(temporaryStoragePath)) throw new Error(`Session capture did not produce live storage state for ${identity.key}`);
          fs.renameSync(temporaryStoragePath, paths.storage);
        } finally {
          clearTimeout(abortTimer);
          fs.rmSync(captureDirectory, { recursive: true, force: true });
        }
        if (!this.isReusable(paths.storage)) {
          throw new Error(`Session capture did not produce live storage state for ${identity.key}`);
        }
        fs.chmodSync(paths.storage, 0o600);
        fs.rmSync(paths.failure, { force: true });
        return { identity, paths, reused: false };
      } catch (error) {
        fs.rmSync(paths.storage, { force: true });
        fs.writeFileSync(
          paths.failure,
          JSON.stringify({ timestamp: this.options.now(), message: redact(error instanceof Error ? error.message : String(error)) })
        );
        fs.chmodSync(paths.failure, 0o600);
        throw new Error(`Session capture failed for ${identity.key}: ${redact(error instanceof Error ? error.message : String(error))}`);
      }
    } finally {
      release();
    }
  }

  async applyToPage(page: Page, identity: SessionIdentity, capture: SessionCapture, force = false): Promise<SessionResult> {
    const result = await this.ensure(identity, capture, force);
    const state = this.readValidatedState(result.paths.storage, identity.key);
    const targetHost = hostFor(this.options.targetUrl);
    await page.context().addCookies(state.cookies.map((cookie) => {
      if (cookie.domain?.replace(/^\./, '').toLowerCase() !== targetHost) return cookie;
      return {
        name: cookie.name,
        value: cookie.value,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        url: new URL(this.options.targetUrl).origin,
      };
    }));
    await page.addInitScript(({ origins }) => {
      for (const origin of origins) {
        if (origin.origin !== window.location.origin) continue;
        for (const item of origin.localStorage ?? []) window.localStorage.setItem(item.name, item.value);
      }
    }, { origins: state.origins ?? [] });
    return result;
  }

  async ensureAuthenticatedPage(
    page: Page,
    identity: SessionIdentity,
    capture: SessionCapture,
    options: AuthenticatedPageOptions,
    force = false
  ): Promise<SessionResult> {
    let result = await this.applyToPage(page, identity, capture, force);
    await page.goto(this.options.targetUrl, { waitUntil: 'domcontentloaded' });
    try {
      assertAuthenticatedSurface(page.url(), options);
      await page.locator(options.readySelector).waitFor({ state: 'visible', timeout: options.timeoutMs ?? 15_000 });
    } catch (error) {
      // Only an explicit login surface justifies refreshing state. A service-down,
      // wrong-route or missing-shell failure must remain visible to the test.
      if (force || !isLoginSurface(page.url())) throw error;
      result = await this.applyToPage(page, identity, capture, true);
      await page.goto(this.options.targetUrl, { waitUntil: 'domcontentloaded' });
      assertAuthenticatedSurface(page.url(), options);
      await page.locator(options.readySelector).waitFor({ state: 'visible', timeout: options.timeoutMs ?? 15_000 });
    }
    return result;
  }

  private isReusable(storagePath: string): boolean {
    return isReusableSession(storagePath, this.options.targetUrl, {
      ...this.options,
      requiredCookieNames: this.options.requiredCookieNames,
      allowedCookieDomains: this.options.allowedCookieDomains,
    });
  }

  private readValidatedState(storagePath: string, identityKey: string): StorageState & { cookies: Cookie[] } {
    if (!this.isReusable(storagePath)) {
      throw new Error(`Session storage became stale or incompatible before applying for ${identityKey}`);
    }
    const state = JSON.parse(fs.readFileSync(storagePath, 'utf8')) as StorageState;
    if (!state.cookies?.length) throw new Error(`Session storage state has no cookies for ${identityKey}`);
    const cookies = compatibleCookies(state.cookies, this.options.targetUrl, this.options.allowedCookieDomains);
    if (!cookies.length) throw new Error(`Session storage state has no target-host cookies for ${identityKey}`);
    return { ...state, cookies };
  }

  private recentFailure(failurePath: string): string | null {
    if (this.options.failureTtlMs === 0 || !fs.existsSync(failurePath)) return null;
    try {
      const failure = JSON.parse(fs.readFileSync(failurePath, 'utf8')) as { timestamp?: number; message?: string };
      if (!failure.timestamp || this.options.now() - failure.timestamp > this.options.failureTtlMs) return null;
      return failure.message ?? 'previous capture failed';
    } catch {
      return null;
    }
  }

  private async acquire(lockPath: string, identityKey: string): Promise<() => void> {
    const started = this.options.now();
    while (this.options.now() - started < this.options.lockTimeoutMs) {
      try {
        const descriptor = fs.openSync(lockPath, 'wx', 0o600);
        fs.closeSync(descriptor);
        return () => fs.rmSync(lockPath, { force: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    throw new Error(`Timed out waiting for session lock for ${identityKey}`);
  }
}
