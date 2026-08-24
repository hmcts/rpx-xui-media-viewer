'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function () {
  const I = this;
  await I.checkElementExist(commonConfig.searchAllBtn)
  await I.click(commonConfig.searchAllBtn)
  await I.waitForElement(commonConfig.selectedSearchHighlight, testConfig.TestTimeToWaitForText);
}
