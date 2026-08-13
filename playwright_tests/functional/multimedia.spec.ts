import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Multimedia playback', () => {
  test('loads the enabled native player and exposes usable media controls', { tag: ['@e2e-functional', '@feature-multimedia'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await page.locator('#toggleMultimedia').check();
    await mediaViewer.loadDocument(mediaAssets.video.url, 'standalone-media-viewer-video', mediaAssets.video.contentType);

    const player = page.locator('mv-multimedia-player video');
    await expect(player).toBeVisible();
    await expect(player).toHaveAttribute('controls', '');
    await expect.poll(() => player.evaluate((video) => video.readyState)).toBeGreaterThanOrEqual(2);
    await expect(page.getByText('Use the player to play to the file or')).toBeVisible();
  });
});
