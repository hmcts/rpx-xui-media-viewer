'use strict'
const commonConfig = require('../../data/commonConfig.json');
const testConfig = require("../../../config");
const chai = require('chai');


module.exports = async function () {
  const I = this;
  if (process.env.TEST_URL && process.env.TEST_URL.includes('localhost')) {
    const imageViewerVisible = await I.grabNumberOfVisibleElements('mv-image-viewer');
    if (imageViewerVisible) {
      await I.dontSee('Index');
      return;
    }
  }
  await I.click(commonConfig.imageTabButton);
  await I.dontSee('Index');
};
