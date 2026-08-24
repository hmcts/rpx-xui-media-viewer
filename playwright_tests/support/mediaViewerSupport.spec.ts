import { commentsTest, expect, mediaAssets, test } from '../fixtures/mediaViewerTest';
import { commentsAnnotationSet } from '../fixtures/mediaViewerComments';

test.describe('media viewer Playwright support layer', () => {
  test('returns an empty annotation set for the requested default document', async ({ mediaViewer, page }) => {
    const annotationResponse = page.waitForResponse((response) =>
      response.url().includes('/em-anno/annotation-sets/filter') &&
      new URL(response.url()).searchParams.get('documentId') === mediaAssets.pdf.url
    );

    await mediaViewer.openDocument(mediaAssets.pdf);

    const response = await annotationResponse;
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      id: 'annotation-set-fixture',
      documentId: mediaAssets.pdf.url,
      annotations: [],
    });
  });

  test('loads the PDF fixture and exposes focused viewer controls', async ({ mediaViewer, page }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.loadState.pdfViewer).toBeVisible();
    await expect(mediaViewer.loadState.firstPdfPage).toBeVisible();
    await expect(mediaViewer.toolbar.root).toBeVisible();
    await expect(mediaViewer.toolbar.moreOptionsButton).toBeVisible();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('1');
    await expect(mediaViewer.zoom.zoomInButton).toBeVisible();
    await expect(mediaViewer.rotation.clockwiseButton).toBeVisible();
    await expect(mediaViewer.search.openButton).toBeVisible();
    await expect(mediaViewer.sidePanels.indexButton).toBeVisible();
    await expect(mediaViewer.sidePanels.bookmarksButton).toBeVisible();

    await mediaViewer.goto();
    await expect(page).toHaveURL(/\/#\/media-viewer$/);
  });

  test('loads a fixture when no previous PDF page has rendered', async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);
    await expect(mediaViewer.loadState.firstPdfPage).toHaveCount(0);

    await mediaViewer.loadDocument(
      mediaAssets.unsupported.url,
      'standalone-media-viewer-no-previous-page',
      mediaAssets.unsupported.contentType
    );

    await expect(mediaViewer.loadState.firstPdfPage).toHaveCount(0);
    await expect(mediaViewer.loadState.unsupportedViewer).toBeVisible();
  });

  test('reports a failed viewer route with its response status', async ({ mediaViewer, page }) => {
    await page.route('**/*', async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.fulfill({ status: 503, contentType: 'text/html', body: 'Service unavailable' });
        return;
      }
      await route.continue();
    });

    await expect(mediaViewer.goto()).rejects.toThrow('Media viewer route failed: 503');
  });

  test('reports a failed document request with its asset URL', async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await page.route('**/assets/missing.pdf', async (route) => route.fulfill({ status: 404 }));

    await expect(
      mediaViewer.loadDocument('assets/missing.pdf', 'missing-asset')
    ).rejects.toThrow('Document request failed: 404');
  });

  test('accepts a cache-revalidated document response', async ({ mediaViewer, page }) => {
    await mediaViewer.goto();
    await page.route('**/assets/cached.pdf', async (route) => route.fulfill({ status: 304 }));

    await expect(mediaViewer.loadDocument('assets/cached.pdf', 'cached-asset')).resolves.toBeUndefined();
  });
});

commentsTest('rejects an annotation update that claims the wrong owning set', async ({ mediaViewer, page }) => {
  await mediaViewer.openDocument(mediaAssets.pdf);
  const update = {
    ...commentsAnnotationSet.annotations[0],
    annotationSetId: 'wrong-annotation-set',
  };

  const contract = await page.evaluate(async ({ annotation, documentId }) => {
    const updateResponse = await fetch('/em-anno/annotations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(annotation),
    });
    const persistedResponse = await fetch(`/em-anno/annotation-sets/filter?documentId=${encodeURIComponent(documentId)}`);
    return {
      updateStatus: updateResponse.status,
      persistedSet: await persistedResponse.json(),
    };
  }, { annotation: update, documentId: mediaAssets.pdf.url });

  expect(contract.updateStatus).toBe(404);
  expect(contract.persistedSet.annotations[0].annotationSetId).toBe(commentsAnnotationSet.id);
});
