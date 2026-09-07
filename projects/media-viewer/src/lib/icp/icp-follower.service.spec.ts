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

  it('should ignore an empty screen update', () => {
    expect(() => followerService.followScreenUpdate({} as any)).not.toThrow();
  });
});
