const { mvData } = require('../pages/common/constants');
const { deleteHighlightsTest } = require('../helpers/mvCaseHelper');

Feature('PDF annotations deletion');

Scenario('Delete all existing text highlights', async ({ I }) => {
  await deleteHighlightsTest(I, mvData.CASE_ID, mvData.PDF_DOCUMENT);
}).tag('@ci');
