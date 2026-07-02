'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function () {
  const I = this;
  const expectedBookmarks = 30;
  const localStandalone = process.env.TEST_URL && process.env.TEST_URL.includes('localhost');

  await I.waitForElement(commonConfig.addBookmarkButton, testConfig.PageLoadTime);

  for (let i = 0; i < expectedBookmarks; i++) {
    if (localStandalone) {
      await I.executeScript((selector) => {
        document.querySelector(selector)?.click();
      }, commonConfig.addBookmarkButton);
    } else {
      await I.click(commonConfig.addBookmarkButton);
    }
    await I.wait(testConfig.BookmarksAndAnnotationsWait);
  }

  const bookmarkCount = await I.getBookmarksCount(commonConfig.bookmarksCount);
  if (bookmarkCount < expectedBookmarks) {
    throw new Error(`Expected at least ${expectedBookmarks} bookmarks, but found ${bookmarkCount}.`);
  }

  const screenshotName = Date.now() + 'emptyBookmark' + '.png';
  await I.saveScreenshot(screenshotName, true);
}
