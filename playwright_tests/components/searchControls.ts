import type { Locator, Page } from '@playwright/test';

export class SearchControls {
  private readonly page: Page;
  readonly openButton: Locator;
  readonly input: Locator;
  readonly submitButton: Locator;
  readonly results: Locator;
  readonly previousResultButton: Locator;
  readonly nextResultButton: Locator;
  readonly closeButton: Locator;
  readonly advancedOptionsButton: Locator;
  readonly highlightAllCheckbox: Locator;
  readonly matchCaseCheckbox: Locator;
  readonly wholeWordCheckbox: Locator;
  readonly highlights: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openButton = page.getByRole('button', { name: 'Search' });
    this.input = page.getByRole('textbox', { name: 'Search document' });
    this.submitButton = page.locator('mv-search-bar button').filter({ hasText: 'Search' });
    this.results = page.locator('#findResultsCount');
    this.previousResultButton = page.getByRole('button', { name: 'Find the previous occurrence of the phrase' });
    this.nextResultButton = page.getByRole('button', { name: 'Find the next occurrence of the phrase' });
    this.closeButton = page.getByRole('button', { name: 'Close Search' });
    this.advancedOptionsButton = page.getByRole('button', { name: 'Advanced search options' });
    this.highlightAllCheckbox = page.getByRole('checkbox', { name: 'Highlight all' });
    this.matchCaseCheckbox = page.getByRole('checkbox', { name: 'Match text (exact case)' });
    this.wholeWordCheckbox = page.getByRole('checkbox', { name: 'Match whole words or sentences' });
    this.highlights = page.locator('.highlight');
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

  async submitSearch(): Promise<void> {
    await this.submitButton.click();
  }

  async pressEnterOnFocusedResult(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async nextResult(): Promise<void> {
    await this.nextResultButton.click();
  }

  async previousResult(): Promise<void> {
    await this.previousResultButton.click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }

  async openAdvancedOptions(): Promise<void> {
    if (!(await this.highlightAllCheckbox.isVisible())) {
      await this.advancedOptionsButton.click();
    }
  }
}
