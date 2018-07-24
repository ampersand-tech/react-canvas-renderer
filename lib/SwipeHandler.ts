/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as CanvasRenderer from './CanvasRenderer';
import * as LayoutAnimator from './LayoutAnimator';

import * as MathUtils from 'amper-utils/dist2017/mathUtils';

export class SwipeHandler {
  private curScaleFactor = 0;
  private targetScaleFactor: null|number = null;

  constructor(
    readonly getScaleFactor: () => number,
    readonly setScaleFactor: (scaleFactor: number) => void,
    readonly minScaleFactor: number,
    readonly scaleFactorVelocity: number,
  ) {
    LayoutAnimator.addTickMotivator(this);
  }

  destructor() {
    LayoutAnimator.removeTickMotivator(this);
  }

  public setTargetScaleFactor(scaleFactor: number) {
    this.targetScaleFactor = scaleFactor;
    CanvasRenderer.kickRender();
  }

  public onSwipeStart() {
    this.curScaleFactor = this.getScaleFactor();
    this.targetScaleFactor = null;
    CanvasRenderer.kickRender();
  }

  public applyDragDiff(diff: number, _timeStamp: number) {
    this.curScaleFactor += diff / window.innerWidth;
    this.setScaleFactor(this.curScaleFactor);
    CanvasRenderer.kickRender();
  }

  public onSwipeEnd = (): void => {
    const scaleFactor = this.getScaleFactor();
    const param = MathUtils.parameterize(this.minScaleFactor, 1.0, scaleFactor);
    if (param < 0.5) {
      this.targetScaleFactor = this.minScaleFactor;
    } else {
      this.targetScaleFactor = 1.0;
    }
    CanvasRenderer.kickRender();
  }

  public tick = (dt: number) => {
    if (this.targetScaleFactor === null) {
      return false;
    }
    const scaleFactor = this.getScaleFactor();
    const diff = this.targetScaleFactor - scaleFactor;
    const frameDelta = MathUtils.sign(diff) * this.scaleFactorVelocity * dt;
    if (Math.abs(frameDelta) > Math.abs(diff)) {
      this.setScaleFactor(this.targetScaleFactor);
      this.targetScaleFactor = null;
    } else {
      this.setScaleFactor(scaleFactor + frameDelta);
    }
    return true;
  }
}
