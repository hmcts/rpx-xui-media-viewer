import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ViewerUtilService {
  private readonly http = inject(HttpClient);


  public validateFile(url: string) {
    return this.http.head(url);
  }
}
