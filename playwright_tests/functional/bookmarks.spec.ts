import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

const bookmark = (id: string, name: string, index: number, pageNumber = 0) => ({
  id,
  documentId: 'standalone-media-viewer-fixture',
  name,
  pageNumber,
  xCoordinate: 10,
  yCoordinate: 10,
  children: [],
  previous: index === 0 ? null : 'bookmark-1',
  parent: null,
  index,
});

test.describe('Bookmarks', () => {
  test('creates a bookmark from the bookmarks panel', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    const created = await mediaViewer.bookmarks.add('Created bookmark');
    expect(created).toMatchObject({ name: 'Created bookmark' });
    await expect(mediaViewer.bookmarks.name()).toContainText('Created bookmark');
  });

  test('creates a bookmark from a real text selection', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await page.locator('#mvHighlightBtn').click();
    await page.locator('#highlightTextBtn').click();

    const text = page.locator('.textLayer span').filter({ hasText: /example/i }).first();
    await text.waitFor({ state: 'visible' });
    const bounds = await text.boundingBox();
    if (!bounds) {
      throw new Error('PDF text fixture was not visible for selection');
    }
    await text.dblclick();

    await expect(page.locator('#bookmarkButton')).toBeVisible();
    const createRequest = page.waitForRequest(request =>
      request.url().endsWith('/em-anno/bookmarks') && request.method() === 'POST');
    await page.locator('#bookmarkButton').click();
    const created = await createRequest;
    expect(created.postDataJSON()).toEqual(expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
      pageNumber: expect.any(Number),
    }));
    await mediaViewer.bookmarks.open();
    await expect(mediaViewer.bookmarks.nodes).toHaveCount(1);
    await expect(mediaViewer.bookmarks.input()).toBeVisible();
  });

  test('updates a bookmark created by the viewer API contract', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'Created bookmark', 0)]);
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();
    await expect(mediaViewer.bookmarks.name()).toHaveText('Created bookmark');

    const updated = await mediaViewer.bookmarks.rename(0, 'Updated bookmark');
    expect(updated).toMatchObject({ id: 'bookmark-1', name: 'Updated bookmark' });
    await expect(mediaViewer.bookmarks.name()).toContainText('Updated bookmark');
  });

  test('deletes a bookmark and supports an empty bookmark draft', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'Existing bookmark', 0)]);
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    await expect(mediaViewer.bookmarks.name()).toHaveText('Existing bookmark');
    const deleted = await mediaViewer.bookmarks.delete();
    expect(deleted).toMatchObject({ deleted: ['bookmark-1'] });
    await expect(mediaViewer.bookmarks.nodes).toHaveCount(0);
    await expect(mediaViewer.bookmarks.panel).toContainText('No bookmarks created yet');

    await mediaViewer.bookmarks.addButton.click();
    await expect(mediaViewer.bookmarks.input()).toHaveValue('');
  });

  test('deletes the first bookmark and promotes its following sibling', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi([
      bookmark('bookmark-1', 'First bookmark', 0),
      bookmark('bookmark-2', 'Second bookmark', 1),
    ]);
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    const deleted = await mediaViewer.bookmarks.delete(0);
    expect(deleted).toMatchObject({
      deleted: ['bookmark-1'],
      updated: { id: 'bookmark-2', previous: null },
    });
    await expect(mediaViewer.bookmarks.nodes).toHaveCount(1);
    await expect(mediaViewer.bookmarks.name(0)).toHaveText('Second bookmark');
  });

  test('keeps an empty bookmark draft until it has a name', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    await mediaViewer.bookmarks.add();
    await expect(mediaViewer.bookmarks.input()).toHaveValue('');
  });

  test('keeps multiple empty bookmark drafts scoped to the newest input', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    await mediaViewer.bookmarks.add();
    await mediaViewer.bookmarks.add();
    await expect(mediaViewer.bookmarks.nodes).toHaveCount(2);
    await expect(mediaViewer.bookmarks.input(0)).toHaveCount(0);
    await expect(mediaViewer.bookmarks.input(1)).toHaveValue('');
    await mediaViewer.bookmarks.node(1).locator('.bookmark__save').click();
    await expect(mediaViewer.bookmarks.input(1)).toBeVisible();
  });

  test('sorts bookmarks by document position and restores custom order', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi([
      bookmark('bookmark-1', 'Later page', 0, 3),
      bookmark('bookmark-2', 'Earlier page', 1, 0),
    ]);
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    await expect(mediaViewer.bookmarks.name(0)).toHaveText('Later page');
    await mediaViewer.bookmarks.positionSortButton.click();
    await expect(mediaViewer.bookmarks.name(0)).toHaveText('Earlier page');
    await mediaViewer.bookmarks.customSortButton.click();
    await expect(mediaViewer.bookmarks.name(0)).toHaveText('Later page');
  });

  test('persists reorder through the drag-and-drop API contract', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    test.skip(true, 'Blocked by EXUI-5097: re-enable after the Media Viewer rendered-order fix is delivered and verified in AAT/preview');
    await mediaViewer.bookmarks.stubApi([
      bookmark('bookmark-1', 'First bookmark', 0),
      bookmark('bookmark-2', 'Second bookmark', 1),
    ]);
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();
    await mediaViewer.bookmarks.customSortButton.click();

    const movedBookmarks = await mediaViewer.bookmarks.reorder(1, 0);
    expect(movedBookmarks.map(({ name, previous }) => ({ name, previous }))).toEqual([
      { name: 'Second bookmark', previous: undefined },
      { name: 'First bookmark', previous: 'bookmark-2' },
    ]);
    await expect(mediaViewer.bookmarks.name(0)).toHaveText('Second bookmark');
    await expect(mediaViewer.bookmarks.name(1)).toHaveText('First bookmark');
  });

  test('adds thirty bookmarks without losing the bookmark input contract', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    for (let index = 1; index <= 30; index++) {
      await mediaViewer.bookmarks.add(`Bookmark ${index}`);
    }

    await expect(mediaViewer.bookmarks.nodes).toHaveCount(30);
    await expect(mediaViewer.bookmarks.name(29)).toContainText('Bookmark 30');
  });
});
