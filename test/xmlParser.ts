/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { Stash } from 'amper-utils/dist/types';
import { Parser } from 'xml2js';

export interface ParseObject {
  '#name': string;
  _children: ParseObject[] | null;
  _attr: Stash | null;
  _: string | undefined;
}

const parser = new Parser({
  explicitArray: true,
  explicitChildren: true,
  preserveChildrenOrder: true,
  attrkey: '_attr',
  childkey: '_children',
});

export function parse(text: string): ParseObject | string {
  let obj;
  try {
    parser.parseString(text, function(err, result) {
      if (err) {
        if (typeof(err) === 'string') {
          throw new Error(err);
        } else {
          throw new Error('Unknown error while parsing xml');
        }
      }
      if (!result) {
        throw new Error('Unable to parse xml');
      }
      obj = result;
      const keys = Object.keys(obj);
      if (keys.length !== 1) {
        throw new Error('Unexpected structure from xml');
      }
      obj = obj[keys[0]]; // jump to the root object
    });
  } catch (e) {
    return e.message;
  }
  return obj;
}

// converts a ParseObject back to an xml string
export function rebuildXML(obj: ParseObject, indent: string = ''): string {
  let str = indent + '<' + obj['#name'];
  if (obj._attr) {
    for (const key in obj._attr) {
      str += ` ${key}='${obj._attr[key]}'`;
    }
  }
  if (obj._children) {
    str += '>\n';
    for (const child of obj._children) {
      str += rebuildXML(child, indent + '  ') + '\n';
    }
    str += indent + '</' + obj['#name'] + '>';
  } else if (obj._) {
    str += '>' + obj._ + '</' + obj['#name'] + '>';
  } else {
    str += '/>';
  }

  return str;
}
