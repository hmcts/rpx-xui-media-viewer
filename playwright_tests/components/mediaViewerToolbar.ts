import type { Locator, Page } from '@playwright/test';

export class MediaViewerToolbar {
  readonly root: Locator;
  readonly moreOptionsButton: Locator;

  constructor(page: Page) {
    this.root = page.locator('#toolbarContainer');
    this.moreOptionsButton = page.getByRole('button', { name: 'More options' });
  }
}
