/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import {
  AI_LOOKUP,
  Alignment,
  Direction,
  DirectionalLayoutBehavior,
  itemAlignment,
  LayoutConstraints,
  LayoutNodeData,
} from 'LayoutTypes';

import { Dimensions } from 'amper-utils/dist2017/mathUtils';
import * as ObjUtils from 'amper-utils/dist2017/objUtils';
import { absurd, Stash } from 'amper-utils/dist2017/types';
import { applyConstraints, marginSizeForAxis } from 'LayoutNode';

enum Justification {
  Center = 1,
  FlexStart,
  FlexEnd,
  SpaceAround,
  SpaceBetween,
}

interface FlexItem {
  srcDims: Dimensions;
  dstDims: Dimensions;
  mainAxisMargin: number;
  crossAxisMargin: number;
  flexGrow: number;
  flexShrink: number;
  flexBasis: number;
}

const JC_LOOKUP = {
  'center': Justification.Center,
  'flex-start': Justification.FlexStart,
  'flex-end': Justification.FlexEnd,
  'space-around': Justification.SpaceAround,
  'space-between': Justification.SpaceBetween,
};


export class FlexLayout extends DirectionalLayoutBehavior {
  private justifyContent: Justification = Justification.FlexStart;
  private alignItems: Alignment = Alignment.Stretch;

  private flexItems: FlexItem[] = [];

  toString() {
    return 'F' + (this.direction === Direction.Row ? 'Row' : 'Col');
  }

  setStyle(style: Stash): boolean {
    let alignItems = Alignment.Stretch;
    if (style.alignItems && AI_LOOKUP.hasOwnProperty(style.alignItems)) {
      alignItems = AI_LOOKUP[style.alignItems];
    }

    let justifyContent = Justification.FlexStart;
    if (style.justifyContent && JC_LOOKUP.hasOwnProperty(style.justifyContent)) {
      justifyContent = JC_LOOKUP[style.justifyContent];
    }

    if (alignItems !== this.alignItems || justifyContent !== this.justifyContent) {
      this.alignItems = alignItems;
      this.justifyContent = justifyContent;
      return true;
    }
    return false;
  }

  updateIntrinsicDimsForChildren(layout: LayoutNodeData, dims: Dimensions) {
    if (layout.localDims.width === undefined) {
      dims.width = Infinity;
    }

    if (layout.localDims.height === undefined) {
      dims.height = Infinity;
    }

    let mainAxisSize = 0;
    let crossAxisSize = 0;
    let totalFlexGrow = 0;

    // convert children to FlexItems
    this.flexItems = [];
    for (const child of layout.children) {
      const alignment = itemAlignment(child, this.alignItems, this.crossAxis);
      const childDims = child.node.getIntrinsicDims();
      const flexItem: FlexItem = {
        srcDims: childDims,
        dstDims: childDims,
        mainAxisMargin: marginSizeForAxis(child.margin, this.mainAxis, 'total'),
        crossAxisMargin: marginSizeForAxis(child.margin, this.crossAxis, alignment === Alignment.Center ? 'max2' : 'total'),
        flexGrow: (child.flexProps && child.flexProps.flexGrow) || 0,
        flexShrink: (child.flexProps && child.flexProps.flexShrink) || 0,
        flexBasis: (child.flexProps && child.flexProps.flexBasis !== undefined) ? child.flexProps.flexBasis : childDims[this.mainAxis],
      };
      if (flexItem.flexBasis === Infinity) {
        flexItem.flexBasis = 0;
      }
      this.flexItems.push(flexItem);

      mainAxisSize += Math.max(0, flexItem.srcDims[this.mainAxis] + flexItem.mainAxisMargin);
      crossAxisSize = Math.max(crossAxisSize, childDims[this.crossAxis] + flexItem.crossAxisMargin);
      totalFlexGrow += flexItem.flexGrow;
    }

    // shrink crossAxis dimension to fit
    if (layout.localDims[this.crossAxis] === undefined) {
      dims[this.crossAxis] = Math.min(crossAxisSize, dims[this.crossAxis]);
    }

    // shrink mainAxis dimension to fit if operating in simple mode (no growing, justify to start of flex container)
    if (this.justifyContent === Justification.FlexStart && !totalFlexGrow && layout.localDims[this.mainAxis] === undefined) {
      dims[this.mainAxis] = Math.min(mainAxisSize, dims[this.mainAxis]);
    }
  }

