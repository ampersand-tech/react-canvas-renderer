/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import {
  BGColorDrawable,
  BorderDrawable,
  ImageDrawable,
  LayoutDrawable,
  SVGDrawable,
  TextDrawable,
} from 'LayoutDrawable';

import {
  Alignment,
  AS_LOOKUP,
  Axis,
  ClickFunction,
  LayoutBehavior,
  LayoutConstraints,
  LayoutDrawableName,
  LayoutNodeData,
  LayoutParent,
  Margins,
  OptDimensions,
} from 'LayoutTypes';

import * as JsonUtils from 'amper-utils/dist2017/jsonUtils';
import * as MathUtils from 'amper-utils/dist2017/mathUtils';
import { Dimensions, Point } from 'amper-utils/dist2017/mathUtils';
import * as ObjUtils from 'amper-utils/dist2017/objUtils';
import { absurd, Stash, StashOf } from 'amper-utils/dist2017/types';
import * as md5 from 'blueimp-md5';
import * as Constants from 'Constants';
import { defaultFontDesc } from 'Font';
import { FontStyle, FontWeight, TextDecoration, VerticalAlign } from 'FontUtils';
import { AnimationDef, LayoutAnimator, PositionParent } from 'LayoutAnimator';
import { LayoutInput } from 'LayoutInput';
import * as LayoutRenderer from 'LayoutRenderer';
import { BorderRadius, Shadow } from 'LayoutTypes';
import { MomentumScroller, ScrollBounds } from 'MomentumScroller';
import * as DomClassManager from 'quark-styles';

const SELF_DIRTY = 1 << 0;
const CHILDREN_DIRTY = 1 << 1;
const DIMS_DIRTY = 1 << 2;

const DEBUG_CACHE = false;
const DISABLE_CACHE = false;

let gDbgCounters = {
  intrinsicDims: 0,
  layout: 0,
  nodeDraw: 0,
};

export function applyConstraints(constraints: LayoutConstraints, dims: Dimensions) {
  if (constraints.min.width && dims.width < constraints.min.width) {
    dims.width = constraints.min.width;
  }
  if (constraints.min.height && dims.height < constraints.min.height) {
    dims.height = constraints.min.height;
  }
  if (constraints.max.width !== undefined && dims.width > constraints.max.width) {
    dims.width = constraints.max.width;
  }
  if (constraints.max.height !== undefined && dims.height > constraints.max.height) {
    dims.height = constraints.max.height;
  }
}

function isConstraining(constraints: LayoutConstraints, dims: Dimensions): boolean {
  if (constraints.min.width && dims.width < constraints.min.width) {
    return true;
  }
  if (constraints.min.height && dims.height < constraints.min.height) {
    return true;
  }
  if (constraints.max.width !== undefined && dims.width > constraints.max.width) {
    return true;
  }
  if (constraints.max.height !== undefined && dims.height > constraints.max.height) {
    return true;
  }
  return false;
}

export function parseShadow(shadowStr: string, isTextShadow: boolean): Shadow {
  // Not very robust, but generally matches our quark styles
  const splt = shadowStr.split('px');
  let colIdx: number;

  // Text shadow does not specify spread. For boxshadow it is specified but ignored
  if (isTextShadow) {
    if (splt.length !== 4) {
      throw new Error(`Unhandled text shadow support: (${shadowStr})`);
    }
    colIdx = 3;
  } else {
    if (splt.length !== 5) {
      throw new Error(`Unhandled text shadow support: (${shadowStr})`);
    }
    colIdx = 4;
  }
  return {
    offsetX: parseFloat(splt[0]),
    offsetY: parseFloat(splt[1]),
    blur: parseFloat(splt[2]),
    color: splt[colIdx].trim(),
  };
}

export function marginSizeForAxis(margins: Margins, axis: Axis, which: 'start'|'end'|'total'|'max2'): number {
  switch (which) {
    case 'total':
      if (axis === Axis.Width) {
        return margins.left + margins.right;
      } else {
        return margins.top + margins.bottom;
      }
    case 'start':
      if (axis === Axis.Width) {
        return margins.left;
      } else {
        return margins.top;
      }
    case 'end':
      if (axis === Axis.Width) {
        return margins.right;
      } else {
        return margins.bottom;
      }
    case 'max2':
      if (axis === Axis.Width) {
        return 2 * Math.max(margins.left, margins.right);
      } else {
        return 2 * Math.max(margins.top, margins.bottom);
      }
    default:
      absurd(which);
      return 0;
  }
}

// returns undefined if nothing changed; otherwise it returns the reconciled set of drawables
function reconcileDrawables<T>(oldDrawables: T, newDrawables: T): T|undefined {
  const out: any = Array.isArray(oldDrawables) ? [] : {};
  let isChanged = false;

  for (const key in newDrawables) {
    const oldDraw: LayoutDrawable|undefined = oldDrawables[key] as any;
    const newDraw: LayoutDrawable = newDrawables[key] as any;
    if (!oldDraw) {
      // no existing drawable with this key
      out[key] = newDraw;
      isChanged = true;
    } else if (oldDraw.constructor !== newDraw.constructor) {
      // not the same type
      out[key] = newDraw;
      isChanged = true;
    } else if (!ObjUtils.objCmpFast(oldDraw.initParams, newDraw.initParams)) {
      // different params
      out[key] = newDraw;
      isChanged = true;
    } else {
      out[key] = oldDraw;
    }
  }

  for (const key in oldDrawables) {
    if (!newDrawables[key]) {
      isChanged = true;
      break;
    }
  }

  return isChanged ? out : undefined;
}

