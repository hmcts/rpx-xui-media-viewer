import type { Locator, Page } from '@playwright/test';

export class MediaViewerSidePanels {
  readonly indexButton: Locator;
  readonly bookmarksButton: Locator;
  readonly commentsButton: Locator;

  constructor(page: Page) {
    this.indexButton = page.getByRole('button', { name: 'Index' });
    this.bookmarksButton = page.getByRole('button', { name: 'Bookmarks' });
    this.commentsButton = page.getByRole('button', { name: 'Comments' });
  }

  async toggleIndex(): Promise<void> {
    await this.indexButton.click();
  }

  async toggleBookmarks(): Promise<void> {
    await this.bookmarksButton.click();
  }

  async toggleComments(): Promise<void> {
    await this.commentsButton.click();
  }

  async isIndexOpen(): Promise<boolean> {
    return (await this.indexButton.getAttribute('aria-expanded')) === 'true';
  }

  async areBookmarksOpen(): Promise<boolean> {
    return (await this.bookmarksButton.getAttribute('aria-expanded')) === 'true';
  }

  async areCommentsOpen(): Promise<boolean> {
    return (await this.commentsButton.getAttribute('aria-expanded')) === 'true';
  }
}
