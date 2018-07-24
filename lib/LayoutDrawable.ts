/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { PathDesc } from './Constants';
import { FontManager, FontTable } from './Font';
import { fontObj2LegitString } from './FontUtils';
import { LayoutNode, parseShadow } from './LayoutNode';
import { ImageCoverType, Margins, BorderRadius, Shadow } from './LayoutTypes';

import * as MathUtils from 'amper-utils/dist2017/mathUtils';
import { Dimensions, Point } from 'amper-utils/dist2017/mathUtils';
import * as ObjUtils from 'amper-utils/dist2017/objUtils';
import { absurd, Stash, StashOf } from 'amper-utils/dist2017/types';

interface PendingLoads<T> {
  data: T | undefined;
  nodes: LayoutNode[];
}

const gFontCache: PendingLoads<FontManager> = {
  data: undefined,
  nodes: [],
};

type CachedImage = PendingLoads<HTMLImageElement>;
const gImageCache: StashOf<CachedImage> = {};

let gFontTable: FontTable = {
  names: ['"PT Serif", Times, "Times New Roman", serif', '"Montserrat", sans-serif'],
  weights: [100, 400, 800],
  styles: ['normal', 'italic'],
  fontExpectations: {},
};

function initFontManager(cb?: (fontManager: FontManager) => void) {
  gFontCache.data = new FontManager(gFontTable, (fontManager) => {
    setNodesDirty(gFontCache.nodes);
    cb && cb(fontManager);
  });
}

export function setFontTable(fontTable: FontTable, cb?: (fontManager: FontManager) => void): FontManager {
  if (fontTable === gFontTable) {
    cb && cb(gFontCache.data!);
    return gFontCache.data!;
  }

  // clear font manager but keep nodes list intact
  gFontCache.data = undefined;

  gFontTable = fontTable;
  initFontManager(cb);
  return gFontCache.data!;
}

function setNodesDirty(nodes: LayoutNode[]) {
  for (const n of nodes) {
    n.setDirty();
  }
  nodes.length = 0;
}

export function getFontManager(node?: LayoutNode): FontManager {
  if (!gFontCache.data) {
    initFontManager();
  }
  if (node && !gFontCache.data!.getFontsValid()) {
    gFontCache.nodes.push(node);
  }
  return gFontCache.data!;
}

export function getImage(url: string, node?: LayoutNode): CachedImage {
  if (!gImageCache[url]) {
    gImageCache[url] = {
      data: undefined,
      nodes: [],
    };
    let image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = () => {
      gImageCache[url].data = image;
      setNodesDirty(gImageCache[url].nodes);
    };
    image.onerror = (_ev: ErrorEvent) => {
      console.warn('Image Load Error on url: ' + url);
    };
    image.src = url;
  }
  if (!gImageCache[url].data && node) {
    gImageCache[url].nodes.push(node);
  }
  return gImageCache[url];
}

type RECT_DRAW_TYPE = 'stroke' | 'fill' | 'clip';

export abstract class LayoutDrawable {
  protected node: LayoutNode;
  public readonly initParams: Stash;

  constructor(node: LayoutNode, initParams: Stash) {
    this.node = node;
    this.initParams = ObjUtils.clone(initParams);
  }

