"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var MathUtils = require("amper-utils/dist2017/mathUtils");
var types_1 = require("amper-utils/dist2017/types");
var CanvasRenderer = require("CanvasRenderer");
var color = require("color");
var LayoutDrawable_1 = require("LayoutDrawable");
var gTimeAccum = 0;
var gAnimators = [];
var gTickMotivators = [];
var CACHE_FRIENDLY_FIELDS = {
    alpha: 1,
    offsetX: 1,
    offsetY: 1,
};
function tickAll(dt) {
    gTimeAccum += dt;
    var anyChanged = false;
    for (var _i = 0, gAnimators_1 = gAnimators; _i < gAnimators_1.length; _i++) {
        var animator = gAnimators_1[_i];
        anyChanged = animator.tick() || anyChanged;
    }
    for (var _a = 0, gTickMotivators_1 = gTickMotivators; _a < gTickMotivators_1.length; _a++) {
        var motivator = gTickMotivators_1[_a];
        anyChanged = motivator.tick(dt) || anyChanged;
    }
    return anyChanged;
}
exports.tickAll = tickAll;
function addTickMotivator(motivator) {
    gTickMotivators.push(motivator);
}
exports.addTickMotivator = addTickMotivator;
function removeTickMotivator(motivator) {
    var idx = gTickMotivators.indexOf(motivator);
    if (idx >= 0) {
        gTickMotivators.splice(idx, 1);
    }
}
exports.removeTickMotivator = removeTickMotivator;
function getTimeUntilNextAnimation() {
    var time = Infinity;
    for (var _i = 0, gAnimators_2 = gAnimators; _i < gAnimators_2.length; _i++) {
        var animator = gAnimators_2[_i];
        time = Math.min(time, animator.getTimeUntilNextAnimation());
    }
    return isFinite(time) ? time : 0;
}
exports.getTimeUntilNextAnimation = getTimeUntilNextAnimation;
function getModifiedNumber(value, origValue) {
    if (typeof value === 'number') {
        // raw number, use it
        return value;
    }
    if (value.slice(-1) === '%') {
        // percent, use as multiplier
        var multiplier = (parseInt(value) || 0) * 0.01;
        return multiplier * origValue;
    }
    // parse and hope for the best
    return parseFloat(value) || 0;
}
function getModifiedColor(value, origValue) {
    if (value.slice(-1) === '%') {
        var multiplier = (parseFloat(value) || 0) * 0.01;
        return origValue.alpha(origValue.alpha() * multiplier);
    }
    return color(value);
}
var LayoutAnimator = /** @class */ (function () {
    function LayoutAnimator(anim, target) {
        this.param = -1;
        this.startTime = 0;
        this.isDimensionAnimation = false;
        CanvasRenderer.flushAnimations();
        gAnimators.push(this);
        this.anim = anim;
        this.target = target;
        this.startTime = gTimeAccum;
        this.targetField = this.anim.modifier.field;
        switch (this.targetField) {
            case 'backgroundColor':
                this.targetDrawable = 'backgroundColor';
                this.targetField = 'color';
                break;
            case 'backgroundImageScale':
                this.targetDrawable = 'backgroundImage';
                this.targetField = 'drawScale';
                break;
            case 'imageScale':
                this.targetDrawable = 'img';
                this.targetField = 'drawScale';
                break;
            case 'borderColor':
                this.targetDrawable = 'border';
                this.targetField = 'color';
                break;
        }
        if (!this.targetDrawable && (this.targetField === 'width' || this.targetField === 'height')) {
            this.isDimensionAnimation = true;
        }
        var origFieldValue = this.getOrigFieldValue();
        var fieldValueType = typeof origFieldValue;
        if (fieldValueType !== 'string' && fieldValueType !== 'number' && origFieldValue !== undefined) {
            throw new Error("Invalid field type \"" + fieldValueType + "\" found for animator");
        }
        CanvasRenderer.kickRender();
    }
    LayoutAnimator.prototype.destructor = function () {
        this.isDimensionAnimation = false;
        var idx = gAnimators.indexOf(this);
        if (idx >= 0) {
            gAnimators.splice(idx, 1);
        }
    };
    LayoutAnimator.prototype.isAnimatingLayout = function () {
        if (this.anim.motivator.source !== 'time') {
            return false;
        }
        if (this.isDimensionAnimation) {
            return true;
        }
        if (this.anim.modifier.field === 'offsetX' || this.anim.modifier.field === 'offsetY') {
            return true;
        }
        return false;
    };
    LayoutAnimator.prototype.getTimeUntilNextAnimation = function () {
        if (this.anim.motivator.source !== 'time') {
            return Infinity;
        }
        var curTime = gTimeAccum - this.startTime;
        var timeUntilStart = this.anim.motivator.start - curTime;
        if (timeUntilStart <= 0) {
            return 0.01;
        }
        return timeUntilStart;
    };
    LayoutAnimator.prototype.getOrigFieldValue = function () {
        var srcObj = this.getTarget();
        if (srcObj) {
            if (srcObj instanceof LayoutDrawable_1.LayoutDrawable) {
                return srcObj.initParams[this.targetField];
            }
            else {
                if (this.origFieldValue === undefined) {
                    this.origFieldValue = srcObj[this.targetField];
                }
                return this.origFieldValue;
            }
        }
    };
    LayoutAnimator.prototype.getTarget = function () {
        return this.targetDrawable ? this.target.node.getDrawable(this.targetDrawable) : this.target.node.getLayoutData();
    };
    LayoutAnimator.prototype.tick = function () {
        var val = 0;
        switch (this.anim.motivator.source) {
            case 'time':
                val = gTimeAccum - this.startTime;
                var lp = this.anim.motivator.loopPeriod;
                if (lp) {
                    var frac = val / lp;
                    frac -= Math.trunc(frac);
                    val = frac * lp;
                }
                break;
            case 'screenX':
                this.target.node.layoutTreeIfNeeded();
                val = this.target.node.getScreenOffset().x;
                // TODO: loopPeriod for position?
                break;
            case 'screenY':
                this.target.node.layoutTreeIfNeeded();
                val = this.target.node.getScreenOffset().y;
                // TODO: loopPeriod for position?
                break;
            default:
                types_1.absurd(this.anim.motivator.source);
        }
        var uneasyParam = MathUtils.parameterize(this.anim.motivator.start, this.anim.motivator.end, val);
        var newParam = MathUtils.interpEaseClamped(this.anim.motivator.easingFunction, 0, 1, uneasyParam);
        if (newParam === this.param) {
            if (this.anim.motivator.source === 'time' && newParam >= 1 && !this.anim.motivator.loopPeriod) {
                this.target.node.removeAnimation(this);
            }
            return false;
        }
        if (this.isDimensionAnimation) {
            // changed dimensions, trigger a layout update
            this.target.node.setDirty();
        }
        this.param = newParam;
        return true;
    };
    LayoutAnimator.prototype.getAnimatedValue = function (origFieldValue) {
        if (origFieldValue === undefined) {
            return undefined;
        }
        var modifier = this.anim.modifier;
        if (typeof origFieldValue === 'number') {
            var start = getModifiedNumber(modifier.start, origFieldValue);
            var end = getModifiedNumber(modifier.end, origFieldValue);
            return MathUtils.interp(start, end, this.param);
        }
        var origColor = color(origFieldValue || 'black');
        var startColor = getModifiedColor('' + modifier.start, origColor);
        var endColor = getModifiedColor('' + modifier.end, origColor);
        return startColor.mix(endColor, this.param).rgb().string();
    };
    // return true if this is cache-busting
    LayoutAnimator.prototype.updateDimensions = function (renderDims) {
        if (!this.isDimensionAnimation) {
            return false;
        }
        renderDims[this.targetField] = this.getAnimatedValue(renderDims[this.targetField]);
        return true;
    };
    LayoutAnimator.prototype.updateForRender = function () {
        if (this.isDimensionAnimation) {
            return false;
        }
        var origFieldValue = this.getOrigFieldValue();
        if (origFieldValue === undefined) {
            return false;
        }
        var target = this.getTarget();
        if (!target) {
            return false;
        }
        target[this.targetField] = this.getAnimatedValue(origFieldValue);
        return true;
    };
    LayoutAnimator.prototype.isCacheFriendly = function () {
        return (CACHE_FRIENDLY_FIELDS[this.targetField] === 1);
    };
    LayoutAnimator.prototype.animKey = function () {
        return this.anim.key;
    };
    return LayoutAnimator;
}());
exports.LayoutAnimator = LayoutAnimator;
var PositionParent = /** @class */ (function () {
    function PositionParent(layout, layoutParent, positionParent) {
        this.layout = layout;
        this.layoutParent = layoutParent;
        this.positionParent = positionParent;
        addTickMotivator(this);
        this.positionParent.addVirtualChild(this.layout.node);
    }
    PositionParent.prototype.destructor = function () {
        removeTickMotivator(this);
        this.positionParent.removeVirtualChild(this.layout.node);
    };
    PositionParent.prototype.tick = function (_dt) {
        if (this.positionParent.isUnmounted()) {
            this.relativePos = undefined;
            return false;
        }
        this.positionParent.layoutTreeIfNeeded();
        this.layoutParent.layoutTreeIfNeeded();
        var parentPos = this.positionParent.getScreenOffset(true);
        if (this.layout.localPos.max.width !== undefined) {
            parentPos.x += this.positionParent.getLayoutData().renderDims.width;
        }
        if (this.layout.localPos.max.height !== undefined) {
            parentPos.y += this.positionParent.getLayoutData().renderDims.height;
        }
        this.relativePos = MathUtils.vectorSub(parentPos, this.layoutParent.getScreenOffset());
        return false;
    };
    PositionParent.prototype.updateForRender = function () {
        if (this.relativePos) {
            this.layout.offsetX += this.relativePos.x;
            this.layout.offsetY += this.relativePos.y;
        }
    };
    return PositionParent;
}());
exports.PositionParent = PositionParent;
