/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import 'quark-styles';

import { FlexLayout } from '../lib/FlexLayout';
import { ImageDrawable, LayoutDrawable, SVGDrawable } from '../lib/LayoutDrawable';
import { LayoutNode } from '../lib/LayoutNode';
import { Direction } from '../lib/LayoutTypes';
import { SimpleLayout } from '../lib/SimpleLayout';
import { ParseObject, parse } from './xmlParser';

import { classesToSimpleStyle } from 'quark-styles';

let gOnTapCallback: undefined | ((str: string) => void);


function parseTreeToLayout(obj: ParseObject): LayoutNode {
  const attr = obj._attr || {};
  const style = classesToSimpleStyle(attr.classes || '').style; // ignore errors for now

  let node: LayoutNode;
  let drawable: LayoutDrawable | undefined;

  switch (obj['#name']) {
    case 'SRow':
      node = new LayoutNode(new SimpleLayout(Direction.Row));
      break;

    case 'SCol':
      node = new LayoutNode(new SimpleLayout(Direction.Column));
      break;

    case 'FRow':
      node = new LayoutNode(new FlexLayout(Direction.Row));
      break;

    case 'FCol':
      node = new LayoutNode(new FlexLayout(Direction.Column));
      break;

    case 'Text':
    case 'Node':
      node = new LayoutNode();
      if (obj._) {
        node.setTextContent(obj._);
      } else {
        node.setContent([]);
      }
      break;

    case 'Icon':
      node = new LayoutNode();
      drawable = new SVGDrawable(node, attr.svgName, style.stroke, style.fill, 0, 0, undefined);
      node.setContent([ drawable ]);
      break;

    case 'Image':
      node = new LayoutNode();
      drawable = new ImageDrawable(node, attr.url);
      node.setContent([ drawable ]);
      break;

    default:
      throw new Error('Unhandled node type: ' + obj['#name']);
  }

  if (obj._children && obj._children.length) {
    for (const child of obj._children) {
      node.addChild(parseTreeToLayout(child));
    }
  }

  if (attr.logOnTap) {
    node.onClick = () => {
      gOnTapCallback && gOnTapCallback(attr.logOnTap);
      return true;
    };
  }
  node.setStyle(style, []);

  if (attr.anim === 'slide') {
    node.addAnimation({
      motivator: {
        source: 'time',
        easingFunction: 'easeInOutQuad',
        start: 0,
        end: 1000,
      },
      modifier: {
        field: 'height',
        start: '0%',
        end: '100%',
      },
    });
    node.addAnimation({
      motivator: {
        source: 'time',
        easingFunction: 'easeOutElastic',
        start: 1000,
        end: 4000,
      },
      modifier: {
        field: 'offsetX',
        start: '500',
        end: '0',
      },
    });
  } else if (attr.anim === 'drawScale' && drawable) {
    node.addAnimation({
      motivator: {
        source: 'screenY',
        easingFunction: 'easeInOutQuad',
        start: 300,
        end: 500,
      },
      modifier: {
        field: 'imageScale',
        start: 1,
        end: 3,
      },
    });
  } else if (attr.anim) {
    node.addAnimation({
      motivator: {
        source: 'time',
        easingFunction: 'easeInOutQuad',
        start: 0,
        end: 5000,
      },
      modifier: {
        field: attr.anim,
        start: '0%',
        end: '100%',
      },
    });
  }

  return node;
}

export function parseLayout(text: string) {
  const res = parse(text);
  if (typeof res === 'string') {
    throw new Error(res);
  }

  return parseTreeToLayout(res);
}

export function setTapCallback(tapCB: (str: string) => void) {
  gOnTapCallback = tapCB;
}
