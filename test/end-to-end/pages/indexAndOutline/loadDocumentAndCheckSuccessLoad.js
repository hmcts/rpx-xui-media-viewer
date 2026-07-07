'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");
const chai = require('chai');


module.exports = async function (documentId) {
  const I = this;
  await I.waitForText('Change document details', testConfig.TestTimeToWaitForText);
  await I.click(commonConfig.changeDocumentDetails);
  await I.wait(testConfig.BookmarksAndAnnotationsWait);

  await I.fillField(commonConfig.uploadDocumentUrl, `/documents/${documentId}/binary`);
  if (process.env.TEST_URL && process.env.TEST_URL.includes('localhost')) {
    await I.waitForElement('#documentType', testConfig.PageLoadTime);
    await I.fillField('#documentType', 'pdf');
    await I.fillField('#caseId', process.env.MV_SMOKE_CASE_ID || `local-aat-${documentId}`);
  }
  await I.wait(testConfig.TestTimeToWait);
  await I.click('Load document');
  await I.waitForElement({ xpath: commonConfig.mvpdfviewer }, testConfig.PageLoadTime);
  await I.waitForElement(commonConfig.moreOptionsButton, testConfig.PageLoadTime);

};
