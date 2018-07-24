/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as Font from '../lib/Font';
import * as LayoutNode from '../lib/LayoutNode';
import { parseLayout, setTapCallback } from './SimpleLayoutParser';

import { Point, ScreenSpacePoint } from 'amper-utils/dist2017/mathUtils';
import { expect } from 'chai';

Font.test.stubFontLoading();

describe('layout-test', function() {
  let lastTapped = '';

  before(function() {
    setTapCallback(function(str) {
      lastTapped = str;
    });
  });

  beforeEach(function() {
    LayoutNode.debug.resetCounters();
    lastTapped = '';
  });

  it('LayoutNode should layout and update correctly', function() {
    const root = parseLayout(`<Node/>`);
    root.setExternalConstraints({ min: { width: 60 }, max: { height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'Node',
      offset: { x: 0, y: 0 },
      dims: { width: 60, height: 0 },
      children: [],
    });
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 1, layout: 1, nodeDraw: 0 });

    root.setHeight(75);
    expect(root.getDebugTree()).to.deep.equal({
      type: 'Node',
      offset: { x: 0, y: 0 },
      dims: { width: 60, height: 75 },
      children: [],
    });
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 2, layout: 2, nodeDraw: 0 });

    // should obey max height
    root.setHeight(375);
    expect(root.getDebugTree()).to.deep.equal({
      type: 'Node',
      offset: { x: 0, y: 0 },
      dims: { width: 60, height: 120 },
      children: [],
    });
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 3, layout: 3, nodeDraw: 0 });
  });

  it('SRow should layout and update correctly', function() {
    const root = parseLayout(`
      <SRow classes="p-x-5 p-y-15 ai-c">
        <Node classes="w-20 h-10"/>
        <Node classes="w-12 h-14"/>
        <Node classes="w-22 h-8"/>
      </SRow>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'SRow',
      offset: { x: 0, y: 0 },
      dims: { width: 64, height: 44 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 2 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 20, y: 0 },
        dims: { width: 12, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 32, y: 3 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 4, layout: 4, nodeDraw: 0 });

    // make a change down in the tree
    const child = root.getChild([1]);
    expect(child).to.not.equal(undefined);
    child!.setPadding({ left: 5, right: 5, top: 0, bottom: 0 });

    // make sure change is applied and minimally updates the nodes
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 0, layout: 0, nodeDraw: 0 });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SRow',
      offset: { x: 0, y: 0 },
      dims: { width: 74, height: 44 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 2 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 20, y: 0 },
        dims: { width: 22, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 42, y: 3 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 2, layout: 2, nodeDraw: 0 });

    // make a max width change at the root and make sure it applies down the tree
    root.setStyle({ maxWidth: '70px', paddingLeft: '5', paddingRight: '5', paddingTop: '15', paddingBottom: '15', alignItems: 'center' }, []);
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 0, layout: 0, nodeDraw: 0 });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SRow',
      offset: { x: 0, y: 0 },
      dims: { width: 70, height: 44 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 2 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 20, y: 0 },
        dims: { width: 22, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 42, y: 3 },
        dims: { width: 18, height: 8 },
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 1, layout: 2, nodeDraw: 0 });
  });

  it('SRow should clip children beyond the bounds', function() {
    const root = parseLayout(`
      <SRow classes="p-x-5 p-y-15 ai-c">
        <Node classes="w-20 h-10"/>
        <Node classes="w-12 h-14"/>
        <Node classes="w-22 h-8"/>
      </SRow>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 40, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'SRow',
      offset: { x: 0, y: 0 },
      dims: { width: 40, height: 44 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 2 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 20, y: 0 },
        dims: { width: 10, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 30, y: 3 },
        dims: { width: 0, height: 8 },
        children: [],
      }],
    });
  });

  it('SRow should apply margins correctly', function() {
    const root = parseLayout(`
      <SRow classes="p-x-5 p-y-15 ai-fs">
        <Node classes="w-20 h-10 m-y-3"/>
        <Node classes="w-12 h-14 m-l-5 m-r-10"/>
        <Node classes="w-22 h-8 m-r-5"/>
      </SRow>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 120, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'SRow',
      offset: { x: 0, y: 0 },
      dims: { width: 84, height: 46 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 3 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 25, y: 0 },
        dims: { width: 12, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 47, y: 0 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
  });

  it('SCol should layout correctly', function() {
    const root = parseLayout(`
      <SCol classes="p-x-5 p-y-15">
        <Node classes="w-20 h-10"/>
        <Node classes="w-12 h-14"/>
        <Node classes="w-22 h-8"/>
      </SCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 32, height: 62 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 0 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 10 },
        dims: { width: 12, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 24 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
  });

  it('SCol should apply margins correctly', function() {
    const root = parseLayout(`
      <SCol classes="p-x-5 p-y-15 ai-fs">
        <Node classes="m-3">Hello</Node>
        <Node classes="m-l-5 m-r-10">Good</Node>
        <Node classes="m-r-5">Bye</Node>
      </SCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 120, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 45, height: 99 },
      children: [{
        type: 'Node',
        offset: { x: 3, y: 3 },
        dims: { width: 25, height: 21 },
        text: 'Hello',
        children: [],
      }, {
        type: 'Node',
        offset: { x: 5, y: 27 },
        dims: { width: 20, height: 21 },
        text: 'Good',
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 48 },
        dims: { width: 15, height: 21 },
        text: 'Bye',
        children: [],
      }],
    });

    root.setStyle({
      paddingLeft: '5px', paddingRight: '5px', paddingTop: '15px', paddingBottom: '15px',
      alignItems: 'stretch',
    }, []);
    LayoutNode.debug.resetCounters();
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 45, height: 99 },
      children: [{
        type: 'Node',
        offset: { x: 3, y: 3 },
        dims: { width: 29, height: 21 },
        text: 'Hello',
        children: [],
      }, {
        type: 'Node',
        offset: { x: 5, y: 27 },
        dims: { width: 20, height: 21 },
        text: 'Good',
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 48 },
        dims: { width: 30, height: 21 },
        text: 'Bye',
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 1, layout: 3, nodeDraw: 0 });
  });

  it('SCol and SRow should nest correctly', function() {
    const root = parseLayout(`
      <SCol classes="p-x-5 p-y-15">
        <SRow classes="p-y-5 ai-c">
          <Node classes="w-20 h-10"/>
          <SCol>
            <Node classes="w-12 h-14"/>
            <Node classes="w-22 h-8"/>
          </SCol>
        </SRow>
        <Node classes='h-12'/>
      </SCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 52, height: 74 },
      children: [{
        type: 'SRow',
        offset: { x: 0, y: 0 },
        dims: { width: 42, height: 32 },
        children: [{
          type: 'Node',
          offset: { x: 0, y: 6 },
          dims: { width: 20, height: 10 },
          children: [],
        }, {
          type: 'SCol',
          offset: { x: 20, y: 0 },
          dims: { width: 22, height: 22 },
          children: [{
            type: 'Node',
            offset: { x: 0, y: 0 },
            dims: { width: 12, height: 14 },
            children: [],
          }, {
            type: 'Node',
            offset: { x: 0, y: 14 },
            dims: { width: 22, height: 8 },
            children: [],
          }],
        }],
      }, {
        type: 'Node',
        offset: { x: 0, y: 32 },
        dims: { width: 0, height: 12 },
        children: [],
      }],
    });

    root.setExternalConstraints({ min: {}, max: { width: 40, height: 60 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 40, height: 60 },
      children: [{
        type: 'SRow',
        offset: { x: 0, y: 0 },
        dims: { width: 30, height: 30 },
        children: [{
          type: 'Node',
          offset: { x: 0, y: 5 },
          dims: { width: 20, height: 10 },
          children: [],
        }, {
          type: 'SCol',
          offset: { x: 20, y: 0 },
          dims: { width: 10, height: 20 },
          children: [{
            type: 'Node',
            offset: { x: 0, y: 0 },
            dims: { width: 10, height: 14 },
            children: [],
          }, {
            type: 'Node',
            offset: { x: 0, y: 14 },
            dims: { width: 10, height: 6 },
            children: [],
          }],
        }],
      }, {
        type: 'Node',
        offset: { x: 0, y: 30 },
        dims: { width: 0, height: 0 },
        children: [],
      }],
    });
  });

  it('FlexLayout should layout and update correctly in simple mode', function() {
    const root = parseLayout(`
      <FCol classes="p-x-5 p-y-15 w-n-36 ai-c">
        <Node classes="w-20 h-10"/>
        <Node classes="w-12 h-14"/>
        <Node classes="w-22 h-8"/>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol',
      offset: { x: 0, y: 0 },
      dims: { width: 36, height: 62 },
      children: [{
        type: 'Node',
        offset: { x: 3, y: 0 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 7, y: 10 },
        dims: { width: 12, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 2, y: 24 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 4, layout: 4, nodeDraw: 0 });

    // make a change down in the tree
    const child = root.getChild([1]);
    expect(child).to.not.equal(undefined);
    child!.setWidth(10);

    // make sure change is applied and minimally updates the nodes
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 0, layout: 0, nodeDraw: 0 });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol',
      offset: { x: 0, y: 0 },
      dims: { width: 36, height: 62 },
      children: [{
        type: 'Node',
        offset: { x: 3, y: 0 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 8, y: 10 },
        dims: { width: 10, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 2, y: 24 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 2, layout: 2, nodeDraw: 0 });

    // make a change in the main axis direction
    child!.setHeight(20);

    // make sure change is applied and minimally updates the nodes
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 0, layout: 0, nodeDraw: 0 });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol',
      offset: { x: 0, y: 0 },
      dims: { width: 36, height: 68 },
      children: [{
        type: 'Node',
        offset: { x: 3, y: 0 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 8, y: 10 },
        dims: { width: 10, height: 20 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 2, y: 30 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 2, layout: 2, nodeDraw: 0 });
  });

  it('FRow should apply margins correctly', function() {
    const root = parseLayout(`
      <FRow classes="p-x-5 p-y-15 ai-fs">
        <Node classes="w-20 h-10 m-y-3"/>
        <Node classes="fg-1 h-14 m-l-5 m-r-10"/>
        <Node classes="w-22 h-8 m-r-5"/>
      </FRow>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 120, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FRow',
      offset: { x: 0, y: 0 },
      dims: { width: 120, height: 46 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 3 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 25, y: 0 },
        dims: { width: 48, height: 14 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 83, y: 0 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
  });

  it('FCol should apply margins correctly', function() {
    const root = parseLayout(`
      <FCol classes="p-x-5 p-y-15 ai-fs">
        <Node classes="m-3">Hi</Node>
        <Node classes="fg-1 m-l-5 m-r-10">Be</Node>
        <Node classes="m-r-5">Good</Node>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 120, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol',
      offset: { x: 0, y: 0 },
      dims: { width: 35, height: 120 },
      children: [{
        type: 'Node',
        offset: { x: 3, y: 3 },
        dims: { width: 10, height: 21 },
        text: 'Hi',
        children: [],
      }, {
        type: 'Node',
        offset: { x: 5, y: 27 },
        dims: { width: 10, height: 42 },
        text: 'Be',
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 69 },
        dims: { width: 20, height: 21 },
        text: 'Good',
        children: [],
      }],
    });

    root.setStyle({
      paddingLeft: '5px', paddingRight: '5px', paddingTop: '15px', paddingBottom: '15px',
      alignItems: 'stretch',
      width: '50px',
    }, []);
    LayoutNode.debug.resetCounters();
    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol',
      offset: { x: 0, y: 0 },
      dims: { width: 60, height: 120 },
      children: [{
        type: 'Node',
        offset: { x: 3, y: 3 },
        dims: { width: 44, height: 21 },
        text: 'Hi',
        children: [],
      }, {
        type: 'Node',
        offset: { x: 5, y: 27 },
        dims: { width: 35, height: 42 },
        text: 'Be',
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 69 },
        dims: { width: 45, height: 21 },
        text: 'Good',
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 1, layout: 4, nodeDraw: 0 });
  });

  it('FlexLayout should layout correctly with flexible children', function() {
    const root = parseLayout(`
      <FCol classes="p-x-5 p-y-15 w-n-36 ai-c">
        <Node classes="w-20 h-10"/>
        <Node classes="w-12 h-14 fg-1"/>
        <Node classes="w-22 h-8"/>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol',
      offset: { x: 0, y: 0 },
      dims: { width: 36, height: 120 },
      children: [{
        type: 'Node',
        offset: { x: 3, y: 0 },
        dims: { width: 20, height: 10 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 7, y: 10 },
        dims: { width: 12, height: 72 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 2, y: 82 },
        dims: { width: 22, height: 8 },
        children: [],
      }],
    });
  });

  it('FlexLayout should layout correctly with ai-s (the default)', function() {
    const root = parseLayout(`
      <FCol classes="w-60 h-50">
        <Node classes="fg-1"/>
        <Node>Hi</Node>
        <Node classes="fg-1"/>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol', // ai-s
      offset: { x: 0, y: 0 },
      dims: { width: 60, height: 50 },
      children: [{
        type: 'Node', // fg-1
        offset: { x: 0, y: 0 },
        dims: { width: 60, height: 14.5 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 14.5 },
        dims: { width: 60, height: 21 },
        text: 'Hi',
        children: [],
      }, {
        type: 'Node', // fg-1
        offset: { x: 0, y: 35.5 },
        dims: { width: 60, height: 14.5 },
        children: [],
      }],
    });
  });

  it('FlexLayout should layout correctly with ai-s and a set-width child', function() {
    const root = parseLayout(`
      <FCol classes="w-60 h-50">
        <Node classes="fg-1"/>
        <Node classes="h-10 w-5"/>
        <Node classes="fg-1"/>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol', // ai-s
      offset: { x: 0, y: 0 },
      dims: { width: 60, height: 50 },
      children: [{
        type: 'Node', // fg-1
        offset: { x: 0, y: 0 },
        dims: { width: 60, height: 20 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 27.5, y: 20 },
        dims: { width: 5, height: 10 },
        children: [],
      }, {
        type: 'Node', // fg-1
        offset: { x: 0, y: 30 },
        dims: { width: 60, height: 20 },
        children: [],
      }],
    });
  });

  it('FlexLayout should layout correctly with ai-s and as-c', function() {
    const root = parseLayout(`
      <FCol classes="w-60 h-50">
        <Node classes="fg-1"/>
        <Node classes="as-c">Hi</Node>
        <Node classes="fg-1"/>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol', // ai-s
      offset: { x: 0, y: 0 },
      dims: { width: 60, height: 50 },
      children: [{
        type: 'Node', // fg-1
        offset: { x: 0, y: 0 },
        dims: { width: 60, height: 14.5 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 25, y: 14.5 },
        dims: { width: 10, height: 21 },
        text: 'Hi',
        children: [],
      }, {
        type: 'Node', // fg-1
        offset: { x: 0, y: 35.5 },
        dims: { width: 60, height: 14.5 },
        children: [],
      }],
    });
  });

  it('FlexLayout should layout correctly with ai-c', function() {
    const root = parseLayout(`
      <FCol classes="w-60 h-50 ai-c">
        <Node classes="fg-1 w-10"/>
        <Node classes="w-5 h-10"/>
        <Node classes="fg-1 w-15"/>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol', // ai-c
      offset: { x: 0, y: 0 },
      dims: { width: 60, height: 50 },
      children: [{
        type: 'Node', // fg-1
        offset: { x: 25, y: 0 },
        dims: { width: 10, height: 20 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 27.5, y: 20 },
        dims: { width: 5, height: 10 },
        children: [],
      }, {
        type: 'Node', // fg-1
        offset: { x: 22.5, y: 30 },
        dims: { width: 15, height: 20 },
        children: [],
      }],
    });
  });

  it('FlexLayout should layout correctly with nested flex boxes', function() {
    const root = parseLayout(`
      <FCol classes="ai-s">
        <FRow classes="h-50 ai-c">
          <FCol classes="fg-1 ai-s">
            <Node classes="fg-1"/>
          </FCol>
        </FRow>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol', // ai-s
      offset: { x: 0, y: 0 },
      dims: { width: 80, height: 50 },
      children: [{
        type: 'FRow', // h-50
        offset: { x: 0, y: 0 },
        dims: { width: 80, height: 50 },
        children: [{
          type: 'FCol', // fg-1 ai-s
          offset: { x: 0, y: 0 },
          dims: { width: 80, height: 50 },
          children: [{
            type: 'Node', // fg-1
            offset: { x: 0, y: 0 },
            dims: { width: 80, height: 50 },
            children: [],
          }],
        }],
      }],
    });
  });

  it('FlexLayout should layout and update correctly with nested flex boxes', function() {
    const root = parseLayout(`
      <FCol classes="p-x-5 p-y-5">
        <FRow classes="h-x-50 ai-c">
          <Node classes="w-5 h-10"/>
          <FCol classes="fg-1">
            <Node classes="fg-1"/>
            <Node classes="h-10"/>
            <Node classes="fg-1"/>
          </FCol>
          <Node classes="w-5 h-10"/>
        </FRow>
        <Node classes="h-10"/>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 80, height: 120 } });

    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol', // p-x-5 p-y-5
      offset: { x: 0, y: 0 },
      dims: { width: 80, height: 70 },
      children: [{
        type: 'FRow', // h-x-50
        offset: { x: 0, y: 0 },
        dims: { width: 70, height: 50 },
        children: [{
          type: 'Node',
          offset: { x: 0, y: 20 },
          dims: { width: 5, height: 10 },
          children: [],
        }, {
          type: 'FCol', // fg-1
          offset: { x: 5, y: 0 },
          dims: { width: 60, height: 50 },
          children: [{
            type: 'Node', // fg-1
            offset: { x: 0, y: 0 },
            dims: { width: 60, height: 20 },
            children: [],
          }, {
            type: 'Node',
            offset: { x: 0, y: 20 },
            dims: { width: 60, height: 10 },
            children: [],
          }, {
            type: 'Node', // fg-1
            offset: { x: 0, y: 30 },
            dims: { width: 60, height: 20 },
            children: [],
          }],
        }, {
          type: 'Node',
          offset: { x: 65, y: 20 },
          dims: { width: 5, height: 10 },
          children: [],
        }],
      }, {
        type: 'Node',
        offset: { x: 0, y: 50 },
        dims: { width: 70, height: 10 },
        children: [],
      }],
    });

    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 9, layout: 9, nodeDraw: 0 });

    // make a change down in the tree
    const child = root.getChild([0, 1, 2]);
    expect(child).to.not.equal(undefined);
    child!.setWidth(10);

    // make sure change is applied and minimally updates the nodes
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 0, layout: 0, nodeDraw: 0 });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol', // p-x-5 p-y-5
      offset: { x: 0, y: 0 },
      dims: { width: 80, height: 70 },
      children: [{
        type: 'FRow', // h-x-50
        offset: { x: 0, y: 0 },
        dims: { width: 70, height: 50 },
        children: [{
          type: 'Node',
          offset: { x: 0, y: 20 },
          dims: { width: 5, height: 10 },
          children: [],
        }, {
          type: 'FCol', // fg-1
          offset: { x: 5, y: 0 },
          dims: { width: 60, height: 50 },
          children: [{
            type: 'Node', // fg-1
            offset: { x: 0, y: 0 },
            dims: { width: 60, height: 20 },
            children: [],
          }, {
            type: 'Node',
            offset: { x: 0, y: 20 },
            dims: { width: 60, height: 10 },
            children: [],
          }, {
            type: 'Node', // fg-1
            offset: { x: 25, y: 30 },
            dims: { width: 10, height: 20 },
            children: [],
          }],
        }, {
          type: 'Node',
          offset: { x: 65, y: 20 },
          dims: { width: 5, height: 10 },
          children: [],
        }],
      }, {
        type: 'Node',
        offset: { x: 0, y: 50 },
        dims: { width: 70, height: 10 },
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 4, layout: 4, nodeDraw: 0 });

    // another change
    child!.setStyle({ flexGrow: '1', minHeight: '30px' }, []);

    // make sure change is applied and minimally updates the nodes
    expect(LayoutNode.debug.getCounters()).to.deep.equal({ intrinsicDims: 0, layout: 0, nodeDraw: 0 });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'FCol', // p-x-5 p-y-5 ai-s
      offset: { x: 0, y: 0 },
      dims: { width: 80, height: 70 },
      children: [{
        type: 'FRow', // h-x-50
        offset: { x: 0, y: 0 },
        dims: { width: 70, height: 50 },
        children: [{
          type: 'Node',
          offset: { x: 0, y: 20 },
          dims: { width: 5, height: 10 },
          children: [],
        }, {
          type: 'FCol', // fg-1 ai-s
          offset: { x: 5, y: 0 },
          dims: { width: 60, height: 50 },
          children: [{
            type: 'Node', // fg-1
            offset: { x: 0, y: 0 },
            dims: { width: 60, height: 5 },
            children: [],
          }, {
            type: 'Node',
            offset: { x: 0, y: 5 },
            dims: { width: 60, height: 10 },
            children: [],
          }, {
            type: 'Node', // fg-1
            offset: { x: 0, y: 15 },
            dims: { width: 60, height: 35 },
            children: [],
          }],
        }, {
          type: 'Node',
          offset: { x: 65, y: 20 },
          dims: { width: 5, height: 10 },
          children: [],
        }],
      }, {
        type: 'Node',
        offset: { x: 0, y: 50 },
        dims: { width: 70, height: 10 },
        children: [],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 4, layout: 5, nodeDraw: 0 });
  });

  it('getLeafTouchableNodeAt should route correctly with a complex nested set of nodes', function() {
    const root = parseLayout(`
      <FCol classes="p-15 ai-s c-red-bg" logOnTap="root">
        <FRow classes="h-x-50 ai-c c-#FF0-bg">
          <Node classes="w-25 h-20 c-#F0F-bg" logOnTap="magenta"/>
          <FCol classes="fg-1 ai-s c-#0FF-bg">
            <Node classes="fg-1 c-#0F0-bg"/>
            <Node classes="h-30 c-#00F-bg" logOnTap="blue"/>
            <Node classes="fg-1 c-#0FF-bg" logOnTap="cyan"/>
          </FCol>
          <Node classes="w-35 h-20"/>
        </FRow>
        <Node classes="h-10"/>
      </FCol>
    `);
    root.setExternalConstraints({ min: {}, max: { width: 300, height: 120 } });

    function routeTap(point: Point) {
      let touchableNode = root.getLeafTouchableNodeAt(point);
      while (touchableNode) {
        if (touchableNode.onClick) {
          touchableNode.onClick(point as ScreenSpacePoint);
          return;
        }
        touchableNode = touchableNode.getParentNode();
      }
    }

    routeTap({
      x: 1,
      y: 1,
    });
    expect(lastTapped).to.equal('root');

    routeTap({
      x: 30,
      y: 45,
    });
    expect(lastTapped).to.equal('magenta');

    routeTap({
      x: 245,
      y: 45,
    });
    expect(lastTapped).to.equal('blue');

    routeTap({
      x: 245,
      y: 60,
    });
    expect(lastTapped).to.equal('cyan');

    routeTap({
      x: 255,
      y: 60,
    });
    expect(lastTapped).to.equal('root');
  });

  it('should handle constrained to unconstrained transition', function() {
    const root = parseLayout(`
      <Node classes="w-50 h-10"/>
    `);

    root.setExternalConstraints({ min: {}, max: { width: 300, height: 120 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'Node',
      offset: { x: 0, y: 0 },
      dims: { width: 50, height: 10 },
      children: [],
    });

    root.setExternalConstraints({ min: {}, max: { width: 300, height: 2 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'Node',
      offset: { x: 0, y: 0 },
      dims: { width: 50, height: 2 },
      children: [],
    });

    root.setExternalConstraints({ min: {}, max: { width: 300, height: 120 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'Node',
      offset: { x: 0, y: 0 },
      dims: { width: 50, height: 10 },
      children: [],
    });
  });

  it('should correctly not clip positioned child node at start', function() {
    const root = parseLayout(`
      <SCol classes="ai-s">
        <Node classes="w-40 h-20"/>
        <Node classes="top-19 h-1"/>
      </SCol>
    `);

    root.setExternalConstraints({ min: {}, max: { width: 300, height: 120 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 40, height: 20 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 0 },
        dims: { width: 40, height: 20 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 19 },
        dims: { width: 40, height: 1 },
        children: [],
      }],
    });
  });

  it('should correctly not clip positioned child node at end', function() {
    const root = parseLayout(`
      <SCol classes="ai-s">
        <Node classes="w-40 h-20"/>
        <Node classes="bot-0 h-1"/>
      </SCol>
    `);

    root.setExternalConstraints({ min: {}, max: { width: 300, height: 120 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 40, height: 20 },
      children: [{
        type: 'Node',
        offset: { x: 0, y: 0 },
        dims: { width: 40, height: 20 },
        children: [],
      }, {
        type: 'Node',
        offset: { x: 0, y: 19 },
        dims: { width: 40, height: 1 },
        children: [],
      }],
    });
  });

  it('should layout children of a scrollable node', function() {
    const root = parseLayout(`
      <SCol classes="w-x-100 h-x-100 o-x-s">
        <FRow>
          <Node classes="p-5 m-10">1</Node>
          <Node classes="p-5 m-10">2</Node>
          <Node classes="p-5 m-10">3</Node>
          <Node classes="p-5 m-10">4</Node>
        </FRow>
      </SCol>
    `);

    root.setExternalConstraints({ min: {}, max: { width: 300, height: 120 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 100, height: 51 },
      children: [{
        type: 'FRow',
        offset: { x: 0, y: 0 },
        dims: { width: 140, height: 51 },
        children: [{
          type: 'Node',
          text: '1',
          offset: { x: 10, y: 10 },
          dims: { width: 15, height: 31 },
          children: [],
        }, {
          type: 'Node',
          text: '2',
          offset: { x: 45, y: 10 },
          dims: { width: 15, height: 31 },
          children: [],
        }, {
          type: 'Node',
          text: '3',
          offset: { x: 80, y: 10 },
          dims: { width: 15, height: 31 },
          children: [],
        }, {
          type: 'Node',
          text: '4',
          offset: { x: 115, y: 10 },
          dims: { width: 15, height: 31 },
          children: [],
        }],
      }],
    });
  });

  it('should layout negative positioning', function() {
    const root = parseLayout(`
      <SCol>
        <Node>1</Node>
        <SCol classes='left--15'>
          <SRow classes='c-red-bg-a0.2'>
            <Node>2</Node>
            <Node>3</Node>
            <Node>4</Node>
            <Node>5</Node>
            <Node>6</Node>
          </SRow>
        </SCol>
      </SCol>
    `);

    root.setExternalConstraints({ min: {}, max: { width: 300, height: 120 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      offset: { x: 0, y: 0 },
      dims: { width: 10, height: 42 },
      children: [{
        type: 'Node',
        text: '1',
        offset: { x: 0, y: 0 },
        dims: { width: 5, height: 21 },
        children: [],
      }, {
        type: 'SCol',
        offset: { x: -15, y: 21 },
        dims: { width: 25, height: 21 },
        children: [{
          type: 'SRow',
          offset: { x: 0, y: 0 },
          dims: { width: 25, height: 21 },
          children: [{
            type: 'Node',
            text: '2',
            offset: { x: 0, y: 0 },
            dims: { width: 5, height: 21 },
            children: [],
          }, {
            type: 'Node',
            text: '3',
            offset: { x: 5, y: 0 },
            dims: { width: 5, height: 21 },
            children: [],
          }, {
            type: 'Node',
            text: '4',
            offset: { x: 10, y: 0 },
            dims: { width: 5, height: 21 },
            children: [],
          }, {
            type: 'Node',
            text: '5',
            offset: { x: 15, y: 0 },
            dims: { width: 5, height: 21 },
            children: [],
          }, {
            type: 'Node',
            text: '6',
            offset: { x: 20, y: 0 },
            dims: { width: 5, height: 21 },
            children: [],
          }],
        }],
      }],
    });
  });
});
