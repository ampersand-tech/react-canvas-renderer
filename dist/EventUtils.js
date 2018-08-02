"use strict";
/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
function isNumber(val) {
    return (typeof val === 'number') && isFinite(val);
}
function eventPageX(e) {
    if (isNumber(e.pageX)) {
        return { x: e.pageX, y: e.pageY };
    }
    if (e.changedTouches && e.changedTouches.length) {
        return { x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
    }
    if (isNumber(e.clientX)) {
        return { x: e.clientX, y: e.clientY };
    }
    return null;
}
exports.eventPageX = eventPageX;
function isSyntheticEvent(e) {
    return !!e.nativeEvent;
}
function stopPropagation(e, stopImmediatePropagation) {
    if (stopImmediatePropagation === void 0) { stopImmediatePropagation = false; }
    if (e) {
        e.stopPropagation();
        if (stopImmediatePropagation) {
            if (isSyntheticEvent(e)) {
                e.nativeEvent.stopImmediatePropagation();
            }
            else {
                e.stopImmediatePropagation();
            }
        }
    }
}
exports.stopPropagation = stopPropagation;
function eatEvent(e, stopImmediatePropagation) {
    if (stopImmediatePropagation === void 0) { stopImmediatePropagation = false; }
    if (e) {
        e.preventDefault();
        stopPropagation(e, stopImmediatePropagation);
    }
}
exports.eatEvent = eatEvent;
