'use strict';

const event = require('codeceptjs').event;
const container = require('codeceptjs').container;
const exec = require('child_process').exec;

function updateSauceLabsResult(result, sessionId) {
  console.log('SauceOnDemandSessionID=' + sessionId + ' job-name=mv-ccd-xb-tests');
  return 'curl -X PUT -s -d \'{"passed": ' + result + '}\' -u ' + process.env.SAUCE_USERNAME + ':' + process.env.SAUCE_ACCESS_KEY + ' https://eu-central-1.saucelabs.com/rest/v1/' + process.env.SAUCE_USERNAME + '/jobs/' + sessionId;
}

function getSauceSessionId() {
  const helper = container.helpers('WebDriver');
  return helper && helper.browser && helper.browser.sessionId;
}

function reportSauceResult(result) {
  const sessionId = getSauceSessionId();
  if (sessionId) {
    exec(updateSauceLabsResult(result, sessionId));
  }
}

module.exports = function () {

  event.dispatcher.on(event.test.passed, () => {
    reportSauceResult('true');
  });

  event.dispatcher.on(event.test.failed, () => {
    reportSauceResult('false');
  });
};
