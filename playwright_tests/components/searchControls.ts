import type { Locator, Page } from '@playwright/test';

export class SearchControls {
  readonly openButton: Locator;
  readonly input: Locator;
  readonly results: Locator;
  readonly previousResultButton: Locator;
  readonly nextResultButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.openButton = page.getByRole('button', { name: 'Search' });
    this.input = page.getByRole('textbox', { name: 'Search document' });
    this.results = page.locator('#findResultsCount');
    this.previousResultButton = page.getByRole('button', { name: 'Find the previous occurrence of the phrase' });
    this.nextResultButton = page.getByRole('button', { name: 'Find the next occurrence of the phrase' });
    this.closeButton = page.getByRole('button', { name: 'Close Search' });
  }

  async open(): Promise<void> {
    if (!(await this.input.isVisible())) {
      await this.openButton.click();
    }
  }

  async searchFor(term: string): Promise<void> {
    await this.open();
    await this.input.fill(term);
    await this.input.press('Enter');
  }
}