  abstract draw(ctx: CanvasRenderingContext2D, dims: Dimensions, padding: Margins): boolean; // return true if cacheable
  abstract updateIntrinsicDims(dims: Dimensions, padding: Margins);
  setStyle(_style: Stash) {
    return false;
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  borderRadius: BorderRadius,
  drawType: RECT_DRAW_TYPE,
  left: number,
  top: number,
  right: number,
  bottom: number,
) {
  const maxBR = Math.min(0.5 * Math.abs(right - left), 0.5 * Math.abs(bottom - top));
  const br: BorderRadius = {
    tl: Math.min(maxBR, borderRadius.tl),
    tr: Math.min(maxBR, borderRadius.tr),
    bl: Math.min(maxBR, borderRadius.bl),
    br: Math.min(maxBR, borderRadius.br),
  };
  ctx.beginPath();
  ctx.moveTo(left + br.tl, top);
  ctx.lineTo(right - br.tr, top);
  ctx.arcTo(right, top, right, top + br.tr, br.tr);
  ctx.lineTo(right, bottom - br.br);
  ctx.arcTo(right, bottom, right - br.br, bottom, br.br);
  ctx.lineTo(left + br.bl, bottom);
  ctx.arcTo(left, bottom, left, bottom - br.bl, br.bl);
  ctx.lineTo(left, top + br.tl);
  ctx.arcTo(left, top, left + br.tl, top, br.tl);
  ctx.closePath();
  switch (drawType) {
    case 'stroke':
      ctx.stroke();
      break;
    case 'fill':
      ctx.fill();
      break;
    case 'clip':
      ctx.clip();
      break;
    default:
      absurd(drawType);
      break;
  }
}

function styleFromString(
  ctx: CanvasRenderingContext2D,
  color: string,
  stroke: boolean,
  left: number,
  top: number,
  right: number,
  bottom: number,
) {
  if (color.slice(0, 6) === 'linear') {
    const gradStr = color.slice(16 /* linear-gradient( */, -1 /* trailing ) */);
    const gradInfo = gradStr.split(/,(?! [^(]*\))/); // split on non-parentheses-surrounded commas
    const gradType = gradInfo[0].trim();
    let gradient;
    if (gradType === 'to right') {
      gradient = ctx.createLinearGradient(left, top, right, top);
    } else if (gradType === 'to bottom') {
      gradient = ctx.createLinearGradient(left, top, left, bottom);
    } else if (gradType.slice(-3) === 'deg') {
      const deg = parseFloat(gradType.slice(0, -3));
      const ang = MathUtils.deg2Rad(deg);

      const width = Math.abs(right - left);
      const height = Math.abs(top - bottom);
      const lineLength = Math.abs(width * Math.sin(ang)) + Math.abs(height * Math.cos(ang));
      const cx = left + width * 0.5;
      const cy = top + height * 0.5;
      const dx = Math.cos(ang - Math.PI * 0.5) * lineLength * 0.5;
      const dy = Math.sin(ang - Math.PI * 0.5) * lineLength * 0.5;
      gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    } else {
      throw new Error('Unknown gradient type:' + gradType);
    }
    for (let i = 1; i < gradInfo.length; ++i) {
      const colorStopRE = /(.*)\s+([\d.]+)(%|px)/;
      const colorStopStr = gradInfo[i].trim();
      const result = colorStopRE.exec(colorStopStr);
      if (!result) {
        throw new Error('Unknown gradient color stop: ' + colorStopStr);
      }
      const colorStopColor = result[1];
      const colorStopAmount = parseFloat(result[2]);
      let colorStopPercent = colorStopAmount * 0.01;
      if (result[3] === 'px') {
        const height = Math.abs(top - bottom);
        if (height) {
          MathUtils.clamp(0, 1, colorStopPercent = colorStopAmount / height);
        } else { // degenerate case
          colorStopPercent = 0;
        }
      }

      gradient.addColorStop(colorStopPercent, colorStopColor);
    }
    stroke ? ctx.strokeStyle = gradient : ctx.fillStyle = gradient;
  } else {
    stroke ? ctx.strokeStyle = color : ctx.fillStyle = color;
  }
}


export class BGColorDrawable extends LayoutDrawable {
  color: string;
  borderRadius: BorderRadius | undefined;
  boxShadow: Shadow | undefined;

  constructor(node: LayoutNode, color: string, borderRadius: BorderRadius | undefined, boxShadow: Shadow | undefined) {
    super(node, {
      color,
      borderRadius,
      boxShadow,
    });
    this.color = color;
    this.borderRadius = borderRadius;
    this.boxShadow = boxShadow;
  }

  draw(ctx: CanvasRenderingContext2D, dims: Dimensions, padding: Margins): boolean {
    const left = -padding.left;
    const top = -padding.top;
    const width = dims.width + padding.left + padding.right;
    const height = dims.height + padding.top + padding.bottom;
    const right = left + width;
    const bottom = top + height;
    styleFromString(
      ctx,
      this.color,
      false,
      left,
      top,
      right,
      bottom,
    );

    if (this.boxShadow) {
      ctx.shadowColor = this.boxShadow.color;
      ctx.shadowBlur = this.boxShadow.blur;
      ctx.shadowOffsetX = this.boxShadow.offsetX;
      ctx.shadowOffsetY = this.boxShadow.offsetY;
    }
    if (this.borderRadius) {
      drawRoundedRect(ctx, this.borderRadius, 'fill', left, top, right, bottom);
    } else {
      ctx.fillRect(
        left,
        top,
        width,
        height,
      );
    }
    return true;
  }

