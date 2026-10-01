import { ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { TextHighlightDirective } from './text-highlight.directive';

describe('TextHighlightDirective', () => {
  let directive: TextHighlightDirective;
  const hostElement = document.createElement('div');
  hostElement.innerText = 'text';

  beforeEach(() => {
    directive = runInInjectionContext(
      Injector.create({ providers: [{ provide: ElementRef, useValue: new ElementRef<HTMLElement>(hostElement) }] }),
      () => new TextHighlightDirective()
    );
  });

  it('should highlight text when it matches input', () => {
    directive.textToHighlight = 'text';

    directive.ngAfterViewChecked();

    expect(hostElement.querySelector('span.mvTextHighlight')).toBeTruthy();
  });

  it('should not highlight text it does not match input text', () => {
    directive.textToHighlight = 'not the search word';

    directive.ngAfterViewChecked();

    expect(hostElement.querySelector('span.mvTextHighlight')).toBeFalsy();
  });

  it('should reset highlight', () => {
    directive.textToHighlight = 'text';

    directive.ngAfterViewChecked();
    directive.resetHighlight();

    expect(hostElement.querySelector('span.mvTextHighlight')).toBeFalsy();
  });
});
