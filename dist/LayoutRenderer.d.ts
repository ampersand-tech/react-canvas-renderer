/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import { LayoutNode } from './LayoutNode';
import { LayoutParent } from './LayoutTypes';
import { Stash } from 'amper-utils/dist/types';
import React = require('react');
export declare function injectIntoDevTools(isProductionMode: boolean): void;
export declare function flushRendering(): void;
export declare function renderToLayout(rootNode: LayoutNode | undefined, rootElement: React.ReactNode, parentNode?: LayoutParent, dataProps?: Stash): LayoutNode;
export declare function unmountLayoutNode(node: LayoutNode): void;
