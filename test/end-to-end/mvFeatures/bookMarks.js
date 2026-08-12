const testConfig = require('./../../config');
const { createBookmarkTest } = require('../helpers/mvCaseHelper');
const { mvData } = require('../pages/common/constants.js');

Feature('Bookmarks Feature');

Scenario('Create a bookmark using highlight function', async ({ I }) => {
  await createBookmarkTest(I, mvData.CASE_ID, mvData.PDF_DOCUMENT);
}).tag('@ci')
  .retry(testConfig.TestRetryScenarios);
