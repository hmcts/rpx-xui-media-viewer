'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { __test__ } = require('../../playwright_tests/common/reporters/odhin-report-enhancer.cjs');
const coverageInventory = require('../../playwright_tests/functional/mediaViewerCoverage.json');

test('feature tag takes precedence over the spec folder', () => {
  assert.equal(
    __test__.deriveFeatureName('/workspace/playwright_tests/functional/search.spec.ts', ['@e2e-functional', '@feature-search']),
    'search'
  );
});

test('capability summary reports every supported status', () => {
  const html = __test__.buildCapabilityCoverageBlock(
    {
      title: 'Capability coverage',
      capabilities: [
        capability('Covered'),
        capability('Partial'),
        capability('Legacy only'),
        capability('Not covered'),
      ],
    },
    []
  );

  assert.match(html, /4 areas — 1 covered, 1 partial, 1 legacy-only, 1 not covered/);
  assert.match(html, /odhin-capability-status-not-covered/);
});

test('capability summary reports whether a contract runs by default', () => {
  const coveredCapability = capability('Covered');
  coveredCapability.execution = 'Runs by default';

  const html = __test__.buildCapabilityCoverageBlock(
    {
      title: 'Capability coverage',
      capabilities: [coveredCapability],
    },
    []
  );

  assert.match(html, /<th>Execution<\/th>/);
  assert.match(html, /Runs by default/);
});

test('links suite-local Perfetto timelines from the generated Odhín report', () => {
  const outputFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'media-odhin-'));
  fs.mkdirSync(path.join(outputFolder, '..', 'test-results'), { recursive: true });
  fs.writeFileSync(path.join(outputFolder, 'index.html'), '<html><body><div class="tab"><button class="main-tablinks">Tests</button></div><main>Results</main></body></html>');
  fs.writeFileSync(path.join(outputFolder, '..', 'test-results', 'perfetto.json'), '{}');

  __test__.enhanceGeneratedReport(outputFolder, []);

  const report = fs.readFileSync(path.join(outputFolder, 'index.html'), 'utf8');
  assert.match(report, /class="main-tablinks" onclick="openMainTab\(event, 'TabPerfetto'\)">Perfetto Results/);
  assert.match(report, /id="TabPerfetto" style="display: none" class="main-tabcontent"/);
  assert.match(report, /href="\.\.\/test-results\/perfetto\.json"/);
});

test('capability inventory does not leave a Codecept scenario active after migration', () => {
  const activeLegacyTestFiles = coverageInventory.capabilities
    .filter((capability) => (capability.activeLegacyScenarios ?? capability.legacyScenarios) > 0)
    .map((capability) => capability.legacyTestFile);
  assert.equal(activeLegacyTestFiles.length, 0, 'all historical Codecept scenarios must be retired from default execution');
  assert.equal(
    coverageInventory.capabilities.reduce((total, capability) => total + (capability.activeLegacyScenarios ?? capability.legacyScenarios), 0),
    0,
    'the capability inventory must not claim an active legacy scenario'
  );
});

test('reserves Partial status for an active legacy migration gap', () => {
  const partialCapabilities = coverageInventory.capabilities.filter((capability) => capability.status === 'Partial');
  assert.ok(
    partialCapabilities.every((capability) => (capability.activeLegacyScenarios ?? 0) > 0),
    'A non-migration assurance gap belongs in Remaining gap; Partial is reserved for active legacy scenarios'
  );
});

function capability(status) {
  return {
    name: `${status} capability`,
    status,
    playwrightFeature: status.toLowerCase().replace(/\s+/g, '-'),
    playwrightTests: 0,
    activeLegacyScenarios: 0,
    legacyScenarios: 0,
    covered: 'Assurance statement',
    gap: 'Gap statement',
  };
}
