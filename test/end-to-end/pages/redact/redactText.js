'use strict'
const testConfig = require("../../../config");
const selectPdfText = require('../common/selectPdfText');

module.exports = async function (redactText) {
  const I = this;

  await selectPdfText(I);
  await I.wait(testConfig.BookmarksAndAnnotationsWait);
}
