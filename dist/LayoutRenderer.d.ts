/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
/// <reference types="react" />
import { Stash } from 'amper-utils/dist2017/types';
import { LayoutNode } from 'LayoutNode';
import { LayoutParent } from 'LayoutTypes';
export declare function injectIntoDevTools(isProductionMode: boolean): void;
export declare function flushRendering(): void;
export declare function renderToLayout(rootNode: LayoutNode | undefined, rootElement: JSX.Element, parentNode?: LayoutParent, dataProps?: Stash): LayoutNode;
export declare function unmountLayoutNode(node: LayoutNode): void;
