import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IcpSession, IcpSessionResponse } from './icp.interfaces';

@Injectable({ providedIn: 'root' })
export class IcpSessionApiService {

  public ICP_SESSION_API = '/icp/sessions';

  constructor(private readonly httpClient: HttpClient) { }

  public loadSession(payload: { caseId: string, documentId: string }): Observable<IcpSessionResponse> {
    return this.httpClient
      .get<{ username: string, session: IcpSession }>(`${this.ICP_SESSION_API}/${payload.caseId}/${payload.documentId}`,
        { observe: 'response', withCredentials: true })
      .pipe(map(response => {
        const token = response.headers.get('X-Access-Token');
        if (!response.body || !token) {
          throw new Error('ICP session response did not contain an access token');
        }
        return { ...response.body, token };
      }));
  }
}
