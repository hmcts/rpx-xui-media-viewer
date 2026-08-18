import { expect, test } from '@playwright/test';
import { assertAatLegacyMigrationEnvironment, missingAatEnvironment } from '../fixtures/aatLegacyCase';

const guardedEnvironment = [
  'TEST_URL',
  'PLAYWRIGHT_BASE_URL',
  'CCD_CASEWORKER_E2E_EMAIL',
  'CCD_CASEWORKER_E2E_PASSWORD',
  'MICROSERVICE_CCD_GW',
  'IDAM_URL',
  'S2S_URL',
] as const;

test('fails visibly when the AAT legacy migration environment is incomplete', { tag: ['@e2e-support', '@feature-aat-document-prerequisites'] }, async () => {
  const originalEnvironment = Object.fromEntries(guardedEnvironment.map((name) => [name, process.env[name]]));
  try {
    for (const name of guardedEnvironment) {
      delete process.env[name];
    }
    expect(missingAatEnvironment()).toEqual(expect.arrayContaining([
      'CCD_CASEWORKER_E2E_EMAIL',
      'CCD_CASEWORKER_E2E_PASSWORD',
      'PLAYWRIGHT_BASE_URL or TEST_URL',
    ]));
    expect(() => assertAatLegacyMigrationEnvironment()).toThrow(/AAT legacy migration requires/);

    Object.assign(process.env, {
      TEST_URL: 'https://xui-media-viewer-aat.service.core-compute-aat.internal/',
      CCD_CASEWORKER_E2E_EMAIL: 'aat-caseworker@example.invalid',
      CCD_CASEWORKER_E2E_PASSWORD: 'not-a-secret',
      MICROSERVICE_CCD_GW: 'not-a-secret',
      IDAM_URL: 'https://idam-api.aat.platform.hmcts.net',
      S2S_URL: 'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal',
    });
    expect(() => assertAatLegacyMigrationEnvironment()).not.toThrow();
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
