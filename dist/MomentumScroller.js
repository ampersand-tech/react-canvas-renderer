"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var CanvasRenderer = require("./CanvasRenderer");
var LayoutAnimator = require("./LayoutAnimator");
var MathUtils = require("amper-utils/dist/mathUtils");
var WHEEL_SCROLL_TIMEOUT = 300;
var MIN_THROW_SPEED = 0.1;
var MAX_THROW_SPEED = 3.0;
var MAX_TOC_THROW_SPEED = 10.0;
var MAX_TIMESTEP = 100;
var SPRING_CONSTANT = 0.2; // this is a bit of a misnomer, not really a physical spring system
var SPRING_SNAP_DISTANCE = 5; // once we're within this distance, just snap
var EPSILON = 0.01;
var MIN_VELOCITY = 0.005;
var MAX_VELOCITY = 1.8;
var FAST_REDUCTION = 0.9; // 10%
var DEFAULT_REDUCTION = 0.95; // 5%
var LOCATIONS_REDUCTION = 0.97; // 3%
var MIN_DELTA_TIME = 0.01; // used only for velocity calculation
var MIN_TOUCH_MOVE_DT = 17.1; // android touchMove events that cause problems are often 17 ms in length (1/60 sec)
var MomentumScroller = /** @class */ (function () {
    function MomentumScroller(props) {
        var _this = this;
        this.props = props;
        this.scrollOffset = { x: 0, y: 0 };
        this.delta = { x: 0, y: 0 };
        this.wantScrollX = false;
        this.wantScrollY = false;
        this.scrollableX = false;
        this.scrollableY = false;
        this.isScrolling = false;
        this.velocity = { x: 0, y: 0 };
        this.maxVelocity = MAX_THROW_SPEED;
        this.prevTouchTime = 0;
        this.hasMomentum = false;
        this.prevTouchMoveVelocity = { x: 0, y: 0 };
        this.prevTouchMoveDT = 0;
        this.tick = function (dt) {
            if (!_this.hasMomentum) {
                return false;
            }
            if (_this.target) {
                _this.target.accumTime += dt;
                var p = MathUtils.parameterize(0, _this.target.animTime, _this.target.accumTime);
                var oldOffset = MathUtils.clone(_this.scrollOffset);
                _this.scrollOffset.x = MathUtils.interpEaseClamped(_this.target.easeFunction, _this.target.startX, _this.target.endX, p);
                _this.scrollOffset.y = MathUtils.interpEaseClamped(_this.target.easeFunction, _this.target.startY, _this.target.endY, p);
                _this.delta = MathUtils.vectorSub(_this.scrollOffset, oldOffset);
                _this.velocity.x = _this.velocity.y = 0;
                if (_this.target.accumTime >= _this.target.animTime) {
                    _this.target = undefined;
                }
            }
            else {
                var _a = _this.updateScrollable(), scrollBounds = _a.scrollBounds, containerSize = _a.containerSize;
                var newVel = _this.velocity;
                var diff = { x: 0, y: 0 };
                // Check edges. First beginning
                if (scrollBounds.xMin !== null && _this.scrollableX && _this.scrollOffset.x < scrollBounds.xMin + EPSILON) {
                    diff.x = scrollBounds.xMin - _this.scrollOffset.x;
                    if (newVel.x < 0) {
                        newVel.x = 0;
                    }
                }
                if (scrollBounds.yMin !== null && _this.scrollableY && _this.scrollOffset.y < scrollBounds.yMin + EPSILON) {
                    diff.y = scrollBounds.yMin - _this.scrollOffset.y;
                    if (newVel.y < 0) {
                        newVel.y = 0;
                    }
                }
                // Then end.
                if (scrollBounds.xMax !== null && _this.scrollableX && (_this.scrollOffset.x + containerSize.width) > scrollBounds.xMax + EPSILON) {
                    diff.x = scrollBounds.xMax - (_this.scrollOffset.x + containerSize.width);
                    if (newVel.x > 0) {
                        newVel.x = 0;
                    }
                }
                if (scrollBounds.yMax !== null && _this.scrollableY && (_this.scrollOffset.y + containerSize.height) > scrollBounds.yMax + EPSILON) {
                    diff.y = scrollBounds.yMax - (_this.scrollOffset.y + containerSize.height);
                    if (newVel.y > 0) {
                        newVel.y = 0;
                    }
                }
                if (!MathUtils.lengthSqrd(diff) && !MathUtils.lengthSqrd(_this.velocity)) {
                    _this.hasMomentum = false;
                    _this.stopScrolling();
                    return false;
                }
                if (diff.x && Math.abs(diff.x) > SPRING_SNAP_DISTANCE) {
                    diff.x *= SPRING_CONSTANT;
                }
                if (diff.y && Math.abs(diff.y) > SPRING_SNAP_DISTANCE) {
                    diff.y *= SPRING_CONSTANT;
                }
                var timeDiff = Math.min(dt, MAX_TIMESTEP);
                var newOffset = MathUtils.vectorAdd(_this.scrollOffset, diff, MathUtils.vectorMulScalar(newVel, timeDiff)); // simple euler integration for now
                var reduction = MathUtils.length(newVel) > MAX_VELOCITY ? FAST_REDUCTION : DEFAULT_REDUCTION;
                if (_this.props.getScaleFactor && _this.props.getScaleFactor() < 1) {
                    reduction = LOCATIONS_REDUCTION;
                }
                newVel = MathUtils.vectorMulScalar(newVel, Math.pow(reduction, Math.round(timeDiff / 16.7))); // for each frame, reduce by 3%
                // Floor the velocity component-wise
                if (Math.abs(newVel.x) < MIN_VELOCITY) {
                    newVel.x = 0;
                }
                if (Math.abs(newVel.y) < MIN_VELOCITY) {
                    newVel.y = 0;
                }
                _this.delta = MathUtils.vectorSub(newOffset, _this.scrollOffset);
                _this.velocity = newVel;
                _this.scrollOffset = newOffset;
            }
            if (_this.delta.x || _this.delta.y || dt === 0) {
                _this.fireEvent('scroll');
                return true;
            }
            if (!_this.velocity.x && !_this.velocity.y) {
                _this.hasMomentum = false;
                _this.stopScrolling();
            }
            return false;
        };
        LayoutAnimator.addTickMotivator(this);
        this.setScrollDirection(!!props.scrollX, !!props.scrollY);
    }
    MomentumScroller.prototype.destructor = function () {
        if (this.wheelScrollTimer) {
            clearTimeout(this.wheelScrollTimer);
            this.wheelScrollTimer = undefined;
        }
        LayoutAnimator.removeTickMotivator(this);
    };
    MomentumScroller.prototype.setScrollDirection = function (scrollX, scrollY) {
        this.wantScrollX = scrollX;
        this.wantScrollY = scrollY;
        if (!scrollX) {
            this.scrollOffset.x = this.delta.x = this.velocity.x = 0;
        }
        if (!scrollY) {
            this.scrollOffset.y = this.delta.y = this.velocity.y = 0;
        }
        this.updateScrollable();
    };
    MomentumScroller.prototype.canScrollX = function () {
        this.updateScrollable();
        return this.scrollableX;
    };
    MomentumScroller.prototype.canScrollY = function () {
        this.updateScrollable();
        return this.scrollableY;
    };
    MomentumScroller.prototype.updateScrollable = function () {
        var scrollBounds = this.props.getScrollBounds();
        var containerSize = this.props.getContainerSize();
        if (this.wantScrollX) {
            if (scrollBounds.xMin === null || scrollBounds.xMax === null) {
                this.scrollableX = true;
            }
            else {
                this.scrollableX = scrollBounds.xMax - scrollBounds.xMin > containerSize.width;
            }
        }
        else {
            this.scrollableX = false;
        }
        if (this.wantScrollY) {
            if (scrollBounds.yMin === null || scrollBounds.yMax === null) {
                this.scrollableY = true;
            }
            else {
                this.scrollableY = scrollBounds.yMax - scrollBounds.yMin > containerSize.height;
            }
        }
        else {
            this.scrollableY = false;
        }
        return { scrollBounds: scrollBounds, containerSize: containerSize };
    };
    MomentumScroller.prototype.fireEvent = function (eventName) {
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
    };
    MomentumScroller.prototype.startScrolling = function (metric) {
        if (metric === void 0) { metric = ''; }
        this.metric = metric;
        if (this.isScrolling) {
            return;
        }
        this.isScrolling = true;
        this.delta.x = this.delta.y = 0;
        this.fireEvent('scrollStart');
        CanvasRenderer.kickRender();
    };
    MomentumScroller.prototype.stopScrolling = function () {
        if (!this.isScrolling) {
            return;
        }
        this.isScrolling = false;
        this.delta.x = this.delta.y = 0;
        this.fireEvent('scrollStop');
        this.metric = '';
    };
    MomentumScroller.prototype.getScrollX = function () {
        return this.scrollOffset.x;
    };
    MomentumScroller.prototype.getScrollY = function () {
        return this.scrollOffset.y;
    };
    MomentumScroller.prototype.resetScrollY = function (scrollY) {
        if (scrollY === void 0) { scrollY = 0; }
        // called as part of reanchoring; no metrics or events should be fired
        this.scrollOffset.y = scrollY;
    };
    MomentumScroller.prototype.setTargetScrollY = function (scrollY, animTime, easeFunction, navMetric) {
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
            easeFunction: easeFunction,
        };
        this.startScrolling(navMetric);
        this.hasMomentum = true;
    };
    MomentumScroller.prototype.getDeltaY = function () {
        // used by menu bar to show/hide
        return this.delta.y;
    };
    MomentumScroller.prototype.onTouchStart = function (e) {
        // We might start scrolling, so record scroll state
        this.delta.x = this.delta.y = 0;
        this.hasMomentum = false;
        this.prevTouchMoveVelocity.x = this.prevTouchMoveVelocity.y = 0;
        this.prevTouchMoveDT = 0;
        this.prevTouchTime = e.timeStamp;
        this.target = undefined;
        if (this.props.getScaleFactor && this.props.getScaleFactor() < 1) {
            this.maxVelocity = MAX_TOC_THROW_SPEED;
        }
        else {
            this.maxVelocity = MAX_THROW_SPEED;
        }
        if (this.velocity.x || this.velocity.y) {
            this.velocity.x = this.velocity.y = 0;
            this.startScrolling('nav.scroll');
        }
        return this.isScrolling;
    };
    MomentumScroller.prototype.applyDragDiff = function (dragDiff, timeStamp) {
        this.updateScrollable();
        var scaleFactor = this.props.getScaleFactor ? this.props.getScaleFactor() : 1;
        var diff = MathUtils.vectorMulScalar(dragDiff, -1 / scaleFactor);
        if (!this.scrollableX) {
            diff.x = 0;
        }
        if (!this.scrollableY) {
            diff.y = 0;
        }
        var newScroll = MathUtils.vectorAdd(this.scrollOffset, diff);
        this.prevTouchMoveVelocity.x = this.velocity.x;
        this.prevTouchMoveVelocity.y = this.velocity.y;
        var dt = Math.max(timeStamp - this.prevTouchTime, MIN_DELTA_TIME);
        this.velocity.x = (newScroll.x - this.scrollOffset.x) / dt;
        this.velocity.y = (newScroll.y - this.scrollOffset.y) / dt;
        var scrollSpeed = { x: Math.abs(this.velocity.x), y: Math.abs(this.velocity.y) };
        if (scrollSpeed.x < MIN_THROW_SPEED) {
            this.velocity.x = 0;
        }
        else if (scrollSpeed.x > this.maxVelocity) {
            this.velocity.x = this.velocity.x > 0.0 ? MAX_THROW_SPEED : -MAX_THROW_SPEED;
        }
        if (scrollSpeed.y < MIN_THROW_SPEED) {
            this.velocity.y = 0;
        }
        else if (scrollSpeed.y > this.maxVelocity) {
            this.velocity.y = this.velocity.y > 0.0 ? MAX_THROW_SPEED : -MAX_THROW_SPEED;
        }
        if (this.scrollOffset.x !== newScroll.x || this.scrollOffset.y !== newScroll.y) {
            this.delta = MathUtils.vectorSub(newScroll, this.scrollOffset);
            this.scrollOffset = newScroll;
            this.startScrolling('nav.scroll');
            this.fireEvent('scroll');
            CanvasRenderer.kickRender();
        }
        this.prevTouchMoveDT = dt;
        this.prevTouchTime = timeStamp;
    };
    MomentumScroller.prototype.applyWheelDiff = function (wheelDiff) {
        var _this = this;
        var _a = this.updateScrollable(), scrollBounds = _a.scrollBounds, containerSize = _a.containerSize;
        var scaleFactor = this.props.getScaleFactor ? this.props.getScaleFactor() : 1;
        var diff = MathUtils.vectorMulScalar(wheelDiff, 1 / scaleFactor);
        if (!this.scrollableX) {
            diff.x = 0;
        }
        if (!this.scrollableY) {
            diff.y = 0;
        }
        this.scrollOffset = MathUtils.vectorAdd(this.scrollOffset, diff);
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
        this.wheelScrollTimer = setTimeout(function () {
            _this.wheelScrollTimer = undefined;
            _this.stopScrolling();
        }, WHEEL_SCROLL_TIMEOUT);
    };
    MomentumScroller.prototype.onTouchEnd = function () {
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
    };
    return MomentumScroller;
}());
exports.MomentumScroller = MomentumScroller;
