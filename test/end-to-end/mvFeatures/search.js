const testConfig = require('./../../config');
const { enterShouldJumpViewerToNextSearchResultsTest } = require("../helpers/mvCaseHelper");
const {mvData} = require('../pages/common/constants.js');

Feature('Search Feature');

Scenario('Enter should jump viewer to next search result', async ({I}) => {
  await enterShouldJumpViewerToNextSearchResultsTest(I, mvData.INDEX_AND_OUTLINE, mvData.CONTENT_SEARCH_KEYWORD, mvData.NUMBER_OF_FINDINGS, mvData.PDF_DOCUMENT);

}).tag('@np')
  .tag('@em-1619')
  .retry(testConfig.TestRetryScenarios)
