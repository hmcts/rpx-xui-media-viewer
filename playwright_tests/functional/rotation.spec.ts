import { expect, mediaAssets, savedRotationTest, test } from '../fixtures/mediaViewerTest';

test.describe('Rotation', () => {
  test('rotates an image clockwise and back', { tag: ['@e2e-functional', '@feature-rotation'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);

    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.loadState.image).toHaveClass('rot0');
    const initialTransform = await mediaViewer.loadState.image.evaluate((element) => getComputedStyle(element).transform);
    expect(initialTransform).toBe('none');

    await mediaViewer.rotation.clockwise();
    await expect(mediaViewer.loadState.image).toHaveClass('rot90');
    await expect(mediaViewer.loadState.image).not.toHaveCSS('transform', initialTransform);

    await mediaViewer.rotation.counterclockwise();
    await expect(mediaViewer.loadState.image).toHaveClass('rot0');
    await expect(mediaViewer.loadState.image).toHaveCSS('transform', initialTransform);
  });

  test('rotates a PDF page and restores its original orientation', { tag: ['@e2e-functional', '@feature-rotation'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    const firstPage = mediaViewer.loadState.pdfPage(1);
    const firstPageCanvas = mediaViewer.loadState.pdfCanvas(1);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
    await expect(firstPageCanvas).toBeVisible();

    const initialOrientation = await mediaViewer.loadState.pdfOrientation(1);

    await mediaViewer.rotation.clockwise();
    await expect.poll(() => mediaViewer.loadState.pdfOrientation(1)).not.toBe(initialOrientation);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.rotation.counterclockwise();
    await expect.poll(() => mediaViewer.loadState.pdfOrientation(1)).toBe(initialOrientation);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
  });

  test('restores the default PDF orientation when the document is reloaded', { tag: ['@e2e-functional', '@feature-rotation'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    const firstPage = mediaViewer.loadState.pdfPage(1);
    const firstPageCanvas = mediaViewer.loadState.pdfCanvas(1);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
    await expect(firstPageCanvas).toBeVisible();

    const initialOrientation = await mediaViewer.loadState.pdfOrientation(1);
    await mediaViewer.rotation.clockwise();
    await expect.poll(() => mediaViewer.loadState.pdfOrientation(1)).not.toBe(initialOrientation);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
    await expect.poll(() => mediaViewer.loadState.pdfOrientation(1)).toBe(initialOrientation);
  });

  test('resets PDF orientation when a rotated document is replaced', { tag: ['@e2e-functional', '@feature-rotation'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.replacementPdf);
    const replacementOrientation = await mediaViewer.loadState.pdfOrientation(1);

    await mediaViewer.openDocument(mediaAssets.pdf);
    const firstPage = mediaViewer.loadState.pdfPage(1);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
    const initialOrientation = await mediaViewer.loadState.pdfOrientation(1);

    await mediaViewer.rotation.clockwise();
    await expect.poll(() => mediaViewer.loadState.pdfOrientation(1)).not.toBe(initialOrientation);

    await mediaViewer.loadDocument(mediaAssets.replacementPdf.url, 'standalone-media-viewer-fixture', mediaAssets.replacementPdf.contentType);
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
    await expect.poll(() => mediaViewer.loadState.pdfOrientation(1)).toBe(replacementOrientation);
  });

  savedRotationTest('restores a server-supplied PDF orientation after reload', { tag: ['@e2e-functional', '@feature-rotation'] }, async ({ mediaViewer, page }) => {
    const metadataResponse = page.waitForResponse((response) =>
      response.url().includes(`/em-anno/metadata/${mediaAssets.pdf.url}`) && response.request().method() === 'GET'
    );

    await mediaViewer.openDocument(mediaAssets.pdf);

    expect(await (await metadataResponse).json()).toEqual({ documentId: mediaAssets.pdf.url, rotationAngle: 90 });
    const firstPageCanvas = mediaViewer.loadState.pdfCanvas(1);
    await expect(firstPageCanvas).toBeVisible();
    await expect.poll(() => firstPageCanvas.evaluate((element: HTMLCanvasElement) => element.width > element.height)).toBe(true);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(firstPageCanvas).toBeVisible();
    await expect.poll(() => firstPageCanvas.evaluate((element: HTMLCanvasElement) => element.width > element.height)).toBe(true);
  });

  test('restores the default image transform when the document is reloaded', { tag: ['@e2e-functional', '@feature-rotation'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);
    await mediaViewer.rotation.clockwise();
    await expect(mediaViewer.loadState.image).toHaveClass('rot90');

    await mediaViewer.reloadDocument(mediaAssets.image);
    await expect(mediaViewer.loadState.image).toHaveClass('rot0');
    await expect(mediaViewer.loadState.image).toHaveCSS('transform', 'none');
  });
});
