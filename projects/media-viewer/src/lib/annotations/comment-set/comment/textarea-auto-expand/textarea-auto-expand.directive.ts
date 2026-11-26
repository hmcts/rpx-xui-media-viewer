import { AfterContentChecked, Directive, ElementRef, HostBinding, HostListener, inject } from '@angular/core';

@Directive({
    selector: '[mvTextAreaAutoExpand]',
    standalone: false
})
export class TextareaAutoExpandDirective implements AfterContentChecked {
  private el = inject(ElementRef);

  @HostBinding('class.textarea-auto-expand') readonly autoExpandClass = true;


  ngAfterContentChecked(): void {
    this.adjustHeight();
  }

  @HostListener('input') onMouseDown() {
    this.adjustHeight();
  }

  adjustHeight(): void {
    // TODO STYLE: Replace inline styles with CSS classes
    const nativeElement = this.el.nativeElement;
    nativeElement.style.height = 'auto';
    nativeElement.style.height = nativeElement.scrollHeight - 5 + 'px';
  }

}
