/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
import { LayoutNode } from './LayoutNode';
import { LayoutParent } from './LayoutTypes';
import { TouchAndScrollHandlers } from './TouchDispatcher';
import { Point } from 'amper-utils/dist2017/mathUtils';
import * as React from 'react';
interface Props {
    classes?: string;
    scaleFactor?: number;
    onLayoutUpdate?: (layoutRoot: LayoutNode) => void;
}
export declare class CanvasLayoutRenderer extends React.Component<Props, {}> implements LayoutParent {
    private renderCanvas;
    private layoutRoot;
    componentWillUnmount(): void;
    componentWillMount(): void;
    componentDidUpdate(): void;
    private renderLayout;
    childIsDirty(_child: LayoutNode): void;
    layoutIfNeeded(): void;
    getScreenOffset(): Point;
    getCanvas(): HTMLCanvasElement | undefined;
    updateCanvasSize: () => void;
    private draw;
    private setRenderer;
    getTouchAndScrollHandlersAt: (canvasSpacePoint: Point) => TouchAndScrollHandlers;
    render(): JSX.Element;
}
export {};
