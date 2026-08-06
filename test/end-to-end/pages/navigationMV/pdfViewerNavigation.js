'use strict'
const commonConfig = require('../../data/commonConfig.json');
const {mvData} = require("../common/constants");
const testConfig = require("../../../config");

module.exports = async function (pageToNavigate) {
  const I = this;

  if (pageToNavigate === mvData.PAGE_NAVIGATION_NUMBER) {
    await I.retry(2).click(commonConfig.moveDown);
    await I.click('#viewerContainer')
    await I.wait(testConfig.BookmarksAndAnnotationsWait);
      // await I.seeInField(commonConfig.pageNumber, mvData.PAGE_NAVIGATION_NUMBER);
  } else {
    await I.wait(3);
    await I.executeScript((pageNumber) => {
      const input = document.querySelector('#pageNumber');
      if (!input) {
        return;
      }

      input.focus();
      input.value = pageNumber;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true
      }));
    }, pageToNavigate);
    await I.click('#viewerContainer');
    for (let attempt = 0; attempt < testConfig.TestTimeToWaitForText; attempt++) {
      const pageNumber = await I.grabValueFrom(commonConfig.pageNumber);
      if (String(pageNumber) === String(pageToNavigate)) {
        return;
      }
      await I.wait(1);
    }
    await I.seeInField(commonConfig.pageNumber, pageToNavigate);
  }
};
