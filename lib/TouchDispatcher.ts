/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ClickFunction, NotifyStateFunction } from './LayoutTypes';
import { MomentumScroller } from './MomentumScroller';
import { SwipeHandler } from './SwipeHandler';

import * as Util from 'overlib/client/clientUtil';
import * as MathUtil from 'overlib/shared/mathUtil';
import { ScreenSpacePoint, Vector } from 'overlib/shared/mathUtil';
import * as React from 'react';

const SCROLL_DIST_SQR = 25;
//const HIGHLIGHT_TOUCH_DELAY = 350;
const DOUBLE_TAP_WAIT = 400; // anything quicker than this in ms is a double tap
const DOUBLE_TAP_DIST_SQR = 100;
const SWIPE_VERTICAL_MAX = 20;
const CLICK_DIST_SQR = 100;

enum TouchEventType {
  UNKNOWN,
  SCROLL,
  SWIPE,
}

export interface TouchAndScrollHandlers {
  scrollHandler?: MomentumScroller;
  touchHandler?: TouchHandler;
  swipeHandler?: SwipeHandler;
  onClick?: ClickFunction;
  onDoubleClick?: ClickFunction;
  onLongPress?: ClickFunction;
  notifyActive?: NotifyStateFunction;
}

export interface TouchHandlerTree {
  getTouchAndScrollHandlersAt: (point: ScreenSpacePoint) => TouchAndScrollHandlers;
  recordMetric: (metricName: string, metricDims?: Stash) => void;
}

export interface TouchHandler {
  onTouchStart?: (e: TouchLikeEvent) => void;
  onTouchMove?: (e: TouchLikeEvent) => void;
  onTouchEnd?: (e: TouchLikeEvent) => void;
  onWheel?: (e: React.WheelEvent<any>) => void;
}

export type TouchLikeEvent = React.TouchEvent<any> | React.MouseEvent<any>;

// guaranteed to return at least 1 ScreenSpacePoint
export function getTouches(e: TouchLikeEvent) {
  const touchesIn = (e as React.TouchEvent<any>).touches;
  const touchesOut: StashOf<ScreenSpacePoint> = {};
  if (touchesIn && touchesIn.length) {
    for (let i = 0; i < touchesIn.length; ++i) {
      const touch = touchesIn[i];
      touchesOut[touch.identifier.toString()] = {
        x: touch.pageX || 0,
        y: touch.pageY || 0,
      } as ScreenSpacePoint;
    }
  } else {
    touchesOut['mouse'] = (Util.eventPageX(e) || { x: 0, y: 0 }) as ScreenSpacePoint;
  }
  return touchesOut;
}

function loggableEvent(e: any) {
  const nativeEvent = (e.nativeEvent || e) as Stash;
  return {
    type: nativeEvent.type,
    clientX: nativeEvent.clientX,
    clientY: nativeEvent.clientY,
    which: nativeEvent.which,
    touches: nativeEvent.touches,
  };
}

function activeKeys(obj: Stash) {
  const active: string[] = [];
  for (const key in obj) {
    if (obj[key] !== undefined) {
      active.push(key);
    }
  }
  return active;
}

class TouchEventState {
  startTime = Date.now();
  type = TouchEventType.UNKNOWN;
  scrollHandler?: MomentumScroller;
  touchHandler?: TouchHandler;
  swipeHandler?: SwipeHandler;
  onClick?: ClickFunction;
  onDoubleClick?: ClickFunction;
  notifyActive?: NotifyStateFunction;

  onLongPress?: ClickFunction;
  longPressTimer?: number;

  startTouches: StashOf<ScreenSpacePoint>;
  startPos: ScreenSpacePoint;
  curTouches: StashOf<ScreenSpacePoint>;
  curTouchID: string;

  curDelta = { x: 0, y: 0 } as Vector;
  accumulatedMovement = { x: 0, y: 0 } as Vector;

  shouldClick = true;

  constructor(e: TouchLikeEvent) {
    this.startTouches = this.curTouches = getTouches(e);
    this.curTouchID = Object.keys(this.startTouches)[0];
    this.startPos = this.curTouches[this.curTouchID];
  }

  getStartPos() {
    return this.startPos;
  }

  getCurPos() {
    return this.curTouches[this.curTouchID];
  }

