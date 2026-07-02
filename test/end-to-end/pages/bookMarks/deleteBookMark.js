'use strict'

const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

module.exports = async function () {
  const I = this;

  await I.openBookmarksPanel();

  if (process.env.TEST_URL && process.env.TEST_URL.includes('localhost')) {
    return;
  }

  let remainingBookmarks = await I.getBookmarksCount(commonConfig.bookmarksCount);
  let deleteAttempts = 0;

  while (remainingBookmarks !== 0 && deleteAttempts < 50) {
    await I.click(commonConfig.deleteBookmarkCss);
    await I.wait(testConfig.BookmarksAndAnnotationsWait);
    remainingBookmarks = await I.getBookmarksCount(commonConfig.bookmarksCount);
    deleteAttempts++;
  }

  if (remainingBookmarks !== 0) {
    throw new Error(`Unable to delete bookmarks after ${deleteAttempts} attempts; ${remainingBookmarks} bookmarks remain.`);
  }
}
