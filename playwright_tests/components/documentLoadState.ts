import type { Locator, Page } from '@playwright/test';

export class DocumentLoadState {
  readonly pdfViewer: Locator;
  readonly firstPdfPage: Locator;
  readonly image: Locator;
  readonly imageDrawSurface: Locator;
  readonly unsupportedViewer: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.pdfViewer = page.locator('mv-pdf-viewer');
    this.firstPdfPage = this.pdfPage(1);
    this.image = page.locator('mv-image-viewer img');
    this.imageDrawSurface = page.locator('mv-image-viewer mv-box-highlight-create [mvKeyboardBoxDraw]');
    this.unsupportedViewer = page.locator('mv-unsupported-viewer');
    this.successMessage = page.locator('.govuk-panel--confirmation').getByText(/Document load result:\s*SUCCESS/);
    this.errorMessage = page.getByRole('alert').getByText(/Document load result:\s*(FAILURE|UNSUPPORTED)/);
  }

  pdfPage(pageNumber: number): Locator {
    return this.pdfViewer.locator(`div.page[data-page-number="${pageNumber}"]`);
  }

  pdfCanvas(pageNumber: number): Locator {
    return this.pdfPage(pageNumber).locator('canvas[role="presentation"]');
  }

  drawSurface(pageNumber: number): Locator {
    return this.page.locator('.pageContainer__page--draw').nth(pageNumber - 1)
      .locator('[mvKeyboardBoxDraw]');
  }

  async pdfOrientation(pageNumber: number): Promise<'portrait' | 'landscape'> {
    return this.pdfCanvas(pageNumber).evaluate((element: HTMLCanvasElement) =>
      element.width < element.height ? 'portrait' : 'landscape'
    );
  }
}
