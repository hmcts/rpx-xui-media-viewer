import { ComponentFixture, fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { CUSTOM_ELEMENTS_SCHEMA, SimpleChange, SimpleChanges } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import * as fromSelectors from '../../store/selectors/document.selectors';
import { Convert } from '../../store/actions/document.actions';
import { GrabNDragDirective } from '../grab-n-drag.directive';
import { ResponseType, ViewerException } from '../viewer-exception.model';
import { ConvertibleContentViewerComponent } from './convertible-content-viewer.component';

describe('ConvertibleContentViewerComponent', () => {
  let component: ConvertibleContentViewerComponent;
  let fixture: ComponentFixture<ConvertibleContentViewerComponent>;
  const DOCUMENT_URL = '/documents/111/binary';
  const initialState = {
    'media-viewer': {
      document: {
        convertedDocument: {
          url: 'sample-url',
          error: ''
        }
      }
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        ConvertibleContentViewerComponent,
        GrabNDragDirective
      ],
      imports: [
      ],
      providers: [
        provideMockStore({ initialState }),
      ],
      schemas: [
        CUSTOM_ELEMENTS_SCHEMA,
      ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConvertibleContentViewerComponent);
    component = fixture.componentInstance;
    component.originalUrl = DOCUMENT_URL;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should convert original url',
    inject([Store], (store: Store<{}>) => {
      spyOn(store, 'dispatch');
      component.ngOnInit();
      component.ngOnChanges(
        {
          originalUrl: {
            currentValue: DOCUMENT_URL,
            previousValue: null,
            firstChange: true
          }
        } as unknown as SimpleChanges);

      expect(store.dispatch).toHaveBeenCalledWith(new Convert('111'));
    }));

  it('should emit viewerException', fakeAsync(() => {
    spyOn(component.viewerException, 'emit');
    spyOn(component.mediaLoadStatus, 'emit');
    component.onLoadException(new ViewerException());
    tick();

    expect(component.viewerException.emit).toHaveBeenCalled();
    expect(component.mediaLoadStatus.emit).toHaveBeenCalledWith(ResponseType.FAILURE);
  }));

  it('should emit one failure status when the PDF viewer reports a failure and exception', () => {
    spyOn(component.viewerException, 'emit');
    spyOn(component.mediaLoadStatus, 'emit');
    const exception = new ViewerException();

    component.onMediaLoad(ResponseType.FAILURE);
    component.onPdfViewerException(exception);

    expect(component.mediaLoadStatus.emit).toHaveBeenCalledTimes(1);
    expect(component.mediaLoadStatus.emit).toHaveBeenCalledWith(ResponseType.FAILURE);
    expect(component.viewerException.emit).toHaveBeenCalledTimes(1);
    expect(component.viewerException.emit).toHaveBeenCalledWith(exception);
  });

  it('should emit exactly one failure status and exception for a conversion error from the store', inject([MockStore], (store: MockStore) => {
    const statusSpy = spyOn(component.mediaLoadStatus, 'emit');
    const exceptionSpy = spyOn(component.viewerException, 'emit');
    store.overrideSelector(fromSelectors.getConvertedDocument, { url: undefined, error: 'conversion failed' });
    store.refreshState();

    expect(statusSpy).toHaveBeenCalledTimes(1);
    expect(statusSpy).toHaveBeenCalledWith(ResponseType.FAILURE);
    expect(exceptionSpy).toHaveBeenCalledTimes(1);
    expect(exceptionSpy).toHaveBeenCalledWith(jasmine.objectContaining({ exceptionType: 'conversion failed' }));
  }));

  it('should emit documentTitle', fakeAsync(() => {
    spyOn(component.documentTitle, 'emit');
    component.onDocumentTitleChange('');
    tick();

    expect(component.documentTitle.emit).toHaveBeenCalled();
  }));

  it('should emit mediaLoadStatus', fakeAsync(() => {
    spyOn(component.mediaLoadStatus, 'emit');
    component.onMediaLoad(ResponseType.SUCCESS);
    tick();

    expect(component.mediaLoadStatus.emit).toHaveBeenCalled();
  }));
});
