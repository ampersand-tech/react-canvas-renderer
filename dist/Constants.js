"use strict";
/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIXEL_RATIO = 1;
try {
    if ('devicePixelRatio' in window && window.devicePixelRatio > 1) {
        exports.PIXEL_RATIO = window.devicePixelRatio;
    }
}
catch (_ex) {
}
exports.TREE_WALKER_CB_RESULT = Object.freeze({
    CONTINUE: 'continue',
    DONT_DESCEND: 'dont_descend',
    DONE: 'done',
});
