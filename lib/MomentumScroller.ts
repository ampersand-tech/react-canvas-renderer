/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as CanvasRenderer from './CanvasRenderer';
import * as LayoutAnimator from './LayoutAnimator';

import * as MathUtil from 'overlib/shared/mathUtil';
import { Dimensions, Point, Vector } from 'overlib/shared/mathUtil';

const WHEEL_SCROLL_TIMEOUT = 300;
const MIN_THROW_SPEED = 0.1;
const MAX_THROW_SPEED = 3.0;
const MAX_TOC_THROW_SPEED = 10.0;
const MAX_TIMESTEP = 100;
const SPRING_CONSTANT = 0.2; // this is a bit of a misnomer, not really a physical spring system
const SPRING_SNAP_DISTANCE = 5; // once we're within this distance, just snap
const EPSILON = 0.01;
const MIN_VELOCITY = 0.005;
const MAX_VELOCITY = 1.8;
const FAST_REDUCTION = 0.9; // 10%
const DEFAULT_REDUCTION = 0.95; // 5%
const LOCATIONS_REDUCTION = 0.97; // 3%
const MIN_DELTA_TIME = 0.01; // used only for velocity calculation
const MIN_TOUCH_MOVE_DT = 17.1; // android touchMove events that cause problems are often 17 ms in length (1/60 sec)

export type ScrollEvent = 'scrollStart' | 'scroll' | 'scrollStop';

export type TouchLikeEvent = React.TouchEvent<any> | React.MouseEvent<any>;

export interface ScrollEventData {
  scrollX: number;
  scrollY: number;
  deltaX: number;
  deltaY: number;
  metric: string;
}

interface ScrollTarget {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  animTime: number;
  accumTime: number;
  easeFunction: MathUtil.EasingFunction;
}

export interface ScrollBounds {
  xMin: number|null;
  yMin: number|null;
  xMax: number|null;
  yMax: number|null;
}

interface Props {
  getScrollBounds: () => Readonly<ScrollBounds>;
  getContainerSize: () => Readonly<Dimensions>;
  getScaleFactor?: () => number;
  fireEvent?: (eventName: ScrollEvent, data: ScrollEventData) => void;
  scrollX?: boolean;
  scrollY?: boolean;
}

export class MomentumScroller {
  private scrollOffset: Point = {x: 0, y: 0};
  private delta: Vector = {x: 0, y: 0} as Vector;
  private wantScrollX = false;
  private wantScrollY = false;
  private scrollableX = false;
  private scrollableY = false;

  private isScrolling = false;

  private target: ScrollTarget | undefined;
  private metric: string;
  private velocity: Vector = {x: 0, y: 0} as Vector;
  private maxVelocity = MAX_THROW_SPEED;
  private prevTouchTime = 0;
  private hasMomentum = false;
  private wheelScrollTimer: number|undefined;
  private prevTouchMoveVelocity: Vector = {x: 0, y: 0} as Vector;
  private prevTouchMoveDT = 0;

  constructor(readonly props: Props) {
    LayoutAnimator.addTickMotivator(this);
    this.setScrollDirection(!!props.scrollX, !!props.scrollY);
  }

  destructor() {
    if (this.wheelScrollTimer) {
      clearTimeout(this.wheelScrollTimer);
      this.wheelScrollTimer = undefined;
    }

    LayoutAnimator.removeTickMotivator(this);
  }

  public setScrollDirection(scrollX: boolean, scrollY: boolean) {
    this.wantScrollX = scrollX;
    this.wantScrollY = scrollY;
    if (!scrollX) {
      this.scrollOffset.x = this.delta.x = this.velocity.x = 0;
    }
    if (!scrollY) {
      this.scrollOffset.y = this.delta.y = this.velocity.y = 0;
    }
    this.updateScrollable();
  }

  public canScrollX(): boolean {
    this.updateScrollable();
    return this.scrollableX;
  }

  public canScrollY(): boolean {
    this.updateScrollable();
    return this.scrollableY;
  }

