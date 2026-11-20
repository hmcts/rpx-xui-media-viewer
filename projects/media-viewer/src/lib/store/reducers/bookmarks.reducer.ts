import * as fromBookmarks from '../actions/bookmark.actions';
import * as fromDocument from '../actions/document.actions';
import { Bookmark } from '../../viewers/pdf-viewer/side-bar/bookmarks/bookmarks.interfaces';
import { StoreUtils } from '../store-utils';
import { generateBookmarkEntities } from '../bookmarks-store-utils';

interface PendingMutations { saves: number; creates: number; structure: boolean; }

export interface BookmarksState {
  bookmarks: Bookmark[];
  bookmarkEntities: { [id: string]: Bookmark };
  bookmarkPageEntities: { [id: string]: any };
  editableBookmark: string;
  loaded: boolean;
  loading: boolean;
  scrollTop?: number;
  pendingSaves?: number;
  pendingCreates?: number;
  pendingStructure?: boolean;
  activeDocumentId?: string;
  pendingByDocument?: { [documentId: string]: PendingMutations };
}

export const initialBookmarksState: BookmarksState = {
  bookmarks: [],
  bookmarkEntities: {},
  bookmarkPageEntities: {},
  editableBookmark: undefined,
  loaded: false,
  loading: false,
  scrollTop: null,
  pendingSaves: 0,
  pendingCreates: 0,
  pendingStructure: false,
  pendingByDocument: {},
};

