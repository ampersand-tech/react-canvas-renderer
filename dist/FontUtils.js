"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var StyleElements = { fontStyle: 1, fontWeight: 1, fontSizeStr: 1, fontFamily: 1 };
function fontObj2LegitString(style) {
    var retVal = [];
    for (var id in StyleElements) {
        if (style[id]) {
            retVal.push(style[id]);
        }
    }
    return retVal.join(' ');
}
exports.fontObj2LegitString = fontObj2LegitString;
