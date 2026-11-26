import { expect, test } from '@playwright/test';
import { createAatCcdCase } from '../fixtures/aatLegacyCase';
import { AatCasePage } from '../pages/aatCasePage';

const uploadDefectTag = '@defect-EXUI-5123';

test.describe('AAT CCD browser legacy Codecept migration', () => {
  test.setTimeout(45_000);

  test('opens an API-created Employment Leeds case in authenticated Manage Case', { tag: ['@external-service-contracts', '@feature-ccd-case-creation'] }, async ({ page, request }) => {
    test.setTimeout(150_000);
    const caseId = await createAatCcdCase(request);
    const ccd = new AatCasePage(page);

    await ccd.signIn();
    await ccd.openCaseDetails(caseId);
    await expect(page).toHaveURL(new RegExp(`/cases/case-details/EMPLOYMENT/Leeds/${caseId}(?:#.*)?$`));
    await expect(page.getByRole('tab', { name: /^Case Details/ })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Next step' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Next step' })).toBeEnabled();
    await expect.poll(() => page.getByRole('combobox', { name: 'Next step' }).locator('option:not([value=""]):not([disabled])').count()).toBeGreaterThan(0);
  });

  test('uploads a PDF document through the CCD browser event', { tag: ['@external-service-contracts', '@feature-aat-document-prerequisites', uploadDefectTag] }, async ({ page, request }) => {
    const ccd = new AatCasePage(page);
    await ccd.signIn();
    await ccd.openUploadDocument(await createAatCcdCase(request));
    await ccd.upload(0, 'example.pdf', 'Playwright PDF upload');
    await expect(page.getByRole('link', { name: 'example.pdf', exact: true })).toBeVisible();
  });

  test('uploads an image document through the CCD browser event', { tag: ['@external-service-contracts', '@feature-aat-document-prerequisites', uploadDefectTag] }, async ({ page, request }) => {
    const ccd = new AatCasePage(page);
    await ccd.signIn();
    await ccd.openUploadDocument(await createAatCcdCase(request));
    await ccd.upload(0, 'quote.jpg', 'Playwright image upload');
    await expect(page.getByRole('link', { name: 'quote.jpg', exact: true })).toBeVisible();
  });

  test('uploads a Word document through the CCD browser event', { tag: ['@external-service-contracts', '@feature-aat-document-prerequisites', uploadDefectTag] }, async ({ page, request }) => {
    const ccd = new AatCasePage(page);
    await ccd.signIn();
    await ccd.openUploadDocument(await createAatCcdCase(request));
    await ccd.upload(0, 'ThankYou.doc', 'Playwright Word upload');
    await expect(page.getByRole('link', { name: 'ThankYou.doc', exact: true })).toBeVisible();
  });
});
