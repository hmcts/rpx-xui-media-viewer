'use strict'

const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");

async function clearBookmarksViaApi(I) {
  if (!process.env.TEST_URL || !process.env.TEST_URL.includes('localhost')) {
    return false;
  }

  const documentId = process.env.MV_SMOKE_PDF_DOCUMENT_ID || '04666097-eb32-4b2b-9bec-8e9ce8057560';
  const testUrl = new URL(process.env.TEST_URL);
  const baseUrl = `${testUrl.protocol}//${testUrl.host}`;

  const response = await fetch(`${baseUrl}/em-anno/${documentId}/bookmarks`);
  if (!response.ok) {
    return false;
  }

  const responseBody = await response.text();
  if (!responseBody) {
    return false;
  }

  const bookmarks = JSON.parse(responseBody);
  const bookmarkIds = bookmarks.map((bookmark) => bookmark.id).filter(Boolean);
  if (!bookmarkIds.length) {
    return true;
  }

  const deleteResponse = await fetch(`${baseUrl}/em-anno/bookmarks_multiple`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleted: bookmarkIds })
  });

  return deleteResponse.ok;
}

module.exports = async function () {
  const I = this;

  await I.openBookmarksPanel();

  if (await clearBookmarksViaApi(I)) {
    await I.wait(testConfig.BookmarksAndAnnotationsWait);
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
    throw new Error(`Unable to clear bookmarks after ${deleteAttempts} attempts; ${remainingBookmarks} bookmarks remain.`);
  }
}