export class LayoutNode implements LayoutParent {
  private parent: LayoutParent | LayoutNode | undefined;
  private dirtyBits: number = SELF_DIRTY | DIMS_DIRTY;

  private layout: LayoutNodeData;
  private layoutBehavior: LayoutBehavior | undefined;
  private positionParent: PositionParent | undefined;
  private virtualChildren: LayoutNode[] = [];
  private preContentDrawables: StashOf<LayoutDrawable> = {};
  private contentDrawables: LayoutDrawable[] = [];
  private postContentDrawables: StashOf<LayoutDrawable> = {};
  private animators: LayoutAnimator[] = [];
  private unmountAnimations: AnimationDef[] = [];
  private scroller: MomentumScroller|undefined;
  public input: LayoutInput | undefined = undefined;

  private isUnmounting = false;

  private isAnimating = false;
  private isCacheable = false;
  private cacheDirty = true;
  private cacheCanvas: HTMLCanvasElement | undefined;

  style: StashOf<string> = {};
  private styleHash: string = '';
  private classNames: string[] = [];
  private classNamesHash: string = '';
  private pseudoSelectors: string[] = [];

  // layout constraints from parent
  private externalConstraints: LayoutConstraints = { min: {}, max: {} };

  private intrinsicDims: Dimensions = { width: 0, height: 0 };

  // for LayoutRenderer purposes
  public reactFiber: any;

  public dataProps: Stash = {};

  public onClick: ClickFunction | undefined = undefined;
  public onDoubleClick: ClickFunction | undefined = undefined;
  public onLongPress: ClickFunction | undefined = undefined;

  constructor(layoutBehavior?: LayoutBehavior) {
    this.layout = new LayoutNodeData(this);
    this.layoutBehavior = layoutBehavior;
  }

  destructor() {
    this.parent = undefined;

    if (this.reactFiber) {
      LayoutRenderer.unmountLayoutNode(this);
      this.reactFiber = undefined;
    }

    for (const child of this.layout.children) {
      child.node.destructor();
    }
    this.layout.children = [];

    for (const vChild of this.virtualChildren) {
      vChild.unmount(true);
    }
    this.virtualChildren = [];

    for (const animator of this.animators) {
      animator.destructor();
    }
    this.animators = [];

    if (this.positionParent) {
      this.positionParent.destructor();
      this.positionParent = undefined;
    }

    if (this.scroller) {
      this.scroller.destructor();
      this.scroller = undefined;
    }

    this.unmountAnimations = [];
    this.isUnmounting = false;

    if (this.input) {
      this.input.destructor();
      this.input = undefined;
    }

    this.cacheCanvas = undefined;
  }

  unmount(skipUnmountAnimations?: boolean) {
    if (this.isUnmounting || !this.unmountAnimations.length || skipUnmountAnimations) {
      this.removeFromParent();
      this.destructor();
      return;
    }

    for (const animator of this.animators) {
      animator.destructor();
    }
    this.animators = [];

    for (const def of this.unmountAnimations) {
      this.addAnimation(def);
    }
    this.unmountAnimations = [];

    this.isUnmounting = true;
  }

  isUnmounted() {
    return this.isUnmounting || !this.parent;
  }

  removeAnimationWithKey(animKey: String) {
    for (const animator of this.animators) {
      if (animator.animKey() === animKey) {
        this.removeAnimation(animator);
        return;
      }
    }
  }

  removeAnimation(animator: LayoutAnimator) {
    const idx = this.animators.indexOf(animator);
    if (idx >= 0) {
      this.animators.splice(idx, 1);
      animator.destructor();
    }

    if (this.isUnmounting && this.animators.length === 0) {
      this.unmount();
    }
  }

  setLayoutBehavior(layoutBehavior?: LayoutBehavior) {
    if (this.layoutBehavior !== layoutBehavior) {
      this.layoutBehavior = layoutBehavior;
      this.setDirty();
    }
  }

  addChild(node: LayoutNode, beforeNode?: LayoutNode) {
    if (!this.layoutBehavior) {
      throw new Error('node does not support children');
    }
    if (node.parent) {
      throw new Error('addChild: node already has a parent');
    }
    if (beforeNode) {
      const beforeIndex = this.layout.children.indexOf(beforeNode.layout);
      if (beforeIndex === -1) {
        throw new Error('beforeNode is not a child of this node.');
      }
      this.layout.children.splice(beforeIndex, 0, node.layout);
    } else {
      this.layout.children.push(node.layout);
    }
    node.parent = this;
    this.setDirty();
    this.childIsDirty(node);
  }

  removeChild(node: LayoutNode) {
    const idx = this.layout.children.indexOf(node.layout);
    if (idx >= 0) {
      node.parent = undefined;
      this.layout.children.splice(idx, 1);
      this.setDirty();
    }
  }

  removeFromParent() {
    if (this.parent instanceof LayoutNode) {
      this.parent.removeChild(this);
    }
    this.parent = undefined;
  }