  private updateScrollable() {
    const scrollBounds = this.props.getScrollBounds();
    const containerSize = this.props.getContainerSize();

    if (this.wantScrollX) {
      if (scrollBounds.xMin === null || scrollBounds.xMax === null) {
        this.scrollableX = true;
      } else {
        this.scrollableX = scrollBounds.xMax - scrollBounds.xMin > containerSize.width;
      }
    } else {
      this.scrollableX = false;
    }

    if (this.wantScrollY) {
      if (scrollBounds.yMin === null || scrollBounds.yMax === null) {
        this.scrollableY = true;
      } else {
        this.scrollableY = scrollBounds.yMax - scrollBounds.yMin > containerSize.height;
      }
    } else {
      this.scrollableY = false;
    }

    return { scrollBounds, containerSize };
  }

  private fireEvent(eventName: ScrollEvent) {
    if (!this.props.fireEvent) {
      return;
    }
    this.props.fireEvent(eventName, {
      metric: this.metric,
      scrollX: this.scrollOffset.x,
      scrollY: this.scrollOffset.y,
      deltaX: this.delta.x,
      deltaY: this.delta.y,
    });
  }

  private startScrolling(metric: string = '') {
    this.metric = metric;
    if (this.isScrolling) {
      return;
    }
    this.isScrolling = true;
    this.delta.x = this.delta.y = 0;
    this.fireEvent('scrollStart');
    CanvasRenderer.kickRender();
  }

  private stopScrolling() {
    if (!this.isScrolling) {
      return;
    }
    this.isScrolling = false;
    this.delta.x = this.delta.y = 0;
    this.fireEvent('scrollStop');
    this.metric = '';
  }

  public getScrollX() {
    return this.scrollOffset.x;
  }

  public getScrollY() {
    return this.scrollOffset.y;
  }

  public resetScrollY(scrollY = 0) {
    // called as part of reanchoring; no metrics or events should be fired
    this.scrollOffset.y = scrollY;
  }

  public setTargetScrollY(scrollY: number, animTime: number, easeFunction: MathUtil.EasingFunction, navMetric?: string) {
    if (Math.abs(this.scrollOffset.y - scrollY) < 1) {
      return;
    }
    this.target = {
      startX: this.scrollOffset.x,
      startY: this.scrollOffset.y,
      endX: this.scrollOffset.x,
      endY: scrollY,
      animTime: animTime,
      accumTime: 0,
      easeFunction,
    };

    this.startScrolling(navMetric);
    this.hasMomentum = true;
  }

  public getDeltaY() {
    // used by menu bar to show/hide
    return this.delta.y;
  }

  public onTouchStart(e: TouchLikeEvent): boolean {
    // We might start scrolling, so record scroll state
    this.delta.x = this.delta.y = 0;
    this.hasMomentum = false;
    this.prevTouchMoveVelocity.x = this.prevTouchMoveVelocity.y = 0;
    this.prevTouchMoveDT = 0;
    this.prevTouchTime = e.timeStamp;
    this.target = undefined;

    if (this.props.getScaleFactor && this.props.getScaleFactor() < 1) {
      this.maxVelocity = MAX_TOC_THROW_SPEED;
    } else {
      this.maxVelocity = MAX_THROW_SPEED;
    }

    if (this.velocity.x || this.velocity.y) {
      this.velocity.x = this.velocity.y = 0;
      this.startScrolling('nav.scroll');
    }

    return this.isScrolling;
  }

