/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import { Alignment, LayoutConstraints, DirectionalLayoutBehavior, LayoutNodeData } from 'LayoutTypes';
import { Dimensions } from 'amper-utils/dist2017/mathUtils';
import { Stash } from 'amper-utils/dist2017/types';
export declare class SimpleLayout extends DirectionalLayoutBehavior {
    protected alignItems: Alignment;
    toString(): string;
    applyLocalPos(child: LayoutNodeData, available: number, crossAxisSize: number): void;
    setStyle(style: Stash): boolean;
    updateIntrinsicDimsForChildren(layout: LayoutNodeData, dims: Dimensions): void;
    layoutChildren(layout: LayoutNodeData, childConstraints: LayoutConstraints, force: boolean): void;
}
