import { commentCreationTest, expect, commentsTest, mediaAssets, multiDocumentCommentsTest, twoPageCommentsTest } from '../fixtures/mediaViewerTest';

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
    await expect(mediaViewer.comments.comment('Existing viewer comment')).toHaveCount(0);
    await expect(mediaViewer.comments.comment('Unrelated viewer comment')).toBeVisible();
    await expect(mediaViewer.comments.commentCards).toHaveCount(2);
    expect(request.postDataJSON().comments[0].content).toBe('Updated viewer comment');

    const rejectedAnnotationResponse = page.waitForResponse((response) => isStandalonePdfAnnotationRequest(response.url()));
    const rehydratedAnnotationResponse = page.waitForResponse((response) => isLoadedPdfAnnotationRequest(response.url()));
    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment('Updated viewer comment')).toBeVisible();
    await expect(mediaViewer.comments.comment('Existing viewer comment')).toHaveCount(0);
    await expect(mediaViewer.comments.comment('Unrelated viewer comment')).toBeVisible();
    await expect(mediaViewer.comments.commentCards).toHaveCount(2);
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
    await expect(mediaViewer.comments.comment('Unrelated viewer comment')).toBeVisible();
    await expect(mediaViewer.comments.commentCards).toHaveCount(1);
    expect(request.postDataJSON().comments).toEqual([]);

    const rejectedAnnotationResponse = page.waitForResponse((response) => isStandalonePdfAnnotationRequest(response.url()));
    const rehydratedAnnotationResponse = page.waitForResponse((response) => isLoadedPdfAnnotationRequest(response.url()));
    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment('Existing viewer comment')).toHaveCount(0);
    await expect(mediaViewer.comments.comment('Unrelated viewer comment')).toBeVisible();
    await expect(mediaViewer.comments.commentCards).toHaveCount(1);
    expect((await rejectedAnnotationResponse).status()).toBe(404);
    expect((await rehydratedAnnotationResponse).status()).toBe(200);
  });

  commentsTest('cancels an edit without changing the rendered or rehydrated comment', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();

    await mediaViewer.comments.cancelEdit('Existing viewer comment', 'Unsaved viewer comment');
    await expect(mediaViewer.comments.comment('Existing viewer comment')).toBeVisible();
    await expect(mediaViewer.comments.comment('Unsaved viewer comment')).toHaveCount(0);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment('Existing viewer comment')).toBeVisible();
    await expect(mediaViewer.comments.comment('Unsaved viewer comment')).toHaveCount(0);
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

  commentsTest('clears stale highlights, reports no matches and navigates multiple results', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await mediaViewer.comments.openSearch();

    await mediaViewer.comments.searchInput.fill('Existing');
    await mediaViewer.comments.searchButton.click();
    await expect(mediaViewer.comments.comment('Existing viewer comment').locator('.mvTextHighlight')).toHaveText('Existing');

    await mediaViewer.comments.searchInput.fill('missing');
    await mediaViewer.comments.searchButton.click();
    await expect(mediaViewer.comments.noSearchMatches).toHaveText('No matches have been found');
    await expect(mediaViewer.comments.commentCards.locator('.mvTextHighlight')).toHaveCount(0);
    await expect(mediaViewer.comments.searchResultStatus).toHaveCount(0);

    await mediaViewer.comments.searchInput.fill('viewer');
    await mediaViewer.comments.searchButton.click();
    await expect(mediaViewer.comments.searchResultStatus).toHaveText('Showing 1 of 2');
    await mediaViewer.comments.nextSearchResult.click();
    await expect(mediaViewer.comments.searchResultStatus).toHaveText('Showing 2 of 2');
  });

  commentsTest('collates rendered comments and returns to the panel', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer }) => {
    await mediaViewer.goto();
    await mediaViewer.enableAnnotations();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'standalone-media-viewer-fixture', mediaAssets.pdf.contentType);
    await mediaViewer.sidePanels.openComments();
    await mediaViewer.comments.openSummary();

    await expect(mediaViewer.comments.summaryDialog.getByRole('heading')).toBeVisible();
    await expect(mediaViewer.comments.summaryDialog).toContainText('Existing viewer comment');
    await expect(mediaViewer.comments.summaryDialog).toContainText('Unrelated viewer comment');
    await mediaViewer.comments.summaryCloseButton.click();
    await expect(mediaViewer.comments.summaryDialog).toBeHidden();
    await expect(mediaViewer.comments.panel).toBeVisible();
  });
});

twoPageCommentsTest.describe('Comments panel navigation', () => {
  twoPageCommentsTest('navigates search results to the matching comment page', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await mediaViewer.comments.openSearch();

    await mediaViewer.comments.searchInput.fill('navigation comment');
    await mediaViewer.comments.searchButton.click();
    await expect(mediaViewer.comments.searchResultStatus).toHaveText('Showing 1 of 2');
    await mediaViewer.comments.nextSearchResult.click();

    await expect(mediaViewer.comments.searchResultStatus).toHaveText('Showing 2 of 2');
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('2');
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.comments.comment('Page two navigation comment').getByRole('button', { name: 'Edit' })).toBeVisible();

    await mediaViewer.comments.previousSearchResult.click();
    await expect(mediaViewer.comments.searchResultStatus).toHaveText('Showing 1 of 2');
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('1');
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
  });

  twoPageCommentsTest('navigates from a comment summary page link and keeps comments open', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer }) => {
    await mediaViewer.goto();
    await mediaViewer.enableAnnotations();
    await mediaViewer.loadDocument(mediaAssets.pdf.url, 'standalone-media-viewer-fixture', mediaAssets.pdf.contentType);
    await mediaViewer.sidePanels.openComments();
    await mediaViewer.comments.openSummary();

    await mediaViewer.comments.summaryPageLink(2).click();
    await expect(mediaViewer.comments.summaryDialog).toBeHidden();
    await expect(mediaViewer.comments.panel).toBeVisible();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('2');
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');
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

multiDocumentCommentsTest.describe('Comments panel document isolation', () => {
  multiDocumentCommentsTest('keeps saved comments scoped to the document that owns the annotation set', { tag: ['@e2e-functional', '@feature-comments'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    const updateRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotations') && request.method() === 'POST');
    await mediaViewer.comments.edit('Existing viewer comment', 'Document A updated comment');
    expect((await updateRequest).postDataJSON().id).toBe('pw-comment-annotation');
    await expect(mediaViewer.comments.comment('Document A updated comment')).toBeVisible();

    const replacementResponse = page.waitForResponse((response) =>
      response.url().includes('/em-anno/annotation-sets/filter') &&
      new URL(response.url()).searchParams.get('documentId') === mediaAssets.replacementPdf.url
    );
    await mediaViewer.openDocument(mediaAssets.replacementPdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment('Replacement document comment')).toBeVisible();
    await expect(mediaViewer.comments.comment('Document A updated comment')).toHaveCount(0);
    expect((await replacementResponse).status()).toBe(200);

    const originalResponse = page.waitForResponse((response) => isLoadedPdfAnnotationRequest(response.url()));
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment('Document A updated comment')).toBeVisible();
    await expect(mediaViewer.comments.comment('Replacement document comment')).toHaveCount(0);
    const annotationSet = await (await originalResponse).json();
    expect(annotationSet.annotations[0].comments[0].content).toBe('Document A updated comment');
  });
});
