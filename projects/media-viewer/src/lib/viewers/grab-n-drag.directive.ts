import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';


@Directive({
    selector: '[mvGrabNDrag]',
    standalone: false
})
export class GrabNDragDirective {
  private el = inject(ElementRef);


  originalPosition: { left: number; top: number };
  private pointerDown = false;

  @Input() dragEnabled = false;
  @Input() dragX: Element;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    if (this.dragEnabled) {
      event.preventDefault();
      this.pointerDown = true;
      this.originalPosition = {
        left: event.clientX + this.el.nativeElement.scrollLeft,
        top: event.clientY + this.el.nativeElement.scrollTop,
      };
    }
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (this.pointerDown && this.dragEnabled) {
      event.preventDefault();
      const scrollDiff = {
        left: this.originalPosition.left - (event.clientX + this.el.nativeElement.scrollLeft),
        top: this.originalPosition.top - (event.clientY + this.el.nativeElement.scrollTop)
      };
      if (this.dragEnabled) {
        this.dragX.scrollLeft += scrollDiff.left;
        this.el.nativeElement.scrollTop += scrollDiff.top;
      }
    }
  }

  @HostListener('window:pointerup') onWindowPointerUp() {
    this.pointerDown = false;
  }
}
