'use strict';

require('ts-node/register');

const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { publishAccessibilityEvidence } = require('../../playwright_tests/utils/accessibility/accessibilityEvidencePublisher');

const publisherPath = path.resolve(__dirname, '../../playwright_tests/utils/accessibility/accessibilityEvidencePublisher');
const accessibilityRunnerPath = path.resolve(__dirname, '../../scripts/run-playwright-accessibility.cjs');

const environmentNames = [
  'PW_A11Y_EVIDENCE_DIR',
  'PLAYWRIGHT_REPORT_FOLDER',
  'PLAYWRIGHT_TEST_OUTPUT_DIR',
  'PLAYWRIGHT_JUNIT_OUTPUT',
  'PLAYWRIGHT_REPORT_COMMAND',
  'PLAYWRIGHT_REPORT_REVISION',
];

function preserveEnvironment(context) {
  const originalEnvironment = Object.fromEntries(environmentNames.map((name) => [name, process.env[name]]));
  context.after(() => {
    for (const name of environmentNames) {
      if (originalEnvironment[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = originalEnvironment[name];
      }
    }
  });
}

test('publishes run provenance with supplied revision', async (context) => {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-evidence-'));
  context.after(() => fs.rmSync(evidenceDir, { recursive: true, force: true }));
  preserveEnvironment(context);

  Object.assign(process.env, {
    PW_A11Y_EVIDENCE_DIR: evidenceDir,
    PLAYWRIGHT_REPORT_FOLDER: 'functional-output/accessibility/odhin-report',
    PLAYWRIGHT_TEST_OUTPUT_DIR: 'functional-output/accessibility/test-results',
    PLAYWRIGHT_JUNIT_OUTPUT: 'functional-output/accessibility/accessibility-junit.xml',
    PLAYWRIGHT_REPORT_COMMAND: 'yarn test:accessibility:playwright -- --grep @accessibility',
    PLAYWRIGHT_REPORT_REVISION: 'c5d13301ad971cf5ce55c3a5c4dbba875f29e06e',
  });

  await publishAccessibilityEvidence(
    { title: 'Accessibility evidence test' },
    {
      attachmentPrefix: 'axe',
      entry: { engine: 'axe', violationCount: 0, rules: [], targets: [] },
      html: '<p>evidence</p>',
      json: { violationCount: 0 },
    }
  );

  const provenance = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'provenance.json'), 'utf8'));
  assert.deepEqual(provenance, {
    runCommand: 'yarn test:accessibility:playwright -- --grep @accessibility',
    outputContext: {
      evidenceDir,
      reportFolder: 'functional-output/accessibility/odhin-report',
      testOutputDir: 'functional-output/accessibility/test-results',
      junitOutput: 'functional-output/accessibility/accessibility-junit.xml',
    },
    sourceRevision: 'c5d13301ad971cf5ce55c3a5c4dbba875f29e06e',
  });

  const index = fs.readFileSync(path.join(evidenceDir, 'index.html'), 'utf8');
  assert.match(index, /\.\/provenance\.json/);
});

test('rejects evidence publication when no source revision is supplied', async (context) => {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-evidence-'));
  context.after(() => fs.rmSync(evidenceDir, { recursive: true, force: true }));
  preserveEnvironment(context);
  for (const name of environmentNames) {
    delete process.env[name];
  }
  process.env.PW_A11Y_EVIDENCE_DIR = evidenceDir;

  await assert.rejects(
    publishAccessibilityEvidence(
      { title: 'Accessibility evidence without revision' },
      {
        attachmentPrefix: 'axe',
        entry: { engine: 'axe', violationCount: 0, rules: [], targets: [] },
        html: '<p>evidence</p>',
        json: { violationCount: 0 },
      }
    ),
    /PLAYWRIGHT_REPORT_REVISION must be supplied/
  );
  assert.deepEqual(fs.readdirSync(evidenceDir), []);
});

test('preserves every concurrent engine entry in the final manifest and index', async (context) => {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-evidence-concurrent-'));
  context.after(() => fs.rmSync(evidenceDir, { recursive: true, force: true }));
  preserveEnvironment(context);

  const entries = Array.from({ length: 18 }, (_, index) => {
    const engine = ['axe', 'wave-like', 'screen-reader'][index % 3];
    return {
      engine,
      testTitle: `Concurrent accessibility state ${index}`,
      attachmentPrefix: `${engine}-${index}`,
      feature: 'concurrent publishing',
      pageState: `state-${index}`,
      violationCount: index % 2,
      rules: index % 2 ? [`rule-${index}`] : [],
      targets: [`#target-${index}`],
    };
  });
  process.env.PLAYWRIGHT_REPORT_REVISION = 'c5d13301ad971cf5ce55c3a5c4dbba875f29e06e';

  await Promise.all(entries.map((entry) => publishEvidenceInChildProcess(evidenceDir, entry)));

  const manifest = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.length, entries.length);
  assert.deepEqual(
    new Set(manifest.map(({ testTitle, attachmentPrefix, engine }) => `${testTitle}|${attachmentPrefix}|${engine}`)),
    new Set(entries.map(({ testTitle, attachmentPrefix, engine }) => `${testTitle}|${attachmentPrefix}|${engine}`))
  );

  const index = fs.readFileSync(path.join(evidenceDir, 'index.html'), 'utf8');
  for (const entry of entries) {
    assert.match(index, new RegExp(`>${entry.testTitle}</a>`));
  }
});

function publishEvidenceInChildProcess(evidenceDir, entry) {
  const script = `
    const { publishAccessibilityEvidence } = require(${JSON.stringify(publisherPath)});
    const entry = JSON.parse(process.env.PW_A11Y_ENTRY);
    publishAccessibilityEvidence(
      { title: entry.testTitle },
      {
        attachmentPrefix: entry.attachmentPrefix,
        entry,
        html: '<p>evidence</p>',
        json: { engine: entry.engine },
      }
    ).catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-r', 'ts-node/register', '-e', script], {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        PW_A11Y_EVIDENCE_DIR: evidenceDir,
        PW_A11Y_ENTRY: JSON.stringify(entry),
      },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Evidence publisher child exited with code ${code}`));
      }
    });
  });
}
