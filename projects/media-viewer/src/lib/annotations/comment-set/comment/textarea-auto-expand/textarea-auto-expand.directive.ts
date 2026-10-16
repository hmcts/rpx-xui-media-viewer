import { AfterContentChecked, Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
    selector: '[mvTextAreaAutoExpand]',
    standalone: false
})
export class TextareaAutoExpandDirective implements AfterContentChecked {
  private el = inject(ElementRef);


  ngAfterContentChecked(): void {
    this.adjustHeight();
  }

  @HostListener('input') onMouseDown() {
    this.adjustHeight();
  }

  adjustHeight(): void {
    const nativeElement = this.el.nativeElement;
    nativeElement.style.overflow = 'hidden';
    nativeElement.style.height = 'auto';
    nativeElement.style.height = nativeElement.scrollHeight - 5 + 'px';
  }

}