  update(e: TouchLikeEvent) {
    const newTouches = getTouches(e);
    if (!Object.keys(newTouches).length) {
      this.curDelta.x = this.curDelta.y = 0;
      return;
    }

    if (!newTouches[this.curTouchID]) {
      this.curTouchID = Object.keys(newTouches)[0];

      if (!this.curTouches[this.curTouchID]) {
        // not sure this can actually happen, but better to handle it than crash
        this.curTouches = newTouches;
      }
    }

    const lastPos = this.getCurPos();
    this.curTouches = newTouches;
    const newPos = this.getCurPos();

    this.curDelta.x = newPos.x - lastPos.x;
    this.curDelta.y = newPos.y - lastPos.y;

    this.accumulatedMovement.x += this.curDelta.x;
    this.accumulatedMovement.y += this.curDelta.y;

    if (MathUtil.lengthSqrd(this.accumulatedMovement) > CLICK_DIST_SQR) {
      this.shouldClick = false;
    }
  }
}

export class TouchDispatcher {
  private handlerTree: TouchHandlerTree;
  private curTouch: TouchEventState | undefined;
  private lastTapTime = 0;
  private lastTapPos = { x: Infinity, y: Infinity } as ScreenSpacePoint;

  constructor(handler: TouchHandlerTree) {
    this.handlerTree = handler;
  }

  private shouldSwipe() {
    const curTouch = this.curTouch;
    if (!curTouch) {
      return false;
    }

    if (!curTouch.swipeHandler) {
      // no swipe handler
      return false;
    }

    if (curTouch.scrollHandler && curTouch.scrollHandler.canScrollX()) {
      // scroll handler wants to handle horizontal movement
      return false;
    }

    return (
      (curTouch.type === TouchEventType.UNKNOWN || curTouch.type === TouchEventType.SCROLL) &&
      Math.abs(curTouch.accumulatedMovement.y) < SWIPE_VERTICAL_MAX &&
      Math.abs(curTouch.accumulatedMovement.x) > Math.abs(curTouch.accumulatedMovement.y)
    );
  }

  private handleLongPress = () => {
    const curTouch = this.curTouch;
    this.curTouch = undefined;

    if (!curTouch) {
      return;
    }

    const startPos = curTouch.getStartPos();

    this.handlerTree.recordMetric('touch.handled', {
      action: 'longPress',
      startX: startPos.x,
      startY: startPos.y,
      endX: startPos.x,
      endY: startPos.y,
      time: Date.now() - curTouch.startTime,
    });

    curTouch.notifyActive && curTouch.notifyActive(false);
    curTouch.onLongPress && curTouch.onLongPress(startPos);
  }

  public touchStart = (e: TouchLikeEvent) => {
    this.curTouch = new TouchEventState(e);
    const curTouch = this.curTouch;

    const handlers = this.handlerTree.getTouchAndScrollHandlersAt(curTouch.getStartPos());
    curTouch.scrollHandler = handlers.scrollHandler;
    curTouch.touchHandler = handlers.touchHandler;
    curTouch.swipeHandler = handlers.swipeHandler;
    curTouch.onClick = handlers.onClick;
    curTouch.onDoubleClick = handlers.onDoubleClick;
    curTouch.notifyActive = handlers.notifyActive;
    curTouch.onLongPress = handlers.onLongPress;

    console.debug('touchStart', {
      event: loggableEvent(e),
      startPos: curTouch.startPos,
      handlers: activeKeys(handlers),
    });

    if (curTouch.notifyActive) {
      curTouch.notifyActive(true);
    }

    if (curTouch.touchHandler) {
      curTouch.touchHandler.onTouchStart && curTouch.touchHandler.onTouchStart(e);
      return;
    }

    if (curTouch.scrollHandler && curTouch.scrollHandler.onTouchStart(e)) {
      // already scrolling
      curTouch.type = TouchEventType.SCROLL;
    }

    if (curTouch.onLongPress) {
      curTouch.longPressTimer = setTimeout(this.handleLongPress, 300);
    }
  }

