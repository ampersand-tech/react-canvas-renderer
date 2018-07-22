/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as FontUtils from './FontUtils';

const MAX_VALID_FONTS_RETRIES = 200;
const STRICT_FONT_CHECK_PERCENTAGE = 0.25;
const FONT_CHECK_DELAY = 25;

const gKernMap = {};

let gTempCanvas: HTMLCanvasElement;

let gStubFontLoading = false;

export interface FontTable {
  names: string[];
  styles: string[];
  weights: number[];
  fontExpectations: StashOf<StashOf<number>>;
}

export interface FontDesc {
  fontFamily: string;
  fontSize: number;
  fontStyle: FontUtils.FontStyle;
  fontWeight:  FontUtils.FontWeight;
  textDecoration: FontUtils.TextDecoration;
  lineSpacing: number;
  verticalAlign: FontUtils.VerticalAlign;
  textShadow?: FontUtils.TextShadow;
}

export function defaultFontDesc(): FontDesc {
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

function initTempCanvas() {
  if (!gTempCanvas) {
    gTempCanvas = document.createElement('canvas');
    gTempCanvas.width = 200;
    gTempCanvas.height = 200;
  }
  return gTempCanvas.getContext('2d');
}

export function getFontKey(family: string, style: string, weight: number): string {
  return family + ':' + style + ':' + weight;
}

function closeEnough(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function waitForValidFonts(ctx: CanvasRenderingContext2D, fontTable: FontTable, attempts: number, cb: (valid: boolean) => void) {
  const haveValidFonts = attempts < MAX_VALID_FONTS_RETRIES * STRICT_FONT_CHECK_PERCENTAGE ?
  strictFontCheck(ctx, fontTable, false) : looseFontCheck(ctx, fontTable);

  if (haveValidFonts) {
    cb(true);
  } else if (attempts >= MAX_VALID_FONTS_RETRIES) {
    console.error('Fonts failed to be validated within max number of retries');
    cb(false);
  } else {
    setTimeout(waitForValidFonts.bind(undefined, ctx, fontTable, attempts + 1, cb), FONT_CHECK_DELAY);
  }
}

function strictFontCheck(ctx: CanvasRenderingContext2D, fontTable: FontTable, logMeasured: boolean): boolean {
  let ret = true;

  for (let i = 0; i < fontTable.names.length; ++i) {
    for (let j = 0; j < fontTable.styles.length; ++j) {
      for (let k = 0; k < fontTable.weights.length; ++k) {
        ctx.font = fontTable.styles[j] + ' ' + fontTable.weights[k] + ' 20px ' + fontTable.names[i];

        // strict check assumes a font is valid if characters a-z are expected sizes for all fonts, styles and weights
        const fontKey = getFontKey(fontTable.names[i], fontTable.styles[j], fontTable.weights[k]);
        const fontExpectation = fontTable.fontExpectations[fontKey];
        if (!fontExpectation) {
          console.error('Font being used without expectation data: ' + fontKey);
        }

        let isDifferent = false;
        let measured = fontKey + ' = {\n  ';
        for (let c = 97; fontExpectation && c <= 122; ++c) {
          const cString = String.fromCharCode(c);
          const measuredWidth = ctx.measureText(cString).width;
          measured += cString + ': ' + measuredWidth + ',';
          if (cString === 'e' || cString === 'j' || cString === 'o' || cString === 'u' || cString === 'z') {
            measured += '\n  ';
          } else {
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

function looseFontCheck(ctx: CanvasRenderingContext2D, fontTable: FontTable): boolean {
  let haveValidFonts = true;
  for (let i = 0; i < fontTable.names.length; ++i) {
    for (let j = 0; j < fontTable.styles.length; ++j) {
      for (let k = 0; k < fontTable.weights.length; ++k) {
        ctx.font = fontTable.styles[j] + ' ' + fontTable.weights[k] + ' 20px ' + fontTable.names[i];
        // loose check assumes a font is valid if the rendered widths of 'i' and 'w' are different
        //  if they are the same, then it should indicate they were drawn as question mark boxes
        haveValidFonts = haveValidFonts && ctx.measureText('i') !== ctx.measureText('w');
      }
    }
  }

  return haveValidFonts;
}

function preloadFontTable(fontTable: FontTable, cb: (valid: boolean) => void) {
  if (gStubFontLoading) {
    return cb(true);
  }
  const ctx = initTempCanvas();
  if (!ctx) {
    return cb(false);
  }
  waitForValidFonts(ctx, fontTable, 0, cb);
}

export class FontManager {
  private valid: boolean;
  private fontObjCache: StashOf<FontUtils.FontObject> = {};
  private defaultFontFamily: string;

  constructor(fontTable: FontTable, cb: (font: FontManager) => void) {
    this.defaultFontFamily = fontTable.names[0];
    preloadFontTable(fontTable, (valid) => {
      this.valid = valid;
      cb(this);
    });
  }

  public getKerning = (font: FontUtils.FontObject, charOrPair: string): number => {
    // First, we have a kerning map per font
    const fontStr = FontUtils.fontObj2LegitString(font);

    let kernMap = gKernMap[fontStr];
    if (!kernMap) {
      kernMap = gKernMap[fontStr] = {};
    }

    // Is this charOrPair already cached?
    const kern = kernMap[charOrPair];
    if (kern) {
      return kern;
    }

    // Calculate kerning and cache it
    const prevCharKern = charOrPair.length === 2 ? this.getKerning(font, charOrPair[0]) : 0;
    let measuredWidth: number;
    if (gStubFontLoading) {
      measuredWidth = charOrPair.length * 5;
    } else {
      const ctx = initTempCanvas();
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
  }

  private calcFontMetrics = (fontSize: number, lineSpacing: number): FontUtils.FontMetrics => {
    const lineExtraSpace = Math.round(fontSize * (lineSpacing - 1));
    const lineTop = Math.round(lineExtraSpace * 0.5);
    const lineAscent = Math.round(fontSize * 0.8);
    return {
      fontSize,
      lineHeight: fontSize + lineExtraSpace,
      lineTop,
      lineBottom: lineTop + fontSize,
      lineAscent,
      baseline: lineTop + lineAscent,
      lineDescent: fontSize - lineAscent,
    };
  }

  public getFontsValid = (): boolean => {
    return this.valid;
  }

  public getFont = (desc: FontDesc): FontUtils.FontObject => {
    let cacheKey = [
      desc.fontFamily,
      desc.fontSize,
      desc.fontStyle,
      desc.fontWeight,
      desc.textDecoration,
      desc.lineSpacing,
      desc.verticalAlign,
    ].join('_');

    if (this.fontObjCache.hasOwnProperty(cacheKey)) {
      return this.fontObjCache[cacheKey];
    }

    const fontMetrics = this.calcFontMetrics(desc.fontSize, desc.lineSpacing);
    const fontObj: FontUtils.FontObject = {
      getKerning: (charOrPair: string) => { return this.getKerning(fontObj, charOrPair); },
      fontStyle: desc.fontStyle,
      fontWeight: desc.fontWeight,
      fontMetrics: fontMetrics,
      fontSizeStr: fontMetrics.fontSize + 'px',
      fontFamily: desc.fontFamily || this.defaultFontFamily,
      textDecoration: desc.textDecoration,
      verticalAlign: desc.verticalAlign,
    };
    if (desc.verticalAlign === 'sub' || desc.verticalAlign === 'super') {
      fontMetrics.fontSize *= 0.7;
      fontObj.fontSizeStr = fontMetrics.fontSize + 'px';
    }
    if (desc.verticalAlign === 'super') {
      const offset = Math.round(0.3 * desc.fontSize);
      fontMetrics.baseline -= offset;
      fontMetrics.lineBottom -= offset;
    }
    this.fontObjCache[cacheKey] = fontObj;
    return fontObj;
  }
}

export const test = {
  stubFontLoading() {
    gStubFontLoading = true;
  },
};
