import type { Locator, Page } from '@playwright/test';

export class MediaViewerPage {
  readonly pdfViewer: Locator;
  readonly pageNumberInput: Locator;
  readonly firstPdfPage: Locator;

  constructor(private readonly page: Page) {
    this.pdfViewer = page.locator('mv-pdf-viewer');
    this.pageNumberInput = page.locator('#pageNumber');
    this.firstPdfPage = page.locator('div.page[data-page-number="1"]');
  }

  async stubAnnotationResponses(): Promise<void> {
    await this.page.route('**/em-anno/annotation-sets/filter**', async (route) => route.fulfill({ json: [] }));
    await this.page.route('**/api/markups/**', async (route) => route.fulfill({ json: [] }));
    await this.page.route('**/em-anno/**/bookmarks', async (route) => route.fulfill({ json: [] }));
    await this.page.route('**/em-anno/metadata/**', async (route) => route.fulfill({ json: {} }));
  }

  async goto(): Promise<void> {
    await this.page.goto('/#/media-viewer');
  }

  resolveDocumentUrl(documentUrl: string): string {
    return new URL(documentUrl, this.page.url()).href;
  }

  async loadDocument(documentUrl: string, caseId: string): Promise<void> {
    const expectedDocumentUrl = this.resolveDocumentUrl(documentUrl);

    await this.page.getByText('Change document details').click();
    await this.page.getByLabel('document url').fill(documentUrl);
    await this.page.getByLabel('document type').fill('pdf');
    await this.page.getByLabel('case id').fill(caseId);

    const documentResponse = this.page.waitForResponse(
      (response) => response.url() === expectedDocumentUrl && response.status() === 200
    );
    await this.page.getByRole('button', { name: 'Load document' }).click();
    await documentResponse;
  }
}
