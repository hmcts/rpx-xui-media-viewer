import type { TestInfo } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { AccessibilityEngine } from './accessibilityAudit';

export type PublishedAccessibilityEvidenceEntry = {
  engine: AccessibilityEngine | 'summary';
  feature?: string;
  pageState?: string;
  testTitle: string;
  attachmentPrefix: string;
  htmlFileName: string;
  jsonFileName: string;
  screenshotFileName: string;
  violationCount: number;
  status?: string;
  summary?: string;
  rules: string[];
  targets: string[];
  summaryFileName?: string;
  reportFileName?: string;
  url?: string;
};

export type AccessibilityEvidenceProvenance = {
  runCommand?: string;
  outputContext: {
    evidenceDir: string;
    reportFolder: string;
    testOutputDir: string;
    junitOutput: string;
  };
  sourceRevision: string;
};

const EVIDENCE_MANIFEST_FILE = 'manifest.json';
const EVIDENCE_ENTRY_PREFIX = 'manifest-entry-';
const EVIDENCE_PROVENANCE_FILE = 'provenance.json';
const EVIDENCE_AGGREGATE_LOCK_FILE = '.aggregate.lock';
const AGGREGATE_LOCK_WAIT_MS = 30_000;
const AGGREGATE_LOCK_RETRY_MS = 25;

export async function publishAccessibilityEvidence(
  testInfo: TestInfo,
  evidence: {
    attachmentPrefix: string;
    entry: Omit<
      PublishedAccessibilityEvidenceEntry,
      'testTitle' | 'attachmentPrefix' | 'htmlFileName' | 'jsonFileName' | 'screenshotFileName'
    >;
    html: string | Buffer;
    json: unknown;
    screenshot?: Buffer;
    screenshotSuffix?: string;
    extraFiles?: Array<{ fileName: string; body: string | Buffer }>;
  }
): Promise<PublishedAccessibilityEvidenceEntry> {
  const evidenceDir = getEvidenceDir();
  const sourceRevision = requiredSourceRevision();
  const baseName = `${sanitiseFileName(testInfo.title)}-${evidence.attachmentPrefix}`;
  const htmlFileName = `${baseName}.html`;
  const jsonFileName = `${baseName}.json`;
  const screenshotFileName = `${baseName}${evidence.screenshotSuffix ?? '-screenshot.png'}`;
  const entry: PublishedAccessibilityEvidenceEntry = {
    ...evidence.entry,
    testTitle: testInfo.title,
    attachmentPrefix: evidence.attachmentPrefix,
    htmlFileName,
    jsonFileName,
    screenshotFileName,
  };

  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, htmlFileName), evidence.html);
  await fs.writeFile(path.join(evidenceDir, jsonFileName), JSON.stringify(evidence.json, null, 2));
  if (evidence.screenshot) {
    await fs.writeFile(path.join(evidenceDir, screenshotFileName), evidence.screenshot);
  }
  for (const extraFile of evidence.extraFiles ?? []) {
    await fs.writeFile(path.join(evidenceDir, extraFile.fileName), extraFile.body);
  }

  await writeEvidenceEntry(evidenceDir, baseName, entry);
  await withEvidenceAggregateLock(evidenceDir, async () => {
    await writeEvidenceProvenance(evidenceDir, sourceRevision);
    await writeEvidenceManifest(evidenceDir, entry);
    await writeEvidenceIndex(evidenceDir);
  });
  return entry;
}

export function getEvidenceDir(): string {
  return path.resolve(
    process.env.PW_A11Y_EVIDENCE_DIR ||
      path.join(
        process.env.PLAYWRIGHT_REPORT_FOLDER || 'functional-output/tests/playwright-accessibility/odhin-report',
        'accessibility-evidence'
      )
  );
}

function requiredSourceRevision(): string {
  const sourceRevision = firstEnvironmentValue('PLAYWRIGHT_REPORT_REVISION');
  if (!sourceRevision) {
    throw new Error('PLAYWRIGHT_REPORT_REVISION must be supplied for accessibility evidence provenance');
  }
  if (!/^[0-9a-f]{40}$/i.test(sourceRevision)) {
    throw new Error('PLAYWRIGHT_REPORT_REVISION must be a full 40-character commit SHA');
  }
  return sourceRevision;
}

async function writeEvidenceProvenance(evidenceDir: string, sourceRevision: string): Promise<void> {
  const runCommand = firstEnvironmentValue('PLAYWRIGHT_REPORT_COMMAND');
  const provenance: AccessibilityEvidenceProvenance = {
    ...(runCommand ? { runCommand } : {}),
    outputContext: {
      evidenceDir,
      reportFolder:
        process.env.PLAYWRIGHT_REPORT_FOLDER || 'functional-output/tests/playwright-accessibility/odhin-report',
      testOutputDir: process.env.PLAYWRIGHT_TEST_OUTPUT_DIR || 'functional-output/tests/playwright/test-results',
      junitOutput:
        process.env.PLAYWRIGHT_JUNIT_OUTPUT ||
        'functional-output/tests/playwright-accessibility/playwright-accessibility-junit.xml',
    },
    sourceRevision,
  };

  await fs.writeFile(path.join(evidenceDir, EVIDENCE_PROVENANCE_FILE), JSON.stringify(provenance, null, 2));
}

function firstEnvironmentValue(...names: string[]): string | undefined {
  return names.map((name) => process.env[name]?.trim()).find(Boolean);
}

async function writeEvidenceEntry(
  evidenceDir: string,
  baseName: string,
  entry: PublishedAccessibilityEvidenceEntry
): Promise<void> {
  await fs.writeFile(path.join(evidenceDir, `${EVIDENCE_ENTRY_PREFIX}${baseName}.json`), JSON.stringify(entry, null, 2));
}

