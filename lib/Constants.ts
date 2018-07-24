/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

type FillRuleType = 'nonzero'|'evenodd';

export interface PathDesc {
  path: string;
  strokeWidth?: string;
  opacity?: number;
  fillRule?: FillRuleType;
}

export let PIXEL_RATIO = 1;
try {
  if ('devicePixelRatio' in window && window.devicePixelRatio > 1) {
    PIXEL_RATIO = window.devicePixelRatio;
  }
} catch (_ex) {
}

export const TREE_WALKER_CB_RESULT = Object.freeze({
  CONTINUE: 'continue' as TreeWalkerCBResult,
  DONT_DESCEND: 'dont_descend' as TreeWalkerCBResult,
  DONE: 'done' as TreeWalkerCBResult,
});
export type TreeWalkerCBResult = 'continue' | 'dont_descend' | 'done';
