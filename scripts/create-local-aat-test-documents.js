#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const {
  DEFAULT_API_URL,
  DEFAULT_IMAGE,
  DEFAULT_PDF,
  uploadDocument
} = require('./local-aat-document-fixtures');

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] || fallback;
}

function hasArg(name) {
  return args.includes(name);
}

function readCount(name, envName, fallback) {
  const raw = argValue(name, process.env[envName] || String(fallback));
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a positive integer or zero`);
  }
  return value;
}

function envLines(pdfIds, imageIds) {
  const lines = [];
  if (pdfIds.length) {
    lines.push(`MV_SMOKE_PDF_DOCUMENT_ID=${pdfIds[0]}`);
    lines.push(`MV_FUNCTIONAL_PDF_DOCUMENT_IDS=${pdfIds.join(',')}`);
  }
  if (imageIds.length) {
    lines.push(`MV_SMOKE_IMAGE_DOCUMENT_ID=${imageIds[0]}`);
    lines.push(`MV_FUNCTIONAL_IMAGE_DOCUMENT_IDS=${imageIds.join(',')}`);
  }
  return lines;
}

(async () => {
  const apiUrl = argValue('--api-url', process.env.MV_LOCAL_API_URL || DEFAULT_API_URL);
  const pdfPath = argValue('--pdf', process.env.MV_LOCAL_PDF_FIXTURE || DEFAULT_PDF);
  const imagePath = argValue('--image', process.env.MV_LOCAL_IMAGE_FIXTURE || DEFAULT_IMAGE);
  const pdfCount = readCount('--pdf-count', 'MV_LOCAL_PDF_DOCUMENT_COUNT', 1);
  const imageCount = readCount('--image-count', 'MV_LOCAL_IMAGE_DOCUMENT_COUNT', 1);
  const outputPath = argValue('--output', process.env.MV_LOCAL_DOCUMENT_ENV_FILE || '');
  const json = hasArg('--json');

  const pdfIds = [];
  const imageIds = [];

  for (let index = 0; index < pdfCount; index++) {
    pdfIds.push(await uploadDocument(pdfPath, apiUrl));
  }

  for (let index = 0; index < imageCount; index++) {
    imageIds.push(await uploadDocument(imagePath, apiUrl));
  }

  if (json) {
    console.log(JSON.stringify({ pdfIds, imageIds }, null, 2));
    return;
  }

  const lines = envLines(pdfIds, imageIds);
  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), `${lines.join('\n')}\n`);
    console.error(`Wrote local AAT document IDs to ${outputPath}`);
  }
  console.log(lines.join('\n'));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
