import { expect, test } from '../fixtures/mediaViewerTest';
import { auditAccessibilityPage, type AccessibilityEngine } from '../utils/accessibility/accessibilityAudit';

const accessibilityEngines: AccessibilityEngine[] = ['axe', 'wave-like', 'screen-reader'];

test.describe('Media Viewer unified accessibility audit @accessibility @a11y @wave-a11y', () => {
  test('loaded PDF viewer state is accessible', async ({ page, mediaViewer }, testInfo) => {
    await mediaViewer.goto();
    await mediaViewer.loadDocument('assets/example.pdf', 'accessibility-media-viewer');
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');

    await auditAccessibilityPage(page, testInfo, {
      defaultEngines: accessibilityEngines,
      feature: 'media-viewer',
      pageState: 'loaded PDF viewer',
    });
  });
});
