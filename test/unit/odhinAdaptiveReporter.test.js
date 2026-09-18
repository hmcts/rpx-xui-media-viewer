'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const OdhinAdaptiveReporter = require('../../playwright_tests/common/reporters/odhin-adaptive.reporter.cjs');

test('always keeps Odhín attachments external', () => {
  const reporter = new OdhinAdaptiveReporter({ embedAttachments: true });

  assert.equal(reporter.inner.generate.execOptions.embedAttachments, false);
});
