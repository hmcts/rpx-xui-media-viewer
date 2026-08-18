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
    expect(savedAnnotation.rectangles[0].x).toBeGreaterThanOrEqual(0);
    expect(savedAnnotation.rectangles[0].y).toBeGreaterThanOrEqual(0);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
    await expect(mediaViewer.annotations.renderedRectangles.first()).toBeVisible();
    await mediaViewer.annotations.renderedRectangles.first().scrollIntoViewIfNeeded();
    const rehydratedBounds = await mediaViewer.annotations.renderedRectangles.first().boundingBox();
    expect(rehydratedBounds).not.toBeNull();
    expect(rehydratedBounds?.width).toBeGreaterThan(0);
    expect(rehydratedBounds?.height).toBeGreaterThan(0);
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
    expect(savedAnnotation.rectangles[0].x).toBeGreaterThanOrEqual(0);
    expect(savedAnnotation.rectangles[0].y).toBeGreaterThanOrEqual(0);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
    await expect(mediaViewer.annotations.renderedRectangles.first()).toBeVisible();
    await mediaViewer.annotations.renderedRectangles.first().scrollIntoViewIfNeeded();
    const rehydratedBounds = await mediaViewer.annotations.renderedRectangles.first().boundingBox();
    expect(rehydratedBounds).not.toBeNull();
    expect(rehydratedBounds?.width).toBeGreaterThan(0);
    expect(rehydratedBounds?.height).toBeGreaterThan(0);
  });

  annotationsTest('keeps independently drawn highlight geometry distinct after reload', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    const firstPage = mediaViewer.loadState.pdfPage(1);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');

    const firstSave = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(firstPage, { x: 80, y: 80 });
    const firstAnnotation = (await firstSave).postDataJSON();

    const secondSave = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(firstPage, { x: 250, y: 200 });
    const secondAnnotation = (await secondSave).postDataJSON();

    expect(firstAnnotation.id).not.toBe(secondAnnotation.id);
    expect(firstAnnotation.rectangles[0]).not.toEqual(secondAnnotation.rectangles[0]);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(2);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.annotations.renderedRectangles).toHaveCount(2);
    await mediaViewer.annotations.renderedRectangles.last().scrollIntoViewIfNeeded();
    const [firstBounds, secondBounds] = await Promise.all([
      mediaViewer.annotations.renderedRectangles.first().boundingBox(),
      mediaViewer.annotations.renderedRectangles.last().boundingBox(),
    ]);
    expect(firstBounds).not.toBeNull();
    expect(secondBounds).not.toBeNull();
    expect(firstBounds?.x).not.toBe(secondBounds?.x);
    expect(firstBounds?.y).not.toBe(secondBounds?.y);
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

    const commentRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    const commentResponse = page.waitForResponse((response) => {
      if (!annotationRequest(response.url()) || response.request().method() !== 'POST') {
        return false;
      }
      const requestBody = response.request().postDataJSON() as { comments?: Array<{ content?: string }> };
      return requestBody.comments?.some((comment) => comment.content === 'Rotated PDF annotation comment') ?? false;
    });
    await mediaViewer.comments.addToSelectedAnnotation('Rotated PDF annotation comment');
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

  annotationsTest('collates distinct text-selection and draw-box comments after rehydration', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    const textComment = 'Text-selection annotation comment';
    const drawBoxComment = 'Draw-box annotation comment';
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);

    await mediaViewer.annotations.openTextHighlight();
    await mediaViewer.annotations.selectExampleFixtureText();
    const textAnnotationRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.createButton.click();
    await textAnnotationRequest;
    await mediaViewer.comments.addToSelectedAnnotation(textComment);
    await mediaViewer.reloadDocument(mediaAssets.pdf);

    const drawBoxRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.pdfPage(1));
    await drawBoxRequest;
    await mediaViewer.comments.addToSelectedAnnotation(drawBoxComment);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment(textComment)).toBeVisible();
    await expect(mediaViewer.comments.comment(drawBoxComment)).toBeVisible();
    await mediaViewer.comments.openSummary();
    await expect(mediaViewer.comments.summaryDialog).toContainText(textComment);
    await expect(mediaViewer.comments.summaryDialog).toContainText(drawBoxComment);
  });

  annotationsTest('highlights PDF search results and persists the created annotation set', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await mediaViewer.annotations.openSearch();
    await mediaViewer.annotations.searchInput.fill('Trace-based');
    await mediaViewer.annotations.searchButton.click();
    await expect(mediaViewer.annotations.resultCount).toContainText(/results founds/);
    const searchResultText = await mediaViewer.annotations.resultCount.textContent();
    const searchResultCount = Number(searchResultText?.match(/(\d+)\s+results founds/)?.[1]);
    expect(searchResultCount).toBeGreaterThan(0);

    const saveRequest = page.waitForRequest((request) => request.url().endsWith('/em-anno/annotation-sets') && request.method() === 'POST');
    await mediaViewer.annotations.highlightAllButton.click();
    const savedAnnotationSet = (await saveRequest).postDataJSON();

    expect(savedAnnotationSet).toMatchObject({ id: 'pw-empty-annotations-annotation-set', documentId: mediaAssets.pdf.url });
    expect(savedAnnotationSet.annotations).not.toHaveLength(0);
    expect(savedAnnotationSet.annotations).toHaveLength(searchResultCount);
    expect(savedAnnotationSet.annotations[0]).toMatchObject({ page: expect.any(Number), type: 'highlight' });
    expect(savedAnnotationSet.annotations[0].rectangles[0].width).toBeGreaterThan(0);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(savedAnnotationSet.annotations.length);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(savedAnnotationSet.annotations.length);
  });

});
