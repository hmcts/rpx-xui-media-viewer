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
  const saveButton = await I.executeScript(() => {
    const textarea = [...document.querySelectorAll('textarea[name="content"]')]
      .find((element) => element.offsetParent !== null);
    const saveButton = textarea?.parentElement?.querySelector('.commentBtns > button:first-child');
    if (saveButton) {
      saveButton.scrollIntoView({ block: 'center', inline: 'nearest' });
      saveButton.setAttribute('data-e2e-active-comment-save', 'true');
    }
    return Boolean(saveButton);
  });
  if (!saveButton) {
    throw new Error('Unable to find the save button for the active comment textarea.');
  }
  await I.executeScript(() => {
    const saveButton = document.querySelector('[data-e2e-active-comment-save="true"]');
    saveButton?.click();
  });
  await I.waitNumberOfVisibleElements(commonConfig.commentsCount, comments + 1);
}
