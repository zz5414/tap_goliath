type ButtonHandler = () => void;

export class Input {
  private handlers: ButtonHandler[] = [];

  attach(target: HTMLElement): void {
    target.addEventListener('pointerdown', this.onPointer, { passive: false });
    window.addEventListener('keydown', this.onKey);
  }

  detach(target: HTMLElement): void {
    target.removeEventListener('pointerdown', this.onPointer);
    window.removeEventListener('keydown', this.onKey);
  }

  onButtonPress(handler: ButtonHandler): void {
    this.handlers.push(handler);
  }

  private fire(): void {
    for (const h of this.handlers) h();
  }

  private onPointer = (e: PointerEvent): void => {
    // 메인 버튼만 처리 (좌클릭/단일 터치)
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    this.fire();
  };

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      // 페이지 스크롤 방지
      if (e.repeat) return;
      e.preventDefault();
      this.fire();
    }
  };
}
