import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class DocumentConversionApiService {

  private documentConversionUrl = '/doc-assembly/convert';

  constructor(private readonly httpClient: HttpClient) {}

  public convert(documentId): Observable<HttpResponse<Blob>> {
    return this.httpClient
      .post<Blob>(`${this.documentConversionUrl}/${documentId}`, {},
        { observe: 'response' , withCredentials: true, responseType: 'blob' as 'json' });
  }
}
