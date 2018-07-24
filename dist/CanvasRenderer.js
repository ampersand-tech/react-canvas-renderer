"use strict";
/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Constants_1 = require("./Constants");
var LayoutAnimator = require("./LayoutAnimator");
var TouchDispatcher_1 = require("./TouchDispatcher");
var mathUtils_1 = require("amper-utils/dist2017/mathUtils");
var React = require("react");
var BUFFERING_TIMEOUT = 300; // time to wait after last drawing before updating the buffering (which stalls)
var MATCH_FRAME_COUNT = 5;
var gRendererList = [];
var gRAFHandle;
var gAnimationTimer;
var gBufferingTimer;
var gPrevTime = 0;
var RenderCanvas = /** @class */ (function (_super) {
    __extends(RenderCanvas, _super);
    function RenderCanvas(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.setCanvas = function (canvas) {
            if (canvas) {
                gRendererList.push(_this);
                _this.canvas = canvas;
                kickRender();
            }
            else {
                var idx = gRendererList.indexOf(_this);
                if (idx >= 0) {
                    gRendererList.splice(idx, 1);
                }
                _this.canvas = undefined;
            }
        };
        _this.updateBoundingRect = function (matchingFrameCount) {
            if (!_this.canvas) {
                return;
            }
            var r = _this.canvas.getBoundingClientRect();
            if (mathUtils_1.rectsMatch(_this.boundingRect, r)) {
                if (matchingFrameCount < MATCH_FRAME_COUNT) {
                    requestAnimationFrame(function () { return _this.updateBoundingRect(matchingFrameCount + 1); });
                }
                else {
                    _this.updateCanvasRenderSize();
                }
            }
            else {
                _this.boundingRect = r;
                requestAnimationFrame(function () { return _this.updateBoundingRect(0); });
            }
        };
        _this.touchDispatcher = new TouchDispatcher_1.TouchDispatcher(_this);
        return _this;
    }
    RenderCanvas.prototype.getCanvas = function () {
        return this.canvas;
    };
    RenderCanvas.prototype.getScreenOffset = function () {
        return {
            x: this.boundingRect.left,
            y: this.boundingRect.top,
        };
    };
    RenderCanvas.prototype.updateCanvasRenderSize = function () {
        if (!this.canvas) {
            return;
        }
        var newWidth = this.canvas.clientWidth * Constants_1.PIXEL_RATIO;
        var newHeight = this.canvas.clientHeight * Constants_1.PIXEL_RATIO;
        if (this.canvas.width !== newWidth || this.canvas.height !== newHeight) {
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            kickRender();
        }
    };
    RenderCanvas.prototype.updateCanvasSize = function () {
        if (!this.canvas) {
            return;
        }
        this.updateCanvasRenderSize();
        this.updateBoundingRect(0);
        return this.canvas;
    };
    RenderCanvas.prototype.draw = function () {
        if (!this.canvas) {
            return false;
        }
        var ctx = this.canvas.getContext('2d');
        if (!ctx) {
            console.error('lost canvas context');
            return true;
        }
        return this.props.drawFunc(ctx, this.canvas.width, this.canvas.height);
    };
    RenderCanvas.prototype.onStoppedRendering = function () {
        this.props.onStoppedRendering && this.props.onStoppedRendering();
    };
    RenderCanvas.prototype.onBuffering = function () {
        this.props.onBuffering && this.props.onBuffering();
    };
    // TouchHandlerTree interface:
    RenderCanvas.prototype.getTouchAndScrollHandlersAt = function (screenSpacePoint) {
        if (this.props.getTouchAndScrollHandlersAt) {
            var canvasSpacePoint = {
                x: (screenSpacePoint.x - this.boundingRect.left),
                y: (screenSpacePoint.y - this.boundingRect.top),
            };
            return this.props.getTouchAndScrollHandlersAt(canvasSpacePoint);
        }
        return {};
    };
    RenderCanvas.prototype.recordMetric = function (metricName, metricDims) {
        this.props.recordMetric && this.props.recordMetric(metricName, metricDims);
    };
    RenderCanvas.prototype.render = function () {
        return React.createElement('canvas', {
            ref: this.setCanvas,
            style: { touchAction: 'none' },
            classes: this.props.classes,
            onTouchOrMouseStart: this.touchDispatcher.touchStart,
            onTouchOrMouseMove: this.touchDispatcher.touchMove,
            onTouchOrMouseEnd: this.touchDispatcher.touchEnd,
            onWheel: this.touchDispatcher.onWheel,
        });
    };
    return RenderCanvas;
}(React.Component));
exports.RenderCanvas = RenderCanvas;
function safeCancelTimer(handle) {
    if (handle !== undefined) {
        clearTimeout(handle);
    }
    return undefined;
}
function bufferTimeoutElapsed() {
    gBufferingTimer = safeCancelTimer(gBufferingTimer);
    for (var _i = 0, gRendererList_1 = gRendererList; _i < gRendererList_1.length; _i++) {
        var renderer = gRendererList_1[_i];
        renderer.onBuffering();
    }
}
function renderAll() {
    gAnimationTimer = safeCancelTimer(gAnimationTimer);
    gBufferingTimer = safeCancelTimer(gBufferingTimer);
    gRAFHandle = undefined;
    var renderStartTime = Date.now();
    var dt = 0;
    if (gPrevTime) {
        dt = renderStartTime - gPrevTime;
        gPrevTime = 0;
    }
    var isAnimating = LayoutAnimator.tickAll(dt);
    for (var _i = 0, gRendererList_2 = gRendererList; _i < gRendererList_2.length; _i++) {
        var renderer = gRendererList_2[_i];
        if (renderer.draw()) {
            isAnimating = true;
        }
    }
    if (isAnimating) {
        // render again next frame
        gPrevTime = renderStartTime; // make sure to include the time it took to draw in the next dt
        kickRender();
    }
    else {
        // stopped rendering
        for (var _a = 0, gRendererList_3 = gRendererList; _a < gRendererList_3.length; _a++) {
            var renderer = gRendererList_3[_a];
            renderer.onStoppedRendering();
        }
        var timeUntilNextAnimation = LayoutAnimator.getTimeUntilNextAnimation();
        if (timeUntilNextAnimation) {
            // auto-kick the render loop when an animation is coming
            gPrevTime = renderStartTime; // need to make sure we tick the animations for the intervening time
            gAnimationTimer = setTimeout(kickRender, timeUntilNextAnimation);
        }
        else {
            gBufferingTimer = setTimeout(bufferTimeoutElapsed, BUFFERING_TIMEOUT);
        }
    }
}
function kickRender() {
    gAnimationTimer = safeCancelTimer(gAnimationTimer);
    gBufferingTimer = safeCancelTimer(gBufferingTimer);
    if (!gRAFHandle) {
        gPrevTime = gPrevTime || Date.now();
        gRAFHandle = requestAnimationFrame(renderAll);
    }
}
exports.kickRender = kickRender;
function flushAnimations() {
    if (!gAnimationTimer || !gPrevTime) {
        return;
    }
    var dt = Date.now() - gPrevTime;
    gPrevTime = 0;
    LayoutAnimator.tickAll(dt);
    kickRender();
}
exports.flushAnimations = flushAnimations;
