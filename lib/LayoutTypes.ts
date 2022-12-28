/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { FontDesc, defaultFontDesc } from './Font';
import { LayoutNode } from './LayoutNode';

import { Dimensions, Point, ScreenSpacePoint } from 'amper-utils/dist/mathUtils';
import { Stash } from 'amper-utils/dist/types';

export type LayoutDrawableName = 'svg'|'img'|'border'|'backgroundColor'|'backgroundImage';

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

export enum Direction {
  Row = 1,
  Column,
}

export enum Axis {
  Width = 'width',
  Height = 'height',
}

export enum PosEntry {
  X = 'x',
  Y = 'y',
}

export enum Alignment {
  Auto = 1,
  Center,
  Start,
  End,
  Stretch,
}

export interface BorderRadius {
  tl: number;
  tr: number;
  bl: number;
  br: number;
}

export enum ImageCoverType {
  None,
  Contain,
  Cover,
}

export interface Shadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}


export const AI_LOOKUP = {
  'center': Alignment.Center,
  'flex-start': Alignment.Start,
  'flex-end': Alignment.End,
  'stretch': Alignment.Stretch,
};

export const AS_LOOKUP = {
  'auto': Alignment.Auto,
  'center': Alignment.Center,
  'flex-start': Alignment.Start,
  'flex-end': Alignment.End,
  'stretch': Alignment.Stretch,
};

export interface LayoutParent {
  childIsDirty(child: LayoutNode);
  layoutIfNeeded();
  getScreenOffset(includePadding?: boolean): Point;
  getCanvas(): HTMLCanvasElement | undefined;
}

export type ClickFunction = (point: ScreenSpacePoint) => void;
export type NotifyStateFunction = (state: boolean) => void;

export class LayoutNodeData {
  node: LayoutNode;
  children: LayoutNodeData[] = [];

  localDims: OptDimensions = {}; // localDims are within the padding
  localPos: LayoutConstraints = { min: {}, max: {} };
  padding: Margins = { left: 0, top: 0, right: 0, bottom: 0 };
  margin: Margins = { left: 0, top: 0, right: 0, bottom: 0 };
  localConstraints: LayoutConstraints = { min: {}, max: {} };
  flexProps: FlexProperties | undefined;
  alignSelf: Alignment = Alignment.Auto;
  color: string = '';
  alpha: number = 1;
  fontDesc: FontDesc = defaultFontDesc();
  pointerEvents = 'auto';
  overflowX = '';
  overflowY = '';

  hasPositionParent = false;

  // computedDims contain the padding and children, but not margins
  computedDims: Dimensions = { width: 0, height: 0 };
  computedOffset: Point = { x: 0, y: 0 };

  // renderDims are what actually get used for drawing, different from computedDims if animations are running
  renderDims: Dimensions = { width: 0, height: 0 };
  offsetX = 0;
  offsetY = 0;

  constructor(node: LayoutNode) {
    this.node = node;
  }
}

export abstract class LayoutBehavior {
  abstract toString(): string;
  abstract setStyle(style: Stash): boolean;
  abstract updateIntrinsicDimsForChildren(layout: LayoutNodeData, dims: Dimensions);
  abstract layoutChildren(layout: LayoutNodeData, childConstraints: LayoutConstraints, force: boolean);
}

export abstract class DirectionalLayoutBehavior extends LayoutBehavior {
  protected direction: Direction;
  protected mainAxis: Axis;
  protected crossAxis: Axis;
  protected mainAxisPos: PosEntry;
  protected crossAxisPos: PosEntry;

  constructor(direction: Direction) {
    super();

    this.direction = direction;
    if (this.direction === Direction.Row) {
      this.mainAxis = Axis.Width;
      this.crossAxis = Axis.Height;
      this.mainAxisPos = PosEntry.X;
      this.crossAxisPos = PosEntry.Y;
    } else {
      this.mainAxis = Axis.Height;
      this.crossAxis = Axis.Width;
      this.mainAxisPos = PosEntry.Y;
      this.crossAxisPos = PosEntry.X;
    }
  }
}

export function itemAlignment(layout: LayoutNodeData, alignItems: Alignment, crossAxis: Axis) {
  if (alignItems === Alignment.Stretch && layout.localDims[crossAxis] !== undefined) {
    alignItems = Alignment.Center;
  }
  return layout.alignSelf === Alignment.Auto ? alignItems : layout.alignSelf;
}
