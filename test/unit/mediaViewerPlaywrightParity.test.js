const assert = require('node:assert/strict');
const { existsSync, readdirSync, readFileSync } = require('node:fs');
const { describe, it } = require('node:test');
const { resolve } = require('node:path');

const repositoryRoot = resolve(__dirname, '../..');

const replacementContracts = require('../migration-history/mediaViewerCodeceptScenarios.json');
const cucumberInventory = require('../migration-history/mediaViewerCucumberScenarios.json');
const expectedHistoricalInventory = { total: 52, covered: 50, knownDefect: 1, outOfScope: 1 };
const expectedReplacementContractCount = 23;

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

function executableCucumberScenarioCount() {
  const featuresDirectory = resolve(repositoryRoot, 'e2e/src/features');
  if (!existsSync(featuresDirectory)) return 0;

  return readdirSync(featuresDirectory, { recursive: true })
    .filter((file) => file.endsWith('.feature'))
    .reduce((count, file) => count + (source(`e2e/src/features/${file}`).match(/^\s*Scenario(?: Outline)?:/gm) ?? []).length, 0);
}

function functionalDiscovery() {
  const functionalDirectory = resolve(repositoryRoot, 'playwright_tests/functional');
  return readdirSync(functionalDirectory)
    .filter((file) => file.endsWith('.spec.ts'))
    .reduce((discovery, file) => {
      const sourceText = source(`playwright_tests/functional/${file}`);
      for (const match of sourceText.matchAll(/^\s*(?:\w+Test|test)\('.*?\{ tag: \[(.*?)\]/gm)) {
        const feature = match[1].match(/'@feature-([^']+)'/);
        if (!feature) continue;
        const featureName = feature[1];
        discovery[featureName] = discovery[featureName] ?? { total: 0, default: 0, excluded: 0 };
        discovery[featureName].total += 1;
        if (match[1].includes('@defect-') || match[1].includes('DefectTag')) discovery[featureName].excluded += 1;
        else discovery[featureName].default += 1;
      }
      return discovery;
    }, {});
}

function expectedLegacyReconciliation(unresolvedDefinitions, executableDefinitions) {
  return `${unresolvedDefinitions} unresolved historical definition${unresolvedDefinitions === 1 ? '' : 's'} does not match ${executableDefinitions} executable discovery; Cucumber retirement remains blocked pending EXUI-5124 evidence, while the one DM Store-dependent definition remains explicitly out of scope for this self-contained suite`;
}

describe('Media Viewer Codecept-to-Playwright parity', () => {
  it('accounts for every active historical Cucumber scenario independently', () => {
    const dispositions = new Set(['covered', 'covered-with-known-defect', 'unsupported', 'retired-by-owner', 'out-of-scope']);
    assert.equal(cucumberInventory.length, expectedHistoricalInventory.total);
    assert.equal(new Set(cucumberInventory.map(({ legacyFile, sourceLine }) => `${legacyFile}:${sourceLine}`)).size, cucumberInventory.length);
    for (const scenario of cucumberInventory) {
      assert.equal(Number.isInteger(scenario.sourceLine) && scenario.sourceLine > 0, true, `${scenario.legacyFile}:${scenario.scenario} needs source provenance`);
      assert.ok(dispositions.has(scenario.disposition), `${scenario.legacyFile}:${scenario.scenario} needs an explicit disposition`);
      assert.equal(typeof scenario.assessment, 'string', `${scenario.legacyFile}:${scenario.scenario} needs a semantic assessment`);
      const hasReplacement = scenario.playwrightFile !== null || scenario.playwrightContract !== null;
      if (scenario.disposition === 'covered' || scenario.disposition === 'covered-with-known-defect') {
        assert.equal(hasReplacement, true, `${scenario.legacyFile}:${scenario.scenario} needs a replacement contract`);
        assert.match(scenario.playwrightFile, /^functional\/.+\.spec\.ts$/);
        assert.ok(scenario.playwrightContract);
        assert.ok(Array.isArray(scenario.requiredSourcePatterns) && scenario.requiredSourcePatterns.length > 0);
        const replacementSource = source(`playwright_tests/${scenario.playwrightFile}`);
        assert.match(replacementSource, new RegExp(scenario.playwrightContract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        for (const requiredPattern of scenario.requiredSourcePatterns) {
          assert.match(replacementSource, new RegExp(requiredPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${scenario.legacyFile}:${scenario.scenario} lacks semantic evidence: ${requiredPattern}`);
        }
      } else {
        assert.equal(hasReplacement, false, `${scenario.legacyFile}:${scenario.scenario} must not retain an unrelated replacement mapping`);
        assert.equal(typeof scenario.followUp, 'string');
      }
      if (scenario.disposition === 'covered-with-known-defect') {
        assert.match(scenario.ticket, /^EXUI-\d+$/);
        assert.equal(typeof scenario.followUp, 'string');
      }
    }
  });

  it('maps every historical Codecept scenario to a named Playwright contract', () => {
    const legacyScenarioNames = new Set();

    for (const [, legacyScenario] of replacementContracts) legacyScenarioNames.add(legacyScenario);

    assert.equal(legacyScenarioNames.size, replacementContracts.length, 'every historical Codecept contract must have a Playwright replacement');
    assert.equal(replacementContracts.length, expectedReplacementContractCount);
    const coverageInventory = JSON.parse(source('playwright_tests/functional/mediaViewerCoverage.json'));
    const dispositionCounts = cucumberInventory.reduce((counts, scenario) => {
      counts[scenario.disposition] = (counts[scenario.disposition] ?? 0) + 1;
      return counts;
    }, {});
    assert.deepEqual(dispositionCounts, { covered: expectedHistoricalInventory.covered, 'covered-with-known-defect': expectedHistoricalInventory.knownDefect, 'out-of-scope': expectedHistoricalInventory.outOfScope });
    assert.deepEqual(coverageInventory.legacyInventory, {
      sourceFamily: 'Protractor Cucumber',
      sourceDefinitions: cucumberInventory.length,
      unresolvedDefinitions: cucumberInventory.filter(({ disposition }) =>
        disposition === 'unsupported' || disposition === 'covered-with-known-defect'
      ).length,
      executableDefinitions: executableCucumberScenarioCount(),
      retirementStatus: 'blocked',
      dispositionCounts,
      manifest: './test/migration-history/mediaViewerCucumberScenarios.json',
      reconciliation: expectedLegacyReconciliation(
        cucumberInventory.filter(({ disposition }) => disposition === 'unsupported' || disposition === 'covered-with-known-defect').length,
        executableCucumberScenarioCount(),
      )
    });

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
    assert.equal(legacyScenariosByPlaywrightContract.size, replacementContracts.length - intentionalManyToOneCoverage.length, 'many-to-one mappings must account for the reduced unique contract total');
    assert.equal(existsSync(resolve(repositoryRoot, 'test/config.js')), false, 'the retired Codecept runner config must not remain');
    assert.equal(existsSync(resolve(repositoryRoot, 'test/end-to-end')), false, 'the retired Codecept runner tree must not remain');
    assert.equal(existsSync(resolve(repositoryRoot, 'e2e')), false, 'no executable Protractor source is retained; retirement remains blocked until unresolved history is dispositioned');
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
    assert.match(imageAnnotationContracts, /@defect-EXUI-5124/);
    assert.match(imageAnnotationContracts, /openAnnotatedDocument\(mediaAssets\.image\)/, 'image contracts must load the rendered viewer before exercising it');
    assert.match(imageAnnotationContracts, /drawOnPage\(mediaViewer\.loadState\.imageDrawSurface\)/, 'image create coverage must use the actionable draw surface');
    assert.doesNotMatch(imageAnnotationContracts, /page\.evaluate\(async/, 'image UI parity must not be replaced by direct browser-context API calls');
    assert.doesNotMatch(knownDefectContracts, /test\.(?:skip|fixme)\(/, 'known defects must be excluded by tag, never skipped');
    assert.match(source('playwright.config.ts'), /grepInvert:\s*includeKnownDefectTests \? undefined : knownExternalDefectTags/);
  });

  it('blocks Cucumber retirement when unresolved history is not executable', () => {
    const coverageInventory = JSON.parse(source('playwright_tests/functional/mediaViewerCoverage.json'));
    const unresolvedDefinitions = cucumberInventory.filter(({ disposition }) =>
      disposition === 'unsupported' || disposition === 'covered-with-known-defect'
    ).length;
    const executableDefinitions = executableCucumberScenarioCount();
    const { legacyInventory } = coverageInventory;

    assert.equal(legacyInventory.sourceFamily, 'Protractor Cucumber');
    assert.equal(legacyInventory.unresolvedDefinitions, unresolvedDefinitions);
    assert.equal(legacyInventory.executableDefinitions, executableDefinitions);
    assert.equal(legacyInventory.retirementStatus, 'blocked');
    assert.match(legacyInventory.reconciliation, /unresolved historical definitions?.*executable discovery/s);
    if (legacyInventory.retirementStatus === 'retired') {
      assert.equal(legacyInventory.unresolvedDefinitions, legacyInventory.executableDefinitions);
    } else {
      assert.notEqual(legacyInventory.unresolvedDefinitions, legacyInventory.executableDefinitions);
    }
  });

  it('mechanically reconciles capability totals and statuses with Playwright discovery', () => {
    const coverageInventory = JSON.parse(source('playwright_tests/functional/mediaViewerCoverage.json'));
    const discovery = functionalDiscovery();
    const functionalCapabilities = coverageInventory.capabilities.filter(({ playwrightFeature }) => discovery[playwrightFeature]);

    for (const capability of functionalCapabilities) {
      assert.equal(capability.playwrightTests, discovery[capability.playwrightFeature].total, `${capability.name} total differs from discovery`);
      assert.ok(['Covered', 'Partial', 'Legacy only', 'Not covered'].includes(capability.status), `${capability.name} has an unsupported status`);
    }
    assert.equal(functionalCapabilities.length, Object.keys(discovery).length, 'A discovered feature is missing from the coverage inventory');

    const discoveredTotal = Object.values(discovery).reduce((total, feature) => total + feature.total, 0);
    const defaultTotal = Object.values(discovery).reduce((total, feature) => total + feature.default, 0);
    const defectTotal = Object.values(discovery).reduce((total, feature) => total + feature.excluded, 0);
    const functionalReadme = source('playwright_tests/functional/README.md');
    const documentedTotals = functionalReadme.match(/\*\*(\d+) default \/ (\d+) with EXUI-5124 opt-in\*\*/g).map((match) => match.match(/\d+/g).slice(0, 2).map(Number));
    assert.deepEqual(documentedTotals, [[defaultTotal, discoveredTotal], [defaultTotal + 1, discoveredTotal + 1]]);
    assert.equal(discoveredTotal - defaultTotal, defectTotal, 'opt-in discovery delta must equal tagged defect discovery');
  });
});
