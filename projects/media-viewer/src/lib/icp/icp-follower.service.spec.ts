import { fakeAsync, inject, TestBed } from '@angular/core/testing';
import { Store, StoreModule } from '@ngrx/store';
import { PdfPosition, reducers } from '../store/reducers/reducers';
import { IcpUpdateService } from './icp-update.service';
import { IcpFollowerService } from './icp-follower.service';
import { ViewerEventService } from '../viewers/viewer-event.service';
import { ToolbarEventService } from '../toolbar/toolbar-event.service';
import { PdfPositionUpdate } from '../store/actions/document.actions';

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

  it('should follow screen updates',
    inject([Store, ViewerEventService, ToolbarEventService], fakeAsync((store, viewerEvents, toolbarEvents) => {
      spyOn(viewerEvents, 'goToDestinationICP');
      spyOn(toolbarEvents, 'rotate');

      store.dispatch(new PdfPositionUpdate({ ...pdfPosition, rotation: 0 }));

      followerService.followScreenUpdate({ pdfPosition });

      expect(viewerEvents.goToDestinationICP).toHaveBeenCalled();
      expect(toolbarEvents.rotate).toHaveBeenCalled();
    }))
  );

  it('should apply remote zoom and avoid repeating the same rotation',
    inject([Store, ViewerEventService, ToolbarEventService], fakeAsync((store, viewerEvents, toolbarEvents) => {
      spyOn(viewerEvents, 'goToDestinationICP');
      spyOn(toolbarEvents, 'rotate');
      spyOn(toolbarEvents, 'zoom');

      store.dispatch(new PdfPositionUpdate({ ...pdfPosition, rotation: 0, scale: 1 }));
      const remotePosition = { ...pdfPosition, rotation: 90, scale: 1.5 };

      followerService.followScreenUpdate({ pdfPosition: remotePosition });
      followerService.followScreenUpdate({ pdfPosition: remotePosition });

      expect(viewerEvents.goToDestinationICP).toHaveBeenCalledTimes(2);
      expect(toolbarEvents.zoom).toHaveBeenCalledWith(1.5);
      expect(toolbarEvents.rotate).toHaveBeenCalledOnceWith(90);
    }))
  );

  it('should calculate consecutive remote rotations from the last remote rotation',
    inject([Store, ViewerEventService, ToolbarEventService], fakeAsync((store, viewerEvents, toolbarEvents) => {
      spyOn(viewerEvents, 'goToDestinationICP');
      spyOn(toolbarEvents, 'rotate');

      store.dispatch(new PdfPositionUpdate({ ...pdfPosition, rotation: 0 }));

      followerService.followScreenUpdate({ pdfPosition: { ...pdfPosition, rotation: 90 } });
      followerService.followScreenUpdate({ pdfPosition: { ...pdfPosition, rotation: 180 } });

      expect(toolbarEvents.rotate).toHaveBeenCalledWith(90);
      expect(toolbarEvents.rotate).toHaveBeenCalledWith(90);
      expect(toolbarEvents.rotate).toHaveBeenCalledTimes(2);
    }))
  );

  it('should ignore empty, null and undefined screen updates', () => {
    expect(() => followerService.followScreenUpdate({} as any)).not.toThrow();
    expect(() => followerService.followScreenUpdate(null as any)).not.toThrow();
    expect(() => followerService.followScreenUpdate(undefined)).not.toThrow();
  });

  it('should ignore malformed nested positions without applying viewer changes',
    inject([ViewerEventService, ToolbarEventService], (viewerEvents, toolbarEvents) => {
      const goToDestination = spyOn(viewerEvents, 'goToDestinationICP');
      const zoom = spyOn(toolbarEvents, 'zoom');
      const rotate = spyOn(toolbarEvents, 'rotate');
      const basePdfPosition = { ...pdfPosition };

      followerService.followScreenUpdate({ pdfPosition: null } as any);

      for (const pdfPosition of [
        { ...basePdfPosition, pageNumber: undefined },
        { ...basePdfPosition, pageNumber: Number.NaN },
        { ...basePdfPosition, left: undefined },
        { ...basePdfPosition, left: Number.POSITIVE_INFINITY },
        { ...basePdfPosition, top: undefined },
        { ...basePdfPosition, top: Number.NEGATIVE_INFINITY },
        { ...basePdfPosition, scale: Number.NaN },
        { ...basePdfPosition, rotation: Number.POSITIVE_INFINITY },
      ]) {
        followerService.followScreenUpdate({ pdfPosition });
      }

      expect(goToDestination).not.toHaveBeenCalled();
      expect(zoom).not.toHaveBeenCalled();
      expect(rotate).not.toHaveBeenCalled();
    })
  );

  it('should preserve navigation when optional scale and rotation are omitted',
    inject([ViewerEventService, ToolbarEventService], (viewerEvents, toolbarEvents) => {
      const goToDestination = spyOn(viewerEvents, 'goToDestinationICP');
      const zoom = spyOn(toolbarEvents, 'zoom');
      const rotate = spyOn(toolbarEvents, 'rotate');

      followerService.followScreenUpdate({
        pdfPosition: { pageNumber: 1, left: 10, top: 20 }
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
