import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

const convertedDocuments = [
  { contentType: 'word', documentId: 'playwright-office-document' },
  { contentType: 'excel', documentId: 'playwright-excel-document' },
  { contentType: 'powerpoint', documentId: 'playwright-powerpoint-document' },
  { contentType: 'txt', documentId: 'playwright-text-document' },
  { contentType: 'rtf', documentId: 'playwright-rich-text-document' },
] as const;

test.describe('Office document conversion', () => {
  for (const { contentType, documentId } of convertedDocuments) {
    test(`converts ${contentType} and renders the returned PDF`, { tag: ['@e2e-functional', '@feature-office-conversion'] }, async ({ mediaViewer, page }) => {
      await page.route(`**/doc-assembly/convert/${documentId}`, async (route) => {
        await route.fulfill({ contentType: 'application/pdf', path: 'src/assets/example.pdf' });
      });
      await mediaViewer.goto();

      const convertRequest = page.waitForRequest((request) =>
        request.method() === 'POST' && request.url().endsWith(`/doc-assembly/convert/${documentId}`)
      );
      const convertResponse = page.waitForResponse((response) =>
        response.request().method() === 'POST' && response.url().endsWith(`/doc-assembly/convert/${documentId}`)
      );
      await mediaViewer.submitDocumentDetails(`/documents/${documentId}/binary`, 'playwright-office-case', contentType);

      expect((await convertResponse).status()).toBe(200);
      expect((await convertRequest).postData()).toBe('{}');
      await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
      await expect(mediaViewer.loadState.pdfCanvas(1)).toBeVisible();
    });
  }

  for (const status of [400, 500]) {
    test(`reports conversion HTTP ${status} as a failure`, { tag: ['@e2e-functional', '@feature-office-conversion'] }, async ({ mediaViewer, page }) => {
      await page.route('**/doc-assembly/convert/playwright-conversion-error', async (route) => {
        await route.fulfill({ status, json: { message: 'conversion failed' } });
      });
      await mediaViewer.goto();

      const convertResponse = page.waitForResponse((response) =>
        response.request().method() === 'POST' && response.url().endsWith('/doc-assembly/convert/playwright-conversion-error')
      );
      await mediaViewer.submitDocumentDetails('/documents/playwright-conversion-error/binary', 'playwright-office-case', mediaAssets.officeDocument.contentType);

      expect((await convertResponse).status()).toBe(status);
      await expect(mediaViewer.loadState.successMessage).toHaveCount(0);
      await expect(mediaViewer.loadState.firstPdfPage).toHaveCount(0);
    });
  }

  test('reports a conversion timeout as a failure', { tag: ['@e2e-functional', '@feature-office-conversion'] }, async ({ mediaViewer, page }) => {
    await page.route('**/doc-assembly/convert/playwright-conversion-timeout', async (route) => {
      await route.abort('timedout');
    });
    await mediaViewer.goto();

    await mediaViewer.submitDocumentDetails('/documents/playwright-conversion-timeout/binary', 'playwright-office-case', mediaAssets.officeDocument.contentType);

    await expect(mediaViewer.loadState.successMessage).toHaveCount(0);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveCount(0);
  });

  test('reports a malformed converted PDF as a failure', { tag: ['@e2e-functional', '@feature-office-conversion'] }, async ({ mediaViewer, page }) => {
    await page.route('**/doc-assembly/convert/playwright-malformed-document', async (route) => {
      await route.fulfill({ contentType: 'application/pdf', body: 'not a PDF' });
    });
    await mediaViewer.goto();

    await mediaViewer.submitDocumentDetails('/documents/playwright-malformed-document/binary', 'playwright-office-case', mediaAssets.officeDocument.contentType);

    await expect(mediaViewer.loadState.errorMessage).toBeVisible();
    await expect(mediaViewer.loadState.successMessage).toHaveCount(0);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveCount(0);
  });
});