  addVirtualChild(child: LayoutNode) {
    this.virtualChildren.push(child);
  }

  removeVirtualChild(child: LayoutNode) {
    const idx = this.virtualChildren.indexOf(child);
    if (idx >= 0) {
      this.virtualChildren.splice(idx, 1);
    }
  }

  setPositionParent(positionParent: LayoutNode|undefined) {
    if (this.positionParent) {
      this.positionParent.destructor();
      this.positionParent = undefined;
    }
    if (positionParent && this.parent instanceof LayoutNode) {
      this.layout.hasPositionParent = true;
      this.positionParent = new PositionParent(
        this.layout,
        this.parent,
        positionParent,
      );
    } else {
      this.layout.hasPositionParent = false;
    }
  }

  setStyle(style: StashOf<string>, classNames: string[]) {
    classNames = classNames.sort();
    const classNamesHash = classNames.join(' ');
    const styleHash = md5(JsonUtils.safeStringify(style));
    if (this.styleHash !== styleHash || this.classNamesHash !== classNamesHash) {
      this.styleHash = styleHash;
      this.classNamesHash = classNamesHash;
      this.classNames = classNames;
      this.style = style;

      this.applyPseudoSelectors();
    }

    return this;
  }

  private applyPseudoSelectors() {
    let style = this.style;
    for (const className of this.classNames) {
      style = DomClassManager.applyGlobalClassStyles(style, className, this.pseudoSelectors);
    }
    this.applyStyle(style);
  }