  public touchMove = (e: TouchLikeEvent) => {
    const curTouch = this.curTouch;
    if (!curTouch) {
      console.debug('touchMove', {
        event: loggableEvent(e),
      });
      Util.eatEvent(e);
      return;
    }

    curTouch.update(e);

    console.debug('touchMove', {
      event: loggableEvent(e),
      curPos: curTouch.getCurPos(),
    });

    const distTreshold: boolean = MathUtil.lengthSqrd(curTouch.accumulatedMovement) > SCROLL_DIST_SQR;
    if (!distTreshold && curTouch.longPressTimer) {
      console.debug('touchMove', {
        event: loggableEvent(e),
      });
      Util.eatEvent(e);
      return;
    }

    if (curTouch.touchHandler) {
      curTouch.touchHandler.onTouchMove && curTouch.touchHandler.onTouchMove(e);
      return;
    }

    if (distTreshold) {
      if (curTouch.longPressTimer) {
        curTouch.longPressTimer && clearTimeout(curTouch.longPressTimer);
        curTouch.longPressTimer = undefined;
      }
      if (this.shouldSwipe()) {
        if (curTouch.type === TouchEventType.SCROLL) {
          // stop scrolling
          curTouch.scrollHandler && curTouch.scrollHandler.onTouchEnd();
        }

        // start swiping
        curTouch.type = TouchEventType.SWIPE;
        curTouch.swipeHandler && curTouch.swipeHandler.onSwipeStart();
      }

      if (curTouch.scrollHandler && curTouch.type === TouchEventType.UNKNOWN) {
        // start scrolling
        curTouch.type = TouchEventType.SCROLL;
      }
    }

    if (curTouch.type === TouchEventType.SCROLL) {
      curTouch.scrollHandler && curTouch.scrollHandler.applyDragDiff(curTouch.curDelta, e.timeStamp);
    } else if (curTouch.type === TouchEventType.SWIPE) {
      curTouch.swipeHandler && curTouch.swipeHandler.applyDragDiff(curTouch.curDelta.x, e.timeStamp);
    }
  }

  public touchEnd = (e: TouchLikeEvent) => {
    const curTouch = this.curTouch;
    this.curTouch = undefined;

    if (!curTouch) {
      console.debug('touchEnd', {
        event: loggableEvent(e),
      });
      Util.eatEvent(e);
      return;
    }

    if (curTouch.longPressTimer) {
      curTouch.longPressTimer && clearTimeout(curTouch.longPressTimer);
      curTouch.longPressTimer = undefined;
    }

    curTouch.update(e);

    const startPos = curTouch.getStartPos();
    const endPos = curTouch.getCurPos();
    let handled: boolean = false;
    let metricAction: string = 'unknown';

    if (curTouch.type === TouchEventType.UNKNOWN || curTouch.touchHandler) {
      if (curTouch.touchHandler) {
        curTouch.touchHandler.onTouchEnd && curTouch.touchHandler.onTouchEnd(e);
        metricAction = 'touchHandler';
        handled = true;
      }

      if (curTouch.shouldClick) {
        const now = Date.now();
        if (now - this.lastTapTime < DOUBLE_TAP_WAIT && MathUtil.distSqrd(this.lastTapPos, endPos) < DOUBLE_TAP_DIST_SQR) {
          metricAction = 'doubleClick';
          if (curTouch.onDoubleClick) {
            curTouch.onDoubleClick(startPos);
            handled = true;
          }
        } else {
          metricAction = 'click';
          this.lastTapTime = now;
          this.lastTapPos.x = endPos.x;
          this.lastTapPos.y = endPos.y;
          if (curTouch.onClick) {
            curTouch.onClick(startPos);
            handled = true;
          }
        }
      }
    } else if (curTouch.type === TouchEventType.SCROLL) {
      metricAction = 'scroll';
      curTouch.scrollHandler && curTouch.scrollHandler.onTouchEnd();
      handled = true;
    } else if (curTouch.type === TouchEventType.SWIPE) {
      metricAction = 'swipe';
      curTouch.swipeHandler && curTouch.swipeHandler.onSwipeEnd();
      handled = true;
    }

    if (curTouch.notifyActive) {
      curTouch.notifyActive(false);
    }

    console.debug('touchEnd', {
      event: loggableEvent(e),
      action: metricAction,
      startPos,
      endPos,
      handled,
    });

    this.handlerTree.recordMetric('touch.' + (handled ? 'handled' : 'unhandled'), {
      action: metricAction,
      startX: startPos.x,
      startY: startPos.y,
      endX: endPos.x,
      endY: endPos.y,
      time: Date.now() - curTouch.startTime,
    });
    Util.eatEvent(e);
  }

  public onWheel = (e: React.WheelEvent<any>) => {
    console.debug('onWheel', loggableEvent(e));
    const touches = getTouches(e);
    const screenSpacePoint = touches[Object.keys(touches)[0]];
    const handlers = this.handlerTree.getTouchAndScrollHandlersAt(screenSpacePoint);
    if (handlers.touchHandler && handlers.touchHandler.onWheel) {
      handlers.touchHandler.onWheel(e);
    } else if (handlers.scrollHandler) {
      handlers.scrollHandler.applyWheelDiff({ x: e.deltaX, y: e.deltaY } as Vector);
    }
  }
}