  public applyDragDiff(dragDiff: Readonly<Vector>, timeStamp: number) {
    this.updateScrollable();

    const scaleFactor = this.props.getScaleFactor ? this.props.getScaleFactor() : 1;
    const diff = MathUtil.vectorMulScalar(dragDiff, -1 / scaleFactor);
    if (!this.scrollableX) {
      diff.x = 0;
    }
    if (!this.scrollableY) {
      diff.y = 0;
    }

    const newScroll = MathUtil.vectorAdd(this.scrollOffset, diff);

    this.prevTouchMoveVelocity.x = this.velocity.x;
    this.prevTouchMoveVelocity.y = this.velocity.y;

    const dt = Math.max(timeStamp - this.prevTouchTime, MIN_DELTA_TIME);
    this.velocity.x = (newScroll.x - this.scrollOffset.x) / dt;
    this.velocity.y = (newScroll.y - this.scrollOffset.y) / dt;
    const scrollSpeed = { x: Math.abs(this.velocity.x), y: Math.abs(this.velocity.y) };

    if (scrollSpeed.x < MIN_THROW_SPEED) {
      this.velocity.x = 0;
    } else if (scrollSpeed.x > this.maxVelocity) {
      this.velocity.x = this.velocity.x > 0.0 ? MAX_THROW_SPEED : -MAX_THROW_SPEED;
    }
    if (scrollSpeed.y < MIN_THROW_SPEED) {
      this.velocity.y = 0;
    } else if (scrollSpeed.y > this.maxVelocity) {
      this.velocity.y = this.velocity.y > 0.0 ? MAX_THROW_SPEED : -MAX_THROW_SPEED;
    }

    if (this.scrollOffset.x !== newScroll.x || this.scrollOffset.y !== newScroll.y) {
      this.delta = MathUtil.vectorSub(newScroll, this.scrollOffset);
      this.scrollOffset = newScroll;
      this.startScrolling('nav.scroll');
      this.fireEvent('scroll');
      CanvasRenderer.kickRender();
    }
    this.prevTouchMoveDT = dt;
    this.prevTouchTime = timeStamp;
  }

  public applyWheelDiff(wheelDiff: Readonly<Vector>) {
    const { scrollBounds, containerSize } = this.updateScrollable();
    const scaleFactor = this.props.getScaleFactor ? this.props.getScaleFactor() : 1;
    const diff = MathUtil.vectorMulScalar(wheelDiff, 1 / scaleFactor);
    if (!this.scrollableX) {
      diff.x = 0;
    }
    if (!this.scrollableY) {
      diff.y = 0;
    }

    this.scrollOffset = MathUtil.vectorAdd(this.scrollOffset, diff);
    this.delta = diff;
    this.velocity.x = this.velocity.y = 0;
    this.target = undefined;

    // check min edge
    if (scrollBounds.xMin !== null && this.scrollableX && this.scrollOffset.x < scrollBounds.xMin) {
      this.scrollOffset.x = scrollBounds.xMin;
    }
    if (scrollBounds.yMin !== null && this.scrollableY && this.scrollOffset.y < scrollBounds.yMin) {
      this.scrollOffset.y = scrollBounds.yMin;
    }

    // check max edge
    if (scrollBounds.xMax !== null && this.scrollableX && (this.scrollOffset.x + containerSize.width) > scrollBounds.xMax) {
      this.scrollOffset.x = scrollBounds.xMax - containerSize.width;
    }
    if (scrollBounds.yMax !== null && this.scrollableY && (this.scrollOffset.y + containerSize.height) > scrollBounds.yMax) {
      this.scrollOffset.y = scrollBounds.yMax - containerSize.height;
    }

    this.startScrolling('nav.wheel');

    this.fireEvent('scroll');
    CanvasRenderer.kickRender();

    if (this.wheelScrollTimer) {
      clearTimeout(this.wheelScrollTimer);
      this.wheelScrollTimer = undefined;
    }
    this.wheelScrollTimer = setTimeout(() => {
      this.wheelScrollTimer = undefined;
      this.stopScrolling();
    }, WHEEL_SCROLL_TIMEOUT);
  }

