import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';
import { auditAccessibilityPage, type AccessibilityEngine } from '../utils/accessibility/accessibilityAudit';

const accessibilityEngines: AccessibilityEngine[] = ['axe', 'wave-like', 'screen-reader'];

test.describe('Media Viewer unified accessibility audit @accessibility @a11y @wave-a11y', () => {
  test('initial document form state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.goto();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'initial document form',
    });
  });

  test('loaded PDF viewer state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.openDocument(mediaAssets.pdf, 'accessibility-media-viewer');
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');

    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'loaded PDF viewer',
    });
  });

  test('loaded image viewer state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.openDocument(mediaAssets.image, 'accessibility-image-viewer');
    await expect(mediaViewer.loadState.image).toBeVisible();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'loaded image viewer',
    });
  });

  test('unsupported document state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.openDocument(mediaAssets.unsupported, 'accessibility-unsupported-document');
    await expect(mediaViewer.loadState.unsupportedViewer).toBeVisible();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'unsupported document',
    });
  });

  test('failed PDF document state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.goto();
    await page.route('**/assets/missing.pdf', async (route) => route.fulfill({ status: 404 }));
    await mediaViewer.submitDocumentDetails('assets/missing.pdf', 'accessibility-missing-pdf', 'pdf');
    await expect(mediaViewer.loadState.errorMessage).toContainText('FAILURE');
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'failed PDF document',
    });
  });

  test('failed image document state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.goto();
    await page.route('**/assets/missing-image.jpg', async (route) => route.fulfill({ status: 404 }));
    await mediaViewer.submitDocumentDetails('assets/missing-image.jpg', 'accessibility-missing-image', 'image');
    await expect(mediaViewer.loadState.errorMessage).toContainText('FAILURE');
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'failed image document',
    });
  });

  test('multimedia player state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.goto();
    await mediaViewer.loadDocument(mediaAssets.video.url, 'accessibility-video', mediaAssets.video.contentType);
    await expect(page.locator('mv-multimedia-player video')).toBeVisible();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'multimedia player',
    });
  });

  test('audio player state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.goto();
    await mediaViewer.loadDocument(mediaAssets.audio.url, 'accessibility-audio', mediaAssets.audio.contentType);
    await expect(page.locator('mv-multimedia-player video')).toBeVisible();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'audio player',
    });
  });

  test('disabled multimedia download fallback is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.goto();
    await page.locator('label[for="toggleMultimedia"]').click();
    await mediaViewer.submitDocumentDetails(mediaAssets.audio.url, 'accessibility-disabled-audio', mediaAssets.audio.contentType);
    await expect(page.getByRole('link', { name: 'Click here to download' })).toBeVisible();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'disabled multimedia fallback',
    });
  });

  test('PDF index panel state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.openDocument(mediaAssets.outlinePdf);
    await mediaViewer.sidePanels.toggleIndex();
    await expect(mediaViewer.indexOutline.item('Index Page')).toBeVisible();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'PDF index panel',
    });
  });

  test('PDF bookmarks panel state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'PDF bookmarks panel',
    });
  });

  test('PDF comments panel state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.panel).toBeVisible();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'PDF comments panel',
    });
  });

  test('PDF redaction toolbar state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.goto();
    await mediaViewer.enableRedactions();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'accessibility-redaction', mediaAssets.pdf.contentType);
    await mediaViewer.openRedactions();
    await expect(mediaViewer.redactions.toolbar).toBeVisible();
    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'PDF redaction toolbar',
    });
  });
});
