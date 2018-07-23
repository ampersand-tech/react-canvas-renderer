/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import * as MathUtils from 'amper-utils/dist2017/mathUtils';
import { Dimensions } from 'amper-utils/dist2017/mathUtils';
import { LayoutDrawable } from 'LayoutDrawable';
import { LayoutNode } from 'LayoutNode';
import { LayoutDrawableName, LayoutNodeData } from 'LayoutTypes';
interface TickMotivator {
    tick: (dt: number) => boolean;
}
export declare function tickAll(dt: number): boolean;
export declare function addTickMotivator(motivator: TickMotivator): void;
export declare function removeTickMotivator(motivator: TickMotivator): void;
export declare function getTimeUntilNextAnimation(): number;
export declare type AnimationTargetField = 'color' | 'alpha' | 'offsetX' | 'offsetY' | 'width' | 'height' | 'backgroundColor' | 'backgroundImageScale' | 'imageScale' | 'borderColor';
export interface AnimationMotivator {
    source: 'time' | 'screenX' | 'screenY';
    easingFunction: MathUtils.EasingFunction;
    start: number;
    end: number;
    loopPeriod?: number;
}
interface AnimationNumberModifier {
    field: AnimationTargetField;
    start: string | number;
    end: string | number;
}
interface AnimationColorModifier {
    field: AnimationTargetField;
    start: string;
    end: string;
}
export interface AnimationDef {
    key?: string;
    motivator: AnimationMotivator;
    modifier: AnimationNumberModifier | AnimationColorModifier;
}
export interface AnimationTarget {
    node: LayoutNode;
}
export declare class LayoutAnimator {
    protected anim: AnimationDef;
    protected target: AnimationTarget;
    protected targetDrawable: LayoutDrawableName | undefined;
    protected targetField: string;
    protected param: number;
    protected startTime: number;
    protected isDimensionAnimation: boolean;
    private origFieldValue;
    constructor(anim: AnimationDef, target: AnimationTarget);
    destructor(): void;
    isAnimatingLayout(): boolean;
    getTimeUntilNextAnimation(): number;
    private getOrigFieldValue;
    getTarget(): LayoutNodeData | LayoutDrawable | undefined;
    tick(): boolean;
    protected getAnimatedValue(origFieldValue: string | number | undefined): string | number | undefined;
    updateDimensions(renderDims: Dimensions): boolean;
    updateForRender(): boolean;
    isCacheFriendly(): boolean;
    animKey(): string | undefined;
}
export declare class PositionParent implements TickMotivator {
    readonly layout: LayoutNodeData;
    readonly layoutParent: LayoutNode;
    readonly positionParent: LayoutNode;
    private relativePos;
    constructor(layout: LayoutNodeData, layoutParent: LayoutNode, positionParent: LayoutNode);
    destructor(): void;
    tick(_dt: number): boolean;
    updateForRender(): void;
}
export {};
