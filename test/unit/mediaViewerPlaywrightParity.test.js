const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { describe, it } = require('node:test');
const { resolve } = require('node:path');

const repositoryRoot = resolve(__dirname, '../..');

const replacementContracts = [
  ['createCCDCase.js', 'Create CCD Case for MV...', 'e2e/aatCcdLegacyMigration.spec.ts', 'creates the CCD case used by Media Viewer journeys through the authenticated browser route'],
  ['dmStoreScenarios.js', 'Upload PDF Document', 'e2e/aatCcdLegacyMigration.spec.ts', 'uploads a PDF document through the CCD browser event'],
  ['dmStoreScenarios.js', 'Dm Store Upload Image Scenario', 'e2e/aatCcdLegacyMigration.spec.ts', 'uploads an image document through the CCD browser event'],
  ['dmStoreScenarios.js', 'Dm Store Upload Word Document Scenario', 'e2e/aatCcdLegacyMigration.spec.ts', 'uploads a Word document through the CCD browser event'],
  ['annotationsDeleteAll.js', 'Delete all existing text highlights', 'annotations.spec.ts', 'deletes every existing PDF highlight through the annotation API'],
  ['imageViewerAnnotationsAndComments.js', 'Non Textual Highlight & Add comment in image viewer', 'e2e/aatLegacyMigration.spec.ts', 'persists a complete non-text image annotation lifecycle through the live service'],
  ['imageViewerAnnotationsAndComments.js', 'Ability to highlight the image viewer using Draw-box function', 'e2e/aatLegacyMigration.spec.ts', 'persists a complete non-text image annotation lifecycle through the live service'],
  ['imageViewerAnnotationsAndComments.js', 'Update Non Textual comment in image viewer', 'e2e/aatLegacyMigration.spec.ts', 'persists a complete non-text image annotation lifecycle through the live service'],
  ['imageViewerAnnotationsAndComments.js', 'Delete Non Textual comment in image viewer', 'e2e/aatLegacyMigration.spec.ts', 'persists a complete non-text image annotation lifecycle through the live service'],
  ['indexAndOutline.js', 'Navigate Bundle Documents Through Page Index Number', 'indexOutline.spec.ts', 'navigates a top-level outline document destination'],
  ['indexAndOutline.js', 'Navigate Nested Documents Using Index', 'indexOutline.spec.ts', 'navigates a nested outline document destination and retains the parent selection'],
  ['redact.js', 'Mark Content For Redaction Using Draw Box Function', 'redactions.spec.ts', 'creates a draw-box redaction, previews it and clears the persisted marker'],
  ['redact.js', 'Redact Content Using Redact Text Function', 'redactions.spec.ts', 'redacts selected text and removes the persisted marker'],
  ['redact.js', 'Redact Content Using Search And Redact All Function', 'redactions.spec.ts', 'redacts every PDF search result and persists the generated markers'],
  ['redact.js', 'Create Redactions Using Draw Box and Redact Text Functions', 'redactions.spec.ts', 'keeps text and draw-box redactions together after reload'],
  ['redact.js', 'Preview all content marked for redaction', 'redactions.spec.ts', 'creates a draw-box redaction, previews it and clears the persisted marker'],
  ['redact.js', 'Save redactions to download', 'redactions.spec.ts', 'saves a redacted document with the drawn marker'],
  ['redact.js', 'Redact text and then removing the redaction', 'redactions.spec.ts', 'redacts selected text and removes the persisted marker'],
  ['redact.js', 'Redact first page', 'redactions.spec.ts', 'redacts a full PDF page with positive geometry'],
  ['redact.js', 'Redact multiple pages', 'redactions.spec.ts', 'retains redactions on multiple PDF pages'],
  ['redact.js', 'Clear redactions that are added when document has been downloaded', 'redactions.spec.ts', 'clears persisted redactions across PDF pages without restoring them after reload'],
  ['redact.js', 'Unmark selected content (marked for redaction)', 'redactions.spec.ts', 'deletes one persisted marker while keeping its sibling redaction'],
  ['redact.js', 'Unmark all content (marked for redaction)', 'redactions.spec.ts', 'clears persisted redactions across PDF pages without restoring them after reload'],
];

function source(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

function executableScenarioNames(legacySource) {
  return [...legacySource.matchAll(/^\s*Scenario\('([^']+)'/gm)].map((scenario) => scenario[1].trim());
}

describe('Media Viewer Codecept-to-Playwright parity', () => {
  it('maps every historical Codecept scenario to a named Playwright contract', () => {
    const legacyScenarioNames = new Set();

    for (const [legacyFile] of replacementContracts) {
      const legacySource = source(`test/end-to-end/mvFeatures/${legacyFile}`);
      for (const scenarioName of executableScenarioNames(legacySource)) {
        legacyScenarioNames.add(scenarioName);
      }
    }

    assert.equal(legacyScenarioNames.size, 23, 'the migration inventory must retain all 23 historical Codecept contracts');
    assert.equal(replacementContracts.length, 23, 'every historical Codecept contract must have a Playwright replacement');
    assert.match(
      source('test/config.js'),
      /TestPathToRun:\s*process\.env\.E2E_TEST_PATH\s*\|\|\s*'\.\/mvFeatures\/__retired__\/\*\.js'/,
      'Codecept must have no default execution path after complete migration'
    );
    const packageScripts = JSON.parse(source('package.json')).scripts;
    assert.equal(packageScripts['test:functional'], 'yarn test:playwright:functional');
    assert.equal(packageScripts['test:fullfunctional'], 'yarn test:playwright:functional');
    assert.doesNotMatch(packageScripts['test:crossbrowser'], /codeceptjs/, 'cross-browser coverage must not execute Codecept');
    assert.match(packageScripts['test:crossbrowser'], /test-functional-with-preflight/);
    assert.doesNotMatch(source('Jenkinsfile_CNP'), /codeceptjs|test:crossbrowser/, 'the Jenkins pipeline must select Playwright, never Codecept');

    for (const [legacyFile, legacyScenario, playwrightFile, playwrightContract] of replacementContracts) {
      assert.match(source(`test/end-to-end/mvFeatures/${legacyFile}`), new RegExp(`Scenario\\('${legacyScenario.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      const playwrightPath = playwrightFile.includes('/')
        ? `playwright_tests/${playwrightFile}`
        : `playwright_tests/functional/${playwrightFile}`;
      assert.match(source(playwrightPath), new RegExp(`^\\s*(?:test|annotationsTest|deletionTest)\\('${playwrightContract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'm'));
    }

    const knownDefectContracts = source('playwright_tests/e2e/aatCcdLegacyMigration.spec.ts');
    assert.match(knownDefectContracts, /@defect-EXUI-5122/);
    assert.match(knownDefectContracts, /@defect-EXUI-5123/);
    assert.doesNotMatch(knownDefectContracts, /test\.(?:skip|fixme)\(/, 'known defects must be excluded by tag, never skipped');
    assert.match(source('playwright.config.ts'), /grepInvert:\s*includeKnownDefectTests \? undefined : knownExternalDefectTags/);
  });
});