  updateIntrinsicDims(_dims: Dimensions) {
  }
}

export class BorderDrawable extends LayoutDrawable {
  borderStyle: string;
  color: string;
  borderWidth: number;
  br: BorderRadius | undefined;

  constructor(node: LayoutNode, borderStyle: string, color: string, borderWidth: number, borderRadius: BorderRadius | undefined) {
    super(node, {
      borderStyle,
      color,
      borderWidth,
      borderRadius,
    });
    this.color = color || '#000';
    this.borderWidth = borderWidth || 1;
    this.br = borderRadius;
    this.borderStyle = borderStyle;
  }

  draw(ctx: CanvasRenderingContext2D, dims: Dimensions, padding: Margins): boolean {
    ctx.lineWidth = this.borderWidth;

    const offset = this.borderWidth * 0.5;
    const left = offset - padding.left;
    const top = offset - padding.top;
    const width = dims.width + padding.left + padding.right - this.borderWidth;
    const height = dims.height + padding.top + padding.bottom - this.borderWidth;
    const right = left + width;
    const bottom = top + height;
    styleFromString(
      ctx,
      this.color,
      true,
      left,
      top,
      right,
      bottom,
    );

    if (this.borderStyle === 'dashed') {
      ctx.setLineDash([this.borderWidth * 3.5, this.borderWidth * 3.5]);
    } else if (this.borderStyle === 'dotted') {
      ctx.setLineDash([this.borderWidth, this.borderWidth]);
    }

    if (this.borderStyle === 'wavey') {
      // this applies a wavy border to the top
      ctx.beginPath();
      const numWaves = 3; // hardcoded - could make this variable
      const waveLength = width / numWaves;
      const halfWaveLength = waveLength / 2;
      const waveHeight = this.borderWidth;
      let x = left - this.borderWidth - halfWaveLength;
      let y = top - this.borderWidth / 2;
      const wavePointiness = 0.3642; // bezier control point positioning parameter (0 = pointy waves, 0.5 = curvy waves)
      ctx.moveTo(x, y);
      for (let i = 0; i < numWaves + 1; ++i) {
        ctx.bezierCurveTo(x + halfWaveLength * wavePointiness, y,
                          x + halfWaveLength * (1 - wavePointiness), y + waveHeight,
                          x + halfWaveLength, y + waveHeight);
        ctx.bezierCurveTo(x + halfWaveLength + halfWaveLength * wavePointiness, y + waveHeight,
                          x + halfWaveLength + halfWaveLength * (1 - wavePointiness), y,
                          x + waveLength, y);
        x += waveLength;
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.br) {
      drawRoundedRect(
        ctx,
        this.br,
        'stroke',
        left,
        top,
        right,
        bottom,
      );
    } else {
      ctx.strokeRect(
        left,
        top,
        width,
        height,
      );
    }
    return true;
  }

  updateIntrinsicDims(dims: Dimensions, padding: Margins) {
    // the border fits inside the padding; if the padding isn't big enough then we need content space
    dims.width = Math.max(0, dims.width, this.borderWidth * 2 - padding.left - padding.right);
    dims.height = Math.max(0, dims.height, this.borderWidth * 2 - padding.top - padding.bottom);
  }
}

export class TextDrawable extends LayoutDrawable {
  text: string;
  fontManager: FontManager;
  textWidth = 0;

  constructor(node: LayoutNode, text: string) {
    super(node, {
      text,
    });
    this.text = text;
    this.fontManager = getFontManager(node);
  }