  public tick = (dt: number) => {
    if (!this.hasMomentum) {
      return false;
    }

    if (this.target) {
      this.target.accumTime += dt;
      const p = MathUtil.parameterize(0, this.target.animTime, this.target.accumTime);
      const oldOffset = MathUtil.clone(this.scrollOffset);
      this.scrollOffset.x = MathUtil.interpEaseClamped(this.target.easeFunction, this.target.startX, this.target.endX, p);
      this.scrollOffset.y = MathUtil.interpEaseClamped(this.target.easeFunction, this.target.startY, this.target.endY, p);
      this.delta = MathUtil.vectorSub(this.scrollOffset, oldOffset);
      this.velocity.x = this.velocity.y = 0;
      if (this.target.accumTime >= this.target.animTime) {
        this.target = undefined;
      }
    } else {
      const { scrollBounds, containerSize } = this.updateScrollable();

      let newVel = this.velocity;
      const diff = { x: 0, y: 0 } as Vector;

      // Check edges. First beginning
      if (scrollBounds.xMin !== null && this.scrollableX && this.scrollOffset.x < scrollBounds.xMin + EPSILON) {
        diff.x = scrollBounds.xMin - this.scrollOffset.x;
        if (newVel.x < 0) {
          newVel.x = 0;
        }
      }
      if (scrollBounds.yMin !== null && this.scrollableY && this.scrollOffset.y < scrollBounds.yMin + EPSILON) {
        diff.y = scrollBounds.yMin - this.scrollOffset.y;
        if (newVel.y < 0) {
          newVel.y = 0;
        }
      }

      // Then end.
      if (scrollBounds.xMax !== null && this.scrollableX && (this.scrollOffset.x + containerSize.width) > scrollBounds.xMax + EPSILON) {
        diff.x = scrollBounds.xMax - (this.scrollOffset.x + containerSize.width);
        if (newVel.x > 0) {
          newVel.x = 0;
        }
      }
      if (scrollBounds.yMax !== null && this.scrollableY && (this.scrollOffset.y + containerSize.height) > scrollBounds.yMax + EPSILON) {
        diff.y = scrollBounds.yMax - (this.scrollOffset.y + containerSize.height);
        if (newVel.y > 0) {
          newVel.y = 0;
        }
      }

      if (!MathUtil.lengthSqrd(diff) && !MathUtil.lengthSqrd(this.velocity)) {
        this.hasMomentum = false;
        this.stopScrolling();
        return false;
      }

      if (diff.x && Math.abs(diff.x) > SPRING_SNAP_DISTANCE) {
        diff.x *= SPRING_CONSTANT;
      }
      if (diff.y && Math.abs(diff.y) > SPRING_SNAP_DISTANCE) {
        diff.y *= SPRING_CONSTANT;
      }

      const timeDiff = Math.min(dt, MAX_TIMESTEP);
      const newOffset = MathUtil.vectorAdd(this.scrollOffset, diff, MathUtil.vectorMulScalar(newVel, timeDiff)); // simple euler integration for now
      let reduction = MathUtil.length(newVel) > MAX_VELOCITY ? FAST_REDUCTION : DEFAULT_REDUCTION;
      if (this.props.getScaleFactor && this.props.getScaleFactor() < 1) {
        reduction = LOCATIONS_REDUCTION;
      }
      newVel = MathUtil.vectorMulScalar(newVel, Math.pow(reduction, Math.round(timeDiff / 16.7))); // for each frame, reduce by 3%

      // Floor the velocity component-wise
      if (Math.abs(newVel.x) < MIN_VELOCITY) {
        newVel.x = 0;
      }
      if (Math.abs(newVel.y) < MIN_VELOCITY) {
        newVel.y = 0;
      }

      this.delta = MathUtil.vectorSub(newOffset, this.scrollOffset);
      this.velocity = newVel;
      this.scrollOffset = newOffset;
    }

    if (this.delta.x || this.delta.y || dt === 0) {
      this.fireEvent('scroll');
      return true;
    }

    if (!this.velocity.x && !this.velocity.y ) {
      this.hasMomentum = false;
      this.stopScrolling();
    }

    return false;
  }

  public onTouchEnd() {
    // on Android, the final touchMove event often gives a
    // wrong velocity. If current velocity is less than the previous
    // and the event was short, and the previous velocity was at
    // max, use the previous velocity
    if (Math.abs(this.prevTouchMoveVelocity.x) === this.maxVelocity &&
        Math.abs(this.velocity.x) < this.maxVelocity &&
        this.prevTouchMoveDT < MIN_TOUCH_MOVE_DT) {
        this.velocity.x = this.prevTouchMoveVelocity.x;
    }
    if (Math.abs(this.prevTouchMoveVelocity.y) === this.maxVelocity &&
        Math.abs(this.velocity.y) < this.maxVelocity &&
        this.prevTouchMoveDT < MIN_TOUCH_MOVE_DT) {
        this.velocity.y = this.prevTouchMoveVelocity.y;
    }

    this.delta.x = this.delta.y = 0;
    this.hasMomentum = true;
    this.prevTouchMoveVelocity.x = this.prevTouchMoveVelocity.y = 0;
    this.prevTouchMoveDT = 0;
    CanvasRenderer.kickRender();
  }
}