  private applyStyle(style: StashOf<string>) {
    const layout = {
      localDims: {} as OptDimensions,
      localPos: { min: {}, max: {} } as LayoutConstraints,
      localConstraints: { min: {}, max: {} } as LayoutConstraints,
      padding: { left: 0, right: 0, top: 0, bottom: 0 } as Margins,
      margin: { left: 0, right: 0, top: 0, bottom: 0 } as Margins,
      flexProps: undefined as Stash|undefined,
      alignSelf: Alignment.Auto,
      color: '',
      alpha: 1,
      fontDesc: defaultFontDesc(),
      pointerEvents: 'auto',
      overflowX: '',
      overflowY: '',
    };

    if (style.width) {
      layout.localDims.width = parseFloat(style.width);
    }
    if (style.height) {
      layout.localDims.height = parseFloat(style.height);
    }
    if (style.minWidth) {
      layout.localConstraints.min.width = parseFloat(style.minWidth);
    }
    if (style.minHeight) {
      layout.localConstraints.min.height = parseFloat(style.minHeight);
    }
    if (style.maxWidth) {
      layout.localConstraints.max.width = parseFloat(style.maxWidth);
    }
    if (style.maxHeight) {
      layout.localConstraints.max.height = parseFloat(style.maxHeight);
    }
    if (style.paddingLeft) {
      layout.padding.left = parseFloat(style.paddingLeft);
    }
    if (style.paddingRight) {
      layout.padding.right = parseFloat(style.paddingRight);
    }
    if (style.paddingTop) {
      layout.padding.top = parseFloat(style.paddingTop);
    }
    if (style.paddingBottom) {
      layout.padding.bottom = parseFloat(style.paddingBottom);
    }
    if (style.marginLeft) {
      layout.margin.left = parseFloat(style.marginLeft);
    }
    if (style.marginRight) {
      layout.margin.right = parseFloat(style.marginRight);
    }
    if (style.marginTop) {
      layout.margin.top = parseFloat(style.marginTop);
    }
    if (style.marginBottom) {
      layout.margin.bottom = parseFloat(style.marginBottom);
    }
    if (style.left !== undefined) {
      layout.localPos.min.width = parseFloat(style.left);
    }
    if (style.right !== undefined) {
      layout.localPos.max.width = parseFloat(style.right);
    }
    if (style.top !== undefined) {
      layout.localPos.min.height = parseFloat(style.top);
    }
    if (style.bottom !== undefined) {
      layout.localPos.max.height = parseFloat(style.bottom);
    }

    if (style.flexGrow || style.flexShrink || style.flexBasis) {
      layout.flexProps = {};
      if (style.flexGrow) {
        layout.flexProps.flexGrow = parseFloat(style.flexGrow) || 0;
      }
      if (style.flexShrink) {
        layout.flexProps.flexShrink = parseFloat(style.flexShrink) || 0;
      }
      if (style.flexBasis) {
        layout.flexProps.flexBasis = parseFloat(style.flexBasis) || 0;
      }
    }

    if (style.alignSelf && AS_LOOKUP.hasOwnProperty(style.alignSelf)) {
      layout.alignSelf = AS_LOOKUP[style.alignSelf];
    }

    if (style.color) {
      layout.color = style.color;
    }
    if (style.alpha !== undefined) {
      layout.alpha = MathUtils.clamp(0, 1, parseFloat(style.alpha));
    }
    if (style.opacity !== undefined) {
      layout.alpha = layout.alpha * MathUtils.clamp(0, 1, parseFloat(style.opacity));
    }

    if (style.overflow === 'scroll') {
      layout.overflowX = layout.overflowY = 'scroll';
    }
    if (style.overflowX === 'scroll') {
      layout.overflowX = 'scroll';
    }
    if (style.overflowY === 'scroll') {
      layout.overflowY = 'scroll';
    }

    // TODO inherit font styles down the tree
    if (style.fontFamily) {
      layout.fontDesc.fontFamily = style.fontFamily;
    }
    if (style.fontWeight) {
      layout.fontDesc.fontWeight = parseInt(style.fontWeight) as FontWeight;
    }
    if (style.fontStyle) {
      layout.fontDesc.fontStyle = style.fontStyle as FontStyle;
    }
    if (style.fontSize) {
      layout.fontDesc.fontSize = parseInt(style.fontSize);
    }
    if (style.textDecoration) {
      layout.fontDesc.textDecoration = style.textDecoration as TextDecoration;
    }
    if (style.lineSpacing) {
      layout.fontDesc.lineSpacing = parseFloat(style.lineSpacing);
    }
    if (style.verticalAlign) {
      layout.fontDesc.verticalAlign = style.verticalAlign as VerticalAlign;
    }
    if (style.pointerEvents === 'none' || style.pointerEvents === 'painted') {
      layout.pointerEvents = style.pointerEvents;
    }

    const preContentDrawables: StashOf<LayoutDrawable> = {};
    const postContentDrawables: StashOf<LayoutDrawable> = {};

    let borderRadius: BorderRadius | undefined = undefined;
    if (
      style.borderBottomLeftRadius ||
      style.borderBottomRightRadius ||
      style.borderTopLeftRadius ||
      style.borderTopRightRadius
    ) {
      // TODO: support pct
      if (style.borderBottomLeftRadius && style.borderBottomLeftRadius.indexOf('%') >= 0) {
        throw new Error('border radius percent not yet supported');
      }
      borderRadius = {
        bl: parseFloat(style.borderBottomLeftRadius) || 0,
        br: parseFloat(style.borderBottomRightRadius) || 0,
        tl: parseFloat(style.borderTopLeftRadius) || 0,
        tr: parseFloat(style.borderTopRightRadius) || 0,
      };
    }

    let boxShadow: Shadow | undefined = undefined;
    if (style.boxShadow) {
      boxShadow = parseShadow(style.boxShadow, false);
    }

    if (style.backgroundColor || style.backgroundImage && style.backgroundImage.slice(0, 6) === 'linear') {
      const bgColor = style.backgroundImage && style.backgroundImage.slice(0, 6) === 'linear' ? style.backgroundImage : style.backgroundColor;
      preContentDrawables.backgroundColor = new BGColorDrawable(this, bgColor, borderRadius, boxShadow);
    }
    if (style.backgroundImage && style.backgroundImage.slice(0, 4) === 'url(') {
      preContentDrawables.backgroundImage =
        new ImageDrawable(this, style.backgroundImage.slice(4, -1), true, style.backgroundSize, borderRadius, boxShadow);
    }
    if (style.borderStyle && style.borderStyle !== 'none') {
      const borderWidth = Math.max(
        parseInt(style.borderLeftWidth) || 0,
        parseInt(style.borderRightWidth) || 0,
        parseInt(style.borderTopWidth) || 0,
        parseInt(style.borderBottomWidth) || 0,
      );
      if (borderWidth > 0) {
        const color: string = style.borderImage || style.borderColor;
        postContentDrawables.border = new BorderDrawable(this, style.borderStyle, color, borderWidth, borderRadius);
      }
    }

    let isDirty = false;
    let hasInheritedChange = false;
    let inheritedChanges: StashOf<number> = {};
    for (const key in layout) {
      if (!ObjUtils.objCmpFast(layout[key], this.layout[key])) {
        isDirty = true;
        // Todo, expand to font and maybe more
        if (key === 'color') {
          hasInheritedChange = true;
          inheritedChanges[key] = 1;
        }
        this.layout[key] = layout[key];
      }
    }

    const needsScroller = Boolean(layout.overflowX || layout.overflowY);
    if (this.scroller && !needsScroller) {
      this.scroller.destructor();
      this.scroller = undefined;
    } else if (!this.scroller && needsScroller) {
      this.scroller = new MomentumScroller({
        getScrollBounds: this.getChildBounds,
        getContainerSize: this.getDimensions,
        scrollX: layout.overflowX === 'scroll',
        scrollY: layout.overflowY === 'scroll',
      });
    } else if (this.scroller) {
      this.scroller.setScrollDirection(layout.overflowX === 'scroll', layout.overflowY === 'scroll');
    }

    const reconciledPre = reconcileDrawables(this.preContentDrawables, preContentDrawables);
    if (reconciledPre) {
      this.preContentDrawables = reconciledPre;
      isDirty = true;
    }

    const reconciledPost = reconcileDrawables(this.postContentDrawables, postContentDrawables);
    if (reconciledPost) {
      this.postContentDrawables = reconciledPost;
      isDirty = true;
    }

    for (const drawable of this.contentDrawables) {
      if (drawable.setStyle(style)) {
        isDirty = true;
      }
    }

    if (this.layoutBehavior && this.layoutBehavior.setStyle(style)) {
      isDirty = true;
    }

    if (isDirty) {
      this.setDirty();
    }
    if (hasInheritedChange) {
      this.setInheritedChanges(inheritedChanges, true);
    }
  }

