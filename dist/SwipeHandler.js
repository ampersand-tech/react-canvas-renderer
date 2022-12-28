"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwipeHandler = void 0;
var CanvasRenderer = require("./CanvasRenderer");
var LayoutAnimator = require("./LayoutAnimator");
var MathUtils = require("amper-utils/dist/mathUtils");
var SwipeHandler = /** @class */ (function () {
    function SwipeHandler(getScaleFactor, setScaleFactor, minScaleFactor, scaleFactorVelocity) {
        var _this = this;
        this.getScaleFactor = getScaleFactor;
        this.setScaleFactor = setScaleFactor;
        this.minScaleFactor = minScaleFactor;
        this.scaleFactorVelocity = scaleFactorVelocity;
        this.curScaleFactor = 0;
        this.targetScaleFactor = null;
        this.onSwipeEnd = function () {
            var scaleFactor = _this.getScaleFactor();
            var param = MathUtils.parameterize(_this.minScaleFactor, 1.0, scaleFactor);
            if (param < 0.5) {
                _this.targetScaleFactor = _this.minScaleFactor;
            }
            else {
                _this.targetScaleFactor = 1.0;
            }
            CanvasRenderer.kickRender();
        };
        this.tick = function (dt) {
            if (_this.targetScaleFactor === null) {
                return false;
            }
            var scaleFactor = _this.getScaleFactor();
            var diff = _this.targetScaleFactor - scaleFactor;
            var frameDelta = MathUtils.sign(diff) * _this.scaleFactorVelocity * dt;
            if (Math.abs(frameDelta) > Math.abs(diff)) {
                _this.setScaleFactor(_this.targetScaleFactor);
                _this.targetScaleFactor = null;
            }
            else {
                _this.setScaleFactor(scaleFactor + frameDelta);
            }
            return true;
        };
        LayoutAnimator.addTickMotivator(this);
    }
    SwipeHandler.prototype.destructor = function () {
        LayoutAnimator.removeTickMotivator(this);
    };
    SwipeHandler.prototype.setTargetScaleFactor = function (scaleFactor) {
        this.targetScaleFactor = scaleFactor;
        CanvasRenderer.kickRender();
    };
    SwipeHandler.prototype.onSwipeStart = function () {
        this.curScaleFactor = this.getScaleFactor();
        this.targetScaleFactor = null;
        CanvasRenderer.kickRender();
    };
    SwipeHandler.prototype.applyDragDiff = function (diff, _timeStamp) {
        this.curScaleFactor += diff / window.innerWidth;
        this.setScaleFactor(this.curScaleFactor);
        CanvasRenderer.kickRender();
    };
    return SwipeHandler;
}());
exports.SwipeHandler = SwipeHandler;
