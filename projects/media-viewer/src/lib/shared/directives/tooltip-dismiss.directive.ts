import { Directive, ElementRef, HostListener, inject } from "@angular/core";

@Directive({
  selector: '.mv-tooltip, [mvTooltipDismiss]',
  standalone: false
})
export class TooltipDismissDirective {
  private el = inject(ElementRef);


  @HostListener('document:keydown.escape', ['$event'])
  onEscapeDismissTooltip() {
    const element = this.el.nativeElement as HTMLElement;
    element.setAttribute('data-tooltip-dismissed', 'true');
  }

  @HostListener('mouseenter')
  @HostListener('focus')
  @HostListener('focusin')
  onShowTooltip() {
    const element = this.el.nativeElement as HTMLElement;
    element.removeAttribute('data-tooltip-dismissed');
  }

}