import { annotationsTest, expect, mediaAssets, redactionsTest, test } from '../fixtures/mediaViewerTest';

const annotationRequest = (url: string) => url.endsWith('/em-anno/annotations');

test.describe('Deterministic viewer service contracts', () => {
  test('converts a Word document through Document Assembly and renders its PDF response', { tag: ['@integration', '@feature-office-conversion'] }, async ({ mediaViewer, page }) => {
    const conversionDocumentId = 'playwright-office-document';
    await page.route(`**/doc-assembly/convert/${conversionDocumentId}`, async (route) => {
      await route.fulfill({ contentType: 'application/pdf', path: 'src/assets/example.pdf' });
    });
    await mediaViewer.goto();

    const conversionRequest = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url().endsWith(`/doc-assembly/convert/${conversionDocumentId}`)
    );
    await mediaViewer.submitDocumentDetails(
      mediaAssets.officeDocument.url,
      'playwright-integration-office-case',
      mediaAssets.officeDocument.contentType
    );

    expect((await conversionRequest).postData()).toBe('{}');
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfCanvas(1)).toBeVisible();
  });
});

annotationsTest.describe('Deterministic annotation service contract', () => {
  annotationsTest('persists a user-created PDF highlight through the annotation service response', { tag: ['@integration', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf, 'playwright-integration-annotations');
    await mediaViewer.annotations.openTextHighlight();
    await mediaViewer.annotations.selectExampleFixtureText();

    const saveRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    const saveResponse = page.waitForResponse((response) => annotationRequest(response.url()) && response.request().method() === 'POST');
    await mediaViewer.annotations.createButton.click();

    const savedAnnotation = (await saveRequest).postDataJSON() as { documentId: string; rectangles: Array<{ width: number; height: number }> };
    expect(savedAnnotation.documentId).toBe(mediaAssets.pdf.url);
    expect(savedAnnotation.rectangles[0]).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(savedAnnotation.rectangles[0].width).toBeGreaterThan(0);
    expect(savedAnnotation.rectangles[0].height).toBeGreaterThan(0);
    expect(await (await saveResponse).json()).toMatchObject({ documentId: mediaAssets.pdf.url });

    await mediaViewer.reloadDocument(mediaAssets.pdf, 'playwright-integration-annotations');
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
    await expect(mediaViewer.annotations.renderedRectangles).toHaveCount(1);
  });
});

redactionsTest.describe('Deterministic redaction service contract', () => {
  redactionsTest('persists and clears a drawn redaction through the markup service response', { tag: ['@integration', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-integration-redaction', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();

    const saveRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));
    const savedRedaction = (await saveRequest).postDataJSON() as { documentId: string; rectangles: Array<{ width: number; height: number }> };
    expect(savedRedaction.documentId).toBe(mediaAssets.pdf.url);
    expect(savedRedaction.rectangles[0]).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(savedRedaction.rectangles[0].width).toBeGreaterThan(0);
    expect(savedRedaction.rectangles[0].height).toBeGreaterThan(0);
    await expect(mediaViewer.redactions.markers).toHaveCount(1);

    const clearRequest = page.waitForRequest((request) => request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith(savedRedaction.documentId));
    await mediaViewer.redactions.clearAllButton.click();
    await clearRequest;
    await expect(mediaViewer.redactions.markers).toHaveCount(0);
  });
});
