/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
declare type FillRuleType = 'nonzero' | 'evenodd';
export interface PathDesc {
    path: string;
    strokeWidth?: string;
    opacity?: number;
    fillRule?: FillRuleType;
}
export declare let PIXEL_RATIO: number;
export declare const TREE_WALKER_CB_RESULT: Readonly<{
    CONTINUE: TreeWalkerCBResult;
    DONT_DESCEND: TreeWalkerCBResult;
    DONE: TreeWalkerCBResult;
}>;
export declare type TreeWalkerCBResult = 'continue' | 'dont_descend' | 'done';
export {};
