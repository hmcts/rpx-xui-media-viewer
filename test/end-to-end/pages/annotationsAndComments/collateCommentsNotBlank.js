'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");
const saveActiveComment = require('./saveActiveComment');

module.exports = async function () {
  const I = this;
  await I.seeElement(commonConfig.collateCommentsCheck);
  await I.click(commonConfig.closeCommentSummary);

  const comments = await I.grabNumberOfVisibleElements(commonConfig.commentsCount);
  await I.highlightOnImage(500, 500, 500, 500, ['mousedown', 'mousemove', 'mouseup'], 'box-highlight', 0);
  await I.retry(2).click(commonConfig.commentPopup);
  await saveActiveComment(I, commonConfig.firstComment1, comments + 1);

  await I.retry(2).click(commonConfig.commentsSummaryBtn);
  await I.wait(testConfig.BookmarksAndAnnotationsWait);

  await I.seeElement(commonConfig.collateCommentsCheck);

  let commentsList = await I.grabTextFromAll(commonConfig.commentsCount);
  commentsList.forEach(comment => console.log('collateCommentsNotBlank', comment));
}
