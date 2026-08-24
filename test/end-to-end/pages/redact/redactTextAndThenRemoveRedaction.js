'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function () {
  const I = this;
  await I.clickRedactMenu();

  await I.redactionsPreview();
  await I.waitForElement(commonConfig.redactionsCount, testConfig.TestTimeToWaitForText);

  let redactions = await I.getBookmarksCount(commonConfig.redactionsCount);
  for (let attempt = 0; redactions > 0 && attempt < testConfig.TestTimeToWaitForText; attempt++) {
    await I.executeScript((selector) => {
      const redaction = [...document.querySelectorAll(selector)]
        .find((element) => element.offsetParent !== null);
      redaction?.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }, commonConfig.redactionsCount);
    await I.waitForElement('button[title="Delete"]', testConfig.TestTimeToWaitForText);
    await I.executeScript(() => {
      const deleteButton = [...document.querySelectorAll('button[title="Delete"]')]
        .find((element) => element.offsetParent !== null);
      deleteButton?.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    });
    await I.wait(1);
    redactions = await I.getBookmarksCount(commonConfig.redactionsCount);
  }
  await I.dontSeeElement(commonConfig.redactionsCount);
  await I.refreshPage();
}
