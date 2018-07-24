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
var CanvasRenderer_1 = require("./CanvasRenderer");
var Constants_1 = require("./Constants");
var LayoutRenderer_1 = require("./LayoutRenderer");
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
    CanvasLayoutRenderer.prototype.componentWillMount = function () {
        this.renderLayout();
    };
    CanvasLayoutRenderer.prototype.componentDidUpdate = function () {
        this.renderLayout();
    };
    CanvasLayoutRenderer.prototype.renderLayout = function () {
        var child = React.Children.only(this.props.children);
        if (child) {
            this.layoutRoot = LayoutRenderer_1.renderToLayout(this.layoutRoot, child, this);
        }
    };
    CanvasLayoutRenderer.prototype.childIsDirty = function (_child) {
        CanvasRenderer_1.kickRender();
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
        return (React.createElement(CanvasRenderer_1.RenderCanvas, { ref: this.setRenderer, classes: this.props.classes, drawFunc: this.draw, getTouchAndScrollHandlersAt: this.getTouchAndScrollHandlersAt }));
    };
    return CanvasLayoutRenderer;
}(React.Component));
exports.CanvasLayoutRenderer = CanvasLayoutRenderer;
