/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
/// <reference types="react" />
import * as MathUtils from 'amper-utils/dist2017/mathUtils';
import { Dimensions, Vector } from 'amper-utils/dist2017/mathUtils';
export declare type ScrollEvent = 'scrollStart' | 'scroll' | 'scrollStop';
export declare type TouchLikeEvent = React.TouchEvent<any> | React.MouseEvent<any>;
export interface ScrollEventData {
    scrollX: number;
    scrollY: number;
    deltaX: number;
    deltaY: number;
    metric: string;
}
export interface ScrollBounds {
    xMin: number | null;
    yMin: number | null;
    xMax: number | null;
    yMax: number | null;
}
interface Props {
    getScrollBounds: () => Readonly<ScrollBounds>;
    getContainerSize: () => Readonly<Dimensions>;
    getScaleFactor?: () => number;
    fireEvent?: (eventName: ScrollEvent, data: ScrollEventData) => void;
    scrollX?: boolean;
    scrollY?: boolean;
}
export declare class MomentumScroller {
    readonly props: Props;
    private scrollOffset;
    private delta;
    private wantScrollX;
    private wantScrollY;
    private scrollableX;
    private scrollableY;
    private isScrolling;
    private target;
    private metric;
    private velocity;
    private maxVelocity;
    private prevTouchTime;
    private hasMomentum;
    private wheelScrollTimer;
    private prevTouchMoveVelocity;
    private prevTouchMoveDT;
    constructor(props: Props);
    destructor(): void;
    setScrollDirection(scrollX: boolean, scrollY: boolean): void;
    canScrollX(): boolean;
    canScrollY(): boolean;
    private updateScrollable;
    private fireEvent;
    private startScrolling;
    private stopScrolling;
    getScrollX(): number;
    getScrollY(): number;
    resetScrollY(scrollY?: number): void;
    setTargetScrollY(scrollY: number, animTime: number, easeFunction: MathUtils.EasingFunction, navMetric?: string): void;
    getDeltaY(): number;
    onTouchStart(e: TouchLikeEvent): boolean;
    applyDragDiff(dragDiff: Readonly<Vector>, timeStamp: number): void;
    applyWheelDiff(wheelDiff: Readonly<Vector>): void;
    tick: (dt: number) => boolean;
    onTouchEnd(): void;
}
export {};
