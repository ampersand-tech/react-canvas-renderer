"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
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
var LayoutTypes_1 = require("./LayoutTypes");
var LayoutNode_1 = require("./LayoutNode");
var ObjUtils = require("amper-utils/dist/objUtils");
var types_1 = require("amper-utils/dist/types");
var Justification;
(function (Justification) {
    Justification[Justification["Center"] = 1] = "Center";
    Justification[Justification["FlexStart"] = 2] = "FlexStart";
    Justification[Justification["FlexEnd"] = 3] = "FlexEnd";
    Justification[Justification["SpaceAround"] = 4] = "SpaceAround";
    Justification[Justification["SpaceBetween"] = 5] = "SpaceBetween";
})(Justification || (Justification = {}));
var JC_LOOKUP = {
    'center': Justification.Center,
    'flex-start': Justification.FlexStart,
    'flex-end': Justification.FlexEnd,
    'space-around': Justification.SpaceAround,
    'space-between': Justification.SpaceBetween,
};
var FlexLayout = /** @class */ (function (_super) {
    __extends(FlexLayout, _super);
    function FlexLayout() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.justifyContent = Justification.FlexStart;
        _this.alignItems = LayoutTypes_1.Alignment.Stretch;
        _this.flexItems = [];
        return _this;
    }
    FlexLayout.prototype.toString = function () {
        return 'F' + (this.direction === LayoutTypes_1.Direction.Row ? 'Row' : 'Col');
    };
    FlexLayout.prototype.setStyle = function (style) {
        var alignItems = LayoutTypes_1.Alignment.Stretch;
        if (style.alignItems && LayoutTypes_1.AI_LOOKUP.hasOwnProperty(style.alignItems)) {
            alignItems = LayoutTypes_1.AI_LOOKUP[style.alignItems];
        }
        var justifyContent = Justification.FlexStart;
        if (style.justifyContent && JC_LOOKUP.hasOwnProperty(style.justifyContent)) {
            justifyContent = JC_LOOKUP[style.justifyContent];
        }
        if (alignItems !== this.alignItems || justifyContent !== this.justifyContent) {
            this.alignItems = alignItems;
            this.justifyContent = justifyContent;
            return true;
        }
        return false;
    };
    FlexLayout.prototype.updateIntrinsicDimsForChildren = function (layout, dims) {
        if (layout.localDims.width === undefined) {
            dims.width = Infinity;
        }
        if (layout.localDims.height === undefined) {
            dims.height = Infinity;
        }
        var mainAxisSize = 0;
        var crossAxisSize = 0;
        var totalFlexGrow = 0;
        // convert children to FlexItems
        this.flexItems = [];
        for (var _i = 0, _a = layout.children; _i < _a.length; _i++) {
            var child = _a[_i];
            var alignment = LayoutTypes_1.itemAlignment(child, this.alignItems, this.crossAxis);
            var childDims = child.node.getIntrinsicDims();
            var flexItem = {
                srcDims: childDims,
                dstDims: childDims,
                mainAxisMargin: LayoutNode_1.marginSizeForAxis(child.margin, this.mainAxis, 'total'),
                crossAxisMargin: LayoutNode_1.marginSizeForAxis(child.margin, this.crossAxis, alignment === LayoutTypes_1.Alignment.Center ? 'max2' : 'total'),
                flexGrow: (child.flexProps && child.flexProps.flexGrow) || 0,
                flexShrink: (child.flexProps && child.flexProps.flexShrink) || 0,
                flexBasis: (child.flexProps && child.flexProps.flexBasis !== undefined) ? child.flexProps.flexBasis : childDims[this.mainAxis],
            };
            if (flexItem.flexBasis === Infinity) {
                flexItem.flexBasis = 0;
            }
            this.flexItems.push(flexItem);
            mainAxisSize += Math.max(0, flexItem.srcDims[this.mainAxis] + flexItem.mainAxisMargin);
            crossAxisSize = Math.max(crossAxisSize, childDims[this.crossAxis] + flexItem.crossAxisMargin);
            totalFlexGrow += flexItem.flexGrow;
        }
        // shrink crossAxis dimension to fit
        if (layout.localDims[this.crossAxis] === undefined) {
            dims[this.crossAxis] = Math.min(crossAxisSize, dims[this.crossAxis]);
        }
        // shrink mainAxis dimension to fit if operating in simple mode (no growing, justify to start of flex container)
        if (this.justifyContent === Justification.FlexStart && !totalFlexGrow && layout.localDims[this.mainAxis] === undefined) {
            dims[this.mainAxis] = Math.min(mainAxisSize, dims[this.mainAxis]);
        }
    };
    FlexLayout.prototype.layoutChildren = function (layout, constraints, force) {
        var mainAxisAvailable = constraints.max[this.mainAxis] === undefined ? Infinity : constraints.max[this.mainAxis];
        var crossAxisAvailable = constraints.max[this.crossAxis] === undefined ? Infinity : constraints.max[this.crossAxis];
        var mainAxisSize = 0;
        var totalFlexGrow = 0;
        var totalFlexShrink = 0;
        for (var _i = 0, _a = this.flexItems; _i < _a.length; _i++) {
            var item = _a[_i];
            mainAxisSize += Math.max(0, item.flexBasis + item.mainAxisMargin);
            totalFlexGrow += item.flexGrow;
            totalFlexShrink += item.flexShrink;
        }
        var delta = mainAxisAvailable - mainAxisSize;
        var preOffset = 0, firstOffset = 0, eachOffset = 0, lastOffset = 0;
        // are we too big and can any elements shrink?
        if (delta < 0) {
            if (totalFlexShrink) {
                for (var _b = 0, _c = this.flexItems; _b < _c.length; _b++) {
                    var item = _c[_b];
                    item.dstDims[this.mainAxis] = item.dstDims[this.mainAxis] = item.flexBasis + delta * item.flexShrink / totalFlexShrink;
                }
            }
            else if (this.justifyContent === Justification.Center) {
                preOffset = firstOffset = eachOffset = lastOffset = delta / (this.flexItems.length + 1);
            }
        }
        else if (delta > 0) {
            if (totalFlexGrow) {
                // do we have room to flex grow and want to?
                for (var _d = 0, _e = this.flexItems; _d < _e.length; _d++) {
                    var item = _e[_d];
                    item.dstDims[this.mainAxis] = item.dstDims[this.mainAxis] = item.flexBasis + delta * item.flexGrow / totalFlexGrow;
                }
            }
            else {
                // nope, arrange with empty space
                switch (this.justifyContent) {
                    case Justification.Center:
                        preOffset = 0.5 * delta;
                        break;
                    case Justification.FlexEnd:
                        preOffset = delta;
                        break;
                    case Justification.FlexStart:
                        break;
                    case Justification.SpaceAround:
                        preOffset = firstOffset = eachOffset = lastOffset = delta / (this.flexItems.length + 1);
                        break;
                    case Justification.SpaceBetween:
                        if (this.flexItems.length > 1) {
                            firstOffset = eachOffset = lastOffset = delta / (this.flexItems.length - 1);
                        }
                        break; // fallback to FlexStart for first one
                }
            }
        }
        var totalMainAxisOffset = 0;
        for (var i = 0; i < this.flexItems.length; ++i) {
            var child = layout.children[i];
            var item = this.flexItems[i];
            var alignment = LayoutTypes_1.itemAlignment(child, this.alignItems, this.crossAxis);
            var childOffset = totalMainAxisOffset;
            switch (i) {
                case 0:
                    childOffset += preOffset;
                    break;
                case this.flexItems.length - 2:
                    childOffset += lastOffset;
                    break;
                case 1:
                    childOffset += firstOffset;
                    break;
                default:
                    childOffset += eachOffset;
                    break;
            }
            // layout child
            var childConstraints = ObjUtils.clone(constraints);
            var itemDims = ObjUtils.clone(item.dstDims);
            LayoutNode_1.applyConstraints(constraints, itemDims);
            childConstraints.min[this.mainAxis] = childConstraints.max[this.mainAxis] = itemDims[this.mainAxis];
            childConstraints.max[this.crossAxis] = crossAxisAvailable - LayoutNode_1.marginSizeForAxis(child.margin, this.crossAxis, 'total');
            if (alignment === LayoutTypes_1.Alignment.Stretch) {
                childConstraints.min[this.crossAxis] = childConstraints.max[this.crossAxis];
            }
            child.node.setExternalConstraints(childConstraints);
            child.node.layoutIfNeeded(force);
            // position child
            childOffset += LayoutNode_1.marginSizeForAxis(child.margin, this.mainAxis, 'start');
            child.computedOffset[this.mainAxisPos] = childOffset;
            childOffset += child.renderDims[this.mainAxis];
            childOffset += LayoutNode_1.marginSizeForAxis(child.margin, this.mainAxis, 'end');
            totalMainAxisOffset = Math.max(totalMainAxisOffset, childOffset); // deal with negative margins
            switch (alignment) {
                case LayoutTypes_1.Alignment.Auto:
                case LayoutTypes_1.Alignment.Start:
                case LayoutTypes_1.Alignment.Stretch:
                    child.computedOffset[this.crossAxisPos] = LayoutNode_1.marginSizeForAxis(child.margin, this.crossAxis, 'start');
                    break;
                case LayoutTypes_1.Alignment.End:
                    child.computedOffset[this.crossAxisPos] =
                        crossAxisAvailable - child.renderDims[this.crossAxis] - LayoutNode_1.marginSizeForAxis(child.margin, this.crossAxis, 'end');
                    break;
                case LayoutTypes_1.Alignment.Center:
                    child.computedOffset[this.crossAxisPos] = (crossAxisAvailable - child.renderDims[this.crossAxis]) * 0.5;
                    break;
                default:
                    types_1.absurd(alignment);
            }
        }
    };
    return FlexLayout;
}(LayoutTypes_1.DirectionalLayoutBehavior));
exports.FlexLayout = FlexLayout;
