import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Office document conversion', () => {
  test('converts a Word document and renders the returned PDF', { tag: ['@e2e-functional', '@feature-office-conversion'] }, async ({ mediaViewer, page }) => {
    await page.route('**/doc-assembly/convert/playwright-office-document', async (route) => {
      await route.fulfill({ contentType: 'application/pdf', path: 'src/assets/example.pdf' });
    });
    await mediaViewer.goto();

    const convertRequest = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url().endsWith('/doc-assembly/convert/playwright-office-document')
    );
    await mediaViewer.submitDocumentDetails(mediaAssets.officeDocument.url, 'playwright-office-case', mediaAssets.officeDocument.contentType);

    expect((await convertRequest).postData()).toBe('{}');
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfCanvas(1)).toBeVisible();
  });

  test('reports a rendered failure when Word conversion is unavailable', { tag: ['@e2e-functional', '@feature-office-conversion'] }, async ({ mediaViewer, page }) => {
    await page.route('**/doc-assembly/convert/playwright-office-document', async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', json: { message: 'Conversion unavailable' } });
    });
    await mediaViewer.goto();

    await mediaViewer.submitDocumentDetails(mediaAssets.officeDocument.url, 'playwright-office-case', mediaAssets.officeDocument.contentType);

    await expect(mediaViewer.loadState.errorMessage).toBeVisible();
    await expect(mediaViewer.loadState.pdfViewer).toHaveCount(0);
  });
});
