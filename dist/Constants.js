"use strict";
/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIXEL_RATIO = 1;
if ('devicePixelRatio' in window && window.devicePixelRatio > 1) {
    exports.PIXEL_RATIO = window.devicePixelRatio;
}
exports.TREE_WALKER_CB_RESULT = Object.freeze({
    CONTINUE: 'continue',
    DONT_DESCEND: 'dont_descend',
    DONE: 'done',
});
