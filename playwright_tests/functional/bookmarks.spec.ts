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

  test('creates a bookmark from a real text selection', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    const created = await mediaViewer.bookmarks.createFromTextSelection();
    expect(created).toEqual(expect.objectContaining({
      id: expect.any(String),
      documentId: mediaAssets.pdf.url,
      name: expect.any(String),
      pageNumber: expect.any(Number),
      xCoordinate: expect.any(Number),
      yCoordinate: expect.any(Number),
    }));
    await mediaViewer.bookmarks.open();
    await expect(mediaViewer.bookmarks.nodes).toHaveCount(1);
    await expect(mediaViewer.bookmarks.input()).toBeVisible();
  });

  test('creates a bookmark from text selection and deletes it', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.createFromTextSelection();
    await mediaViewer.bookmarks.open();
    const saved = await mediaViewer.bookmarks.saveDraft('Selected bookmark');

    await expect(mediaViewer.bookmarks.name()).toBeVisible();
    const deleted = await mediaViewer.bookmarks.delete();
    expect(deleted.deleted).toEqual([saved.id]);
    await expect(mediaViewer.bookmarks.nodes).toHaveCount(0);
  });

  test('creates a bookmark from text selection and renames it', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    const created = await mediaViewer.bookmarks.createFromTextSelection();
    await mediaViewer.bookmarks.open();
    await mediaViewer.bookmarks.saveDraft('Selected bookmark');

    const updated = await mediaViewer.bookmarks.rename(0, 'Renamed selected bookmark');
    expect(updated).toMatchObject({ id: created.id, name: 'Renamed selected bookmark' });
    await expect(mediaViewer.bookmarks.name()).toHaveText('Renamed selected bookmark');
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

  test('keeps a new draft open when an earlier save completes', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'Original bookmark', 0)]);
    let releaseSave: () => void;
    const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
    let saveStarted: () => void;
    const saveRequest = new Promise<void>(resolve => { saveStarted = resolve; });
    await page.route('**/em-anno/bookmarks', async route => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();
        return;
      }
      saveStarted();
      await saveGate;
      await route.fulfill({ json: route.request().postDataJSON() });
    });
    try {
      await mediaViewer.openDocument(mediaAssets.pdf);
      await mediaViewer.bookmarks.open();
      await mediaViewer.bookmarks.node(0).locator('.bookmark__rename').click();
      await mediaViewer.bookmarks.input(0).fill('Updated bookmark');
      await mediaViewer.bookmarks.node(0).locator('.bookmark__save').click();
      await saveRequest;
      await mediaViewer.bookmarks.add();
      await expect(mediaViewer.bookmarks.input(1)).toBeVisible();
      await mediaViewer.bookmarks.input(1).fill('New draft in progress');
      releaseSave();
      await expect(mediaViewer.bookmarks.name(0)).toHaveText('Updated bookmark');
      await expect(mediaViewer.bookmarks.input(1)).toHaveValue('New draft in progress');
    } finally {
      releaseSave();
    }
  });

  for (const status of [200, 500]) {
    test(`enables bookmark structure actions after a pending save returns ${status}`, { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer, page }) => {
      await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'Original bookmark', 0)]);
      let releaseSave: () => void;
      const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
      let saveStarted: () => void;
      const saveRequest = new Promise<void>(resolve => { saveStarted = resolve; });
      await page.route('**/em-anno/bookmarks', async route => {
        if (route.request().method() !== 'PUT') {
          await route.fallback();
          return;
        }
        saveStarted();
        await saveGate;
        await route.fulfill(status === 200 ? { json: route.request().postDataJSON() } : { status, body: 'Save failed' });
      });
      try {
        await mediaViewer.openDocument(mediaAssets.pdf);
        await mediaViewer.bookmarks.open();
        await mediaViewer.bookmarks.node(0).locator('.bookmark__rename').click();
        await mediaViewer.bookmarks.input(0).fill('Updated bookmark');
        await mediaViewer.bookmarks.node(0).locator('.bookmark__save').click();
        await saveRequest;
        await expect(mediaViewer.bookmarks.node(0).locator('.bookmark__delete')).toBeDisabled();
        await expect(mediaViewer.bookmarks.node(0).locator('.node-content-wrapper')).toHaveClass(/cdk-drag-disabled/);
        await expect(mediaViewer.bookmarks.addButton).toBeEnabled();
        releaseSave();
        await expect(mediaViewer.bookmarks.node(0).locator('.bookmark__delete')).toBeEnabled();
        await expect(mediaViewer.bookmarks.node(0).locator('.node-content-wrapper')).not.toHaveClass(/cdk-drag-disabled/);
      } finally {
        releaseSave();
      }
    });
  }

  test('keeps structural actions disabled until both queued saves finish', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'First', 0), bookmark('bookmark-2', 'Second', 1)]);
    let releaseFirst: () => void;
    let releaseSecond: () => void;
    const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
    const secondGate = new Promise<void>(resolve => { releaseSecond = resolve; });
    let firstStarted: () => void;
    let secondStarted: () => void;
    const firstRequest = new Promise<void>(resolve => { firstStarted = resolve; });
    const secondRequest = new Promise<void>(resolve => { secondStarted = resolve; });
    await page.route('**/em-anno/bookmarks', async route => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();
        return;
      }
      const first = route.request().postDataJSON().id === 'bookmark-1';
      (first ? firstStarted : secondStarted)();
      await (first ? firstGate : secondGate);
      await route.fulfill({ json: route.request().postDataJSON() });
    });
    try {
      await mediaViewer.openDocument(mediaAssets.pdf);
      await mediaViewer.bookmarks.open();
      await mediaViewer.bookmarks.node(0).locator('.bookmark__rename').click();
      await mediaViewer.bookmarks.input(0).fill('First updated');
      await mediaViewer.bookmarks.node(0).locator('.bookmark__save').click();
      await firstRequest;
      await mediaViewer.bookmarks.node(1).locator('.bookmark__rename').click();
      await mediaViewer.bookmarks.input(1).fill('Second updated');
      await mediaViewer.bookmarks.node(1).locator('.bookmark__save').click();
      await expect(mediaViewer.bookmarks.node(0).locator('.bookmark__delete')).toBeDisabled();
      releaseFirst();
      await secondRequest;
      await expect(mediaViewer.bookmarks.name(0)).toHaveText('First updated');
      await expect(mediaViewer.bookmarks.node(0).locator('.bookmark__delete')).toBeDisabled();
      releaseSecond();
      await expect(mediaViewer.bookmarks.name(1)).toHaveText('Second updated');
      await expect(mediaViewer.bookmarks.node(0).locator('.bookmark__delete')).toBeEnabled();
    } finally {
      releaseFirst();
      releaseSecond();
    }
  });

  test('isolates pending saves when switching documents and returning', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer, page }) => {
    let first = { ...bookmark('a', 'Document A', 0), documentId: mediaAssets.pdf.url };
    let second = { ...bookmark('b', 'Document B', 0), documentId: mediaAssets.replacementPdf.url };
    let releaseSave: () => void;
    const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
    let saveStarted: () => void;
    const saveRequest = new Promise<void>(resolve => { saveStarted = resolve; });
    await mediaViewer.bookmarks.stubApi();
    await page.route('**/em-anno/**', async route => {
      const request = route.request();
      if (request.method() === 'GET' && new URL(request.url()).pathname.endsWith('/bookmarks')) {
        await route.fulfill({ json: [request.url().includes('example2.pdf') ? second : first] });
        return;
      }
      if (request.method() === 'PUT' && new URL(request.url()).pathname.endsWith('/bookmarks')) {
        const payload = request.postDataJSON();
        if (payload.id === 'a') {
          saveStarted();
          await saveGate;
          first = payload;
        } else {
          second = payload;
        }
        await route.fulfill({ json: payload });
        return;
      }
      await route.fallback();
    });
    try {
      await mediaViewer.openDocument(mediaAssets.pdf);
      await mediaViewer.bookmarks.open();
      await mediaViewer.bookmarks.node(0).locator('.bookmark__rename').click();
      await mediaViewer.bookmarks.input(0).fill('Document A updated');
      await mediaViewer.bookmarks.node(0).locator('.bookmark__save').click();
      await saveRequest;
      await mediaViewer.loadDocument(mediaAssets.replacementPdf.url, 'standalone-media-viewer-fixture');
      await mediaViewer.bookmarks.open();
      await expect(mediaViewer.bookmarks.name(0)).toHaveText('Document B');
      await mediaViewer.bookmarks.rename(0, 'Document B updated');
      await expect(mediaViewer.bookmarks.name(0)).toHaveText('Document B updated');
      await mediaViewer.loadDocument(mediaAssets.pdf.url, 'standalone-media-viewer-fixture');
      await mediaViewer.bookmarks.open();
      await expect(mediaViewer.bookmarks.addButton).toBeDisabled();
      releaseSave();
      await expect(mediaViewer.bookmarks.name(0)).toHaveText('Document A updated');
      await expect(mediaViewer.bookmarks.addButton).toBeEnabled();
    } finally {
      releaseSave();
    }
  });

  test('holds save and both create controls until a structural change fails', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'Original', 0)]);
    let releaseDelete: () => void;
    const deleteGate = new Promise<void>(resolve => { releaseDelete = resolve; });
    let deleteStarted: () => void;
    const deleteRequest = new Promise<void>(resolve => { deleteStarted = resolve; });
    await page.route('**/em-anno/bookmarks_multiple', async route => {
      if (route.request().method() !== 'DELETE') {
        await route.fallback();
        return;
      }
      deleteStarted();
      await deleteGate;
      await route.fulfill({ status: 500, body: 'Delete failed' });
    });
    try {
      await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
      await mediaViewer.bookmarks.open();
      await mediaViewer.bookmarks.node(0).locator('.bookmark__delete').click();
      await deleteRequest;
      await expect(mediaViewer.bookmarks.addButton).toBeDisabled();
      await mediaViewer.bookmarks.node(0).locator('.bookmark__rename').click();
      await mediaViewer.bookmarks.input(0).fill('Draft');
      await expect(mediaViewer.bookmarks.node(0).locator('.bookmark__save')).toBeDisabled();
      await page.locator('#mvHighlightBtn').click();
      await page.locator('#highlightTextBtn').click();
      await page.locator('.textLayer span').filter({ hasText: /example/i }).first().dblclick();
      await expect(page.locator('#bookmarkButton')).toBeDisabled();
      releaseDelete();
      await expect(mediaViewer.bookmarks.addButton).toBeEnabled();
      await expect(mediaViewer.bookmarks.node(0).locator('.bookmark__save')).toBeEnabled();
      await expect(page.locator('#bookmarkButton')).toBeEnabled();
      await expect(mediaViewer.bookmarks.input(0)).toHaveValue('Draft');
    } finally {
      releaseDelete();
    }
  });

  test('opens a new draft after saving an unchanged bookmark name', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'Existing bookmark', 0)]);
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    const saved = await mediaViewer.bookmarks.rename(0, 'Existing bookmark');
    expect(saved).toMatchObject({ id: 'bookmark-1', name: 'Existing bookmark' });
    await mediaViewer.bookmarks.add();
    await expect(mediaViewer.bookmarks.input(1)).toBeVisible();
  });

  test('keeps edits to a bookmark while its previous save completes', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'Original bookmark', 0)]);
    let releaseSave: () => void;
    const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
    let saveStarted: () => void;
    const saveRequest = new Promise<void>(resolve => { saveStarted = resolve; });
    await page.route('**/em-anno/bookmarks', async route => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();
        return;
      }
      saveStarted();
      await saveGate;
      await route.fulfill({ json: route.request().postDataJSON() });
    });
    try {
      await mediaViewer.openDocument(mediaAssets.pdf);
      await mediaViewer.bookmarks.open();
      await mediaViewer.bookmarks.node(0).locator('.bookmark__rename').click();
      await mediaViewer.bookmarks.input(0).fill('First edit');
      await mediaViewer.bookmarks.node(0).locator('.bookmark__save').click();
      await saveRequest;
      await mediaViewer.bookmarks.node(0).locator('.bookmark__rename').click();
      await mediaViewer.bookmarks.input(0).fill('Second edit in progress');
      const firstSave = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/em-anno/bookmarks'));
      releaseSave();
      await firstSave;
      await expect(mediaViewer.bookmarks.input(0)).toHaveValue('Second edit in progress');
    } finally {
      releaseSave();
    }
  });

  test('reports a failed bookmark save', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.bookmarks.stubApi([bookmark('bookmark-1', 'Existing bookmark', 0)]);
    await page.route('**/em-anno/bookmarks', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 500, body: 'Save failed' });
      } else {
        await route.fallback();
      }
    });
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();

    await expect(mediaViewer.bookmarks.rename(0, 'Updated bookmark'))
      .rejects.toThrow('Bookmark save failed with HTTP 500');
    await expect(mediaViewer.bookmarks.name(0)).toHaveText('Existing bookmark');
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

  test('preserves an untouched bookmark during reorder and reload', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi([
      bookmark('bookmark-1', 'First bookmark', 0),
      bookmark('bookmark-2', 'Second bookmark', 1),
      { ...bookmark('bookmark-3', 'Moved bookmark', 2), previous: 'bookmark-2' },
      { ...bookmark('bookmark-4', 'Untouched bookmark', 3), previous: 'bookmark-3' },
    ]);
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();
    await mediaViewer.bookmarks.customSortButton.click();

    const movedBookmarks = await mediaViewer.bookmarks.reorder(2, 0);
    expect(movedBookmarks.map(({ name, previous }) => ({ name, previous }))).toEqual([
      { name: 'Moved bookmark', previous: undefined },
      { name: 'Untouched bookmark', previous: 'bookmark-2' },
      { name: 'First bookmark', previous: 'bookmark-3' },
    ]);
    await expect(mediaViewer.bookmarks.name(0)).toHaveText('Moved bookmark');
    await expect(mediaViewer.bookmarks.name(1)).toHaveText('First bookmark');
    await expect(mediaViewer.bookmarks.name(2)).toHaveText('Second bookmark');
    await expect(mediaViewer.bookmarks.name(3)).toHaveText('Untouched bookmark');

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.bookmarks.open();
    await expect(mediaViewer.bookmarks.name(0)).toHaveText('Moved bookmark');
    await expect(mediaViewer.bookmarks.name(1)).toHaveText('First bookmark');
    await expect(mediaViewer.bookmarks.name(2)).toHaveText('Second bookmark');
    await expect(mediaViewer.bookmarks.name(3)).toHaveText('Untouched bookmark');
  });

  test('adds thirty bookmarks without losing the bookmark input contract', { tag: ['@e2e-functional', '@feature-bookmarks'] }, async ({ mediaViewer }) => {
    // 30 sequential add/save round trips: budget for slow CI instead of racing the default 60s limit.
    test.slow();
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
