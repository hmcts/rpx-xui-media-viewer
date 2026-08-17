'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const scriptPath = path.resolve(__dirname, '../../scripts/ensure-odhin-report.js');

test('fallback report lists traces and screenshots from the configured Playwright output directory', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'odhin-fallback-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const reportDir = path.join(root, 'odhin-report');
  const testOutputDir = path.join(root, 'test-results');
  const failedTestDir = path.join(testOutputDir, 'failed-test');
  fs.mkdirSync(failedTestDir, { recursive: true });
  ['trace.zip', 'test-failed-1.png', 'failure-view.jpg', 'failure-view.jpeg'].forEach((file) => {
    fs.writeFileSync(path.join(failedTestDir, file), 'diagnostic');
  });
  fs.writeFileSync(path.join(failedTestDir, 'video.webm'), 'excluded');

  execFileSync(process.execPath, [
    scriptPath,
    '--report-dir',
    reportDir,
    '--report-file',
    'functional.html',
    '--suite-name',
    'Functional tests',
    '--test-output-dir',
    testOutputDir,
  ]);

  const report = fs.readFileSync(path.join(reportDir, 'functional.html'), 'utf8');
  assert.match(report, /failed-test\/trace\.zip/);
  assert.match(report, /failed-test\/test-failed-1\.png/);
  assert.match(report, /failed-test\/failure-view\.jpg/);
  assert.match(report, /failed-test\/failure-view\.jpeg/);
  assert.doesNotMatch(report, /video\.webm/);
});
