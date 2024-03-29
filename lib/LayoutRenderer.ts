/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { PathDesc } from './Constants';
import { FlexLayout } from './FlexLayout';
import { AnimationDef } from './LayoutAnimator';
import { ImageDrawable, LayoutDrawable, SVGDrawable } from './LayoutDrawable';
import { LayoutInput } from './LayoutInput';
import { LayoutNode } from './LayoutNode';
import { Direction, LayoutParent } from './LayoutTypes';
import { SimpleLayout } from './SimpleLayout';

import { forceArray } from 'amper-utils/dist/arrayUtils';
import { Stash } from 'amper-utils/dist/types';
import * as ReactReconciler from 'react-reconciler';
import { DefaultEventPriority } from 'react-reconciler/constants';
import React = require('react');

let DEBUG = false;

const RENDERER_VERSION = '1.0';

const UPDATE_SIGNAL = {};

function getTextContent(children: any): string | undefined {
  if (typeof children === 'string' || typeof children === 'number') {
    return children.toString();
  }
  return undefined;
}

function extractDataProps(props: Stash) {
  const dataProps: Stash = {};
  for (const key in props) {
    if (key.slice(0, 5) === 'data-') {
      const dataKey = key.slice(5);
      if (dataKey !== 'font' && dataKey !== 'anims' && dataKey !== 'cacheable') {
        dataProps[dataKey] = props[key];
      }
    }
  }
  return dataProps;
}

function insertBefore(parent: LayoutNode, child: LayoutNode, beforeNode?: LayoutNode) {
  if (DEBUG) { debugger; }
  child.removeFromParent();
  if (child.dataProps.parentTo instanceof LayoutNode) {
    child.dataProps.parentTo.addChild(child);
    child.setPositionParent(parent);
  } else {
    parent.addChild(child, beforeNode);
    child.setPositionParent(undefined);
  }
}

function appendChild(parent: LayoutNode, child: LayoutNode) {
  insertBefore(parent, child);
}

function removeChild(_parent: LayoutNode, child: LayoutNode) {
  if (DEBUG) { debugger; }
  child.unmount();
}

function clearContainer(node: LayoutNode) {
  node.clearChildren();
}

function getLayoutBehavior(type: string, className: string, text: string|undefined) {
  if (text) {
    return '';
  }
  if (type === 'span') {
    return 'SRow';
  }
  if (type !== 'div') {
    return '';
  }
  const classes = className.split(' ');
  if (classes.indexOf('flexRow') >= 0) {
    return 'FRow';
  }
  if (classes.indexOf('flexCol') >= 0) {
    return 'FCol';
  }
  return 'SCol';
}

function createLayoutBehavior(behavior: string) {
  switch (behavior) {
    case 'FRow':
      return new FlexLayout(Direction.Row);
    case 'FCol':
      return new FlexLayout(Direction.Column);
    case 'SRow':
      return new SimpleLayout(Direction.Row);
    case 'SCol':
      return new SimpleLayout(Direction.Column);
  }
}

function convertSvgChildren(incChildren?: React.ReactElement<Stash>[] | React.ReactElement<Stash>): PathDesc[] | undefined {
  if (!incChildren) {
    return undefined;
  }
  const children: React.ReactElement<Stash>[] = forceArray(incChildren);
  if (!children.length) {
    return undefined;
  }

  const paths: PathDesc[] = [];
  for (const child of children) {
    if (child.type === 'path') {
      paths.push({
        path: child.props.d,
        strokeWidth: child.props['stroke-width'],
        opacity: child.props.opacity ? Number(child.props.opacity) : undefined,
        fillRule: child.props['fill-rule'],
      });
    }
  }

  return paths.length ? paths : undefined;
}


const LayoutHostConfig: ReactReconciler.HostConfig<
  string, // Type
  Stash, // Props
  LayoutNode, // Container
  LayoutNode, // Instance
  LayoutNode, // TextInstance
  LayoutNode, // SuspenseInstance
  Stash, // HydratableInstance,
  LayoutNode, // PublicInstance,
  Stash, // HostContext,
  {}, // UpdatePayload,
  unknown, // ChildSet,
  number, // TimeoutHandle,
  number // NoTimeout,
