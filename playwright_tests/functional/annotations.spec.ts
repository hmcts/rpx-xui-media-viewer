import { annotationsTest, commentsTest as deletionTest, expect, imageAnnotationsTest, mediaAssets } from '../fixtures/mediaViewerTest';

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
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.drawSurface(1));
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

  annotationsTest('draws a PDF highlight on the requested page', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await mediaViewer.navigation.goToPage(2);
    const secondPage = mediaViewer.loadState.pdfPage(2);
    await expect(secondPage).toHaveAttribute('data-loaded', 'true');

    const saveRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.drawSurface(2));
    const savedAnnotation = (await saveRequest).postDataJSON();

    expect(savedAnnotation.page).toBe(2);
  });

  annotationsTest('keeps independently drawn highlight geometry distinct after reload', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    const firstPage = mediaViewer.loadState.pdfPage(1);
    await expect(firstPage).toHaveAttribute('data-loaded', 'true');

    const firstSave = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.drawSurface(1), { x: 80, y: 80 });
    const firstAnnotation = (await firstSave).postDataJSON();

    const secondSave = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.drawSurface(1), { x: 250, y: 200 });
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
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.drawSurface(1));
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

  annotationsTest('deletes a comment from a drawn PDF annotation and preserves the annotation', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    const comment = 'Non-text annotation comment to delete';
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.pdfPage(1));
    await mediaViewer.comments.addToSelectedAnnotation(comment);
    await expect(mediaViewer.comments.comment(comment)).toBeVisible();

    const deleteRequest = page.waitForRequest(request => annotationRequest(request.url()) && request.method() === 'POST');
    const deleteResponse = page.waitForResponse(response => annotationRequest(response.url()) && response.request().method() === 'POST');
    await mediaViewer.comments.remove(comment);
    const requestBody = (await deleteRequest).postDataJSON();
    const response = await deleteResponse;
    expect(await response.json()).toMatchObject({ id: requestBody.id, comments: [] });
    expect(response.status()).toBe(200);
    expect(requestBody.comments).toEqual([]);
    await expect(mediaViewer.comments.comment(comment)).toHaveCount(0);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);

    await mediaViewer.reloadDocument(mediaAssets.pdf);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(1);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment(comment)).toHaveCount(0);
  });

  annotationsTest('keeps multiple non-text PDF comments distinct in the comments panel', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer }) => {
    const firstComment = 'First non-text annotation comment';
    const secondComment = 'Second non-text annotation comment';
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.pdfPage(1), { x: 80, y: 80 });
    await mediaViewer.comments.addToSelectedAnnotation(firstComment);
    await expect(mediaViewer.comments.comment(firstComment)).toBeVisible();
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.pdfPage(1), { x: 250, y: 200 });
    await mediaViewer.comments.addToSelectedAnnotation(secondComment);

    await expect(mediaViewer.comments.comment(firstComment)).toBeVisible();
    await expect(mediaViewer.comments.comment(secondComment)).toBeVisible();
    await expect(mediaViewer.comments.commentCards).toHaveCount(2);
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

  deletionTest('deletes every existing PDF highlight through the annotation API', { tag: ['@e2e-functional', '@feature-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.pdf);
    await expect(mediaViewer.annotations.rectangles).toHaveCount(2);

    for (const remaining of [1, 0]) {
      const deleteRequest = page.waitForRequest((request) =>
        request.method() === 'DELETE' && new URL(request.url()).pathname.startsWith('/em-anno/annotations/')
      );
      await mediaViewer.annotations.renderedRectangles.first().click();
      await mediaViewer.annotations.deleteSelected();
      await deleteRequest;
      await expect(mediaViewer.annotations.rectangles).toHaveCount(remaining);
    }
  });

});

const imageAnnotationDefectTag = '@defect-EXUI-5124';
const existingImageComment = 'Existing image annotation comment';

