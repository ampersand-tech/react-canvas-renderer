/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import * as Selection from '../lib/Selection';

import { expect } from 'chai';

const noKeys = {
  shiftKey: false,
  metaKey: false,
};

const shiftKey = {
  shiftKey: true,
  metaKey: false,
};

describe('Selection-test', function() {
  it('should moveBack', function() {
    expect(Selection.moveBack({
      start: 0,
      end: 0,
      atStart: false,
    }, 5, noKeys)).to.deep.equal({
      start: 0,
      end: 0,
      atStart: false,
    });

    expect(Selection.moveBack({
      start: 3,
      end: 3,
      atStart: false,
    }, 5, noKeys)).to.deep.equal({
      start: 2,
      end: 2,
      atStart: false,
    });

    expect(Selection.moveBack({
      start: 1,
      end: 3,
      atStart: false,
    }, 5, noKeys)).to.deep.equal({
      start: 1,
      end: 1,
      atStart: false,
    });

    expect(Selection.moveBack({
      start: 1,
      end: 3,
      atStart: true,
    }, 5, noKeys)).to.deep.equal({
      start: 1,
      end: 1,
      atStart: false,
    });
  });

  it('should moveBack with shift key', function() {
    expect(Selection.moveBack({
      start: 0,
      end: 0,
      atStart: false,
    }, 5, shiftKey)).to.deep.equal({
      start: 0,
      end: 0,
      atStart: false,
    });

    expect(Selection.moveBack({
      start: 3,
      end: 3,
      atStart: false,
    }, 5, shiftKey)).to.deep.equal({
      start: 2,
      end: 3,
      atStart: true,
    });

    expect(Selection.moveBack({
      start: 1,
      end: 3,
      atStart: false,
    }, 5, shiftKey)).to.deep.equal({
      start: 1,
      end: 2,
      atStart: false,
    });

    expect(Selection.moveBack({
      start: 1,
      end: 3,
      atStart: true,
    }, 5, shiftKey)).to.deep.equal({
      start: 0,
      end: 3,
      atStart: true,
    });

    expect(Selection.moveBack({
      start: 1,
      end: 2,
      atStart: false,
    }, 5, shiftKey)).to.deep.equal({
      start: 1,
      end: 1,
      atStart: false,
    });
  });

  it('should moveForward', function() {
    expect(Selection.moveForward({
      start: 5,
      end: 5,
      atStart: false,
    }, 5, noKeys)).to.deep.equal({
      start: 5,
      end: 5,
      atStart: false,
    });

    expect(Selection.moveForward({
      start: 3,
      end: 3,
      atStart: false,
    }, 5, noKeys)).to.deep.equal({
      start: 4,
      end: 4,
      atStart: false,
    });

    expect(Selection.moveForward({
      start: 1,
      end: 3,
      atStart: false,
    }, 5, noKeys)).to.deep.equal({
      start: 3,
      end: 3,
      atStart: false,
    });

    expect(Selection.moveForward({
      start: 1,
      end: 3,
      atStart: true,
    }, 5, noKeys)).to.deep.equal({
      start: 3,
      end: 3,
      atStart: false,
    });
  });

  it('should moveForward with shift key', function() {
    expect(Selection.moveForward({
      start: 5,
      end: 5,
      atStart: false,
    }, 5, shiftKey)).to.deep.equal({
      start: 5,
      end: 5,
      atStart: false,
    });

    expect(Selection.moveForward({
      start: 3,
      end: 3,
      atStart: false,
    }, 5, shiftKey)).to.deep.equal({
      start: 3,
      end: 4,
      atStart: false,
    });

    expect(Selection.moveForward({
      start: 1,
      end: 3,
      atStart: false,
    }, 5, shiftKey)).to.deep.equal({
      start: 1,
      end: 4,
      atStart: false,
    });

    expect(Selection.moveForward({
      start: 1,
      end: 3,
      atStart: true,
    }, 5, shiftKey)).to.deep.equal({
      start: 2,
      end: 3,
      atStart: true,
    });

    expect(Selection.moveForward({
      start: 2,
      end: 3,
      atStart: true,
    }, 5, shiftKey)).to.deep.equal({
      start: 3,
      end: 3,
      atStart: false,
    });
  });

  it('should moveTo', function() {
    expect(Selection.moveTo({
      start: 0,
      end: 0,
      atStart: false,
    }, 2, 5, noKeys)).to.deep.equal({
      start: 2,
      end: 2,
      atStart: false,
    });

    expect(Selection.moveTo({
      start: 2,
      end: 3,
      atStart: false,
    }, 2, 5, noKeys)).to.deep.equal({
      start: 2,
      end: 2,
      atStart: false,
    });

    expect(Selection.moveTo({
      start: 2,
      end: 3,
      atStart: true,
    }, 2, 5, noKeys)).to.deep.equal({
      start: 2,
      end: 2,
      atStart: false,
    });

    expect(Selection.moveTo({
      start: 2,
      end: 3,
      atStart: true,
    }, -1, 5, noKeys)).to.deep.equal({
      start: 0,
      end: 0,
      atStart: false,
    });

    expect(Selection.moveTo({
      start: 2,
      end: 3,
      atStart: true,
    }, 6, 5, noKeys)).to.deep.equal({
      start: 5,
      end: 5,
      atStart: false,
    });
  });

  it('should moveTo with shift key', function() {
    expect(Selection.moveTo({
      start: 2,
      end: 3,
      atStart: false,
    }, 6, 5, shiftKey)).to.deep.equal({
      start: 2,
      end: 5,
      atStart: false,
    });

    expect(Selection.moveTo({
      start: 2,
      end: 3,
      atStart: true,
    }, 5, 5, shiftKey)).to.deep.equal({
      start: 3,
      end: 5,
      atStart: false,
    });

    expect(Selection.moveTo({
      start: 2,
      end: 3,
      atStart: false,
    }, 5, 5, shiftKey)).to.deep.equal({
      start: 2,
      end: 5,
      atStart: false,
    });

    expect(Selection.moveTo({
      start: 2,
      end: 3,
      atStart: false,
    }, 0, 5, shiftKey)).to.deep.equal({
      start: 0,
      end: 2,
      atStart: true,
    });
  });
});
