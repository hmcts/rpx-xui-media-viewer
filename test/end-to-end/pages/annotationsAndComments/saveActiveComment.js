'use strict'

const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function (I, commentText, expectedCommentCount) {
  await I.waitForVisible(commonConfig.firstCommentXp, testConfig.TestTimeToWaitForText);
  await I.fillField(commonConfig.firstCommentXp, commentText);

  const saveButtonFound = await I.executeScript((text) => {
    document
      .querySelectorAll('[data-e2e-active-comment-save="true"]')
      .forEach((element) => element.removeAttribute('data-e2e-active-comment-save'));

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

  if (!saveButtonFound) {
    throw new Error('Unable to find the save button for the active comment textarea.');
  }

  await I.executeScript(() => {
    const saveButton = document.querySelector('[data-e2e-active-comment-save="true"]');
    if (!saveButton) {
      return;
    }

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((eventName) => {
      saveButton.dispatchEvent(new MouseEvent(eventName, {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    });
    saveButton.click();
  });

  await I.waitForText(commentText, testConfig.TestTimeToWaitForText, commonConfig.commentsCount);
  if (expectedCommentCount !== undefined) {
    await I.waitNumberOfVisibleElements(commonConfig.commentsCount, expectedCommentCount);
  }
}
