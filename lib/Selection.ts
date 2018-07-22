/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

export interface Selection {
  start: number;
  end: number;
  atStart: boolean;
}

interface KeyState {
  shiftKey: boolean;
  metaKey: boolean;
}

export function moveBack(sel: Readonly<Selection>, textLen: number, keys: KeyState): Selection {
  if (keys.shiftKey) {
    return moveTo(sel, (sel.atStart ? sel.start : sel.end) - 1, textLen, keys);
  }

  let selStart = sel.start;
  if (selStart === sel.end) {
    selStart = Math.max(selStart - 1, 0);
  }
  return {
    start: selStart,
    end: selStart,
    atStart: false,
  };
}

export function moveForward(sel: Readonly<Selection>, textLen: number, keys: KeyState): Selection {
  if (keys.shiftKey) {
    return moveTo(sel, (sel.atStart ? sel.start : sel.end) + 1, textLen, keys);
  }

  let selEnd = sel.end;
  if (sel.start === selEnd) {
    selEnd = Math.min(selEnd + 1, textLen);
  }
  return {
    start: selEnd,
    end: selEnd,
    atStart: false,
  };
}

export function moveTo(sel: Readonly<Selection>, pos: number, textLen: number, keys: KeyState): Selection {
  pos = Math.max(Math.min(pos, textLen), 0);

  if (keys.shiftKey) {
    const anchorPos = sel.atStart ? sel.end : sel.start;
    if (pos < anchorPos) {
      return {
        start: pos,
        end: anchorPos,
        atStart: true,
      };
    } else {
      return {
        start: anchorPos,
        end: pos,
        atStart: false,
      };
    }
  }

  return {
    start: pos,
    end: pos,
    atStart: false,
  };
}
