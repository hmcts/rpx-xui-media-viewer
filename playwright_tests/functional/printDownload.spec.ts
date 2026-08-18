import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Print and download', () => {
  test('hands the loaded PDF URL to the browser print window', { tag: ['@e2e-functional', '@feature-print-download'] }, async ({ mediaViewer, page }) => {
    await page.addInitScript(() => {
      window.open = (url?: string | URL) => {
        document.documentElement.dataset.printUrl = String(url);
        return { focus: () => undefined, print: () => undefined } as unknown as Window;
      };
    });
    await page.setViewportSize({ width: 1_920, height: 1_080 });
    await mediaViewer.openDocument(mediaAssets.pdf);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.toolbar.root.getByRole('button', { name: 'Print' })).toBeVisible();

    await mediaViewer.toolbar.clickAction('Print');

    await expect(page.locator('html')).toHaveAttribute('data-print-url', mediaAssets.pdf.url);
  });

  test('hands the loaded PDF URL and configured filename to the browser download', { tag: ['@e2e-functional', '@feature-print-download'] }, async ({ mediaViewer, page }) => {
    await page.addInitScript(() => {
      HTMLAnchorElement.prototype.click = function captureDownload() {
        if (this.download) {
          document.documentElement.dataset.downloadUrl = this.href;
          document.documentElement.dataset.downloadFilename = this.download;
        }
      };
    });
    await mediaViewer.openDocument(mediaAssets.pdf);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.toolbar.root.getByRole('button', { name: 'Download' })).toBeHidden();
    await expect(mediaViewer.toolbar.moreOptionsButton).toBeVisible();

    await mediaViewer.toolbar.clickAction('Download');

    await expect(page.locator('html')).toHaveAttribute(
      'data-download-url',
      `${mediaViewer.resolveDocumentUrl(mediaAssets.pdf.url)}#pdfjs.action=download`
    );
    await expect(page.locator('html')).toHaveAttribute('data-download-filename', 'filename');
  });
});
