import { expect, test as base } from '@playwright/test';
import { createAatLegacyJourney, type AatLegacyJourney } from '../fixtures/aatLegacyCase';
import { MediaViewerPage } from '../pages/mediaViewerPage';

const test = base.extend<{ aatJourney: AatLegacyJourney }>({
  aatJourney: async ({ page, request }, use) => {
    await use(await createAatLegacyJourney(request, page));
  },
});

test.describe('AAT legacy Codecept migration', () => {
  test.setTimeout(120_000);

  test('creates the CCD case used by Media Viewer journeys', { tag: ['@e2e-functional', '@feature-ccd-case-creation'] }, async ({ aatJourney, page }) => {
    await page.goto(`/case-details/${aatJourney.caseId}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/case-details/${aatJourney.caseId}$`));
  });

  test('uploads a PDF document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ aatJourney, page }) => {
    await aatJourney.uploadDocument(0, 'example.pdf', 'Playwright PDF document');
    await expect(page.getByText('example.pdf', { exact: true })).toBeVisible();
  });

  test('uploads an image document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ aatJourney, page }) => {
    await aatJourney.uploadDocument(1, 'quote.jpg', 'Playwright image document');
    await expect(page.getByText('quote.jpg', { exact: true })).toBeVisible();
  });

  test('uploads a Word document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ aatJourney, page }) => {
    await aatJourney.uploadDocument(2, 'ThankYou.doc', 'Playwright Word document');
    await expect(page.getByText('ThankYou.doc', { exact: true })).toBeVisible();
  });

  test('creates a non-text image highlight and comment through the live annotation service', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ aatJourney }) => {
    const viewerPage = await aatJourney.openUploadedImage();
    const mediaViewer = new MediaViewerPage(viewerPage);
    const initialComment = `Playwright image comment ${Date.now()}`;

    await expect(mediaViewer.loadState.image).toBeVisible();
    await mediaViewer.enableAnnotations();
    const savedAnnotation = viewerPage.waitForResponse((response) => response.url().endsWith('/em-anno/annotations') && response.request().method() === 'POST');
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
    await mediaViewer.comments.addToOnlyAnnotation(initialComment);
    await savedAnnotation;
    await expect(mediaViewer.comments.comment(initialComment)).toBeVisible();
  });

  test('creates a real draw-box image highlight', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ aatJourney }) => {
    const mediaViewer = new MediaViewerPage(await aatJourney.openUploadedImage());

    await expect(mediaViewer.loadState.image).toBeVisible();
    await mediaViewer.enableAnnotations();
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image, { x: 220, y: 140 });
    await expect(mediaViewer.annotations.renderedRectangles.last()).toBeVisible();
  });

  test('updates a persisted non-text image comment', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ aatJourney }) => {
    const mediaViewer = new MediaViewerPage(await aatJourney.openUploadedImage());
    const initialComment = `Playwright image comment ${Date.now()}`;
    const updatedComment = `${initialComment} updated`;

    await mediaViewer.enableAnnotations();
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image);
    await mediaViewer.comments.addToOnlyAnnotation(initialComment);
    await mediaViewer.comments.edit(initialComment, updatedComment);
    await expect(mediaViewer.comments.comment(updatedComment)).toBeVisible();
  });

  test('deletes a persisted non-text image comment', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ aatJourney }) => {
    const mediaViewer = new MediaViewerPage(await aatJourney.openUploadedImage());
    const initialComment = `Playwright image comment ${Date.now()}`;

    await mediaViewer.enableAnnotations();
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image);
    await mediaViewer.comments.addToOnlyAnnotation(initialComment);
    await mediaViewer.comments.remove(initialComment);
    await expect(mediaViewer.comments.comment(initialComment)).toHaveCount(0);
  });
});
