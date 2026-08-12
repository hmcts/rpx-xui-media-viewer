import { commentCreationTest, expect, commentsTest, mediaAssets } from '../fixtures/mediaViewerTest';

const isLoadedPdfAnnotationRequest = (url: string) =>
  url.includes('/em-anno/annotation-sets/filter') &&
  new URL(url).searchParams.get('documentId') === mediaAssets.pdf.url;

const isStandalonePdfAnnotationRequest = (url: string) =>
  url.includes('/em-anno/annotation-sets/filter') &&
  new URL(url).searchParams.get('documentId') === '04666097-eb32-4b2b-9bec-8e9ce8057560';

commentsTest.describe('Comments panel', () => {
  commentsTest('opens and closes the comments panel with the seeded comment rendered', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    const annotationRequest = page.waitForRequest((request) => isLoadedPdfAnnotationRequest(request.url()));
    const annotationResponse = page.waitForResponse((response) => isLoadedPdfAnnotationRequest(response.url()));
    await mediaViewer.openDocument(mediaAssets.pdf);
    expect(new URL((await annotationRequest).url()).searchParams.get('documentId')).toBe(mediaAssets.pdf.url);
    const annotationBody = await (await annotationResponse).json();
    expect(annotationBody).toHaveProperty('annotations');

    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.panel).toBeVisible();
    await expect(mediaViewer.comments.comment('Existing viewer comment')).toBeVisible();
    await expect(mediaViewer.sidePanels.commentsButton).toHaveAttribute('aria-expanded', 'true');

    await mediaViewer.sidePanels.toggleComments();
    await expect(mediaViewer.comments.panel).toBeHidden();
    await expect(mediaViewer.sidePanels.commentsButton).toHaveAttribute('aria-expanded', 'false');
  });

  commentsTest('updates a comment and renders the replacement text', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();

    const updateRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotations') && request.method() === 'POST');
    await mediaViewer.comments.edit('Existing viewer comment', 'Updated viewer comment');
    const request = await updateRequest;

    await expect(mediaViewer.comments.comment('Updated viewer comment')).toBeVisible();
    expect(request.postDataJSON().comments[0].content).toBe('Updated viewer comment');

    const rejectedAnnotationResponse = page.waitForResponse((response) => isStandalonePdfAnnotationRequest(response.url()));
    const rehydratedAnnotationResponse = page.waitForResponse((response) => isLoadedPdfAnnotationRequest(response.url()));
    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment('Updated viewer comment')).toBeVisible();
    expect((await rejectedAnnotationResponse).status()).toBe(404);
    expect((await rehydratedAnnotationResponse).status()).toBe(200);
  });

  commentsTest('deletes a comment and removes it from the panel', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();

    const deleteRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotations') && request.method() === 'POST');
    await mediaViewer.comments.remove('Existing viewer comment');
    const request = await deleteRequest;

    await expect(mediaViewer.comments.comment('Existing viewer comment')).toHaveCount(0);
    expect(request.postDataJSON().comments).toEqual([]);

    const rejectedAnnotationResponse = page.waitForResponse((response) => isStandalonePdfAnnotationRequest(response.url()));
    const rehydratedAnnotationResponse = page.waitForResponse((response) => isLoadedPdfAnnotationRequest(response.url()));
    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment('Existing viewer comment')).toHaveCount(0);
    expect((await rejectedAnnotationResponse).status()).toBe(404);
    expect((await rehydratedAnnotationResponse).status()).toBe(200);
  });

  commentsTest('searches comments and highlights only the matching text', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await mediaViewer.comments.openSearch();

    await mediaViewer.comments.searchInput.fill('Existing');
    await mediaViewer.comments.searchButton.click();

    const matchingComment = mediaViewer.comments.comment('Existing viewer comment');
    const nonMatchingComment = mediaViewer.comments.comment('Unrelated viewer comment');
    await expect(matchingComment).toBeVisible();
    await expect(nonMatchingComment).toBeVisible();
    await expect(matchingComment.locator('.mvTextHighlight')).toHaveText('Existing');
    await expect(nonMatchingComment.locator('.mvTextHighlight')).toHaveCount(0);
    await expect(mediaViewer.comments.searchResultStatus).toHaveText('Showing 1 of 1');
  });
});

commentCreationTest.describe('Comments panel', () => {
  commentCreationTest('adds a comment to the selected annotation and persists it after rehydration', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    const createRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotations') && request.method() === 'POST');
    await mediaViewer.comments.addToOnlyAnnotation('New viewer comment');
    const request = await createRequest;

    await expect(mediaViewer.comments.comment('New viewer comment')).toBeVisible();
    expect(request.postDataJSON()).toMatchObject({
      id: 'pw-empty-comment-annotation',
      comments: [expect.objectContaining({ content: 'New viewer comment' })],
    });

    const rejectedAnnotationResponse = page.waitForResponse((response) => isStandalonePdfAnnotationRequest(response.url()));
    const rehydratedAnnotationResponse = page.waitForResponse((response) => isLoadedPdfAnnotationRequest(response.url()));
    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment('New viewer comment')).toBeVisible();
    expect((await rejectedAnnotationResponse).status()).toBe(404);
    expect((await rehydratedAnnotationResponse).status()).toBe(200);
  });
});
