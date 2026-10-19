import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable()
export class DocumentConversionApiService {
  private readonly httpClient = inject(HttpClient);


  private documentConversionUrl = '/doc-assembly/convert';

  public convert(documentId): Observable<HttpResponse<Blob>> {
    return this.httpClient
      .post<Blob>(`${this.documentConversionUrl}/${documentId}`, {},
        { observe: 'response' , withCredentials: true, responseType: 'blob' as 'json' })
      .pipe(
        map(response => response),
        catchError(error => of(error))
      );
  }
}
