import { expect, test } from '@playwright/test';

test.describe('Playwright runner baseline', () => {
  test('starts with the configured base URL', async ({}, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const resolvedBaseURL = typeof baseURL === 'string' ? new URL(baseURL).toString() : '';

    await testInfo.attach('runner-baseline', {
      body: JSON.stringify(
        {
          baseURL: resolvedBaseURL,
          project: testInfo.project.name,
          title: testInfo.title,
        },
        null,
        2
      ),
      contentType: 'application/json',
    });

    expect(resolvedBaseURL, 'PLAYWRIGHT_BASE_URL or TEST_URL must resolve to a valid URL').toBeTruthy();
  });
});
