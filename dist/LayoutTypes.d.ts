/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import { FontDesc } from './Font';
import { LayoutNode } from './LayoutNode';
import { Dimensions, Point, ScreenSpacePoint } from 'amper-utils/dist/mathUtils';
import { Stash } from 'amper-utils/dist/types';
export type LayoutDrawableName = 'svg' | 'img' | 'border' | 'backgroundColor' | 'backgroundImage';
export interface OptDimensions {
    width?: number;
    height?: number;
}
export interface Margins {
    left: number;
    right: number;
    top: number;
    bottom: number;
}
export interface LayoutConstraints {
    min: {
        width?: number;
        height?: number;
    };
    max: {
        width?: number;
        height?: number;
    };
}
export interface FlexProperties {
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number;
}
export declare enum Direction {
    Row = 1,
    Column = 2
}
export declare enum Axis {
    Width = "width",
    Height = "height"
}
export declare enum PosEntry {
    X = "x",
    Y = "y"
}
export declare enum Alignment {
    Auto = 1,
    Center = 2,
    Start = 3,
    End = 4,
    Stretch = 5
}
export interface BorderRadius {
    tl: number;
    tr: number;
    bl: number;
    br: number;
}
export declare enum ImageCoverType {
    None = 0,
    Contain = 1,
    Cover = 2
}
export interface Shadow {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
}
export declare const AI_LOOKUP: {
    center: Alignment;
    'flex-start': Alignment;
    'flex-end': Alignment;
    stretch: Alignment;
};
export declare const AS_LOOKUP: {
    auto: Alignment;
    center: Alignment;
    'flex-start': Alignment;
    'flex-end': Alignment;
    stretch: Alignment;
};
export interface LayoutParent {
    childIsDirty(child: LayoutNode): any;
    layoutIfNeeded(): any;
    getScreenOffset(includePadding?: boolean): Point;
    getCanvas(): HTMLCanvasElement | undefined;
}
export type ClickFunction = (point: ScreenSpacePoint) => void;
export type NotifyStateFunction = (state: boolean) => void;
export declare class LayoutNodeData {
    node: LayoutNode;
    children: LayoutNodeData[];
    localDims: OptDimensions;
    localPos: LayoutConstraints;
    padding: Margins;
    margin: Margins;
    localConstraints: LayoutConstraints;
    flexProps: FlexProperties | undefined;
    alignSelf: Alignment;
    color: string;
    alpha: number;
    fontDesc: FontDesc;
    pointerEvents: string;
    overflowX: string;
    overflowY: string;
    hasPositionParent: boolean;
    computedDims: Dimensions;
    computedOffset: Point;
    renderDims: Dimensions;
    offsetX: number;
    offsetY: number;
    constructor(node: LayoutNode);
}
export declare abstract class LayoutBehavior {
    abstract toString(): string;
    abstract setStyle(style: Stash): boolean;
    abstract updateIntrinsicDimsForChildren(layout: LayoutNodeData, dims: Dimensions): any;
    abstract layoutChildren(layout: LayoutNodeData, childConstraints: LayoutConstraints, force: boolean): any;
}
export declare abstract class DirectionalLayoutBehavior extends LayoutBehavior {
    protected direction: Direction;
    protected mainAxis: Axis;
    protected crossAxis: Axis;
    protected mainAxisPos: PosEntry;
    protected crossAxisPos: PosEntry;
    constructor(direction: Direction);
}
export declare function itemAlignment(layout: LayoutNodeData, alignItems: Alignment, crossAxis: Axis): Alignment;
