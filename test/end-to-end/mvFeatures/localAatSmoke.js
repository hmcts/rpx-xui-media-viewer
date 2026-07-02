const testConfig = require('../../config');

Feature('Local AAT Standalone Media Viewer');

Scenario('Loads an AAT PDF document in the standalone media viewer', async ({ I }) => {
  const documentId = process.env.MV_SMOKE_PDF_DOCUMENT_ID || '04666097-eb32-4b2b-9bec-8e9ce8057560';
  const caseId = process.env.MV_SMOKE_CASE_ID || 'local-aat-media-viewer';
  const testUrl = process.env.TEST_URL || testConfig.TestUrl;

  await I.amOnPage(testUrl, testConfig.PageLoadTime);
  await I.waitForText('Change document details', testConfig.TestTimeToWaitForText);
  await I.click('Change document details');
  await I.fillField('#documentUrl', `/documents/${documentId}/binary`);
  await I.fillField('#documentType', 'pdf');
  await I.fillField('#caseId', caseId);
  await I.click('Load document');
  await I.waitForElement('//mv-pdf-viewer', testConfig.PageLoadTime);
  await I.waitForElement('#pageNumber', testConfig.PageLoadTime);
  await I.waitForElement('div.page[data-page-number="1"]', testConfig.PageLoadTime);
}).tag('@local-aat');
