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
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.locator('input[value="Sign in"]').click();
    await this.page.getByRole('heading', { name: 'Case list' }).waitFor();
  }

  async openUploadDocument(caseId: string): Promise<void> {
    await this.page.goto(`/case-details/${caseId}`, { waitUntil: 'domcontentloaded' });
    await this.page.locator('#next-step').selectOption({ label: 'Upload Document' });
    await this.page.locator('form button[type="submit"]').click();
    await this.page.getByText('Upload Document').waitFor();
  }

  async openCaseDetails(caseId: string): Promise<void> {
    await this.page.goto(`/case-details/${caseId}`, { waitUntil: 'domcontentloaded' });
    await this.page.locator('#next-step').waitFor();
  }

  async upload(index: number, filename: string, description: string): Promise<void> {
    const upload = this.page.locator(`#documentCollection_${index}_uploadedDocument`);
    await this.page.getByRole('button', { name: 'Add new' }).click();
    await upload.setInputFiles(resolve('test/end-to-end/data', filename));
    await this.page.locator(`#documentCollection_${index}_shortDescription`).fill(description);
    await this.page.getByRole('button', { name: 'Continue' }).click();
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }

}