> = {
  supportsMutation: true,
  supportsPersistence: false,
  isPrimaryRenderer: false,
  supportsHydration: false,

  getCurrentEventPriority() {
    return DefaultEventPriority;
  },

  getInstanceFromNode(node: LayoutNode | null | undefined) {
    return node?.reactFiber;
  },

  shouldSetTextContent(type: string, props: Stash): boolean {
    if (DEBUG) { debugger; }
    if (type === 'svg') {
      // don't create LayoutNodes for svg children
      return true;
    }
    return getTextContent(props.children) !== undefined;
  },

  createInstance(type: string, props: Stash): LayoutNode {
    if (DEBUG) { debugger; }
    const node = new LayoutNode();
    let drawable: LayoutDrawable | undefined;
    const style = props.style || {};

    if (type === 'img') {
      drawable = new ImageDrawable(node, props.src);
      node.setContent([ drawable ]);
    } else if (type === 'svg') {
      drawable = new SVGDrawable(
        node,
        props.name,
        style.stroke,
        style.fill,
        Number(props.width) || 0,
        Number(props.height) || 0,
        convertSvgChildren(props.children),
      );
      node.setContent([ drawable ]);
    } else if (type === 'input') {
      node.input = new LayoutInput();
      node.input.setProps(props['data-input']);
    }

    const text = getTextContent(props.children);
    node.setLayoutBehavior(createLayoutBehavior(getLayoutBehavior(type, props.className || '', text)));

    node.setStyle(style, (props.className || '').split(' '));
    node.dataProps = extractDataProps(props);
    node.onClick = props.onClick;
    node.onLongPress = props.onLongPress;
    node.setCacheable(Boolean(props['data-cacheable']));

    if (!drawable && text) {
      node.setTextContent(text);
    }

    const anims = props['data-anims'] || [];
    for (const animDef of anims) {
      node.addAnimation(animDef);
    }

    node.setUnmountAnimations(props['data-unmountAnims'] || []);

    return node;
  },

  createTextInstance(
    text: string,
    _rootNode: LayoutNode,
    _hostContext: Stash,
    _internalInstanceHandle: Stash,
  ): LayoutNode {
    if (DEBUG) { debugger; }
    const node = new LayoutNode();
    node.setTextContent(text);
    return node;
  },

  appendInitialChild(
    parent: LayoutNode,
    child: LayoutNode,
  ): void {
    insertBefore(parent, child);
  },

  finalizeInitialChildren(
    _node: LayoutNode,
    _type: string,
    _props: Stash,
  ): boolean {
    return false;
  },

  getRootHostContext() {
    return {};
  },

  getChildHostContext() {
    return {};
  },

  getPublicInstance(instance) {
    return instance;
  },

  prepareUpdate(
    _node: LayoutNode,
    _type: string,
    _oldProps: Stash,
    _newProps: Stash,
  ): null | {} {
    return UPDATE_SIGNAL;
  },

  prepareForCommit(): Stash|null {
    return null;
  },

  resetAfterCommit(): void {},

  commitMount(_node: LayoutNode, _type: string, _newProps: Stash): void {
    // Noop
    if (DEBUG) { debugger; }
  },

  commitUpdate(
    node: LayoutNode,
    _updatePayload: Object,
    type: string,
    oldProps: Stash,
    newProps: Stash,
  ): void {
    if (DEBUG) { debugger; }
    const newStyle = newProps.style || {};

    if (type === 'img') {
      const drawable = new ImageDrawable(node, newProps.src);
      node.setContent([ drawable ]);
    } else if (type === 'svg') {
      const drawable = new SVGDrawable(
        node,
        newProps.name,
        newStyle.stroke,
        newStyle.fill,
        Number(newProps.width) || 0,
        Number(newProps.height) || 0,
        convertSvgChildren(newProps.children),
      );
      node.setContent([ drawable ]);
    }

    const oldText = getTextContent(oldProps.children);
    const newText = getTextContent(newProps.children);
    if ((type === 'div' || type === 'span') && (oldText !== newText)) {
      if (newText) {
        node.setTextContent(newText);
      } else {
        node.setContent([]);
      }
    }

    const oldBehavior = getLayoutBehavior(type, oldProps.className || '', oldText);
    const newBehavior = getLayoutBehavior(type, newProps.className || '', newText);
    if (oldBehavior !== newBehavior) {
      node.setLayoutBehavior(createLayoutBehavior(newBehavior));
    }

    const oldAnims = oldProps['data-anims'] || [];
    const newAnims = newProps['data-anims'] || [];
    updateAnimations(node, oldAnims, newAnims);

    node.setUnmountAnimations(newProps['data-unmountAnims'] || []);

    node.setStyle(newStyle, (newProps.className || '').split(' '));
    node.dataProps = extractDataProps(newProps);
    node.onClick = newProps.onClick;
    node.onLongPress = newProps.onLongPress;
    node.setCacheable(Boolean(newProps['data-cacheable']));

    if (node.input) {
      node.input.setProps(newProps['data-input']);
    }
  },

  commitTextUpdate(
    node: LayoutNode,
    _oldText: string,
    newText: string,
  ): void {
    if (DEBUG) { debugger; }
    node.setTextContent(newText);
  },

  appendChild,
  appendChildToContainer: appendChild,
  insertBefore,
  insertInContainerBefore: insertBefore,
  removeChild,
  removeChildFromContainer: removeChild,
  clearContainer,

  resetTextContent(node: LayoutNode): void {
    if (DEBUG) { debugger; }
    node.setContent([]);
  },

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: 0,

  preparePortalMount(): void {},

  beforeActiveInstanceBlur(): void {},
  afterActiveInstanceBlur(): void {},

  prepareScopeUpdate(_scopeInstance: any, _instance: any): void {},
  getInstanceFromScope(_scopeInstance: any): null | LayoutNode {
    return null;
  },

  detachDeletedInstance(_node: LayoutNode): void {},

};

