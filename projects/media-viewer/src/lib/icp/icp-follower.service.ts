import { Injectable } from '@angular/core';
import { ToolbarEventService } from '../toolbar/toolbar-event.service';
import { select, Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { IcpUpdateService } from './icp-update.service';
import { ViewerEventService } from '../viewers/viewer-event.service';
import { take } from 'rxjs/operators';
import { IcpState, IcpSession, IcpScreenUpdate } from './icp.interfaces';
import * as fromDocSelectors from '../store/selectors/document.selectors';

@Injectable({ providedIn: 'root' })
export class IcpFollowerService {

  session: IcpSession;
  private previousRotation: number|null = null;
  private previousDocument: string|null = null;
  $subscription: Subscription;

  constructor(private readonly toolbarEvents: ToolbarEventService,
    private readonly viewerEvents: ViewerEventService,
    private readonly socketService: IcpUpdateService,
    private store: Store<IcpState>) { }


  update(isFollower: boolean) {
    if (isFollower) {
      this.subscribe();
    } else {
      this.unsubscribe();
    }
  }

  subscribe() {
    if (!this.$subscription) {
      this.$subscription = this.socketService.screenUpdated()
        .subscribe(screen => this.followScreenUpdate(screen));
    }
  }

  unsubscribe() {
    if (this.$subscription) {
      this.$subscription.unsubscribe();
      this.$subscription = undefined;
    }
    this.previousRotation = null;
    this.previousDocument = null;
  }

  followScreenUpdate(screenUpdate: Partial<IcpScreenUpdate> | null | undefined): void {
    const pdfPosition = screenUpdate?.pdfPosition;
    if (!pdfPosition ||
      !Number.isInteger(pdfPosition.pageNumber) ||
      pdfPosition.pageNumber < 1 ||
      !Number.isFinite(pdfPosition.left) ||
      !Number.isFinite(pdfPosition.top) ||
      (pdfPosition.scale !== undefined && !Number.isFinite(pdfPosition.scale)) ||
      (pdfPosition.rotation !== undefined && !Number.isFinite(pdfPosition.rotation))) {
      return;
    }

    this.store.pipe(
      select(fromDocSelectors.getDocumentId),
      take(1))
      .subscribe(documentId => {
        const currentDocument = documentId ?? null;
        if (screenUpdate.document && currentDocument && screenUpdate.document !== currentDocument) {
          return;
        }
        if (this.previousDocument !== currentDocument) {
          this.previousDocument = currentDocument;
          this.previousRotation = null;
        }
        this.applyScreenUpdate(pdfPosition);
      });
  }

  private applyScreenUpdate(pdfPosition: IcpScreenUpdate['pdfPosition']): void {
    this.viewerEvents.goToDestinationICP([
      pdfPosition.pageNumber - 1,
      { 'name': 'XYZ' },
      pdfPosition.left,
      pdfPosition.top
    ]);
    if (typeof pdfPosition.scale === 'number') {
      this.toolbarEvents.zoom(pdfPosition.scale);
    }
    if (typeof pdfPosition.rotation !== 'number') {
      return;
    }

    const applyRotation = (baseline: number) => {
      if (this.previousRotation === pdfPosition.rotation) {
        return;
      }
      const rotationDelta = (pdfPosition.rotation - baseline) % 360;
      if (rotationDelta) {
        this.toolbarEvents.rotate(rotationDelta);
      }
      this.previousRotation = pdfPosition.rotation;
    };

    if (this.previousRotation !== null) {
      applyRotation(this.previousRotation);
      return;
    }

    this.store.pipe(
      select(fromDocSelectors.getPdfPosition),
      take(1))
      .subscribe(position => applyRotation(position?.rotation ?? 0));
  }
}
