'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function () {
  const I = this;
  let i = 0;
  await I.clickRedactMenu();

  await I.redactionsPreview();
  await I.waitForElement(commonConfig.redactionsCount, testConfig.TestTimeToWaitForText);

  while (i < await I.getBookmarksCount(commonConfig.redactionsCount)) {
    await I.retry(3).click(commonConfig.redactionsCount);
    await I.waitForClickable(commonConfig.deleteRedactionsXp, testConfig.TestTimeToWaitForText);
    await I.retry(3).click(commonConfig.deleteRedactionsXp);
  }
  await I.refreshPage();
}
