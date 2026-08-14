import { test as base } from '@playwright/test';
import { MediaViewerPage } from '../pages/mediaViewerPage';
import { cloneCommentCreationAnnotationSet, cloneCommentsAnnotationSet, cloneEmptyAnnotationsAnnotationSet, cloneReplacementCommentsAnnotationSet, cloneTwoPageCommentsAnnotationSet } from './mediaViewerComments';
import { mediaAssets } from './mediaAssets';
export { mediaAssets } from './mediaAssets';

export const test = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses();
    await mediaViewer.stubRotationResponses();
    await use(mediaViewer);
  },
});

export const savedRotationTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses();
    await mediaViewer.stubRotationResponses({ [mediaAssets.pdf.url]: 90 });
    await use(mediaViewer);
  },
});

export const commentsTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses([cloneCommentsAnnotationSet()]);
    await mediaViewer.stubRotationResponses();
    await use(mediaViewer);
  },
});

export const commentCreationTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses([cloneCommentCreationAnnotationSet()]);
    await mediaViewer.stubRotationResponses();
    await use(mediaViewer);
  },
});

export const multiDocumentCommentsTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses([cloneCommentsAnnotationSet(), cloneReplacementCommentsAnnotationSet()]);
    await mediaViewer.stubRotationResponses();
    await use(mediaViewer);
  },
});

export const twoPageCommentsTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses([cloneTwoPageCommentsAnnotationSet()]);
    await mediaViewer.stubRotationResponses();
    await use(mediaViewer);
  },
});

export const annotationsTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses([cloneEmptyAnnotationsAnnotationSet()]);
    await mediaViewer.stubRotationResponses();
    await use(mediaViewer);
  },
});

export const redactionsTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses();
    await mediaViewer.stubRotationResponses();
    await mediaViewer.stubRedactionResponses();
    await use(mediaViewer);
  },
});

export { expect } from '@playwright/test';
