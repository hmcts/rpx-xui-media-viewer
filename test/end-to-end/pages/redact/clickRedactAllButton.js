'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function () {
  const I = this;
  const countText = await I.retry(10).grabTextFrom(commonConfig.findRedactResultsCount);
  const countValueString = countText.replace('results founds', '')
  const countValue = Number(countValueString.trim());

  await I.checkElementExist(commonConfig.redactAllBtn)
  await I.waitForEnabled(commonConfig.redactAllBtn, testConfig.TestTimeToWaitForText);
  await I.click(commonConfig.redactAllBtn)

  for (let attempt = 0; attempt < testConfig.TestTimeToWaitForText; attempt++) {
    const rectangleCount = await I.grabNumberOfVisibleElements(commonConfig.rectangleClass);
    if (rectangleCount === countValue) {
      return;
    }
    await I.wait(1);
  }

  await I.seeNumberOfVisibleElements(commonConfig.rectangleClass, countValue);
}

