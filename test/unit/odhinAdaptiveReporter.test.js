'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const OdhinAdaptiveReporter = require('../../playwright_tests/common/reporters/odhin-adaptive.reporter.cjs');

test('always keeps Odhín attachments external', () => {
  let receivedOptions;
  new OdhinAdaptiveReporter({
    embedAttachments: true,
    createInnerReporter: (options) => {
      receivedOptions = options;
      return {};
    }
  });

  assert.equal(receivedOptions.embedAttachments, false);
});
