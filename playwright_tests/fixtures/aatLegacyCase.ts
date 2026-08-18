import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { MediaViewerPage } from '../pages/mediaViewerPage';

const totp = require('totp-generator') as (secret: string, options: { digits: number; period: number }) => string;

const requiredEnvironment = [
  'CCD_CASEWORKER_E2E_EMAIL',
  'CCD_CASEWORKER_E2E_PASSWORD',
  'MICROSERVICE_CCD_GW',
  'IDAM_URL',
  'S2S_URL',
] as const;

const aatUrl = (value: string | undefined, fallback: string): string => value ?? fallback;

export const missingAatEnvironment = (): string[] => {
  const missing: string[] = requiredEnvironment.filter((name) => !process.env[name]);
  if (!process.env.PLAYWRIGHT_BASE_URL && !process.env.TEST_URL) {
    missing.push('PLAYWRIGHT_BASE_URL or TEST_URL');
  }
  return missing;
};

export const assertAatLegacyMigrationEnvironment = (): void => {
  const missing = missingAatEnvironment();
  if (missing.length > 0) {
    throw new Error(`AAT legacy migration requires: ${missing.join(', ')}`);
  }
};

const responseJson = async <T>(response: Awaited<ReturnType<APIRequestContext['post']>>, description: string): Promise<T> => {
  if (!response.ok()) {
    throw new Error(`${description} failed with ${response.status()}`);
  }
  return response.json() as Promise<T>;
};

const responseText = async (response: Awaited<ReturnType<APIRequestContext['post']>>, description: string): Promise<string> => {
  if (!response.ok()) {
    throw new Error(`${description} failed with ${response.status()}`);
  }
  return response.text();
};

export const createAatCcdCase = async (request: APIRequestContext): Promise<string> => {
  assertAatLegacyMigrationEnvironment();
  const username = process.env.CCD_CASEWORKER_E2E_EMAIL;
  const password = process.env.CCD_CASEWORKER_E2E_PASSWORD;
  const ccdGatewayKey = process.env.MICROSERVICE_CCD_GW;

  const idamUrl = aatUrl(process.env.IDAM_URL, 'https://idam-api.aat.platform.hmcts.net').replace(/\/$/, '');
  const s2sUrl = aatUrl(process.env.S2S_URL, 'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal').replace(/\/$/, '');
  const ccdUrl = aatUrl(process.env.CCD_DATA_STORE_API_URL, 'http://ccd-data-store-api-aat.service.core-compute-aat.internal').replace(/\/$/, '');

  const login = await responseJson<{ access_token: string }>(
    await request.post(`${idamUrl}/loginUser`, { form: { username, password } }),
    'AAT IdAM login'
  );
  const user = await responseJson<{ id: string }>(
    await request.get(`${idamUrl}/details`, { headers: { Authorization: `Bearer ${login.access_token}` } }),
    'AAT IdAM user lookup'
  );
  const serviceToken = await responseText(
    await request.post(`${s2sUrl}/testing-support/lease`, {
      data: { microservice: 'ccd_gw', oneTimePassword: totp(ccdGatewayKey, { digits: 6, period: 30 }) },
    }),
    'AAT S2S lease'
  );
  const eventToken = await responseJson<{ token: string }>(
    await request.get(
      `${ccdUrl}/caseworkers/${user.id}/jurisdictions/EMPLOYMENT/case-types/Leeds/event-triggers/initiateCase/token`,
      {
        headers: {
          Authorization: `Bearer ${login.access_token}`,
          ServiceAuthorization: `Bearer ${serviceToken}`,
          'Content-Type': 'application/json',
        },
      }
    ),
    'AAT CCD create-case event'
  );
  const data = JSON.parse(await readFile(resolve('test/end-to-end/data/ccd-case-basic-data.json'), 'utf8'));
  const created = await responseJson<{ id: string }>(
    await request.post(`${ccdUrl}/caseworkers/${user.id}/jurisdictions/EMPLOYMENT/case-types/Leeds/cases`, {
      headers: {
        Authorization: `Bearer ${login.access_token}`,
        ServiceAuthorization: `Bearer ${serviceToken}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        data,
        event: { id: 'initiateCase', summary: 'Creating CCD Case', description: 'For Media Viewer Playwright migration' },
        event_token: eventToken.token,
      }),
    }),
    'AAT CCD case creation'
  );

  return String(created.id);
};

export type AatDocument = {
  id: string;
  url: string;
};

type DmStoreUploadResponse = {
  _embedded?: {
    documents?: Array<{
      _links?: {
        self?: {
          href?: string;
        };
      };
    }>;
  };
};

export const uploadAatDocument = async (request: APIRequestContext, filename: string): Promise<AatDocument> => {
  const filePath = resolve('test/end-to-end/data', filename);
  const response = await request.post('/documents', {
    multipart: {
      files: {
        name: basename(filePath),
        mimeType: filename.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream',
        buffer: await readFile(filePath),
      },
      classification: 'PUBLIC',
      'metadata[type]': 'civil',
      'metadata[jurisdiction]': 'probate',
    },
  });
  const uploaded = await responseJson<DmStoreUploadResponse>(response, 'AAT DM Store upload');
  const url = uploaded._embedded?.documents?.[0]?._links?.self?.href;
  const id = url?.split('/').pop();
  if (!id) {
    throw new Error('AAT DM Store upload did not return a document identifier');
  }
  return { id, url: `/documents/${id}/binary` };
};

export const openAatDocumentInMediaViewer = async (
  request: APIRequestContext,
  page: Page,
  caseId: string,
  filename: string,
  contentType: 'pdf' | 'image'
): Promise<MediaViewerPage> => {
  const document = await uploadAatDocument(request, filename);
  const mediaViewer = new MediaViewerPage(page);
  await mediaViewer.goto();
  await mediaViewer.loadDocument(document.url, caseId, contentType);
  return mediaViewer;
};