export function bookmarksReducer(state = initialBookmarksState,
  action: fromBookmarks.BookmarksActions | fromDocument.SetDocumentId): BookmarksState {

  if (action.type === fromDocument.SET_DOCUMENT_ID) {
    if (state.activeDocumentId === action.payload) return state;
    const pendingByDocument = { ...state.pendingByDocument };
    if (state.activeDocumentId) {
      const pending = { saves: state.pendingSaves || 0, creates: state.pendingCreates || 0, structure: !!state.pendingStructure };
      if (pending.saves || pending.creates || pending.structure) pendingByDocument[state.activeDocumentId] = pending;
      else delete pendingByDocument[state.activeDocumentId];
    }
    const pending = pendingByDocument[action.payload] || { saves: 0, creates: 0, structure: false };
    return { ...initialBookmarksState, activeDocumentId: action.payload, pendingByDocument,
      pendingSaves: pending.saves, pendingCreates: pending.creates, pendingStructure: pending.structure, loading: true };
  }

  if ('documentId' in action && action.documentId && action.documentId !== state.activeDocumentId) {
    const pendingByDocument = { ...state.pendingByDocument };
    const pending = { ...(pendingByDocument[action.documentId] || { saves: 0, creates: 0, structure: false }) };
    switch (action.type) {
      case fromBookmarks.CREATE_BOOKMARK_SUCCESS:
      case fromBookmarks.CREATE_BOOKMARK_FAIL:
        pending.creates = Math.max(0, pending.creates - 1); break;
      case fromBookmarks.UPDATE_BOOKMARK_SUCCESS:
      case fromBookmarks.UPDATE_BOOKMARK_FAIL:
        pending.saves = Math.max(0, pending.saves - 1); break;
      case fromBookmarks.MOVE_BOOKMARK_SUCCESS:
      case fromBookmarks.MOVE_BOOKMARK_FAIL:
      case fromBookmarks.DELETE_BOOKMARK_SUCCESS:
      case fromBookmarks.DELETE_BOOKMARK_FAIL:
        pending.structure = false; break;
    }
    if (pending.saves || pending.creates || pending.structure) pendingByDocument[action.documentId] = pending;
    else delete pendingByDocument[action.documentId];
    return { ...state, pendingByDocument };
  }

  switch (action.type) {

    case fromBookmarks.LOAD_BOOKMARKS: {
      return {
        ...state,
        loading: true
      };
    }

    case fromBookmarks.LOAD_BOOKMARKS_SUCCESS:
    case fromBookmarks.LOAD_BOOKMARKS_FAIL: {
      const bookmarks = action.payload.status === 200 ? action.payload.body : [];
      const bookmarkEntities = generateBookmarkEntities(bookmarks);
      const bookmarkPageEntities = StoreUtils.groupByKeyEntities(bookmarks, 'pageNumber');

      return {
        ...state,
        bookmarks,
        bookmarkEntities,
        bookmarkPageEntities,
        loading: false,
        loaded: true
      };
    }

    case fromBookmarks.CREATE_BOOKMARK: {
      return { ...state, pendingCreates: (state.pendingCreates || 0) + 1 };
    }

    case fromBookmarks.CREATE_BOOKMARK_FAIL: {
      return { ...state, pendingCreates: Math.max(0, (state.pendingCreates || 0) - 1) };
    }

    case fromBookmarks.MOVE_BOOKMARK:
    case fromBookmarks.DELETE_BOOKMARK: {
      return { ...state, pendingStructure: true };
    }

    case fromBookmarks.MOVE_BOOKMARK_FAIL:
    case fromBookmarks.DELETE_BOOKMARK_FAIL: {
      return { ...state, pendingStructure: false };
    }

    case fromBookmarks.UPDATE_BOOKMARK_FAIL: {
      return { ...state, pendingSaves: Math.max(0, (state.pendingSaves || 0) - 1) };
    }

    case fromBookmarks.CREATE_BOOKMARK_SUCCESS: {
      if (state.loading) return { ...state, pendingCreates: Math.max(0, (state.pendingCreates || 0) - 1) };
      const bookmark: Bookmark = action.payload;
      const bookmarkEntities = {
        ...state.bookmarkEntities,
        [bookmark.id]: bookmark,
      };
      const bookmarkArray = Object.keys(bookmarkEntities).map(key => bookmarkEntities[key]);
      const bookmarkPageEntities = StoreUtils.groupByKeyEntities(bookmarkArray, 'pageNumber');
      const editableBookmark = bookmark.id;
      return {
        ...state,
        bookmarkEntities,
        editableBookmark,
        pendingCreates: Math.max(0, (state.pendingCreates || 0) - 1),
        bookmarkPageEntities,
        loaded: true
      };
    }

    case fromBookmarks.MOVE_BOOKMARK_SUCCESS: {
      if (state.loading) return { ...state, pendingStructure: false };
      const movedBookmarks = generateBookmarkEntities(action.payload);
      const bookmarkEntities = {
        ...state.bookmarkEntities,
        ...movedBookmarks
      };
      return {
        ...state,
        pendingStructure: false,
        bookmarkEntities,
        loaded: true
      };
    }

    case fromBookmarks.DELETE_BOOKMARK_SUCCESS: {
      if (state.loading) return { ...state, pendingStructure: false };
      const bookmarkIds: string[] = action.payload;
      const bookmarkEntities = { ...state.bookmarkEntities };
      const bookmarkPageEntities = { ...state.bookmarkPageEntities };
      const removeBookmarksByPage: { [pageNumber: number]: string[] } = {};
      bookmarkIds.forEach(bookmarkId => {
        if (!bookmarkEntities[bookmarkId]) return;
        if (removeBookmarksByPage[bookmarkEntities[bookmarkId].pageNumber] !== undefined &&
          removeBookmarksByPage[bookmarkEntities[bookmarkId].pageNumber].length > 0) {
          removeBookmarksByPage[bookmarkEntities[bookmarkId].pageNumber].push(bookmarkId);
        } else {
          removeBookmarksByPage[bookmarkEntities[bookmarkId].pageNumber] = [bookmarkId];
        }
        delete bookmarkEntities[bookmarkId];
      });

      Object.entries(removeBookmarksByPage).forEach(
        ([pageNumber, bmrkIds]) => {
          bookmarkPageEntities[pageNumber]
            = bookmarkPageEntities[pageNumber].filter(bookmark => !bmrkIds.includes(bookmark.id));
        }
      );

      return {
        ...state,
        bookmarkEntities,
        bookmarkPageEntities,
        pendingStructure: false,
        loaded: true
      };
    }

    case fromBookmarks.UPDATE_BOOKMARK: {
      return { ...state, pendingSaves: (state.pendingSaves || 0) + 1,
        editableBookmark: state.editableBookmark === action.payload.id ? undefined : state.editableBookmark };
    }

    case fromBookmarks.UPDATE_BOOKMARK_SUCCESS: {
      if (state.loading) return { ...state, pendingSaves: Math.max(0, (state.pendingSaves || 0) - 1) };
      const bookmark: Bookmark = action.payload;
      const bookmarkEntities = {
        ...state.bookmarkEntities,
        [bookmark.id]: { ...bookmark }
      };
      const bookmarkArray = Object.keys(bookmarkEntities).map(key => bookmarkEntities[key]);
      const bookmarkPageEntities = StoreUtils.groupByKeyEntities(bookmarkArray, 'pageNumber');
      return {
        ...state,
        bookmarkEntities,
        bookmarkPageEntities,
        pendingSaves: Math.max(0, (state.pendingSaves || 0) - 1),
        loaded: true
      };
    }
    case fromBookmarks.UPDATE_BOOKMARK_SCROLL_TOP: {
      const scrollTop: number = action.payload;
      return {
        ...state,
        scrollTop: scrollTop
      }
    }
  }
  return state;
}

export const getBookmarks = (state: BookmarksState) => state.bookmarks;
export const getBookmarkEnts = (state: BookmarksState) => state.bookmarkEntities;
export const getBookmarkPageEnt = (state: BookmarksState) => state.bookmarkPageEntities;
export const getEditBookmark = (state: BookmarksState) => state.editableBookmark;
export const getScrollTop = (state: BookmarksState) => state.scrollTop;
