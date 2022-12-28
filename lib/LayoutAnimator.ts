/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as CanvasRenderer from './CanvasRenderer';
import { LayoutDrawable } from './LayoutDrawable';
import { LayoutNode } from './LayoutNode';
import { LayoutDrawableName, LayoutNodeData } from './LayoutTypes';

import * as MathUtils from 'amper-utils/dist/mathUtils';
import { Dimensions } from 'amper-utils/dist/mathUtils';
import { absurd } from 'amper-utils/dist/types';
import * as color from 'color';

let gTimeAccum = 0;

interface TickMotivator {
  tick: (dt: number) => boolean;
}

const gAnimators: LayoutAnimator[] = [];
const gTickMotivators: TickMotivator[] = [];

const CACHE_FRIENDLY_FIELDS = {
  alpha: 1,
  offsetX: 1,
  offsetY: 1,
};

export function tickAll(dt: number): boolean {
  gTimeAccum += dt;

  let anyChanged = false;
  for (const animator of gAnimators) {
    anyChanged = animator.tick() || anyChanged;
  }
  for (const motivator of gTickMotivators) {
    anyChanged = motivator.tick(dt) || anyChanged;
  }
  return anyChanged;
}

export function addTickMotivator(motivator: TickMotivator) {
  gTickMotivators.push(motivator);
}

export function removeTickMotivator(motivator: TickMotivator) {
  const idx = gTickMotivators.indexOf(motivator);
  if (idx >= 0) {
    gTickMotivators.splice(idx, 1);
  }
}

export function getTimeUntilNextAnimation() {
  let time = Infinity;
  for (const animator of gAnimators) {
    time = Math.min(time, animator.getTimeUntilNextAnimation());
  }
  return isFinite(time) ? time : 0;
}

function getModifiedNumber(value: string|number, origValue: number): number {
  if (typeof value === 'number') {
    // raw number, use it
    return value;
  }

  if (value.slice(-1) === '%') {
    // percent, use as multiplier
    const multiplier = (parseInt(value) || 0) * 0.01;
    return multiplier * origValue;
  }

  // parse and hope for the best
  return parseFloat(value) || 0;
}

function getModifiedColor(value: string, origValue: color): color {
  if (value.slice(-1) === '%') {
    const multiplier = (parseFloat(value) || 0) * 0.01;
    return origValue.alpha(origValue.alpha() * multiplier);
  }
  return color(value);
}

export type AnimationTargetField =
  | 'color'
  | 'alpha'
  | 'offsetX'
  | 'offsetY'
  | 'width'
  | 'height'
  | 'backgroundColor'
  | 'backgroundImageScale'
  | 'imageScale'
  | 'borderColor'
;

export interface AnimationMotivator {
  source: 'time'|'screenX'|'screenY';
  easingFunction: MathUtils.EasingFunction;
  start: number;
  end: number;
  loopPeriod?: number;
}

interface AnimationNumberModifier {
  field: AnimationTargetField;
  start: string|number;
  end: string|number;
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

export class LayoutAnimator {
  protected anim: AnimationDef;
  protected target: AnimationTarget;
  protected targetDrawable: LayoutDrawableName|undefined;
  protected targetField: string;
  protected param = -1;
  protected startTime = 0;
  protected isDimensionAnimation = false;
  private origFieldValue: string|number|undefined;

  constructor(anim: AnimationDef, target: AnimationTarget) {
    CanvasRenderer.flushAnimations();

    gAnimators.push(this);

    this.anim = anim;
    this.target = target;
    this.startTime = gTimeAccum;

    this.targetField = this.anim.modifier.field;
    switch (this.targetField) {
      case 'backgroundColor':
        this.targetDrawable = 'backgroundColor';
        this.targetField = 'color';
        break;

      case 'backgroundImageScale':
        this.targetDrawable = 'backgroundImage';
        this.targetField = 'drawScale';
        break;

      case 'imageScale':
        this.targetDrawable = 'img';
        this.targetField = 'drawScale';
        break;

      case 'borderColor':
        this.targetDrawable = 'border';
        this.targetField = 'color';
        break;
    }

    if (!this.targetDrawable && (this.targetField === 'width' || this.targetField === 'height')) {
      this.isDimensionAnimation = true;
    }

    const origFieldValue = this.getOrigFieldValue();
    const fieldValueType = typeof origFieldValue;
    if (fieldValueType !== 'string' && fieldValueType !== 'number' && origFieldValue !== undefined) {
      throw new Error(`Invalid field type "${fieldValueType}" found for animator`);
    }

    CanvasRenderer.kickRender();
  }

  destructor() {
    this.isDimensionAnimation = false;

    const idx = gAnimators.indexOf(this);
    if (idx >= 0) {
      gAnimators.splice(idx, 1);
    }
  }

  isAnimatingLayout() {
    if (this.anim.motivator.source !== 'time') {
      return false;
    }
    if (this.isDimensionAnimation) {
      return true;
    }
    if (this.anim.modifier.field === 'offsetX' || this.anim.modifier.field === 'offsetY') {
      return true;
    }
    return false;
  }

