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
    expect(payload.rectangles).not.toHaveLength(0);
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
    await expect(mediaViewer.redactions.markers).toHaveCount(0);
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
    expect(firstRedaction.rectangles).not.toHaveLength(0);
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
      expect(redaction.rectangles).not.toHaveLength(0);
      expect(redaction.rectangles[0].width).toBeGreaterThan(0);
      expect(redaction.rectangles[0].height).toBeGreaterThan(0);
    }
    await expect(mediaViewer.redactions.markers).toHaveCount(searchResultCount);
  });

  test('redacts selected text and removes the persisted marker', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-text-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    const saveRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    const selectedText = await mediaViewer.redactions.redactExampleFixtureText();
    expect(selectedText).toContain('Brendan Eich');
    const redaction = await saveRequest;
    const payload = redaction.postDataJSON() as { documentId: string; page: number; redactionId: string; rectangles: Array<{ width: number; height: number }> };
    expect(payload).toMatchObject({ documentId: mediaAssets.pdf.url, page: 1 });
    expect(payload.rectangles).not.toHaveLength(0);
    expect(payload.rectangles[0].width).toBeGreaterThan(0);
    expect(payload.rectangles[0].height).toBeGreaterThan(0);
    await expect(mediaViewer.redactions.markers).toHaveCount(1);
    const deleteRequest = page.waitForRequest((request) => request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith(payload.redactionId));
    await mediaViewer.redactions.markers.first().click();
    await mediaViewer.redactions.deleteSelectedMarker();
    await deleteRequest;
    await expect(mediaViewer.redactions.markers).toHaveCount(0);
  });

  test('keeps text and draw-box redactions together after reload', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-combined-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    const firstSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    const selectedText = await mediaViewer.redactions.redactExampleFixtureText();
    expect(selectedText).toContain('Brendan Eich');
    await firstSave;
    const secondSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));
    await secondSave;
    await expect(mediaViewer.redactions.markers).toHaveCount(2);
    await mediaViewer.reloadDocument(mediaAssets.pdf, 'playwright-redaction-combined-case');
    await mediaViewer.openRedactions();
    await expect(mediaViewer.redactions.markers).toHaveCount(2);
  });

  test('redacts a full PDF page with positive geometry', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-page-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    const fullPageSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.redactCurrentPage();
    const fullPagePayload = (await fullPageSave).postDataJSON() as { documentId: string; page: number; rectangles: Array<{ width: number; height: number }> };
    expect(fullPagePayload).toMatchObject({ documentId: mediaAssets.pdf.url, page: 1 });
    expect(fullPagePayload.rectangles).not.toHaveLength(0);
    expect(fullPagePayload.rectangles[0].width).toBeGreaterThan(0);
    expect(fullPagePayload.rectangles[0].height).toBeGreaterThan(0);
    await expect(mediaViewer.redactions.markers).toHaveCount(1);
  });

  test('retains redactions on multiple PDF pages', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-multi-page-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    const firstPageSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));
    const firstPagePayload = (await firstPageSave).postDataJSON() as { documentId: string; page: number; rectangles: Array<{ width: number; height: number }> };
    expect(firstPagePayload).toMatchObject({ documentId: mediaAssets.pdf.url, page: 1 });
    expect(firstPagePayload.rectangles).not.toHaveLength(0);
    await mediaViewer.navigation.goToPage(2);
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');
    const secondPageSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(2));
    const secondPagePayload = (await secondPageSave).postDataJSON() as { documentId: string; page: number; rectangles: Array<{ width: number; height: number }> };
    expect(secondPagePayload).toMatchObject({ documentId: mediaAssets.pdf.url, page: 2 });
    expect(secondPagePayload.rectangles).not.toHaveLength(0);
    await expect(mediaViewer.redactions.markers).toHaveCount(2);
  });

  test('saves exactly the redactions created on two PDF pages', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-redaction-multi-page-save-case', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    const firstSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));
    const firstRedaction = (await firstSave).postDataJSON() as { redactionId: string; page: number };
    await mediaViewer.navigation.goToPage(2);
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');
    const secondSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(2));
    const secondRedaction = (await secondSave).postDataJSON() as { redactionId: string; page: number };

    const redactionRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/redaction');
    const download = page.waitForEvent('download');
    await mediaViewer.redactions.saveDocumentButton.click();
    const [request, completedDownload] = await Promise.all([redactionRequest, download]);
    const payload = request.postDataJSON() as { documentId: string; redactions: Array<{ redactionId: string; page: number }> };
    expect(payload.documentId).toBe(mediaAssets.pdf.url);
    expect(payload.redactions).toHaveLength(2);
    expect(payload.redactions).toEqual(expect.arrayContaining([firstRedaction, secondRedaction]));
    expect(completedDownload.suggestedFilename()).toBe('redacted.pdf');
    await expect(mediaViewer.redactions.markers).toHaveCount(0);
  });

  test('clears persisted redactions across PDF pages without restoring them after reload', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    const caseId = 'playwright-redaction-multi-page-clear-case';
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, caseId, mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    const firstSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));
    await firstSave;
    await mediaViewer.navigation.goToPage(2);
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');
    const secondSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(2));
    await secondSave;
    await expect(mediaViewer.redactions.markers).toHaveCount(2);

    const clearRequest = page.waitForRequest((request) => request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith(mediaAssets.pdf.url));
    await mediaViewer.redactions.clearAllButton.click();
    await clearRequest;
    await expect(mediaViewer.redactions.markers).toHaveCount(0);
    await mediaViewer.reloadDocument(mediaAssets.pdf, caseId);
    await mediaViewer.openRedactions();
    await expect(mediaViewer.redactions.markers).toHaveCount(0);
  });

  test('keeps the remaining multi-page marker after deleting its sibling and reloading', { tag: ['@e2e-functional', '@feature-redaction'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    const caseId = 'playwright-redaction-multi-page-delete-case';
    await mediaViewer.loadDocument(mediaAssets.pdf.url, caseId, mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    const firstSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(1));
    const firstRedaction = (await firstSave).postDataJSON() as { redactionId: string };

    const secondSave = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/markups');
    await mediaViewer.navigation.goToNextPage();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('2');
    await mediaViewer.redactions.drawOnPage(mediaViewer.loadState.pdfPage(2));
    await secondSave;

    await mediaViewer.redactions.markers.first().click();
    const deleteRequest = page.waitForRequest((request) => request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith(firstRedaction.redactionId));
    await mediaViewer.redactions.deleteSelectedMarker();
    await deleteRequest;
    await mediaViewer.reloadDocument(mediaAssets.pdf, caseId);
    await mediaViewer.openRedactions();
    await expect(mediaViewer.redactions.markers).toHaveCount(1);
    await expect(page.locator('mv-redactions .pageContainer__page[redaction-page-num="1"] .rectangle')).toHaveCount(0);
    await expect(page.locator('mv-redactions .pageContainer__page[redaction-page-num="2"] .rectangle')).toHaveCount(1);
  });

});
