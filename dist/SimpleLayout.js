"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleLayout = void 0;
var LayoutTypes_1 = require("./LayoutTypes");
var LayoutNode_1 = require("./LayoutNode");
var types_1 = require("amper-utils/dist/types");
var SimpleLayout = /** @class */ (function (_super) {
    __extends(SimpleLayout, _super);
    function SimpleLayout() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.alignItems = LayoutTypes_1.Alignment.Start;
        return _this;
    }
    SimpleLayout.prototype.toString = function () {
        return 'S' + (this.direction === LayoutTypes_1.Direction.Row ? 'Row' : 'Col');
    };
    SimpleLayout.prototype.applyLocalPos = function (child, available, crossAxisSize) {
        if (child.localPos.min[this.mainAxis] !== undefined) {
            child.computedOffset[this.mainAxisPos] = child.localPos.min[this.mainAxis];
        }
        else if (child.localPos.max[this.mainAxis] !== undefined) {
            child.computedOffset[this.mainAxisPos] = available - child.localPos.max[this.mainAxis] - child.renderDims[this.mainAxis];
        }
        if (child.localPos.min[this.crossAxis] !== undefined) {
            child.computedOffset[this.crossAxisPos] = child.localPos.min[this.crossAxis];
        }
        else if (child.localPos.max[this.crossAxis] !== undefined) {
            child.computedOffset[this.crossAxisPos] = crossAxisSize - child.localPos.max[this.crossAxis] - child.renderDims[this.crossAxis];
        }
    };
    SimpleLayout.prototype.setStyle = function (style) {
        var alignItems = LayoutTypes_1.Alignment.Start;
        if (style.alignItems && LayoutTypes_1.AI_LOOKUP.hasOwnProperty(style.alignItems)) {
            alignItems = LayoutTypes_1.AI_LOOKUP[style.alignItems];
        }
        if (alignItems !== this.alignItems) {
            this.alignItems = alignItems;
            return true;
        }
        return false;
    };
    SimpleLayout.prototype.updateIntrinsicDimsForChildren = function (layout, dims) {
        var cumSize = 0;
        for (var _i = 0, _a = layout.children; _i < _a.length; _i++) {
            var child = _a[_i];
            var childDims = child.node.getIntrinsicDims();
            if (layout.localDims[this.mainAxis] === undefined) {
                var mainAxisSize = Math.max(0, childDims[this.mainAxis] + (0, LayoutNode_1.marginSizeForAxis)(child.margin, this.mainAxis, 'total'));
                if (child.localPos.min[this.mainAxis] !== undefined) {
                    dims[this.mainAxis] = Math.max(dims[this.mainAxis], child.localPos.min[this.mainAxis] + mainAxisSize);
                }
                else if (child.localPos.max[this.mainAxis] !== undefined) {
                    dims[this.mainAxis] = Math.max(dims[this.mainAxis], mainAxisSize);
                }
                else {
                    cumSize += mainAxisSize;
                }
            }
            var alignment = (0, LayoutTypes_1.itemAlignment)(child, this.alignItems, this.crossAxis);
            var crossAxisMargin = (0, LayoutNode_1.marginSizeForAxis)(child.margin, this.crossAxis, alignment === LayoutTypes_1.Alignment.Center ? 'max2' : 'total');
            var crossAxisSize = childDims[this.crossAxis] + crossAxisMargin + (child.localPos.min[this.crossAxis] || 0);
            dims[this.crossAxis] = Math.max(dims[this.crossAxis], crossAxisSize);
        }
        dims[this.mainAxis] = Math.max(dims[this.mainAxis], cumSize);
    };
    SimpleLayout.prototype.layoutChildren = function (layout, childConstraints, force) {
        var available = childConstraints.max[this.mainAxis] === undefined ? Infinity : childConstraints.max[this.mainAxis];
        var crossAxisSize = childConstraints.max[this.crossAxis] === undefined ? Infinity : childConstraints.max[this.crossAxis];
        var offset = 0; // NOTE: this.padding is added to child offset later
        for (var _i = 0, _a = layout.children; _i < _a.length; _i++) {
            var child = _a[_i];
            var isPositioned = false;
            if (child.hasPositionParent) {
                child.node.layoutIfNeeded(force);
                child.computedOffset.x = 0;
                child.computedOffset.y = 0;
                this.applyLocalPos(child, 0, 0);
                continue;
            }
            // layout child
            var childMainOffset = offset;
            var childCrossOffset = 0;
            var endMargin = 0;
            if (child.localPos.min[this.mainAxis] !== undefined) {
                childMainOffset = child.localPos.min[this.mainAxis];
                isPositioned = true;
            }
            else if (child.localPos.max[this.mainAxis] !== undefined) {
                childMainOffset = 0;
                isPositioned = true;
            }
            else {
                childMainOffset += (0, LayoutNode_1.marginSizeForAxis)(child.margin, this.mainAxis, 'start');
                endMargin = (0, LayoutNode_1.marginSizeForAxis)(child.margin, this.mainAxis, 'end');
            }
            if (child.localPos.min[this.crossAxis] !== undefined) {
                childCrossOffset = child.localPos.min[this.crossAxis];
            }
            var crossAxisMargin = (0, LayoutNode_1.marginSizeForAxis)(child.margin, this.crossAxis, 'total');
            childConstraints.max[this.mainAxis] = Math.max(0, available - childMainOffset - endMargin);
            childConstraints.max[this.crossAxis] = Math.max(0, crossAxisSize - childCrossOffset - crossAxisMargin);
            var alignment = (0, LayoutTypes_1.itemAlignment)(child, this.alignItems, this.crossAxis);
            if (alignment === LayoutTypes_1.Alignment.Stretch) {
                childConstraints.min[this.crossAxis] = crossAxisSize - crossAxisMargin;
            }
            child.node.setExternalConstraints(childConstraints);
            child.node.layoutIfNeeded(force);
            // position child
            child.computedOffset[this.mainAxisPos] = childMainOffset;
            childMainOffset += child.renderDims[this.mainAxis];
            childMainOffset += endMargin;
            switch (alignment) {
                case LayoutTypes_1.Alignment.Center:
                    child.computedOffset[this.crossAxisPos] = (crossAxisSize - child.renderDims[this.crossAxis]) * 0.5;
                    break;
                case LayoutTypes_1.Alignment.Auto:
                case LayoutTypes_1.Alignment.Start:
                case LayoutTypes_1.Alignment.Stretch:
                    child.computedOffset[this.crossAxisPos] = (0, LayoutNode_1.marginSizeForAxis)(child.margin, this.crossAxis, 'start');
                    break;
                case LayoutTypes_1.Alignment.End:
                    child.computedOffset[this.crossAxisPos] =
                        crossAxisSize - child.renderDims[this.crossAxis] - (0, LayoutNode_1.marginSizeForAxis)(child.margin, this.crossAxis, 'end');
                    break;
                default:
                    (0, types_1.absurd)(alignment);
            }
            this.applyLocalPos(child, available, crossAxisSize);
            if (!isPositioned) {
                offset = Math.max(offset, childMainOffset); // deal with negative margins
            }
        }
    };
    return SimpleLayout;
}(LayoutTypes_1.DirectionalLayoutBehavior));
exports.SimpleLayout = SimpleLayout;
