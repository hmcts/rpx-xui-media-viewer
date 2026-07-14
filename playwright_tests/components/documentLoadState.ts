import type { Locator, Page } from '@playwright/test';

export class DocumentLoadState {
  readonly pdfViewer: Locator;
  readonly firstPdfPage: Locator;
  readonly image: Locator;
  readonly unsupportedViewer: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.pdfViewer = page.locator('mv-pdf-viewer');
    this.firstPdfPage = this.pdfPage(1);
    this.image = page.locator('mv-image-viewer img');
    this.unsupportedViewer = page.locator('mv-unsupported-viewer');
    this.successMessage = page.locator('.govuk-panel--confirmation').getByText(/Document load result:\s*SUCCESS/);
    this.errorMessage = page.getByRole('alert').getByText(/Document load result:\s*(FAILURE|UNSUPPORTED)/);
  }

  pdfPage(pageNumber: number): Locator {
    return this.pdfViewer.locator(`div.page[data-page-number="${pageNumber}"]`);
  }
}
