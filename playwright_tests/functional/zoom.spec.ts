import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Zoom', () => {
  test('zooms a PDF document in and out', { tag: ['@e2e-functional', '@feature-zoom'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    const firstPage = mediaViewer.loadState.pdfPage(1);
    await expect(firstPage).toBeVisible();
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
    const initialPageWidth = await firstPage.evaluate((element) => getComputedStyle(element).width);
    expect(Number.parseFloat(initialPageWidth)).toBeGreaterThan(0);

    await mediaViewer.zoom.zoomIn();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1.1');
    await expect(firstPage).not.toHaveCSS('width', initialPageWidth);

    await mediaViewer.zoom.zoomOut();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
    await expect(firstPage).toHaveCSS('width', initialPageWidth);
  });

  test('zooms an image document in and out', { tag: ['@e2e-functional', '@feature-zoom'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);

    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
    const initialImageWidth = await mediaViewer.loadState.image.evaluate((element) => getComputedStyle(element).width);
    expect(Number.parseFloat(initialImageWidth)).toBeGreaterThan(0);

    await mediaViewer.zoom.zoomIn();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1.1');
    await expect(mediaViewer.loadState.image).not.toHaveCSS('width', initialImageWidth);

    await mediaViewer.zoom.zoomOut();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
    await expect(mediaViewer.loadState.image).toHaveCSS('width', initialImageWidth);
  });

  test('keeps PDF zoom within the supported scale range', { tag: ['@e2e-functional', '@feature-zoom'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await mediaViewer.zoom.select(0.1);
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('0.1');
    await expect(mediaViewer.zoom.zoomOutButton).toBeDisabled();

    await mediaViewer.zoom.select(0.25);
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('0.25');

    await mediaViewer.zoom.select(5);
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('5');
    await expect(mediaViewer.zoom.zoomInButton).toBeDisabled();

    await mediaViewer.zoom.zoomOut();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('4.9');
  });
});
