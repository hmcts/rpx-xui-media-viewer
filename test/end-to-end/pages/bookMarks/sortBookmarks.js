'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require('../../../config');
const { assert } = require('chai');
const crypto = require('crypto');

module.exports = async function () {
  const I = this;

  const visible = await I.grabNumberOfVisibleElements(commonConfig.sortBookmarkPosition);
  if (!visible) {
    console.log("skipping sort bookmarks test");
    return;
  }

  const seededDocumentId = await seedBookmarksViaApi();
  if (seededDocumentId) {
    await I.loadDocumentAndCheckSuccessLoad(seededDocumentId);
    await ensureBookmarksPanelOpen();
  } else {
    await goToPage('2');
    await I.addNamedBookmark('page2');

    await goToPage('3');
    await I.addNamedBookmark('page3');

    await goToPage('1');
    await I.addNamedBookmark('page1');
  }

  let bookmarkNames = await collectBookmarkNames();
  assert.deepEqual(bookmarkNames, ['page2', 'page3', 'page1']);

  await clickBookmarkSort(commonConfig.sortBookmarkPosition);
  await I.wait(testConfig.BookmarksAndAnnotationsWait);
  bookmarkNames = await collectBookmarkNames();
  assert.deepEqual(bookmarkNames, ['page1', 'page2', 'page3']);

  await clickBookmarkSort(commonConfig.sortBookmarkCustom);
  await I.wait(testConfig.BookmarksAndAnnotationsWait);
  bookmarkNames = await collectBookmarkNames();
  assert.deepEqual(bookmarkNames, ['page2', 'page3', 'page1']);

  async function clickBookmarkSort(sortSelector) {
    await ensureBookmarksPanelOpen();
    await I.waitForVisible(sortSelector, testConfig.PageLoadTime);
    await I.click(sortSelector);
  }

  async function ensureBookmarksPanelOpen() {
    const sortVisible = await I.grabNumberOfVisibleElements(commonConfig.sortBookmarkPosition);
    if (!sortVisible) {
      await I.openBookmarksPanel();
    }
    await I.waitForVisible(commonConfig.sortBookmarkPosition, testConfig.PageLoadTime);
  }

  async function collectBookmarkNames() {
    let names = [];
    for (let i = 1; i < 4; i++) {
      let bookmarkName = await I.grabTextFrom(`(//cdk-nested-tree-node)[${i}]`);
      names.push(bookmarkName.trim());
    }
    return names;
  }

  async function goToPage(pageNumber) {
    await I.clearField(commonConfig.pageNumber);
    await I.fillField(commonConfig.pageNumber, pageNumber);
    await I.pressKey('Enter');
    await I.click('#viewerContainer');
    await I.wait(testConfig.BookmarksAndAnnotationsWait);
    await I.seeInField(commonConfig.pageNumber, pageNumber);
  }

  async function seedBookmarksViaApi() {
    if (!process.env.TEST_URL || !process.env.TEST_URL.includes('localhost')) {
      return false;
    }

    const documentId = process.env.MV_CURRENT_DOCUMENT_ID || process.env.MV_SMOKE_PDF_DOCUMENT_ID || '04666097-eb32-4b2b-9bec-8e9ce8057560';
    const testUrl = new URL(process.env.TEST_URL);
    const baseUrl = `${testUrl.protocol}//${testUrl.host}`;
    const bookmarkDefinitions = [
      { id: crypto.randomUUID(), name: 'page2', pageNumber: 2, previous: null },
      { id: crypto.randomUUID(), name: 'page3', pageNumber: 3 },
      { id: crypto.randomUUID(), name: 'page1', pageNumber: 1 }
    ];

    bookmarkDefinitions[1].previous = bookmarkDefinitions[0].id;
    bookmarkDefinitions[2].previous = bookmarkDefinitions[1].id;

    for (const [index, bookmark] of bookmarkDefinitions.entries()) {
      const response = await fetch(`${baseUrl}/em-anno/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookmark,
          documentId,
          xCoordinate: 0,
          yCoordinate: 0,
          children: [],
          index
        })
      });

      if (!response.ok) {
        throw new Error(`Unable to seed bookmark ${bookmark.name}; received ${response.status}: ${await response.text()}`);
      }
    }

    return documentId;
  }
}
