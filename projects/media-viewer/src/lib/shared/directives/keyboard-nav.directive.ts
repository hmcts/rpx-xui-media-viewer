import { Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';

export type KeyboardNavOrientation = 'horizontal' | 'vertical';

@Directive({
  selector: '[mvKeyboardNav]',
  standalone: false
})
export class KeyboardNavDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input('mvKeyboardNav') orientation: KeyboardNavOrientation = 'horizontal';
  @Output() itemFocused = new EventEmitter<HTMLElement>();
  @Output() itemActivated = new EventEmitter<HTMLElement>();

  private focusableItems: HTMLElement[] = [];
  private currentFocusIndex = -1;
  private mutationObserver: MutationObserver;
  private isUsingArrowKeys = false;

  ngOnInit(): void {
    this.updateFocusableItems();
    this.setupMutationObserver();
  }

  ngOnDestroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver(() => {
      this.updateFocusableItems();
    });

    this.mutationObserver.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'disabled', 'hidden']
    });
  }

  private updateFocusableItems(): void {
    const allItems = Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])')
    );

    this.focusableItems = allItems.filter(item => this.isVisible(item));

    if (this.isUsingArrowKeys) {
      this.applyArrowKeyTabindex();
    } else {
      this.focusableItems.forEach(item => {
        if (!item.hasAttribute('tabindex') || item.getAttribute('tabindex') === '-1') {
          item.setAttribute('tabindex', '0');
        }
      });
    }
  }

  private isVisible(element: HTMLElement): boolean {
    if (!element) {
      return false;
    }

    if (element.hasAttribute('disabled')) {
      return false;
    }

    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return false;
    }

    // check if any parent element is hidden (up to the directive's host element)
    let parent = element.parentElement;
    while (parent && parent !== this.elementRef.nativeElement) {
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
        return false;
      }
      parent = parent.parentElement;
    }

    return true;
  }

  private applyArrowKeyTabindex(): void {
    if (this.focusableItems.length === 0) {
      return;
    }

    let indexToMakeTabbable = 0;

    if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableItems.length) {
      indexToMakeTabbable = this.currentFocusIndex;
    } else {
      const focusedElement = document.activeElement as HTMLElement;
      const focusedIndex = this.focusableItems.indexOf(focusedElement);
      if (focusedIndex !== -1) {
        indexToMakeTabbable = focusedIndex;
        this.currentFocusIndex = focusedIndex;
      }
    }

    this.focusableItems.forEach((item, index) => {
      item.setAttribute('tabindex', index === indexToMakeTabbable ? '0' : '-1');
    });
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const currentIndex = this.focusableItems.indexOf(target);

    if (currentIndex === -1) {
      return;
    }

    if (event.key === 'Tab') {
      if (this.isUsingArrowKeys) {
        this.isUsingArrowKeys = false;
        this.focusableItems.forEach(item => item.setAttribute('tabindex', '0'));
      }
      return;
    }

    const navigation = this.getNavigationAction(event.key, currentIndex);
    if (navigation) {
      if (!this.isUsingArrowKeys) {
        this.isUsingArrowKeys = true;
        this.applyArrowKeyTabindex();
      }
      navigation();
    } else if (event.key === 'Enter' || event.key === ' ') {
      this.activateItem(target);
    } else {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  private getNavigationAction(key: string, currentIndex: number): (() => void) | undefined {
    switch (key) {
      case 'ArrowRight':
        return this.orientation === 'horizontal' ? () => this.focusNext(currentIndex) : undefined;
      case 'ArrowLeft':
        return this.orientation === 'horizontal' ? () => this.focusPrevious(currentIndex) : undefined;
      case 'ArrowDown':
        return this.orientation === 'vertical' ? () => this.focusNext(currentIndex) : undefined;
      case 'ArrowUp':
        return this.orientation === 'vertical' ? () => this.focusPrevious(currentIndex) : undefined;
      case 'Home':
        return () => this.focusFirst();
      case 'End':
        return () => this.focusLast();
    }
  }

  private focusNext(currentIndex: number): void {
    if (this.focusableItems.length === 0) {
      return;
    }

    let nextIndex = currentIndex + 1;

    if (nextIndex >= this.focusableItems.length) {
      nextIndex = 0;
    }

    this.focusItemAtIndex(nextIndex);
  }

  private focusPrevious(currentIndex: number): void {
    if (this.focusableItems.length === 0) {
      return;
    }

    let previousIndex = currentIndex - 1;

    if (previousIndex < 0) {
      previousIndex = this.focusableItems.length - 1;
    }

    this.focusItemAtIndex(previousIndex);
  }

  private focusFirst(): void {
    if (this.focusableItems.length > 0) {
      this.focusItemAtIndex(0);
    }
  }

  private focusLast(): void {
    if (this.focusableItems.length > 0) {
      this.focusItemAtIndex(this.focusableItems.length - 1);
    }
  }

  private focusItemAtIndex(index: number): void {
    if (index < 0 || index >= this.focusableItems.length) {
      return;
    }

    this.currentFocusIndex = index;

    this.focusableItems.forEach((item, i) => {
      item.setAttribute('tabindex', i === index ? '0' : '-1');
    });

    this.focusableItems[index].focus();
    this.itemFocused.emit(this.focusableItems[index]);
  }

  private activateItem(item: HTMLElement): void {
    item.click();
    this.itemActivated.emit(item);
  }
}
