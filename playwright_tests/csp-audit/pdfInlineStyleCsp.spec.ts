import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';
import type { Page, TestInfo } from '@playwright/test';

const strictStyleAttributePolicy = "style-src-attr 'none' 'report-sample'";

type CspViolation = {
  blockedUri: string;
  columnNumber: number;
  disposition: string;
  effectiveDirective: string;
  lineNumber: number;
  originalPolicy: string;
  sample: string;
  sourceFile: string;
  target: ElementDetails | null;
  violatedDirective: string;
};

type ElementDetails = {
  classes: string[];
  id: string;
  outerHtml: string;
  owner: 'library' | 'pdfjs' | 'unknown';
  pageNumber: string;
  selector: string;
  style: string;
  tag: string;
};

type StyleMutation = ElementDetails & {
  currentStyle: string;
  previousStyle: string;
};

type CspAuditWindow = Window & typeof globalThis & {
  __cspAudit: {
    mutations: StyleMutation[];
    probeViolations: number;
    violations: CspViolation[];
  };
};

const installCspHeader = async (page: Page): Promise<void> => {
  await page.route('**/*', async (route) => {
    if (!route.request().isNavigationRequest()) {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': strictStyleAttributePolicy,
      },
    });
  });
};

const installCspCollector = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const auditWindow = window as CspAuditWindow;
    auditWindow.__cspAudit = { mutations: [], probeViolations: 0, violations: [] };

    const pdfJsClasses = new Set([
      'annotationEditorLayer',
      'annotationLayer',
      'canvasWrapper',
      'linkAnnotation',
      'markedContent',
      'page',
      'pdfViewer',
      'textLayer',
      'xfaLayer',
    ]);
    const libraryClasses = new Set(['box-highlight', 'pageContainer', 'pageContainer__page']);

    const describeElement = (element: Element): ElementDetails => {
      const htmlElement = element as HTMLElement;
      const classes = Array.from(element.classList).sort();
      const page = element.closest('[data-page-number]');
      const pageNumber = page?.getAttribute('data-page-number') ?? '';
      const hasKnownClass = (knownClasses: Set<string>) => classes.some((className) => knownClasses.has(className));
      const owner = element.closest('.pdfViewer') || hasKnownClass(pdfJsClasses) ||
          (element.tagName === 'CANVAS' && element.getAttribute('role') === 'presentation') ||
          (element === document.documentElement && htmlElement.style.getPropertyValue('--viewer-container-height'))
        ? 'pdfjs'
        : element.closest('mv-media-viewer') || hasKnownClass(libraryClasses)
          ? 'library'
          : 'unknown';
      const identity = element.id
        ? `#${element.id}`
        : classes.length
          ? `.${classes.join('.')}`
          : '';
      return {
        classes,
        id: element.id,
        outerHtml: element.outerHTML.slice(0, 500),
        owner,
        pageNumber,
        selector: `${element.tagName.toLowerCase()}${identity}${pageNumber ? `[data-page-number=\"${pageNumber}\"]` : ''}`,
        style: htmlElement.getAttribute('style') ?? '',
        tag: element.tagName.toLowerCase(),
      };
    };

    document.addEventListener('securitypolicyviolation', (event) => {
      if (event.sample.includes('--csp-audit-probe')) {
        auditWindow.__cspAudit.probeViolations += 1;
        return;
      }
      const target = event.target instanceof Element ? describeElement(event.target) : null;
      auditWindow.__cspAudit.violations.push({
        blockedUri: event.blockedURI,
        columnNumber: event.columnNumber,
        disposition: event.disposition,
        effectiveDirective: event.effectiveDirective,
        lineNumber: event.lineNumber,
        originalPolicy: event.originalPolicy,
        sample: event.sample,
        sourceFile: event.sourceFile,
        target,
        violatedDirective: event.violatedDirective,
      });
    });

    new MutationObserver((records) => {
      for (const record of records) {
        if (!(record.target instanceof Element) || record.target.id === 'csp-audit-probe') continue;
        const currentStyle = record.target.getAttribute('style') ?? '';
        const previousStyle = record.oldValue ?? '';
        const withoutPlaywrightCaret = (style: string) =>
          style.replace(/(?:^|;\s*)caret-color:\s*transparent\s*!important;?/g, '').trim();
        if (!withoutPlaywrightCaret(currentStyle) && !withoutPlaywrightCaret(previousStyle)) continue;
        const element = describeElement(record.target);
        auditWindow.__cspAudit.mutations.push({
          ...element,
          currentStyle,
          previousStyle,
        });
      }
    }).observe(document, {
      attributes: true,
      attributeFilter: ['style'],
      attributeOldValue: true,
      childList: true,
      subtree: true,
    });
  });
};

