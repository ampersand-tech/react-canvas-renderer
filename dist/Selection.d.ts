/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
export interface Selection {
    start: number;
    end: number;
    atStart: boolean;
}
interface KeyState {
    shiftKey: boolean;
    metaKey: boolean;
}
export declare function moveBack(sel: Readonly<Selection>, textLen: number, keys: KeyState): Selection;
export declare function moveForward(sel: Readonly<Selection>, textLen: number, keys: KeyState): Selection;
export declare function moveTo(sel: Readonly<Selection>, pos: number, textLen: number, keys: KeyState): Selection;
export {};
