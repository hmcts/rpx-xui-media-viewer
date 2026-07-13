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
  await I.wait(testConfig.BookmarksAndAnnotationsWait);

  await selectPdfText(I);
  await I.waitForElement(commonConfig.highLightPopup, commonConfig.BookmarksAndAnnotationsWait);
  await I.click(commonConfig.highLightPopup);
  await I.waitForElement(commonConfig.highLightTextCount);
  await I.click(commonConfig.redactTextCss);

}
