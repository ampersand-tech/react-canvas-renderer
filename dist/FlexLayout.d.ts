/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import { DirectionalLayoutBehavior, LayoutConstraints, LayoutNodeData } from './LayoutTypes';
import { Dimensions } from 'amper-utils/dist2017/mathUtils';
import { Stash } from 'amper-utils/dist2017/types';
export declare class FlexLayout extends DirectionalLayoutBehavior {
    private justifyContent;
    private alignItems;
    private flexItems;
    toString(): string;
    setStyle(style: Stash): boolean;
    updateIntrinsicDimsForChildren(layout: LayoutNodeData, dims: Dimensions): void;
    layoutChildren(layout: LayoutNodeData, constraints: LayoutConstraints, force: boolean): void;
}
