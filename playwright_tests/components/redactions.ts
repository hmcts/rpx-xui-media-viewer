import type { Locator, Page } from '@playwright/test';

export class Redactions {
  readonly toolbar: Locator;
  readonly drawBoxButton: Locator;
  readonly fromSearchButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly redactAllButton: Locator;
  readonly searchResults: Locator;
  readonly previewButton: Locator;
  readonly clearAllButton: Locator;
  readonly saveDocumentButton: Locator;
  readonly markers: Locator;
  readonly contextToolbar: Locator;
  readonly viewer: Locator;

  constructor(private readonly page: Page) {
    this.toolbar = page.locator('mv-redaction-toolbar');
    this.drawBoxButton = this.toolbar.getByRole('button', { name: 'Draw a box' });
    this.fromSearchButton = this.toolbar.getByRole('button', { name: 'From search' });
    this.searchInput = page.getByRole('textbox', { name: 'Redact from search' });
    this.searchButton = page.locator('#mvSearchAllBtn');
    this.redactAllButton = page.locator('#mvRedactAllBtn');
    this.searchResults = page.locator('#findRedactResultsCount');
    this.previewButton = this.toolbar.getByRole('button', { name: 'Preview' });
    this.clearAllButton = this.toolbar.getByRole('button', { name: 'Clear all' });
    this.saveDocumentButton = this.toolbar.getByRole('button', { name: 'Save document' });
    this.markers = page.locator('mv-redactions mv-anno-rectangle .rectangle');
    this.contextToolbar = page.locator('mv-ctx-toolbar');
    this.viewer = page.locator('#outerContainer');
  }

  async drawOnPage(page: Locator, start = { x: 80, y: 80 }): Promise<void> {
    await this.drawBoxButton.click();
    const bounds = await page.boundingBox();
    if (!bounds) {
      throw new Error('PDF page was not visible for redaction');
    }
    await this.page.mouse.move(bounds.x + start.x, bounds.y + start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(bounds.x + start.x + 100, bounds.y + start.y + 50);
    await this.page.mouse.up();
  }

  async deleteSelectedMarker(): Promise<void> {
    await this.contextToolbar.getByRole('button', { name: 'Delete' }).click();
  }

  async openSearch(): Promise<void> {
    await this.fromSearchButton.click();
  }
}
