/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import * as MathUtils from 'amper-utils/dist2017/mathUtils';
import { ScreenSpacePoint } from 'amper-utils/dist2017/mathUtils';
import { Stash, StashOf } from 'amper-utils/dist2017/types';
import { ClickFunction, NotifyStateFunction } from 'LayoutTypes';
import { MomentumScroller } from 'MomentumScroller';
import * as React from 'react';
import { SwipeHandler } from 'SwipeHandler';
export interface TouchAndScrollHandlers {
    scrollHandler?: MomentumScroller;
    touchHandler?: TouchHandler;
    swipeHandler?: SwipeHandler;
    onClick?: ClickFunction;
    onDoubleClick?: ClickFunction;
    onLongPress?: ClickFunction;
    notifyActive?: NotifyStateFunction;
}
export interface TouchHandlerTree {
    getTouchAndScrollHandlersAt: (point: ScreenSpacePoint) => TouchAndScrollHandlers;
    recordMetric: (metricName: string, metricDims?: Stash) => void;
}
export interface TouchHandler {
    onTouchStart?: (e: TouchLikeEvent) => void;
    onTouchMove?: (e: TouchLikeEvent) => void;
    onTouchEnd?: (e: TouchLikeEvent) => void;
    onWheel?: (e: React.WheelEvent<any>) => void;
}
export declare type TouchLikeEvent = React.TouchEvent<any> | React.MouseEvent<any>;
export declare function getTouches(e: TouchLikeEvent): StashOf<MathUtils.ScreenSpacePoint>;
export declare class TouchDispatcher {
    private handlerTree;
    private curTouch;
    private lastTapTime;
    private lastTapPos;
    constructor(handler: TouchHandlerTree);
    private shouldSwipe;
    private handleLongPress;
    touchStart: (e: import("MomentumScroller").TouchLikeEvent) => void;
    touchMove: (e: import("MomentumScroller").TouchLikeEvent) => void;
    touchEnd: (e: import("MomentumScroller").TouchLikeEvent) => void;
    onWheel: (e: React.WheelEvent<any>) => void;
}
