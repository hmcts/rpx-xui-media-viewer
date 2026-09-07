import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, from, Observable, of, Subject, Subscription } from 'rxjs';
import { IcpEvents } from './icp.events';
import { IcpParticipant, IcpScreenUpdate, IcpSession } from './icp.interfaces';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {

  private socket: WebSocket;
  subscription: Subscription | undefined;
  connected$ = new BehaviorSubject<boolean>(false);
  sessionJoined$ = new Subject<void>();
  presenterUpdated$ = new Subject<void>();
  clientDisconnected$ = new Subject<void>();
  participantUpdated$ = new Subject<void>();
  newParticipantJoined$ = new Subject<void>();
  screenUpdated$ = new Subject<IcpScreenUpdate>();

  constructor() { }

  ngOnDestroy() {
    this.cleanupSocket();
  }

  connect(url: string, session: IcpSession) {
    this.cleanupSocket();
    const socketUrl = new URL(url);
    socketUrl.searchParams.append('sessionId', `${session.sessionId}`);
    socketUrl.searchParams.append('caseId', `${session.caseId}`);
    socketUrl.searchParams.append('documentId', `${session.documentId}`);
    this.subscription = this.getSocketClient(socketUrl.toString()).subscribe((socket: WebSocket) => {
      this.socket = socket;

      socket.onopen = (event: Event) => {
        this.connected$.next(true);
      };

      socket.onmessage = (event: MessageEvent) => {
        console.log('onmessage');
        const eventData = JSON.parse(event.data);
        if (eventData.data && eventData.data.eventName) {
          this.messageEventHandller(eventData.data.eventName, eventData.data.data);
        }
      };

      socket.onerror = (event: Event) => {
        console.log('onerror');
      };

      socket.onclose = (event: CloseEvent) => {
        console.log('onclose');
      };
    });
  }

  connected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  join(session) {
    this.emit(IcpEvents.SESSION_JOIN, session);
  }

  leave(session) {
    this.emit(IcpEvents.SESSION_LEAVE, session);
    this.cleanupSocket();
  }

  private cleanupSocket(): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      this.socket.close();
    }
    this.socket = undefined;
    this.connected$.next(false);
  }

  emit(event: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'event',
        event,
        data
      }));
    } else {
      console.warn('WebSocket is not open. Ready state is:', this.socket ? this.socket.readyState : 'no socket');
    }
  }

  listen(event: IcpEvents): Observable<any> {
    switch (event) {
      case IcpEvents.SESSION_JOINED: {
        return this.sessionJoined$.asObservable();
      }
      case IcpEvents.PRESENTER_UPDATED: {
        return this.presenterUpdated$.asObservable();
      }
      case IcpEvents.CLIENT_DISCONNECTED: {
        return this.clientDisconnected$.asObservable();
      }
      case IcpEvents.PARTICIPANTS_UPDATED: {
        return this.participantUpdated$.asObservable();
      }
      case IcpEvents.NEW_PARTICIPANT_JOINED: {
        return this.newParticipantJoined$.asObservable();
      }
      case IcpEvents.SCREEN_UPDATED: {
        return this.screenUpdated$.asObservable();
      }
      default: {
        break;
      }
    }
  }

  messageEventHandller(eventName: string, data: any) {
    switch (eventName) {
      case IcpEvents.SESSION_JOINED: {
        this.sessionJoined$.next(data);
        break;
      }
      case IcpEvents.PRESENTER_UPDATED: {
        this.presenterUpdated$.next(data);
        break;
      }
      case IcpEvents.CLIENT_DISCONNECTED: {
        this.clientDisconnected$.next();
        break;
      }
      case IcpEvents.PARTICIPANTS_UPDATED: {
        this.participantUpdated$.next(data);
        break;
      }
      case IcpEvents.NEW_PARTICIPANT_JOINED: {
        this.newParticipantJoined$.next();
        break;
      }
      case IcpEvents.SCREEN_UPDATED: {
        this.screenUpdated$.next(data);
        break;
      }
    }
  }

  getSocketClient(url: string): Observable<WebSocket> {
    this.socket = new WebSocket(url, 'json.webpubsub.azure.v1');
    return of(this.socket);
  }
}
