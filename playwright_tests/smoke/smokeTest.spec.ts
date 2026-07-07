import { expect, test } from '@playwright/test';

test(
  'loads a PDF document in the standalone media viewer',
  { tag: ['@e2e-smoke'] },
  async ({ page }) => {
    const documentUrl = process.env.MV_SMOKE_PDF_DOCUMENT_URL ?? 'assets/example.pdf';
    const caseId = process.env.MV_SMOKE_CASE_ID ?? 'standalone-media-viewer-smoke';

    await page.route('**/em-anno/annotation-sets/filter**', async (route) => route.fulfill({ json: [] }));
    await page.route('**/api/markups/**', async (route) => route.fulfill({ json: [] }));
    await page.route('**/em-anno/**/bookmarks', async (route) => route.fulfill({ json: [] }));
    await page.route('**/em-anno/metadata/**', async (route) => route.fulfill({ json: {} }));

    await page.goto('/#/media-viewer');
    await page.getByText('Change document details').click();
    await page.getByLabel('document url').fill(documentUrl);
    await page.getByLabel('document type').fill('pdf');
    await page.getByLabel('case id').fill(caseId);
    await page.getByRole('button', { name: 'Load document' }).click();

    await expect(page.locator('mv-pdf-viewer')).toBeVisible();
    await expect(page.locator('#pageNumber')).toBeVisible();
    await expect(page.locator('div.page[data-page-number="1"]')).toBeVisible();
  }
);
