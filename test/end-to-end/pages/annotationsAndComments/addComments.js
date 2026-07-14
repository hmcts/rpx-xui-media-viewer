'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function (commentText) {
  const I = this;
  const comments = await I.grabNumberOfVisibleElements(commonConfig.commentsCount);
  await I.highlightPdfText();
  await I.click(commonConfig.highLightTextCount);
  await I.waitForElement(commonConfig.commentPopup);
  await I.retry(2).click(commonConfig.commentPopup);
  await I.waitForVisible(commonConfig.firstCommentXp);
  await I.fillField(commonConfig.firstCommentXp, commentText);
  await I.executeScript(() => {
    const textarea = [...document.querySelectorAll('textarea[name="content"]')]
      .find((element) => element.offsetParent !== null);
    const saveButton = textarea?.parentElement?.querySelector('.commentBtns > button:first-child');
    if (saveButton) {
      saveButton.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  });
  await I.waitForClickable(commonConfig.saveButton);
  await I.retry(3).click(commonConfig.saveButton);
  await I.waitNumberOfVisibleElements(commonConfig.commentsCount, comments + 1);
}