  layoutChildren(layout: LayoutNodeData, constraints: LayoutConstraints, force: boolean) {
    const mainAxisAvailable = constraints.max[this.mainAxis] === undefined ? Infinity : constraints.max[this.mainAxis] as number;
    const crossAxisAvailable = constraints.max[this.crossAxis] === undefined ? Infinity : constraints.max[this.crossAxis] as number;

    let mainAxisSize = 0;
    let totalFlexGrow = 0;
    let totalFlexShrink = 0;
    for (const item of this.flexItems) {
      mainAxisSize += Math.max(0, item.flexBasis + item.mainAxisMargin);
      totalFlexGrow += item.flexGrow;
      totalFlexShrink += item.flexShrink;
    }

    let delta = mainAxisAvailable - mainAxisSize;
    let preOffset = 0, firstOffset = 0, eachOffset = 0, lastOffset = 0;

    // are we too big and can any elements shrink?
    if (delta < 0) {
      if (totalFlexShrink) {
        for (const item of this.flexItems) {
          item.dstDims[this.mainAxis] = item.dstDims[this.mainAxis] = item.flexBasis + delta * item.flexShrink / totalFlexShrink;
        }
      } else if (this.justifyContent === Justification.Center) {
        preOffset = firstOffset = eachOffset = lastOffset = delta / (this.flexItems.length + 1);
      }
    } else if (delta > 0) {
      if (totalFlexGrow) {
        // do we have room to flex grow and want to?
        for (const item of this.flexItems) {
          item.dstDims[this.mainAxis] = item.dstDims[this.mainAxis] = item.flexBasis + delta * item.flexGrow / totalFlexGrow;
        }
      } else {
        // nope, arrange with empty space
        switch (this.justifyContent) {
          case Justification.Center:
            preOffset = 0.5 * delta;
            break;
          case Justification.FlexEnd:
            preOffset = delta;
            break;
          case Justification.FlexStart:
            break;
          case Justification.SpaceAround:
            preOffset = firstOffset = eachOffset = lastOffset = delta / (this.flexItems.length + 1);
            break;
          case Justification.SpaceBetween:
            if (this.flexItems.length > 1) {
              firstOffset = eachOffset = lastOffset = delta / (this.flexItems.length - 1);
            }
            break; // fallback to FlexStart for first one
        }
      }
    }

    let totalMainAxisOffset = 0;
    for (let i = 0; i < this.flexItems.length; ++i) {
      const child = layout.children[i];
      const item = this.flexItems[i];
      const alignment = itemAlignment(child, this.alignItems, this.crossAxis);
      let childOffset = totalMainAxisOffset;
      switch (i) {
        case 0:
          childOffset += preOffset;
          break;
        case this.flexItems.length - 2:
          childOffset += lastOffset;
          break;
        case 1:
          childOffset += firstOffset;
          break;
        default:
          childOffset += eachOffset;
          break;
      }

      // layout child
      const childConstraints = ObjUtils.clone(constraints);
      const itemDims = ObjUtils.clone(item.dstDims);
      applyConstraints(constraints, itemDims);
      childConstraints.min[this.mainAxis] = childConstraints.max[this.mainAxis] = itemDims[this.mainAxis];
      childConstraints.max[this.crossAxis] = crossAxisAvailable - marginSizeForAxis(child.margin, this.crossAxis, 'total');
      if (alignment === Alignment.Stretch) {
        childConstraints.min[this.crossAxis] = childConstraints.max[this.crossAxis];
      }
      child.node.setExternalConstraints(childConstraints);
      child.node.layoutIfNeeded(force);

      // position child
      childOffset += marginSizeForAxis(child.margin, this.mainAxis, 'start');
      child.computedOffset[this.mainAxisPos] = childOffset;
      childOffset += child.renderDims[this.mainAxis];
      childOffset += marginSizeForAxis(child.margin, this.mainAxis, 'end');

      totalMainAxisOffset = Math.max(totalMainAxisOffset, childOffset); // deal with negative margins

      switch (alignment) {
        case Alignment.Auto:
        case Alignment.Start:
        case Alignment.Stretch:
          child.computedOffset[this.crossAxisPos] = marginSizeForAxis(child.margin, this.crossAxis, 'start');
          break;
        case Alignment.End:
          child.computedOffset[this.crossAxisPos] =
            crossAxisAvailable - child.renderDims[this.crossAxis] - marginSizeForAxis(child.margin, this.crossAxis, 'end');
          break;
        case Alignment.Center:
          child.computedOffset[this.crossAxisPos] = (crossAxisAvailable - child.renderDims[this.crossAxis]) * 0.5;
          break;

        default:
          absurd(alignment);
      }
    }
  }
}