  notifyActive = (active: boolean) => {
    const activeIdx = this.pseudoSelectors.indexOf('active');
    const isActive = activeIdx >= 0;
    if (isActive === active) {
      return;
    }

    if (active) {
      this.pseudoSelectors.push('active');
    } else {
      this.pseudoSelectors.splice(activeIdx, 1);
    }
    this.applyPseudoSelectors();
  }

  addAnimation(anim: AnimationDef) {
    this.animators.push(new LayoutAnimator(anim, { node: this }));
  }

  setUnmountAnimations(anims: AnimationDef[]) {
    this.unmountAnimations = anims.slice(0);
  }

  getDrawable(name: LayoutDrawableName): LayoutDrawable|undefined {
    for (const drawable of this.contentDrawables) {
      if (name === 'svg' && drawable instanceof SVGDrawable) {
        return drawable;
      }
      if (name === 'img' && drawable instanceof ImageDrawable) {
        return drawable;
      }
    }

    return this.preContentDrawables[name] || this.postContentDrawables[name];
  }
  hasDrawables(): boolean {
    return (
      this.contentDrawables.length > 0 ||
      !ObjUtils.safeObjIsEmpty(this.preContentDrawables) ||
      !ObjUtils.safeObjIsEmpty(this.postContentDrawables)
    );

  }

  hasInteractionHandler(): boolean {
    return Boolean(this.onClick || this.onDoubleClick || this.scroller || this.dataProps.touchHandler || this.onLongPress);
  }

  setCacheable(cacheable: boolean) {
    if (cacheable !== this.isCacheable) {
      this.isCacheable = cacheable;
      this.cacheCanvas = undefined;
      this.cacheDirty = true;
    }
  }

  setWidth(width: number | undefined) {
    if (this.layout.localDims.width !== width) {
      this.layout.localDims.width = width;
      this.setDirty();
    }
    return this;
  }

  setHeight(height: number | undefined) {
    if (this.layout.localDims.height !== height) {
      this.layout.localDims.height = height;
      this.setDirty();
    }
    return this;
  }

  setPadding(padding: Margins) {
    if (!ObjUtils.objCmpFast(padding, this.layout.padding)) {
      this.layout.padding = padding;
      this.setDirty();
    }
    return this;
  }

  setTextContent(text: string) {
    this.setContent([ new TextDrawable(this, text) ]);
  }

  setContent(drawables: LayoutDrawable[]) {
    const reconciled = reconcileDrawables(this.contentDrawables, drawables);
    if (reconciled) {
      this.contentDrawables = reconciled;
      this.setDirty();
    }
  }

  setParent(parent: LayoutParent) {
    this.parent = parent;
    this.setDirty();
    this.parent.childIsDirty(this);
  }

  getParent(): LayoutParent | undefined {
    return this.parent;
  }

  getParentNode(): LayoutNode | undefined {
    if (this.parent instanceof LayoutNode) {
      return this.parent;
    }
    return undefined;
  }

  getLayoutData() {
    return this.layout;
  }

  getFontDesc() {
    return this.layout.fontDesc;
  }

  getScrollHandler = (): MomentumScroller|undefined => {
    return this.dataProps.scrollHandler || this.scroller;
  }

  private getChildBounds = (): Readonly<ScrollBounds> => {
    const bounds = { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };

    for (const layout of this.layout.children) {
      const x = layout.computedOffset.x + layout.offsetX;
      const y = layout.computedOffset.y + layout.offsetY;
      bounds.xMin = Math.min(bounds.xMin, x);
      bounds.yMin = Math.min(bounds.yMin, y);
      bounds.xMax = Math.max(bounds.xMax, x + layout.renderDims.width + layout.margin.right);
      bounds.yMax = Math.max(bounds.yMax, y + layout.renderDims.height + layout.margin.bottom);
    }

    return bounds;
  }

  private getDimensions = (): Readonly<Dimensions> => {
    return this.layout.renderDims;
  }

  childIsDirty(_node: LayoutNode) {
    if ((this.dirtyBits & CHILDREN_DIRTY) && (this.dirtyBits & DIMS_DIRTY)) {
      return;
    }
    this.dirtyBits |= CHILDREN_DIRTY | DIMS_DIRTY;
    this.parent && this.parent.childIsDirty(this);
  }

  setDirty(bits: number = SELF_DIRTY | DIMS_DIRTY) {
    if ((this.dirtyBits & bits) === bits) {
      return;
    }
    this.dirtyBits |= bits;
    if (bits & DIMS_DIRTY) {
      this.parent && this.parent.childIsDirty(this);
    }
  }

  setInheritedChanges(inheritedChanges: StashOf<number>, isStart: boolean): void {
    if (!isStart) {
      // First remove any inherited changes that we set ourselves
      let changesToRemove: string[] = [];
      for (const prop in inheritedChanges) {
        if (this.layout[prop]) {
          changesToRemove.push(prop);
        }
      }
      if (changesToRemove.length) {
        if (changesToRemove.length === Object.keys(inheritedChanges).length) {
          // we have no more changes to propagate, so we're done
          return;
        }
        inheritedChanges = ObjUtils.clone(inheritedChanges);
        for (const prop of changesToRemove) {
          delete inheritedChanges[prop];
        }
      }
    }

    // Now, set this one dirty since we still have changes
    this.setDirty(SELF_DIRTY);

    // Check all children
    for (const layout of this.layout.children) {
      layout.node.setInheritedChanges(inheritedChanges, false);
    }
  }

