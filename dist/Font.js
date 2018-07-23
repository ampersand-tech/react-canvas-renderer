"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var FontUtils = require("FontUtils");
var MAX_VALID_FONTS_RETRIES = 200;
var STRICT_FONT_CHECK_PERCENTAGE = 0.25;
var FONT_CHECK_DELAY = 25;
var gKernMap = {};
var gTempCanvas;
var gStubFontLoading = false;
function defaultFontDesc() {
    return {
        fontFamily: '',
        fontSize: 14,
        fontStyle: 'normal',
        fontWeight: 400,
        textDecoration: 'none',
        lineSpacing: 1.5,
        verticalAlign: 'baseline',
    };
}
exports.defaultFontDesc = defaultFontDesc;
function initTempCanvas() {
    if (!gTempCanvas) {
        gTempCanvas = document.createElement('canvas');
        gTempCanvas.width = 200;
        gTempCanvas.height = 200;
    }
    return gTempCanvas.getContext('2d');
}
function getFontKey(family, style, weight) {
    return family + ':' + style + ':' + weight;
}
exports.getFontKey = getFontKey;
function closeEnough(a, b) {
    return Math.abs(a - b) < 0.01;
}
function waitForValidFonts(ctx, fontTable, attempts, cb) {
    var haveValidFonts = attempts < MAX_VALID_FONTS_RETRIES * STRICT_FONT_CHECK_PERCENTAGE ?
        strictFontCheck(ctx, fontTable, false) : looseFontCheck(ctx, fontTable);
    if (haveValidFonts) {
        cb(true);
    }
    else if (attempts >= MAX_VALID_FONTS_RETRIES) {
        console.error('Fonts failed to be validated within max number of retries');
        cb(false);
    }
    else {
        setTimeout(waitForValidFonts.bind(undefined, ctx, fontTable, attempts + 1, cb), FONT_CHECK_DELAY);
    }
}
function strictFontCheck(ctx, fontTable, logMeasured) {
    var ret = true;
    for (var i = 0; i < fontTable.names.length; ++i) {
        for (var j = 0; j < fontTable.styles.length; ++j) {
            for (var k = 0; k < fontTable.weights.length; ++k) {
                ctx.font = fontTable.styles[j] + ' ' + fontTable.weights[k] + ' 20px ' + fontTable.names[i];
                // strict check assumes a font is valid if characters a-z are expected sizes for all fonts, styles and weights
                var fontKey = getFontKey(fontTable.names[i], fontTable.styles[j], fontTable.weights[k]);
                var fontExpectation = fontTable.fontExpectations[fontKey];
                if (!fontExpectation) {
                    console.error('Font being used without expectation data: ' + fontKey);
                }
                var isDifferent = false;
                var measured = fontKey + ' = {\n  ';
                for (var c = 97; fontExpectation && c <= 122; ++c) {
                    var cString = String.fromCharCode(c);
                    var measuredWidth = ctx.measureText(cString).width;
                    measured += cString + ': ' + measuredWidth + ',';
                    if (cString === 'e' || cString === 'j' || cString === 'o' || cString === 'u' || cString === 'z') {
                        measured += '\n  ';
                    }
                    else {
                        measured += ' ';
                    }
                    if (!closeEnough(fontExpectation[cString], measuredWidth)) {
                        isDifferent = true;
                        ret = false;
                    }
                }
                measured += '};';
                if (isDifferent && logMeasured) {
                    console.log('font measurements changed:', measured);
                }
            }
        }
    }
    return ret;
}
function looseFontCheck(ctx, fontTable) {
    var haveValidFonts = true;
    for (var i = 0; i < fontTable.names.length; ++i) {
        for (var j = 0; j < fontTable.styles.length; ++j) {
            for (var k = 0; k < fontTable.weights.length; ++k) {
                ctx.font = fontTable.styles[j] + ' ' + fontTable.weights[k] + ' 20px ' + fontTable.names[i];
                // loose check assumes a font is valid if the rendered widths of 'i' and 'w' are different
                //  if they are the same, then it should indicate they were drawn as question mark boxes
                haveValidFonts = haveValidFonts && ctx.measureText('i') !== ctx.measureText('w');
            }
        }
    }
    return haveValidFonts;
}
function preloadFontTable(fontTable, cb) {
    if (gStubFontLoading) {
        return cb(true);
    }
    var ctx = initTempCanvas();
    if (!ctx) {
        return cb(false);
    }
    waitForValidFonts(ctx, fontTable, 0, cb);
}
var FontManager = /** @class */ (function () {
    function FontManager(fontTable, cb) {
        var _this = this;
        this.fontObjCache = {};
        this.getKerning = function (font, charOrPair) {
            // First, we have a kerning map per font
            var fontStr = FontUtils.fontObj2LegitString(font);
            var kernMap = gKernMap[fontStr];
            if (!kernMap) {
                kernMap = gKernMap[fontStr] = {};
            }
            // Is this charOrPair already cached?
            var kern = kernMap[charOrPair];
            if (kern) {
                return kern;
            }
            // Calculate kerning and cache it
            var prevCharKern = charOrPair.length === 2 ? _this.getKerning(font, charOrPair[0]) : 0;
            var measuredWidth;
            if (gStubFontLoading) {
                measuredWidth = charOrPair.length * 5;
            }
            else {
                var ctx = initTempCanvas();
                if (!ctx) {
                    return 0;
                }
                ctx.font = fontStr;
                /* uncomment to measure kern map diffs for your font
                if (prevCharKern) {
                  let singleCharKern = getKerning(font, charOrPair[1]);
                  let withTwoKern = ctx.measureText(charOrPair).width - prevCharKern;
                  if (singleCharKern !== withTwoKern) {
                    console.log('Diff for char [' + charOrPair + ']: ' + (withTwoKern - singleCharKern));
                  }
                }
                */
                measuredWidth = ctx.measureText(charOrPair).width;
            }
            return kernMap[charOrPair] = measuredWidth - prevCharKern;
        };
        this.calcFontMetrics = function (fontSize, lineSpacing) {
            var lineExtraSpace = Math.round(fontSize * (lineSpacing - 1));
            var lineTop = Math.round(lineExtraSpace * 0.5);
            var lineAscent = Math.round(fontSize * 0.8);
            return {
                fontSize: fontSize,
                lineHeight: fontSize + lineExtraSpace,
                lineTop: lineTop,
                lineBottom: lineTop + fontSize,
                lineAscent: lineAscent,
                baseline: lineTop + lineAscent,
                lineDescent: fontSize - lineAscent,
            };
        };
        this.getFontsValid = function () {
            return _this.valid;
        };
        this.getFont = function (desc) {
            var cacheKey = [
                desc.fontFamily,
                desc.fontSize,
                desc.fontStyle,
                desc.fontWeight,
                desc.textDecoration,
                desc.lineSpacing,
                desc.verticalAlign,
            ].join('_');
            if (_this.fontObjCache.hasOwnProperty(cacheKey)) {
                return _this.fontObjCache[cacheKey];
            }
            var fontMetrics = _this.calcFontMetrics(desc.fontSize, desc.lineSpacing);
            var fontObj = {
                getKerning: function (charOrPair) { return _this.getKerning(fontObj, charOrPair); },
                fontStyle: desc.fontStyle,
                fontWeight: desc.fontWeight,
                fontMetrics: fontMetrics,
                fontSizeStr: fontMetrics.fontSize + 'px',
                fontFamily: desc.fontFamily || _this.defaultFontFamily,
                textDecoration: desc.textDecoration,
                verticalAlign: desc.verticalAlign,
            };
            if (desc.verticalAlign === 'sub' || desc.verticalAlign === 'super') {
                fontMetrics.fontSize *= 0.7;
                fontObj.fontSizeStr = fontMetrics.fontSize + 'px';
            }
            if (desc.verticalAlign === 'super') {
                var offset = Math.round(0.3 * desc.fontSize);
                fontMetrics.baseline -= offset;
                fontMetrics.lineBottom -= offset;
            }
            _this.fontObjCache[cacheKey] = fontObj;
            return fontObj;
        };
        this.defaultFontFamily = fontTable.names[0];
        preloadFontTable(fontTable, function (valid) {
            _this.valid = valid;
            cb(_this);
        });
    }
    return FontManager;
}());
exports.FontManager = FontManager;
exports.test = {
    stubFontLoading: function () {
        gStubFontLoading = true;
    },
};
