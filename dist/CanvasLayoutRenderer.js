"use strict";
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
exports.CanvasLayoutRenderer = void 0;
/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
/** @jsxRuntime classic */
/** @jsx q */
var CanvasRenderer_1 = require("./CanvasRenderer");
var Constants_1 = require("./Constants");
var LayoutRenderer_1 = require("./LayoutRenderer");
var quark_styles_1 = require("quark-styles"); // eslint-disable-line @typescript-eslint/no-unused-vars
var React = require("react");
var CanvasLayoutRenderer = /** @class */ (function (_super) {
    __extends(CanvasLayoutRenderer, _super);
    function CanvasLayoutRenderer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.updateCanvasSize = function () {
            if (!_this.renderCanvas) {
                return;
            }
            var canvas = _this.renderCanvas.updateCanvasSize();
            if (!canvas) {
                return;
            }
            if (_this.layoutRoot) {
                _this.layoutRoot.setExternalConstraints({
                    min: {},
                    max: {
                        width: canvas.clientWidth,
                        height: canvas.clientHeight,
                    },
                });
            }
        };
        _this.draw = function (ctx, width, height) {
            if (!_this.layoutRoot) {
                return false;
            }
            _this.layoutIfNeeded();
            ctx.clearRect(0, 0, width, height);
            ctx.save();
            {
                var factor = (_this.props.scaleFactor || 1) * Constants_1.PIXEL_RATIO;
                ctx.scale(factor, factor);
                _this.layoutRoot.draw(ctx);
            }
            ctx.restore();
            return false;
        };
        _this.setRenderer = function (renderCanvas) {
            if (!renderCanvas) {
                _this.renderCanvas = undefined;
                return;
            }
            _this.renderCanvas = renderCanvas;
            _this.updateCanvasSize();
        };
        _this.getTouchAndScrollHandlersAt = function (canvasSpacePoint) {
            var ret = {};
            var leafTouchableNode = _this.layoutRoot ? _this.layoutRoot.getLeafTouchableNodeAt(canvasSpacePoint) : undefined;
            var nodeWalker = leafTouchableNode;
            while (nodeWalker) {
                ret.scrollHandler = ret.scrollHandler || nodeWalker.getScrollHandler();
                if (nodeWalker.dataProps.touchHandler && !ret.touchHandler) {
                    ret.touchHandler = nodeWalker.dataProps.touchHandler;
                }
                if (nodeWalker.onClick && !ret.onClick) {
                    ret.onClick = nodeWalker.onClick;
                    ret.notifyActive = nodeWalker.notifyActive;
                }
                if (nodeWalker.onDoubleClick && !ret.onDoubleClick) {
                    ret.onDoubleClick = nodeWalker.onDoubleClick;
                }
                if (nodeWalker.onLongPress && !ret.onLongPress) {
                    ret.onLongPress = nodeWalker.onLongPress;
                }
                nodeWalker = nodeWalker.getParentNode();
            }
            return ret;
        };
        return _this;
    }
    CanvasLayoutRenderer.prototype.componentWillUnmount = function () {
        this.layoutRoot && this.layoutRoot.destructor();
        this.layoutRoot = undefined;
    };
    CanvasLayoutRenderer.prototype.UNSAFE_componentWillMount = function () {
        this.renderLayout();
    };
    CanvasLayoutRenderer.prototype.componentDidUpdate = function () {
        this.renderLayout();
    };
    CanvasLayoutRenderer.prototype.renderLayout = function () {
        var child = React.Children.only(this.props.children);
        if (child) {
            this.layoutRoot = (0, LayoutRenderer_1.renderToLayout)(this.layoutRoot, child, this);
        }
    };
    CanvasLayoutRenderer.prototype.childIsDirty = function (_child) {
        (0, CanvasRenderer_1.kickRender)();
    };
    CanvasLayoutRenderer.prototype.layoutIfNeeded = function () {
        if (!this.layoutRoot) {
            return;
        }
        if (this.layoutRoot.layoutIfNeeded() && this.props.onLayoutUpdate) {
            this.props.onLayoutUpdate(this.layoutRoot);
        }
    };
    CanvasLayoutRenderer.prototype.getScreenOffset = function () {
        return this.renderCanvas ? this.renderCanvas.getScreenOffset() : { x: 0, y: 0 };
    };
    CanvasLayoutRenderer.prototype.getCanvas = function () {
        return this.renderCanvas ? this.renderCanvas.getCanvas() : undefined;
    };
    CanvasLayoutRenderer.prototype.render = function () {
        return ((0, quark_styles_1.q)(CanvasRenderer_1.RenderCanvas, { ref: this.setRenderer, classes: this.props.classes, drawFunc: this.draw, getTouchAndScrollHandlersAt: this.getTouchAndScrollHandlersAt }));
    };
    return CanvasLayoutRenderer;
}(React.Component));
exports.CanvasLayoutRenderer = CanvasLayoutRenderer;
