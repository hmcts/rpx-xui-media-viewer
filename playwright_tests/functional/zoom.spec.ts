import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Zoom', () => {
  test('zooms a PDF document in and out', { tag: ['@e2e-functional', '@feature-zoom'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    const firstPage = mediaViewer.loadState.pdfPage(1);
    const firstPageCanvas = mediaViewer.loadState.pdfCanvas(1);
    await expect(firstPage).toBeVisible();
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
    await expect(firstPageCanvas).toHaveAttribute('width', /^[1-9]\d*$/);
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
    const initialCanvasWidth = Number(await firstPageCanvas.getAttribute('width'));
    expect(initialCanvasWidth).toBeGreaterThan(0);

    await mediaViewer.zoom.zoomIn();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1.1');
    await expect.poll(async () => Number(await firstPageCanvas.getAttribute('width'))).toBeGreaterThan(initialCanvasWidth);

    await mediaViewer.zoom.zoomOut();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
    await expect.poll(async () => Number(await firstPageCanvas.getAttribute('width'))).toBe(initialCanvasWidth);
  });

  test('zooms an image document in and out', { tag: ['@e2e-functional', '@feature-zoom'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);

    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
    const initialBounds = await mediaViewer.loadState.image.boundingBox();
    if (!initialBounds) {
      throw new Error('Image was not visible for zoom measurement');
    }
    expect(initialBounds.width).toBeGreaterThan(0);

    await mediaViewer.zoom.zoomIn();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1.1');
    await expect.poll(async () => (await mediaViewer.loadState.image.boundingBox())?.width ?? 0).toBeGreaterThan(initialBounds.width);

    await mediaViewer.zoom.zoomOut();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
    await expect.poll(async () => (await mediaViewer.loadState.image.boundingBox())?.width ?? 0).toBeCloseTo(initialBounds.width, 2);
  });

  test('keeps PDF zoom within the supported scale range', { tag: ['@e2e-functional', '@feature-zoom'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');

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
