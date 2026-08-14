import { AfterViewChecked, Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[mvTextHighlight]',
    standalone: false
})
export class TextHighlightDirective implements AfterViewChecked {

  @Input() textToHighlight: string;
  private previousTextToHighlight: string;
  private previousContent: string;

  constructor(private element: ElementRef<HTMLElement>) {}

  ngAfterViewChecked(): void {
    const content = this.element.nativeElement.textContent;
    if (this.textToHighlight === this.previousTextToHighlight && content === this.previousContent) {
      return;
    }

    this.resetHighlight();
    if (this.textToHighlight) {
      this.highlightInputText(this.textToHighlight);
    }
    this.previousTextToHighlight = this.textToHighlight;
    this.previousContent = this.element.nativeElement.textContent;
  }

  highlightInputText(textToHighlight: string) {
    const searchPattern = new RegExp(textToHighlight, 'gi');
    const hostElement = this.element.nativeElement;
    if (hostElement.innerHTML.match(searchPattern)) {
      hostElement.innerHTML = hostElement.innerHTML
        .replace(searchPattern, this.highlightPattern('$&'));
    }
  }

  resetHighlight() {
    const hostElement = this.element.nativeElement;
    const searchPattern = new RegExp(this.highlightPattern('(.*?)'), 'gi');
    while (hostElement.innerHTML.match(searchPattern)) {
      const matchGroups = searchPattern.exec(hostElement.innerHTML);
      if (matchGroups) {
        hostElement.innerHTML = hostElement.innerHTML.replace(matchGroups[0], matchGroups[1]);
      }
    }
  }

  private highlightPattern(dynamicText: string) {
    return '<span class="mvTextHighlight">' + dynamicText + '</span>';
  }
}
