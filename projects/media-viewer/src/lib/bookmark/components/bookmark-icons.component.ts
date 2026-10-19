import {Bookmark, BookmarksPerPage} from '../../viewers/pdf-viewer/side-bar/bookmarks/bookmarks.interfaces';
import { Component, Input, OnInit, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';
import * as fromStore from '../../store/reducers/reducers';
import * as fromSelectors from '../../store/selectors/bookmark.selectors';
import { Observable } from 'rxjs';

@Component({
    selector: 'mv-bookmark-icons',
    templateUrl: './bookmark-icons.component.html',
    standalone: false
})
export class BookmarkIconsComponent implements OnInit {
  private store = inject<Store<fromStore.State>>(Store);


  @Input() zoom: number;
  @Input() rotate: number;
  bookmarksPerPage$: Observable<BookmarksPerPage[]>;
  bookmarks: Bookmark[];
  documentId: string;

  ngOnInit(): void {
    this.bookmarksPerPage$ = this.store.pipe(select(fromSelectors.getBookmarksPerPage));
  }

}
