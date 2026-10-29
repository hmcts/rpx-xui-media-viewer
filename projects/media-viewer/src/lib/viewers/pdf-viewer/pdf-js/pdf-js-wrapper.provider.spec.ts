import { Injector, runInInjectionContext } from '@angular/core';
import { PdfJsWrapperFactory } from './pdf-js-wrapper.provider';
import { Subject } from 'rxjs';
import { ToolbarEventService } from '../../../toolbar/toolbar-event.service';
import { IcpEventService } from '../../../toolbar/icp-event.service';

describe('PdfJsWrapperFactory', () => {
  const icpEventService = jasmine.createSpyObj('IcpEventService', ['confirmExit', 'leavingSession']);

  it('creates a wrapper', () => {
    const elementRef = {
      nativeElement: document.createElement('div')
    }
    elementRef.nativeElement.appendChild(document.createElement('div'));
    const factory = runInInjectionContext(
      Injector.create({ providers: [
        { provide: IcpEventService, useValue: icpEventService },
        ToolbarEventService
      ] }),
      () => new PdfJsWrapperFactory()
    );
    const wrapper = factory.create(elementRef);

    expect(wrapper).not.toBeNull();
    expect(wrapper.documentLoadInit).toBeInstanceOf(Subject);
    expect(wrapper.documentLoadProgress).toBeInstanceOf(Subject);
    expect(wrapper.documentLoaded).toBeInstanceOf(Subject);
    expect(wrapper.outlineLoaded).toBeInstanceOf(Subject);
    expect(wrapper.documentLoadFailed).toBeInstanceOf(Subject);
    expect(wrapper.pageRendered).toBeInstanceOf(Subject);
    expect(wrapper.positionUpdated).toBeInstanceOf(Subject);
  });
});
