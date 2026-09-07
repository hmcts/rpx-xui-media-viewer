import { expect, type Locator, type Page } from '@playwright/test';

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

  async drawOnPage(page: Locator, start = { x: 80, y: 80 }): Promise<void> {
    await page.waitFor({ state: 'visible' });
    if (!await this.drawBoxButton.isVisible()) {
      await this.page.locator('#mvHighlightBtn').click();
    }
    await this.drawBoxButton.click();
    const pageNumber = await page.getAttribute('data-page-number');
    const drawingSurface = this.page.locator('.pageContainer__page--draw').nth(
      pageNumber ? Number(pageNumber) - 1 : 0
    );
    await drawingSurface.waitFor({ state: 'visible' });
    await this.drawRectangle(drawingSurface, start);
  }

  private async drawRectangle(surface: Locator, start: { x: number; y: number }): Promise<void> {
    await surface.waitFor({ state: 'visible' });
    await expect.poll(async () => {
      const bounds = await surface.boundingBox();
      return !!bounds && bounds.width >= start.x + 100 && bounds.height >= start.y + 50;
    }).toBe(true);
    const bounds = await surface.boundingBox();
    if (!bounds) {
      throw new Error('Media page did not reach a drawable size for draw-box annotation');
    }
    await this.page.mouse.move(bounds.x + start.x, bounds.y + start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(bounds.x + start.x + 100, bounds.y + start.y + 50, { steps: 10 });
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
