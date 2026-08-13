import { annotationsTest, expect, mediaAssets } from '../fixtures/mediaViewerTest';

const annotationRequest = (url: string) => url.endsWith('/em-anno/annotations');

annotationsTest.describe('PDF annotations', () => {
  annotationsTest('creates a text highlight from a real PDF selection and persists its rendered geometry', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await mediaViewer.annotations.openTextHighlight();
    await mediaViewer.annotations.selectExampleFixtureText();
    await expect(mediaViewer.annotations.createButton).toBeVisible();

    const saveRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.createButton.click();
    const savedAnnotation = (await saveRequest).postDataJSON();

    expect(savedAnnotation).toMatchObject({
      annotationSetId: 'pw-empty-annotations-annotation-set',
      documentId: mediaAssets.pdf.url,
      page: 1,
      type: 'highlight',
      rectangles: [expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), width: expect.any(Number), height: expect.any(Number) })],
    });
    expect(savedAnnotation.rectangles[0].width).toBeGreaterThan(0);
    expect(savedAnnotation.rectangles[0].height).toBeGreaterThan(0);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
  });

  annotationsTest('creates a draw-box PDF highlight with a positive rectangle contract', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    const firstPage = mediaViewer.loadState.pdfPage(1);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');

    const saveRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(firstPage);
    const savedAnnotation = (await saveRequest).postDataJSON();

    expect(savedAnnotation).toMatchObject({
      annotationSetId: 'pw-empty-annotations-annotation-set',
      documentId: mediaAssets.pdf.url,
      page: 1,
      type: 'highlight',
    });
    expect(savedAnnotation.rectangles).toHaveLength(1);
    expect(savedAnnotation.rectangles[0]).toMatchObject({
      x: expect.any(Number), y: expect.any(Number), width: expect.any(Number), height: expect.any(Number),
    });
    expect(savedAnnotation.rectangles[0].width).toBeGreaterThan(0);
    expect(savedAnnotation.rectangles[0].height).toBeGreaterThan(0);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
  });

  annotationsTest('keeps a comment on a selected PDF highlight through rotation and rehydration', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    const firstPage = mediaViewer.loadState.pdfPage(1);
    const initialOrientation = await firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    });
    await mediaViewer.rotation.clockwise();
    await expect.poll(() => firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    })).not.toBe(initialOrientation);
    await mediaViewer.annotations.openTextHighlight();
    await mediaViewer.annotations.selectExampleFixtureText();
    const createRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.createButton.click();
    const annotationId = (await createRequest).postDataJSON().id;

    await mediaViewer.annotations.commentButton.click();
    const editor = mediaViewer.comments.panel.getByRole('textbox', { name: 'comment' });
    await editor.fill('Rotated PDF annotation comment');
    const commentRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    const commentResponse = page.waitForResponse((response) => annotationRequest(response.url()) && response.request().method() === 'POST');
    await mediaViewer.comments.panel.getByRole('button', { name: 'Save' }).click();
    expect((await commentRequest).postDataJSON()).toMatchObject({
      id: annotationId,
      comments: [expect.objectContaining({ content: 'Rotated PDF annotation comment' })],
    });
    expect(await (await commentResponse).json()).toMatchObject({
      id: annotationId,
      comments: [expect.objectContaining({
        content: 'Rotated PDF annotation comment',
        createdByDetails: { forename: 'Playwright', surname: 'User' },
      })],
    });

    await mediaViewer.rotation.counterclockwise();
    await expect.poll(() => firstPage.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width < height ? 'portrait' : 'landscape';
    })).toBe(initialOrientation);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
    await expect(mediaViewer.comments.comment('Rotated PDF annotation comment')).toBeVisible();
    await mediaViewer.comments.openSummary();
    await expect(mediaViewer.comments.summaryDialog).toContainText('Rotated PDF annotation comment');
  });

  annotationsTest('highlights PDF search results and persists the created annotation set', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await mediaViewer.annotations.openSearch();
    await mediaViewer.annotations.searchInput.fill('Trace-based');
    await mediaViewer.annotations.searchButton.click();
    await expect(mediaViewer.annotations.resultCount).toContainText(/results founds/);

    const saveRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotation-sets') && request.method() === 'POST');
    await mediaViewer.annotations.highlightAllButton.click();
    const savedAnnotationSet = (await saveRequest).postDataJSON();

    expect(savedAnnotationSet).toMatchObject({ id: 'pw-empty-annotations-annotation-set', documentId: mediaAssets.pdf.url });
    expect(savedAnnotationSet.annotations).not.toHaveLength(0);
    expect(savedAnnotationSet.annotations[0]).toMatchObject({ page: expect.any(Number), type: 'highlight' });
    expect(savedAnnotationSet.annotations[0].rectangles[0].width).toBeGreaterThan(0);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(savedAnnotationSet.annotations.length);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(savedAnnotationSet.annotations.length);
  });

  annotationsTest('removes a persisted PDF highlight and proves the DELETE contract after rehydration', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await mediaViewer.annotations.openTextHighlight();
    await mediaViewer.annotations.selectExampleFixtureText();
    const saveRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.createButton.click();
    const annotationId = (await saveRequest).postDataJSON().id;
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);

    await expect(mediaViewer.annotations.deleteButton).toBeVisible();
    const deleteRequest = page.waitForRequest((request) => request.url().endsWith(`/em-anno/annotations/${annotationId}`) && request.method() === 'DELETE');
    await mediaViewer.annotations.deleteButton.click();
    await deleteRequest;

    await expect(mediaViewer.annotations.rectangles).toHaveCount(0);
    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(0);
  });
});
