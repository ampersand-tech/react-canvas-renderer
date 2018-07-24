/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import * as FontUtils from './FontUtils';
import { StashOf } from 'amper-utils/dist2017/types';
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
    fontWeight: FontUtils.FontWeight;
    textDecoration: FontUtils.TextDecoration;
    lineSpacing: number;
    verticalAlign: FontUtils.VerticalAlign;
    textShadow?: FontUtils.TextShadow;
}
export declare function defaultFontDesc(): FontDesc;
export declare function getFontKey(family: string, style: string, weight: number): string;
export declare class FontManager {
    private valid;
    private fontObjCache;
    private defaultFontFamily;
    constructor(fontTable: FontTable, cb: (font: FontManager) => void);
    getKerning: (font: FontUtils.FontObject, charOrPair: string) => number;
    private calcFontMetrics;
    getFontsValid: () => boolean;
    getFont: (desc: FontDesc) => FontUtils.FontObject;
}
export declare const test: {
    stubFontLoading(): void;
};
