import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Page navigation', () => {
  test('navigates between PDF pages', { tag: ['@e2e-functional', '@feature-navigation'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('1');
    await expect(mediaViewer.loadState.pdfPage(1)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfPage(1)).toBeInViewport();

    await mediaViewer.navigation.goToNextPage();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('2');
    await expect(mediaViewer.loadState.pdfPage(2)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfPage(2)).toBeInViewport();

    await mediaViewer.navigation.goToPage(3);
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('3');
    await expect(mediaViewer.loadState.pdfPage(3)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(3)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfPage(3)).toBeInViewport();

    await mediaViewer.navigation.goToPreviousPage();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('2');
    await expect(mediaViewer.loadState.pdfPage(2)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfPage(2)).toBeInViewport();
  });

  test('keeps page navigation within document bounds and exposes the viewer toolbar', { tag: ['@e2e-functional', '@feature-navigation'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.toolbar.root).toBeVisible();
    await expect(mediaViewer.toolbar.moreOptionsButton).toBeVisible();
    await expect(mediaViewer.navigation.pageCount).toHaveText(`/ ${mediaAssets.pdf.pageCount}`);
    await expect(mediaViewer.navigation.previousPageButton).toBeDisabled();
    await expect(mediaViewer.navigation.nextPageButton).toBeEnabled();

    await mediaViewer.navigation.goToPage(mediaAssets.pdf.pageCount);
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue(String(mediaAssets.pdf.pageCount));
    await expect(mediaViewer.loadState.pdfPage(mediaAssets.pdf.pageCount)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(mediaAssets.pdf.pageCount)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.navigation.previousPageButton).toBeEnabled();
    await expect(mediaViewer.navigation.nextPageButton).toBeDisabled();
  });
});
