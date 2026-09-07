import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Page navigation', () => {
  test('enables and disables the wrapper feature toggles with their viewer controls', { tag: ['@e2e-functional', '@feature-navigation'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();

    for (const toggleId of ['toggleAnnotations', 'toggleRedact', 'toggleICP', 'toggleMultimedia', 'toggleRedactSearch']) {
      const toggle = page.locator(`#${toggleId}`);
      await expect(toggle).toBeChecked();
    }

    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'toolbar-toggle-contract', mediaAssets.pdf.contentType);

    for (const [toggleId, controlId] of [
      ['toggleAnnotations', 'mvHighlightBtn'],
      ['toggleRedact', 'mvRedactBtn'],
      ['toggleICP', 'mvPresentBtn'],
    ]) {
      const toggle = page.locator(`#${toggleId}`);
      const control = page.locator(`#${controlId}`);
      await page.locator(`label[for="${toggleId}"]`).click();
      await expect(toggle).not.toBeChecked();
      await expect(control).toHaveCount(0);

      await page.locator(`label[for="${toggleId}"]`).click();
      await expect(toggle).toBeChecked();
      await expect(control).toBeEnabled();
    }

    await mediaViewer.toolbar.clickAction('Redact');
    const redactFromSearch = page.locator('#mvRedactFromSearchBtn');
    await expect(redactFromSearch).toBeVisible();
    await page.locator('label[for="toggleRedactSearch"]').click();
    await expect(page.locator('#toggleRedactSearch')).not.toBeChecked();
    await expect(redactFromSearch).toHaveCount(0);
    await page.locator('label[for="toggleRedactSearch"]').click();
    await expect(page.locator('#toggleRedactSearch')).toBeChecked();
    await expect(redactFromSearch).toBeVisible();

    await mediaViewer.goto();
    const multimediaToggle = page.locator('#toggleMultimedia');
    await expect(multimediaToggle).toBeChecked();
    await page.locator('label[for="toggleMultimedia"]').click();
    await expect(multimediaToggle).not.toBeChecked();
    await mediaViewer.submitDocumentDetails(mediaAssets.audio.url, 'toolbar-toggle-multimedia-contract', mediaAssets.audio.contentType);
    await expect(page.getByText('Multimedia playback is not enabled,')).toBeVisible();
    await expect(page.locator('mv-multimedia-player video')).toHaveCount(0);

    await page.locator('label[for="toggleMultimedia"]').click();
    await expect(multimediaToggle).toBeChecked();
    await expect(page.locator('mv-multimedia-player video')).toBeVisible();
  });

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
