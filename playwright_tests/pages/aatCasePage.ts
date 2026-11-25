import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

export class AatCasePage {
  constructor(private readonly page: Page) {}

  async signIn(): Promise<void> {
    const username = process.env.CCD_CASEWORKER_E2E_EMAIL;
    const password = process.env.CCD_CASEWORKER_E2E_PASSWORD;
    if (!username || !password) {
      throw new Error('AAT caseworker credentials are not available');
    }
    await this.page.goto('/', { waitUntil: 'commit' });
    const emailInput = this.page.getByRole('textbox', { name: 'Enter your email address' });
    await emailInput.waitFor({ timeout: 30_000 });
    await emailInput.fill(username);
    await this.page.getByRole('button', { name: 'Continue' }).click();
    await this.page.getByRole('textbox', { name: 'Enter your password' }).fill(password);
    await this.page.getByRole('button', { name: 'Continue' }).click();
    await this.page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Case list' }).waitFor({ timeout: 30_000 });
  }

  async openUploadDocument(caseId: string): Promise<void> {
    await this.openCaseDetails(caseId);
    await this.page.locator('#next-step').selectOption({ label: 'Upload Document' });
    await this.page.getByRole('button', { name: 'Go', exact: true }).click();
    await this.page.getByText('Upload Document').waitFor();
  }

  async openCaseDetails(caseId: string): Promise<void> {
    const [caseResponse] = await Promise.all([
      this.page.waitForResponse(
        (response) => response.request().method() === 'GET' && new URL(response.url()).pathname === `/data/internal/cases/${caseId}`,
        { timeout: 30_000 }
      ),
      this.page.goto(`/cases/case-details/EMPLOYMENT/Leeds/${caseId}`, { waitUntil: 'commit' }),
    ]);
    if (caseResponse.status() !== 200) {
      throw new Error('AAT case details did not return the requested case');
    }
    const caseData = await caseResponse.json() as { case_id?: string | number };
    if (String(caseData.case_id) !== caseId) {
      throw new Error('AAT case details did not return the requested case');
    }
    await this.page.getByRole('tab', { name: /^Case Details/ }).waitFor();
    await this.page.getByRole('combobox', { name: 'Next step' }).waitFor();
  }

  async upload(index: number, filename: string, description: string): Promise<void> {
    const upload = this.page.locator(`#documentCollection_${index}_uploadedDocument`);
    await this.page.getByRole('button', { name: 'Add new' }).click();
    await upload.setInputFiles(resolve('playwright_tests/fixtures/assets', filename));
    await this.page.locator(`#documentCollection_${index}_shortDescription`).fill(description);
    await this.page.getByRole('button', { name: 'Continue' }).click();
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }

}
