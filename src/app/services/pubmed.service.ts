import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Pubmed } from '../models/pubmed.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PubmedService {

  private apiUrl = "https://api.mcaredb.org:3305/pubmed/";

  constructor(private http: HttpClient) { }

  getPubmedData(pmid: string | number) {
    return this.http.get(`${this.apiUrl}${pmid}`, { responseType: 'text' });
  }

  getPubmedJson(pmid: string | number) {
    return this.getPubmedData(pmid).pipe(
      map(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc
          .querySelector('h1.heading-title')
          ?.textContent?.replace(/\s+/g, ' ')
          .trim() ?? 'Unknown';

        const authors = Array.from(
          doc.querySelectorAll('.authors-list .authors-list-item a.full-name')
        ).map(n => n.textContent?.trim() ?? 'Unknown');

        const year = doc
          .querySelector('.citation-year')
          ?.textContent?.trim() ?? 'Unknown';

        return new Pubmed(title, authors, year);   // ← 这里返回给 map
      })
    );                                             // ← 整个 Observable<Pubmed>
  }
}
