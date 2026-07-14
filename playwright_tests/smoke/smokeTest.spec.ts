import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test(
  'loads a PDF document in the standalone media viewer',
  { tag: ['@e2e-smoke'] },
  async ({ mediaViewer }) => {
    const documentUrl = process.env.MV_SMOKE_PDF_DOCUMENT_URL ?? 'assets/example.pdf';
    const caseId = process.env.MV_SMOKE_CASE_ID ?? 'standalone-media-viewer-smoke';

    await mediaViewer.goto();
    await mediaViewer.loadDocument(documentUrl, caseId);

    await expect(mediaViewer.loadState.pdfViewer).toBeVisible();
    await expect(mediaViewer.navigation.pageNumberInput).toBeVisible();
    await expect(mediaViewer.loadState.firstPdfPage).toBeVisible();
  }
);

test(
  'zooms a PDF document in and out',
  { tag: ['@e2e-smoke'] },
  async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.loadState.pdfPage(1)).toBeVisible();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');

    await mediaViewer.zoom.zoomIn();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1.1');

    await mediaViewer.zoom.zoomOut();
    await expect(mediaViewer.zoom.zoomSelect).toHaveValue('1');
  }
);

test(
  'navigates between PDF pages',
  { tag: ['@e2e-smoke'] },
  async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('1');
    await expect(mediaViewer.loadState.pdfPage(1)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.navigation.goToNextPage();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('2');
    await expect(mediaViewer.loadState.pdfPage(2)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.navigation.goToPage(3);
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('3');
    await expect(mediaViewer.loadState.pdfPage(3)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(3)).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.navigation.goToPreviousPage();
    await expect(mediaViewer.navigation.pageNumberInput).toHaveValue('2');
    await expect(mediaViewer.loadState.pdfPage(2)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(2)).toHaveAttribute('data-loaded', 'true');
  }
);

test(
  'rotates an image clockwise and back',
  { tag: ['@e2e-smoke'] },
  async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.image);

    await expect(mediaViewer.loadState.image).toBeVisible();
    await expect(mediaViewer.loadState.image).toHaveClass('rot0');

    await mediaViewer.rotation.clockwise();
    await expect(mediaViewer.loadState.image).toHaveClass('rot90');

    await mediaViewer.rotation.counterclockwise();
    await expect(mediaViewer.loadState.image).toHaveClass('rot0');
  }
);

test(
  'finds a term in a PDF document',
  { tag: ['@e2e-smoke'] },
  async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.loadState.pdfPage(1)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.search.searchFor('Based');
    await expect(mediaViewer.search.results).toHaveText('Found 1 of 24');
  }
);
