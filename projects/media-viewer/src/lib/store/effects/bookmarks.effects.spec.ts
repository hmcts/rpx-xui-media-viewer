import { inject, TestBed } from '@angular/core/testing';
import { cold, hot } from 'jasmine-marbles';
import { of, Subject, throwError } from 'rxjs';
import { provideMockActions } from '@ngrx/effects/testing';
import * as bookmarkActions from '../actions/bookmark.actions';
import { BookmarksEffects } from './bookmarks.effects';
import { BookmarksApiService } from '../../annotations/services/bookmarks-api/bookmarks-api.service';
import { Store, StoreModule } from '@ngrx/store';
import { reducers } from '../reducers/reducers';
import { PdfPositionUpdate, SetDocumentId } from '../actions/document.actions';

describe('Bookmark Effects', () => {
  let actions$;
  let effects: BookmarksEffects;
  const bookmarksApi = jasmine.createSpyObj('BookmarksApiService', [
    'getBookmarks',
    'createBookmark',
    'updateBookmark',
    'updateMultipleBookmarks',
    'deleteMultipleBookmarks'
  ]);
  const bookmark = {
    name: 'bookmark', xCoordinate: 100, yCoordinate: 50, documentId: 'documentId', id: 'id', pageNumber: 1, zoom: 1
  } as any;
  const pdfPosition = { pageNumber: 0, scale: 1, top: 100, left: 100, rotation: 0 };
  const bookmarkInfo = { xCoordinate: 100, yCoordinate: 50, documentId: 'documentId', pageNumber: 1 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forFeature('media-viewer', reducers),
        StoreModule.forRoot({})
      ],
      providers: [
        { provide: BookmarksApiService, useValue: bookmarksApi },
        BookmarksEffects,
        provideMockActions(() => actions$)
      ]
    });
    effects = TestBed.inject(BookmarksEffects);
    TestBed.inject(Store).dispatch(new SetDocumentId('documentId'));
  });

  describe('getBookmarks$', () => {
    it('waits for pending saves on a returned document before loading', inject([Store], (store: Store) => {
      store.dispatch(new SetDocumentId('documentId'));
      store.dispatch(new bookmarkActions.UpdateBookmark(bookmark));
      const actions = new Subject<any>();
      actions$ = actions;
      bookmarksApi.getBookmarks.calls.reset();
      bookmarksApi.getBookmarks.and.returnValue(of({ body: [bookmark], status: 200 }));
      const completed: any[] = [];
      const subscription = effects.loadBookmarks$.subscribe(action => completed.push(action));
      actions.next(new bookmarkActions.LoadBookmarks());
      expect(bookmarksApi.getBookmarks).not.toHaveBeenCalled();
      store.dispatch(new bookmarkActions.UpdateBookmarkSuccess(bookmark, 'documentId'));
      expect(bookmarksApi.getBookmarks).toHaveBeenCalledWith('documentId');
      expect(completed).toEqual([new bookmarkActions.LoadBookmarksSuccess({ body: [bookmark], status: 200 }, 'documentId')]);
      subscription.unsubscribe();
    }));

    it('ignores a previous document load when a newer document is opened', inject([Store], (store: Store) => {
      const first = new Subject<any>();
      const second = new Subject<any>();
      const actions = new Subject<any>();
      actions$ = actions;
      bookmarksApi.getBookmarks.calls.reset();
      bookmarksApi.getBookmarks.and.returnValues(first, second);
      const completed: any[] = [];
      const subscription = effects.loadBookmarks$.subscribe(action => completed.push(action));
      store.dispatch(new SetDocumentId('first'));
      actions.next(new bookmarkActions.LoadBookmarks());
      store.dispatch(new SetDocumentId('second'));
      actions.next(new bookmarkActions.LoadBookmarks());
      first.next({ body: [bookmark], status: 200 });
      second.next({ body: [], status: 200 });
      expect(completed).toEqual([new bookmarkActions.LoadBookmarksSuccess({ body: [], status: 200 }, 'second')]);
      subscription.unsubscribe();
    }));

    it('does not let a waiting load block a different document', inject([Store], (store: Store) => {
      store.dispatch(new SetDocumentId('documentId'));
      store.dispatch(new bookmarkActions.UpdateBookmark(bookmark));
      const actions = new Subject<any>();
      actions$ = actions;
      bookmarksApi.getBookmarks.calls.reset();
      bookmarksApi.getBookmarks.and.returnValue(of({ body: [], status: 200 }));
      const subscription = effects.loadBookmarks$.subscribe();
      actions.next(new bookmarkActions.LoadBookmarks());
      store.dispatch(new SetDocumentId('other'));
      actions.next(new bookmarkActions.LoadBookmarks());
      expect(bookmarksApi.getBookmarks).toHaveBeenCalledOnceWith('other');
      subscription.unsubscribe();
    }));

    it('should return a LoadBookmarksSuccess', () => {
      const bookmarks = [bookmark as any];
      const payload = { body: bookmarks, status: 200 };
      const action = new bookmarkActions.LoadBookmarks();
      bookmarksApi.getBookmarks.and.returnValue(of(payload));
      const completion = new bookmarkActions.LoadBookmarksSuccess(payload, 'documentId');
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.loadBookmarks$).toBeObservable(expected);
    });

    it('should return a LoadBookmarkFailure', () => {
      const action = new bookmarkActions.LoadBookmarks();
      bookmarksApi.getBookmarks.and.returnValue(throwError({body: 'error', status: 400}));
      const completion = new bookmarkActions.LoadBookmarksFailure({body: 'error', status: 400}, 'documentId');
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.loadBookmarks$).toBeObservable(expected);
    });
  });

  describe('createBookmark$', () => {
    it('retains the initiating document when a mismatched create response arrives after navigation', inject([Store], (store: Store) => {
      const response = new Subject<any>();
      const actions = new Subject<any>();
      actions$ = actions;
      bookmarksApi.createBookmark.and.returnValue(response);
      const completed: any[] = [];
      const subscription = effects.createBookmark$.subscribe(action => completed.push(action));
      actions.next(new bookmarkActions.CreateBookmark({ ...bookmark, documentId: 'payload-id' }));
      store.dispatch(new SetDocumentId('other'));
      response.next({ ...bookmark, documentId: 'payload-id' });
      response.complete();
      expect(completed).toEqual([new bookmarkActions.CreateBookmarkSuccess({ ...bookmark, documentId: 'payload-id' }, 'documentId')]);
      subscription.unsubscribe();
    }));

    it('should return a CreateBookmarkSuccess', inject([Store], (store) => {
      store.dispatch(new PdfPositionUpdate(pdfPosition));
      const action = new bookmarkActions.CreateBookmark({ ...bookmarkInfo, name: 'new bookmark' } as any);
      bookmarksApi.createBookmark.and.returnValue(of(bookmark));
      const completion = new bookmarkActions.CreateBookmarkSuccess(bookmark, bookmarkInfo.documentId);
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.createBookmark$).toBeObservable(expected);
    }));

    it('should return a CreateBookmarkFailure', inject([Store], (store) => {
      const action = new bookmarkActions.CreateBookmark({ ...bookmarkInfo, name: 'new bookmark' } as any);
      store.dispatch(new PdfPositionUpdate(pdfPosition));
      bookmarksApi.createBookmark.and.returnValue(throwError(bookmark));
      const completion = new bookmarkActions.CreateBookmarkFailure(bookmark, bookmarkInfo.documentId);
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.createBookmark$).toBeObservable(expected);
    }));
  });

  describe('moveBookmark$', () => {
    it('should return MoveBookmarkSuccess', () => {
      bookmarksApi.updateMultipleBookmarks.and.returnValue(of([{ id: 'bookmarkId'}]));
      const action = new bookmarkActions.MoveBookmark([{ id: 'bookmarkId'} as any]);
      const completion = new bookmarkActions.MoveBookmarkSuccess([{ id: 'bookmarkId'} as any], 'documentId');
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.moveBookmark$).toBeObservable(expected);
    });

    it('should return MoveBookmarkFailure', () => {
      bookmarksApi.updateMultipleBookmarks.and.returnValue(throwError('failure'));
      const action = new bookmarkActions.MoveBookmark([{}] as any);
      const completion = new bookmarkActions.MoveBookmarkFailure('failure', 'documentId');
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.moveBookmark$).toBeObservable(expected);
    });
  });
  describe('deleteBookmark$', () => {
    it('should return a DeleteBookmarkSuccess', () => {
      bookmarksApi.deleteMultipleBookmarks.and.returnValue(of({}));
      const action = new bookmarkActions.DeleteBookmark({ deleted: ['bookmarkId'], updated: undefined });
      const completion = new bookmarkActions.DeleteBookmarkSuccess(['bookmarkId'], 'documentId');
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.deleteBookmark$).toBeObservable(expected);
    });

    it('should return a DeleteBookmarkFailure', () => {
      bookmarksApi.deleteMultipleBookmarks.and.returnValue(throwError('failure'));
      const action = new bookmarkActions.DeleteBookmark({ id : 'bookmarkId' } as any);
      const completion = new bookmarkActions.DeleteBookmarkFailure('failure', 'documentId');
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.deleteBookmark$).toBeObservable(expected);
    });
  });

  describe('updateBookmark$', () => {
    it('uses the active document for a mismatched save after navigation', inject([Store], (store: Store) => {
      const response = new Subject<any>();
      const actions = new Subject<any>();
      actions$ = actions;
      bookmarksApi.updateBookmark.and.returnValue(response);
      const completed: any[] = [];
      const subscription = effects.updateBookmark$.subscribe(action => completed.push(action));
      const payload = { ...bookmark, documentId: 'payload-id' };
      actions.next(new bookmarkActions.UpdateBookmark(payload));
      store.dispatch(new SetDocumentId('other'));
      response.next(payload);
      response.complete();
      expect(completed).toEqual([new bookmarkActions.UpdateBookmarkSuccess(payload, 'documentId')]);
      subscription.unsubscribe();
    }));

    it('does not hold a different document save behind an outstanding request', inject([Store], (store: Store) => {
      const first = { ...bookmark, documentId: 'first' };
      const second = { ...bookmark, id: 'second', documentId: 'second' };
      const firstResponse = new Subject<any>();
      const secondResponse = new Subject<any>();
      const actions = new Subject<any>();
      actions$ = actions;
      bookmarksApi.updateBookmark.calls.reset();
      bookmarksApi.updateBookmark.and.returnValues(firstResponse, secondResponse);
      const subscription = effects.updateBookmark$.subscribe(action => store.dispatch(action));
      store.dispatch(new SetDocumentId('first'));
      store.dispatch(new bookmarkActions.UpdateBookmark(first));
      actions.next(new bookmarkActions.UpdateBookmark(first));
      store.dispatch(new SetDocumentId('second'));
      store.dispatch(new bookmarkActions.UpdateBookmark(second));
      actions.next(new bookmarkActions.UpdateBookmark(second));
      expect(bookmarksApi.updateBookmark).toHaveBeenCalledTimes(2);
      secondResponse.next(second);
      secondResponse.complete();
      firstResponse.next(first);
      firstResponse.complete();
      subscription.unsubscribe();
    }));

    it('saves consecutive bookmarks in order without cancelling the first request', () => {
      const first = { ...bookmark, name: 'first' };
      const second = { ...bookmark, id: 'second', name: 'second' };
      const firstResponse = new Subject<any>();
      const secondResponse = new Subject<any>();
      const actions = new Subject<any>();
      actions$ = actions;
      bookmarksApi.updateBookmark.calls.reset();
      bookmarksApi.updateBookmark.and.returnValues(firstResponse, secondResponse);
      const completed: any[] = [];
      const subscription = effects.updateBookmark$.subscribe(action => completed.push(action));

      actions.next(new bookmarkActions.UpdateBookmark(first));
      actions.next(new bookmarkActions.UpdateBookmark(second));
      expect(bookmarksApi.updateBookmark).toHaveBeenCalledTimes(1);
      firstResponse.next(first);
      firstResponse.complete();
      expect(bookmarksApi.updateBookmark).toHaveBeenCalledTimes(2);
      secondResponse.next(second);
      secondResponse.complete();
      expect(completed).toEqual([
        new bookmarkActions.UpdateBookmarkSuccess(first, first.documentId),
        new bookmarkActions.UpdateBookmarkSuccess(second, second.documentId)
      ]);
      subscription.unsubscribe();
    });

    it('continues with the next save after a request fails', () => {
      const firstResponse = new Subject<any>();
      const second = { ...bookmark, id: 'second' };
      const actions = new Subject<any>();
      actions$ = actions;
      bookmarksApi.updateBookmark.calls.reset();
      bookmarksApi.updateBookmark.and.returnValues(firstResponse, of(second));
      const completed: any[] = [];
      const subscription = effects.updateBookmark$.subscribe(action => completed.push(action));

      actions.next(new bookmarkActions.UpdateBookmark(bookmark));
      actions.next(new bookmarkActions.UpdateBookmark(second));
      firstResponse.error('save failed');
      expect(completed).toEqual([
        new bookmarkActions.UpdateBookmarkFailure('save failed' as any, bookmark.documentId),
        new bookmarkActions.UpdateBookmarkSuccess(second, second.documentId)
      ]);
      expect(bookmarksApi.updateBookmark).toHaveBeenCalledTimes(2);
      subscription.unsubscribe();
    });

    it('should return a UpdateBookmarkSuccess', () => {
      const action = new bookmarkActions.UpdateBookmark(bookmark);
      bookmarksApi.updateBookmark.and.returnValue(of(bookmark));
      const completion = new bookmarkActions.UpdateBookmarkSuccess(bookmark, bookmark.documentId);
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.updateBookmark$).toBeObservable(expected);
    });

    it('should return a UpdateBookmarkFailure', () => {
      const action = new bookmarkActions.UpdateBookmark(bookmark);
      bookmarksApi.updateBookmark.and.returnValue(throwError(bookmark));
      const completion = new bookmarkActions.UpdateBookmarkFailure(bookmark, bookmark.documentId);
      actions$ = hot('-a', { a: action });
      const expected = cold('-b', { b: completion });
      expect(effects.updateBookmark$).toBeObservable(expected);
    });
  });
});
