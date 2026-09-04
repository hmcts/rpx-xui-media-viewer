import { ElementRef } from '@angular/core';
import { TextHighlightDirective } from './text-highlight.directive';

describe('TextHighlightDirective', () => {
  let directive: TextHighlightDirective;
  let hostElement: HTMLDivElement;

  beforeEach(() => {
    hostElement = document.createElement('div');
    hostElement.innerText = 'text';
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

  it('should highlight text containing regular expression characters', () => {
    hostElement.innerText = 'Find item (1).';
    directive.textToHighlight = 'item (1).';

    directive.ngAfterViewChecked();

    expect(hostElement.querySelector('span.mvTextHighlight')?.textContent).toBe('item (1).');
  });

  it('should highlight repeated text matches', () => {
    hostElement.innerText = 'text then text';
    directive.textToHighlight = 'text';

    directive.ngAfterViewChecked();

    expect(hostElement.querySelectorAll('span.mvTextHighlight').length).toBe(2);
  });
});
