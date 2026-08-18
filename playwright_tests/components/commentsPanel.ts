import { errors } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class CommentsPanel {
  readonly panel: Locator;
  readonly commentsTab: Locator;
  readonly searchTab: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResultStatus: Locator;
  readonly noSearchMatches: Locator;
  readonly previousSearchResult: Locator;
  readonly nextSearchResult: Locator;
  readonly summaryButton: Locator;
  readonly summaryDialog: Locator;
  readonly summaryCloseButton: Locator;
  readonly commentCards: Locator;
  readonly annotationRectangles: Locator;

  constructor(private readonly page: Page) {
    this.panel = page.locator('.comments-panel.expanded');
    this.commentsTab = page.locator('#commentSubPane0');
    this.searchTab = page.locator('#commentSubPane2');
    this.searchInput = page.getByRole('textbox', { name: 'search comments input' });
    this.searchButton = page.locator('mv-comment-search > button');
    this.searchResultStatus = page.locator('mv-comment-search mv-comments-navigate span.comment-search__item');
    this.noSearchMatches = page.locator('mv-comment-search p.comment-search__item');
    this.previousSearchResult = page.locator('mv-comment-search a[title^="Previous comment"]');
    this.nextSearchResult = page.locator('mv-comment-search a[title^="Next comment"]');
    this.summaryButton = page.locator('#commentSummary');
    this.summaryDialog = page.locator('#modal');
    this.summaryCloseButton = page.locator('#modal-close-button');
    this.commentCards = this.panel.locator('.aui-comment');
    this.annotationRectangles = page.locator('.rectangle');
  }

  async openSearch(): Promise<void> {
    await this.searchTab.click();
    await this.searchInput.waitFor();
  }

  async openSummary(): Promise<void> {
    await this.commentsTab.click();
    await this.summaryButton.click();
    await this.summaryDialog.waitFor({ state: 'visible' });
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

  private async openEditor(content: string): Promise<Locator> {
    const comment = await this.card(content);
    await comment.locator('p.commentText').click({ timeout: 2_000 });
    await comment.getByRole('button', { name: 'Edit' }).click({ timeout: 2_000 });
    return comment;
  }

  async edit(content: string, replacement: string): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const comment = await this.openEditor(content);
        const editor = comment.locator('textarea[name="content"]');
        await editor.waitFor({ state: 'visible', timeout: 2_000 });
        await editor.fill(replacement, { timeout: 2_000 });
        await comment.getByRole('button', { name: 'Save' }).click({ timeout: 2_000 });
        await editor.waitFor({ state: 'hidden', timeout: 2_000 });
        return;
      } catch (error) {
        const editorWasReplaced = error instanceof errors.TimeoutError ||
          (error instanceof Error && error.message.includes('element was detached'));
        if (attempt === 1 || !editorWasReplaced) {
          throw error;
        }
      }
    }
  }

  async editSelected(content: string, replacement: string): Promise<void> {
    const comment = await this.card(content);
    const editor = comment.locator('textarea[name="content"]');
    await comment.getByRole('button', { name: 'Edit' }).click();
    await editor.waitFor();
    await editor.fill(replacement);
    await comment.getByRole('button', { name: 'Save' }).click();
    await editor.waitFor({ state: 'hidden' });
  }

  async cancelEdit(content: string, replacement: string): Promise<void> {
    const comment = await this.openEditor(content);
    const editor = comment.locator('textarea[name="content"]');
    await editor.fill(replacement);
    await comment.getByRole('button', { name: 'Cancel' }).click();
    await editor.waitFor({ state: 'hidden' });
  }

  async addToOnlyAnnotation(content: string): Promise<void> {
    await this.annotationRectangles.click();
    await this.addToSelectedAnnotation(content);
  }

  async addToSelectedAnnotation(content: string): Promise<void> {
    await this.page.locator('button[title="Comment"]').click();
    const editor = this.panel.locator('textarea[name="content"]');
    await editor.waitFor();
    await editor.fill(content);
    await editor.locator('~ .commentBtns > button').first().click();
    await editor.waitFor({ state: 'hidden' });
  }

  async remove(content: string): Promise<void> {
    const comment = await this.card(content);
    await comment.locator('p.commentText').click();
    await comment.getByRole('button', { name: 'Delete' }).click();
  }

  summaryPageLink(pageNumber: number): Locator {
    return this.summaryDialog.getByRole('link', { name: String(pageNumber), exact: true });
  }
}
