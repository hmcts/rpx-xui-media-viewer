import type { Locator, Page } from '@playwright/test';

export class MediaViewerSidePanels {
  private readonly moreOptionsButton: Locator;
  private readonly commentsMenuItem: Locator;
  readonly indexButton: Locator;
  readonly bookmarksButton: Locator;
  readonly commentsButton: Locator;

  constructor(page: Page) {
    this.indexButton = page.getByRole('button', { name: 'Index' });
    this.bookmarksButton = page.getByRole('button', { name: 'Bookmarks' });
    this.commentsButton = page.locator('#mvCommentsBtn').first();
    this.moreOptionsButton = page.getByRole('button', { name: 'More options' });
    this.commentsMenuItem = page.locator('.dropdown-menu #mvCommentsBtn');
  }

  async toggleIndex(): Promise<void> {
    await this.indexButton.click();
  }

  async toggleBookmarks(): Promise<void> {
    await this.bookmarksButton.click();
  }

  async toggleComments(): Promise<void> {
    if (!(await this.commentsMenuItem.isVisible())) {
      await this.moreOptionsButton.click();
      await this.commentsMenuItem.waitFor({ state: 'visible' });
    }
    await this.commentsMenuItem.click();
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
