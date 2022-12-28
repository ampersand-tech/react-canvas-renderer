/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
import { TouchAndScrollHandlers, TouchHandlerTree } from './TouchDispatcher';
import { Point, ScreenSpacePoint } from 'amper-utils/dist/mathUtils';
import { Stash } from 'amper-utils/dist/types';
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
    render(): JSX.Element;
}
export declare function kickRender(): void;
export declare function flushAnimations(): void;
export {};
