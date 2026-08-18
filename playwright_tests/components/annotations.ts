import type { Locator, Page } from '@playwright/test';

export class Annotations {
  readonly textHighlightButton: Locator;
  readonly drawBoxButton: Locator;
  readonly fromSearchButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly highlightAllButton: Locator;
  readonly resultCount: Locator;
  readonly rectangles: Locator;
  readonly renderedRectangles: Locator;
  readonly imageDrawSurface: Locator;
  readonly contextToolbar: Locator;
  readonly createButton: Locator;

  constructor(private readonly page: Page) {
    this.textHighlightButton = page.getByRole('button', { name: 'Highlight text' });
    this.drawBoxButton = page.getByRole('button', { name: 'Draw a box' });
    this.fromSearchButton = page.getByRole('button', { name: 'From search' });
    this.searchInput = page.getByRole('textbox', { name: 'Redact from search' });
    this.searchButton = page.locator('#mvSearchAllBtn');
    this.highlightAllButton = page.getByRole('button', { name: 'Highlight all' });
    this.resultCount = page.locator('#findRedactResultsCount');
    this.rectangles = page.locator('mv-anno-rectangle');
    this.renderedRectangles = page.locator('mv-anno-rectangle .rectangle');
    this.imageDrawSurface = page.locator('mv-box-highlight-create > div').first();
    this.contextToolbar = page.locator('mv-ctx-toolbar');
    this.createButton = this.contextToolbar.getByRole('button', { name: 'Highlight' });
  }

  async openTextHighlight(): Promise<void> {
    await this.page.locator('#mvHighlightBtn').click();
    await this.textHighlightButton.click();
  }

  async selectExampleFixtureText(): Promise<void> {
    const text = this.page.locator('.textLayer span').filter({ hasText: /example/i }).first();
    await text.waitFor({ state: 'visible' });
    await text.dblclick();
  }

  async drawOnPage(page: Locator, start = { x: 80, y: 80 }): Promise<void> {
    if (!await this.drawBoxButton.isVisible()) {
      await this.page.locator('#mvHighlightBtn').click();
    }
    await this.drawBoxButton.click();
    await this.page.locator('.pageContainer__page--draw').first().waitFor({ state: 'visible' });
    await this.drawRectangle(page, start);
  }

  async drawOnImage(start = { x: 80, y: 80 }): Promise<void> {
    await this.drawOnPage(this.imageDrawSurface, start);
  }

  private async drawRectangle(page: Locator, start: { x: number; y: number }): Promise<void> {
    const bounds = await page.boundingBox();
    if (!bounds) {
      throw new Error('Media page was not visible for draw-box annotation');
    }
    await this.page.mouse.move(bounds.x + start.x, bounds.y + start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(bounds.x + start.x + 100, bounds.y + start.y + 50);
    await this.page.mouse.up();
  }

  async deleteSelected(): Promise<void> {
    await this.contextToolbar.getByRole('button', { name: 'Delete' }).click();
  }

  async openSearch(): Promise<void> {
    await this.page.locator('#mvHighlightBtn').click();
    await this.fromSearchButton.click();
  }
}
