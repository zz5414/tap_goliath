import { type Vec2 } from '../util/math.ts';

type ButtonHandler = (screenPos: Vec2 | null) => void;
type DragHandler = (screenPos: Vec2) => void;

export class Input {
  private buttonHandlers: ButtonHandler[] = [];
  private dragHandlers: DragHandler[] = [];
  private activePointerId: number | null = null;
  private targetEl: HTMLElement | null = null;

  attach(target: HTMLElement): void {
    this.targetEl = target;
    target.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    target.addEventListener('pointermove', this.onPointerMove, { passive: false });
    target.addEventListener('pointerup', this.onPointerUp, { passive: false });
    target.addEventListener('pointercancel', this.onPointerUp, { passive: false });
    window.addEventListener('keydown', this.onKey);
  }

  detach(target: HTMLElement): void {
    target.removeEventListener('pointerdown', this.onPointerDown);
    target.removeEventListener('pointermove', this.onPointerMove);
    target.removeEventListener('pointerup', this.onPointerUp);
    target.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKey);
    this.targetEl = null;
  }

  onButtonPress(handler: ButtonHandler): void {
    this.buttonHandlers.push(handler);
  }

  // 포인터를 누른 채 움직이는 동안 (드래그) 매 이동마다 호출된다.
  // god 모드에서 연속 조향에 사용한다.
  onPointerDrag(handler: DragHandler): void {
    this.dragHandlers.push(handler);
  }

  private fireButton(pos: Vec2 | null): void {
    for (const h of this.buttonHandlers) h(pos);
  }

  private fireDrag(pos: Vec2): void {
    for (const h of this.dragHandlers) h(pos);
  }

  private screenPosOf(e: PointerEvent): Vec2 {
    const el = this.targetEl;
    if (!el) return { x: e.clientX, y: e.clientY };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    this.activePointerId = e.pointerId;
    this.fireButton(this.screenPosOf(e));
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.activePointerId !== e.pointerId) return;
    this.fireDrag(this.screenPosOf(e));
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.activePointerId !== e.pointerId) return;
    this.activePointerId = null;
  };

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      if (e.repeat) return;
      e.preventDefault();
      this.fireButton(null);
    }
  };
}
