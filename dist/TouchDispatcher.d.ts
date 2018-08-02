/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import { ClickFunction, NotifyStateFunction } from './LayoutTypes';
import { MomentumScroller, TouchLikeEvent } from './MomentumScroller';
import { SwipeHandler } from './SwipeHandler';
import * as MathUtils from 'amper-utils/dist2017/mathUtils';
import { ScreenSpacePoint } from 'amper-utils/dist2017/mathUtils';
import { Stash, StashOf } from 'amper-utils/dist2017/types';
import * as React from 'react';
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
export declare function getTouches(e: TouchLikeEvent): StashOf<MathUtils.ScreenSpacePoint>;
export declare class TouchDispatcher {
    private handlerTree;
    private curTouch;
    private lastTapTime;
    private lastTapPos;
    constructor(handler: TouchHandlerTree);
    private shouldSwipe;
    private handleLongPress;
    touchStart: (e: TouchLikeEvent) => void;
    touchMove: (e: TouchLikeEvent) => void;
    touchEnd: (e: TouchLikeEvent) => void;
    onWheel: (e: React.WheelEvent<any>) => void;
}
