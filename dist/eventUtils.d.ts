/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/
import * as React from 'react';
declare type SyntheticEvent = React.SyntheticEvent<any>;
export declare function eventPageX(e: any): {
    x: number;
    y: number;
} | null;
export declare function stopPropagation(e?: Event | SyntheticEvent, stopImmediatePropagation?: boolean): void;
export declare function eatEvent(e?: Event | SyntheticEvent, stopImmediatePropagation?: boolean): void;
export {};