const LayoutRenderer = ReactReconciler(LayoutHostConfig);

function updateAnimations(node: LayoutNode, oldAnims: AnimationDef[], newAnims: AnimationDef[]) {
  // Cancel all animations with keys that are in the set oldProps - newProps
  for (const oldAnim of oldAnims) {
    if (!oldAnim.key) {
      continue;
    }

    let removeOldAnimation = true;
    for (const newAnim of newAnims) {
      if (newAnim.key === oldAnim.key) {
        removeOldAnimation = false;
      }
    }

    if (removeOldAnimation) {
      node.removeAnimationWithKey(oldAnim.key);
    }
  }

  // Play all animations with keys that are in the set newProps - oldProps
  for (const newAnim of newAnims) {
    if (!newAnim.key) {
      continue;
    }

    let addNewAnimation = true;
    for (const oldAnim of oldAnims) {
      if (oldAnim.key === newAnim.key) {
        addNewAnimation = false;
      }
    }

    if (addNewAnimation) {
      node.addAnimation(newAnim);
    }
  }
}

function findFiberForLayoutNode(node: LayoutNode) {
  return node.getRootFiber();
}

export function injectIntoDevTools(isProductionMode: boolean) {
  LayoutRenderer.injectIntoDevTools({
    findFiberByHostInstance: findFiberForLayoutNode,
    bundleType: isProductionMode ? 0 : 1,
    version: RENDERER_VERSION,
    rendererPackageName: 'LayoutRenderer',
  });
}

export function renderToLayout(
  rootNode: LayoutNode | undefined,
  rootElement: React.ReactNode,
  parentNode?: LayoutParent,
  dataProps?: Stash,
): LayoutNode {
  if (!rootNode) {
    rootNode = new LayoutNode(new SimpleLayout(Direction.Column));
    rootNode.reactFiber = LayoutRenderer.createContainer(rootNode, 0, null, false, null, "", () => {}, null);
  }
  LayoutRenderer.updateContainer(rootElement, rootNode.reactFiber, null);
  if (parentNode) {
    rootNode.setParent(parentNode);
  }
  if (dataProps) {
    rootNode.dataProps = dataProps;
  }
  return rootNode;
}

export function unmountLayoutNode(node: LayoutNode) {
  LayoutRenderer.updateContainer(null, node.reactFiber, null);
}

try {
  const origGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function(elt: Element, pseudoElt?: string): CSSStyleDeclaration {
    if (elt instanceof LayoutNode) {
      return elt.getComputedStyle() as CSSStyleDeclaration;
    }
    return origGetComputedStyle(elt, pseudoElt);
  };
} catch (_ex) {
}
