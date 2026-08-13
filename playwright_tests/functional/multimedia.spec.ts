import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Multimedia playback', () => {
  test('loads the enabled native player and exposes usable media controls', { tag: ['@e2e-functional', '@feature-multimedia'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await expect(page.locator('#toggleMultimedia')).toBeChecked();
    await mediaViewer.loadDocument(mediaAssets.video.url, 'standalone-media-viewer-video', mediaAssets.video.contentType);

    const player = page.locator('mv-multimedia-player video');
    await expect(player).toBeVisible();
    await expect(player).toHaveAttribute('controls', '');
    await expect.poll(() => player.evaluate((video: HTMLMediaElement) => video.readyState)).toBeGreaterThanOrEqual(2);
    await expect(page.getByText('Use the player to play to the file or')).toBeVisible();
  });

  test('plays, pauses and rewinds an audio fixture through the focused native player', { tag: ['@e2e-functional', '@feature-multimedia'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await expect(page.locator('#toggleMultimedia')).toBeChecked();
    await mediaViewer.loadDocument(mediaAssets.audio.url, 'standalone-media-viewer-audio', mediaAssets.audio.contentType);

    const player = page.locator('mv-multimedia-player video');
    await expect.poll(() => player.evaluate((media: HTMLMediaElement) => media.readyState)).toBeGreaterThanOrEqual(2);
    await expect.poll(() => player.evaluate((media: HTMLMediaElement) => new URL(media.currentSrc).pathname)).toBe(
      `/${mediaAssets.audio.url}`
    );
    await player.focus();
    await page.keyboard.press('Space');
    await expect.poll(() => player.evaluate((media: HTMLMediaElement) => media.paused)).toBe(false);
    await expect.poll(() => player.evaluate((media: HTMLMediaElement) => media.currentTime)).toBeGreaterThan(0);

    await page.keyboard.press('Space');
    await expect.poll(() => player.evaluate((media: HTMLMediaElement) => media.paused)).toBe(true);
    await page.keyboard.press('Home');
    await expect.poll(() => player.evaluate((media: HTMLMediaElement) => media.currentTime)).toBeLessThan(0.1);
  });

  test('renders the disabled-player download fallback without creating media controls', { tag: ['@e2e-functional', '@feature-multimedia'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    const multimediaToggle = page.locator('#toggleMultimedia');
    await expect(multimediaToggle).toBeChecked();
    await page.locator('label[for="toggleMultimedia"]').click();
    await expect(multimediaToggle).not.toBeChecked();
    await mediaViewer.submitDocumentDetails(mediaAssets.audio.url, 'standalone-media-viewer-disabled-audio', mediaAssets.audio.contentType);

    await expect(page.getByText('Multimedia playback is not enabled,')).toBeVisible();
    await expect(page.locator('mv-multimedia-player video')).toHaveCount(0);
    const downloadLink = page.getByRole('link', { name: 'Click here to download' });
    await expect(downloadLink).toHaveAttribute('href', mediaAssets.audio.url);
    await expect(downloadLink).toHaveAttribute('download', 'filename');
  });

  test('reports an unsupported multimedia payload and preserves its download fallback', { tag: ['@e2e-functional', '@feature-multimedia'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await expect(page.locator('#toggleMultimedia')).toBeChecked();
    await mediaViewer.loadDocument(mediaAssets.unsupported.url, 'standalone-media-viewer-invalid-media', 'mp4');

    await expect(page.getByText('Mime type not supported.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Click here to download' })).toHaveAttribute(
      'href',
      mediaAssets.unsupported.url
    );
  });
});
