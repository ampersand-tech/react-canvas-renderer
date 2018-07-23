/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
export declare class SwipeHandler {
    readonly getScaleFactor: () => number;
    readonly setScaleFactor: (scaleFactor: number) => void;
    readonly minScaleFactor: number;
    readonly scaleFactorVelocity: number;
    private curScaleFactor;
    private targetScaleFactor;
    constructor(getScaleFactor: () => number, setScaleFactor: (scaleFactor: number) => void, minScaleFactor: number, scaleFactorVelocity: number);
    destructor(): void;
    setTargetScaleFactor(scaleFactor: number): void;
    onSwipeStart(): void;
    applyDragDiff(diff: number, _timeStamp: number): void;
    onSwipeEnd: () => void;
    tick: (dt: number) => boolean;
}
