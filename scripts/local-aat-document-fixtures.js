'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_API_URL = 'http://localhost:1337';
const DEFAULT_PDF = 'test/end-to-end/data/example.pdf';
const DEFAULT_IMAGE = 'test/end-to-end/data/quote.jpg';

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    return 'application/pdf';
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg';
  }
  if (ext === '.png') {
    return 'image/png';
  }
  if (ext === '.mp4') {
    return 'video/mp4';
  }
  return 'application/octet-stream';
}

function documentIdFromResponse(response) {
  const documents = response?._embedded?.documents || [];
  const href = documents[0]?._links?.self?.href;
  if (!href) {
    throw new Error(`DM Store upload response did not include a document href: ${JSON.stringify(response).slice(0, 300)}`);
  }
  return href.split('/').pop();
}

async function uploadDocument(filePath, apiUrl = process.env.MV_LOCAL_API_URL || DEFAULT_API_URL) {
  const absolutePath = path.resolve(filePath);
  const body = new FormData();
  body.append(
    'files',
    new Blob([fs.readFileSync(absolutePath)], { type: contentTypeFor(absolutePath) }),
    path.basename(absolutePath)
  );
  body.append('classification', 'PUBLIC');
  body.append('metadata[type]', 'civil');
  body.append('metadata[jurisdiction]', 'probate');

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/documents`, {
    method: 'POST',
    body
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`DM Store upload failed for ${filePath}: HTTP ${response.status} ${text.slice(0, 500)}`);
  }

  return documentIdFromResponse(JSON.parse(text));
}

function defaultFixturePath(documentType) {
  if (documentType === 'image') {
    return process.env.MV_LOCAL_IMAGE_FIXTURE || DEFAULT_IMAGE;
  }
  return process.env.MV_LOCAL_PDF_FIXTURE || DEFAULT_PDF;
}

module.exports = {
  DEFAULT_API_URL,
  DEFAULT_IMAGE,
  DEFAULT_PDF,
  defaultFixturePath,
  uploadDocument
};
