/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import * as Util from 'overlib/client/clientUtil';

export interface InputProps {
  getSelectedText?: () => string;
  deleteSelection?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onKeyPress?: (e: KeyboardEvent) => void;
  onPaste?: (text: string) => void;
  onBlur?: () => void;
}

export class LayoutInput {
  private inputElem: HTMLInputElement;
  private props: InputProps = {};

  constructor() {
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

  public destructor() {
    this.inputElem.removeEventListener('keydown', this.handleKeyDown, true);
    this.inputElem.removeEventListener('keypress', this.handleKeyPress, true);
    this.inputElem.removeEventListener('keyup', this.handleKeyUp, true);
    this.inputElem.removeEventListener('blur', this.handleBlur, true);
    this.inputElem.removeEventListener('cut', this.handleCut, true);
    this.inputElem.removeEventListener('copy', this.handleCopy, true);
    this.inputElem.removeEventListener('paste', this.handlePaste, true);
    this.inputElem.removeEventListener('input', this.deleteSelection, true);
    document.body.removeChild(this.inputElem);
  }

  public setProps(props: any) {
    if (Util.isObject(props)) {
      this.props = props;
    }
  }

  public hasFocus = (): boolean => {
    const curElement = document.activeElement;
    return this.inputElem === curElement || this.inputElem.contains(curElement);
  }

  public setFocus = () => {
    // cannot get a copy or paste event without text selected, so put some text in the box and select it
    this.inputElem.focus();
    this.restoreSelection();
  }

  private restoreSelection() {
    this.inputElem.value = ' ';
    this.inputElem.select();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    Util.eatEvent(e);

    this.props.onKeyDown && this.props.onKeyDown(e);
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    Util.eatEvent(e);
    this.props.onKeyUp && this.props.onKeyUp(e);
    this.restoreSelection();
  }

  private handleKeyPress = (e: KeyboardEvent) => {
    Util.eatEvent(e);
    this.props.onKeyPress && this.props.onKeyPress(e);
    this.restoreSelection();
  }

  private handleBlur = (e: FocusEvent) => {
    Util.eatEvent(e);
    this.props.onBlur && this.props.onBlur();
  }

  private handleCut = (e: ClipboardEvent) => {
    Util.eatEvent(e);

    this.handleCopy(e);
    this.deleteSelection(e);
  }

  private handleCopy = (e: ClipboardEvent) => {
    Util.eatEvent(e);

    const clipboardData = e.clipboardData || (window as any).clipboardData;
    if (clipboardData) {
      const text = this.props.getSelectedText ? this.props.getSelectedText() : '';
      clipboardData.setData('text/plain', text);
    }
  }

  private handlePaste = (e: ClipboardEvent) => {
    Util.eatEvent(e);
    this.restoreSelection();

    if (!e || !e.clipboardData || !e.clipboardData.getData || !e.clipboardData.items || !e.clipboardData.items.length) {
      return;
    }
    // turns out OS X cut-and-paste has plain text, html text, rtf text and an image *of the text*
    // pure image cut-and-paste just has the image, so look for markup first, then plain text
    if (e.clipboardData.types.indexOf('text/plain') >= 0) {
      const text = e.clipboardData.getData('text/plain');
      this.props.onPaste && this.props.onPaste(text);
    }
  }

  private deleteSelection = (e: Event) => {
    Util.eatEvent(e);

    if (this.inputElem.textContent === '') {
      this.props.deleteSelection && this.props.deleteSelection();
    }
    this.restoreSelection();
  }
}

export function blurSelected() {
  const curElement = document.activeElement as (HTMLInputElement | undefined);
  curElement && curElement.blur && curElement.blur();
}
