const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { describe, it } = require('node:test');
const { resolve } = require('node:path');

const repositoryRoot = resolve(__dirname, '../..');

const replacementContracts = [
  ['annotationsDeleteAll.js', 'Delete all existing text highlights', 'annotations.spec.ts', 'deletes every existing PDF highlight through the annotation API'],
  ['createCCDCase.js', 'Create CCD Case for MV...', 'aatLegacyMigration.spec.ts', 'creates the CCD case used by Media Viewer journeys'],
  ['dmStoreScenarios.js', 'Upload PDF Document', 'aatLegacyMigration.spec.ts', 'uploads a PDF document through CCD and DM Store'],
  ['dmStoreScenarios.js', 'Dm Store Upload Image Scenario', 'aatLegacyMigration.spec.ts', 'uploads an image document through CCD and DM Store'],
  ['dmStoreScenarios.js', 'Dm Store Upload Word Document Scenario', 'aatLegacyMigration.spec.ts', 'uploads a Word document through CCD and DM Store'],
  ['imageViewerAnnotationsAndComments.js', 'Non Textual Highlight & Add comment in image viewer', 'aatLegacyMigration.spec.ts', 'creates a non-text image highlight and comment through the live annotation service'],
  ['imageViewerAnnotationsAndComments.js', 'Ability to highlight the image viewer using Draw-box function', 'aatLegacyMigration.spec.ts', 'creates a real draw-box image highlight'],
  ['imageViewerAnnotationsAndComments.js', 'Update Non Textual comment in image viewer', 'aatLegacyMigration.spec.ts', 'updates a persisted non-text image comment'],
  ['imageViewerAnnotationsAndComments.js', 'Delete Non Textual comment in image viewer', 'aatLegacyMigration.spec.ts', 'deletes a persisted non-text image comment'],
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
  it('maps every executable legacy scenario to a named Playwright contract', () => {
    const legacyScenarioNames = new Set();

    for (const [legacyFile] of replacementContracts) {
      const legacySource = source(`test/end-to-end/mvFeatures/${legacyFile}`);
      for (const scenarioName of executableScenarioNames(legacySource)) {
        legacyScenarioNames.add(scenarioName);
      }
    }

    assert.equal(legacyScenarioNames.size, 23, 'Codecept dry-run must still expose 23 executable scenarios');
    assert.equal(replacementContracts.length, legacyScenarioNames.size, 'every legacy scenario needs exactly one explicit replacement mapping');

    for (const [legacyFile, legacyScenario, playwrightFile, playwrightContract] of replacementContracts) {
      assert.match(source(`test/end-to-end/mvFeatures/${legacyFile}`), new RegExp(`Scenario\\('${legacyScenario.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.match(source(`playwright_tests/functional/${playwrightFile}`), new RegExp(`^\\s*(?:test|annotationsTest|deletionTest)\\('${playwrightContract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'm'));
    }
  });
});
