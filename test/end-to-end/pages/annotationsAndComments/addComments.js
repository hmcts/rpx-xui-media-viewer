'use strict'
const commonConfig = require('../../data/commonConfig.json');
const saveActiveComment = require('./saveActiveComment');

module.exports = async function (commentText) {
  const I = this;
  const comments = await I.grabNumberOfVisibleElements(commonConfig.commentsCount);
  await I.highlightPdfText();
  await I.click(commonConfig.highLightTextCount);
  await I.waitForElement(commonConfig.commentPopup);
  await I.retry(2).click(commonConfig.commentPopup);
  await saveActiveComment(I, commentText, comments + 1);
}
