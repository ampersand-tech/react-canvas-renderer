"use strict";
/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var FlexLayout_1 = require("./FlexLayout");
var LayoutDrawable_1 = require("./LayoutDrawable");
var LayoutInput_1 = require("./LayoutInput");
var LayoutNode_1 = require("./LayoutNode");
var LayoutTypes_1 = require("./LayoutTypes");
var SimpleLayout_1 = require("./SimpleLayout");
var arrayUtils_1 = require("amper-utils/dist2017/arrayUtils");
var emptyObject = require("fbjs/lib/emptyObject");
var ReactFiberReconciler = require("react-reconciler");
var DEBUG = false;
var RENDERER_VERSION = '1.0';
var UPDATE_SIGNAL = {};
var gScheduledCallback = null;
function getTextContent(children) {
    if (typeof children === 'string' || typeof children === 'number') {
        return children.toString();
    }
    return undefined;
}
function extractDataProps(props) {
    var dataProps = {};
    for (var key in props) {
        if (key.slice(0, 5) === 'data-') {
            var dataKey = key.slice(5);
            if (dataKey !== 'font' && dataKey !== 'anims' && dataKey !== 'cacheable') {
                dataProps[dataKey] = props[key];
            }
        }
    }
    return dataProps;
}
function insertBefore(parent, child, beforeNode) {
    if (DEBUG) {
        debugger;
    }
    child.removeFromParent();
    if (child.dataProps.parentTo instanceof LayoutNode_1.LayoutNode) {
        child.dataProps.parentTo.addChild(child);
        child.setPositionParent(parent);
    }
    else {
        parent.addChild(child, beforeNode);
        child.setPositionParent(undefined);
    }
}
function appendChild(parent, child) {
    insertBefore(parent, child);
}
function removeChild(_parent, child) {
    if (DEBUG) {
        debugger;
    }
    child.unmount();
}
function getLayoutBehavior(type, className, text) {
    if (text) {
        return '';
    }
    if (type === 'span') {
        return 'SRow';
    }
    if (type !== 'div') {
        return '';
    }
    var classes = className.split(' ');
    if (classes.indexOf('flexRow') >= 0) {
        return 'FRow';
    }
    if (classes.indexOf('flexCol') >= 0) {
        return 'FCol';
    }
    return 'SCol';
}
function createLayoutBehavior(behavior) {
    switch (behavior) {
        case 'FRow':
            return new FlexLayout_1.FlexLayout(LayoutTypes_1.Direction.Row);
        case 'FCol':
            return new FlexLayout_1.FlexLayout(LayoutTypes_1.Direction.Column);
        case 'SRow':
            return new SimpleLayout_1.SimpleLayout(LayoutTypes_1.Direction.Row);
        case 'SCol':
            return new SimpleLayout_1.SimpleLayout(LayoutTypes_1.Direction.Column);
    }
}
function convertSvgChildren(incChildren) {
    if (!incChildren) {
        return undefined;
    }
    var children = arrayUtils_1.forceArray(incChildren);
    if (!children.length) {
        return undefined;
    }
    var paths = [];
    for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
        var child = children_1[_i];
        if (child.type === 'path') {
            paths.push({
                path: child.props.d,
                strokeWidth: child.props['stroke-width'],
                opacity: child.props.opacity ? Number(child.props.opacity) : undefined,
                fillRule: child.props['fill-rule'],
            });
        }
    }
    return paths.length ? paths : undefined;
}
var LayoutRenderer = ReactFiberReconciler({
    shouldSetTextContent: function (type, props) {
        if (DEBUG) {
            debugger;
        }
        if (type === 'svg') {
            // don't create LayoutNodes for svg children
            return true;
        }
        return getTextContent(props.children) !== undefined;
    },
    createInstance: function (type, props) {
        if (DEBUG) {
            debugger;
        }
        var node = new LayoutNode_1.LayoutNode();
        var drawable;
        var style = props.style || {};
        if (type === 'img') {
            drawable = new LayoutDrawable_1.ImageDrawable(node, props.src);
            node.setContent([drawable]);
        }
        else if (type === 'svg') {
            drawable = new LayoutDrawable_1.SVGDrawable(node, props.name, style.stroke, style.fill, Number(props.width) || 0, Number(props.height) || 0, convertSvgChildren(props.children));
            node.setContent([drawable]);
        }
        else if (type === 'input') {
            node.input = new LayoutInput_1.LayoutInput();
            node.input.setProps(props['data-input']);
        }
        var text = getTextContent(props.children);
        node.setLayoutBehavior(createLayoutBehavior(getLayoutBehavior(type, props.className || '', text)));
        node.setStyle(style, (props.className || '').split(' '));
        node.dataProps = extractDataProps(props);
        node.onClick = props.onClick;
        node.onLongPress = props.onLongPress;
        node.setCacheable(Boolean(props['data-cacheable']));
        if (!drawable && text) {
            node.setTextContent(text);
        }
        var anims = props['data-anims'] || [];
        for (var _i = 0, anims_1 = anims; _i < anims_1.length; _i++) {
            var animDef = anims_1[_i];
            node.addAnimation(animDef);
        }
        node.setUnmountAnimations(props['data-unmountAnims'] || []);
        return node;
    },
    createTextInstance: function (text, _rootNode, _hostContext, _internalInstanceHandle) {
        if (DEBUG) {
            debugger;
        }
        var node = new LayoutNode_1.LayoutNode();
        node.setTextContent(text);
        return node;
    },
    appendInitialChild: function (parent, child) {
        insertBefore(parent, child);
    },
    finalizeInitialChildren: function (_node, _type, _props) {
        return false;
    },
    getRootHostContext: function () {
        return emptyObject;
    },
    getChildHostContext: function () {
        return emptyObject;
    },
    getPublicInstance: function (instance) {
        return instance;
    },
    prepareUpdate: function (_node, _type, _oldProps, _newProps) {
        return UPDATE_SIGNAL;
    },
    shouldDeprioritizeSubtree: function (_type, props) {
        return !!props.hidden;
    },
    now: Date.now,
    scheduleDeferredCallback: function (callback) {
        if (DEBUG) {
            debugger;
        }
        if (gScheduledCallback) {
            throw new Error('Scheduling a callback twice is excessive. Instead, keep track of whether the callback has already been scheduled.');
        }
        gScheduledCallback = callback;
        requestAnimationFrame(flushRendering);
    },
    prepareForCommit: function () { },
    resetAfterCommit: function () { },
    mutation: {
        commitMount: function (_node, _type, _newProps) {
            // Noop
            if (DEBUG) {
                debugger;
            }
        },
        commitUpdate: function (node, _updatePayload, type, oldProps, newProps) {
            if (DEBUG) {
                debugger;
            }
            var newStyle = newProps.style || {};
            if (type === 'img') {
                var drawable = new LayoutDrawable_1.ImageDrawable(node, newProps.src);
                node.setContent([drawable]);
            }
            else if (type === 'svg') {
                var drawable = new LayoutDrawable_1.SVGDrawable(node, newProps.name, newStyle.stroke, newStyle.fill, Number(newProps.width) || 0, Number(newProps.height) || 0, convertSvgChildren(newProps.children));
                node.setContent([drawable]);
            }
            var oldText = getTextContent(oldProps.children);
            var newText = getTextContent(newProps.children);
            if ((type === 'div' || type === 'span') && (oldText !== newText)) {
                if (newText) {
                    node.setTextContent(newText);
                }
                else {
                    node.setContent([]);
                }
            }
            var oldBehavior = getLayoutBehavior(type, oldProps.className || '', oldText);
            var newBehavior = getLayoutBehavior(type, newProps.className || '', newText);
            if (oldBehavior !== newBehavior) {
                node.setLayoutBehavior(createLayoutBehavior(newBehavior));
            }
            var oldAnims = oldProps['data-anims'] || [];
            var newAnims = newProps['data-anims'] || [];
            updateAnimations(node, oldAnims, newAnims);
            node.setUnmountAnimations(newProps['data-unmountAnims'] || []);
            node.setStyle(newStyle, (newProps.className || '').split(' '));
            node.dataProps = extractDataProps(newProps);
            node.onClick = newProps.onClick;
            node.onLongPress = newProps.onLongPress;
            node.setCacheable(Boolean(newProps['data-cacheable']));
            if (node.input) {
                node.input.setProps(newProps['data-input']);
            }
        },
        commitTextUpdate: function (node, _oldText, newText) {
            if (DEBUG) {
                debugger;
            }
            node.setTextContent(newText);
        },
        appendChild: appendChild,
        appendChildToContainer: appendChild,
        insertBefore: insertBefore,
        insertInContainerBefore: insertBefore,
        removeChild: removeChild,
        removeChildFromContainer: removeChild,
        resetTextContent: function (node) {
            if (DEBUG) {
                debugger;
            }
            node.setContent([]);
        },
    },
});
function updateAnimations(node, oldAnims, newAnims) {
    // Cancel all animations with keys that are in the set oldProps - newProps
    for (var _i = 0, oldAnims_1 = oldAnims; _i < oldAnims_1.length; _i++) {
        var oldAnim = oldAnims_1[_i];
        if (!oldAnim.key) {
            continue;
        }
        var removeOldAnimation = true;
        for (var _a = 0, newAnims_1 = newAnims; _a < newAnims_1.length; _a++) {
            var newAnim = newAnims_1[_a];
            if (newAnim.key === oldAnim.key) {
                removeOldAnimation = false;
            }
        }
        if (removeOldAnimation) {
            node.removeAnimationWithKey(oldAnim.key);
        }
    }
    // Play all animations with keys that are in the set newProps - oldProps
    for (var _b = 0, newAnims_2 = newAnims; _b < newAnims_2.length; _b++) {
        var newAnim = newAnims_2[_b];
        if (!newAnim.key) {
            continue;
        }
        var addNewAnimation = true;
        for (var _c = 0, oldAnims_2 = oldAnims; _c < oldAnims_2.length; _c++) {
            var oldAnim = oldAnims_2[_c];
            if (oldAnim.key === newAnim.key) {
                addNewAnimation = false;
            }
        }
        if (addNewAnimation) {
            node.addAnimation(newAnim);
        }
    }
}
function findFiberForLayoutNode(node) {
    return node.getRootFiber();
}
function injectIntoDevTools(isProductionMode) {
    LayoutRenderer.injectIntoDevTools({
        findFiberByHostInstance: findFiberForLayoutNode,
        bundleType: isProductionMode ? 0 : 1,
        version: RENDERER_VERSION,
        rendererPackageName: 'LayoutRenderer',
    });
}
exports.injectIntoDevTools = injectIntoDevTools;
function flushRendering() {
    while (gScheduledCallback) {
        var cb = gScheduledCallback;
        gScheduledCallback = null;
        cb({
            timeRemaining: function () {
                return 999;
            },
        });
    }
}
exports.flushRendering = flushRendering;
function renderToLayout(rootNode, rootElement, parentNode, dataProps) {
    if (!rootNode) {
        rootNode = new LayoutNode_1.LayoutNode(new SimpleLayout_1.SimpleLayout(LayoutTypes_1.Direction.Column));
        rootNode.reactFiber = LayoutRenderer.createContainer(rootNode);
    }
    LayoutRenderer.updateContainer(rootElement, rootNode.reactFiber, null);
    flushRendering();
    if (parentNode) {
        rootNode.setParent(parentNode);
    }
    if (dataProps) {
        rootNode.dataProps = dataProps;
    }
    return rootNode;
}
exports.renderToLayout = renderToLayout;
function unmountLayoutNode(node) {
    LayoutRenderer.updateContainer(null, node.reactFiber, null);
}
exports.unmountLayoutNode = unmountLayoutNode;
try {
    var origGetComputedStyle_1 = window.getComputedStyle;
    window.getComputedStyle = function (elt, pseudoElt) {
        if (elt instanceof LayoutNode_1.LayoutNode) {
            return elt.getComputedStyle();
        }
        return origGetComputedStyle_1(elt, pseudoElt);
    };
}
catch (_ex) {
}
