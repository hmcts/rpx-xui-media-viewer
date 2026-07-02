'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function () {
  const I = this;
  const expectedBookmarks = 30;

  await I.waitForElement(commonConfig.addBookmarkButton, testConfig.PageLoadTime);

  for (let i = 0; i < expectedBookmarks; i++) {
    const targetCount = i + 1;
    await addNamedBookmark(I, `bookmark-${targetCount}`);
    await waitForBookmarkCount(I, targetCount);
  }

  const bookmarkCount = await I.getBookmarksCount(commonConfig.bookmarksCount);
  if (bookmarkCount < expectedBookmarks) {
    throw new Error(`Expected at least ${expectedBookmarks} bookmarks, but found ${bookmarkCount}.`);
  }

  const screenshotName = Date.now() + 'emptyBookmark' + '.png';
  await I.saveScreenshot(screenshotName, true);
}

async function addNamedBookmark(I, name) {
  await I.click(commonConfig.addBookmarkButton);
  await I.waitForElement(commonConfig.bookMarkInput, testConfig.PageLoadTime);
  await I.fillField(commonConfig.bookMarkInput, name);
  await I.click(commonConfig.bookMarkSave);
}

async function waitForBookmarkCount(I, expectedCount) {
  const attempts = Number(process.env.MV_BOOKMARK_COUNT_WAIT_ATTEMPTS || 20);
  const waitSeconds = Number(process.env.MV_BOOKMARK_COUNT_WAIT_SECONDS || 0.5);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const bookmarkCount = await I.getBookmarksCount(commonConfig.bookmarksCount);
    if (bookmarkCount >= expectedCount) {
      return;
    }
    await I.wait(waitSeconds);
  }

  const bookmarkCount = await I.getBookmarksCount(commonConfig.bookmarksCount);
  throw new Error(`Expected at least ${expectedCount} bookmarks, but found ${bookmarkCount}.`);
}
