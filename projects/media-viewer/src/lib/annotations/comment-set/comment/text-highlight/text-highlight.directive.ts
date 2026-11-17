import { AfterViewChecked, Directive, ElementRef, Input, inject } from '@angular/core';

@Directive({
    selector: '[mvTextHighlight]',
    standalone: false
})
export class TextHighlightDirective implements AfterViewChecked {
  private element = inject<ElementRef<HTMLElement>>(ElementRef);


  @Input() textToHighlight: string;

  ngAfterViewChecked(): void {
    if (this.textToHighlight) {
      this.highlightInputText(this.textToHighlight);
    }
  }

  highlightInputText(textToHighlight: string) {
    this.resetHighlight();
    this.textToHighlight = textToHighlight;
    const searchPattern = new RegExp(textToHighlight, 'gi');
    const hostElement = this.element.nativeElement;
    if (hostElement.innerHTML.match(searchPattern)) {
      hostElement.innerHTML = hostElement.innerHTML
        .replace(searchPattern, this.highlightPattern('$&'));
    }
    this.textToHighlight = undefined;
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
