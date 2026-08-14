import type { Locator, Page } from '@playwright/test';

export class MediaViewerToolbar {
  readonly root: Locator;
  readonly moreOptionsButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#toolbarContainer');
    this.moreOptionsButton = page.getByRole('button', { name: 'More options' });
  }

  async clickAction(name: 'Download' | 'Print' | 'Present'): Promise<void> {
    const toolbarAction = this.root.getByRole('button', { name });
    if (await toolbarAction.isVisible()) {
      await toolbarAction.click();
      return;
    }

    await this.moreOptionsButton.click();
    await this.page.locator('.dropdown-menu').getByRole('button', { name }).click();
  }
}
