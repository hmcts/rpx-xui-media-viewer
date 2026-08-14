'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { test } = require('node:test');
const { __test__ } = require('../../playwright_tests/common/reporters/odhin-report-enhancer.cjs');
const coverageInventory = require('../../playwright_tests/functional/mediaViewerCoverage.json');

const repositoryRoot = path.resolve(__dirname, '../..');

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

test('capability inventory accounts for every active Codecept scenario', () => {
  const activeLegacyTestFiles = coverageInventory.capabilities
    .filter((capability) => (capability.activeLegacyScenarios ?? capability.legacyScenarios) > 0)
    .map((capability) => capability.legacyTestFile);
  assert.ok(activeLegacyTestFiles.every(Boolean), 'Every active legacy capability must identify its Codecept suite');
  const activeLegacyTestPath = `./mvFeatures/{${activeLegacyTestFiles.map((file) => path.basename(file, '.js')).join(',')}}.js`;
  const codeceptBin = require.resolve('codeceptjs/bin/codecept.js');
  const output = execFileSync(
    process.execPath,
    [codeceptBin, 'dry-run', '-c', './test/end-to-end/codecept.conf.js'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        E2E_TEST_PATH: activeLegacyTestPath,
        NODE_PATH: '.',
      },
    }
  );
  const discoveredScenarios = Number(output.match(/Total:\s+\d+ suites\s+\|\s+(\d+) tests/)?.[1]);
  const inventoriedScenarios = coverageInventory.capabilities.reduce(
    (total, capability) => total + (capability.activeLegacyScenarios ?? capability.legacyScenarios),
    0
  );

  assert.ok(Number.isFinite(discoveredScenarios), 'Codecept dry-run output did not contain a scenario total');
  assert.equal(inventoriedScenarios, discoveredScenarios);
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