  draw(ctx: CanvasRenderingContext2D, dims: Dimensions): boolean {
    if (!this.fontManager.getFontsValid()) {
      return false;
    }
    const fontObj = this.fontManager.getFont(this.node.getFontDesc());
    ctx.font = fontObj2LegitString(fontObj);

    if (this.node.style.textShadow) {
      const shadow = parseShadow(this.node.style.textShadow, true);
      ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY;
      ctx.shadowColor = shadow.color;
    }
    ctx.fillText(this.text, 0, fontObj.fontMetrics.baseline);

    let lineY = 0;
    switch (fontObj.textDecoration) {
      case 'none':
        return true;

      case 'underline':
        lineY = fontObj.fontMetrics.lineBottom;
        break;

      case 'line-through':
        lineY = fontObj.fontMetrics.lineBottom - Math.floor(fontObj.fontMetrics.fontSize * 0.5);
        break;

      default:
        absurd(fontObj.textDecoration);
    }

    // draw decoration
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(Math.min(dims.width, this.textWidth), lineY);
    ctx.closePath();
    ctx.stroke();

    return true;
  }

  updateIntrinsicDims(dims: Dimensions) {
    if (!this.fontManager.getFontsValid()) {
      return;
    }

    const fontObj = this.fontManager.getFont(this.node.getFontDesc());

    this.textWidth = 0;
    for (let i = 0; i < this.text.length; ++i) {
      const c = this.text[i];
      const prevCharacter = i ? this.text[i - 1] : '';
      this.textWidth += fontObj.getKerning(prevCharacter + c);
    }

    dims.width = Math.max(dims.width, Math.ceil(this.textWidth));
    dims.height = Math.max(dims.height, Math.ceil(fontObj.fontMetrics.lineHeight));
  }
}

export class SVGDrawable extends LayoutDrawable {
  stroke: string | undefined;
  fill: string | undefined;
  width = 0;
  height = 0;
  paths: PathDesc[] | undefined;

  constructor(
    node: LayoutNode,
    svgName: string|undefined,
    stroke: string|undefined,
    fill: string|undefined,
    width: number,
    height: number,
    paths: PathDesc[]|undefined,
  )  {
    super(node, {
      svgName,
      stroke,
      fill,
      width,
      height,
      paths,
    });
    this.stroke = stroke;
    this.fill = fill;
    this.width = width;
    this.height = height;
    this.paths = paths;
  }

  draw(ctx: CanvasRenderingContext2D, dims: Dimensions): boolean {
    let width = this.width || dims.width;
    let height = this.height || dims.height;
    let paths = this.paths;

    if (!paths || !width || !height) {
      return false;
    }

    ctx.scale(dims.width / width, dims.height / height);
    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
    }
    if (this.fill) {
      ctx.fillStyle = this.fill;
    }
    const parentAlpha = ctx.globalAlpha;
    for (const pathDesc of paths) {
      const path = new Path2D(pathDesc.path as any);
      ctx.globalAlpha = parentAlpha * (pathDesc.opacity || 1);
      ctx.lineWidth = parseFloat(pathDesc.strokeWidth || '0.1') || 0.1;
      if (this.fill) {
        (ctx.fill as any)(path, pathDesc.fillRule || 'evenodd');
      }
      if (this.stroke) {
        (ctx.stroke as any)(path);
      }
    }
    return true;
  }

  setStyle(style: Stash) {
    let ret = false;
    if (this.stroke !== style.stroke) {
      this.stroke = style.stroke;
      ret = true;
    }
    if (this.fill !== style.fill) {
      this.fill = style.fill;
      ret = true;
    }
    return ret;
  }

  updateIntrinsicDims(_dims: Dimensions) {
  }
}

export class ImageDrawable extends LayoutDrawable {
  imageUrl: string | undefined;
  cachedImage: CachedImage | undefined;
  isBackground: boolean;
  coverType: ImageCoverType = ImageCoverType.None;
  drawScale = 1;
  borderRadius: BorderRadius | undefined;
  boxShadow: Shadow | undefined;

  constructor(
    node: LayoutNode,
    url: string|undefined,
    isBackground = false,
    backgroundSize?: string,
    borderRadius?: BorderRadius,
    boxShadow?: Shadow,
  )  {
    super(node, {
      url,
      isBackground,
      backgroundSize,
      borderRadius,
      boxShadow,
    });
    this.borderRadius = borderRadius;
    this.imageUrl = url;
    this.isBackground = isBackground;
    this.cachedImage = url ? getImage(url, node) : undefined;
    this.boxShadow = boxShadow;

    if (backgroundSize === 'contain') {
      this.coverType = ImageCoverType.Contain;
    } else if (backgroundSize === 'cover') {
      this.coverType = ImageCoverType.Cover;
    }
  }

