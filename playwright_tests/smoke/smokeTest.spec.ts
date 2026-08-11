import { expect, test } from '../fixtures/mediaViewerTest';

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
    await expect(mediaViewer.loadState.firstPdfPage).toHaveAttribute('data-loaded', 'true');
    await expect(mediaViewer.loadState.pdfCanvas(1)).toBeVisible();
    await expect(mediaViewer.loadState.pdfCanvas(1)).toHaveAttribute('width', /^[1-9]\d*$/);
    await expect(mediaViewer.loadState.pdfCanvas(1)).toHaveAttribute('height', /^[1-9]\d*$/);
  }
);
