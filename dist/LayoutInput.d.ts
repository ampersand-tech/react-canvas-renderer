/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
export interface InputProps {
    getSelectedText?: () => string;
    deleteSelection?: () => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    onKeyUp?: (e: KeyboardEvent) => void;
    onKeyPress?: (e: KeyboardEvent) => void;
    onPaste?: (text: string) => void;
    onBlur?: () => void;
}
export declare class LayoutInput {
    private inputElem;
    private props;
    constructor();
    destructor(): void;
    setProps(props: any): void;
    hasFocus: () => boolean;
    setFocus: () => void;
    private restoreSelection;
    private handleKeyDown;
    private handleKeyUp;
    private handleKeyPress;
    private handleBlur;
    private handleCut;
    private handleCopy;
    private handlePaste;
    private deleteSelection;
}
export declare function blurSelected(): void;
