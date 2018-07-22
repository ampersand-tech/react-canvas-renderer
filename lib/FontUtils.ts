/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

export type FontStyle = 'normal'|'italic';
export type FontWeight = 100|200|400|500|700|800;
export type TextDecoration = 'none'|'line-through'|'underline';
export type VerticalAlign = 'sub'|'super'|'baseline';

export interface TextShadow {
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowColor: string;
}

export interface FontMetrics {
  fontSize: number;
  lineHeight: number;
  lineTop: number;
  lineBottom: number;
  lineAscent: number;
  baseline: number;
  lineDescent: number;
}

export interface FontObject {
  getKerning: (charOrPair: string) => number;
  fontStyle: FontStyle;
  fontWeight: FontWeight;
  fontMetrics: FontMetrics;
  fontSizeStr: string;
  fontFamily: string;
  textDecoration: TextDecoration;
  verticalAlign: VerticalAlign;
}

const StyleElements = {fontStyle: 1, fontWeight: 1, fontSizeStr: 1, fontFamily: 1};

export function fontObj2LegitString(style: FontObject): string {
  const retVal: any[] = [];
  for (const id in StyleElements) {
    if (style[id]) {
      retVal.push(style[id]);
    }
  }
  return retVal.join(' ');
}