  setExternalConstraints(newConstraints: LayoutConstraints) {
    if (ObjUtils.objCmpFast(this.externalConstraints, newConstraints)) {
      // no change
      return;
    }
    this.externalConstraints = ObjUtils.clone(newConstraints);
    const dims = this.getIntrinsicDims();
    if (isConstraining(this.externalConstraints, dims)
      || dims.width !== this.layout.computedDims.width
      || dims.height !== this.layout.computedDims.height
    ) {
      this.setDirty(SELF_DIRTY);
    }
  }

  // intrinsicDims are what size this node would be without any external constraints (but it does apply internal constraints)
  getIntrinsicDims(): Dimensions {
    if (this.dirtyBits & DIMS_DIRTY) {
      gDbgCounters.intrinsicDims++;

      this.intrinsicDims.width = 0;
      this.intrinsicDims.height = 0;

      if (this.layout.localDims.width !== undefined) {
        this.intrinsicDims.width = this.layout.localDims.width;
      }
      if (this.layout.localDims.height !== undefined) {
        this.intrinsicDims.height = this.layout.localDims.height;
      }

      for (const key in this.preContentDrawables) {
        this.preContentDrawables[key].updateIntrinsicDims(this.intrinsicDims, this.layout.padding);
      }
      for (const drawable of this.contentDrawables) {
        drawable.updateIntrinsicDims(this.intrinsicDims, this.layout.padding);
      }
      for (const key in this.postContentDrawables) {
        this.postContentDrawables[key].updateIntrinsicDims(this.intrinsicDims, this.layout.padding);
      }

      if (this.layoutBehavior) {
        this.layoutBehavior.updateIntrinsicDimsForChildren(this.layout, this.intrinsicDims);
      }

      // add padding
      this.intrinsicDims.width += this.layout.padding.left + this.layout.padding.right;
      this.intrinsicDims.height += this.layout.padding.top + this.layout.padding.bottom;

      applyConstraints(this.layout.localConstraints, this.intrinsicDims);

      this.dirtyBits = this.dirtyBits & ~DIMS_DIRTY;
    }

    return ObjUtils.clone(this.intrinsicDims);
  }

  layoutIfNeeded(force: boolean = false): boolean {
    if (!this.dirtyBits && !force) {
      return false;
    }

    gDbgCounters.layout++;

    this.layout.computedDims = ObjUtils.clone(this.getIntrinsicDims());
    applyConstraints(this.externalConstraints, this.layout.computedDims);

    // no infinite dimensions!
    if (this.layout.computedDims.width === Infinity) {
      this.layout.computedDims.width = 0;
    }
    if (this.layout.computedDims.height === Infinity) {
      this.layout.computedDims.height = 0;
    }

    ObjUtils.copyFields(this.layout.computedDims, this.layout.renderDims);

    for (const animator of this.animators) {
      if (animator.updateDimensions(this.layout.renderDims)) {
        // the isAnimating flag is used to stop caching during animation
        this.isAnimating = true;
      }
    }

    if (this.layoutBehavior && this.layout.children.length) {
      // constrain children to fit within this node's dimensions
      const childConstraints: LayoutConstraints = {
        min: {},
        max: {
          width: Math.max(0, this.layout.renderDims.width - this.layout.padding.left - this.layout.padding.right),
          height: Math.max(0, this.layout.renderDims.height - this.layout.padding.top - this.layout.padding.bottom),
        },
      };
      if (this.layout.overflowX === 'scroll') {
        childConstraints.max.width = undefined;
      }
      if (this.layout.overflowY === 'scroll') {
        childConstraints.max.height = undefined;
      }
      this.layoutBehavior.layoutChildren(this.layout, childConstraints, force || false);
    }

    this.dirtyBits = 0;
    this.cacheDirty = true;
    return true;
  }

