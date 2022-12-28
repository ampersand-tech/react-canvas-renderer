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
var FontUtils_1 = require("./FontUtils");
var LayoutNode_1 = require("./LayoutNode");
var LayoutTypes_1 = require("./LayoutTypes");
var MathUtils = require("amper-utils/dist/mathUtils");
var ObjUtils = require("amper-utils/dist/objUtils");
var types_1 = require("amper-utils/dist/types");
var gFontCache = {
    data: undefined,
    nodes: [],
};
var gImageCache = {};
var gFontTable = {
    names: ['"PT Serif", Times, "Times New Roman", serif', '"Montserrat", sans-serif'],
    weights: [100, 400, 800],
    styles: ['normal', 'italic'],
    fontExpectations: {},
};
function initFontManager(cb) {
    gFontCache.data = new Font_1.FontManager(gFontTable, function (fontManager) {
        setNodesDirty(gFontCache.nodes);
        cb && cb(fontManager);
    });
}
function setFontTable(fontTable, cb) {
    if (fontTable === gFontTable) {
        cb && cb(gFontCache.data);
        return gFontCache.data;
    }
    // clear font manager but keep nodes list intact
    gFontCache.data = undefined;
    gFontTable = fontTable;
    initFontManager(cb);
    return gFontCache.data;
}
exports.setFontTable = setFontTable;
function setNodesDirty(nodes) {
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var n = nodes_1[_i];
        n.setDirty();
    }
    nodes.length = 0;
}
function getFontManager(node) {
    if (!gFontCache.data) {
        initFontManager();
    }
    if (node && !gFontCache.data.getFontsValid()) {
        gFontCache.nodes.push(node);
    }
    return gFontCache.data;
}
exports.getFontManager = getFontManager;
function getImage(url, node) {
    if (!gImageCache[url]) {
        gImageCache[url] = {
            data: undefined,
            nodes: [],
        };
        var image_1 = new Image();
        image_1.crossOrigin = 'Anonymous';
        image_1.onload = function () {
            gImageCache[url].data = image_1;
            setNodesDirty(gImageCache[url].nodes);
        };
        image_1.onerror = function (_ev) {
            console.warn('Image Load Error on url: ' + url);
        };
        image_1.src = url;
    }
    if (!gImageCache[url].data && node) {
        gImageCache[url].nodes.push(node);
    }
    return gImageCache[url];
}
exports.getImage = getImage;
var LayoutDrawable = /** @class */ (function () {
    function LayoutDrawable(node, initParams) {
        this.node = node;
        this.initParams = ObjUtils.clone(initParams);
    }
    LayoutDrawable.prototype.setStyle = function (_style) {
        return false;
    };
    return LayoutDrawable;
}());
exports.LayoutDrawable = LayoutDrawable;
function drawRoundedRect(ctx, borderRadius, drawType, left, top, right, bottom) {
    var maxBR = Math.min(0.5 * Math.abs(right - left), 0.5 * Math.abs(bottom - top));
    var br = {
        tl: Math.min(maxBR, borderRadius.tl),
        tr: Math.min(maxBR, borderRadius.tr),
        bl: Math.min(maxBR, borderRadius.bl),
        br: Math.min(maxBR, borderRadius.br),
    };
    ctx.beginPath();
    ctx.moveTo(left + br.tl, top);
    ctx.lineTo(right - br.tr, top);
    ctx.arcTo(right, top, right, top + br.tr, br.tr);
    ctx.lineTo(right, bottom - br.br);
    ctx.arcTo(right, bottom, right - br.br, bottom, br.br);
    ctx.lineTo(left + br.bl, bottom);
    ctx.arcTo(left, bottom, left, bottom - br.bl, br.bl);
    ctx.lineTo(left, top + br.tl);
    ctx.arcTo(left, top, left + br.tl, top, br.tl);
    ctx.closePath();
    switch (drawType) {
        case 'stroke':
            ctx.stroke();
            break;
        case 'fill':
            ctx.fill();
            break;
        case 'clip':
            ctx.clip();
            break;
        default:
            types_1.absurd(drawType);
            break;
    }
}
function styleFromString(ctx, color, stroke, left, top, right, bottom) {
    if (color.slice(0, 6) === 'linear') {
        var gradStr = color.slice(16 /* linear-gradient( */, -1 /* trailing ) */);
        var gradInfo = gradStr.split(/,(?! [^(]*\))/); // split on non-parentheses-surrounded commas
        var gradType = gradInfo[0].trim();
        var gradient = void 0;
        if (gradType === 'to right') {
            gradient = ctx.createLinearGradient(left, top, right, top);
        }
        else if (gradType === 'to bottom') {
            gradient = ctx.createLinearGradient(left, top, left, bottom);
        }
        else if (gradType.slice(-3) === 'deg') {
            var deg = parseFloat(gradType.slice(0, -3));
            var ang = MathUtils.deg2Rad(deg);
            var width = Math.abs(right - left);
            var height = Math.abs(top - bottom);
            var lineLength = Math.abs(width * Math.sin(ang)) + Math.abs(height * Math.cos(ang));
            var cx = left + width * 0.5;
            var cy = top + height * 0.5;
            var dx = Math.cos(ang - Math.PI * 0.5) * lineLength * 0.5;
            var dy = Math.sin(ang - Math.PI * 0.5) * lineLength * 0.5;
            gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        }
        else {
            throw new Error('Unknown gradient type:' + gradType);
        }
        for (var i = 1; i < gradInfo.length; ++i) {
            var colorStopRE = /(.*)\s+([\d.]+)(%|px)/;
            var colorStopStr = gradInfo[i].trim();
            var result = colorStopRE.exec(colorStopStr);
            if (!result) {
                throw new Error('Unknown gradient color stop: ' + colorStopStr);
            }
            var colorStopColor = result[1];
            var colorStopAmount = parseFloat(result[2]);
            var colorStopPercent = colorStopAmount * 0.01;
            if (result[3] === 'px') {
                var height = Math.abs(top - bottom);
                if (height) {
                    MathUtils.clamp(0, 1, colorStopPercent = colorStopAmount / height);
                }
                else { // degenerate case
                    colorStopPercent = 0;
                }
            }
            gradient.addColorStop(colorStopPercent, colorStopColor);
        }
        stroke ? ctx.strokeStyle = gradient : ctx.fillStyle = gradient;
    }
    else {
        stroke ? ctx.strokeStyle = color : ctx.fillStyle = color;
    }
}
var BGColorDrawable = /** @class */ (function (_super) {
    __extends(BGColorDrawable, _super);
    function BGColorDrawable(node, color, borderRadius, boxShadow) {
        var _this = _super.call(this, node, {
            color: color,
            borderRadius: borderRadius,
            boxShadow: boxShadow,
        }) || this;
        _this.color = color;
        _this.borderRadius = borderRadius;
        _this.boxShadow = boxShadow;
        return _this;
    }
    BGColorDrawable.prototype.draw = function (ctx, dims, padding) {
        var left = -padding.left;
        var top = -padding.top;
        var width = dims.width + padding.left + padding.right;
        var height = dims.height + padding.top + padding.bottom;
        var right = left + width;
        var bottom = top + height;
        styleFromString(ctx, this.color, false, left, top, right, bottom);
        if (this.boxShadow) {
            ctx.shadowColor = this.boxShadow.color;
            ctx.shadowBlur = this.boxShadow.blur;
            ctx.shadowOffsetX = this.boxShadow.offsetX;
            ctx.shadowOffsetY = this.boxShadow.offsetY;
        }
        if (this.borderRadius) {
            drawRoundedRect(ctx, this.borderRadius, 'fill', left, top, right, bottom);
        }
        else {
            ctx.fillRect(left, top, width, height);
        }
        return true;
    };
    BGColorDrawable.prototype.updateIntrinsicDims = function (_dims) {
    };
    return BGColorDrawable;
}(LayoutDrawable));
exports.BGColorDrawable = BGColorDrawable;
var BorderDrawable = /** @class */ (function (_super) {
    __extends(BorderDrawable, _super);
    function BorderDrawable(node, borderStyle, color, borderWidth, borderRadius) {
        var _this = _super.call(this, node, {
            borderStyle: borderStyle,
            color: color,
            borderWidth: borderWidth,
            borderRadius: borderRadius,
        }) || this;
        _this.color = color || '#000';
        _this.borderWidth = borderWidth || 1;
        _this.br = borderRadius;
        _this.borderStyle = borderStyle;
        return _this;
    }
    BorderDrawable.prototype.draw = function (ctx, dims, padding) {
        ctx.lineWidth = this.borderWidth;
        var offset = this.borderWidth * 0.5;
        var left = offset - padding.left;
        var top = offset - padding.top;
        var width = dims.width + padding.left + padding.right - this.borderWidth;
        var height = dims.height + padding.top + padding.bottom - this.borderWidth;
        var right = left + width;
        var bottom = top + height;
        styleFromString(ctx, this.color, true, left, top, right, bottom);
        if (this.borderStyle === 'dashed') {
            ctx.setLineDash([this.borderWidth * 3.5, this.borderWidth * 3.5]);
        }
        else if (this.borderStyle === 'dotted') {
            ctx.setLineDash([this.borderWidth, this.borderWidth]);
        }
        if (this.borderStyle === 'wavey') {
            // this applies a wavy border to the top
            ctx.beginPath();
            var numWaves = 3; // hardcoded - could make this variable
            var waveLength = width / numWaves;
            var halfWaveLength = waveLength / 2;
            var waveHeight = this.borderWidth;
            var x = left - this.borderWidth - halfWaveLength;
            var y = top - this.borderWidth / 2;
            var wavePointiness = 0.3642; // bezier control point positioning parameter (0 = pointy waves, 0.5 = curvy waves)
            ctx.moveTo(x, y);
            for (var i = 0; i < numWaves + 1; ++i) {
                ctx.bezierCurveTo(x + halfWaveLength * wavePointiness, y, x + halfWaveLength * (1 - wavePointiness), y + waveHeight, x + halfWaveLength, y + waveHeight);
                ctx.bezierCurveTo(x + halfWaveLength + halfWaveLength * wavePointiness, y + waveHeight, x + halfWaveLength + halfWaveLength * (1 - wavePointiness), y, x + waveLength, y);
                x += waveLength;
            }
            ctx.closePath();
            ctx.fill();
        }
        else if (this.br) {
            drawRoundedRect(ctx, this.br, 'stroke', left, top, right, bottom);
        }
        else {
            ctx.strokeRect(left, top, width, height);
        }
        return true;
    };
    BorderDrawable.prototype.updateIntrinsicDims = function (dims, padding) {
        // the border fits inside the padding; if the padding isn't big enough then we need content space
        dims.width = Math.max(0, dims.width, this.borderWidth * 2 - padding.left - padding.right);
        dims.height = Math.max(0, dims.height, this.borderWidth * 2 - padding.top - padding.bottom);
    };
    return BorderDrawable;
}(LayoutDrawable));
exports.BorderDrawable = BorderDrawable;
var TextDrawable = /** @class */ (function (_super) {
    __extends(TextDrawable, _super);
    function TextDrawable(node, text) {
        var _this = _super.call(this, node, {
            text: text,
        }) || this;
        _this.textWidth = 0;
        _this.text = text;
        _this.fontManager = getFontManager(node);
        return _this;
    }
    TextDrawable.prototype.draw = function (ctx, dims) {
        if (!this.fontManager.getFontsValid()) {
            return false;
        }
        var fontObj = this.fontManager.getFont(this.node.getFontDesc());
        ctx.font = FontUtils_1.fontObj2LegitString(fontObj);
        if (this.node.style.textShadow) {
            var shadow = LayoutNode_1.parseShadow(this.node.style.textShadow, true);
            ctx.shadowBlur = shadow.blur;
            ctx.shadowOffsetX = shadow.offsetX;
            ctx.shadowOffsetY = shadow.offsetY;
            ctx.shadowColor = shadow.color;
        }
        ctx.fillText(this.text, 0, fontObj.fontMetrics.baseline);
        var lineY = 0;
        switch (fontObj.textDecoration) {
            case 'none':
                return true;
            case 'underline':
                lineY = fontObj.fontMetrics.lineBottom;
                break;
            case 'line-through':
                lineY = fontObj.fontMetrics.lineBottom - Math.floor(fontObj.fontMetrics.fontSize * 0.5);
                break;
            default:
                types_1.absurd(fontObj.textDecoration);
        }
        // draw decoration
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(Math.min(dims.width, this.textWidth), lineY);
        ctx.closePath();
        ctx.stroke();
        return true;
    };
    TextDrawable.prototype.updateIntrinsicDims = function (dims) {
        if (!this.fontManager.getFontsValid()) {
            return;
        }
        var fontObj = this.fontManager.getFont(this.node.getFontDesc());
        this.textWidth = 0;
        for (var i = 0; i < this.text.length; ++i) {
            var c = this.text[i];
            var prevCharacter = i ? this.text[i - 1] : '';
            this.textWidth += fontObj.getKerning(prevCharacter + c);
        }
        dims.width = Math.max(dims.width, Math.ceil(this.textWidth));
        dims.height = Math.max(dims.height, Math.ceil(fontObj.fontMetrics.lineHeight));
    };
    return TextDrawable;
}(LayoutDrawable));
exports.TextDrawable = TextDrawable;
var SVGDrawable = /** @class */ (function (_super) {
    __extends(SVGDrawable, _super);
    function SVGDrawable(node, svgName, stroke, fill, width, height, paths) {
        var _this = _super.call(this, node, {
            svgName: svgName,
            stroke: stroke,
            fill: fill,
            width: width,
            height: height,
            paths: paths,
        }) || this;
        _this.width = 0;
        _this.height = 0;
        _this.stroke = stroke;
        _this.fill = fill;
        _this.width = width;
        _this.height = height;
        _this.paths = paths;
        return _this;
    }
    SVGDrawable.prototype.draw = function (ctx, dims) {
        var width = this.width || dims.width;
        var height = this.height || dims.height;
        var paths = this.paths;
        if (!paths || !width || !height) {
            return false;
        }
        ctx.scale(dims.width / width, dims.height / height);
        if (this.stroke) {
            ctx.strokeStyle = this.stroke;
        }
        if (this.fill) {
            ctx.fillStyle = this.fill;
        }
        var parentAlpha = ctx.globalAlpha;
        for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
            var pathDesc = paths_1[_i];
            var path = new Path2D(pathDesc.path);
            ctx.globalAlpha = parentAlpha * (pathDesc.opacity || 1);
            ctx.lineWidth = parseFloat(pathDesc.strokeWidth || '0.1') || 0.1;
            if (this.fill) {
                ctx.fill(path, pathDesc.fillRule || 'evenodd');
            }
            if (this.stroke) {
                ctx.stroke(path);
            }
        }
        return true;
    };
    SVGDrawable.prototype.setStyle = function (style) {
        var ret = false;
        if (this.stroke !== style.stroke) {
            this.stroke = style.stroke;
            ret = true;
        }
        if (this.fill !== style.fill) {
            this.fill = style.fill;
            ret = true;
        }
        return ret;
    };
    SVGDrawable.prototype.updateIntrinsicDims = function (_dims) {
    };
    return SVGDrawable;
}(LayoutDrawable));
exports.SVGDrawable = SVGDrawable;
var ImageDrawable = /** @class */ (function (_super) {
    __extends(ImageDrawable, _super);
    function ImageDrawable(node, url, isBackground, backgroundSize, borderRadius, boxShadow) {
        if (isBackground === void 0) { isBackground = false; }
        var _this = _super.call(this, node, {
            url: url,
            isBackground: isBackground,
            backgroundSize: backgroundSize,
            borderRadius: borderRadius,
            boxShadow: boxShadow,
        }) || this;
        _this.coverType = LayoutTypes_1.ImageCoverType.None;
        _this.drawScale = 1;
        _this.borderRadius = borderRadius;
        _this.imageUrl = url;
        _this.isBackground = isBackground;
        _this.cachedImage = url ? getImage(url, node) : undefined;
        _this.boxShadow = boxShadow;
        if (backgroundSize === 'contain') {
            _this.coverType = LayoutTypes_1.ImageCoverType.Contain;
        }
        else if (backgroundSize === 'cover') {
            _this.coverType = LayoutTypes_1.ImageCoverType.Cover;
        }
        return _this;
    }
    ImageDrawable.prototype.draw = function (ctx, dims, padding) {
        var image = this.cachedImage ? this.cachedImage.data : undefined;
        if (!image) {
            return false;
        }
        var srcDims = { width: image.width, height: image.height };
        var srcPos = { x: srcDims.width * 0.5, y: srcDims.height * 0.5 };
        var dstDims = { width: dims.width, height: dims.height };
        var localDims = this.node.getLayoutData().localDims;
        if (!this.isBackground) {
            // for explicitly sized img element, let it escape constraints
            if (localDims.width && dstDims.width < localDims.width) {
                dstDims.width = localDims.width;
            }
            if (localDims.height && dstDims.height < localDims.height) {
                dstDims.height = localDims.height;
            }
            // TODO (CD) should probably clip the drawImage call, but I think that needs to be done at the LayoutNode
            // level because the left/top might position it outside the bounds, and we don't know that here
        }
        var dstPos = { x: dstDims.width * 0.5, y: dstDims.height * 0.5 };
        if (srcDims.width && srcDims.height && dstDims.width && dstDims.height) {
            var widthRatio = dims.width / srcDims.width;
            var heightRatio = dims.height / srcDims.height;
            var ew = widthRatio / heightRatio;
            var eh = heightRatio / widthRatio;
            switch (this.coverType) {
                case LayoutTypes_1.ImageCoverType.None:
                    break;
                case LayoutTypes_1.ImageCoverType.Contain:
                    if (eh < ew) {
                        dstDims.width = srcDims.width * heightRatio;
                    }
                    else {
                        dstDims.height = srcDims.height * widthRatio;
                    }
                    break;
                case LayoutTypes_1.ImageCoverType.Cover:
                    if (eh > ew) {
                        dstDims.width = srcDims.width * heightRatio;
                    }
                    else {
                        dstDims.height = srcDims.height * widthRatio;
                    }
                    break;
                default:
                    types_1.absurd(this.coverType);
            }
        }
        srcDims.width /= this.drawScale;
        srcDims.height /= this.drawScale;
        if (this.borderRadius || (dstDims.width > dims.width || dstDims.height > dims.height)) {
            var left = -padding.left;
            var top_1 = -padding.top;
            var width = dims.width + padding.left + padding.right;
            var height = dims.height + padding.top + padding.bottom;
            var right = left + width;
            var bottom = top_1 + height;
            if (this.borderRadius) {
                drawRoundedRect(ctx, this.borderRadius, 'clip', left, top_1, right, bottom);
            }
            else {
                ctx.beginPath();
                ctx.moveTo(left, top_1);
                ctx.lineTo(right, top_1);
                ctx.lineTo(right, bottom);
                ctx.lineTo(left, bottom);
                ctx.lineTo(left, top_1);
                ctx.closePath();
                ctx.clip();
            }
        }
        if (this.boxShadow) {
            ctx.shadowColor = this.boxShadow.color;
            ctx.shadowBlur = this.boxShadow.blur;
            ctx.shadowOffsetX = this.boxShadow.offsetX;
            ctx.shadowOffsetY = this.boxShadow.offsetY;
        }
        ctx.drawImage(image, srcPos.x - srcDims.width * 0.5, srcPos.y - srcDims.height * 0.5, srcDims.width, srcDims.height, dstPos.x - dstDims.width * 0.5, dstPos.y - dstDims.height * 0.5, dstDims.width, dstDims.height);
        return true;
    };
    ImageDrawable.prototype.updateIntrinsicDims = function (dims) {
        var imageElement = this.cachedImage ? this.cachedImage.data : undefined;
        if (this.isBackground || !imageElement) {
            return;
        }
        if (dims.width === 0 && dims.height === 0) {
            // use image dims only if the node doesn't have localDims
            dims.width = imageElement.width;
            dims.height = imageElement.height;
        }
        else if (dims.width === 0) {
            var scale = dims.height / imageElement.height;
            dims.width = imageElement.width * scale;
        }
        else if (dims.height === 0) {
            var scale = dims.width / imageElement.width;
            dims.height = imageElement.height * scale;
        }
    };
    return ImageDrawable;
}(LayoutDrawable));
exports.ImageDrawable = ImageDrawable;
