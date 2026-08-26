import { expect, test } from '@playwright/test';
import { assertAatLegacyMigrationEnvironment, missingAatEnvironment } from '../fixtures/aatLegacyCase';

const guardedEnvironment = [
  'CCD_CASEWORKER_E2E_EMAIL',
  'CCD_CASEWORKER_E2E_PASSWORD',
  'MICROSERVICE_CCD_GW',
  'IDAM_URL',
  'S2S_URL',
] as const;

test('reports a clear external-service diagnostic when AAT configuration is incomplete', { tag: ['@external-service-contracts', '@feature-aat-document-prerequisites'] }, async () => {
  const originalEnvironment = Object.fromEntries(guardedEnvironment.map((name) => [name, process.env[name]]));
  try {
    for (const name of guardedEnvironment) {
      delete process.env[name];
    }
    expect(missingAatEnvironment()).toEqual(expect.arrayContaining([
      'CCD_CASEWORKER_E2E_EMAIL',
      'CCD_CASEWORKER_E2E_PASSWORD',
    ]));
    expect(() => assertAatLegacyMigrationEnvironment()).toThrow(/AAT legacy migration requires/);

    Object.assign(process.env, {
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
