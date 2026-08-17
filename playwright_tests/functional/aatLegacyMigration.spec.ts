import { expect, test } from '@playwright/test';
import { canRunAatLegacyMigration, createAatCcdCase, missingAatEnvironment } from '../fixtures/aatLegacyCase';
import { AatCasePage } from '../pages/aatCasePage';
import { MediaViewerPage } from '../pages/mediaViewerPage';

test.describe('AAT legacy Codecept migration', () => {
  test.skip(!canRunAatLegacyMigration(), `Requires TEST_TYPE=aat and: ${missingAatEnvironment().join(', ')}`);
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  let caseId = '';
  let initialComment = '';
  let updatedComment = '';

  test.beforeAll(async ({ request }) => {
    caseId = await createAatCcdCase(request);
  });

  test('creates the CCD case used by Media Viewer journeys', { tag: ['@e2e-functional', '@feature-ccd-case-creation'] }, async ({ page }) => {
    const casePage = new AatCasePage(page);
    await casePage.signIn();
    await page.goto(`/case-details/${caseId}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/case-details/${caseId}$`));
  });

  test('uploads a PDF document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ page }) => {
    const casePage = new AatCasePage(page);
    await casePage.signIn();
    await casePage.openUploadDocument(caseId);
    await casePage.upload(0, 'example.pdf', 'Playwright PDF document');
    await expect(page.getByText('example.pdf', { exact: true })).toBeVisible();
  });

  test('uploads an image document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ page }) => {
    const casePage = new AatCasePage(page);
    await casePage.signIn();
    await casePage.openUploadDocument(caseId);
    await casePage.upload(1, 'quote.jpg', 'Playwright image document');
    await expect(page.getByText('quote.jpg', { exact: true })).toBeVisible();
  });

  test('uploads a Word document through CCD and DM Store', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites'] }, async ({ page }) => {
    const casePage = new AatCasePage(page);
    await casePage.signIn();
    await casePage.openUploadDocument(caseId);
    await casePage.upload(2, 'ThankYou.doc', 'Playwright Word document');
    await expect(page.getByText('ThankYou.doc', { exact: true })).toBeVisible();
  });

  test('creates a non-text image highlight and comment through the live annotation service', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ page }) => {
    const casePage = new AatCasePage(page);
    await casePage.signIn();
    await page.goto(`/case-details/${caseId}`, { waitUntil: 'domcontentloaded' });
    const viewerPage = await casePage.openUploadedDocument('quote.jpg');
    const mediaViewer = new MediaViewerPage(viewerPage);
    initialComment = `Playwright image comment ${Date.now()}`;

    await expect(mediaViewer.loadState.image).toBeVisible();
    await mediaViewer.enableAnnotations();
    const savedAnnotation = viewerPage.waitForResponse((response) => response.url().endsWith('/em-anno/annotations') && response.request().method() === 'POST');
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
    await mediaViewer.comments.addToOnlyAnnotation(initialComment);
    await savedAnnotation;
    await expect(mediaViewer.comments.comment(initialComment)).toBeVisible();
  });

  test('creates a real draw-box image highlight', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ page }) => {
    const casePage = new AatCasePage(page);
    await casePage.signIn();
    await page.goto(`/case-details/${caseId}`, { waitUntil: 'domcontentloaded' });
    const mediaViewer = new MediaViewerPage(await casePage.openUploadedDocument('quote.jpg'));

    await expect(mediaViewer.loadState.image).toBeVisible();
    await mediaViewer.enableAnnotations();
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.image, { x: 220, y: 140 });
    await expect(mediaViewer.annotations.renderedRectangles.last()).toBeVisible();
  });

  test('updates a persisted non-text image comment', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ page }) => {
    const casePage = new AatCasePage(page);
    await casePage.signIn();
    await page.goto(`/case-details/${caseId}`, { waitUntil: 'domcontentloaded' });
    const mediaViewer = new MediaViewerPage(await casePage.openUploadedDocument('quote.jpg'));
    updatedComment = `${initialComment} updated`;

    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment(initialComment)).toBeVisible();
    await mediaViewer.comments.edit(initialComment, updatedComment);
    await expect(mediaViewer.comments.comment(updatedComment)).toBeVisible();
  });

  test('deletes a persisted non-text image comment', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ page }) => {
    const casePage = new AatCasePage(page);
    await casePage.signIn();
    await page.goto(`/case-details/${caseId}`, { waitUntil: 'domcontentloaded' });
    const mediaViewer = new MediaViewerPage(await casePage.openUploadedDocument('quote.jpg'));

    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment(updatedComment)).toBeVisible();
    await mediaViewer.comments.remove(updatedComment);
    await expect(mediaViewer.comments.comment(updatedComment)).toHaveCount(0);
  });
});
