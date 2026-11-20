import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, filter, groupBy, map, mergeMap, skipWhile, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { BookmarksApiService } from '../../annotations/services/bookmarks-api/bookmarks-api.service';
import * as bookmarksActions from '../actions/bookmark.actions';
import { select, Store } from '@ngrx/store';
import * as fromDocument from '../selectors/document.selectors';
import * as bookmarkSelectors from '../selectors/bookmark.selectors';
import * as fromBookmarks from '../reducers/bookmarks.reducer';
import * as fromStore from '../reducers/reducers';

@Injectable()
export class BookmarksEffects {
  private actions$ = inject(Actions);
  private store = inject<Store<fromStore.AnnotationSetState | fromBookmarks.BookmarksState>>(Store);
  private bookmarksApiService = inject(BookmarksApiService);


  loadBookmarks$ = createEffect(() =>
    this.actions$.pipe(
    ofType(bookmarksActions.LOAD_BOOKMARKS),
    withLatestFrom(this.store.pipe(select(fromDocument.getDocumentId))),
    map(([, documentId]) => documentId),
    switchMap(documentId => this.store.pipe(
      select(bookmarkSelectors.getBookmarkState),
      filter(state => (!state.activeDocumentId || state.activeDocumentId === documentId) &&
        !state.pendingSaves && !state.pendingCreates && !state.pendingStructure),
      take(1),
      switchMap(() => this.bookmarksApiService.getBookmarks(documentId).pipe(
        map(res => new bookmarksActions.LoadBookmarksSuccess(res, documentId)),
        catchError(err => of(new bookmarksActions.LoadBookmarksFailure(err, documentId)))
      ))
    ))
    )
  );

  createBookmark$ = createEffect(() =>
    this.actions$.pipe(
    ofType(bookmarksActions.CREATE_BOOKMARK),
    withLatestFrom(this.store.pipe(select(fromDocument.getDocumentId))),
    mergeMap(([action, documentId]: [bookmarksActions.CreateBookmark, string]) =>
      this.bookmarksApiService.createBookmark(action.payload)
        .pipe(
          map(bmrk => new bookmarksActions.CreateBookmarkSuccess(bmrk, documentId)),
          catchError(error => of(new bookmarksActions.CreateBookmarkFailure(error, documentId)))
        )
    ))
  );

  moveBookmark$ = createEffect(() =>
    this.actions$.pipe(
    ofType(bookmarksActions.MOVE_BOOKMARK),
    withLatestFrom(this.store.pipe(select(fromDocument.getDocumentId))),
    mergeMap(([action, documentId]: [bookmarksActions.MoveBookmark, string]) =>
      this.bookmarksApiService.updateMultipleBookmarks(action.payload)
        .pipe(
          map(bmrks => new bookmarksActions.MoveBookmarkSuccess(bmrks, documentId)),
          catchError(error => of(new bookmarksActions.MoveBookmarkFailure(error, documentId)))
        )
    ))
  );

  deleteBookmark$ = createEffect(() =>
    this.actions$.pipe(
    ofType(bookmarksActions.DELETE_BOOKMARK),
    withLatestFrom(this.store.pipe(select(fromDocument.getDocumentId))),
    mergeMap(([action, documentId]: [bookmarksActions.DeleteBookmark, string]) => {
      const { deleted, updated } = action.payload;
      return this.bookmarksApiService.deleteMultipleBookmarks({ deleted, updated })
        .pipe(
          switchMap(() => {
            if (updated) {
              return [
                new bookmarksActions.DeleteBookmarkSuccess(deleted, documentId),
                new bookmarksActions.UpdateBookmarkSuccess(updated, documentId)
              ];
            } else {
              return [new bookmarksActions.DeleteBookmarkSuccess(deleted, documentId)];
            }
          }),
          catchError(error => of(new bookmarksActions.DeleteBookmarkFailure(error, documentId)))
        );
    })
    )
  );

  updateBookmark$ = createEffect(() =>
    this.actions$.pipe(
    ofType(bookmarksActions.UPDATE_BOOKMARK),
    withLatestFrom(this.store.pipe(select(fromDocument.getDocumentId))),
    groupBy(([, documentId]) => documentId, {
      duration: group => this.store.pipe(
        select(bookmarkSelectors.getBookmarkState),
        map(state => state.activeDocumentId === group.key
          ? state.pendingSaves || 0
          : state.pendingByDocument?.[group.key]?.saves || 0),
        skipWhile(count => count === 0),
        filter(count => count === 0),
        take(1)
      )
    }),
    mergeMap(group => group.pipe(concatMap(([action, documentId]: [bookmarksActions.UpdateBookmark, string]) =>
      this.bookmarksApiService.updateBookmark(action.payload).pipe(
        map(bmrk => new bookmarksActions.UpdateBookmarkSuccess(bmrk, documentId)),
        catchError(error => of(new bookmarksActions.UpdateBookmarkFailure(error, documentId)))
      )
    )))
    )
  );
}
