import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

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
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');

    const initialOrientation = await firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    });

    await mediaViewer.rotation.clockwise();
    await expect.poll(() => firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    })).not.toBe(initialOrientation);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.rotation.counterclockwise();
    await expect.poll(() => firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    })).toBe(initialOrientation);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
  });

  test('restores the default PDF orientation when the document is reloaded', { tag: ['@e2e-functional', '@feature-rotation'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    const firstPage = mediaViewer.loadState.pdfPage(1);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');

    const initialOrientation = await firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    });
    await mediaViewer.rotation.clockwise();
    await expect.poll(() => firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    })).not.toBe(initialOrientation);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
    await expect.poll(() => firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    })).toBe(initialOrientation);
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
