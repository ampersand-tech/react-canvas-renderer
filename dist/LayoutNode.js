"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = exports.LayoutNode = exports.marginSizeForAxis = exports.parseShadow = exports.applyConstraints = void 0;
var LayoutDrawable_1 = require("./LayoutDrawable");
var LayoutTypes_1 = require("./LayoutTypes");
var Constants = require("./Constants");
var Font_1 = require("./Font");
var LayoutAnimator_1 = require("./LayoutAnimator");
var LayoutRenderer = require("./LayoutRenderer");
var MomentumScroller_1 = require("./MomentumScroller");
var JsonUtils = require("amper-utils/dist/jsonUtils");
var MathUtils = require("amper-utils/dist/mathUtils");
var ObjUtils = require("amper-utils/dist/objUtils");
var types_1 = require("amper-utils/dist/types");
var md5 = require("blueimp-md5");
var QuarkStyles = require("quark-styles");
var SELF_DIRTY = 1 << 0;
var CHILDREN_DIRTY = 1 << 1;
var DIMS_DIRTY = 1 << 2;
var DEBUG_CACHE = false;
var DISABLE_CACHE = false;
var gDbgCounters = {
    intrinsicDims: 0,
    layout: 0,
    nodeDraw: 0,
};
function applyConstraints(constraints, dims) {
    if (constraints.min.width && dims.width < constraints.min.width) {
        dims.width = constraints.min.width;
    }
    if (constraints.min.height && dims.height < constraints.min.height) {
        dims.height = constraints.min.height;
    }
    if (constraints.max.width !== undefined && dims.width > constraints.max.width) {
        dims.width = constraints.max.width;
    }
    if (constraints.max.height !== undefined && dims.height > constraints.max.height) {
        dims.height = constraints.max.height;
    }
}
exports.applyConstraints = applyConstraints;
function isConstraining(constraints, dims) {
    if (constraints.min.width && dims.width < constraints.min.width) {
        return true;
    }
    if (constraints.min.height && dims.height < constraints.min.height) {
        return true;
    }
    if (constraints.max.width !== undefined && dims.width > constraints.max.width) {
        return true;
    }
    if (constraints.max.height !== undefined && dims.height > constraints.max.height) {
        return true;
    }
    return false;
}
function parseShadow(shadowStr, isTextShadow) {
    // Not very robust, but generally matches our quark styles
    var splt = shadowStr.split('px');
    var colIdx;
    // Text shadow does not specify spread. For boxshadow it is specified but ignored
    if (isTextShadow) {
        if (splt.length !== 4) {
            throw new Error("Unhandled text shadow support: (".concat(shadowStr, ")"));
        }
        colIdx = 3;
    }
    else {
        if (splt.length !== 5) {
            throw new Error("Unhandled text shadow support: (".concat(shadowStr, ")"));
        }
        colIdx = 4;
    }
    return {
        offsetX: parseFloat(splt[0]),
        offsetY: parseFloat(splt[1]),
        blur: parseFloat(splt[2]),
        color: splt[colIdx].trim(),
    };
}
exports.parseShadow = parseShadow;
function marginSizeForAxis(margins, axis, which) {
    switch (which) {
        case 'total':
            if (axis === LayoutTypes_1.Axis.Width) {
                return margins.left + margins.right;
            }
            else {
                return margins.top + margins.bottom;
            }
        case 'start':
            if (axis === LayoutTypes_1.Axis.Width) {
                return margins.left;
            }
            else {
                return margins.top;
            }
        case 'end':
            if (axis === LayoutTypes_1.Axis.Width) {
                return margins.right;
            }
            else {
                return margins.bottom;
            }
        case 'max2':
            if (axis === LayoutTypes_1.Axis.Width) {
                return 2 * Math.max(margins.left, margins.right);
            }
            else {
                return 2 * Math.max(margins.top, margins.bottom);
            }
        default:
            (0, types_1.absurd)(which);
            return 0;
    }
}
exports.marginSizeForAxis = marginSizeForAxis;
// returns undefined if nothing changed; otherwise it returns the reconciled set of drawables
function reconcileDrawables(oldDrawables, newDrawables) {
    var out = Array.isArray(oldDrawables) ? [] : {};
    var isChanged = false;
    for (var key in newDrawables) {
        var oldDraw = oldDrawables[key];
        var newDraw = newDrawables[key];
        if (!oldDraw) {
            // no existing drawable with this key
            out[key] = newDraw;
            isChanged = true;
        }
        else if (oldDraw.constructor !== newDraw.constructor) {
            // not the same type
            out[key] = newDraw;
            isChanged = true;
        }
        else if (!ObjUtils.objCmpFast(oldDraw.initParams, newDraw.initParams)) {
            // different params
            out[key] = newDraw;
            isChanged = true;
        }
        else {
            out[key] = oldDraw;
        }
    }
    for (var key in oldDrawables) {
        if (!newDrawables[key]) {
            isChanged = true;
            break;
        }
    }
    return isChanged ? out : undefined;
}
var LayoutNode = /** @class */ (function () {
    function LayoutNode(layoutBehavior) {
        var _this = this;
        this.dirtyBits = SELF_DIRTY | DIMS_DIRTY;
        this.virtualChildren = [];
        this.preContentDrawables = {};
        this.contentDrawables = [];
        this.postContentDrawables = {};
        this.animators = [];
        this.unmountAnimations = [];
        this.input = undefined;
        this.isUnmounting = false;
        this.isAnimating = false;
        this.isCacheable = false;
        this.cacheDirty = true;
        this.style = {};
        this.styleHash = '';
        this.classNames = [];
        this.classNamesHash = '';
        this.pseudoSelectors = [];
        // layout constraints from parent
        this.externalConstraints = { min: {}, max: {} };
        this.intrinsicDims = { width: 0, height: 0 };
        this.dataProps = {};
        this.onClick = undefined;
        this.onDoubleClick = undefined;
        this.onLongPress = undefined;
        this.notifyActive = function (active) {
            var activeIdx = _this.pseudoSelectors.indexOf('active');
            var isActive = activeIdx >= 0;
            if (isActive === active) {
                return;
            }
            if (active) {
                _this.pseudoSelectors.push('active');
            }
            else {
                _this.pseudoSelectors.splice(activeIdx, 1);
            }
            _this.applyPseudoSelectors();
        };
        this.getScrollHandler = function () {
            return _this.dataProps.scrollHandler || _this.scroller;
        };
        this.getChildBounds = function () {
            var bounds = { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
            for (var _i = 0, _a = _this.layout.children; _i < _a.length; _i++) {
                var layout = _a[_i];
                var x = layout.computedOffset.x + layout.offsetX;
                var y = layout.computedOffset.y + layout.offsetY;
                bounds.xMin = Math.min(bounds.xMin, x);
                bounds.yMin = Math.min(bounds.yMin, y);
                bounds.xMax = Math.max(bounds.xMax, x + layout.renderDims.width + layout.margin.right);
                bounds.yMax = Math.max(bounds.yMax, y + layout.renderDims.height + layout.margin.bottom);
            }
            return bounds;
        };
        this.getDimensions = function () {
            return _this.layout.renderDims;
        };
        // if cb returns true, stop walking down
        this.walkDownTree = function (cb) {
            var cbResult = cb(_this);
            if (cbResult !== Constants.TREE_WALKER_CB_RESULT.CONTINUE) {
                return cbResult;
            }
            for (var _i = 0, _a = _this.layout.children; _i < _a.length; _i++) {
                var layout = _a[_i];
                cbResult = layout.node.walkDownTree(cb);
                if (cbResult === Constants.TREE_WALKER_CB_RESULT.DONE) {
                    return cbResult;
                }
            }
        };
        // for React devtools, pretend to be a DOMNode
        this.nodeType = 1;
        this.layout = new LayoutTypes_1.LayoutNodeData(this);
        this.layoutBehavior = layoutBehavior;
    }
    LayoutNode.prototype.destructor = function () {
        this.parent = undefined;
        if (this.reactFiber) {
            LayoutRenderer.unmountLayoutNode(this);
            this.reactFiber = undefined;
        }
        for (var _i = 0, _a = this.layout.children; _i < _a.length; _i++) {
            var child = _a[_i];
            child.node.destructor();
        }
        this.layout.children = [];
        for (var _b = 0, _c = this.virtualChildren; _b < _c.length; _b++) {
            var vChild = _c[_b];
            vChild.unmount(true);
        }
        this.virtualChildren = [];
        for (var _d = 0, _e = this.animators; _d < _e.length; _d++) {
            var animator = _e[_d];
            animator.destructor();
        }
        this.animators = [];
        if (this.positionParent) {
            this.positionParent.destructor();
            this.positionParent = undefined;
        }
        if (this.scroller) {
            this.scroller.destructor();
            this.scroller = undefined;
        }
        this.unmountAnimations = [];
        this.isUnmounting = false;
        if (this.input) {
            this.input.destructor();
            this.input = undefined;
        }
        this.cacheCanvas = undefined;
    };
    LayoutNode.prototype.unmount = function (skipUnmountAnimations) {
        if (this.isUnmounting || !this.unmountAnimations.length || skipUnmountAnimations) {
            this.removeFromParent();
            this.destructor();
            return;
        }
        for (var _i = 0, _a = this.animators; _i < _a.length; _i++) {
            var animator = _a[_i];
            animator.destructor();
        }
        this.animators = [];
        for (var _b = 0, _c = this.unmountAnimations; _b < _c.length; _b++) {
            var def = _c[_b];
            this.addAnimation(def);
        }
        this.unmountAnimations = [];
        this.isUnmounting = true;
    };
    LayoutNode.prototype.isUnmounted = function () {
        return this.isUnmounting || !this.parent;
    };
    LayoutNode.prototype.removeAnimationWithKey = function (animKey) {
        for (var _i = 0, _a = this.animators; _i < _a.length; _i++) {
            var animator = _a[_i];
            if (animator.animKey() === animKey) {
                this.removeAnimation(animator);
                return;
            }
        }
    };
    LayoutNode.prototype.removeAnimation = function (animator) {
        var idx = this.animators.indexOf(animator);
        if (idx >= 0) {
            this.animators.splice(idx, 1);
            animator.destructor();
        }
        if (this.isUnmounting && this.animators.length === 0) {
            this.unmount();
        }
    };
    LayoutNode.prototype.setLayoutBehavior = function (layoutBehavior) {
        if (this.layoutBehavior !== layoutBehavior) {
            this.layoutBehavior = layoutBehavior;
            this.setDirty();
        }
    };
    LayoutNode.prototype.addChild = function (node, beforeNode) {
        if (!this.layoutBehavior) {
            throw new Error('node does not support children');
        }
        if (node.parent) {
            throw new Error('addChild: node already has a parent');
        }
        if (beforeNode) {
            var beforeIndex = this.layout.children.indexOf(beforeNode.layout);
            if (beforeIndex === -1) {
                throw new Error('beforeNode is not a child of this node.');
            }
            this.layout.children.splice(beforeIndex, 0, node.layout);
        }
        else {
            this.layout.children.push(node.layout);
        }
        node.parent = this;
        this.setDirty();
        this.childIsDirty(node);
    };
    LayoutNode.prototype.removeChild = function (node) {
        var idx = this.layout.children.indexOf(node.layout);
        if (idx >= 0) {
            node.parent = undefined;
            this.layout.children.splice(idx, 1);
            this.setDirty();
        }
    };
    LayoutNode.prototype.removeFromParent = function () {
        if (this.parent instanceof LayoutNode) {
            this.parent.removeChild(this);
        }
        this.parent = undefined;
    };
    LayoutNode.prototype.addVirtualChild = function (child) {
        this.virtualChildren.push(child);
    };
    LayoutNode.prototype.removeVirtualChild = function (child) {
        var idx = this.virtualChildren.indexOf(child);
        if (idx >= 0) {
            this.virtualChildren.splice(idx, 1);
        }
    };
    LayoutNode.prototype.setPositionParent = function (positionParent) {
        if (this.positionParent) {
            this.positionParent.destructor();
            this.positionParent = undefined;
        }
        if (positionParent && this.parent instanceof LayoutNode) {
            this.layout.hasPositionParent = true;
            this.positionParent = new LayoutAnimator_1.PositionParent(this.layout, this.parent, positionParent);
        }
        else {
            this.layout.hasPositionParent = false;
        }
    };
    LayoutNode.prototype.setStyle = function (style, classNames) {
        classNames = classNames.sort();
        var classNamesHash = classNames.join(' ');
        var styleHash = md5(JsonUtils.safeStringify(style));
        if (this.styleHash !== styleHash || this.classNamesHash !== classNamesHash) {
            this.styleHash = styleHash;
            this.classNamesHash = classNamesHash;
            this.classNames = classNames;
            this.style = style;
            this.applyPseudoSelectors();
        }
        return this;
    };
    LayoutNode.prototype.applyPseudoSelectors = function () {
        var style = this.style;
        for (var _i = 0, _a = this.classNames; _i < _a.length; _i++) {
            var className = _a[_i];
            style = QuarkStyles.applyGlobalClassStyles(style, className, this.pseudoSelectors);
        }
        this.applyStyle(style);
    };
    LayoutNode.prototype.applyStyle = function (style) {
        var layout = {
            localDims: {},
            localPos: { min: {}, max: {} },
            localConstraints: { min: {}, max: {} },
            padding: { left: 0, right: 0, top: 0, bottom: 0 },
            margin: { left: 0, right: 0, top: 0, bottom: 0 },
            flexProps: undefined,
            alignSelf: LayoutTypes_1.Alignment.Auto,
            color: '',
            alpha: 1,
            fontDesc: (0, Font_1.defaultFontDesc)(),
            pointerEvents: 'auto',
            overflowX: '',
            overflowY: '',
        };
        if (style.width) {
            layout.localDims.width = parseFloat(style.width);
        }
        if (style.height) {
            layout.localDims.height = parseFloat(style.height);
        }
        if (style.minWidth) {
            layout.localConstraints.min.width = parseFloat(style.minWidth);
        }
        if (style.minHeight) {
            layout.localConstraints.min.height = parseFloat(style.minHeight);
        }
        if (style.maxWidth) {
            layout.localConstraints.max.width = parseFloat(style.maxWidth);
        }
        if (style.maxHeight) {
            layout.localConstraints.max.height = parseFloat(style.maxHeight);
        }
        if (style.paddingLeft) {
            layout.padding.left = parseFloat(style.paddingLeft);
        }
        if (style.paddingRight) {
            layout.padding.right = parseFloat(style.paddingRight);
        }
        if (style.paddingTop) {
            layout.padding.top = parseFloat(style.paddingTop);
        }
        if (style.paddingBottom) {
            layout.padding.bottom = parseFloat(style.paddingBottom);
        }
        if (style.marginLeft) {
            layout.margin.left = parseFloat(style.marginLeft);
        }
        if (style.marginRight) {
            layout.margin.right = parseFloat(style.marginRight);
        }
        if (style.marginTop) {
            layout.margin.top = parseFloat(style.marginTop);
        }
        if (style.marginBottom) {
            layout.margin.bottom = parseFloat(style.marginBottom);
        }
        if (style.left !== undefined) {
            layout.localPos.min.width = parseFloat(style.left);
        }
        if (style.right !== undefined) {
            layout.localPos.max.width = parseFloat(style.right);
        }
        if (style.top !== undefined) {
            layout.localPos.min.height = parseFloat(style.top);
        }
        if (style.bottom !== undefined) {
            layout.localPos.max.height = parseFloat(style.bottom);
        }
        if (style.flexGrow || style.flexShrink || style.flexBasis) {
            layout.flexProps = {};
            if (style.flexGrow) {
                layout.flexProps.flexGrow = parseFloat(style.flexGrow) || 0;
            }
            if (style.flexShrink) {
                layout.flexProps.flexShrink = parseFloat(style.flexShrink) || 0;
            }
            if (style.flexBasis) {
                layout.flexProps.flexBasis = parseFloat(style.flexBasis) || 0;
            }
        }
        if (style.alignSelf && LayoutTypes_1.AS_LOOKUP.hasOwnProperty(style.alignSelf)) {
            layout.alignSelf = LayoutTypes_1.AS_LOOKUP[style.alignSelf];
        }
        if (style.color) {
            layout.color = style.color;
        }
        if (style.alpha !== undefined) {
            layout.alpha = MathUtils.clamp(0, 1, parseFloat(style.alpha));
        }
        if (style.opacity !== undefined) {
            layout.alpha = layout.alpha * MathUtils.clamp(0, 1, parseFloat(style.opacity));
        }
        if (style.overflow === 'scroll') {
            layout.overflowX = layout.overflowY = 'scroll';
        }
        if (style.overflowX === 'scroll') {
            layout.overflowX = 'scroll';
        }
        if (style.overflowY === 'scroll') {
            layout.overflowY = 'scroll';
        }
        // TODO inherit font styles down the tree
        if (style.fontFamily) {
            layout.fontDesc.fontFamily = style.fontFamily;
        }
        if (style.fontWeight) {
            layout.fontDesc.fontWeight = parseInt(style.fontWeight);
        }
        if (style.fontStyle) {
            layout.fontDesc.fontStyle = style.fontStyle;
        }
        if (style.fontSize) {
            layout.fontDesc.fontSize = parseInt(style.fontSize);
        }
        if (style.textDecoration) {
            layout.fontDesc.textDecoration = style.textDecoration;
        }
        if (style.lineSpacing) {
            layout.fontDesc.lineSpacing = parseFloat(style.lineSpacing);
        }
        if (style.verticalAlign) {
            layout.fontDesc.verticalAlign = style.verticalAlign;
        }
        if (style.pointerEvents === 'none' || style.pointerEvents === 'painted') {
            layout.pointerEvents = style.pointerEvents;
        }
        var preContentDrawables = {};
        var postContentDrawables = {};
        var borderRadius = undefined;
        if (style.borderBottomLeftRadius ||
            style.borderBottomRightRadius ||
            style.borderTopLeftRadius ||
            style.borderTopRightRadius) {
            // TODO: support pct
            if (style.borderBottomLeftRadius && style.borderBottomLeftRadius.indexOf('%') >= 0) {
                throw new Error('border radius percent not yet supported');
            }
            borderRadius = {
                bl: parseFloat(style.borderBottomLeftRadius) || 0,
                br: parseFloat(style.borderBottomRightRadius) || 0,
                tl: parseFloat(style.borderTopLeftRadius) || 0,
                tr: parseFloat(style.borderTopRightRadius) || 0,
            };
        }
        var boxShadow = undefined;
        if (style.boxShadow) {
            boxShadow = parseShadow(style.boxShadow, false);
        }
        if (style.backgroundColor || style.backgroundImage && style.backgroundImage.slice(0, 6) === 'linear') {
            var bgColor = style.backgroundImage && style.backgroundImage.slice(0, 6) === 'linear' ? style.backgroundImage : style.backgroundColor;
            preContentDrawables.backgroundColor = new LayoutDrawable_1.BGColorDrawable(this, bgColor, borderRadius, boxShadow);
        }
        if (style.backgroundImage && style.backgroundImage.slice(0, 4) === 'url(') {
            preContentDrawables.backgroundImage =
                new LayoutDrawable_1.ImageDrawable(this, style.backgroundImage.slice(4, -1), true, style.backgroundSize, borderRadius, boxShadow);
        }
        if (style.borderStyle && style.borderStyle !== 'none') {
            var borderWidth = Math.max(parseInt(style.borderLeftWidth) || 0, parseInt(style.borderRightWidth) || 0, parseInt(style.borderTopWidth) || 0, parseInt(style.borderBottomWidth) || 0);
            if (borderWidth > 0) {
                var color = style.borderImage || style.borderColor;
                postContentDrawables.border = new LayoutDrawable_1.BorderDrawable(this, style.borderStyle, color, borderWidth, borderRadius);
            }
        }
        var isDirty = false;
        var hasInheritedChange = false;
        var inheritedChanges = {};
        for (var key in layout) {
            if (!ObjUtils.objCmpFast(layout[key], this.layout[key])) {
                isDirty = true;
                // Todo, expand to font and maybe more
                if (key === 'color') {
                    hasInheritedChange = true;
                    inheritedChanges[key] = 1;
                }
                this.layout[key] = layout[key];
            }
        }
        var needsScroller = Boolean(layout.overflowX || layout.overflowY);
        if (this.scroller && !needsScroller) {
            this.scroller.destructor();
            this.scroller = undefined;
        }
        else if (!this.scroller && needsScroller) {
            this.scroller = new MomentumScroller_1.MomentumScroller({
                getScrollBounds: this.getChildBounds,
                getContainerSize: this.getDimensions,
                scrollX: layout.overflowX === 'scroll',
                scrollY: layout.overflowY === 'scroll',
            });
        }
        else if (this.scroller) {
            this.scroller.setScrollDirection(layout.overflowX === 'scroll', layout.overflowY === 'scroll');
        }
        var reconciledPre = reconcileDrawables(this.preContentDrawables, preContentDrawables);
        if (reconciledPre) {
            this.preContentDrawables = reconciledPre;
            isDirty = true;
        }
        var reconciledPost = reconcileDrawables(this.postContentDrawables, postContentDrawables);
        if (reconciledPost) {
            this.postContentDrawables = reconciledPost;
            isDirty = true;
        }
        for (var _i = 0, _a = this.contentDrawables; _i < _a.length; _i++) {
            var drawable = _a[_i];
            if (drawable.setStyle(style)) {
                isDirty = true;
            }
        }
        if (this.layoutBehavior && this.layoutBehavior.setStyle(style)) {
            isDirty = true;
        }
        if (isDirty) {
            this.setDirty();
        }
        if (hasInheritedChange) {
            this.setInheritedChanges(inheritedChanges, true);
        }
    };
    LayoutNode.prototype.addAnimation = function (anim) {
        this.animators.push(new LayoutAnimator_1.LayoutAnimator(anim, { node: this }));
    };
    LayoutNode.prototype.setUnmountAnimations = function (anims) {
        this.unmountAnimations = anims.slice(0);
    };
    LayoutNode.prototype.getDrawable = function (name) {
        for (var _i = 0, _a = this.contentDrawables; _i < _a.length; _i++) {
            var drawable = _a[_i];
            if (name === 'svg' && drawable instanceof LayoutDrawable_1.SVGDrawable) {
                return drawable;
            }
            if (name === 'img' && drawable instanceof LayoutDrawable_1.ImageDrawable) {
                return drawable;
            }
        }
        return this.preContentDrawables[name] || this.postContentDrawables[name];
    };
    LayoutNode.prototype.hasDrawables = function () {
        return (this.contentDrawables.length > 0 ||
            !ObjUtils.safeObjIsEmpty(this.preContentDrawables) ||
            !ObjUtils.safeObjIsEmpty(this.postContentDrawables));
    };
    LayoutNode.prototype.hasInteractionHandler = function () {
        return Boolean(this.onClick || this.onDoubleClick || this.scroller || this.dataProps.touchHandler || this.onLongPress);
    };
    LayoutNode.prototype.setCacheable = function (cacheable) {
        if (cacheable !== this.isCacheable) {
            this.isCacheable = cacheable;
            this.cacheCanvas = undefined;
            this.cacheDirty = true;
        }
    };
    LayoutNode.prototype.setWidth = function (width) {
        if (this.layout.localDims.width !== width) {
            this.layout.localDims.width = width;
            this.setDirty();
        }
        return this;
    };
    LayoutNode.prototype.setHeight = function (height) {
        if (this.layout.localDims.height !== height) {
            this.layout.localDims.height = height;
            this.setDirty();
        }
        return this;
    };
    LayoutNode.prototype.setPadding = function (padding) {
        if (!ObjUtils.objCmpFast(padding, this.layout.padding)) {
            this.layout.padding = padding;
            this.setDirty();
        }
        return this;
    };
    LayoutNode.prototype.setTextContent = function (text) {
        this.setContent([new LayoutDrawable_1.TextDrawable(this, text)]);
    };
    LayoutNode.prototype.setContent = function (drawables) {
        var reconciled = reconcileDrawables(this.contentDrawables, drawables);
        if (reconciled) {
            this.contentDrawables = reconciled;
            this.setDirty();
        }
    };
    LayoutNode.prototype.setParent = function (parent) {
        this.parent = parent;
        this.setDirty();
        this.parent.childIsDirty(this);
    };
    LayoutNode.prototype.getParent = function () {
        return this.parent;
    };
    LayoutNode.prototype.getParentNode = function () {
        if (this.parent instanceof LayoutNode) {
            return this.parent;
        }
        return undefined;
    };
    LayoutNode.prototype.getLayoutData = function () {
        return this.layout;
    };
    LayoutNode.prototype.getFontDesc = function () {
        return this.layout.fontDesc;
    };
    LayoutNode.prototype.childIsDirty = function (_node) {
        if ((this.dirtyBits & CHILDREN_DIRTY) && (this.dirtyBits & DIMS_DIRTY)) {
            return;
        }
        this.dirtyBits |= CHILDREN_DIRTY | DIMS_DIRTY;
        this.parent && this.parent.childIsDirty(this);
    };
    LayoutNode.prototype.setDirty = function (bits) {
        if (bits === void 0) { bits = SELF_DIRTY | DIMS_DIRTY; }
        if ((this.dirtyBits & bits) === bits) {
            return;
        }
        this.dirtyBits |= bits;
        if (bits & DIMS_DIRTY) {
            this.parent && this.parent.childIsDirty(this);
        }
    };
    LayoutNode.prototype.setInheritedChanges = function (inheritedChanges, isStart) {
        if (!isStart) {
            // First remove any inherited changes that we set ourselves
            var changesToRemove = [];
            for (var prop in inheritedChanges) {
                if (this.layout[prop]) {
                    changesToRemove.push(prop);
                }
            }
            if (changesToRemove.length) {
                if (changesToRemove.length === Object.keys(inheritedChanges).length) {
                    // we have no more changes to propagate, so we're done
                    return;
                }
                inheritedChanges = ObjUtils.clone(inheritedChanges);
                for (var _i = 0, changesToRemove_1 = changesToRemove; _i < changesToRemove_1.length; _i++) {
                    var prop = changesToRemove_1[_i];
                    delete inheritedChanges[prop];
                }
            }
        }
        // Now, set this one dirty since we still have changes
        this.setDirty(SELF_DIRTY);
        // Check all children
        for (var _a = 0, _b = this.layout.children; _a < _b.length; _a++) {
            var layout = _b[_a];
            layout.node.setInheritedChanges(inheritedChanges, false);
        }
    };
    LayoutNode.prototype.setExternalConstraints = function (newConstraints) {
        if (ObjUtils.objCmpFast(this.externalConstraints, newConstraints)) {
            // no change
            return;
        }
        this.externalConstraints = ObjUtils.clone(newConstraints);
        var dims = this.getIntrinsicDims();
        if (isConstraining(this.externalConstraints, dims)
            || dims.width !== this.layout.computedDims.width
            || dims.height !== this.layout.computedDims.height) {
            this.setDirty(SELF_DIRTY);
        }
    };
    // intrinsicDims are what size this node would be without any external constraints (but it does apply internal constraints)
    LayoutNode.prototype.getIntrinsicDims = function () {
        if (this.dirtyBits & DIMS_DIRTY) {
            gDbgCounters.intrinsicDims++;
            this.intrinsicDims.width = 0;
            this.intrinsicDims.height = 0;
            if (this.layout.localDims.width !== undefined) {
                this.intrinsicDims.width = this.layout.localDims.width;
            }
            if (this.layout.localDims.height !== undefined) {
                this.intrinsicDims.height = this.layout.localDims.height;
            }
            for (var key in this.preContentDrawables) {
                this.preContentDrawables[key].updateIntrinsicDims(this.intrinsicDims, this.layout.padding);
            }
            for (var _i = 0, _a = this.contentDrawables; _i < _a.length; _i++) {
                var drawable = _a[_i];
                drawable.updateIntrinsicDims(this.intrinsicDims, this.layout.padding);
            }
            for (var key in this.postContentDrawables) {
                this.postContentDrawables[key].updateIntrinsicDims(this.intrinsicDims, this.layout.padding);
            }
            if (this.layoutBehavior) {
                this.layoutBehavior.updateIntrinsicDimsForChildren(this.layout, this.intrinsicDims);
            }
            // add padding
            this.intrinsicDims.width += this.layout.padding.left + this.layout.padding.right;
            this.intrinsicDims.height += this.layout.padding.top + this.layout.padding.bottom;
            applyConstraints(this.layout.localConstraints, this.intrinsicDims);
            this.dirtyBits = this.dirtyBits & ~DIMS_DIRTY;
        }
        return ObjUtils.clone(this.intrinsicDims);
    };
    LayoutNode.prototype.layoutIfNeeded = function (force) {
        if (force === void 0) { force = false; }
        if (!this.dirtyBits && !force) {
            return false;
        }
        gDbgCounters.layout++;
        this.layout.computedDims = ObjUtils.clone(this.getIntrinsicDims());
        applyConstraints(this.externalConstraints, this.layout.computedDims);
        // no infinite dimensions!
        if (this.layout.computedDims.width === Infinity) {
            this.layout.computedDims.width = 0;
        }
        if (this.layout.computedDims.height === Infinity) {
            this.layout.computedDims.height = 0;
        }
        ObjUtils.copyFields(this.layout.computedDims, this.layout.renderDims);
        for (var _i = 0, _a = this.animators; _i < _a.length; _i++) {
            var animator = _a[_i];
            if (animator.updateDimensions(this.layout.renderDims)) {
                // the isAnimating flag is used to stop caching during animation
                this.isAnimating = true;
            }
        }
        if (this.layoutBehavior && this.layout.children.length) {
            // constrain children to fit within this node's dimensions
            var childConstraints = {
                min: {},
                max: {
                    width: Math.max(0, this.layout.renderDims.width - this.layout.padding.left - this.layout.padding.right),
                    height: Math.max(0, this.layout.renderDims.height - this.layout.padding.top - this.layout.padding.bottom),
                },
            };
            if (this.layout.overflowX === 'scroll') {
                childConstraints.max.width = undefined;
            }
            if (this.layout.overflowY === 'scroll') {
                childConstraints.max.height = undefined;
            }
            this.layoutBehavior.layoutChildren(this.layout, childConstraints, force || false);
        }
        this.dirtyBits = 0;
        this.cacheDirty = true;
        return true;
    };
    // returns true if subtree is cacheable
    LayoutNode.prototype.draw = function (ctx) {
        this.layout.offsetX = this.layout.offsetY = 0;
        var animationStatusAllowsCaching = true;
        for (var _i = 0, _a = this.animators; _i < _a.length; _i++) {
            var animator = _a[_i];
            if (animator.updateForRender()) {
                this.isAnimating = true;
                // If animating and not frame friendly
                if (!animator.isCacheFriendly()) {
                    animationStatusAllowsCaching = false;
                }
            }
        }
        this.positionParent && this.positionParent.updateForRender();
        var canvasWidth = Math.ceil(this.layout.renderDims.width * Constants.PIXEL_RATIO);
        var canvasHeight = Math.ceil(this.layout.renderDims.height * Constants.PIXEL_RATIO);
        if (this.cacheCanvas && (this.cacheCanvas.width !== canvasWidth || this.cacheCanvas.height !== canvasHeight)) {
            // renderDims changed, free cached canvas
            this.cacheCanvas = undefined;
            this.cacheDirty = true;
        }
        if (this.isCacheable && this.cacheDirty && !DISABLE_CACHE && canvasWidth && canvasHeight && animationStatusAllowsCaching) {
            if (!this.cacheCanvas) {
                this.cacheCanvas = document.createElement('canvas');
                this.cacheCanvas.width = canvasWidth;
                this.cacheCanvas.height = canvasHeight;
            }
            var cacheCtx = this.cacheCanvas.getContext('2d');
            if (cacheCtx) {
                cacheCtx.save();
                cacheCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                cacheCtx.scale(Constants.PIXEL_RATIO, Constants.PIXEL_RATIO);
                cacheCtx.globalAlpha = 1;
                cacheCtx.fillStyle = ctx.fillStyle;
                this.cacheDirty = !this.drawInternal(cacheCtx);
                cacheCtx.restore();
            }
            else {
                this.cacheDirty = true;
            }
        }
        var isCacheableFrame = !this.isAnimating;
        this.isAnimating = false;
        if (this.layout.alpha === 0) {
            return isCacheableFrame;
        }
        ctx.save();
        ctx.translate(this.layout.computedOffset.x + this.layout.offsetX, this.layout.computedOffset.y + this.layout.offsetY);
        if (this.cacheCanvas && !this.cacheDirty) {
            ctx.globalAlpha *= this.layout.alpha;
            ctx.drawImage(this.cacheCanvas, 0, 0, this.layout.renderDims.width * Constants.PIXEL_RATIO, this.layout.renderDims.height * Constants.PIXEL_RATIO, 0, 0, this.layout.renderDims.width, this.layout.renderDims.height);
            if (DEBUG_CACHE) {
                ctx.strokeStyle = 'red';
                ctx.strokeRect(0, 0, this.layout.renderDims.width, this.layout.renderDims.height);
            }
        }
        else {
            ctx.globalAlpha *= this.layout.alpha;
            if (!this.drawInternal(ctx)) {
                isCacheableFrame = false;
            }
        }
        ctx.restore();
        return isCacheableFrame;
    };
    // returns true if subtree is cacheable
    LayoutNode.prototype.drawInternal = function (ctx) {
        gDbgCounters.nodeDraw++;
        var noCache = false;
        ctx.translate(this.layout.padding.left, this.layout.padding.top);
        if (this.layout.color) {
            ctx.fillStyle = this.layout.color;
        }
        var innerDims = {
            width: this.layout.renderDims.width - this.layout.padding.left - this.layout.padding.right,
            height: this.layout.renderDims.height - this.layout.padding.top - this.layout.padding.bottom,
        };
        for (var key in this.preContentDrawables) {
            ctx.save();
            if (!this.preContentDrawables[key].draw(ctx, innerDims, this.layout.padding)) {
                noCache = true;
            }
            ctx.restore();
        }
        if (this.scroller) {
            ctx.save();
            // build clipping region
            ctx.beginPath();
            ctx.lineTo(this.layout.renderDims.width, 0);
            ctx.lineTo(this.layout.renderDims.width, this.layout.renderDims.height);
            ctx.lineTo(0, this.layout.renderDims.height);
            ctx.lineTo(0, 0);
            ctx.clip();
            // apply scroll offset to children
            ctx.translate(-this.scroller.getScrollX(), -this.scroller.getScrollY());
        }
        if (this.dataProps.drawReversed) {
            for (var i = this.layout.children.length - 1; i >= 0; --i) {
                var layout = this.layout.children[i];
                if (!layout.node.draw(ctx)) {
                    noCache = true;
                }
            }
        }
        else {
            for (var _i = 0, _a = this.layout.children; _i < _a.length; _i++) {
                var layout = _a[_i];
                if (!layout.node.draw(ctx)) {
                    noCache = true;
                }
            }
        }
        if (this.scroller) {
            ctx.restore();
        }
        for (var _b = 0, _c = this.contentDrawables; _b < _c.length; _b++) {
            var drawable = _c[_b];
            ctx.save();
            if (!drawable.draw(ctx, innerDims, this.layout.padding)) {
                noCache = true;
            }
            ctx.restore();
        }
        for (var key in this.postContentDrawables) {
            ctx.save();
            if (!this.postContentDrawables[key].draw(ctx, innerDims, this.layout.padding)) {
                noCache = true;
            }
            ctx.restore();
        }
        return !noCache;
    };
    LayoutNode.prototype.layoutTreeIfNeeded = function () {
        var node = this;
        while ((node instanceof LayoutNode) && node.parent) {
            node = node.parent;
        }
        node.layoutIfNeeded();
    };
    LayoutNode.prototype.getRootFiber = function () {
        var node = this;
        while (node) {
            if (node.reactFiber) {
                return node.reactFiber;
            }
            if (node.parent instanceof LayoutNode) {
                node = node.parent;
            }
            else {
                node = null;
            }
        }
        return null;
    };
    LayoutNode.prototype.getScreenOffset = function (includePadding) {
        var offset = ObjUtils.clone(this.layout.computedOffset);
        offset.x += this.layout.offsetX + (includePadding ? this.layout.padding.left : 0);
        offset.y += this.layout.offsetY + (includePadding ? this.layout.padding.top : 0);
        if (this.scroller) {
            offset.x -= this.scroller.getScrollX();
            offset.y -= this.scroller.getScrollY();
        }
        if (this.parent) {
            var parentOffset = this.parent.getScreenOffset(true);
            offset.x += parentOffset.x;
            offset.y += parentOffset.y;
        }
        return offset;
    };
    LayoutNode.prototype.getDebugTree = function () {
        this.layoutIfNeeded();
        var res = {
            type: this.layoutBehavior ? this.layoutBehavior.toString() : 'Node',
            offset: ObjUtils.clone(this.layout.computedOffset),
            dims: ObjUtils.clone(this.layout.renderDims),
            children: this.layout.children.map(function (child) { return child.node.getDebugTree(); }),
        };
        res.offset.x += this.layout.offsetX;
        res.offset.y += this.layout.offsetY;
        for (var _i = 0, _a = this.contentDrawables; _i < _a.length; _i++) {
            var drawable = _a[_i];
            if (drawable instanceof LayoutDrawable_1.TextDrawable) {
                res.text = drawable.text;
            }
        }
        return res;
    };
    LayoutNode.prototype.getChild = function (path) {
        var layout = this.layout;
        for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
            var p = path_1[_i];
            layout = layout.children[p];
            if (!layout) {
                return undefined;
            }
        }
        return layout.node;
    };
    LayoutNode.prototype.getLeafTouchableNodeAt = function (layoutSpacePoint) {
        this.layoutIfNeeded();
        if (this.layout.pointerEvents === 'none') {
            return undefined;
        }
        var innerSpacePoint = {
            x: layoutSpacePoint.x - this.layout.padding.left,
            y: layoutSpacePoint.y - this.layout.padding.top,
        };
        if (this.scroller) {
            if (innerSpacePoint.x < 0 ||
                innerSpacePoint.y < 0 ||
                innerSpacePoint.x > this.layout.renderDims.width ||
                innerSpacePoint.y > this.layout.renderDims.height) {
                // clipped out
                return this;
            }
            innerSpacePoint.x += this.scroller.getScrollX();
            innerSpacePoint.y += this.scroller.getScrollY();
        }
        for (var i = this.layout.children.length - 1; i >= 0; --i) {
            // check if innerSpacePoint is contained within child
            var layout = this.layout.children[i];
            var offset = ObjUtils.clone(layout.computedOffset);
            offset.x += layout.offsetX;
            offset.y += layout.offsetY;
            if (innerSpacePoint.x >= offset.x &&
                innerSpacePoint.x <= (offset.x + layout.renderDims.width) &&
                innerSpacePoint.y >= offset.y &&
                innerSpacePoint.y <= (offset.y + layout.renderDims.height)) {
                var hit = layout.node.getLeafTouchableNodeAt({
                    x: innerSpacePoint.x - offset.x,
                    y: innerSpacePoint.y - offset.y,
                });
                if (hit) {
                    return hit;
                }
            }
        }
        if (this.hasInteractionHandler()) {
            return this;
        }
        // didn't hit any children
        if (this.layout.pointerEvents === 'painted' || !this.hasDrawables()) {
            return undefined;
        }
        return this;
    };
    LayoutNode.prototype.getBoundingClientRect = function () {
        this.layoutTreeIfNeeded();
        var offset = this.getScreenOffset();
        var rect = new DOMRect();
        rect.x = offset.x;
        rect.y = offset.y;
        rect.width = this.layout.renderDims.width;
        rect.height = this.layout.renderDims.height;
        return rect;
    };
    LayoutNode.prototype.getClientRects = function () {
        return [this.getBoundingClientRect()];
    };
    LayoutNode.prototype.getComputedStyle = function () {
        var style = {
            borderLeftWidth: '0px',
            borderRightWidth: '0px',
            borderTopWidth: '0px',
            borderBottomWidth: '0px',
            marginLeft: this.layout.margin.left + 'px',
            marginRight: this.layout.margin.right + 'px',
            marginTop: this.layout.margin.top + 'px',
            marginBottom: this.layout.margin.bottom + 'px',
            paddingLeft: this.layout.padding.left + 'px',
            paddingRight: this.layout.padding.right + 'px',
            paddingTop: this.layout.padding.top + 'px',
            paddingBottom: this.layout.padding.bottom + 'px',
        };
        return style;
    };
    // for TestDom to be able to dispatch events
    LayoutNode.prototype.getCanvas = function () {
        return this.parent ? this.parent.getCanvas() : undefined;
    };
    LayoutNode.prototype.isAnimatingLayout = function () {
        var node = this;
        while (node instanceof LayoutNode) {
            for (var _i = 0, _a = node.animators; _i < _a.length; _i++) {
                var animator = _a[_i];
                if (animator.isAnimatingLayout()) {
                    return true;
                }
            }
            node = node.parent;
        }
        return false;
    };
    return LayoutNode;
}());
exports.LayoutNode = LayoutNode;
exports.debug = {
    getCounters: function (doReset) {
        if (doReset === void 0) { doReset = false; }
        var ret = gDbgCounters;
        if (doReset) {
            exports.debug.resetCounters();
        }
        return ret;
    },
    resetCounters: function () {
        gDbgCounters = {
            intrinsicDims: 0,
            layout: 0,
            nodeDraw: 0,
        };
    },
};