  // returns true if subtree is cacheable
  draw(ctx: CanvasRenderingContext2D): boolean {
    this.layout.offsetX = this.layout.offsetY = 0;

    let animationStatusAllowsCaching = true;
    for (const animator of this.animators) {
      if (animator.updateForRender()) {
        this.isAnimating = true;
        // If animating and not frame friendly
        if (!animator.isCacheFriendly()) {
          animationStatusAllowsCaching = false;
        }
      }
    }

    this.positionParent && this.positionParent.updateForRender();

    const canvasWidth = Math.ceil(this.layout.renderDims.width * Constants.PIXEL_RATIO);
    const canvasHeight = Math.ceil(this.layout.renderDims.height * Constants.PIXEL_RATIO);
    if (this.cacheCanvas && (this.cacheCanvas.width !== canvasWidth || this.cacheCanvas.height !== canvasHeight)) {
      // renderDims changed, free cached canvas
      this.cacheCanvas = undefined;
      this.cacheDirty = true;
    }

    if (this.isCacheable && this.cacheDirty && !DISABLE_CACHE && canvasWidth && canvasHeight && animationStatusAllowsCaching) {
      if (!this.cacheCanvas) {
        this.cacheCanvas = document.createElement('canvas');
        this.cacheCanvas.width = canvasWidth;
        this.cacheCanvas.height = canvasHeight;
      }

      const cacheCtx = this.cacheCanvas.getContext('2d');
      if (cacheCtx) {
        cacheCtx.save();
        cacheCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        cacheCtx.scale(Constants.PIXEL_RATIO, Constants.PIXEL_RATIO);
        cacheCtx.globalAlpha = 1;
        cacheCtx.fillStyle = ctx.fillStyle;
        this.cacheDirty = !this.drawInternal(cacheCtx);
        cacheCtx.restore();
      } else {
        this.cacheDirty = true;
      }
    }

    let isCacheableFrame = !this.isAnimating;
    this.isAnimating = false;

    if (this.layout.alpha === 0) {
      return isCacheableFrame;
    }

    ctx.save();

    ctx.translate(
      this.layout.computedOffset.x + this.layout.offsetX,
      this.layout.computedOffset.y + this.layout.offsetY,
    );

    if (this.cacheCanvas && !this.cacheDirty) {
      ctx.globalAlpha *= this.layout.alpha;
      ctx.drawImage(
        this.cacheCanvas!,
        0,
        0,
        this.layout.renderDims.width * Constants.PIXEL_RATIO,
        this.layout.renderDims.height * Constants.PIXEL_RATIO,
        0,
        0,
        this.layout.renderDims.width,
        this.layout.renderDims.height,
      );
      if (DEBUG_CACHE) {
        ctx.strokeStyle = 'red';
        ctx.strokeRect(
          0,
          0,
          this.layout.renderDims.width,
          this.layout.renderDims.height,
        );
      }
    } else {
      ctx.globalAlpha *= this.layout.alpha;
      if (!this.drawInternal(ctx)) {
        isCacheableFrame = false;
      }
    }

    ctx.restore();

    return isCacheableFrame;
  }

  // returns true if subtree is cacheable
  private drawInternal(ctx: CanvasRenderingContext2D): boolean {
    gDbgCounters.nodeDraw++;

    let noCache = false;

    ctx.translate(this.layout.padding.left, this.layout.padding.top);

    if (this.layout.color) {
      ctx.fillStyle = this.layout.color;
    }

    const innerDims: Dimensions = {
      width: this.layout.renderDims.width - this.layout.padding.left - this.layout.padding.right,
      height: this.layout.renderDims.height - this.layout.padding.top - this.layout.padding.bottom,
    };
    for (const key in this.preContentDrawables) {
      ctx.save();
      if (!this.preContentDrawables[key].draw(ctx, innerDims, this.layout.padding)) {
        noCache = true;
      }
      ctx.restore();
    }

    if (this.scroller) {
      ctx.save();

      // build clipping region
      ctx.beginPath();
        ctx.lineTo(this.layout.renderDims.width, 0);
        ctx.lineTo(this.layout.renderDims.width, this.layout.renderDims.height);
        ctx.lineTo(0, this.layout.renderDims.height);
        ctx.lineTo(0, 0);
      ctx.clip();

      // apply scroll offset to children
      ctx.translate(-this.scroller.getScrollX(), -this.scroller.getScrollY());
    }
    if (this.dataProps.drawReversed) {
      for (let i = this.layout.children.length - 1; i >= 0; --i) {
        const layout = this.layout.children[i];
        if (!layout.node.draw(ctx)) {
          noCache = true;
        }
      }
    } else {
      for (const layout of this.layout.children) {
        if (!layout.node.draw(ctx)) {
          noCache = true;
        }
      }
    }
    if (this.scroller) {
      ctx.restore();
    }

    for (const drawable of this.contentDrawables) {
      ctx.save();
      if (!drawable.draw(ctx, innerDims, this.layout.padding)) {
        noCache = true;
      }
      ctx.restore();
    }
    for (const key in this.postContentDrawables) {
      ctx.save();
      if (!this.postContentDrawables[key].draw(ctx, innerDims, this.layout.padding)) {
        noCache = true;
      }
      ctx.restore();
    }

    return !noCache;
  }

  layoutTreeIfNeeded() {
    let node: LayoutNode | LayoutParent = this;
    while ((node instanceof LayoutNode) && node.parent) {
      node = node.parent;
    }
    node.layoutIfNeeded();
  }

  getRootFiber() {
    let node: LayoutNode|null = this;
    while (node) {
      if (node.reactFiber) {
        return node.reactFiber;
      }
      if (node.parent instanceof LayoutNode) {
        node = node.parent;
      } else {
        node = null;
      }
    }
    return null;
  }

  getScreenOffset(includePadding?: boolean) {
    const offset = ObjUtils.clone(this.layout.computedOffset);
    offset.x += this.layout.offsetX + (includePadding ? this.layout.padding.left : 0);
    offset.y += this.layout.offsetY + (includePadding ? this.layout.padding.top : 0);
    if (this.scroller) {
      offset.x -= this.scroller.getScrollX();
      offset.y -= this.scroller.getScrollY();
    }
    if (this.parent) {
      const parentOffset = this.parent.getScreenOffset(true);
      offset.x += parentOffset.x;
      offset.y += parentOffset.y;
    }
    return offset;
  }

