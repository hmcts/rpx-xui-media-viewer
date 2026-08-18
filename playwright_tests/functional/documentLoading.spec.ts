import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Document loading and media types', () => {
  test('loads an image fixture and confirms the rendered media state', { tag: ['@e2e-functional', '@feature-document-loading'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);

    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.loadState.successMessage).toBeVisible();
  });

  test('replaces a rendered PDF with a second PDF and exposes its page contract', { tag: ['@e2e-functional', '@feature-document-loading'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.loadDocument(
      mediaAssets.replacementPdf.url,
      'standalone-media-viewer-replacement',
      mediaAssets.replacementPdf.contentType
    );

    await expect(mediaViewer.navigation.pageCount).toHaveText(`/ ${mediaAssets.replacementPdf.pageCount}`);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfCanvas(1)).toHaveAttribute('width', /^[1-9]\d*$/);
  });

  test('reports an unsupported document type through the rendered viewer state', { tag: ['@e2e-functional', '@feature-document-loading'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.unsupported);

    await expect(mediaViewer.loadState.unsupportedViewer).toBeVisible();
    await expect(mediaViewer.loadState.errorMessage).toContainText('UNSUPPORTED');
  });
});
