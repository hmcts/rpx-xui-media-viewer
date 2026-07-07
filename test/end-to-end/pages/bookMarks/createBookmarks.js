'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");
const selectPdfText = require('../common/selectPdfText');

module.exports = async function () {
  const I = this;
  
  await I.click(commonConfig.mvHighLight);
  const toolbar = await I.grabNumberOfVisibleElements(commonConfig.mvHighLightText);
  if (toolbar) {
    await I.click(commonConfig.mvHighLightText);
  }

  await selectPdfText(I);

  await I.wait(testConfig.BookmarksAndAnnotationsWait);
  await I.click(commonConfig.bookMarksButton);
}
