import { ElementRef } from '@angular/core';
import { TextHighlightDirective } from './text-highlight.directive';

describe('TextHighlightDirective', () => {
  let directive: TextHighlightDirective;
  const hostElement = document.createElement('div');
  hostElement.innerText = 'text';

  beforeEach(() => {
    directive = new TextHighlightDirective(new ElementRef<HTMLElement>(hostElement));
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

  it('should remove a previous highlight when the search is cleared', () => {
    directive.textToHighlight = 'text';
    directive.ngAfterViewChecked();

    directive.textToHighlight = '';
    directive.ngAfterViewChecked();

    expect(hostElement.querySelector('span.mvTextHighlight')).toBeFalsy();
  });

  it('should highlight replacement content for an unchanged search', () => {
    directive.textToHighlight = 'text';
    directive.ngAfterViewChecked();

    hostElement.innerText = 'replacement text';
    directive.ngAfterViewChecked();

    expect(hostElement.querySelector('span.mvTextHighlight').textContent).toBe('text');
  });
});
