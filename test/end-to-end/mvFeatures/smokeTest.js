const testConfig = require('../../config');

Feature('Standalone Media Viewer Smoke Test');

Scenario('Loads a PDF document in the standalone media viewer', async ({I}) => {
  const documentUrl = process.env.MV_SMOKE_PDF_DOCUMENT_URL || 'assets/example.pdf';
  const caseId = process.env.MV_SMOKE_CASE_ID || 'standalone-media-viewer-smoke';
  const testUrl = process.env.TEST_URL || testConfig.TestUrl;

  await I.amOnPage(testUrl, testConfig.PageLoadTime);
  await I.waitForText('Change document details', testConfig.TestTimeToWaitForText);
  await I.click('Change document details');
  await I.fillField('#documentUrl', documentUrl);
  await I.fillField('#documentType', 'pdf');
  await I.fillField('#caseId', caseId);
  await I.click('Load document');
  await I.waitForElement('//mv-pdf-viewer', testConfig.PageLoadTime);
  await I.waitForElement('#pageNumber', testConfig.PageLoadTime);
  await I.waitForElement('div.page[data-page-number="1"]', testConfig.PageLoadTime);

}).retry(testConfig.TestRetryScenarios)
  .tag('@smoke')
