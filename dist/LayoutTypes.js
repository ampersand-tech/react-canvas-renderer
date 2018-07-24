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
var Font_1 = require("./Font");
var Direction;
(function (Direction) {
    Direction[Direction["Row"] = 1] = "Row";
    Direction[Direction["Column"] = 2] = "Column";
})(Direction = exports.Direction || (exports.Direction = {}));
var Axis;
(function (Axis) {
    Axis["Width"] = "width";
    Axis["Height"] = "height";
})(Axis = exports.Axis || (exports.Axis = {}));
var PosEntry;
(function (PosEntry) {
    PosEntry["X"] = "x";
    PosEntry["Y"] = "y";
})(PosEntry = exports.PosEntry || (exports.PosEntry = {}));
var Alignment;
(function (Alignment) {
    Alignment[Alignment["Auto"] = 1] = "Auto";
    Alignment[Alignment["Center"] = 2] = "Center";
    Alignment[Alignment["Start"] = 3] = "Start";
    Alignment[Alignment["End"] = 4] = "End";
    Alignment[Alignment["Stretch"] = 5] = "Stretch";
})(Alignment = exports.Alignment || (exports.Alignment = {}));
var ImageCoverType;
(function (ImageCoverType) {
    ImageCoverType[ImageCoverType["None"] = 0] = "None";
    ImageCoverType[ImageCoverType["Contain"] = 1] = "Contain";
    ImageCoverType[ImageCoverType["Cover"] = 2] = "Cover";
})(ImageCoverType = exports.ImageCoverType || (exports.ImageCoverType = {}));
exports.AI_LOOKUP = {
    'center': Alignment.Center,
    'flex-start': Alignment.Start,
    'flex-end': Alignment.End,
    'stretch': Alignment.Stretch,
};
exports.AS_LOOKUP = {
    'auto': Alignment.Auto,
    'center': Alignment.Center,
    'flex-start': Alignment.Start,
    'flex-end': Alignment.End,
    'stretch': Alignment.Stretch,
};
var LayoutNodeData = /** @class */ (function () {
    function LayoutNodeData(node) {
        this.children = [];
        this.localDims = {}; // localDims are within the padding
        this.localPos = { min: {}, max: {} };
        this.padding = { left: 0, top: 0, right: 0, bottom: 0 };
        this.margin = { left: 0, top: 0, right: 0, bottom: 0 };
        this.localConstraints = { min: {}, max: {} };
        this.alignSelf = Alignment.Auto;
        this.color = '';
        this.alpha = 1;
        this.fontDesc = Font_1.defaultFontDesc();
        this.pointerEvents = 'auto';
        this.overflowX = '';
        this.overflowY = '';
        this.hasPositionParent = false;
        // computedDims contain the padding and children, but not margins
        this.computedDims = { width: 0, height: 0 };
        this.computedOffset = { x: 0, y: 0 };
        // renderDims are what actually get used for drawing, different from computedDims if animations are running
        this.renderDims = { width: 0, height: 0 };
        this.offsetX = 0;
        this.offsetY = 0;
        this.node = node;
    }
    return LayoutNodeData;
}());
exports.LayoutNodeData = LayoutNodeData;
var LayoutBehavior = /** @class */ (function () {
    function LayoutBehavior() {
    }
    return LayoutBehavior;
}());
exports.LayoutBehavior = LayoutBehavior;
var DirectionalLayoutBehavior = /** @class */ (function (_super) {
    __extends(DirectionalLayoutBehavior, _super);
    function DirectionalLayoutBehavior(direction) {
        var _this = _super.call(this) || this;
        _this.direction = direction;
        if (_this.direction === Direction.Row) {
            _this.mainAxis = Axis.Width;
            _this.crossAxis = Axis.Height;
            _this.mainAxisPos = PosEntry.X;
            _this.crossAxisPos = PosEntry.Y;
        }
        else {
            _this.mainAxis = Axis.Height;
            _this.crossAxis = Axis.Width;
            _this.mainAxisPos = PosEntry.Y;
            _this.crossAxisPos = PosEntry.X;
        }
        return _this;
    }
    return DirectionalLayoutBehavior;
}(LayoutBehavior));
exports.DirectionalLayoutBehavior = DirectionalLayoutBehavior;
function itemAlignment(layout, alignItems, crossAxis) {
    if (alignItems === Alignment.Stretch && layout.localDims[crossAxis] !== undefined) {
        alignItems = Alignment.Center;
    }
    return layout.alignSelf === Alignment.Auto ? alignItems : layout.alignSelf;
}
exports.itemAlignment = itemAlignment;
