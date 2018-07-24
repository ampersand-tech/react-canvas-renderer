/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
import { TouchAndScrollHandlers, TouchHandlerTree } from './TouchDispatcher';
import { Point, ScreenSpacePoint } from 'amper-utils/dist2017/mathUtils';
import { Stash } from 'amper-utils/dist2017/types';
import * as React from 'react';
interface Props {
    drawFunc: (ctx: CanvasRenderingContext2D, width: number, height: number) => boolean;
    classes?: string;
    onStoppedRendering?: () => void;
    onBuffering?: () => void;
    getTouchAndScrollHandlersAt?: (canvasSpacePoint: Point) => TouchAndScrollHandlers;
    recordMetric?: (metricName: string, metricDims?: Stash) => void;
}
export declare class RenderCanvas extends React.Component<Props, {}> implements TouchHandlerTree {
    private canvas;
    private touchDispatcher;
    private boundingRect;
    constructor(props: any, context: any);
    getCanvas(): HTMLCanvasElement | undefined;
    getScreenOffset(): Point;
    private setCanvas;
    private updateCanvasRenderSize;
    private updateBoundingRect;
    updateCanvasSize(): HTMLCanvasElement | undefined;
    draw(): boolean;
    onStoppedRendering(): void;
    onBuffering(): void;
    getTouchAndScrollHandlersAt(screenSpacePoint: ScreenSpacePoint): TouchAndScrollHandlers;
    recordMetric(metricName: string, metricDims?: Stash): void;
    render(): React.DetailedReactHTMLElement<{
        ref: (canvas: HTMLCanvasElement | null) => void;
        style: {
            touchAction: string;
        };
        classes: string | undefined;
        onTouchOrMouseStart: (e: import("MomentumScroller").TouchLikeEvent) => void;
        onTouchOrMouseMove: (e: import("MomentumScroller").TouchLikeEvent) => void;
        onTouchOrMouseEnd: (e: import("MomentumScroller").TouchLikeEvent) => void;
        onWheel: (e: React.WheelEvent<any>) => void;
    }, HTMLCanvasElement>;
}
export declare function kickRender(): void;
export declare function flushAnimations(): void;
export {};