async function withEvidenceAggregateLock<T>(evidenceDir: string, action: () => Promise<T>): Promise<T> {
  const lockPath = path.join(evidenceDir, EVIDENCE_AGGREGATE_LOCK_FILE);
  const startedAt = Date.now();

  while (true) {
    try {
      const lock = await fs.open(lockPath, 'wx');
      try {
        return await action();
      } finally {
        await lock.close();
        await fs.unlink(lockPath);
      }
    } catch (error) {
      if (!isExistingPathError(error) || Date.now() - startedAt >= AGGREGATE_LOCK_WAIT_MS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, AGGREGATE_LOCK_RETRY_MS));
    }
  }
}

function isExistingPathError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST');
}

async function writeEvidenceManifest(evidenceDir: string, entry: PublishedAccessibilityEvidenceEntry): Promise<void> {
  const manifestPath = path.join(evidenceDir, EVIDENCE_MANIFEST_FILE);
  const existingEntries = await readEvidenceManifest(evidenceDir);
  const retainedEntries = existingEntries.filter(
    (existingEntry) => existingEntry.testTitle !== entry.testTitle || existingEntry.attachmentPrefix !== entry.attachmentPrefix
  );

  await fs.writeFile(manifestPath, JSON.stringify([...retainedEntries, entry], null, 2));
}

async function readEvidenceManifest(evidenceDir: string): Promise<PublishedAccessibilityEvidenceEntry[]> {
  const entriesByKey = new Map<string, PublishedAccessibilityEvidenceEntry>();

  try {
    const manifest = JSON.parse(await fs.readFile(path.join(evidenceDir, EVIDENCE_MANIFEST_FILE), 'utf8'));
    if (Array.isArray(manifest)) {
      for (const entry of manifest.filter(isPublishedEvidenceEntry)) {
        entriesByKey.set(evidenceEntryKey(entry), entry);
      }
    }
  } catch {
    // Missing or partially written aggregate manifests are tolerated; per-test entry files are the source of truth.
  }

  try {
    const fileNames = await fs.readdir(evidenceDir);
    await Promise.all(
      fileNames
        .filter((fileName) => fileName.startsWith(EVIDENCE_ENTRY_PREFIX) && fileName.endsWith('.json'))
        .map(async (fileName) => {
          try {
            const entry = JSON.parse(await fs.readFile(path.join(evidenceDir, fileName), 'utf8'));
            if (isPublishedEvidenceEntry(entry)) {
              entriesByKey.set(evidenceEntryKey(entry), entry);
            }
          } catch {
            // Ignore a single corrupt entry so one failed write does not break the whole report.
          }
        })
    );
  } catch {
    return Array.from(entriesByKey.values());
  }

  return Array.from(entriesByKey.values());
}

function evidenceEntryKey(entry: PublishedAccessibilityEvidenceEntry): string {
  return `${entry.testTitle}\u0000${entry.attachmentPrefix}`;
}

function isPublishedEvidenceEntry(value: unknown): value is PublishedAccessibilityEvidenceEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PublishedAccessibilityEvidenceEntry>;
  return (
    typeof candidate.testTitle === 'string' &&
    typeof candidate.attachmentPrefix === 'string' &&
    typeof candidate.htmlFileName === 'string' &&
    typeof candidate.jsonFileName === 'string' &&
    typeof candidate.screenshotFileName === 'string' &&
    typeof candidate.violationCount === 'number' &&
    Array.isArray(candidate.rules) &&
    Array.isArray(candidate.targets)
  );
}

async function writeEvidenceIndex(evidenceDir: string): Promise<void> {
  const rows = (await readEvidenceManifest(evidenceDir))
    .sort((a, b) => a.testTitle.localeCompare(b.testTitle) || a.attachmentPrefix.localeCompare(b.attachmentPrefix))
    .map(
      (entry) => `
        <li>
          <a class="issue-link" href="./${escapeAttribute(entry.htmlFileName)}">${escapeHtml(entry.testTitle)}</a>
          <p>${escapeHtml(entry.feature ?? 'accessibility')} / ${escapeHtml(entry.pageState ?? entry.engine)}</p>
          <p>${entry.violationCount} ${escapeHtml(entry.engine)} issue(s): ${escapeHtml(entry.rules.join(', '))}</p>
          <a href="./${escapeAttribute(entry.screenshotFileName)}">screenshot</a>
          |
          <a href="./${escapeAttribute(entry.jsonFileName)}">JSON evidence</a>
          ${entry.reportFileName ? `| <a href="./${escapeAttribute(entry.reportFileName)}">native report</a>` : ''}
        </li>
      `
    )
    .join('');

  await fs.writeFile(
    path.join(evidenceDir, 'index.html'),
    `
      <html>
        <head>
          <title>Accessibility Evidence</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0b0c0c; }
            .banner { background: #1d70b8; color: #fff; padding: 16px; margin-bottom: 24px; }
            .issue-link { font-weight: bold; font-size: 18px; }
            li { margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="banner">
            <h1>ACCESSIBILITY EVIDENCE</h1>
            <p>Open each item for engine-specific findings, screenshots, JSON, and native reports where available.</p>
            <p><a href="./${EVIDENCE_PROVENANCE_FILE}">Run provenance</a> (command, output paths, and supplied source revision)</p>
          </div>
          <ol>${rows}</ol>
        </body>
      </html>
    `
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function sanitiseFileName(value: string, fallback = 'accessibility'): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || fallback
  );
}
