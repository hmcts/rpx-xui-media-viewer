import { expect, test } from '@playwright/test';
import { canRunAatLegacyMigration, missingAatEnvironment } from '../fixtures/aatLegacyCase';

const guardedEnvironment = [
  'TEST_TYPE',
  'TEST_URL',
  'PLAYWRIGHT_BASE_URL',
  'CCD_CASEWORKER_E2E_EMAIL',
  'CCD_CASEWORKER_E2E_PASSWORD',
  'MICROSERVICE_CCD_GW',
  'IDAM_URL',
  'S2S_URL',
] as const;

test('requires the full approved AAT environment before enabling legacy migration', { tag: ['@e2e-support', '@feature-aat-document-prerequisites'] }, async () => {
  const originalEnvironment = Object.fromEntries(guardedEnvironment.map((name) => [name, process.env[name]]));
  try {
    for (const name of guardedEnvironment) {
      delete process.env[name];
    }
    process.env.TEST_TYPE = 'aat';

    expect(canRunAatLegacyMigration()).toBe(false);
    expect(missingAatEnvironment()).toEqual(expect.arrayContaining([
      'CCD_CASEWORKER_E2E_EMAIL',
      'CCD_CASEWORKER_E2E_PASSWORD',
      'PLAYWRIGHT_BASE_URL or TEST_URL',
    ]));

    Object.assign(process.env, {
      TEST_URL: 'https://xui-media-viewer-aat.service.core-compute-aat.internal/',
      CCD_CASEWORKER_E2E_EMAIL: 'aat-caseworker@example.invalid',
      CCD_CASEWORKER_E2E_PASSWORD: 'not-a-secret',
      MICROSERVICE_CCD_GW: 'not-a-secret',
      IDAM_URL: 'https://idam-api.aat.platform.hmcts.net',
      S2S_URL: 'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal',
    });
    expect(canRunAatLegacyMigration()).toBe(true);
  } finally {
    for (const name of guardedEnvironment) {
      const value = originalEnvironment[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
});
