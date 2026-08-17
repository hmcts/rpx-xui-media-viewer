'use strict';

const commonConfig = require('../../data/commonConfig.json');
const { assert } = require('chai');

module.exports = async function () {
  const I = this;
  const initial = await I.grabNumberOfVisibleElements(commonConfig.highLightTextCount);

  for (let index = 0; index < initial; index += 1) {
    await I.click(commonConfig.highLightTextCount);
    await I.waitForElement(commonConfig.commentPopup.replace('Comment', 'Delete'));
    await I.click(commonConfig.commentPopup.replace('Comment', 'Delete'));
    await I.waitForInvisible(commonConfig.commentPopup);
  }

  assert.equal(await I.grabNumberOfVisibleElements(commonConfig.highLightTextCount), 0);
};
