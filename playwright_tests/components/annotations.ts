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

  async drawOnPage(page: Locator): Promise<void> {
    await this.page.locator('#mvHighlightBtn').click();
    await this.drawBoxButton.click();
    await this.drawRectangle(page);
  }

  async deleteSelected(): Promise<void> {
    await this.contextToolbar.getByRole('button', { name: 'Delete' }).click();
  }

  private async drawRectangle(page: Locator): Promise<void> {
    const bounds = await page.boundingBox();
    if (!bounds) {
      throw new Error('Media page was not visible for draw-box annotation');
    }
    await this.page.mouse.move(bounds.x + 80, bounds.y + 80);
    await this.page.mouse.down();
    await this.page.mouse.move(bounds.x + 180, bounds.y + 130);
    await this.page.mouse.up();
  }

  async openSearch(): Promise<void> {
    await this.page.locator('#mvHighlightBtn').click();
    await this.fromSearchButton.click();
  }
}
