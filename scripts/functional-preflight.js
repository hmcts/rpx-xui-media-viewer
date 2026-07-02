const puppeteer = require('puppeteer');

const DEFAULT_DOCUMENT_ID = '04666097-eb32-4b2b-9bec-8e9ce8057560';
const testUrl = process.env.TEST_URL || 'http://localhost:3000/';
const timeoutMs = Number(process.env.E2E_PREFLIGHT_TIMEOUT_MS || 15000);

function isLocalUrl(url) {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

async function getBodyExcerpt(page) {
  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  return text.replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function loadLocalDocument(page) {
  await page.waitForFunction(() => document.body && document.body.innerText.includes('Change document details'), {
    timeout: timeoutMs
  });

  await page.evaluate(() => {
    const summary = Array.from(document.querySelectorAll('summary'))
      .find((element) => element.textContent.includes('Change document details'));
    if (!summary) {
      throw new Error('Change document details section was not found');
    }
    summary.click();
  });

  const documentId = process.env.MV_SMOKE_PDF_DOCUMENT_ID || DEFAULT_DOCUMENT_ID;
  const caseId = process.env.MV_SMOKE_CASE_ID || 'local-aat-media-viewer';

  await setInputValue(page, '#documentUrl', `/documents/${documentId}/binary`);
  await setInputValue(page, '#documentType', 'pdf');
  await setInputValue(page, '#caseId', caseId);
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((element) => element.textContent.includes('Load document'));
    if (!button) {
      throw new Error('Load document button was not found');
    }
    button.click();
  });
}

async function setInputValue(page, selector, value) {
  await page.evaluate((inputSelector, inputValue) => {
    const input = document.querySelector(inputSelector);
    if (!input) {
      throw new Error(`${inputSelector} input was not found`);
    }
    input.value = inputValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);
}

async function assertViewerReady(page) {
  await page.waitForSelector('mv-pdf-viewer', { timeout: timeoutMs });
  await page.waitForSelector('#pageNumber', { timeout: timeoutMs });
  await page.waitForSelector('div.page[data-page-number="1"]', { timeout: timeoutMs });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    if (isLocalUrl(testUrl)) {
      await loadLocalDocument(page);
    }

    await assertViewerReady(page);
    console.log(`Functional preflight passed for ${testUrl}`);
  } catch (error) {
    const pages = await browser.pages();
    const page = pages[pages.length - 1];
    const excerpt = page ? await getBodyExcerpt(page) : '';
    console.error(`Functional preflight failed for ${testUrl}`);
    console.error(error.message);
    if (excerpt) {
      console.error(`Page text: ${excerpt}`);
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
