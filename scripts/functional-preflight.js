const puppeteer = require('puppeteer');

const testUrl = process.env.TEST_URL || 'http://localhost:3000/';
const timeoutMs = Number(process.env.E2E_PREFLIGHT_TIMEOUT_MS || 15000);

function isLocalUrl(url) {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

async function getBodyExcerpt(page) {
  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  return text.replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function assertLocalDemoReady(page) {
  await page.waitForFunction(() => document.body && document.body.innerText.includes('Change document details'), {
    timeout: timeoutMs
  });
  await page.waitForFunction(() => {
    const bodyText = document.body ? document.body.innerText : '';
    return bodyText.includes('Load document') ||
      document.querySelector('mv-pdf-viewer') ||
      document.querySelector('mv-image-viewer') ||
      document.querySelector('#pageNumber');
  }, {
    timeout: timeoutMs
  });
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
      await assertLocalDemoReady(page);
    } else {
      await assertViewerReady(page);
    }
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
