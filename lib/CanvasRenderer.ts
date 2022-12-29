/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { PIXEL_RATIO } from './Constants';
import * as LayoutAnimator from './LayoutAnimator';
import { TouchAndScrollHandlers, TouchDispatcher, TouchHandlerTree } from './TouchDispatcher';

import { Point, ScreenSpacePoint, rectsMatch } from 'amper-utils/dist/mathUtils';
import { Stash } from 'amper-utils/dist/types';
import { q } from 'quark-styles';
import * as React from 'react';
import * as SafeRaf from 'safe-raf';

const BUFFERING_TIMEOUT = 300; // time to wait after last drawing before updating the buffering (which stalls)
const MATCH_FRAME_COUNT = 5;

const gRendererList: RenderCanvas[] = [];

let gRAFHandle: any | undefined;
let gAnimationTimer: number | undefined;
let gBufferingTimer: number | undefined;
let gPrevTime = 0;

interface Props {
  drawFunc: (ctx: CanvasRenderingContext2D, width: number, height: number) => boolean;
  classes?: string;
  onStoppedRendering?: () => void;
  onBuffering?: () => void;
  getTouchAndScrollHandlersAt?: (canvasSpacePoint: Point) => TouchAndScrollHandlers;
  recordMetric?: (metricName: string, metricDims?: Stash) => void;
}

export class RenderCanvas extends React.Component<Props, {}> implements TouchHandlerTree {
  private canvas: HTMLCanvasElement | undefined;
  private touchDispatcher: TouchDispatcher;
  private boundingRect: ClientRect;

  constructor(props, context) {
    super(props, context);
    this.touchDispatcher = new TouchDispatcher(this);
  }

  public getCanvas(): HTMLCanvasElement | undefined {
    return this.canvas;
  }

  public getScreenOffset(): Point {
    return {
      x: this.boundingRect.left,
      y: this.boundingRect.top,
    };
  }

  private setCanvas = (canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      gRendererList.push(this);
      this.canvas = canvas;
      kickRender();
    } else {
      const idx = gRendererList.indexOf(this);
      if (idx >= 0) {
        gRendererList.splice(idx, 1);
      }
      this.canvas = undefined;
    }
  }

  private updateCanvasRenderSize() {
    if (!this.canvas) {
      return;
    }

    const newWidth = this.canvas.clientWidth * PIXEL_RATIO;
    const newHeight = this.canvas.clientHeight * PIXEL_RATIO;
    if (this.canvas.width !== newWidth || this.canvas.height !== newHeight) {
      this.canvas.width = newWidth;
      this.canvas.height = newHeight;
      kickRender();
    }
  }

  private updateBoundingRect = (matchingFrameCount: number) => {
    if (!this.canvas) {
      return;
    }

    const r = this.canvas.getBoundingClientRect();
    if (rectsMatch(this.boundingRect, r)) {
      if (matchingFrameCount < MATCH_FRAME_COUNT) {
        SafeRaf.requestAnimationFrame(() => this.updateBoundingRect(matchingFrameCount + 1));
      } else {
        this.updateCanvasRenderSize();
      }
    } else {
      this.boundingRect = r;
      SafeRaf.requestAnimationFrame(() => this.updateBoundingRect(0));
    }
  }

  public updateCanvasSize() {
    if (!this.canvas) {
      return;
    }

    this.updateCanvasRenderSize();
    this.updateBoundingRect(0);

    return this.canvas;
  }

  public draw(): boolean {
    if (!this.canvas) {
      return false;
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      console.error('lost canvas context');
      return true;
    }

    return this.props.drawFunc(ctx, this.canvas.width, this.canvas.height);
  }

  public onStoppedRendering() {
    this.props.onStoppedRendering && this.props.onStoppedRendering();
  }

  public onBuffering() {
    this.props.onBuffering && this.props.onBuffering();
  }

  // TouchHandlerTree interface:
  public getTouchAndScrollHandlersAt(screenSpacePoint: ScreenSpacePoint): TouchAndScrollHandlers {
    if (this.props.getTouchAndScrollHandlersAt) {
      const canvasSpacePoint: Point = {
        x: (screenSpacePoint.x - this.boundingRect.left),
        y: (screenSpacePoint.y - this.boundingRect.top),
      };
      return this.props.getTouchAndScrollHandlersAt(canvasSpacePoint);
    }
    return {};
  }

  public recordMetric(metricName: string, metricDims?: Stash) {
    this.props.recordMetric && this.props.recordMetric(metricName, metricDims);
  }

  render() {
    return q('canvas', {
      ref: this.setCanvas,
      style: {touchAction: 'none'},
      classes: this.props.classes,
      onTouchOrMouseStart: this.touchDispatcher.touchStart,
      onTouchOrMouseMove: this.touchDispatcher.touchMove,
      onTouchOrMouseEnd: this.touchDispatcher.touchEnd,
      onWheel: this.touchDispatcher.onWheel,
    }) as JSX.Element;
  }
}

function safeCancelTimer(handle: number | undefined): undefined {
  if (handle !== undefined) {
    clearTimeout(handle);
  }
  return undefined;
}

function bufferTimeoutElapsed() {
  gBufferingTimer = safeCancelTimer(gBufferingTimer);
  for (const renderer of gRendererList) {
    renderer.onBuffering();
  }
}

function renderAll() {
  gAnimationTimer = safeCancelTimer(gAnimationTimer);
  gBufferingTimer = safeCancelTimer(gBufferingTimer);
  gRAFHandle = undefined;

  const renderStartTime = Date.now();
  let dt = 0;
  if (gPrevTime) {
    dt = renderStartTime - gPrevTime;
    gPrevTime = 0;
  }

  let isAnimating = LayoutAnimator.tickAll(dt);

  for (const renderer of gRendererList) {
    if (renderer.draw()) {
      isAnimating = true;
    }
  }

  if (isAnimating) {
    // render again next frame
    gPrevTime = renderStartTime; // make sure to include the time it took to draw in the next dt
    kickRender();
  } else {
    // stopped rendering
    for (const renderer of gRendererList) {
      renderer.onStoppedRendering();
    }

    const timeUntilNextAnimation = LayoutAnimator.getTimeUntilNextAnimation();
    if (timeUntilNextAnimation) {
      // auto-kick the render loop when an animation is coming
      gPrevTime = renderStartTime; // need to make sure we tick the animations for the intervening time
      gAnimationTimer = setTimeout(kickRender, timeUntilNextAnimation);
    } else {
      gBufferingTimer = setTimeout(bufferTimeoutElapsed, BUFFERING_TIMEOUT);
    }
  }
}

export function kickRender() {
  gAnimationTimer = safeCancelTimer(gAnimationTimer);
  gBufferingTimer = safeCancelTimer(gBufferingTimer);
  if (!gRAFHandle) {
    gPrevTime = gPrevTime || Date.now();
    gRAFHandle = SafeRaf.requestAnimationFrame(renderAll);
  }
}

export function flushAnimations() {
  if (!gAnimationTimer || !gPrevTime) {
    return;
  }
  const dt = Date.now() - gPrevTime;
  gPrevTime = 0;
  LayoutAnimator.tickAll(dt);

  kickRender();
}
