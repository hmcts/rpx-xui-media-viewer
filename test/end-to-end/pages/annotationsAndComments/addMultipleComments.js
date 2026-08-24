'use strict'
const commonConfig = require('../../data/commonConfig.json');
const saveActiveComment = require('./saveActiveComment');

module.exports = async function () {
  const I = this;
  const comments = await I.grabNumberOfVisibleElements(commonConfig.commentsCount);
  await I.highlightPdfText();
  await I.click(commonConfig.highLightTextCount);
  await I.retry(2).click(commonConfig.commentPopup);
  await saveActiveComment(I, commonConfig.firstComment1, comments + 1);
  await I.nonTextualHighlightAndComment();
}
