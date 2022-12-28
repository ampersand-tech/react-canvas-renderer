/**
 * Copyright 2017-present Ampersand Technologies, Inc.
 */

import { MomentumScroller, ScrollBounds, ScrollEvent, ScrollEventData } from '../lib/MomentumScroller';

import { Dimensions } from 'amper-utils/dist/mathUtils';
import * as chai from 'chai';

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

describe('MomentumScroller-test', () => {
  let scroller;
  let eventsFired: any[] = [];
  beforeEach(() => {
    eventsFired = [];
    let fireEvent = (name: ScrollEvent, data: ScrollEventData) => {
      eventsFired.push({ name, data });
    };
    const props = {
      getScrollBounds: () => SCROLL_BOUNDS,
      getContainerSize: () => CONTAINER_SIZE,
      getScaleFactor: () => 1,
      fireEvent: fireEvent,
      scrollX: false,
      scrollY: true,
    };
    scroller = new MomentumScroller(props);
  });
  it('should not suddenly stop scrolling when dt is 0 and there is a target', () => {
    scroller.setTargetScrollY(20, 3000, 'easeInQuad');
    const ret = scroller.tick(0);
    expect(ret).to.equal(true);
    expect(eventsFired.shift()).to.deep.equal({
      name: 'scrollStart',
      data: {
        metric: '',
        scrollX: 0,
        scrollY: 0,
        deltaX: 0,
        deltaY: 0,
      },
    });
    expect(eventsFired.shift()).to.deep.equal({
      name: 'scroll',
      data: {
        metric: '',
        scrollX: 0,
        scrollY: 0,
        deltaX: 0,
        deltaY: 0,
      },
    });
    expect(eventsFired.length).to.equal(0);
  });
  it('should stop scrolling when velocity becomes 0', () => {
    scroller.setTargetScrollY(20, 1000, 'easeInQuad');
    const ret = scroller.tick(1000);
    expect(ret).to.equal(true);
    expect(eventsFired.shift()).to.deep.equal({
      name: 'scrollStart',
      data: {
        metric: '',
        scrollX: 0,
        scrollY: 0,
        deltaX: 0,
        deltaY: 0,
      },
    });
    expect(eventsFired.shift()).to.deep.equal({
      name: 'scroll',
      data: {
        metric: '',
        scrollX: 0,
        scrollY: 20,
        deltaX: 0,
        deltaY: 20,
      },
    });
    expect(eventsFired.length).to.equal(0);
    const ret2 = scroller.tick(1001);
    expect(ret2).to.equal(false);
    expect(eventsFired.shift()).to.deep.equal({
      name: 'scrollStop',
      data: {
        metric: '',
        scrollX: 0,
        scrollY: 20,
        deltaX: 0,
        deltaY: 0,
      },
    });
    expect(eventsFired.length).to.equal(0);
  });
  it('should not set a scroll target when change is tiny', () => {
    scroller.setTargetScrollY(0.5, 3000, 'easeInQuad');
    const ret = scroller.tick(0);
    expect(ret).to.equal(false);
    expect(eventsFired.length).to.equal(0);
  });
});
