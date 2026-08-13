const testConfig = require('./../../config');
const { addMultipleCommentsTest } = require("../helpers/mvCaseHelper");
const { mvData } = require('../pages/common/constants.js');

Feature('Annotations & Comments Feature');

Scenario('Add multiple comments on multiples pages', async ({ I }) => {
  await addMultipleCommentsTest(I, mvData.CASE_ID, mvData.PDF_DOCUMENT);

}).tag('@wip')
  .retry(testConfig.TestRetryScenarios);
