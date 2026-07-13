import type { Locator, Page } from '@playwright/test';

export class ZoomControls {
  readonly zoomOutButton: Locator;
  readonly zoomInButton: Locator;
  readonly zoomSelect: Locator;

  constructor(page: Page) {
    this.zoomOutButton = page.getByRole('button', { name: 'Zoom out' });
    this.zoomInButton = page.getByRole('button', { name: 'Zoom in' });
    this.zoomSelect = page.locator('#scaleSelect');
  }

  async zoomIn(): Promise<void> {
    await this.zoomInButton.click();
  }

  async zoomOut(): Promise<void> {
    await this.zoomOutButton.click();
  }

  async select(value: number): Promise<void> {
    await this.zoomSelect.selectOption(String(value));
  }

  async selectedValue(): Promise<string> {
    return this.zoomSelect.inputValue();
  }
}
