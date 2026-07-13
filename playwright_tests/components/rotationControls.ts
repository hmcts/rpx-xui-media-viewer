import type { Locator, Page } from '@playwright/test';

export class RotationControls {
  readonly counterclockwiseButton: Locator;
  readonly clockwiseButton: Locator;

  constructor(page: Page) {
    this.counterclockwiseButton = page.getByRole('button', { name: 'Rotate counterclockwise' });
    this.clockwiseButton = page.getByRole('button', { name: 'Rotate clockwise' });
  }

  async clockwise(): Promise<void> {
    await this.clockwiseButton.click();
  }

  async counterclockwise(): Promise<void> {
    await this.counterclockwiseButton.click();
  }
}
