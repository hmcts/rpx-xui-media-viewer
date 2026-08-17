import { expect, test as base } from '@playwright/test';
import { createAatCcdCase, openAatDocumentInMediaViewer, uploadAatDocument } from '../fixtures/aatLegacyCase';

const test = base.extend<{ caseId: string }>({
  caseId: async ({ request }, use) => {
    await use(await createAatCcdCase(request));
  },
});

test.describe('AAT legacy Codecept migration', () => {
  test.setTimeout(120_000);

  test('creates the CCD case used by Media Viewer journeys', { tag: ['@e2e-functional', '@feature-ccd-case-creation'] }, async ({ caseId, page, request }) => {
    const mediaViewer = await openAatDocumentInMediaViewer(request, page, caseId, 'example.pdf', 'pdf');
    await expect(mediaViewer.loadState.firstPdfPage).toBeVisible();
  });

  test('uploads a PDF document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ caseId, page, request }) => {
    const mediaViewer = await openAatDocumentInMediaViewer(request, page, caseId, 'example.pdf', 'pdf');
    await expect(mediaViewer.loadState.firstPdfPage).toBeVisible();
  });

  test('uploads an image document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ caseId, page, request }) => {
    const mediaViewer = await openAatDocumentInMediaViewer(request, page, caseId, 'quote.jpg', 'image');
    await expect(mediaViewer.loadState.image).toBeVisible();
  });

  test('uploads a Word document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ request }) => {
    const document = await uploadAatDocument(request, 'ThankYou.doc');
    await expect(document.id).toMatch(/^[0-9a-f-]+$/i);
  });

  test('creates a non-text image highlight and comment through the live annotation service', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ caseId, page, request }) => {
    const mediaViewer = await openAatDocumentInMediaViewer(request, page, caseId, 'quote.jpg', 'image');
    const initialComment = `Playwright image comment ${Date.now()}`;

    await expect(mediaViewer.loadState.image).toBeVisible();
    await mediaViewer.enableAnnotations();
    const savedAnnotation = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/annotations'));
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
    await mediaViewer.comments.addToSelectedAnnotation(initialComment);
    await savedAnnotation;
    await expect(mediaViewer.comments.comment(initialComment)).toBeVisible();
  });

  test('creates a real draw-box image highlight', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ caseId, page, request }) => {
    const mediaViewer = await openAatDocumentInMediaViewer(request, page, caseId, 'quote.jpg', 'image');

    await expect(mediaViewer.loadState.image).toBeVisible();
    await mediaViewer.enableAnnotations();
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image, { x: 220, y: 140 });
    await expect(mediaViewer.annotations.renderedRectangles.last()).toBeVisible();
  });

  test('updates a persisted non-text image comment', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ caseId, page, request }) => {
    const mediaViewer = await openAatDocumentInMediaViewer(request, page, caseId, 'quote.jpg', 'image');
    const initialComment = `Playwright image comment ${Date.now()}`;
    const updatedComment = `${initialComment} updated`;

    await mediaViewer.enableAnnotations();
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image);
    await mediaViewer.comments.addToSelectedAnnotation(initialComment);
    await mediaViewer.comments.edit(initialComment, updatedComment);
  });

  test('deletes a persisted non-text image comment', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ caseId, page, request }) => {
    const mediaViewer = await openAatDocumentInMediaViewer(request, page, caseId, 'quote.jpg', 'image');
    const initialComment = `Playwright image comment ${Date.now()}`;

    await mediaViewer.enableAnnotations();
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image);
    await mediaViewer.comments.addToSelectedAnnotation(initialComment);
    await mediaViewer.comments.remove(initialComment);
    await expect(mediaViewer.comments.comment(initialComment)).toHaveCount(0);
  });
});
