"use strict";
/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var EventUtils = require("./EventUtils");
var ObjUtils = require("amper-utils/dist2017/objUtils");
var LayoutInput = /** @class */ (function () {
    function LayoutInput() {
        var _this = this;
        this.props = {};
        this.hasFocus = function () {
            var curElement = document.activeElement;
            return _this.inputElem === curElement || _this.inputElem.contains(curElement);
        };
        this.setFocus = function () {
            // cannot get a copy or paste event without text selected, so put some text in the box and select it
            _this.inputElem.focus();
            _this.restoreSelection();
        };
        this.handleKeyDown = function (e) {
            EventUtils.eatEvent(e);
            _this.props.onKeyDown && _this.props.onKeyDown(e);
        };
        this.handleKeyUp = function (e) {
            EventUtils.eatEvent(e);
            _this.props.onKeyUp && _this.props.onKeyUp(e);
            _this.restoreSelection();
        };
        this.handleKeyPress = function (e) {
            EventUtils.eatEvent(e);
            _this.props.onKeyPress && _this.props.onKeyPress(e);
            _this.restoreSelection();
        };
        this.handleBlur = function (e) {
            EventUtils.eatEvent(e);
            _this.props.onBlur && _this.props.onBlur();
        };
        this.handleCut = function (e) {
            EventUtils.eatEvent(e);
            _this.handleCopy(e);
            _this.deleteSelection(e);
        };
        this.handleCopy = function (e) {
            EventUtils.eatEvent(e);
            var clipboardData = e.clipboardData || window.clipboardData;
            if (clipboardData) {
                var text = _this.props.getSelectedText ? _this.props.getSelectedText() : '';
                clipboardData.setData('text/plain', text);
            }
        };
        this.handlePaste = function (e) {
            EventUtils.eatEvent(e);
            _this.restoreSelection();
            if (!e || !e.clipboardData || !e.clipboardData.getData || !e.clipboardData.items || !e.clipboardData.items.length) {
                return;
            }
            // turns out OS X cut-and-paste has plain text, html text, rtf text and an image *of the text*
            // pure image cut-and-paste just has the image, so look for markup first, then plain text
            if (e.clipboardData.types.indexOf('text/plain') >= 0) {
                var text = e.clipboardData.getData('text/plain');
                _this.props.onPaste && _this.props.onPaste(text);
            }
        };
        this.deleteSelection = function (e) {
            EventUtils.eatEvent(e);
            if (_this.inputElem.textContent === '') {
                _this.props.deleteSelection && _this.props.deleteSelection();
            }
            _this.restoreSelection();
        };
        this.inputElem = document.createElement('input');
        this.inputElem.style.position = 'fixed';
        this.inputElem.style.top = '-9000px';
        this.inputElem.style.opacity = '0';
        this.inputElem.addEventListener('keydown', this.handleKeyDown, true);
        this.inputElem.addEventListener('keypress', this.handleKeyPress, true);
        this.inputElem.addEventListener('keyup', this.handleKeyUp, true);
        this.inputElem.addEventListener('blur', this.handleBlur, true);
        this.inputElem.addEventListener('cut', this.handleCut, true);
        this.inputElem.addEventListener('copy', this.handleCopy, true);
        this.inputElem.addEventListener('paste', this.handlePaste, true);
        this.inputElem.addEventListener('input', this.deleteSelection, true);
        document.body.appendChild(this.inputElem);
    }
    LayoutInput.prototype.destructor = function () {
        this.inputElem.removeEventListener('keydown', this.handleKeyDown, true);
        this.inputElem.removeEventListener('keypress', this.handleKeyPress, true);
        this.inputElem.removeEventListener('keyup', this.handleKeyUp, true);
        this.inputElem.removeEventListener('blur', this.handleBlur, true);
        this.inputElem.removeEventListener('cut', this.handleCut, true);
        this.inputElem.removeEventListener('copy', this.handleCopy, true);
        this.inputElem.removeEventListener('paste', this.handlePaste, true);
        this.inputElem.removeEventListener('input', this.deleteSelection, true);
        document.body.removeChild(this.inputElem);
    };
    LayoutInput.prototype.setProps = function (props) {
        if (ObjUtils.isObject(props)) {
            this.props = props;
        }
    };
    LayoutInput.prototype.restoreSelection = function () {
        this.inputElem.value = ' ';
        this.inputElem.select();
    };
    return LayoutInput;
}());
exports.LayoutInput = LayoutInput;
function blurSelected() {
    var curElement = document.activeElement;
    curElement && curElement.blur && curElement.blur();
}
exports.blurSelected = blurSelected;
