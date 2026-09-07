import { expect, test, mediaAssets } from '../fixtures/mediaViewerTest';

test.describe('PDF index and outline', () => {
  test('shows a created bookmark from the sidebar bookmark view', { tag: ['@e2e-functional', '@feature-index-outline'] }, async ({ mediaViewer }) => {
    await mediaViewer.bookmarks.stubApi();
    await mediaViewer.openDocument(mediaAssets.outlinePdf);
    await mediaViewer.bookmarks.open();
    const created = await mediaViewer.bookmarks.add('Outline bookmark');
    expect(created).toMatchObject({ name: 'Outline bookmark' });

    await mediaViewer.sidePanels.toggleIndex();
    await expect(mediaViewer.indexOutline.item('Index Page')).toBeVisible();
    await mediaViewer.sidePanels.toggleBookmarks();
    await expect(mediaViewer.bookmarks.name()).toHaveText('Outline bookmark');
    await expect(mediaViewer.bookmarks.panel).toBeVisible();
  });

  test('navigates a top-level outline document destination', { tag: ['@e2e-functional', '@feature-index-outline'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.outlinePdf);
    await mediaViewer.sidePanels.toggleIndex();
    const title = 'Index Page';
    await expect(mediaViewer.indexOutline.item(title)).toBeVisible();
    await mediaViewer.indexOutline.item(title).click();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('2');
    await expect(mediaViewer.indexOutline.item(title)).toHaveClass(/highlightedOutlineItem/);
  });

  test('navigates a nested outline document destination and retains the parent selection', { tag: ['@e2e-functional', '@feature-index-outline'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.outlinePdf);
    await mediaViewer.sidePanels.toggleIndex();
    const parentTitle = 'B. Section B - Applications and Orders';
    const childTitle = 'Prepared Discharge Final Order';
    const child = mediaViewer.indexOutline.item(childTitle).nth(1);
    await expect(child).toBeVisible();
    await child.click();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('8');
    await expect(child).toHaveClass(/highlightedOutlineItem/);
    await expect(mediaViewer.indexOutline.item(parentTitle)).toHaveClass(/highlightedOutlineItem/);
  });
});
