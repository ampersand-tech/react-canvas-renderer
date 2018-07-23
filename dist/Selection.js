"use strict";
/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
function moveBack(sel, textLen, keys) {
    if (keys.shiftKey) {
        return moveTo(sel, (sel.atStart ? sel.start : sel.end) - 1, textLen, keys);
    }
    var selStart = sel.start;
    if (selStart === sel.end) {
        selStart = Math.max(selStart - 1, 0);
    }
    return {
        start: selStart,
        end: selStart,
        atStart: false,
    };
}
exports.moveBack = moveBack;
function moveForward(sel, textLen, keys) {
    if (keys.shiftKey) {
        return moveTo(sel, (sel.atStart ? sel.start : sel.end) + 1, textLen, keys);
    }
    var selEnd = sel.end;
    if (sel.start === selEnd) {
        selEnd = Math.min(selEnd + 1, textLen);
    }
    return {
        start: selEnd,
        end: selEnd,
        atStart: false,
    };
}
exports.moveForward = moveForward;
function moveTo(sel, pos, textLen, keys) {
    pos = Math.max(Math.min(pos, textLen), 0);
    if (keys.shiftKey) {
        var anchorPos = sel.atStart ? sel.end : sel.start;
        if (pos < anchorPos) {
            return {
                start: pos,
                end: anchorPos,
                atStart: true,
            };
        }
        else {
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
exports.moveTo = moveTo;
