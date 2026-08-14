import { Injectable } from '@angular/core';
import { ToolbarEventService } from '../toolbar/toolbar-event.service';
import { select, Store } from '@ngrx/store';
import { merge, Subject, Subscription } from 'rxjs';
import { IcpUpdateService } from './icp-update.service';
import { ViewerEventService } from '../viewers/viewer-event.service';
import { filter, take, takeUntil } from 'rxjs/operators';
import { IcpScreenUpdate, IcpState, IcpSession } from './icp.interfaces';
import * as fromDocSelectors from '../store/selectors/document.selectors';
import { PdfPosition } from '../store/reducers/reducers';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPositiveFiniteNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value > 0;

const isPositiveInteger = (value: unknown): value is number =>
  isPositiveFiniteNumber(value) && Number.isInteger(value);

const isValidPdfPosition = (position: Partial<PdfPosition> | undefined): position is PdfPosition =>
  !!position &&
  isPositiveInteger(position.pageNumber) &&
  isPositiveFiniteNumber(position.scale) &&
  isFiniteNumber(position.top) &&
  isFiniteNumber(position.left) &&
  isFiniteNumber(position.rotation);

@Injectable({ providedIn: 'root' })
export class IcpFollowerService {

  session: IcpSession;
  private previousRotation: number|null = null;
  $subscription: Subscription;
  private readonly stopFollowing$ = new Subject<void>();
  private readonly supersedeScreenUpdate$ = new Subject<void>();

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
    this.stopFollowing$.next();

    if (this.$subscription) {
      this.$subscription.unsubscribe();
      this.$subscription = undefined;
    }
    this.previousRotation = null;
  }

  followScreenUpdate({ pdfPosition }: Partial<IcpScreenUpdate> = {}) {
    if (!isValidPdfPosition(pdfPosition)) {
      return;
    }

    // Local PDF state can arrive after several socket messages. Only the newest
    // valid screen update may synchronise toolbar state once it is available.
    this.supersedeScreenUpdate$.next();
    this.viewerEvents.goToDestinationICP([
      pdfPosition.pageNumber - 1,
      { 'name': 'XYZ' },
      pdfPosition.left,
      pdfPosition.top
    ]);

    this.store.pipe(
      select(fromDocSelectors.getPdfPosition),
      filter((position): position is PdfPosition => !!position),
      takeUntil(merge(this.stopFollowing$, this.supersedeScreenUpdate$)),
      take(1))
      .subscribe(position => {
        if (pdfPosition.scale !== position.scale) {
          this.toolbarEvents.zoom(pdfPosition.scale);
        }
        if (this.previousRotation === pdfPosition.rotation) {
          return;
        }
        const rotationDelta = (pdfPosition.rotation - position.rotation) % 360;
        if (rotationDelta && rotationDelta !== 0) {
          this.toolbarEvents.rotate(rotationDelta);
        }
        this.previousRotation = pdfPosition.rotation;
      });
  }
}