  getTimeUntilNextAnimation(): number {
    if (this.anim.motivator.source !== 'time') {
      return Infinity;
    }
    const curTime = gTimeAccum - this.startTime;
    const timeUntilStart = this.anim.motivator.start - curTime;
    if (timeUntilStart <= 0) {
      return 0.01;
    }
    return timeUntilStart;
  }

  private getOrigFieldValue() {
    const srcObj = this.getTarget();
    if (srcObj) {
      if (srcObj instanceof LayoutDrawable) {
        return srcObj.initParams[this.targetField];
      } else {
        if (this.origFieldValue === undefined) {
          this.origFieldValue = srcObj[this.targetField];
        }
        return this.origFieldValue;
      }
    }
  }

  getTarget() {
    return this.targetDrawable ? this.target.node.getDrawable(this.targetDrawable) : this.target.node.getLayoutData();
  }

  tick(): boolean {
    let val = 0;
    switch (this.anim.motivator.source) {
      case 'time':
        val = gTimeAccum - this.startTime;
        const lp = this.anim.motivator.loopPeriod;
        if (lp) {
          let frac = val / lp;
          frac -= Math.trunc(frac);
          val = frac * lp;
        }
        break;

      case 'screenX':
        this.target.node.layoutTreeIfNeeded();
        val = this.target.node.getScreenOffset().x;
        // TODO: loopPeriod for position?
        break;

      case 'screenY':
        this.target.node.layoutTreeIfNeeded();
        val = this.target.node.getScreenOffset().y;
        // TODO: loopPeriod for position?
        break;

      default:
        absurd(this.anim.motivator.source);
    }

    const uneasyParam = MathUtils.parameterize(this.anim.motivator.start, this.anim.motivator.end, val);
    const newParam = MathUtils.interpEaseClamped(this.anim.motivator.easingFunction, 0, 1, uneasyParam);
    if (newParam === this.param) {
      if (this.anim.motivator.source === 'time' && newParam >= 1 && !this.anim.motivator.loopPeriod) {
        this.target.node.removeAnimation(this);
      }
      return false;
    }

    if (this.isDimensionAnimation) {
      // changed dimensions, trigger a layout update
      this.target.node.setDirty();
    }

    this.param = newParam;
    return true;
  }

  protected getAnimatedValue(origFieldValue: string|number|undefined): string|number|undefined {
    if (origFieldValue === undefined) {
      return undefined;
    }
    const modifier = this.anim.modifier;
    if (typeof origFieldValue === 'number') {
      const start = getModifiedNumber(modifier.start, origFieldValue);
      const end = getModifiedNumber(modifier.end, origFieldValue);
      return MathUtils.interp(start, end, this.param);
    }

    const origColor = color(origFieldValue || 'black');
    const startColor = getModifiedColor('' + modifier.start, origColor);
    const endColor = getModifiedColor('' + modifier.end, origColor);
    return startColor.mix(endColor, this.param).rgb().string();
  }

  // return true if this is cache-busting
  updateDimensions(renderDims: Dimensions): boolean {
    if (!this.isDimensionAnimation) {
      return false;
    }
    renderDims[this.targetField] = this.getAnimatedValue(renderDims[this.targetField]);
    return true;
  }

  updateForRender(): boolean {
    if (this.isDimensionAnimation) {
      return false;
    }
    const origFieldValue = this.getOrigFieldValue();
    if (origFieldValue === undefined) {
      return false;
    }

    const target = this.getTarget();
    if (!target) {
      return false;
    }

    target[this.targetField] = this.getAnimatedValue(origFieldValue);
    return true;
  }

  isCacheFriendly(): boolean {
    return (CACHE_FRIENDLY_FIELDS[this.targetField] === 1);
  }

  animKey() {
    return this.anim.key;
  }
}

export class PositionParent implements TickMotivator {
  private relativePos: MathUtils.Vector | undefined;

  constructor(readonly layout: LayoutNodeData, readonly layoutParent: LayoutNode, readonly positionParent: LayoutNode) {
    addTickMotivator(this);
    this.positionParent.addVirtualChild(this.layout.node);
  }

  destructor() {
    removeTickMotivator(this);
    this.positionParent.removeVirtualChild(this.layout.node);
  }

  tick(_dt: number): boolean {
    if (this.positionParent.isUnmounted()) {
      this.relativePos = undefined;
      return false;
    }
    this.positionParent.layoutTreeIfNeeded();
    this.layoutParent.layoutTreeIfNeeded();
    const parentPos = this.positionParent.getScreenOffset(true);
    if (this.layout.localPos.max.width !== undefined) {
      parentPos.x += this.positionParent.getLayoutData().renderDims.width;
    }
    if (this.layout.localPos.max.height !== undefined) {
      parentPos.y += this.positionParent.getLayoutData().renderDims.height;
    }
    this.relativePos = MathUtils.vectorSub(parentPos, this.layoutParent.getScreenOffset());
    return false;
  }

  updateForRender() {
    if (this.relativePos) {
      this.layout.offsetX += this.relativePos.x;
      this.layout.offsetY += this.relativePos.y;
    }
  }
}
