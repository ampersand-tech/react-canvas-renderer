/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
import { PathDesc } from './Constants';
import { FontManager, FontTable } from './Font';
import { LayoutNode } from './LayoutNode';
import { ImageCoverType, Margins, BorderRadius, Shadow } from './LayoutTypes';
import { Dimensions } from 'amper-utils/dist/mathUtils';
import { Stash } from 'amper-utils/dist/types';
interface PendingLoads<T> {
    data: T | undefined;
    nodes: LayoutNode[];
}
declare type CachedImage = PendingLoads<HTMLImageElement>;
export declare function setFontTable(fontTable: FontTable, cb?: (fontManager: FontManager) => void): FontManager;
export declare function getFontManager(node?: LayoutNode): FontManager;
export declare function getImage(url: string, node?: LayoutNode): CachedImage;
export declare abstract class LayoutDrawable {
    protected node: LayoutNode;
    readonly initParams: Stash;
    constructor(node: LayoutNode, initParams: Stash);
    abstract draw(ctx: CanvasRenderingContext2D, dims: Dimensions, padding: Margins): boolean;
    abstract updateIntrinsicDims(dims: Dimensions, padding: Margins): any;
    setStyle(_style: Stash): boolean;
}
export declare class BGColorDrawable extends LayoutDrawable {
    color: string;
    borderRadius: BorderRadius | undefined;
    boxShadow: Shadow | undefined;
    constructor(node: LayoutNode, color: string, borderRadius: BorderRadius | undefined, boxShadow: Shadow | undefined);
    draw(ctx: CanvasRenderingContext2D, dims: Dimensions, padding: Margins): boolean;
    updateIntrinsicDims(_dims: Dimensions): void;
}
export declare class BorderDrawable extends LayoutDrawable {
    borderStyle: string;
    color: string;
    borderWidth: number;
    br: BorderRadius | undefined;
    constructor(node: LayoutNode, borderStyle: string, color: string, borderWidth: number, borderRadius: BorderRadius | undefined);
    draw(ctx: CanvasRenderingContext2D, dims: Dimensions, padding: Margins): boolean;
    updateIntrinsicDims(dims: Dimensions, padding: Margins): void;
}
export declare class TextDrawable extends LayoutDrawable {
    text: string;
    fontManager: FontManager;
    textWidth: number;
    constructor(node: LayoutNode, text: string);
    draw(ctx: CanvasRenderingContext2D, dims: Dimensions): boolean;
    updateIntrinsicDims(dims: Dimensions): void;
}
export declare class SVGDrawable extends LayoutDrawable {
    stroke: string | undefined;
    fill: string | undefined;
    width: number;
    height: number;
    paths: PathDesc[] | undefined;
    constructor(node: LayoutNode, svgName: string | undefined, stroke: string | undefined, fill: string | undefined, width: number, height: number, paths: PathDesc[] | undefined);
    draw(ctx: CanvasRenderingContext2D, dims: Dimensions): boolean;
    setStyle(style: Stash): boolean;
    updateIntrinsicDims(_dims: Dimensions): void;
}
export declare class ImageDrawable extends LayoutDrawable {
    imageUrl: string | undefined;
    cachedImage: CachedImage | undefined;
    isBackground: boolean;
    coverType: ImageCoverType;
    drawScale: number;
    borderRadius: BorderRadius | undefined;
    boxShadow: Shadow | undefined;
    constructor(node: LayoutNode, url: string | undefined, isBackground?: boolean, backgroundSize?: string, borderRadius?: BorderRadius, boxShadow?: Shadow);
    draw(ctx: CanvasRenderingContext2D, dims: Dimensions, padding: Margins): boolean;
    updateIntrinsicDims(dims: Dimensions): void;
}
export {};
