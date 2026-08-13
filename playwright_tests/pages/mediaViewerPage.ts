import type { Page } from '@playwright/test';
import { DocumentLoadState } from '../components/documentLoadState';
import { MediaViewerSidePanels } from '../components/mediaViewerSidePanels';
import { CommentsPanel } from '../components/commentsPanel';
import { MediaViewerToolbar } from '../components/mediaViewerToolbar';
import { PageNavigation } from '../components/pageNavigation';
import { RotationControls } from '../components/rotationControls';
import { SearchControls } from '../components/searchControls';
import { ZoomControls } from '../components/zoomControls';
import { Bookmarks } from '../components/bookmarks';
import type { AnnotationFixture, AnnotationSetFixture } from '../fixtures/mediaViewerComments';
import type { MediaAsset } from '../fixtures/mediaAssets';

export class MediaViewerPage {
  readonly loadState: DocumentLoadState;
  readonly toolbar: MediaViewerToolbar;
  readonly navigation: PageNavigation;
  readonly zoom: ZoomControls;
  readonly rotation: RotationControls;
  readonly search: SearchControls;
  readonly sidePanels: MediaViewerSidePanels;
  readonly comments: CommentsPanel;
  readonly bookmarks: Bookmarks;

  constructor(private readonly page: Page) {
    this.loadState = new DocumentLoadState(page);
    this.toolbar = new MediaViewerToolbar(page);
    this.navigation = new PageNavigation(page);
    this.zoom = new ZoomControls(page);
    this.rotation = new RotationControls(page);
    this.search = new SearchControls(page);
    this.sidePanels = new MediaViewerSidePanels(page);
    this.comments = new CommentsPanel(page);
    this.bookmarks = new Bookmarks(page);
  }

  async stubAnnotationResponses(annotationSets?: AnnotationSetFixture[]): Promise<void> {
    const annotationSetsByDocumentId = new Map(
      annotationSets?.map((annotationSet) => [annotationSet.documentId, annotationSet])
    );
    await this.page.route('**/em-anno/annotation-sets/filter**', async (route) => {
      const requestedDocumentId = new URL(route.request().url()).searchParams.get('documentId');
      if (!annotationSets) {
        await route.fulfill({
          status: 200,
          json: { id: 'annotation-set-fixture', documentId: requestedDocumentId, annotations: [] },
        });
        return;
      }
      const currentAnnotationSet = requestedDocumentId && annotationSetsByDocumentId.get(requestedDocumentId);
      if (!currentAnnotationSet) {
        await route.fulfill({ status: 404, json: { message: `Unexpected annotation document: ${requestedDocumentId}` } });
        return;
      }
      await route.fulfill({ status: 200, json: currentAnnotationSet });
    });
    await this.page.route('**/em-anno/annotation-sets', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const annotationSet = await route.request().postDataJSON() as AnnotationSetFixture;
      annotationSetsByDocumentId.set(annotationSet.documentId, annotationSet);
      await route.fulfill({ status: 200, json: annotationSet });
    });
    await this.page.route('**/em-anno/annotations', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const updatedAnnotation = await route.request().postDataJSON() as AnnotationFixture;
      const persistedAnnotation = {
        ...updatedAnnotation,
        comments: (updatedAnnotation.comments as Array<Record<string, unknown>>).map((comment) => ({
          ...comment,
          editable: false,
          selected: false,
        })),
      };
      const currentAnnotationSet = [...annotationSetsByDocumentId.values()].find((annotationSet) =>
        annotationSet.annotations.some((annotation) => annotation.id === updatedAnnotation.id)
      );
      if (currentAnnotationSet) {
        currentAnnotationSet.annotations = currentAnnotationSet.annotations.map((annotation: { id: string }) =>
          annotation.id === updatedAnnotation.id ? persistedAnnotation : annotation
        );
      }
      await route.fulfill({ status: 200, json: persistedAnnotation });
    });
    await this.page.route('**/api/markups/**', async (route) => route.fulfill({ json: [] }));
    await this.page.route('**/em-anno/metadata/**', async (route) => route.fulfill({ json: {} }));
  }

  async goto(): Promise<void> {
    const response = await this.page.goto('/#/media-viewer', { waitUntil: 'domcontentloaded' });
    const isViewerRoute = new URL(this.page.url()).hash === '#/media-viewer';
    const responseFailed = response !== null && !response.ok() && response.status() !== 304;
    if (!isViewerRoute || responseFailed) {
      throw new Error(`Media viewer route failed: ${response?.status() ?? 'no response'} ${this.page.url()}`);
    }
  }

  async reload(): Promise<void> {
    const response = await this.page.reload({ waitUntil: 'domcontentloaded' });
    const isViewerRoute = new URL(this.page.url()).hash === '#/media-viewer';
    const responseFailed = response !== null && !response.ok() && response.status() !== 304;
    if (!isViewerRoute || responseFailed) {
      throw new Error(`Media viewer reload failed: ${response?.status() ?? 'no response'} ${this.page.url()}`);
    }
  }

  resolveDocumentUrl(documentUrl: string): string {
    return new URL(documentUrl, this.page.url()).href;
  }

  async loadDocument(documentUrl: string, caseId: string, contentType = 'pdf'): Promise<void> {
    const expectedDocumentUrl = this.resolveDocumentUrl(documentUrl);
    const [previousFirstPage] = await this.loadState.firstPdfPage.elementHandles();
    const documentUrlInput = this.page.getByLabel('document url');

    if (!(await documentUrlInput.isVisible())) {
      await this.page.getByText('Change document details').click();
    }
    await documentUrlInput.fill(documentUrl);
    await this.page.getByLabel('document type').fill(contentType);
    await this.page.getByLabel('case id').fill(caseId);

    const documentResponse = this.page.waitForResponse((response) => response.url() === expectedDocumentUrl).catch((error) => {
      const cause = error instanceof Error ? error.message : String(error);
      throw new Error(`Document request was not observed: ${expectedDocumentUrl} (${cause})`);
    });
    await this.page.getByRole('button', { name: 'Load document' }).click();
    const response = await documentResponse;
    if (!response.ok() && response.status() !== 304) {
      throw new Error(`Document request failed: ${response.status()} ${expectedDocumentUrl}`);
    }
    if (previousFirstPage) {
      await this.page.waitForFunction((element) => !element.isConnected, previousFirstPage);
    }
  }

  async openDocument(asset: MediaAsset, caseId = 'standalone-media-viewer-fixture'): Promise<void> {
    await this.goto();
    await this.loadDocument(asset.url, caseId, asset.contentType);
  }

  async reloadDocument(asset: MediaAsset, caseId = 'standalone-media-viewer-fixture'): Promise<void> {
    await this.reload();
    await this.loadDocument(asset.url, caseId, asset.contentType);
  }

  async openAnnotatedDocument(asset: MediaAsset, caseId = 'standalone-media-viewer-fixture'): Promise<void> {
    await this.goto();
    await this.enableAnnotations();
    await this.loadDocument(asset.url, caseId, asset.contentType);
  }

  async enableAnnotations(): Promise<void> {
    const annotationCheckbox = this.page.locator('#toggleAnnotations');
    const annotationToggle = this.page.locator('label[for="toggleAnnotations"]');
    await annotationCheckbox.waitFor({ state: 'attached' });
    if (!(await annotationCheckbox.isChecked())) {
      await annotationToggle.click();
    }
    if (!(await annotationCheckbox.isChecked())) {
      throw new Error('Annotation toggle did not enable annotations');
    }
  }
}
