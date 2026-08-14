import type { Locator, Page } from '@playwright/test';

export class Redactions {
  readonly toolbar: Locator;
  readonly drawBoxButton: Locator;
  readonly previewButton: Locator;
  readonly clearAllButton: Locator;
  readonly saveDocumentButton: Locator;
  readonly markers: Locator;
  readonly viewer: Locator;

  constructor(private readonly page: Page) {
    this.toolbar = page.locator('mv-redaction-toolbar');
    this.drawBoxButton = this.toolbar.getByRole('button', { name: 'Draw a box' });
    this.previewButton = this.toolbar.getByRole('button', { name: 'Preview' });
    this.clearAllButton = this.toolbar.getByRole('button', { name: 'Clear all' });
    this.saveDocumentButton = this.toolbar.getByRole('button', { name: 'Save document' });
    this.markers = page.locator('mv-redactions mv-anno-rectangle .rectangle');
    this.viewer = page.locator('#outerContainer');
  }

  async drawOnPage(page: Locator): Promise<void> {
    await this.drawBoxButton.click();
    const bounds = await page.boundingBox();
    if (!bounds) {
      throw new Error('PDF page was not visible for redaction');
    }
    await this.page.mouse.move(bounds.x + 80, bounds.y + 80);
    await this.page.mouse.down();
    await this.page.mouse.move(bounds.x + 180, bounds.y + 130);
    await this.page.mouse.up();
  }
}
