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
  const saveButton = await I.executeScript((text) => {
    const textarea = [...document.querySelectorAll('textarea[name="content"]')]
      .find((element) => element.offsetParent !== null);
    if (textarea) {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const saveButton = textarea?.parentElement?.querySelector('.commentBtns > button:first-child');
    if (saveButton) {
      saveButton.scrollIntoView({ block: 'center', inline: 'nearest' });
      saveButton.setAttribute('data-e2e-active-comment-save', 'true');
    }
    return Boolean(saveButton);
  }, commentText);
  if (!saveButton) {
    throw new Error('Unable to find the save button for the active comment textarea.');
  }
  await I.executeScript(() => {
    const saveButton = document.querySelector('[data-e2e-active-comment-save="true"]');
    saveButton?.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
  });
  await I.waitForText(commentText, testConfig.TestTimeToWaitForText, '.comments-panel.expanded');
  await I.waitNumberOfVisibleElements(commonConfig.commentsCount, comments + 1);
}
