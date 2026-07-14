import { expect, test } from '@playwright/test';
import { MediaViewerPage } from '../pages/mediaViewerPage';

test(
  'loads a PDF document in the standalone media viewer',
  { tag: ['@e2e-smoke'] },
  async ({ page }) => {
    const documentUrl = process.env.MV_SMOKE_PDF_DOCUMENT_URL ?? 'assets/example.pdf';
    const caseId = process.env.MV_SMOKE_CASE_ID ?? 'standalone-media-viewer-smoke';
    const mediaViewerPage = new MediaViewerPage(page);

    await mediaViewerPage.stubAnnotationResponses();
    await mediaViewerPage.goto();
    await mediaViewerPage.loadDocument(documentUrl, caseId);

    await expect(mediaViewerPage.loadState.pdfViewer).toBeVisible();
    await expect(mediaViewerPage.navigation.pageNumberInput).toBeVisible();
    await expect(mediaViewerPage.loadState.firstPdfPage).toBeVisible();
  }
);
