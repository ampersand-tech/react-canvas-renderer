/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
/** @jsxRuntime classic */
/** @jsx q */
import { RenderCanvas, kickRender } from './CanvasRenderer';
import { PIXEL_RATIO } from './Constants';
import { LayoutNode } from './LayoutNode';
import { renderToLayout } from './LayoutRenderer';
import { LayoutParent } from './LayoutTypes';
import { TouchAndScrollHandlers } from './TouchDispatcher';

import { Point } from 'amper-utils/dist/mathUtils';
import { q } from 'quark-styles'; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as React from 'react';


interface Props {
  classes?: string;
  scaleFactor?: number; // ratio
  onLayoutUpdate?: (layoutRoot: LayoutNode) => void;
}

export class CanvasLayoutRenderer extends React.Component<Props & { children: React.ReactNode }, {}> implements LayoutParent {
  private renderCanvas: RenderCanvas | undefined;
  private layoutRoot: LayoutNode | undefined;

  componentWillUnmount() {
    this.layoutRoot && this.layoutRoot.destructor();
    this.layoutRoot = undefined;
  }

  UNSAFE_componentWillMount() {
    this.renderLayout();
  }

  componentDidUpdate() {
    this.renderLayout();
  }

  private renderLayout() {
    const child = React.Children.only(this.props.children);
    if (child) {
      this.layoutRoot = renderToLayout(this.layoutRoot, child, this);
    }
  }

  public childIsDirty(_child: LayoutNode) {
    kickRender();
  }

  public layoutIfNeeded() {
    if (!this.layoutRoot) {
      return;
    }

    if (this.layoutRoot.layoutIfNeeded() && this.props.onLayoutUpdate) {
      this.props.onLayoutUpdate(this.layoutRoot);
    }
  }

  public getScreenOffset(): Point {
    return this.renderCanvas ? this.renderCanvas.getScreenOffset() : { x: 0, y: 0 };
  }

  public getCanvas(): HTMLCanvasElement | undefined {
    return this.renderCanvas ? this.renderCanvas.getCanvas() : undefined;
  }

  public updateCanvasSize = () => {
    if (!this.renderCanvas) {
      return;
    }

    const canvas = this.renderCanvas.updateCanvasSize();
    if (!canvas) {
      return;
    }

    if (this.layoutRoot) {
      this.layoutRoot.setExternalConstraints({
        min: {},
        max: {
          width: canvas.clientWidth,
          height: canvas.clientHeight,
        },
      });
    }
  }

  private draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!this.layoutRoot) {
      return false;
    }

    this.layoutIfNeeded();

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    {
      const factor = (this.props.scaleFactor || 1) * PIXEL_RATIO;
      ctx.scale(factor, factor);
      this.layoutRoot.draw(ctx);
    }
    ctx.restore();

    return false;
  }

  private setRenderer = (renderCanvas: RenderCanvas) => {
    if (!renderCanvas) {
      this.renderCanvas = undefined;
      return;
    }

    this.renderCanvas = renderCanvas;
    this.updateCanvasSize();
  }

  public getTouchAndScrollHandlersAt = (canvasSpacePoint: Point): TouchAndScrollHandlers => {
    const ret: TouchAndScrollHandlers = {};

    const leafTouchableNode = this.layoutRoot ? this.layoutRoot.getLeafTouchableNodeAt(canvasSpacePoint) : undefined;
    let nodeWalker = leafTouchableNode;
    while (nodeWalker) {
      ret.scrollHandler = ret.scrollHandler || nodeWalker.getScrollHandler();
      if (nodeWalker.dataProps.touchHandler && !ret.touchHandler) {
        ret.touchHandler = nodeWalker.dataProps.touchHandler;
      }
      if (nodeWalker.onClick && !ret.onClick) {
        ret.onClick = nodeWalker.onClick;
        ret.notifyActive = nodeWalker.notifyActive;
      }
      if (nodeWalker.onDoubleClick && !ret.onDoubleClick) {
        ret.onDoubleClick = nodeWalker.onDoubleClick;
      }
      if (nodeWalker.onLongPress && !ret.onLongPress) {
        ret.onLongPress = nodeWalker.onLongPress;
      }
      nodeWalker = nodeWalker.getParentNode();
    }

    return ret;
  }

  render() {
    return (
      <RenderCanvas
        ref={this.setRenderer}
        classes={this.props.classes}
        drawFunc={this.draw}
        getTouchAndScrollHandlersAt={this.getTouchAndScrollHandlersAt}
      />
    );
  }
}
