import { expect, test } from '@playwright/test';
import { createAatCcdCase } from '../fixtures/aatLegacyCase';
import { AatCasePage } from '../pages/aatCasePage';

const caseDetailsDefectTag = '@defect-EXUI-5122';
const uploadDefectTag = '@defect-EXUI-5123';

test.describe('AAT CCD legacy Codecept migration', () => {
  test.setTimeout(45_000);

  test('creates the CCD case used by Media Viewer journeys through the authenticated browser route', { tag: ['@e2e-functional', '@feature-ccd-case-creation', caseDetailsDefectTag] }, async ({ page, request }) => {
    const caseId = await createAatCcdCase(request);
    const ccd = new AatCasePage(page);

    await ccd.signIn();
    await ccd.openCaseDetails(caseId);
    await expect(page).toHaveURL(new RegExp(`/case-details/${caseId}$`));
  });

  test('uploads a PDF document through the CCD browser event', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites', uploadDefectTag] }, async ({ page, request }) => {
    const ccd = new AatCasePage(page);
    await ccd.signIn();
    await ccd.openUploadDocument(await createAatCcdCase(request));
    await ccd.upload(0, 'example.pdf', 'Playwright PDF upload');
    await expect(page.getByRole('link', { name: 'example.pdf', exact: true })).toBeVisible();
  });

  test('uploads an image document through the CCD browser event', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites', uploadDefectTag] }, async ({ page, request }) => {
    const ccd = new AatCasePage(page);
    await ccd.signIn();
    await ccd.openUploadDocument(await createAatCcdCase(request));
    await ccd.upload(0, 'quote.jpg', 'Playwright image upload');
    await expect(page.getByRole('link', { name: 'quote.jpg', exact: true })).toBeVisible();
  });

  test('uploads a Word document through the CCD browser event', { tag: ['@e2e-functional', '@feature-aat-document-prerequisites', uploadDefectTag] }, async ({ page, request }) => {
    const ccd = new AatCasePage(page);
    await ccd.signIn();
    await ccd.openUploadDocument(await createAatCcdCase(request));
    await ccd.upload(0, 'ThankYou.doc', 'Playwright Word upload');
    await expect(page.getByRole('link', { name: 'ThankYou.doc', exact: true })).toBeVisible();
  });
});
