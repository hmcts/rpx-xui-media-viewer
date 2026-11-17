import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IcpSession } from './icp.interfaces';

@Injectable({ providedIn: 'root' })
export class IcpSessionApiService {
  private readonly httpClient = inject(HttpClient);


  public ICP_SESSION_API = '/icp/sessions';

  public loadSession(payload: { caseId: string, documentId: string }): Observable<any> {
    return this.httpClient
      .get<{ username: string, session: IcpSession }>(`${this.ICP_SESSION_API}/${payload.caseId}/${payload.documentId}`,
        { observe: 'response', withCredentials: true })
      .pipe(map(response => {
        const token = response.headers.get('X-Access-Token');
        return { 
          ...response.body, 
          token
        };
      }));
  }
}
