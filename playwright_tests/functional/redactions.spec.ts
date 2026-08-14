import { expect, mediaAssets, redactionsTest as test } from '../fixtures/mediaViewerTest';

test.describe('Redaction', () => {
  test('creates a draw-box redaction, previews it and clears the persisted marker', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();

    const saveRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));

    const redaction = await saveRequest;
    const payload = redaction.postDataJSON() as { documentId: string; page: number; rectangles: Array<{ width: number; height: number }> };
    expect(payload.documentId).toBe(mediaAssets.pdf.url);
    expect(payload.page).toBe(1);
    expect(payload.rectangles[0].width).toBeGreaterThan(0);
    expect(payload.rectangles[0].height).toBeGreaterThan(0);
    await expect(mediaViewer.redactions.markers).toHaveCount(1);

    await mediaViewer.redactions.previewButton.click();
    await expect(mediaViewer.redactions.viewer).toHaveClass(/is-redaction-preview/);

    const clearRequest = page.waitForRequest((request) => request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith(payload.documentId));
    await mediaViewer.redactions.clearAllButton.click();
    await clearRequest;
    await expect(mediaViewer.redactions.markers).toHaveCount(0);
  });

  test('saves a redacted document with the drawn marker', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));

    const redactionRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/redaction');
    const download = page.waitForEvent('download');
    await mediaViewer.redactions.saveDocumentButton.click();

    const [request, completedDownload] = await Promise.all([redactionRequest, download]);
    const payload = request.postDataJSON() as { documentId: string; redactions: Array<{ page: number }> };
    expect(payload.documentId).toBe(mediaAssets.pdf.url);
    expect(payload.redactions).toHaveLength(1);
    expect(payload.redactions[0].page).toBe(1);
    expect(completedDownload.suggestedFilename()).toBe('redacted.pdf');
  });
});
