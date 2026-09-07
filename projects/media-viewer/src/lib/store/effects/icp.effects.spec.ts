import { TestBed } from '@angular/core/testing';
import { StoreModule } from '@ngrx/store';
import { reducers } from '../reducers/reducers';
import { provideMockActions } from '@ngrx/effects/testing';
import { IcpSessionApiService } from '../../icp/icp-session-api.service';
import { of, throwError } from 'rxjs';
import { cold, hot } from 'jasmine-marbles';
import * as icpActions from '../actions/icp.actions';
import { IcpUpdateService } from '../../icp/icp-update.service';
import { SocketService } from '../../icp/socket.service';
import { IcpSession } from '../../icp/icp.interfaces';
import { IcpEffects } from './icp.effects';

describe('Icp Effects', () => {
  let actions$;
  let effects: IcpEffects;
  const icpApi = jasmine.createSpyObj('IcpSessionService', ['loadSession']);
  const icpSocket = jasmine.createSpyObj('IcpUpdateService', ['joinSession']);
  const session: IcpSession = {
    caseId: 'caseId',
    documentId: 'documentId',
    sessionId: 'sessionId',
    dateOfHearing: new Date(),
    connectionUrl: 'url-connectionstring'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forFeature('media-viewer', reducers),
        StoreModule.forRoot({})
      ],
      providers: [
        { provide: IcpSessionApiService, useValue: icpApi },
        { provide: IcpUpdateService, useValue: icpSocket },
        IcpEffects,
        SocketService,
        provideMockActions(() => actions$)
      ]
    });
    effects = TestBed.inject(IcpEffects);
  });


  describe('loadIcpSession$', () => {
    it('should return a JoinSocketSession', () => {
      const payload = { session: session, username: 'name', token: 'access-token' };
      const action = new icpActions.LoadIcpSession({ caseId: session.caseId, documentId: session.documentId });
      icpApi.loadSession.and.returnValue(of(payload));
      const completion = new icpActions.JoinIcpSocketSession(payload);
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.loadIcpSession$).toBeObservable(expected);
    });

    it('should return a LoadSessionFailure', () => {
      const action = new icpActions.LoadIcpSession({ caseId: session.caseId, documentId: session.documentId });
      icpApi.loadSession.and.returnValue(throwError(new Error()));
      const completion = new icpActions.LoadIcpSessionFailure(new Error());
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.loadIcpSession$).toBeObservable(expected);
    });
  });

  describe('joinIcpSocketSession$', () => {
    it('should join the socket session and publish participants', () => {
      const action = new icpActions.JoinIcpSocketSession({ session, username: 'name', token: 'access-token' });
      const participants = {
        client: { id: 'clientId', username: 'name' },
        presenter: { id: 'presenterId', username: 'presenter' }
      };
      icpSocket.joinSession.and.returnValue(of(participants));
      const completion = new icpActions.IcpSocketSessionJoined({ session, participantInfo: participants });
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });

      expect(effects.joinIcpSocketSession$).toBeObservable(expected);
      expect(icpSocket.joinSession).toHaveBeenCalledWith('name', session, 'access-token');
    });
  });
});
