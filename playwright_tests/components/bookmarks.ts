import type { Locator, Page, Route } from '@playwright/test';

type Bookmark = {
  id: string;
  documentId: string;
  name: string;
  pageNumber: number;
  xCoordinate: number;
  yCoordinate: number;
  children: unknown[];
  previous?: string | null;
  parent?: string | null;
  index: number;
};

export class Bookmarks {
  readonly panel: Locator;
  readonly addButton: Locator;
  readonly positionSortButton: Locator;
  readonly customSortButton: Locator;
  readonly nodes: Locator;
  private moveComplete: (() => void) | undefined;

  constructor(private readonly page: Page) {
    this.panel = page.locator('#bookmarkContainer');
    this.addButton = page.locator('#addBookmark');
    this.positionSortButton = page.locator('#sortBookmarkPosition');
    this.customSortButton = page.locator('#sortBookmarkCustom');
    this.nodes = page.locator('.bookmarks-tree .node-wrapper');
  }

  async stubApi(initialBookmarks: Bookmark[] = []): Promise<void> {
    let bookmarks = initialBookmarks.map(bookmark => ({ ...bookmark, children: [] }));

    await this.page.route('**/em-anno/**', async (route: Route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (route.request().method() === 'GET' && /\/bookmarks$/.test(pathname)) {
        await route.fulfill({ json: bookmarks });
        return;
      }

      if (pathname.endsWith('/bookmarks') && ['POST', 'PUT'].includes(route.request().method())) {
        const bookmark = route.request().postDataJSON() as Bookmark;
        bookmarks = bookmarks.some(item => item.id === bookmark.id)
          ? bookmarks.map(item => item.id === bookmark.id ? bookmark : item)
          : [...bookmarks, bookmark];
        await route.fulfill({ json: bookmark });
        return;
      }

      if (!pathname.endsWith('/bookmarks_multiple')) {
        await route.fallback();
        return;
      }

      const method = route.request().method();
      const payload = route.request().postDataJSON();
      if (method === 'DELETE') {
        const deleted = payload.deleted as string[];
        bookmarks = bookmarks.filter(bookmark => !deleted.includes(bookmark.id));
        if (payload.updated) {
          const updated = payload.updated as Bookmark;
          bookmarks = bookmarks.some(bookmark => bookmark.id === updated.id)
            ? bookmarks.map(bookmark => bookmark.id === updated.id ? { ...bookmark, ...updated } : bookmark)
            : [...bookmarks, updated];
        }
        await route.fulfill({ json: {} });
        return;
      }

      bookmarks = payload.map((bookmark: Bookmark) => {
        const current = bookmarks.find(item => item.id === bookmark.id);
        return { ...current, ...bookmark, previous: bookmark.previous };
      });
      await route.fulfill({ json: bookmarks });
      this.moveComplete?.();
      this.moveComplete = undefined;
    });
  }

  async open(): Promise<void> {
    const bookmarksButton = this.page.getByRole('button', { name: 'Bookmarks' });
    if (!(await this.panel.isVisible())) {
      await bookmarksButton.click();
    }
    await this.panel.waitFor({ state: 'visible' });
    await this.addButton.waitFor({ state: 'visible' });
  }

  node(index = 0): Locator {
    return this.nodes.nth(index);
  }

  name(index = 0): Locator {
    return this.node(index).locator('.outlineItem a');
  }

  input(index = 0): Locator {
    return this.node(index).locator('.bookmark__input');
  }

  private draftNode(): Locator {
    return this.nodes.filter({ has: this.page.locator('.bookmark__input') }).last();
  }

  async add(name?: string): Promise<Bookmark | undefined> {
    const createRequest = this.page.waitForRequest(request =>
      request.url().includes('/em-anno/bookmarks') && request.method() === 'POST');
    await this.addButton.click();
    const draft = this.draftNode();
    await draft.locator('.bookmark__input').waitFor({ state: 'visible' });
    await createRequest;
    if (name) {
      const updateRequest = this.page.waitForRequest(request =>
        request.url().includes('/em-anno/bookmarks') && request.method() === 'PUT');
      await draft.locator('.bookmark__input').fill(name);
      await draft.locator('.bookmark__save').click();
      return (await updateRequest).postDataJSON() as Bookmark;
    }
    return undefined;
  }

  async reorder(from: number, to: number): Promise<Bookmark[]> {
    const source = this.node(from).locator('.node-content-wrapper');
    const target = this.node(to).locator('.node-content-wrapper');
    const targetBounds = await target.boundingBox();
    if (!targetBounds) {
      throw new Error('Bookmark reorder target was not visible');
    }
    const sourceBounds = await source.boundingBox();
    if (!sourceBounds) {
      throw new Error('Bookmark reorder source was not visible');
    }
    const moveRequest = this.page.waitForRequest(request =>
      request.url().endsWith('/em-anno/bookmarks_multiple') && request.method() === 'PUT');
    const moveComplete = new Promise<void>(resolve => {
      this.moveComplete = resolve;
    });
    await this.page.mouse.move(sourceBounds.x + sourceBounds.width / 2, sourceBounds.y + sourceBounds.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(targetBounds.x + targetBounds.width / 2, targetBounds.y + targetBounds.height - 2, { steps: 10 });
    await this.page.mouse.up();
    const request = await moveRequest;
    await moveComplete;
    return request.postDataJSON() as Bookmark[];
  }

  async rename(index: number, name: string): Promise<Bookmark> {
    const updateRequest = this.page.waitForRequest(request =>
      request.url().endsWith('/em-anno/bookmarks') && request.method() === 'PUT');
    await this.node(index).locator('.bookmark__rename').click();
    const input = this.node(index).locator('.bookmark__input');
    await input.fill(name);
    await this.node(index).locator('.bookmark__save').click();
    return (await updateRequest).postDataJSON() as Bookmark;
  }

  async delete(index = 0): Promise<{ deleted: string[]; updated?: Bookmark }> {
    const deleteRequest = this.page.waitForRequest(request =>
      request.url().endsWith('/em-anno/bookmarks_multiple') && request.method() === 'DELETE');
    await this.node(index).locator('.bookmark__delete').click();
    return (await deleteRequest).postDataJSON() as { deleted: string[]; updated?: Bookmark };
  }
}
