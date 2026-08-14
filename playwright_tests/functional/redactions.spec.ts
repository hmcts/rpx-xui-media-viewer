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

  test('deletes one persisted marker while keeping its sibling redaction', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();

    const firstSaveRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));
    const firstRedaction = (await firstSaveRequest).postDataJSON() as { documentId: string; page: number; redactionId: string; rectangles: Array<{ width: number; height: number }> };
    const secondSaveRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1), { x: 220, y: 160 });
    const secondRedaction = (await secondSaveRequest).postDataJSON() as { documentId: string; page: number; redactionId: string };

    expect(firstRedaction).toMatchObject({ documentId: mediaAssets.pdf.url, page: 1, redactionId: expect.any(String) });
    expect(firstRedaction.rectangles[0].width).toBeGreaterThan(0);
    expect(firstRedaction.rectangles[0].height).toBeGreaterThan(0);
    expect(secondRedaction.redactionId).not.toBe(firstRedaction.redactionId);
    await expect(mediaViewer.redactions.markers).toHaveCount(2);

    await mediaViewer.redactions.markers.first().click();
    await expect(mediaViewer.redactions.contextToolbar.getByRole('button', { name: 'Delete' })).toBeVisible();
    const deleteRequest = page.waitForRequest((request) => request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith(firstRedaction.redactionId));
    await mediaViewer.redactions.deleteSelectedMarker();
    await deleteRequest;
    await expect(mediaViewer.redactions.markers).toHaveCount(1);

    const redactionRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/redaction');
    const download = page.waitForEvent('download');
    await mediaViewer.redactions.saveDocumentButton.click();
    const [request, completedDownload] = await Promise.all([redactionRequest, download]);
    expect((request.postDataJSON() as { redactions: Array<{ redactionId: string }> }).redactions).toEqual([
      expect.objectContaining({ redactionId: secondRedaction.redactionId }),
    ]);
    expect(completedDownload.suggestedFilename()).toBe('redacted.pdf');
  });

  test('redacts every PDF search result and persists the generated markers', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    await mediaViewer.redactions.openSearch();
    await mediaViewer.redactions.searchInput.fill('Trace-based');
    await mediaViewer.redactions.searchButton.click();
    await expect(mediaViewer.redactions.searchResults).toContainText(/results founds/);
    const searchResultCount = Number((await mediaViewer.redactions.searchResults.textContent())?.match(/(\d+)\s+results founds/)?.[1]);
    expect(searchResultCount).toBeGreaterThan(0);

    const bulkSaveRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups/search');
    await mediaViewer.redactions.redactAllButton.click();
    const bulkRedaction = (await bulkSaveRequest).postDataJSON() as { searchRedactions: Array<{ documentId: string; page: number; rectangles: Array<{ width: number; height: number }> }> };

    expect(bulkRedaction.searchRedactions).toHaveLength(searchResultCount);
    for (const redaction of bulkRedaction.searchRedactions) {
      expect(redaction.documentId).toBe(mediaAssets.pdf.url);
      expect(redaction.page).toBeGreaterThan(0);
      expect(redaction.rectangles[0].width).toBeGreaterThan(0);
      expect(redaction.rectangles[0].height).toBeGreaterThan(0);
    }
    await expect(mediaViewer.redactions.markers).toHaveCount(searchResultCount);
  });

});
