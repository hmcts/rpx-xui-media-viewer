import type { Locator, Page } from '@playwright/test';

export class CommentsPanel {
  readonly panel: Locator;
  readonly searchTab: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResultStatus: Locator;
  readonly commentCards: Locator;
  readonly annotationRectangles: Locator;

  constructor(private readonly page: Page) {
    this.panel = page.locator('.comments-panel.expanded');
    this.searchTab = page.locator('#commentSubPane2');
    this.searchInput = page.getByRole('textbox', { name: 'search comments input' });
    this.searchButton = page.locator('mv-comment-search > button');
    this.searchResultStatus = page.locator('mv-comment-search mv-comments-navigate span.comment-search__item');
    this.commentCards = this.panel.locator('.aui-comment');
    this.annotationRectangles = page.locator('.rectangle');
  }

  async open(): Promise<void> {
    if (!(await this.panel.isVisible())) {
      await this.page.getByRole('button', { name: 'More options' }).click();
      await this.page.locator('.dropdown-menu #mvCommentsBtn').click();
    }
    await this.panel.waitFor();
  }

  async openSearch(): Promise<void> {
    await this.open();
    await this.searchTab.click();
    await this.searchInput.waitFor();
  }

  comment(content: string): Locator {
    return this.commentCards.filter({ hasText: content });
  }

  private async card(content: string): Promise<Locator> {
    const index = await this.commentCards.evaluateAll((cards, expectedContent) => cards.findIndex(
      (card) => card.textContent?.includes(expectedContent as string)
    ), content);
    if (index < 0) {
      throw new Error(`Comment was not found: ${content}`);
    }
    return this.commentCards.nth(index);
  }

  async edit(content: string, replacement: string): Promise<void> {
    const comment = await this.card(content);
    await comment.locator('p.commentText').click();
    await comment.getByRole('button', { name: 'Edit' }).click();
    const editor = comment.locator('textarea[aria-label="comment"]');
    await editor.waitFor();
    await editor.fill(replacement);
    await this.panel.locator('button.govuk-button').filter({ hasText: 'Save' }).click();
    await editor.waitFor({ state: 'hidden' });
  }

  async addToOnlyAnnotation(content: string): Promise<void> {
    await this.annotationRectangles.click();
    await this.page.locator('button[title="Comment"]').click();
    const editor = this.panel.locator('textarea[aria-label="comment"]');
    await editor.waitFor();
    await editor.fill(content);
    await this.panel.locator('button.govuk-button').filter({ hasText: 'Save' }).click();
    await editor.waitFor({ state: 'hidden' });
  }

  async remove(content: string): Promise<void> {
    const comment = await this.card(content);
    await comment.locator('p.commentText').click();
    await comment.getByRole('button', { name: 'Delete' }).click();
  }
}