  getDebugTree() {
    this.layoutIfNeeded();

    const res = {
      type: this.layoutBehavior ? this.layoutBehavior.toString() : 'Node',
      offset: ObjUtils.clone(this.layout.computedOffset),
      dims: ObjUtils.clone(this.layout.renderDims),
      children: this.layout.children.map((child) => child.node.getDebugTree()),
    };
    res.offset.x += this.layout.offsetX;
    res.offset.y += this.layout.offsetY;

    for (const drawable of this.contentDrawables) {
      if (drawable instanceof TextDrawable) {
        res.text = drawable.text;
      }
    }

    return res;
  }

  getChild(path: number[]): LayoutNode | undefined {
    let layout: LayoutNodeData = this.layout;
    for (const p of path) {
      layout = layout.children[p];
      if (!layout) {
        return undefined;
      }
    }
    return layout.node;
  }

  // if cb returns true, stop walking down
  public readonly walkDownTree = (cb: ((node: LayoutNode) => Constants.TreeWalkerCBResult)) => {
    let cbResult = cb(this);
    if (cbResult !== Constants.TREE_WALKER_CB_RESULT.CONTINUE) {
      return cbResult;
    }
    for (const layout of this.layout.children) {
      cbResult = layout.node.walkDownTree(cb);
      if (cbResult === Constants.TREE_WALKER_CB_RESULT.DONE) {
        return cbResult;
      }
    }
  }

  public getLeafTouchableNodeAt(layoutSpacePoint: Point): LayoutNode|undefined {
    this.layoutIfNeeded();

    if (this.layout.pointerEvents === 'none') {
      return undefined;
    }

    const innerSpacePoint: Point = {
      x: layoutSpacePoint.x - this.layout.padding.left,
      y: layoutSpacePoint.y - this.layout.padding.top,
    };

    if (this.scroller) {
      if (
        innerSpacePoint.x < 0 ||
        innerSpacePoint.y < 0 ||
        innerSpacePoint.x > this.layout.renderDims.width ||
        innerSpacePoint.y > this.layout.renderDims.height
      ) {
        // clipped out
        return this;
      }

      innerSpacePoint.x += this.scroller.getScrollX();
      innerSpacePoint.y += this.scroller.getScrollY();
    }

    for (let i = this.layout.children.length - 1; i >= 0; --i) {
      // check if innerSpacePoint is contained within child
      const layout = this.layout.children[i];
      const offset: Point = ObjUtils.clone(layout.computedOffset);
      offset.x += layout.offsetX;
      offset.y += layout.offsetY;
      if (
        innerSpacePoint.x >= offset.x &&
        innerSpacePoint.x <= (offset.x + layout.renderDims.width) &&
        innerSpacePoint.y >= offset.y &&
        innerSpacePoint.y <= (offset.y + layout.renderDims.height)
      ) {
        const hit = layout.node.getLeafTouchableNodeAt({
          x: innerSpacePoint.x - offset.x,
          y: innerSpacePoint.y - offset.y,
        });
        if (hit) {
          return hit;
        }
      }
    }

    if (this.hasInteractionHandler()) {
      return this;
    }

    // didn't hit any children
    if (this.layout.pointerEvents === 'painted' || !this.hasDrawables()) {
      return undefined;
    }
    return this;
  }

  // for React devtools, pretend to be a DOMNode
  readonly nodeType = 1;
  public getBoundingClientRect(): ClientRect {
    this.layoutTreeIfNeeded();

    const offset = this.getScreenOffset();

    const rect: ClientRect = {
      left: offset.x,
      top: offset.y,
      right: offset.x + this.layout.renderDims.width,
      bottom: offset.y + this.layout.renderDims.height,
      width: this.layout.renderDims.width,
      height: this.layout.renderDims.height,
    };
    return rect;
  }
  public getClientRects(): ClientRect[] {
    return [this.getBoundingClientRect()];
  }
  public getComputedStyle(): Stash {
    const style = {
      borderLeftWidth: '0px',
      borderRightWidth: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
      marginLeft: this.layout.margin.left + 'px',
      marginRight: this.layout.margin.right + 'px',
      marginTop: this.layout.margin.top + 'px',
      marginBottom: this.layout.margin.bottom + 'px',
      paddingLeft: this.layout.padding.left + 'px',
      paddingRight: this.layout.padding.right + 'px',
      paddingTop: this.layout.padding.top + 'px',
      paddingBottom: this.layout.padding.bottom + 'px',
    };
    return style;
  }

  // for TestDom to be able to dispatch events
  public getCanvas(): HTMLCanvasElement | undefined {
    return this.parent ? this.parent.getCanvas() : undefined;
  }
  public isAnimatingLayout(): boolean {
    let node: LayoutNode | LayoutParent | undefined = this;
    while (node instanceof LayoutNode) {
      for (const animator of node.animators) {
        if (animator.isAnimatingLayout()) {
          return true;
        }
      }
      node = node.parent;
    }
    return false;
  }
}

export const debug = {
  getCounters(doReset = false) {
    const ret = gDbgCounters;
    if (doReset) {
      debug.resetCounters();
    }
    return ret;
  },
  resetCounters() {
    gDbgCounters = {
      intrinsicDims: 0,
      layout: 0,
      nodeDraw: 0,
    };
  },
};
