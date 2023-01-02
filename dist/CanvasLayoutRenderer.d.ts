import { LayoutNode } from './LayoutNode';
import { LayoutParent } from './LayoutTypes';
import { TouchAndScrollHandlers } from './TouchDispatcher';
import { Point } from 'amper-utils/dist/mathUtils';
import * as React from 'react';
interface Props {
    classes?: string;
    scaleFactor?: number;
    onLayoutUpdate?: (layoutRoot: LayoutNode) => void;
}
export declare class CanvasLayoutRenderer extends React.Component<Props & {
    children: React.ReactNode;
}, {}> implements LayoutParent {
    private renderCanvas;
    private layoutRoot;
    componentWillUnmount(): void;
    UNSAFE_componentWillMount(): void;
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
