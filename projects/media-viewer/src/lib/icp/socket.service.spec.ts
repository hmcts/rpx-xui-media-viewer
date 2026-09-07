import { SocketService } from './socket.service';
import { Observable, of } from 'rxjs';
import { IcpEvents } from './icp.events';

describe('SocketService', () => {

  let socketService: SocketService;

  const mockSocketClient: any = {
    readyState: WebSocket.OPEN,
    close: () => { },
    onclose: () => { },
    onerror: () => { },
    onmessage: () => { },
    onopen: () => { },
    send: (data: any) => { },
  };

  beforeEach(() => {
    socketService = new SocketService();
    spyOn(socketService, 'getSocketClient').and.returnValue(of(mockSocketClient));
    spyOnAllFunctions(mockSocketClient);
    socketService.connect('http://testurl.com', {
      sessionId: 'dummy-session-id',
      documentId: 'dummy-document-id',
      caseId: 'dummy-case-id',
      dateOfHearing: undefined,
      connectionUrl: 'dummy-connection-url'
    });
  });

  it('should join', () => {
    spyOn(socketService, 'emit');
    socketService.join({});
    expect(socketService.emit).toHaveBeenCalledWith('IcpClientJoinSession', {});
  });

  it('should connect with session identifiers', () => {
    expect(socketService.getSocketClient).toHaveBeenCalledWith(
      'http://testurl.com/?sessionId=dummy-session-id&caseId=dummy-case-id&documentId=dummy-document-id'
    );
  });

  it('should publish an open socket state and routed messages', () => {
    const connectedSpy = jasmine.createSpy('connected');
    const screenUpdatedSpy = spyOn(socketService.screenUpdated$, 'next');
    const messageHandlerSpy = spyOn(socketService, 'messageEventHandller').and.callThrough();
    socketService.connected().subscribe(connectedSpy);

    mockSocketClient.onopen(new Event('open'));
    const screenUpdate = { pageNumber: 2 } as any;
    mockSocketClient.onmessage(new MessageEvent('message', {
      data: JSON.stringify({
        data: { eventName: IcpEvents.SCREEN_UPDATED, data: screenUpdate }
      })
    }));

    expect(connectedSpy).toHaveBeenCalledWith(false);
    expect(connectedSpy).toHaveBeenCalledWith(true);
    expect(messageHandlerSpy).toHaveBeenCalledWith(IcpEvents.SCREEN_UPDATED, screenUpdate);
    expect(screenUpdatedSpy).toHaveBeenCalledWith(screenUpdate);
  });

  it('should leave', () => {
    const subscription = { unsubscribe: jasmine.createSpy('unsubscribe') } as any;
    socketService.subscription = subscription;
    spyOn(socketService, 'emit');
    socketService.leave({});

    expect(socketService.emit).toHaveBeenCalledWith('IcpClientLeaveSession', {});
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('should close the previous socket when reconnecting', () => {
    const previousSocket = { ...mockSocketClient, close: jasmine.createSpy('previousClose') };
    const nextSocket = { ...mockSocketClient, close: jasmine.createSpy('nextClose') };
    socketService['socket'] = previousSocket;
    const previousSubscription = { unsubscribe: jasmine.createSpy('unsubscribe') } as any;
    socketService.subscription = previousSubscription;
    (socketService.getSocketClient as jasmine.Spy).and.returnValue(of(nextSocket));

    socketService.connect('http://testurl.com', {
      sessionId: 'new-session', documentId: 'new-document', caseId: 'new-case',
      dateOfHearing: undefined, connectionUrl: 'new-connection-url'
    });

    expect(previousSocket.close).toHaveBeenCalled();
    expect(previousSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('should close the socket and reset connected state when leaving', () => {
    socketService.connected$.next(true);
    mockSocketClient.close.calls.reset();
    socketService.leave({});

    expect(mockSocketClient.close).toHaveBeenCalled();
    expect(socketService.connected$.value).toBeFalse();
    expect(socketService.subscription).toBeUndefined();
  });

  it('should reset connected state when the socket closes unexpectedly', () => {
    socketService.connected$.next(true);
    mockSocketClient.close.calls.reset();

    mockSocketClient.onclose(new CloseEvent('close'));

    expect(socketService.connected$.value).toBeFalse();
    expect(socketService['socket']).toBeUndefined();
    expect(socketService.subscription).toBeUndefined();
    expect(mockSocketClient.close).toHaveBeenCalled();
  });

  it('should emit', () => {
    socketService['socket'] = mockSocketClient;
    socketService.emit('event', {});
    expect(mockSocketClient.send).toHaveBeenCalledWith('{"type":"event","event":"event","data":{}}');
  });


  it('should listen', function () {
    const observable = socketService.listen(IcpEvents.PARTICIPANTS_UPDATED);
    expect(observable).toEqual(jasmine.any(Observable));
  });

  it('should unsubscribe', () => {
    const subscription = { unsubscribe: jasmine.createSpy('unsubscribe') } as any;
    socketService.subscription = subscription;
    socketService.ngOnDestroy();
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('message event handler should call session joined', () => {
    const nextSpy = spyOn(socketService.sessionJoined$, 'next');
    socketService.messageEventHandller('IcpClientJoinedSession', { test: 'hello' });
    expect(nextSpy).toHaveBeenCalled();
  });

  it('message event handler should call presenter updated', () => {
    const nextSpy = spyOn(socketService.presenterUpdated$, 'next');
    socketService.messageEventHandller('IcpPresenterUpdated', { test: 'hello' });
    expect(nextSpy).toHaveBeenCalled();
  });

  it('message event handler should call client disconnected', () => {
    const nextSpy = spyOn(socketService.clientDisconnected$, 'next');
    socketService.messageEventHandller('IcpClientDisconnectedFromSession', { test: 'hello' });
    expect(nextSpy).toHaveBeenCalled();
  });

  it('message event handler should call participant updated', () => {
    const nextSpy = spyOn(socketService.participantUpdated$, 'next');
    socketService.messageEventHandller('IcpParticipantsListUpdated', { test: 'hello' });
    expect(nextSpy).toHaveBeenCalled();
  });

  it('message event handler should call new participant joined', () => {
    const nextSpy = spyOn(socketService.newParticipantJoined$, 'next');
    socketService.messageEventHandller('IcpNewParticipantJoinedSession', { test: 'hello' });
    expect(nextSpy).toHaveBeenCalled();
  });

  it('message event handler should call screen updated', () => {
    const nextSpy = spyOn(socketService.screenUpdated$, 'next');
    const screenUpdate = { test: 'hello' } as any;
    socketService.messageEventHandller('IcpScreenUpdated', screenUpdate);
    expect(nextSpy).toHaveBeenCalledWith(screenUpdate);
  });

  it('listen should call session joined', () => {
    const nextSpy = spyOn(socketService.sessionJoined$, 'asObservable');
    socketService.listen(IcpEvents.SESSION_JOINED);
    expect(nextSpy).toHaveBeenCalled();
  });

  it('listen should call presenter updated', () => {
    const nextSpy = spyOn(socketService.presenterUpdated$, 'asObservable');
    socketService.listen(IcpEvents.PRESENTER_UPDATED);
    expect(nextSpy).toHaveBeenCalled();
  });

  it('listen should call client disconnected', () => {
    const nextSpy = spyOn(socketService.clientDisconnected$, 'asObservable');
    socketService.listen(IcpEvents.CLIENT_DISCONNECTED);
    expect(nextSpy).toHaveBeenCalled();
  });

  it('listen should call new participant joined', () => {
    const nextSpy = spyOn(socketService.newParticipantJoined$, 'asObservable');
    socketService.listen(IcpEvents.NEW_PARTICIPANT_JOINED);
    expect(nextSpy).toHaveBeenCalled();
  });

  it('listen should call screen updated', () => {
    const nextSpy = spyOn(socketService.screenUpdated$, 'asObservable');
    socketService.listen(IcpEvents.SCREEN_UPDATED);
    expect(nextSpy).toHaveBeenCalled();
  });

  it('connected should be observable', () => {
    const nextSpy = spyOn(socketService.connected$, 'asObservable');
    socketService.connected();
    expect(nextSpy).toHaveBeenCalled();
  });

});
