import { fakeAsync, inject, TestBed } from '@angular/core/testing';
import { Store, StoreModule } from '@ngrx/store';
import { PdfPosition, reducers } from '../store/reducers/reducers';
import { IcpUpdateService } from './icp-update.service';
import { IcpFollowerService } from './icp-follower.service';
import { ViewerEventService } from '../viewers/viewer-event.service';
import { ToolbarEventService } from '../toolbar/toolbar-event.service';
import { PdfPositionUpdate, SetDocumentId } from '../store/actions/document.actions';

describe('Icp Follower Service', () => {

  let followerService: IcpFollowerService;
  const mockUpdateService = {
    newParticipantJoined: () => { },
    updateScreen: () => { },
    updatePresenter: () => { },
    screenUpdated: () => { }
  } as any;

  const pdfPosition: PdfPosition = {
    pageNumber: 1,
    top: 1,
    left: 1,
    rotation: 270,
    scale: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forFeature('media-viewer', reducers),
        StoreModule.forRoot({})
      ],
      providers: [IcpFollowerService,
        { provide: IcpUpdateService, useValue: mockUpdateService }]
    });

    followerService = TestBed.inject(IcpFollowerService);
  });

  it('should be created', () => {
    expect(followerService).toBeTruthy();
  });

  it('should call subscribe if client is follower', () => {
    spyOn(followerService, 'subscribe');

    followerService.update(true);

    expect(followerService.subscribe).toHaveBeenCalled();
  });

  it('should call unsubscribe if client is not follower', () => {
    spyOn(followerService, 'unsubscribe');

    followerService.update(false);

    expect(followerService.unsubscribe).toHaveBeenCalled();
  });

  it('should should set subscription to undefined', () => {
    followerService.unsubscribe();

    expect(followerService.$subscription).toEqual(undefined);
  });

  it('should use the local rotation as the initial remote baseline',
    inject([Store, ViewerEventService, ToolbarEventService], fakeAsync((store, viewerEvents, toolbarEvents) => {
      spyOn(viewerEvents, 'goToDestinationICP');
      spyOn(toolbarEvents, 'rotate');

      store.dispatch(new SetDocumentId('document-id'));
      store.dispatch(new PdfPositionUpdate({ ...pdfPosition, rotation: 0 }));

      followerService.followScreenUpdate({ pdfPosition, document: 'document-id' });

      expect(viewerEvents.goToDestinationICP).toHaveBeenCalled();
      expect(toolbarEvents.rotate).toHaveBeenCalledOnceWith(270);
    }))
  );

  it('should use zero as the initial remote baseline when local position is unavailable',
    inject([Store, ViewerEventService, ToolbarEventService], (store, viewerEvents, toolbarEvents) => {
      spyOn(viewerEvents, 'goToDestinationICP');
      const rotate = spyOn(toolbarEvents, 'rotate');

      store.dispatch(new SetDocumentId('document-id'));
      followerService.followScreenUpdate({ pdfPosition: { ...pdfPosition, rotation: 90 }, document: 'document-id' });

      expect(rotate).toHaveBeenCalledOnceWith(90);
    })
  );

  it('should apply remote zoom and avoid repeating the same rotation',
    inject([Store, ViewerEventService, ToolbarEventService], fakeAsync((store, viewerEvents, toolbarEvents) => {
      spyOn(viewerEvents, 'goToDestinationICP');
      spyOn(toolbarEvents, 'rotate');
      spyOn(toolbarEvents, 'zoom');

      store.dispatch(new SetDocumentId('document-id'));
      store.dispatch(new PdfPositionUpdate({ ...pdfPosition, rotation: 0, scale: 1 }));
      const remotePosition = { ...pdfPosition, rotation: 90, scale: 1.5 };

      followerService.followScreenUpdate({ pdfPosition: remotePosition, document: 'document-id' });
      followerService.followScreenUpdate({ pdfPosition: remotePosition, document: 'document-id' });

      expect(viewerEvents.goToDestinationICP).toHaveBeenCalledTimes(2);
      expect(toolbarEvents.zoom).toHaveBeenCalledWith(1.5);
      expect(toolbarEvents.rotate).toHaveBeenCalledOnceWith(90);
    }))
  );

  it('should calculate consecutive remote rotations from the last remote rotation',
    inject([Store, ViewerEventService, ToolbarEventService], fakeAsync((store, viewerEvents, toolbarEvents) => {
      spyOn(viewerEvents, 'goToDestinationICP');
      spyOn(toolbarEvents, 'rotate');

      store.dispatch(new SetDocumentId('document-id'));
      store.dispatch(new PdfPositionUpdate({ ...pdfPosition, rotation: 0 }));

      followerService.followScreenUpdate({ pdfPosition: { ...pdfPosition, rotation: 90 }, document: 'document-id' });
      followerService.followScreenUpdate({ pdfPosition: { ...pdfPosition, rotation: 180 }, document: 'document-id' });

      expect(toolbarEvents.rotate.calls.allArgs()).toEqual([[90], [90]]);
    }))
  );

  it('should reject stale document updates and reset rotation state for a new document',
    inject([Store, ViewerEventService, ToolbarEventService], fakeAsync((store, viewerEvents, toolbarEvents) => {
      spyOn(viewerEvents, 'goToDestinationICP');
      const rotate = spyOn(toolbarEvents, 'rotate');
      const zoom = spyOn(toolbarEvents, 'zoom');

      store.dispatch(new SetDocumentId('document-a'));
      store.dispatch(new PdfPositionUpdate({ ...pdfPosition, rotation: 0 }));
      followerService.followScreenUpdate({ pdfPosition: { ...pdfPosition, rotation: 90 }, document: 'document-a' });
      rotate.calls.reset();
      zoom.calls.reset();
      viewerEvents.goToDestinationICP.calls.reset();

      store.dispatch(new SetDocumentId('document-b'));
      store.dispatch(new PdfPositionUpdate({ ...pdfPosition, rotation: 270 }));
      followerService.followScreenUpdate({ pdfPosition: { ...pdfPosition, rotation: 180 }, document: 'document-a' });
      expect(viewerEvents.goToDestinationICP).not.toHaveBeenCalled();
      expect(rotate).not.toHaveBeenCalled();
      expect(zoom).not.toHaveBeenCalled();

      followerService.followScreenUpdate({ pdfPosition: { ...pdfPosition, rotation: 90 }, document: 'document-b' });
      expect(rotate).toHaveBeenCalledOnceWith(90);
    }))
  );

  it('should ignore empty, null and undefined screen updates', () => {
    for (const screenUpdate of [{}, null, undefined]) {
      expect(() => followerService.followScreenUpdate(screenUpdate as any)).not.toThrow();
    }
  });

  it('should reject screen updates without a matching document context',
    inject([Store, ViewerEventService, ToolbarEventService], (store, viewerEvents, toolbarEvents) => {
      const goToDestination = spyOn(viewerEvents, 'goToDestinationICP');
      const zoom = spyOn(toolbarEvents, 'zoom');
      const rotate = spyOn(toolbarEvents, 'rotate');

      store.dispatch(new SetDocumentId('document-id'));
      followerService.followScreenUpdate({ pdfPosition, document: undefined });
      followerService.followScreenUpdate({ pdfPosition, document: 'other-document' });

      store.dispatch(new SetDocumentId(undefined));
      followerService.followScreenUpdate({ pdfPosition, document: 'document-id' });

      expect(goToDestination).not.toHaveBeenCalled();
      expect(zoom).not.toHaveBeenCalled();
      expect(rotate).not.toHaveBeenCalled();
    })
  );

  it('should ignore malformed nested positions without applying viewer changes',
    inject([Store, ViewerEventService, ToolbarEventService], (store, viewerEvents, toolbarEvents) => {
      const goToDestination = spyOn(viewerEvents, 'goToDestinationICP');
      const zoom = spyOn(toolbarEvents, 'zoom');
      const rotate = spyOn(toolbarEvents, 'rotate');
      const basePdfPosition = { ...pdfPosition };

      store.dispatch(new SetDocumentId('document-id'));

      followerService.followScreenUpdate({ pdfPosition: null, document: 'document-id' } as any);

      for (const pdfPosition of [
        { ...basePdfPosition, pageNumber: undefined },
        { ...basePdfPosition, pageNumber: Number.NaN },
        { ...basePdfPosition, left: undefined },
        { ...basePdfPosition, left: Number.POSITIVE_INFINITY },
        { ...basePdfPosition, top: undefined },
        { ...basePdfPosition, top: Number.NEGATIVE_INFINITY },
        { ...basePdfPosition, scale: Number.NaN },
        { ...basePdfPosition, scale: 0 },
        { ...basePdfPosition, scale: -1 },
        { ...basePdfPosition, rotation: Number.POSITIVE_INFINITY },
        { ...basePdfPosition, rotation: 45 },
        { ...basePdfPosition, rotation: -90 },
      ]) {
        followerService.followScreenUpdate({ pdfPosition, document: 'document-id' });
      }

      expect(goToDestination).not.toHaveBeenCalled();
      expect(zoom).not.toHaveBeenCalled();
      expect(rotate).not.toHaveBeenCalled();
    })
  );

  it('should preserve navigation when optional scale and rotation are omitted',
    inject([Store, ViewerEventService, ToolbarEventService], (store, viewerEvents, toolbarEvents) => {
      const goToDestination = spyOn(viewerEvents, 'goToDestinationICP');
      const zoom = spyOn(toolbarEvents, 'zoom');
      const rotate = spyOn(toolbarEvents, 'rotate');

      store.dispatch(new SetDocumentId('document-id'));

      followerService.followScreenUpdate({
        pdfPosition: { pageNumber: 1, left: 10, top: 20 },
        document: 'document-id'
      } as any);

      expect(goToDestination).toHaveBeenCalledOnceWith([
        0,
        { name: 'XYZ' },
        10,
        20
      ]);
      expect(zoom).not.toHaveBeenCalled();
      expect(rotate).not.toHaveBeenCalled();
    })
  );
});
