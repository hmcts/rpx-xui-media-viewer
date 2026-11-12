import { Directive, ElementRef, HostListener, inject } from "@angular/core";

@Directive({
  selector: '.mv-tooltip, [mvTooltipDismiss]',
  standalone: false
})
export class TooltipDismissDirective {
  private readonly el = inject(ElementRef);


  @HostListener('document:keydown.escape', ['$event'])
  onEscapeDismissTooltip() {
    const element = this.el.nativeElement as HTMLElement;
    element.dataset.tooltipDismissed = 'true';
  }

  @HostListener('mouseenter')
  @HostListener('focus')
  @HostListener('focusin')
  onShowTooltip() {
    const element = this.el.nativeElement as HTMLElement;
    delete element.dataset.tooltipDismissed;
  }

}
