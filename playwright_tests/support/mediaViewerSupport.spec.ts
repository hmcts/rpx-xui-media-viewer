import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('media viewer Playwright support layer', () => {
  test('loads the PDF fixture and exposes focused viewer controls', async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.loadState.pdfViewer).toBeVisible();
    await expect(mediaViewer.loadState.firstPdfPage).toBeVisible();
    await expect(mediaViewer.toolbar.root).toBeVisible();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('1');
    await expect(mediaViewer.zoom.zoomInButton).toBeVisible();
    await expect(mediaViewer.rotation.clockwiseButton).toBeVisible();
    await expect(mediaViewer.search.openButton).toBeVisible();
    await expect(mediaViewer.sidePanels.indexButton).toBeVisible();
  });

  test('loads the image fixture without a live case', async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);

    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.loadState.successMessage).toBeVisible();
  });

  test('reports the unsupported fixture through the viewer state', async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.unsupported);

    await expect(mediaViewer.loadState.unsupportedViewer).toBeVisible();
    await expect(mediaViewer.loadState.errorMessage).toContainText('UNSUPPORTED');
  });
});
