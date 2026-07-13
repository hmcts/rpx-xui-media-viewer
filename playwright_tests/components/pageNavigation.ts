import type { Locator, Page } from '@playwright/test';

export class PageNavigation {
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageNumberInput: Locator;
  readonly pageCount: Locator;

  constructor(page: Page) {
    this.previousPageButton = page.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.pageNumberInput = page.getByRole('spinbutton', { name: 'Page number' });
    this.pageCount = page.locator('#numPages');
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.pageNumberInput.fill(String(pageNumber));
    await this.pageNumberInput.press('Tab');
  }

  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
  }

  async currentPage(): Promise<number> {
    return Number(await this.pageNumberInput.inputValue());
  }
}
