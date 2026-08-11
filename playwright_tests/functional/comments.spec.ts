import { expect, commentsTest, mediaAssets } from '../fixtures/mediaViewerTest';

commentsTest.describe('Comments panel', () => {
  commentsTest('opens and closes the comments panel with the seeded comment rendered', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    const annotationResponse = page.waitForResponse((response) => response.url().includes('/em-anno/annotation-sets/filter'));
    await mediaViewer.openDocument(mediaAssets.pdf);
    const annotationBody = await (await annotationResponse).json();
    expect(annotationBody).toHaveProperty('annotations');

    await mediaViewer.comments.open();
    await expect(mediaViewer.comments.panel).toBeVisible();
    await expect(mediaViewer.comments.comment('Existing viewer comment')).toBeVisible();
    await expect(mediaViewer.sidePanels.commentsButton).toHaveAttribute('aria-expanded', 'true');

    await mediaViewer.sidePanels.toggleComments();
    await expect(mediaViewer.comments.panel).toBeHidden();
    await expect(mediaViewer.sidePanels.commentsButton).toHaveAttribute('aria-expanded', 'false');
  });

  commentsTest('updates a comment and renders the replacement text', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.comments.open();

    const updateRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotations') && request.method() === 'POST');
    await mediaViewer.comments.edit('Existing viewer comment', 'Updated viewer comment');
    const request = await updateRequest;

    await expect(mediaViewer.comments.comment('Updated viewer comment')).toBeVisible();
    expect(request.postDataJSON().comments[0].content).toBe('Updated viewer comment');
  });

  commentsTest('adds a comment to a selected annotation and persists it', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    const createRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotations') && request.method() === 'POST');
    await mediaViewer.comments.addToAnnotation(2, 'New viewer comment');
    const request = await createRequest;

    await expect(mediaViewer.comments.comment('New viewer comment')).toBeVisible();
    expect(request.postDataJSON()).toMatchObject({
      id: 'pw-empty-comment-annotation',
      comments: [expect.objectContaining({ content: 'New viewer comment' })],
    });
  });

  commentsTest('deletes a comment and removes it from the panel', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.comments.open();

    const deleteRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotations') && request.method() === 'POST');
    await mediaViewer.comments.remove('Existing viewer comment');
    const request = await deleteRequest;

    await expect(mediaViewer.comments.comment('Existing viewer comment')).toHaveCount(0);
    expect(request.postDataJSON().comments).toEqual([]);
  });

  commentsTest('searches comments and highlights only the matching text', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.comments.openSearch();

    await mediaViewer.comments.searchInput.fill('Existing');
    await mediaViewer.comments.searchButton.click();

    await expect(mediaViewer.comments.comment('Existing viewer comment')).toBeVisible();
    await expect(mediaViewer.comments.comment('Existing viewer comment').locator('.mvTextHighlight')).toHaveText('Existing');
    await expect(mediaViewer.comments.comment('Unrelated viewer comment').locator('.mvTextHighlight')).toHaveCount(0);
    await expect(mediaViewer.comments.panel).toContainText('Existing');
  });
});
