import { AfterViewChecked, Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[mvTextHighlight]',
    standalone: false
})
export class TextHighlightDirective implements AfterViewChecked {

  @Input() textToHighlight: string;

  constructor(private element: ElementRef<HTMLElement>) {}

  ngAfterViewChecked(): void {
    if (this.textToHighlight) {
      this.highlightInputText(this.textToHighlight);
    }
  }

  highlightInputText(textToHighlight: string) {
    this.resetHighlight();
    this.textToHighlight = textToHighlight;
    const searchPattern = new RegExp(this.escapeRegExp(textToHighlight), 'gi');
    const hostElement = this.element.nativeElement;
    this.highlightTextNodes(hostElement, searchPattern);
    this.textToHighlight = undefined;
  }

  resetHighlight() {
    const hostElement = this.element.nativeElement;
    Array.from(hostElement.querySelectorAll('span.mvTextHighlight')).forEach((highlightElement) => {
      highlightElement.replaceWith(document.createTextNode(highlightElement.textContent || ''));
    });
    hostElement.normalize();
  }

  private highlightTextNodes(hostElement: HTMLElement, searchPattern: RegExp) {
    const walker = document.createTreeWalker(hostElement, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();

    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }

    textNodes.forEach((textNode) => this.highlightTextNode(textNode, searchPattern));
  }

  private highlightTextNode(textNode: Text, searchPattern: RegExp) {
    const text = textNode.textContent || '';
    const matches = Array.from(text.matchAll(searchPattern));

    if (matches.length === 0) {
      return;
    }

    const fragment = document.createDocumentFragment();
    let currentIndex = 0;

    matches.forEach((match) => {
      const matchIndex = match.index || 0;
      const matchText = match[0];

      if (matchIndex > currentIndex) {
        fragment.appendChild(document.createTextNode(text.slice(currentIndex, matchIndex)));
      }

      const highlightElement = document.createElement('span');
      highlightElement.className = 'mvTextHighlight';
      highlightElement.textContent = matchText;
      fragment.appendChild(highlightElement);
      currentIndex = matchIndex + matchText.length;
    });

    if (currentIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(currentIndex)));
    }

    textNode.replaceWith(fragment);
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
