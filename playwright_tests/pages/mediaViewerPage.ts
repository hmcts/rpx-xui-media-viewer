import type { Page } from '@playwright/test';
import { DocumentLoadState } from '../components/documentLoadState';
import { MediaViewerSidePanels } from '../components/mediaViewerSidePanels';
import { MediaViewerToolbar } from '../components/mediaViewerToolbar';
import { PageNavigation } from '../components/pageNavigation';
import { RotationControls } from '../components/rotationControls';
import { SearchControls } from '../components/searchControls';
import { ZoomControls } from '../components/zoomControls';
import type { MediaAsset } from '../fixtures/mediaAssets';

export class MediaViewerPage {
  readonly loadState: DocumentLoadState;
  readonly toolbar: MediaViewerToolbar;
  readonly navigation: PageNavigation;
  readonly zoom: ZoomControls;
  readonly rotation: RotationControls;
  readonly search: SearchControls;
  readonly sidePanels: MediaViewerSidePanels;

  constructor(private readonly page: Page) {
    this.loadState = new DocumentLoadState(page);
    this.toolbar = new MediaViewerToolbar(page);
    this.navigation = new PageNavigation(page);
    this.zoom = new ZoomControls(page);
    this.rotation = new RotationControls(page);
    this.search = new SearchControls(page);
    this.sidePanels = new MediaViewerSidePanels(page);
  }

  async stubAnnotationResponses(): Promise<void> {
    await this.page.route('**/em-anno/annotation-sets/filter**', async (route) => route.fulfill({ json: [] }));
    await this.page.route('**/api/markups/**', async (route) => route.fulfill({ json: [] }));
    await this.page.route('**/em-anno/**/bookmarks', async (route) => route.fulfill({ json: [] }));
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

  async loadDocument(documentUrl: string, caseId: string, contentType = 'pdf'): Promise<void> {
    await this.page.getByText('Change document details').click();
    await this.page.getByLabel('document url').fill(documentUrl);
    await this.page.getByLabel('document type').fill(contentType);
    await this.page.getByLabel('case id').fill(caseId);

    await this.page.getByRole('button', { name: 'Load document' }).click();
  }

  async openDocument(asset: MediaAsset, caseId = 'standalone-media-viewer-fixture'): Promise<void> {
    await this.goto();
    await this.loadDocument(asset.url, caseId, asset.contentType);
  }
}
