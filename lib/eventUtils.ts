/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import * as React from 'react';

type SyntheticEvent = React.SyntheticEvent<any>;

function isNumber(val): val is number {
  return (typeof val === 'number') && isFinite(val);
}

export function eventPageX(e) : {x: number, y: number} | null {
  if (isNumber(e.pageX)) {
    return {x: e.pageX, y: e.pageY};
  }
  if (e.changedTouches && e.changedTouches.length) {
    return {x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY};
  }
  if (isNumber(e.clientX)) {
    return {x: e.clientX, y: e.clientY};
  }
  return null;
}

function isSyntheticEvent(e): e is SyntheticEvent {
  return !!e.nativeEvent;
}

export function stopPropagation(e?: Event | SyntheticEvent, stopImmediatePropagation = false): void {
  if (e) {
    e.stopPropagation();
    if (stopImmediatePropagation) {
      if (isSyntheticEvent(e)) {
        e.nativeEvent.stopImmediatePropagation();
      } else {
        e.stopImmediatePropagation();
      }
    }
  }
}

export function eatEvent(e ?: Event | SyntheticEvent, stopImmediatePropagation = false): void {
  if (e) {
    e.preventDefault();
    stopPropagation(e, stopImmediatePropagation);
  }
}
