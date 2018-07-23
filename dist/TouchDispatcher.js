"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var MathUtils = require("amper-utils/dist2017/mathUtils");
var EventUtils = require("EventUtils");
var SCROLL_DIST_SQR = 25;
//const HIGHLIGHT_TOUCH_DELAY = 350;
var DOUBLE_TAP_WAIT = 400; // anything quicker than this in ms is a double tap
var DOUBLE_TAP_DIST_SQR = 100;
var SWIPE_VERTICAL_MAX = 20;
var CLICK_DIST_SQR = 100;
var TouchEventType;
(function (TouchEventType) {
    TouchEventType[TouchEventType["UNKNOWN"] = 0] = "UNKNOWN";
    TouchEventType[TouchEventType["SCROLL"] = 1] = "SCROLL";
    TouchEventType[TouchEventType["SWIPE"] = 2] = "SWIPE";
})(TouchEventType || (TouchEventType = {}));
// guaranteed to return at least 1 ScreenSpacePoint
function getTouches(e) {
    var touchesIn = e.touches;
    var touchesOut = {};
    if (touchesIn && touchesIn.length) {
        for (var i = 0; i < touchesIn.length; ++i) {
            var touch = touchesIn[i];
            touchesOut[touch.identifier.toString()] = {
                x: touch.pageX || 0,
                y: touch.pageY || 0,
            };
        }
    }
    else {
        touchesOut['mouse'] = (EventUtils.eventPageX(e) || { x: 0, y: 0 });
    }
    return touchesOut;
}
exports.getTouches = getTouches;
function loggableEvent(e) {
    var nativeEvent = (e.nativeEvent || e);
    return {
        type: nativeEvent.type,
        clientX: nativeEvent.clientX,
        clientY: nativeEvent.clientY,
        which: nativeEvent.which,
        touches: nativeEvent.touches,
    };
}
function activeKeys(obj) {
    var active = [];
    for (var key in obj) {
        if (obj[key] !== undefined) {
            active.push(key);
        }
    }
    return active;
}
var TouchEventState = /** @class */ (function () {
    function TouchEventState(e) {
        this.startTime = Date.now();
        this.type = TouchEventType.UNKNOWN;
        this.curDelta = { x: 0, y: 0 };
        this.accumulatedMovement = { x: 0, y: 0 };
        this.shouldClick = true;
        this.startTouches = this.curTouches = getTouches(e);
        this.curTouchID = Object.keys(this.startTouches)[0];
        this.startPos = this.curTouches[this.curTouchID];
    }
    TouchEventState.prototype.getStartPos = function () {
        return this.startPos;
    };
    TouchEventState.prototype.getCurPos = function () {
        return this.curTouches[this.curTouchID];
    };
    TouchEventState.prototype.update = function (e) {
        var newTouches = getTouches(e);
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
        var lastPos = this.getCurPos();
        this.curTouches = newTouches;
        var newPos = this.getCurPos();
        this.curDelta.x = newPos.x - lastPos.x;
        this.curDelta.y = newPos.y - lastPos.y;
        this.accumulatedMovement.x += this.curDelta.x;
        this.accumulatedMovement.y += this.curDelta.y;
        if (MathUtils.lengthSqrd(this.accumulatedMovement) > CLICK_DIST_SQR) {
            this.shouldClick = false;
        }
    };
    return TouchEventState;
}());
var TouchDispatcher = /** @class */ (function () {
    function TouchDispatcher(handler) {
        var _this = this;
        this.lastTapTime = 0;
        this.lastTapPos = { x: Infinity, y: Infinity };
        this.handleLongPress = function () {
            var curTouch = _this.curTouch;
            _this.curTouch = undefined;
            if (!curTouch) {
                return;
            }
            var startPos = curTouch.getStartPos();
            _this.handlerTree.recordMetric('touch.handled', {
                action: 'longPress',
                startX: startPos.x,
                startY: startPos.y,
                endX: startPos.x,
                endY: startPos.y,
                time: Date.now() - curTouch.startTime,
            });
            curTouch.notifyActive && curTouch.notifyActive(false);
            curTouch.onLongPress && curTouch.onLongPress(startPos);
        };
        this.touchStart = function (e) {
            _this.curTouch = new TouchEventState(e);
            var curTouch = _this.curTouch;
            var handlers = _this.handlerTree.getTouchAndScrollHandlersAt(curTouch.getStartPos());
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
                curTouch.longPressTimer = setTimeout(_this.handleLongPress, 300);
            }
        };
        this.touchMove = function (e) {
            var curTouch = _this.curTouch;
            if (!curTouch) {
                console.debug('touchMove', {
                    event: loggableEvent(e),
                });
                EventUtils.eatEvent(e);
                return;
            }
            curTouch.update(e);
            console.debug('touchMove', {
                event: loggableEvent(e),
                curPos: curTouch.getCurPos(),
            });
            var distTreshold = MathUtils.lengthSqrd(curTouch.accumulatedMovement) > SCROLL_DIST_SQR;
            if (!distTreshold && curTouch.longPressTimer) {
                console.debug('touchMove', {
                    event: loggableEvent(e),
                });
                EventUtils.eatEvent(e);
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
                if (_this.shouldSwipe()) {
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
            }
            else if (curTouch.type === TouchEventType.SWIPE) {
                curTouch.swipeHandler && curTouch.swipeHandler.applyDragDiff(curTouch.curDelta.x, e.timeStamp);
            }
        };
        this.touchEnd = function (e) {
            var curTouch = _this.curTouch;
            _this.curTouch = undefined;
            if (!curTouch) {
                console.debug('touchEnd', {
                    event: loggableEvent(e),
                });
                EventUtils.eatEvent(e);
                return;
            }
            if (curTouch.longPressTimer) {
                curTouch.longPressTimer && clearTimeout(curTouch.longPressTimer);
                curTouch.longPressTimer = undefined;
            }
            curTouch.update(e);
            var startPos = curTouch.getStartPos();
            var endPos = curTouch.getCurPos();
            var handled = false;
            var metricAction = 'unknown';
            if (curTouch.type === TouchEventType.UNKNOWN || curTouch.touchHandler) {
                if (curTouch.touchHandler) {
                    curTouch.touchHandler.onTouchEnd && curTouch.touchHandler.onTouchEnd(e);
                    metricAction = 'touchHandler';
                    handled = true;
                }
                if (curTouch.shouldClick) {
                    var now = Date.now();
                    if (now - _this.lastTapTime < DOUBLE_TAP_WAIT && MathUtils.distSqrd(_this.lastTapPos, endPos) < DOUBLE_TAP_DIST_SQR) {
                        metricAction = 'doubleClick';
                        if (curTouch.onDoubleClick) {
                            curTouch.onDoubleClick(startPos);
                            handled = true;
                        }
                    }
                    else {
                        metricAction = 'click';
                        _this.lastTapTime = now;
                        _this.lastTapPos.x = endPos.x;
                        _this.lastTapPos.y = endPos.y;
                        if (curTouch.onClick) {
                            curTouch.onClick(startPos);
                            handled = true;
                        }
                    }
                }
            }
            else if (curTouch.type === TouchEventType.SCROLL) {
                metricAction = 'scroll';
                curTouch.scrollHandler && curTouch.scrollHandler.onTouchEnd();
                handled = true;
            }
            else if (curTouch.type === TouchEventType.SWIPE) {
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
                startPos: startPos,
                endPos: endPos,
                handled: handled,
            });
            _this.handlerTree.recordMetric('touch.' + (handled ? 'handled' : 'unhandled'), {
                action: metricAction,
                startX: startPos.x,
                startY: startPos.y,
                endX: endPos.x,
                endY: endPos.y,
                time: Date.now() - curTouch.startTime,
            });
            EventUtils.eatEvent(e);
        };
        this.onWheel = function (e) {
            console.debug('onWheel', loggableEvent(e));
            var touches = getTouches(e);
            var screenSpacePoint = touches[Object.keys(touches)[0]];
            var handlers = _this.handlerTree.getTouchAndScrollHandlersAt(screenSpacePoint);
            if (handlers.touchHandler && handlers.touchHandler.onWheel) {
                handlers.touchHandler.onWheel(e);
            }
            else if (handlers.scrollHandler) {
                handlers.scrollHandler.applyWheelDiff({ x: e.deltaX, y: e.deltaY });
            }
        };
        this.handlerTree = handler;
    }
    TouchDispatcher.prototype.shouldSwipe = function () {
        var curTouch = this.curTouch;
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
        return ((curTouch.type === TouchEventType.UNKNOWN || curTouch.type === TouchEventType.SCROLL) &&
            Math.abs(curTouch.accumulatedMovement.y) < SWIPE_VERTICAL_MAX &&
            Math.abs(curTouch.accumulatedMovement.x) > Math.abs(curTouch.accumulatedMovement.y));
    };
    return TouchDispatcher;
}());
exports.TouchDispatcher = TouchDispatcher;
