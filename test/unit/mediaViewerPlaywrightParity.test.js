const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { describe, it } = require('node:test');
const { resolve } = require('node:path');

const repositoryRoot = resolve(__dirname, '../..');

const replacementContracts = require('../migration-history/mediaViewerCodeceptScenarios.json');
const coverageInventory = require('../../playwright_tests/functional/mediaViewerCoverage.json');

const intentionalManyToOneCoverage = [
  [
    'creates a draw-box redaction, previews it and clears the persisted marker',
    ['Mark Content For Redaction Using Draw Box Function', 'Preview all content marked for redaction'],
  ],
  [
    'redacts selected text and removes the persisted marker',
    ['Redact Content Using Redact Text Function', 'Redact text and then removing the redaction'],
  ],
];

function source(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

describe('Media Viewer Codecept-to-Playwright parity', () => {
  it('retains provenance for every mapped Codecept scenario and names its replacement', () => {
    const legacyScenarioNames = new Set();

    for (const [, legacyScenario] of replacementContracts) legacyScenarioNames.add(legacyScenario);

    const manifest = coverageInventory.legacyEvidence.codeceptManifest;
    assert.equal(manifest.sourceRevision, '5362ae913917a86fd482b29f8cfa72a858ac1f25');
    assert.equal(manifest.scenarioCount, 23, 'the frozen Codecept manifest must retain all 23 mapped contracts');
    assert.equal(legacyScenarioNames.size, manifest.scenarioCount, 'the manifest must not contain duplicate historical scenarios');
    assert.equal(replacementContracts.length, manifest.scenarioCount, 'every mapped Codecept contract needs one manifest row');
    assert.equal(coverageInventory.executionCounts.historicalCapabilityBaseline, 57, 'the aggregate baseline must remain separate from the Codecept manifest');
    assert.equal(coverageInventory.executionCounts.functionalDefault, 84);
    assert.equal(coverageInventory.executionCounts.smokeDefault, 1);
    assert.equal(coverageInventory.executionCounts.externalServiceDiagnostic, 4);
    assert.equal(coverageInventory.executionCounts.inventoryPlaywrightTests, 89);

    const legacyScenariosByPlaywrightContract = new Map();
    for (const [, legacyScenario, , playwrightContract] of replacementContracts) {
      const scenarios = legacyScenariosByPlaywrightContract.get(playwrightContract) ?? [];
      scenarios.push(legacyScenario);
      legacyScenariosByPlaywrightContract.set(playwrightContract, scenarios);
    }
    const duplicateCoverage = [...legacyScenariosByPlaywrightContract.entries()]
      .filter(([, scenarios]) => scenarios.length > 1)
      .map(([playwrightContract, scenarios]) => [playwrightContract, scenarios.sort()])
      .sort(([left], [right]) => left.localeCompare(right));
    assert.deepEqual(
      duplicateCoverage,
      intentionalManyToOneCoverage
        .map(([playwrightContract, scenarios]) => [playwrightContract, [...scenarios].sort()])
        .sort(([left], [right]) => left.localeCompare(right)),
      'any many-to-one mapping must be explicitly declared and reviewed'
    );
    assert.equal(legacyScenariosByPlaywrightContract.size, 21, 'the migration inventory must retain 21 unique Playwright contracts plus two declared many-to-one mappings');
    assert.equal(existsSync(resolve(repositoryRoot, 'test/config.js')), false, 'the retired Codecept runner config must not remain');
    assert.equal(existsSync(resolve(repositoryRoot, 'test/end-to-end')), false, 'the retired Codecept runner tree must not remain');
    assert.equal(existsSync(resolve(repositoryRoot, 'e2e')), false, 'the retired Protractor runner tree must not remain');
    const packageScripts = JSON.parse(source('package.json')).scripts;
    assert.equal(packageScripts['test:functional'], 'yarn test:playwright:functional');
    assert.equal(packageScripts['test:fullfunctional'], 'yarn test:playwright:functional');
    assert.equal(packageScripts['test:crossbrowser'], 'yarn test:playwright:crossbrowser');
    assert.equal(packageScripts['test:a11y'], 'yarn test:accessibility:playwright');
    assert.match(packageScripts['test:accessibility:playwright'], /run-playwright-accessibility\.cjs/);
    assert.match(source('scripts/run-playwright-accessibility.cjs'), /A11Y_ENGINES:.*'all'/s);
    assert.match(source('scripts/run-playwright-accessibility.cjs'), /RPX XUI Media Viewer - Accessibility/);
    assert.match(source('playwright_tests/accessibility/mediaViewer.a11y.spec.ts'), /@accessibility @a11y @wave-a11y/);
    assert.match(source('playwright_tests/accessibility/mediaViewer.a11y.spec.ts'), /'axe', 'wave-like', 'screen-reader'/);
    for (const pipeline of ['Jenkinsfile_CNP', 'Jenkinsfile_nightly']) {
      assert.match(source(pipeline), /test:accessibility:playwright/);
      assert.match(source(pipeline), /xui-playwright-accessibility\.html/);
      assert.match(source(pipeline), /A11Y_STRICT=false/);
      assert.match(source(pipeline), /junitArguments\.skipMarkingBuildUnstable = true/);
      assert.match(source(pipeline), /Accessibility failed but is non-blocking/);
      assert.match(source(pipeline), /test:playwright:crossbrowser/);
      assert.match(source(pipeline), /Playwright Install Browsers/);
    }
    for (const parameter of ['E2E_PW_INCLUDE_TAGS', 'E2E_PW_EXCLUDED_TAGS_OVERRIDE', 'INTEGRATION_PW_INCLUDE_TAGS', 'INTEGRATION_PW_EXCLUDED_TAGS_OVERRIDE', 'API_PW_INCLUDE_TAGS', 'API_PW_EXCLUDED_TAGS_OVERRIDE', 'PLAYWRIGHT_IGNORE_GLOBAL_EXCLUDES', 'INTEGRATION_PW_PROFILE_RUNS', 'INTEGRATION_PW_WORKERS', 'INTEGRATION_PW_SHARD']) {
      assert.match(source('Jenkinsfile_CNP'), new RegExp(`name:\\s*['"]?${parameter}['"]?`));
    }
    for (const parameter of ['INTEGRATION_PW_PROFILE_RUNS', 'INTEGRATION_PW_WORKERS', 'INTEGRATION_PW_SHARD', 'PLAYWRIGHT_IGNORE_GLOBAL_EXCLUDES', 'RUN_PLAYWRIGHT_ACCESSIBILITY']) {
      assert.match(source('Jenkinsfile_nightly'), new RegExp(`name:\\s*['"]?${parameter}['"]?`));
    }
    assert.match(packageScripts['test:playwright:crossbrowser'], /--project=smoke-firefox --project=smoke-webkit/);
    assert.equal(packageScripts['test:e2e:local:aat'], undefined, 'the retired local E2E command must not be selectable');
    assert.equal(packageScripts['e2e:fullfunctional'], undefined, 'the retired full-functional E2E alias must not be selectable');
    assert.doesNotMatch(source('scripts/test-local-aat.sh'), /test:playwright:e2e/, 'the local AAT launcher must select an existing Playwright project');
    assert.doesNotMatch(source('Jenkinsfile_CNP'), /codeceptjs|test:crossbrowser/, 'the Jenkins pipeline must select Playwright, never Codecept');
    assert.doesNotMatch(
      source('Jenkinsfile_CNP'),
      /CCD_CASEWORKER_E2E_EMAIL|CCD_CASEWORKER_E2E_PASSWORD|MICROSERVICE_CCD_GW|IDAM_CLIENT_SECRET/,
      'normal Jenkins assurance must not load credentials that belong only to retired external contracts'
    );

    for (const [, legacyScenario, playwrightFile, playwrightContract] of replacementContracts) {
      const playwrightPath = playwrightFile.includes('/')
        ? `playwright_tests/${playwrightFile}`
        : `playwright_tests/functional/${playwrightFile}`;
      assert.match(source(playwrightPath), new RegExp(`^\\s*(?:test|annotationsTest|deletionTest|imageAnnotationsTest)\\('${playwrightContract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'm'));
    }

    assert.doesNotMatch(source('playwright.config.ts'), /name:\s*'e2e'/, 'the flaky live E2E project must not be selectable');
    assert.equal(packageScripts['test:playwright:e2e'], undefined, 'the retired E2E command must not be selectable');
    assert.doesNotMatch(source('Jenkinsfile_CNP'), /runPlaywrightE2ETests|Playwright Viewer E2E Test/, 'Jenkins must not schedule the retired E2E lane');
    assert.doesNotMatch(source('Jenkinsfile_CNP'), /env\.EXECUTE_E2E\s*=\s*true/, 'CNP must not re-enable the retired shared E2E hook');
    assert.doesNotMatch(source('Jenkinsfile_CNP'), /runPlaywrightFunctionalTests|stage\(['"]Playwright Functional Test - (?:preview|AAT)/, 'CNP must use the shared Functional Test stages for Playwright functional coverage');
    assert.doesNotMatch(source('Jenkinsfile_nightly'), /runPlaywrightFunctionalTests|stage\(['"]Playwright Functional Test/, 'nightly must use the shared Functional Test stage for Playwright functional coverage');
    assert.match(source('Jenkinsfile_CNP'), /before\('functionalTest:preview'\)[\s\S]*?configurePlaywrightFunctional\(playwrightPreviewFunctionalOutputRoot, 'preview'\)/);
    assert.match(source('Jenkinsfile_CNP'), /afterAlways\('functionalTest:preview'\)[\s\S]*?PREVIEW Playwright Functional Test/);
    assert.match(source('Jenkinsfile_CNP'), /before\('functionalTest:aat'\)[\s\S]*?configurePlaywrightFunctional\(playwrightAatFunctionalOutputRoot, 'aat'\)/);
    assert.match(source('Jenkinsfile_CNP'), /afterAlways\('functionalTest:aat'\)[\s\S]*?AAT Playwright Functional Test/);
    assert.doesNotMatch(source('Jenkinsfile_CNP'), /Playwright Viewer/, 'Jenkins stage and report names must use Playwright terminology');
    assert.doesNotMatch(source('Jenkinsfile_nightly'), /Playwright Viewer/, 'Jenkins stage and report names must use Playwright terminology');
    assert.doesNotMatch(source('Jenkinsfile_CNP'), /enableFullFunctionalTest|fullFunctionalTest/, 'CNP must not schedule the retired shared full-functional hook');
    assert.doesNotMatch(source('Jenkinsfile_nightly'), /enableFullFunctionalTest|fullFunctionalTest/, 'nightly must not schedule the retired shared full-functional hook');
    assert.equal(packageScripts['test:playwright:integration'], undefined, 'a duplicate Integration command must not be selectable');
    assert.doesNotMatch(source('playwright.config.ts'), /name:\s*'integration'/, 'a duplicate Integration project must not be selectable');
    assert.doesNotMatch(source('Jenkinsfile_CNP'), /runPlaywrightIntegrationTests|Playwright Viewer Integration Test/, 'Jenkins must not schedule duplicate Integration coverage');
    assert.match(source('playwright.config.ts'), /playwright_tests\/external-service-contracts\/\*\*\/\*\.spec\.ts/);
    assert.doesNotMatch(
      source('Jenkinsfile_CNP'),
      /test:playwright:external-service-contracts|PLAYWRIGHT_RUN_EXTERNAL_SERVICE_CONTRACTS/,
      'normal Jenkins assurance must not execute external service diagnostics'
    );

    const knownDefectContracts = source('playwright_tests/external-service-contracts/aatCcdBrowserDefects.spec.ts');
    assert.match(knownDefectContracts, /@defect-EXUI-5122/);
    assert.match(knownDefectContracts, /@defect-EXUI-5123/);
    const imageAnnotationContracts = source('playwright_tests/functional/annotations.spec.ts');
    assert.doesNotMatch(imageAnnotationContracts, /@defect-EXUI-5124/);
    assert.match(imageAnnotationContracts, /openAnnotatedDocument\(mediaAssets\.image\)/, 'image contracts must load the rendered viewer before exercising it');
    assert.match(imageAnnotationContracts, /drawOnPage\(mediaViewer\.loadState\.image\)/, 'image create coverage must use a real user-level draw gesture');
    assert.doesNotMatch(imageAnnotationContracts, /page\.evaluate\(async/, 'image UI parity must not be replaced by direct browser-context API calls');
    assert.doesNotMatch(knownDefectContracts, /test\.(?:skip|fixme)\(/, 'known defects must be excluded by tag, never skipped');
    assert.match(source('playwright.config.ts'), /grepInvert:\s*includeKnownDefectTests \? undefined : knownExternalDefectTags/);
  });
});
