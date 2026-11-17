import type { Locator, Page } from '@playwright/test';

export class IndexOutline {
  readonly items: Locator;

  constructor(page: Page) {
    this.items = page.locator('mv-outline-item > .outlineItem > a');
  }

  item(title: string): Locator {
    return this.items.filter({ hasText: title });
  }
}
