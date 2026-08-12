import { test as base } from '@playwright/test';
import { MediaViewerPage } from '../pages/mediaViewerPage';
import { cloneCommentCreationAnnotationSet, cloneCommentsAnnotationSet } from './mediaViewerComments';
export { mediaAssets } from './mediaAssets';

export const test = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses();
    await use(mediaViewer);
  },
});

export const commentsTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses(cloneCommentsAnnotationSet());
    await use(mediaViewer);
  },
});

export const commentCreationTest = base.extend<{ mediaViewer: MediaViewerPage }>({
  mediaViewer: async ({ page }, use) => {
    const mediaViewer = new MediaViewerPage(page);
    await mediaViewer.stubAnnotationResponses(cloneCommentCreationAnnotationSet());
    await use(mediaViewer);
  },
});

export { expect } from '@playwright/test';
