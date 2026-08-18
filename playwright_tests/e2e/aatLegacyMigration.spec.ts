import { expect, test } from '@playwright/test';
import { openAatDocumentInMediaViewer } from '../fixtures/aatLegacyCase';

test.describe('Live image annotation lifecycle', () => {
  test.setTimeout(45_000);

  test('persists a complete non-text image annotation lifecycle through the live service', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ page, request }) => {
    const caseId = `playwright-image-${Date.now()}`;
    const mediaViewer = await openAatDocumentInMediaViewer(request, page, caseId, 'quote.jpg', 'image');
    const initialComment = `Playwright image comment ${Date.now()}`;
    const updatedComment = `Updated Playwright image comment ${Date.now()}`;

    await test.step('creates a real draw-box image highlight', async () => {
      await expect(mediaViewer.loadState.image).toBeVisible();
      await mediaViewer.annotations.drawOnImage();
      await expect(mediaViewer.annotations.renderedRectangles).toHaveCount(1, { timeout: 5_000 });
    });

    await test.step('creates a non-text image highlight and comment through the live annotation service', async () => {
      const savedAnnotation = page.waitForResponse(
        (response) => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/annotations'),
        { timeout: 15_000 }
      );
      await expect(page.getByRole('button', { name: 'Comment' })).toBeVisible();
      await mediaViewer.comments.addToSelectedAnnotation(initialComment);
      await expect((await savedAnnotation).ok()).toBeTruthy();
      await expect(mediaViewer.comments.comment(initialComment)).toBeVisible();
    });

    await test.step('updates a persisted non-text image comment', async () => {
      const updatedAnnotation = page.waitForResponse(
        (response) => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/annotations'),
        { timeout: 15_000 }
      );
      await mediaViewer.comments.editSelected(initialComment, updatedComment);
      await expect((await updatedAnnotation).ok()).toBeTruthy();
      await expect(mediaViewer.comments.comment(updatedComment)).toBeVisible();
    });

    await test.step('deletes a persisted non-text image comment', async () => {
      const deletedAnnotation = page.waitForResponse(
        (response) => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/annotations'),
        { timeout: 15_000 }
      );
      await mediaViewer.comments.remove(updatedComment);
      await expect((await deletedAnnotation).ok()).toBeTruthy();
      await expect(mediaViewer.comments.comment(updatedComment)).toHaveCount(0);
    });
  });
});
