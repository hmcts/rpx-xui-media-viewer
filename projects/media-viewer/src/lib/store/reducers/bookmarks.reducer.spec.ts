import {
  CreateBookmark, CreateBookmarkFailure, CreateBookmarkSuccess,
  DeleteBookmark, DeleteBookmarkFailure, MoveBookmark, MoveBookmarkFailure,
  LoadBookmarks,
  LoadBookmarksFailure,
  LoadBookmarksSuccess,
  DeleteBookmarkSuccess,
  UpdateBookmark, UpdateBookmarkFailure, UpdateBookmarkSuccess, MoveBookmarkSuccess,
  UpdateBookmarkScrollTop
} from '../actions/bookmark.actions';
import * as fromBookmarks from './bookmarks.reducer';
import * as fromDocActions from '../actions/document.actions';
import { TestBed } from '@angular/core/testing';
import { Store, StoreModule } from '@ngrx/store';
import { reducers, State } from './reducers';

describe('BookmarksReducer', () => {

  const bookmark = {
    name: 'bookmark', xCoordinate: 100, yCoordinate: 50, documentId: 'documentId', id: 'id', pageNumber: 1, zoom: 1
  } as any;

  let store: Store<State>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forRoot({}),
        StoreModule.forFeature('media-viewer', reducers),
      ],
    });
    store = TestBed.inject(Store);
    spyOn(store, 'dispatch').and.callThrough();
  });

  it('should start loading  bookmarks', () => {
    const state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new LoadBookmarks());

    expect(state.bookmarks).toEqual([]);
    expect(state.bookmarkEntities).toEqual({});
    expect(state.editableBookmark).toBeUndefined();
    expect(state.loaded).toBeFalse();
    expect(state.loading).toBeTrue();
  });

  it('should load bookmarks on success', () => {
    const bookmarks = [bookmark];
    const res = { body: bookmarks, status: 200 };
    const state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new LoadBookmarksSuccess(res));

    expect(state.bookmarks).toEqual(bookmarks);
    expect(state.loaded).toBeTrue();
    expect(state.loading).toBeFalse();
  });

  it('should load bookmarks on failure', () => {
    const res = { body: [], status: 404 };
    const state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new LoadBookmarksFailure(res));

    expect(state.bookmarks).toEqual([]);
    expect(state.loaded).toBeTrue();
    expect(state.loading).toBeFalse();
  });

  it('should load created bookmark', () => {
    const state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new CreateBookmarkSuccess(bookmark));

    expect(state.bookmarkEntities).toEqual({ [bookmark.id]: bookmark });
    expect(state.loaded).toBeTrue();
    expect(state.loading).toBeFalse();
  });

  it('should load update bookmark scroll top', () => {
    const scrollTop = 195;
    const state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new UpdateBookmarkScrollTop(scrollTop));

    expect(state.scrollTop).toEqual(scrollTop);
  });

  it('should delete bookmark', () => {
    const bookmarksState: fromBookmarks.BookmarksState = {
      bookmarks: [bookmark],
      bookmarkEntities: { [bookmark.id]: bookmark },
      bookmarkPageEntities: { [bookmark.pageNumber]: [bookmark] },
      editableBookmark: undefined,
      loaded: true,
      loading: false
    };
    store.dispatch(new fromDocActions.AddPages([{
      div: {
        offsetHeight: 466.666
      },
      scale: 1,
      rotation: 0,
      id: '1',
      viewportScale: 1.33333
    }]));

    const state = fromBookmarks.bookmarksReducer(bookmarksState, new DeleteBookmarkSuccess([bookmark.id]));
    expect(state.bookmarkEntities).toEqual({});
    expect(state.loaded).toBeTrue();
    expect(state.loading).toBeFalse();
  });


  it('should update bookmark', () => {
    const bookmarksState: fromBookmarks.BookmarksState = {
      bookmarks: [bookmark],
      bookmarkEntities: { [bookmark.id]: bookmark },
      bookmarkPageEntities: { [bookmark.pageNumber]: [bookmark] },

      editableBookmark: undefined,
      loaded: true,
      loading: false
    };
    bookmark.name = 'updated bookmark';

    const state = fromBookmarks.bookmarksReducer(bookmarksState, new UpdateBookmarkSuccess(bookmark));

    expect(state.bookmarkEntities).toEqual({ [bookmark.id]: bookmark });
    expect(state.loaded).toBeTrue();
    expect(state.loading).toBeFalse();
  });

  it('does not close a newer draft when an earlier bookmark save completes', () => {
    const editing = { ...fromBookmarks.initialBookmarksState, editableBookmark: bookmark.id };
    const saving = fromBookmarks.bookmarksReducer(editing, new UpdateBookmark(bookmark));
    expect(saving.editableBookmark).toBeUndefined();

    const newerBookmark = { ...bookmark, id: 'newer' };
    const newerDraft = fromBookmarks.bookmarksReducer(saving, new CreateBookmarkSuccess(newerBookmark));
    const saved = fromBookmarks.bookmarksReducer(newerDraft, new UpdateBookmarkSuccess(bookmark));
    expect(saved.editableBookmark).toBe(newerBookmark.id);
    expect(saved.bookmarkEntities[bookmark.id]).toEqual(bookmark);
  });

  it('preserves a different draft when an update starts or fails', () => {
    const editing = { ...fromBookmarks.initialBookmarksState, editableBookmark: 'newer' };
    const saving = fromBookmarks.bookmarksReducer(editing, new UpdateBookmark(bookmark));
    const failed = fromBookmarks.bookmarksReducer(saving, new UpdateBookmarkFailure(bookmark));
    expect(saving.editableBookmark).toBe('newer');
    expect(failed.editableBookmark).toBe('newer');
  });

  it('keeps pending saves scoped to their document across navigation and return', () => {
    let state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new fromDocActions.SetDocumentId('documentId'));
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmark(bookmark));
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmark(bookmark));
    state = fromBookmarks.bookmarksReducer(state, new fromDocActions.SetDocumentId('other'));
    expect(state.pendingSaves).toBe(0);
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmarkSuccess(bookmark, 'documentId'));
    expect(state.bookmarkEntities[bookmark.id]).toBeUndefined();
    state = fromBookmarks.bookmarksReducer(state, new fromDocActions.SetDocumentId('documentId'));
    expect(state.pendingSaves).toBe(1);
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmarkFailure({ status: 0 } as any, 'documentId'));
    expect(state.pendingSaves).toBe(0);
  });

  it('keeps loading true until the document load finishes after a pending save', () => {
    let state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new fromDocActions.SetDocumentId('documentId'));
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmark(bookmark));
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmarkSuccess(bookmark, 'documentId'));
    expect(state.loading).toBeTrue();
    state = fromBookmarks.bookmarksReducer(state, new LoadBookmarksSuccess({ body: [bookmark], status: 200 }, 'documentId'));
    expect(state.loading).toBeFalse();
  });

  it('settles child save and move completions without exposing a partial tree during reload', () => {
    const child = { ...bookmark, id: 'child', parent: 'parent' };
    let state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new fromDocActions.SetDocumentId('documentId'));
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmark(child));
    state = fromBookmarks.bookmarksReducer(state, new MoveBookmark([child]));
    state = fromBookmarks.bookmarksReducer(state, new fromDocActions.SetDocumentId('other'));
    state = fromBookmarks.bookmarksReducer(state, new fromDocActions.SetDocumentId('documentId'));
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmarkSuccess(child, 'documentId'));
    state = fromBookmarks.bookmarksReducer(state, new MoveBookmarkSuccess([child], 'documentId'));
    expect(state.pendingSaves).toBe(0);
    expect(state.pendingStructure).toBeFalse();
    expect(state.bookmarkEntities).toEqual({});
    expect(state.loading).toBeTrue();
  });

  it('settles a pending delete after returning to its document before reloading', () => {
    let state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new fromDocActions.SetDocumentId('documentId'));
    state = fromBookmarks.bookmarksReducer(state, new DeleteBookmark({ deleted: [bookmark.id], updated: undefined }));
    state = fromBookmarks.bookmarksReducer(state, new fromDocActions.SetDocumentId('other'));
    state = fromBookmarks.bookmarksReducer(state, new fromDocActions.SetDocumentId('documentId'));
    expect(state.pendingStructure).toBeTrue();
    state = fromBookmarks.bookmarksReducer(state, new DeleteBookmarkSuccess([bookmark.id], 'documentId'));
    expect(state.pendingStructure).toBeFalse();
    expect(state.bookmarkEntities).toEqual({});
    expect(state.loading).toBeTrue();
  });

  it('ignores an old document delete completion without dereferencing missing bookmarks', () => {
    let state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new fromDocActions.SetDocumentId('documentId'));
    state = fromBookmarks.bookmarksReducer(state, new DeleteBookmark({ deleted: [bookmark.id], updated: undefined }));
    state = fromBookmarks.bookmarksReducer(state, new fromDocActions.SetDocumentId('other'));
    state = fromBookmarks.bookmarksReducer(state, new DeleteBookmarkSuccess([bookmark.id], 'documentId'));
    expect(state.bookmarkEntities).toEqual({});
    state = fromBookmarks.bookmarksReducer(state, new fromDocActions.SetDocumentId('documentId'));
    expect(state.pendingStructure).toBeFalse();
  });

  it('tracks overlapping saves until every success or failure settles', () => {
    let state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new UpdateBookmark(bookmark));
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmark(bookmark));
    expect(state.pendingSaves).toBe(2);
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmarkFailure({ status: 0 } as any));
    expect(state.pendingSaves).toBe(1);
    state = fromBookmarks.bookmarksReducer(state, new UpdateBookmarkSuccess(bookmark));
    expect(state.pendingSaves).toBe(0);
  });

  it('releases create and structural guards on failures', () => {
    let state = fromBookmarks.bookmarksReducer(fromBookmarks.initialBookmarksState, new CreateBookmark(bookmark));
    expect(state.pendingCreates).toBe(1);
    state = fromBookmarks.bookmarksReducer(state, new CreateBookmarkFailure({ status: 0 } as any));
    expect(state.pendingCreates).toBe(0);
    state = fromBookmarks.bookmarksReducer(state, new MoveBookmark([bookmark]));
    expect(state.pendingStructure).toBeTrue();
    state = fromBookmarks.bookmarksReducer(state, new MoveBookmarkFailure('failure'));
    expect(state.pendingStructure).toBeFalse();
    state = fromBookmarks.bookmarksReducer(state, new DeleteBookmark({ deleted: [bookmark.id], updated: undefined }));
    expect(state.pendingStructure).toBeTrue();
    state = fromBookmarks.bookmarksReducer(state, new DeleteBookmarkFailure('failure'));
    expect(state.pendingStructure).toBeFalse();
  });

  it('should move bookmark on success', () => {
    const bookmark2 = { ...bookmark, name: 'bookmark 2', id: 'id2', previous: 'id' };
    const bookmarksState: fromBookmarks.BookmarksState = {
      bookmarks: [{ ...bookmark }, bookmark2],
      bookmarkEntities: { [bookmark.id]: { ...bookmark }, [bookmark2.id]: bookmark2 },
      bookmarkPageEntities: { [bookmark.pageNumber]: [bookmark] },
      editableBookmark: undefined,
      loaded: true,
      loading: false
    };
    bookmark.previous = 'id2';
    bookmark2.previous = undefined;

    const state = fromBookmarks.bookmarksReducer(bookmarksState, new MoveBookmarkSuccess([bookmark, bookmark2]));

    expect(state.bookmarkEntities['id'].previous).toEqual('id2');
    expect(state.bookmarkEntities['id2'].previous).toBeUndefined();
  });
});
