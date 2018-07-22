/**
 * Copyright 2017-present Ampersand Technologies, Inc.
 */

import 'server/tools/setupFakeBrowser.ts';

import { MomentumScroller, ScrollBounds, ScrollEvent, ScrollEventData } from '../lib/MomentumScroller';

import * as chai from 'chai';
import { Dimensions } from 'overlib/shared/mathUtil';
import * as sinon from 'sinon';
import { describeClient } from 'testlib/reactTest';

const expect: any = chai.expect;

const SCROLL_BOUNDS : ScrollBounds = {
  xMin: 0,
  yMin: 0,
  xMax: 320,
  yMax: 560,
};

const CONTAINER_SIZE : Dimensions = {
  width: 320,
  height: 560,
};

describeClient(__filename, () => {
  let sandbox;
  let scroller;
  let spyFireEvent : (ScrollEvent, ScrollEventData) => void;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    let fireEvent = (_eventName: ScrollEvent, _data: ScrollEventData) => {};
    spyFireEvent = sinon.spy(fireEvent);
    const props = {
      getScrollBounds: () => SCROLL_BOUNDS,
      getContainerSize: () => CONTAINER_SIZE,
      getScaleFactor: () => 1,
      fireEvent: spyFireEvent,
      scrollX: false,
      scrollY: true,
    };
    scroller = new MomentumScroller(props);
  });
  afterEach(() => {
    sandbox.restore();
  });
  it('should not suddenly stop scrolling when dt is 0 and there is a target', () => {
    scroller.setTargetScrollY(20, 3000, 'easeInQuad');
    const ret = scroller.tick(0);
    expect(ret).to.equal(true);
    expect(spyFireEvent).to.have.been.calledWith('scroll', {
      metric: sinon.match.any,
      scrollX: 0,
      scrollY: 0,
      deltaX: 0,
      deltaY: 0,
    });
  });
  it('should stop scrolling when velocity becomes 0', () => {
    scroller.setTargetScrollY(20, 1000, 'easeInQuad');
    debugger;
    const ret = scroller.tick(1000);
    expect(ret).to.equal(true);
    expect(spyFireEvent).to.have.been.calledWith('scroll', {
      metric: '',
      scrollX: 0,
      scrollY: 20,
      deltaX: 0,
      deltaY: 20,
    });
    const ret2 = scroller.tick(1001);
    expect(ret2).to.equal(false);
    expect(spyFireEvent).to.have.been.called.twice;
    expect(spyFireEvent).to.have.been.calledWith('scrollStop', {
      metric: '',
      scrollX: 0,
      scrollY: 20,
      deltaX: 0,
      deltaY: 0,
    });
  });
  it('should not set a scroll target when change is tiny', () => {
    scroller.setTargetScrollY(0.5, 3000, 'easeInQuad');
    const ret = scroller.tick(0);
    expect(ret).to.equal(false);
    expect(spyFireEvent).to.not.have.been.called;
  });
});