const exercisePdfViewer = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    for (const selector of ['#mvPlusBtn', '#mvMinusBtn', '#mvRotateRightBtn', '#mvRotateLeftBtn']) {
      (document.querySelector(selector) as HTMLElement | null)?.click();
    }
    const pageNumber = document.querySelector('#pageNumber') as HTMLInputElement | null;
    if (pageNumber) {
      pageNumber.value = '3';
      pageNumber.dispatchEvent(new Event('change', { bubbles: true }));
    }
    (document.querySelector('#mvSearchBtn') as HTMLElement | null)?.click();
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const searchInput = document.querySelector('#findInput') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.value = 'the';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'Enter', key: 'Enter' }));
    }
    (document.querySelector('#mvIndexBtn') as HTMLElement | null)?.click();
    (document.querySelector('#mvBookmarksBtn') as HTMLElement | null)?.click();
    const viewer = document.querySelector('#viewerContainer') as HTMLElement | null;
    if (viewer) {
      viewer.scrollTop = viewer.scrollHeight;
      viewer.dispatchEvent(new Event('scroll', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1_000);
};

const createInventory = (violations: CspViolation[], mutations: StyleMutation[]) => {
  const countBy = <T>(items: T[], keyFor: (item: T) => string) =>
    [...items.reduce((counts, item) => {
      const key = keyFor(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())]
      .map(([key, count]) => ({ key, count }))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));

  const uniqueMutations = [...new Map(mutations.map((mutation) => [
    `${mutation.owner}|${mutation.selector}|${mutation.currentStyle}`,
    mutation,
  ])).values()];
  const styleProperties = (style: string) => style
    .split(';')
    .map((declaration) => declaration.split(':', 1)[0].trim())
    .filter(Boolean)
    .sort()
    .join(', ') || '(style removed)';
  const normalizedSelector = (selector: string) => selector.replace(/\[data-page-number="\d+"\]/g, '[data-page-number="*"]');
  const pdfjsMutations = uniqueMutations.filter((mutation) => mutation.owner === 'pdfjs');

  return {
    policy: strictStyleAttributePolicy,
    totals: {
      browserReportedCspViolations: violations.length,
      runtimeStyleWrites: mutations.length,
      uniqueRuntimeStyleWrites: uniqueMutations.length,
    },
    violationsByOwner: countBy(violations, (violation) => violation.target?.owner ?? 'unknown'),
    violationsByElement: countBy(
      violations,
      (violation) => `${violation.target?.owner ?? 'unknown'} | ${violation.target?.selector ?? 'document'} | ${violation.sample || '(no sample)'}`
    ),
    mutationsByOwner: countBy(mutations, (mutation) => mutation.owner),
    pdfjsPatterns: countBy(
      pdfjsMutations,
      (mutation) => `${normalizedSelector(mutation.selector)} | ${styleProperties(mutation.currentStyle)}`
    ),
    pdfjsMutations,
    libraryMutations: uniqueMutations.filter((mutation) => mutation.owner === 'library'),
    unknownMutations: uniqueMutations.filter((mutation) => mutation.owner === 'unknown'),
    rawViolations: violations,
  };
};

const attachInventory = async (testInfo: TestInfo, inventory: ReturnType<typeof createInventory>): Promise<void> => {
  const report = `${JSON.stringify(inventory, null, 2)}\n`;
  console.log(JSON.stringify({
    policy: inventory.policy,
    totals: inventory.totals,
    violationsByOwner: inventory.violationsByOwner,
    mutationsByOwner: inventory.mutationsByOwner,
    pdfjsPatterns: inventory.pdfjsPatterns,
  }, null, 2));
  await testInfo.attach('strict-csp-pdf-style-inventory.json', {
    body: Buffer.from(report),
    contentType: 'application/json',
  });
};

test('audits PDF.js runtime style writes under strict CSP', async ({ mediaViewer, page }, testInfo) => {
  await installCspHeader(page);
  await installCspCollector(page);

  const navigationResponse = page.waitForResponse((response) => response.request().isNavigationRequest());
  await mediaViewer.goto();
  expect((await navigationResponse).headers()['content-security-policy']).toBe(strictStyleAttributePolicy);

  await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.id = 'csp-audit-probe';
    document.body.appendChild(probe);
    probe.setAttribute('style', '--csp-audit-probe: blocked');
    probe.remove();
  });
  await page.waitForFunction(() => (window as CspAuditWindow).__cspAudit.probeViolations > 0);

  await mediaViewer.loadDocument(mediaAssets.pdf.url, 'strict-csp-pdf-audit', mediaAssets.pdf.contentType);
  await mediaViewer.loadState.firstPdfPage.waitFor({ state: 'attached' });
  await exercisePdfViewer(page);

  const audit = await page.evaluate(() => (window as CspAuditWindow).__cspAudit);
  const inventory = {
    ...createInventory(audit.violations, audit.mutations),
    probeViolations: audit.probeViolations,
  };
  await attachInventory(testInfo, inventory);

  expect(inventory.probeViolations).toBeGreaterThan(0);
  expect(inventory.rawViolations).toEqual([]);
  expect(inventory.pdfjsMutations.length).toBeGreaterThan(0);
});
