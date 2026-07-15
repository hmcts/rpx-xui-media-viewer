import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('media viewer Playwright support layer', () => {
  test('loads the PDF fixture and exposes focused viewer controls', async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.loadState.pdfViewer).toBeVisible();
    await expect(mediaViewer.loadState.firstPdfPage).toBeVisible();
    await expect(mediaViewer.toolbar.root).toBeVisible();
    await expect(mediaViewer.toolbar.moreOptionsButton).toBeVisible();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('1');
    await expect(mediaViewer.zoom.zoomInButton).toBeVisible();
    await expect(mediaViewer.rotation.clockwiseButton).toBeVisible();
    await expect(mediaViewer.search.openButton).toBeVisible();
    await expect(mediaViewer.sidePanels.indexButton).toBeVisible();
    await expect(mediaViewer.sidePanels.bookmarksButton).toBeVisible();

    await mediaViewer.goto();
    await expect(page).toHaveURL(/\/#\/media-viewer$/);
  });

  test('loads the image fixture without a live case', async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);

    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.loadState.successMessage).toBeVisible();
  });

  test('loads a fixture when no previous PDF page has rendered', async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveCount(0);

    await mediaViewer.loadDocument(
      mediaAssets.unsupported.url,
      'standalone-media-viewer-no-previous-page',
      mediaAssets.unsupported.contentType
    );

    await expect(mediaViewer.loadState.firstPdfPage).toHaveCount(0);
    await expect(mediaViewer.loadState.unsupportedViewer).toBeVisible();
  });

  test('replaces an already rendered PDF fixture', async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.loadDocument(
      mediaAssets.replacementPdf.url,
      'standalone-media-viewer-replacement',
      mediaAssets.replacementPdf.contentType
    );

    await expect(mediaViewer.navigation.pageCount).toHaveText('/ 6');
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfCanvas(1)).toHaveAttribute('width', /^[1-9]\d*$/);
  });

  test('reports the unsupported fixture through the viewer state', async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.unsupported);

    await expect(mediaViewer.loadState.unsupportedViewer).toBeVisible();
    await expect(mediaViewer.loadState.errorMessage).toContainText('UNSUPPORTED');
  });

  test('reports a failed viewer route with its response status', async ({ mediaViewer, page }) => {
    await page.route('**/*', async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.fulfill({ status: 503, contentType: 'text/html', body: 'Service unavailable' });
        return;
      }
      await route.continue();
    });

    await expect(mediaViewer.goto()).rejects.toThrow('Media viewer route failed: 503');
  });

  test('reports a failed document request with its asset URL', async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await page.route('**/assets/missing.pdf', async (route) => route.fulfill({ status: 404 }));

    await expect(mediaViewer.loadDocument('assets/missing.pdf', 'missing-asset')).rejects.toThrow(
      'Document request failed: 404'
    );
  });

  test('accepts a cache-revalidated document response', async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await page.route('**/assets/cached.pdf', async (route) => route.fulfill({ status: 304 }));

    await expect(mediaViewer.loadDocument('assets/cached.pdf', 'cached-asset')).resolves.toBeUndefined();
  });
});
