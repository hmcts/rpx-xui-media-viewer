import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { AatCasePage } from '../pages/aatCasePage';

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
  if (process.env.TEST_TYPE !== 'aat') {
    missing.unshift('TEST_TYPE=aat');
  }
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
  const serviceToken = await responseJson<string>(
    await request.post(`${s2sUrl}/testing-support/lease`, {
      data: { microservice: 'ccd_gw', oneTimePassword: totp(ccdGatewayKey, { digits: 6, period: 30 }) },
    }),
    'AAT S2S lease'
  );
  const eventToken = await responseJson<{ token: string }>(
    await request.get(
      `${ccdUrl}/caseworkers/${user.id}/jurisdictions/EMPLOYMENT/case-types/Leeds/event-triggers/initiateCase/token`,
      { headers: { Authorization: `Bearer ${login.access_token}`, ServiceAuthorization: `Bearer ${serviceToken}` } }
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
      data: {
        data,
        event: { id: 'initiateCase', summary: 'Creating CCD Case', description: 'For Media Viewer Playwright migration' },
        event_token: eventToken.token,
      },
    }),
    'AAT CCD case creation'
  );

  return created.id;
};

export type AatLegacyJourney = {
  caseId: string;
  casePage: AatCasePage;
  openUploadedImage: () => Promise<Page>;
  uploadDocument: (position: number, filename: string, description: string) => Promise<void>;
};

export const createAatLegacyJourney = async (request: APIRequestContext, page: Page): Promise<AatLegacyJourney> => {
  const caseId = await createAatCcdCase(request);
  const casePage = new AatCasePage(page);
  await casePage.signIn();

  return {
    caseId,
    casePage,
    uploadDocument: async (position, filename, description) => {
      await casePage.openUploadDocument(caseId);
      await casePage.upload(position, filename, description);
    },
    openUploadedImage: async () => {
      await casePage.openUploadDocument(caseId);
      await casePage.upload(1, 'quote.jpg', 'Playwright image document');
      await page.goto(`/case-details/${caseId}`, { waitUntil: 'domcontentloaded' });
      return casePage.openUploadedDocument('quote.jpg');
    },
  };
};