  draw(ctx: CanvasRenderingContext2D, dims: Dimensions, padding: Margins): boolean {
    const image = this.cachedImage ? this.cachedImage.data : undefined;
    if (!image) {
      return false;
    }

    const srcDims: Dimensions = { width: image.width, height: image.height };
    const srcPos: Point = { x: srcDims.width * 0.5, y: srcDims.height * 0.5 };

    const dstDims: Dimensions = { width: dims.width, height: dims.height };
    const localDims = this.node.getLayoutData().localDims;
    if (!this.isBackground) {
      // for explicitly sized img element, let it escape constraints
      if (localDims.width && dstDims.width < localDims.width) {
        dstDims.width = localDims.width;
      }
      if (localDims.height && dstDims.height < localDims.height) {
        dstDims.height = localDims.height;
      }

      // TODO (CD) should probably clip the drawImage call, but I think that needs to be done at the LayoutNode
      // level because the left/top might position it outside the bounds, and we don't know that here
    }

    const dstPos: Point = { x: dstDims.width * 0.5, y: dstDims.height * 0.5 };

    if (srcDims.width && srcDims.height && dstDims.width && dstDims.height) {
      const widthRatio = dims.width / srcDims.width;
      const heightRatio = dims.height / srcDims.height;

      const ew = widthRatio / heightRatio;
      const eh = heightRatio / widthRatio;

      switch (this.coverType) {
        case ImageCoverType.None:
          break;

        case ImageCoverType.Contain:
          if (eh < ew) {
            dstDims.width = srcDims.width * heightRatio;
          } else {
            dstDims.height = srcDims.height * widthRatio;
          }
          break;

        case ImageCoverType.Cover:
          if (eh > ew) {
            dstDims.width = srcDims.width * heightRatio;
          } else {
            dstDims.height = srcDims.height * widthRatio;
          }
          break;

        default:
          absurd(this.coverType);
      }
    }

    srcDims.width /= this.drawScale;
    srcDims.height /= this.drawScale;

    if (this.borderRadius || (dstDims.width > dims.width || dstDims.height > dims.height)) {
      const left = -padding.left;
      const top = -padding.top;
      const width = dims.width + padding.left + padding.right;
      const height = dims.height + padding.top + padding.bottom;
      const right = left + width;
      const bottom = top + height;

      if (this.borderRadius) {
        drawRoundedRect(ctx, this.borderRadius, 'clip', left, top, right, bottom);
      } else {
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.lineTo(left, top);
        ctx.closePath();
        ctx.clip();
      }
    }

    if (this.boxShadow) {
      ctx.shadowColor = this.boxShadow.color;
      ctx.shadowBlur = this.boxShadow.blur;
      ctx.shadowOffsetX = this.boxShadow.offsetX;
      ctx.shadowOffsetY = this.boxShadow.offsetY;
    }

    ctx.drawImage(
      image,
      srcPos.x - srcDims.width * 0.5, srcPos.y - srcDims.height * 0.5,
      srcDims.width, srcDims.height,
      dstPos.x - dstDims.width * 0.5, dstPos.y - dstDims.height * 0.5,
      dstDims.width, dstDims.height,
    );


    return true;
  }

  updateIntrinsicDims(dims: Dimensions) {
    const imageElement = this.cachedImage ? this.cachedImage.data : undefined;
    if (this.isBackground || !imageElement) {
      return;
    }

    if (dims.width === 0 && dims.height === 0) {
      // use image dims only if the node doesn't have localDims
      dims.width = imageElement.width;
      dims.height = imageElement.height;
    } else if (dims.width === 0) {
      const scale = dims.height / imageElement.height;
      dims.width = imageElement.width * scale;
    } else if (dims.height === 0) {
      const scale = dims.width / imageElement.width;
      dims.height = imageElement.height * scale;
    }
  }
}
