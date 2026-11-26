'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

require('ts-node').register({
  project: path.resolve(__dirname, '../../playwright_tests/tsconfig.json'),
});

const { AatCasePage } = require('../../playwright_tests/pages/aatCasePage');

test('AAT hand-off follows two-step sign-in and opens a usable Employment case', async () => {
  const originalEmail = process.env.CCD_CASEWORKER_E2E_EMAIL;
  const originalPassword = process.env.CCD_CASEWORKER_E2E_PASSWORD;
  process.env.CCD_CASEWORKER_E2E_EMAIL = 'caseworker@example.test';
  process.env.CCD_CASEWORKER_E2E_PASSWORD = 'synthetic-password';

  let state = 'email';
  const visited = [];
  const page = {
    async goto(path, options) {
      visited.push(path);
      assert.equal(options.waitUntil, 'commit');
      state = path === '/' ? 'email' : path === '/cases/case-details/EMPLOYMENT/Leeds/1234567890123456' ? 'details' : 'error';
    },
    async waitForResponse(matches, options) {
      assert.equal(options.timeout, 30_000);
      const response = {
        url: () => 'https://manage-case.aat.platform.hmcts.net/data/internal/cases/1234567890123456',
        request: () => ({ method: () => 'GET' }),
        status: () => 200,
        json: async () => ({ case_id: '1234567890123456' }),
      };
      assert.equal(matches(response), true);
      return response;
    },
    getByRole(role, { name }) {
      if (role === 'textbox' && name === 'Enter your email address') {
        return {
          async waitFor({ timeout }) { assert.equal(state, 'email'); assert.equal(timeout, 30_000); },
          async fill(value) { assert.equal(state, 'email'); assert.equal(value, 'caseworker@example.test'); },
        };
      }
      if (role === 'textbox' && name === 'Enter your password') {
        return { async fill(value) { assert.equal(state, 'password'); assert.equal(value, 'synthetic-password'); } };
      }
      if (role === 'button' && name === 'Continue') {
        return { async click() { state = state === 'email' ? 'password' : 'app'; } };
      }
      if (role === 'navigation' && name === 'Primary navigation') {
        return { getByRole(linkRole, { name: linkName }) {
          assert.equal(linkRole, 'link');
          assert.equal(linkName, 'Case list');
          return { async waitFor({ timeout }) { assert.equal(state, 'app'); assert.equal(timeout, 30_000); } };
        } };
      }
      if (role === 'tab' && name.test?.('Case Details')) {
        return { async waitFor() { assert.equal(state, 'details'); } };
      }
      if (role === 'combobox' && name === 'Next step') {
        return { async waitFor() { assert.equal(state, 'details'); } };
      }
      if (role === 'button' && name === 'Go') {
        return { async click() { assert.equal(state, 'details'); state = 'upload'; } };
      }
      throw new Error(`Unexpected locator: ${role} ${String(name)}`);
    },
    locator(selector) {
      assert.equal(selector, '#next-step');
      return { async selectOption({ label }) { assert.equal(state, 'details'); assert.equal(label, 'Upload Document'); } };
    },
    getByText(text) {
      assert.equal(text, 'Upload Document');
      return { async waitFor() { assert.equal(state, 'upload'); } };
    },
  };

  try {
    const ccd = new AatCasePage(page);
    await ccd.signIn();
    await ccd.openCaseDetails('1234567890123456');
    await ccd.openUploadDocument('1234567890123456');
    assert.deepEqual(visited, ['/', '/cases/case-details/EMPLOYMENT/Leeds/1234567890123456', '/cases/case-details/EMPLOYMENT/Leeds/1234567890123456']);
  } finally {
    if (originalEmail === undefined) delete process.env.CCD_CASEWORKER_E2E_EMAIL;
    else process.env.CCD_CASEWORKER_E2E_EMAIL = originalEmail;
    if (originalPassword === undefined) delete process.env.CCD_CASEWORKER_E2E_PASSWORD;
    else process.env.CCD_CASEWORKER_E2E_PASSWORD = originalPassword;
  }
});

test('AAT hand-off fails when the intended case-details tab is absent', async () => {
  const page = {
    async goto() {},
    async waitForResponse() { return { status: () => 200, json: async () => ({ case_id: '1234567890123456' }) }; },
    getByRole(role) {
      assert.equal(role, 'tab');
      return { async waitFor() { throw new Error('Case Details tab is missing'); } };
    },
  };
  await assert.rejects(new AatCasePage(page).openCaseDetails('1234567890123456'), /Case Details tab is missing/);
});

test('AAT hand-off fails when CCD returns a different case identity', async () => {
  const page = {
    async goto() {},
    async waitForResponse(matches) {
      const wrongResponse = {
        url: () => 'https://manage-case.aat.platform.hmcts.net/data/internal/cases/9999999999999999',
        request: () => ({ method: () => 'GET' }),
      };
      assert.equal(matches(wrongResponse), false);
      return { status: () => 200, json: async () => ({ case_id: '9999999999999999' }) };
    },
  };
  await assert.rejects(new AatCasePage(page).openCaseDetails('1234567890123456'), /did not return the requested case/);
});
