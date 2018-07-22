/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import {
  AI_LOOKUP,
  Alignment,
  Dimensions,
  Direction,
  itemAlignment,
  LayoutConstraints,
  DirectionalLayoutBehavior,
  LayoutNodeData,
} from './LayoutTypes';

import { marginSizeForAxis } from './LayoutNode';

import { absurd } from 'overlib/shared/util';

export class SimpleLayout extends DirectionalLayoutBehavior {
  protected alignItems: Alignment = Alignment.Start;

  toString() {
    return 'S' + (this.direction === Direction.Row ? 'Row' : 'Col');
  }

  applyLocalPos(child: LayoutNodeData, available: number, crossAxisSize: number) {
    if (child.localPos.min[this.mainAxis] !== undefined) {
      child.computedOffset[this.mainAxisPos] = child.localPos.min[this.mainAxis]!;
    } else if (child.localPos.max[this.mainAxis] !== undefined) {
      child.computedOffset[this.mainAxisPos] = available - child.localPos.max[this.mainAxis]! - child.renderDims[this.mainAxis];
    }

    if (child.localPos.min[this.crossAxis] !== undefined) {
      child.computedOffset[this.crossAxisPos] = child.localPos.min[this.crossAxis]!;
    } else if (child.localPos.max[this.crossAxis] !== undefined) {
      child.computedOffset[this.crossAxisPos] = crossAxisSize - child.localPos.max[this.crossAxis]! - child.renderDims[this.crossAxis];
    }
  }

  setStyle(style: Stash): boolean {
    let alignItems = Alignment.Start;
    if (style.alignItems && AI_LOOKUP.hasOwnProperty(style.alignItems)) {
      alignItems = AI_LOOKUP[style.alignItems];
    }

    if (alignItems !== this.alignItems) {
      this.alignItems = alignItems;
      return true;
    }
    return false;
  }

  updateIntrinsicDimsForChildren(layout: LayoutNodeData, dims: Dimensions) {
    let cumSize = 0;
    for (const child of layout.children) {
      const childDims = child.node.getIntrinsicDims();
      if (layout.localDims[this.mainAxis] === undefined) {
        const mainAxisSize = Math.max(0, childDims[this.mainAxis] + marginSizeForAxis(child.margin, this.mainAxis, 'total'));
        if (child.localPos.min[this.mainAxis] !== undefined) {
          dims[this.mainAxis] = Math.max(dims[this.mainAxis], child.localPos.min[this.mainAxis]! + mainAxisSize);
        } else if (child.localPos.max[this.mainAxis] !== undefined) {
          dims[this.mainAxis] = Math.max(dims[this.mainAxis], mainAxisSize);
        } else {
          cumSize += mainAxisSize;
        }
      }
      const alignment = itemAlignment(child, this.alignItems, this.crossAxis);
      const crossAxisMargin = marginSizeForAxis(child.margin, this.crossAxis, alignment === Alignment.Center ? 'max2' : 'total');
      const crossAxisSize = childDims[this.crossAxis] + crossAxisMargin + (child.localPos.min[this.crossAxis] || 0);
      dims[this.crossAxis] = Math.max(dims[this.crossAxis], crossAxisSize);
    }
    dims[this.mainAxis] = Math.max(dims[this.mainAxis], cumSize);
  }

  layoutChildren(layout: LayoutNodeData, childConstraints: LayoutConstraints, force: boolean) {
    const available = childConstraints.max[this.mainAxis] === undefined ? Infinity : childConstraints.max[this.mainAxis] as number;
    const crossAxisSize = childConstraints.max[this.crossAxis] === undefined ? Infinity : childConstraints.max[this.crossAxis] as number;
    let offset = 0; // NOTE: this.padding is added to child offset later

    for (const child of layout.children) {
      let isPositioned = false;

      if (child.hasPositionParent) {
        child.node.layoutIfNeeded(force);
        child.computedOffset.x = 0;
        child.computedOffset.y = 0;
        this.applyLocalPos(child, 0, 0);
        continue;
      }

      // layout child
      let childMainOffset = offset;
      let childCrossOffset = 0;
      let endMargin = 0;
      if (child.localPos.min[this.mainAxis] !== undefined) {
        childMainOffset = child.localPos.min[this.mainAxis]!;
        isPositioned = true;
      } else if (child.localPos.max[this.mainAxis] !== undefined) {
        childMainOffset = 0;
        isPositioned = true;
      } else {
        childMainOffset += marginSizeForAxis(child.margin, this.mainAxis, 'start');
        endMargin = marginSizeForAxis(child.margin, this.mainAxis, 'end');
      }

      if (child.localPos.min[this.crossAxis] !== undefined) {
        childCrossOffset = child.localPos.min[this.crossAxis]!;
      }

      const crossAxisMargin = marginSizeForAxis(child.margin, this.crossAxis, 'total');

      childConstraints.max[this.mainAxis] = Math.max(0, available - childMainOffset - endMargin);
      childConstraints.max[this.crossAxis] = Math.max(0, crossAxisSize - childCrossOffset - crossAxisMargin);

      const alignment = itemAlignment(child, this.alignItems, this.crossAxis);
      if (alignment === Alignment.Stretch) {
        childConstraints.min[this.crossAxis] = crossAxisSize - crossAxisMargin;
      }
      child.node.setExternalConstraints(childConstraints);
      child.node.layoutIfNeeded(force);

      // position child
      child.computedOffset[this.mainAxisPos] = childMainOffset;
      childMainOffset += child.renderDims[this.mainAxis];
      childMainOffset += endMargin;

      switch (alignment) {
        case Alignment.Center:
          child.computedOffset[this.crossAxisPos] = (crossAxisSize - child.renderDims[this.crossAxis]) * 0.5;
          break;

        case Alignment.Auto:
        case Alignment.Start:
        case Alignment.Stretch:
          child.computedOffset[this.crossAxisPos] = marginSizeForAxis(child.margin, this.crossAxis, 'start');
          break;

        case Alignment.End:
          child.computedOffset[this.crossAxisPos] =
            crossAxisSize - child.renderDims[this.crossAxis] - marginSizeForAxis(child.margin, this.crossAxis, 'end');
          break;

        default:
          absurd(alignment);
      }

      this.applyLocalPos(child, available, crossAxisSize);

      if (!isPositioned) {
        offset = Math.max(offset, childMainOffset); // deal with negative margins
      }
    }
  }
}