imageAnnotationsTest.describe('Image annotations and comments', () => {
  imageAnnotationsTest('creates a non-text image highlight and comment through the rendered Media Viewer', { tag: ['@e2e-functional', '@feature-image-annotations', imageAnnotationDefectTag] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.image);
    await expect(mediaViewer.loadState.image).toBeVisible();
    const saveRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.imageDrawSurface);
    const savedAnnotation = (await saveRequest).postDataJSON();
    expect(savedAnnotation).toMatchObject({
      annotationSetId: 'pw-image-annotations-annotation-set',
      documentId: mediaAssets.image.url,
      page: 1,
      type: 'highlight',
    });
    expect(savedAnnotation.rectangles[0].width).toBeGreaterThan(0);
    expect(savedAnnotation.rectangles[0].height).toBeGreaterThan(0);
    await expect(mediaViewer.annotations.renderedRectangles).toHaveCount(2);
    const annotationSetResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/em-anno/annotation-sets/filter') &&
        url.searchParams.get('documentId') === mediaAssets.image.url &&
        response.request().method() === 'GET';
    });
    await mediaViewer.reloadDocument(mediaAssets.image);
    const rehydratedAnnotationSet = await (await annotationSetResponse).json();
    const rehydratedAnnotation = rehydratedAnnotationSet.annotations.find((annotation: { id: string }) => annotation.id === savedAnnotation.id);
    expect(rehydratedAnnotation).toMatchObject({
      id: savedAnnotation.id,
      rectangles: [expect.objectContaining({
        x: savedAnnotation.rectangles[0].x,
        y: savedAnnotation.rectangles[0].y,
        width: savedAnnotation.rectangles[0].width,
        height: savedAnnotation.rectangles[0].height,
      })],
    });
    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.annotations.renderedRectangles).toHaveCount(2);
    await mediaViewer.annotations.renderedRectangles.last().click();
    await mediaViewer.sidePanels.openComments();
    await mediaViewer.comments.addToSelectedAnnotation('Created image annotation comment');
    await expect(mediaViewer.comments.comment('Created image annotation comment')).toBeVisible();
  });

  imageAnnotationsTest('creates a draw-box image highlight with a positive rectangle contract', { tag: ['@e2e-functional', '@feature-image-annotations', imageAnnotationDefectTag] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.image);
    await expect(mediaViewer.loadState.image).toBeVisible();
    const saveRequest = page.waitForRequest((request) => annotationRequest(request.url()) && request.method() === 'POST');
    await mediaViewer.annotations.drawOnPage(mediaViewer.loadState.imageDrawSurface);
    const savedAnnotation = (await saveRequest).postDataJSON();
    expect(savedAnnotation.rectangles[0].width).toBeGreaterThan(0);
    expect(savedAnnotation.rectangles[0].height).toBeGreaterThan(0);
    await expect(mediaViewer.annotations.renderedRectangles).toHaveCount(2);
    const annotationSetResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/em-anno/annotation-sets/filter') &&
        url.searchParams.get('documentId') === mediaAssets.image.url &&
        response.request().method() === 'GET';
    });
    await mediaViewer.reloadDocument(mediaAssets.image);
    const rehydratedAnnotationSet = await (await annotationSetResponse).json();
    expect(rehydratedAnnotationSet.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: savedAnnotation.id,
        rectangles: [expect.objectContaining(savedAnnotation.rectangles[0])],
      }),
    ]));
    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.annotations.renderedRectangles).toHaveCount(2);
    const rectangle = mediaViewer.annotations.renderedRectangles.last();
    await expect(rectangle).toBeVisible();
    const renderedGeometry = await rectangle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        left: parseFloat(style.left),
        top: parseFloat(style.top),
        width: parseFloat(style.width),
        height: parseFloat(style.height),
      };
    });
    const expectedGeometry = savedAnnotation.rectangles[0];
    expect(renderedGeometry.left).toBeCloseTo(expectedGeometry.x, 1);
    expect(renderedGeometry.top).toBeCloseTo(expectedGeometry.y, 1);
    expect(renderedGeometry.width).toBeCloseTo(expectedGeometry.width, 1);
    expect(renderedGeometry.height).toBeCloseTo(expectedGeometry.height, 1);
  });

  imageAnnotationsTest('updates a persisted non-text image comment', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ mediaViewer, page }) => {
    const updatedComment = 'Updated image annotation comment';
    await mediaViewer.openAnnotatedDocument(mediaAssets.image);
    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.annotations.renderedRectangles.first()).toBeVisible();
    await mediaViewer.annotations.renderedRectangles.first().click();
    await mediaViewer.sidePanels.openComments();

    const updateRequest = page.waitForRequest(request => annotationRequest(request.url()) && request.method() === 'POST');
    const updateResponse = page.waitForResponse(response => annotationRequest(response.url()) && response.request().method() === 'POST');
    await mediaViewer.comments.edit(existingImageComment, updatedComment);
    const requestBody = (await updateRequest).postDataJSON();
    expect((await updateResponse).status()).toBe(200);
    expect(requestBody).toMatchObject({
      id: 'pw-image-annotation',
      comments: [expect.objectContaining({ content: updatedComment })],
    });
    await expect(mediaViewer.comments.comment(updatedComment)).toBeVisible();

    await mediaViewer.reloadDocument(mediaAssets.image);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment(updatedComment)).toBeVisible();
    await expect(mediaViewer.comments.comment(existingImageComment)).toHaveCount(0);
  });

  imageAnnotationsTest('deletes a persisted non-text image comment', { tag: ['@e2e-functional', '@feature-image-annotations'] }, async ({ mediaViewer, page }) => {
    await mediaViewer.openAnnotatedDocument(mediaAssets.image);
    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.annotations.renderedRectangles.first()).toBeVisible();
    await mediaViewer.annotations.renderedRectangles.first().click();
    await mediaViewer.sidePanels.openComments();
    const deleteRequest = page.waitForRequest(request => annotationRequest(request.url()) && request.method() === 'POST');
    const deleteResponse = page.waitForResponse(response => annotationRequest(response.url()) && response.request().method() === 'POST');
    await mediaViewer.comments.remove(existingImageComment);
    const requestBody = (await deleteRequest).postDataJSON();
    expect((await deleteResponse).status()).toBe(200);
    expect(requestBody).toMatchObject({
      id: 'pw-image-annotation',
      comments: [],
    });
    await expect(mediaViewer.comments.comment(existingImageComment)).toHaveCount(0);

    await mediaViewer.reloadDocument(mediaAssets.image);
    await mediaViewer.sidePanels.openComments();
    await expect(mediaViewer.comments.comment(existingImageComment)).toHaveCount(0);
  });
});
