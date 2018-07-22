/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

//import 'testlib/mochaTestUtils';
//import 'server/tools/clientStub';

import * as Font from '../lib/Font';
import * as LayoutNode from '../lib/LayoutNode';
import { flushRendering, renderToLayout } from '../lib/LayoutRenderer';

import { expect } from 'chai';
import * as React from 'react';

Font.test.stubFontLoading();

class Test extends React.Component<{text: string}, { extraText: string }> {
  state = {
    extraText: '',
  };

  setExtra(text: string) {
    this.setState({ extraText: text });
  }

  render() {
    return <div>{this.props.text + this.state.extraText}</div>;
  }
}

describe('layoutRenderer-test', function() {
  beforeEach(function() {
    LayoutNode.debug.resetCounters();
  });

  it('should render and update', function() {
    const root = renderToLayout(undefined,  (
      <div style={{ paddingTop: '5px', paddingBottom: '5px'}}>
        <Test text='Hello'/>
        <div>
          Hello world
          <div className='flexRow'>{'Number '}{42}</div>
        </div>
      </div>
    ));
    root.setExternalConstraints({ min: {}, max: { width: 120, height: 120 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      dims: { width: 55, height: 73 },
      offset: { x: 0, y: 0 },
      children: [{
        type: 'SCol',
        dims: { width: 55, height: 73 },
        offset: { x: 0, y: 0 },
        children: [{
          type: 'Node',
          text: 'Hello',
          dims: { width: 25, height: 21 },
          offset: { x: 0, y: 0 },
          children: [],
        }, {
          type: 'SCol',
          dims: { width: 55, height: 42 },
          offset: { x: 0, y: 21 },
          children: [{
            type: 'Node',
            text: 'Hello world',
            dims: { width: 55, height: 21 },
            offset: { x: 0, y: 0 },
            children: [],
          }, {
            type: 'FRow',
            dims: { width: 45, height: 21 },
            offset: { x: 0, y: 21 },
            children: [{
              type: 'Node',
              text: 'Number ',
              dims: { width: 35, height: 21 },
              offset: { x: 0, y: 0 },
              children: [],
            }, {
              type: 'Node',
              text: '42',
              dims: { width: 10, height: 21 },
              offset: { x: 35, y: 0 },
              children: [],
            }],
          }],
        }],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 8, layout: 8, nodeDraw: 0 });

    renderToLayout(root,  (
      <div>
        <Test text='Hello there'/>
        <div>
          Hello world
          <div className='flexRow'>{'Number '}{47}</div>
        </div>
      </div>
    ));
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      dims: { width: 55, height: 63 },
      offset: { x: 0, y: 0 },
      children: [{
        type: 'SCol',
        dims: { width: 55, height: 63 },
        offset: { x: 0, y: 0 },
        children: [{
          type: 'Node',
          text: 'Hello there',
          dims: { width: 55, height: 21 },
          offset: { x: 0, y: 0 },
          children: [],
        }, {
          type: 'SCol',
          dims: { width: 55, height: 42 },
          offset: { x: 0, y: 21 },
          children: [{
            type: 'Node',
            text: 'Hello world',
            dims: { width: 55, height: 21 },
            offset: { x: 0, y: 0 },
            children: [],
          }, {
            type: 'FRow',
            dims: { width: 45, height: 21 },
            offset: { x: 0, y: 21 },
            children: [{
              type: 'Node',
              text: 'Number ',
              dims: { width: 35, height: 21 },
              offset: { x: 0, y: 0 },
              children: [],
            }, {
              type: 'Node',
              text: '47',
              dims: { width: 10, height: 21 },
              offset: { x: 35, y: 0 },
              children: [],
            }],
          }],
        }],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 6, layout: 6, nodeDraw: 0 });

    renderToLayout(root,  (
      <div>
        <Test text='Hello there'/>
        <div>
          Hello world
          <div className='flexRow'>Number <div>47</div></div>
        </div>
      </div>
    ));
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      dims: { width: 55, height: 63 },
      offset: { x: 0, y: 0 },
      children: [{
        type: 'SCol',
        dims: { width: 55, height: 63 },
        offset: { x: 0, y: 0 },
        children: [{
          type: 'Node',
          text: 'Hello there',
          dims: { width: 55, height: 21 },
          offset: { x: 0, y: 0 },
          children: [],
        }, {
          type: 'SCol',
          dims: { width: 55, height: 42 },
          offset: { x: 0, y: 21 },
          children: [{
            type: 'Node',
            text: 'Hello world',
            dims: { width: 55, height: 21 },
            offset: { x: 0, y: 0 },
            children: [],
          }, {
            type: 'FRow',
            dims: { width: 45, height: 21 },
            offset: { x: 0, y: 21 },
            children: [{
              type: 'Node',
              text: 'Number ',
              dims: { width: 35, height: 21 },
              offset: { x: 0, y: 0 },
              children: [],
            }, {
              type: 'Node',
              text: '47',
              dims: { width: 10, height: 21 },
              offset: { x: 35, y: 0 },
              children: [],
            }],
          }],
        }],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 5, layout: 5, nodeDraw: 0 });

    renderToLayout(root,  (
      <div>
        <div>Hello there</div>
        <div>
          Hello world
          <div className='flexRow'>Number <div>47</div></div>
        </div>
      </div>
    ));
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      dims: { width: 55, height: 63 },
      offset: { x: 0, y: 0 },
      children: [{
        type: 'SCol',
        dims: { width: 55, height: 63 },
        offset: { x: 0, y: 0 },
        children: [{
          type: 'Node',
          text: 'Hello there',
          dims: { width: 55, height: 21 },
          offset: { x: 0, y: 0 },
          children: [],
        }, {
          type: 'SCol',
          dims: { width: 55, height: 42 },
          offset: { x: 0, y: 21 },
          children: [{
            type: 'Node',
            text: 'Hello world',
            dims: { width: 55, height: 21 },
            offset: { x: 0, y: 0 },
            children: [],
          }, {
            type: 'FRow',
            dims: { width: 45, height: 21 },
            offset: { x: 0, y: 21 },
            children: [{
              type: 'Node',
              text: 'Number ',
              dims: { width: 35, height: 21 },
              offset: { x: 0, y: 0 },
              children: [],
            }, {
              type: 'Node',
              text: '47',
              dims: { width: 10, height: 21 },
              offset: { x: 35, y: 0 },
              children: [],
            }],
          }],
        }],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 3, layout: 3, nodeDraw: 0 });
  });

  it('should render and update on component rerender', function() {
    let instance;

    const root = renderToLayout(undefined,  (
      <div style={{ paddingTop: '5px', paddingBottom: '5px'}}>
        <Test text='Hello' ref={(inst) => instance = inst }/>
      </div>
    ));
    expect(instance).to.not.equal(undefined);
    root.setExternalConstraints({ min: {}, max: { width: 120, height: 120 } });
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      dims: { width: 25, height: 31 },
      offset: { x: 0, y: 0 },
      children: [{
        type: 'SCol',
        dims: { width: 25, height: 31 },
        offset: { x: 0, y: 0 },
        children: [{
          type: 'Node',
          text: 'Hello',
          dims: { width: 25, height: 21 },
          offset: { x: 0, y: 0 },
          children: [],
        }],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 3, layout: 3, nodeDraw: 0 });

    instance.setExtra(' there');
    flushRendering();
    expect(root.getDebugTree()).to.deep.equal({
      type: 'SCol',
      dims: { width: 55, height: 31 },
      offset: { x: 0, y: 0 },
      children: [{
        type: 'SCol',
        dims: { width: 55, height: 31 },
        offset: { x: 0, y: 0 },
        children: [{
          type: 'Node',
          text: 'Hello there',
          dims: { width: 55, height: 21 },
          offset: { x: 0, y: 0 },
          children: [],
        }],
      }],
    });
    expect(LayoutNode.debug.getCounters(true)).to.deep.equal({ intrinsicDims: 3, layout: 3, nodeDraw: 0 });
  });
});
