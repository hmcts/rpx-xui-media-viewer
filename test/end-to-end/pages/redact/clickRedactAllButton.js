'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function () {
  const I = this;
  const countText = await I.retry(10).grabTextFrom(commonConfig.findRedactResultsCount);
  const countValue = Number((countText.match(/\d+/) || ['0'])[0]);

  await I.checkElementExist(commonConfig.redactAllBtn)
  await I.waitForEnabled(commonConfig.redactAllBtn, testConfig.TestTimeToWaitForText);
  await I.executeScript((selector) => {
    const redactAllButton = document.querySelector(selector);
    if (!redactAllButton) {
      return;
    }

    redactAllButton.scrollIntoView({ block: 'center', inline: 'nearest' });
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((eventName) => {
      redactAllButton.dispatchEvent(new MouseEvent(eventName, {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    });
    redactAllButton.click();
  }, commonConfig.redactAllBtn);

  for (let attempt = 0; attempt < testConfig.TestTimeToWaitForText; attempt++) {
    const rectangleCount = await I.grabNumberOfVisibleElements(commonConfig.rectangleClass);
    if (rectangleCount >= countValue) {
      return;
    }
    await I.wait(1);
  }

  await I.seeNumberOfVisibleElements(commonConfig.rectangleClass, countValue);
}
