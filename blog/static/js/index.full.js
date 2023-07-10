(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global['@hpcc-js/observable-md'] = {}));
}(this, (function (exports) { 'use strict';

  const PKG_NAME = "@hpcc-js/observable-md";
  const PKG_VERSION = "2.50.0";
  const BUILD_VERSION = "2.99.0";

  function dispatch(node, type, detail) {
    detail = detail || {};
    var document = node.ownerDocument, event = document.defaultView.CustomEvent;
    if (typeof event === "function") {
      event = new event(type, {detail: detail});
    } else {
      event = document.createEvent("Event");
      event.initEvent(type, false, false);
      event.detail = detail;
    }
    node.dispatchEvent(event);
  }

  // TODO https://twitter.com/mbostock/status/702737065121742848
  function isarray(value) {
    return Array.isArray(value)
        || value instanceof Int8Array
        || value instanceof Int16Array
        || value instanceof Int32Array
        || value instanceof Uint8Array
        || value instanceof Uint8ClampedArray
        || value instanceof Uint16Array
        || value instanceof Uint32Array
        || value instanceof Float32Array
        || value instanceof Float64Array;
  }

  // Non-integer keys in arrays, e.g. [1, 2, 0.5: "value"].
  function isindex(key) {
    return key === (key | 0) + "";
  }

  function inspectName(name) {
    const n = document.createElement("span");
    n.className = "observablehq--cellname";
    n.textContent = `${name} = `;
    return n;
  }

  const symbolToString = Symbol.prototype.toString;

  // Symbols do not coerce to strings; they must be explicitly converted.
  function formatSymbol(symbol) {
    return symbolToString.call(symbol);
  }

  const {getOwnPropertySymbols, prototype: {hasOwnProperty}} = Object;
  const {toStringTag} = Symbol;

  const FORBIDDEN = {};

  const symbolsof = getOwnPropertySymbols;

  function isown(object, key) {
    return hasOwnProperty.call(object, key);
  }

  function tagof(object) {
    return object[toStringTag]
        || (object.constructor && object.constructor.name)
        || "Object";
  }

  function valueof(object, key) {
    try {
      const value = object[key];
      if (value) value.constructor; // Test for SecurityError.
      return value;
    } catch (ignore) {
      return FORBIDDEN;
    }
  }

  const SYMBOLS = [
    { symbol: "@@__IMMUTABLE_INDEXED__@@", name: "Indexed", modifier: true },
    { symbol: "@@__IMMUTABLE_KEYED__@@", name: "Keyed", modifier: true },
    { symbol: "@@__IMMUTABLE_LIST__@@", name: "List", arrayish: true },
    { symbol: "@@__IMMUTABLE_MAP__@@", name: "Map" },
    {
      symbol: "@@__IMMUTABLE_ORDERED__@@",
      name: "Ordered",
      modifier: true,
      prefix: true
    },
    { symbol: "@@__IMMUTABLE_RECORD__@@", name: "Record" },
    {
      symbol: "@@__IMMUTABLE_SET__@@",
      name: "Set",
      arrayish: true,
      setish: true
    },
    { symbol: "@@__IMMUTABLE_STACK__@@", name: "Stack", arrayish: true }
  ];

  function immutableName(obj) {
    try {
      let symbols = SYMBOLS.filter(({ symbol }) => obj[symbol] === true);
      if (!symbols.length) return;

      const name = symbols.find(s => !s.modifier);
      const prefix =
        name.name === "Map" && symbols.find(s => s.modifier && s.prefix);

      const arrayish = symbols.some(s => s.arrayish);
      const setish = symbols.some(s => s.setish);

      return {
        name: `${prefix ? prefix.name : ""}${name.name}`,
        symbols,
        arrayish: arrayish && !setish,
        setish
      };
    } catch (e) {
      return null;
    }
  }

  const {getPrototypeOf, getOwnPropertyDescriptors} = Object;
  const objectPrototype = getPrototypeOf({});

  function inspectExpanded(object, _, name, proto) {
    let arrayish = isarray(object);
    let tag, fields, next, n;

    if (object instanceof Map) {
      if (object instanceof object.constructor) {
        tag = `Map(${object.size})`;
        fields = iterateMap;
      } else { // avoid incompatible receiver error for prototype
        tag = "Map()";
        fields = iterateObject;
      }
    } else if (object instanceof Set) {
      if (object instanceof object.constructor) {
        tag = `Set(${object.size})`;
        fields = iterateSet;
      } else { // avoid incompatible receiver error for prototype
        tag = "Set()";
        fields = iterateObject;
      }
    } else if (arrayish) {
      tag = `${object.constructor.name}(${object.length})`;
      fields = iterateArray;
    } else if ((n = immutableName(object))) {
      tag = `Immutable.${n.name}${n.name === "Record" ? "" : `(${object.size})`}`;
      arrayish = n.arrayish;
      fields = n.arrayish
        ? iterateImArray
        : n.setish
        ? iterateImSet
        : iterateImObject;
    } else if (proto) {
      tag = tagof(object);
      fields = iterateProto;
    } else {
      tag = tagof(object);
      fields = iterateObject;
    }

    const span = document.createElement("span");
    span.className = "observablehq--expanded";
    if (name) {
      span.appendChild(inspectName(name));
    }
    const a = span.appendChild(document.createElement("a"));
    a.innerHTML = `<svg width=8 height=8 class='observablehq--caret'>
    <path d='M4 7L0 1h8z' fill='currentColor' />
  </svg>`;
    a.appendChild(document.createTextNode(`${tag}${arrayish ? " [" : " {"}`));
    a.addEventListener("mouseup", function(event) {
      event.stopPropagation();
      replace(span, inspectCollapsed(object, null, name, proto));
    });

    fields = fields(object);
    for (let i = 0; !(next = fields.next()).done && i < 20; ++i) {
      span.appendChild(next.value);
    }

    if (!next.done) {
      const a = span.appendChild(document.createElement("a"));
      a.className = "observablehq--field";
      a.style.display = "block";
      a.appendChild(document.createTextNode(`  … more`));
      a.addEventListener("mouseup", function(event) {
        event.stopPropagation();
        span.insertBefore(next.value, span.lastChild.previousSibling);
        for (let i = 0; !(next = fields.next()).done && i < 19; ++i) {
          span.insertBefore(next.value, span.lastChild.previousSibling);
        }
        if (next.done) span.removeChild(span.lastChild.previousSibling);
        dispatch(span, "load");
      });
    }

    span.appendChild(document.createTextNode(arrayish ? "]" : "}"));

    return span;
  }

  function* iterateMap(map) {
    for (const [key, value] of map) {
      yield formatMapField(key, value);
    }
    yield* iterateObject(map);
  }

  function* iterateSet(set) {
    for (const value of set) {
      yield formatSetField(value);
    }
    yield* iterateObject(set);
  }

  function* iterateImSet(set) {
    for (const value of set) {
      yield formatSetField(value);
    }
  }

  function* iterateArray(array) {
    for (let i = 0, n = array.length; i < n; ++i) {
      if (i in array) {
        yield formatField(i, valueof(array, i), "observablehq--index");
      }
    }
    for (const key in array) {
      if (!isindex(key) && isown(array, key)) {
        yield formatField(key, valueof(array, key), "observablehq--key");
      }
    }
    for (const symbol of symbolsof(array)) {
      yield formatField(
        formatSymbol(symbol),
        valueof(array, symbol),
        "observablehq--symbol"
      );
    }
  }

  function* iterateImArray(array) {
    let i1 = 0;
    for (const n = array.size; i1 < n; ++i1) {
      yield formatField(i1, array.get(i1), true);
    }
  }

  function* iterateProto(object) {
    for (const key in getOwnPropertyDescriptors(object)) {
      yield formatField(key, valueof(object, key), "observablehq--key");
    }
    for (const symbol of symbolsof(object)) {
      yield formatField(
        formatSymbol(symbol),
        valueof(object, symbol),
        "observablehq--symbol"
      );
    }

    const proto = getPrototypeOf(object);
    if (proto && proto !== objectPrototype) {
      yield formatPrototype(proto);
    }
  }

  function* iterateObject(object) {
    for (const key in object) {
      if (isown(object, key)) {
        yield formatField(key, valueof(object, key), "observablehq--key");
      }
    }
    for (const symbol of symbolsof(object)) {
      yield formatField(
        formatSymbol(symbol),
        valueof(object, symbol),
        "observablehq--symbol"
      );
    }

    const proto = getPrototypeOf(object);
    if (proto && proto !== objectPrototype) {
      yield formatPrototype(proto);
    }
  }

  function* iterateImObject(object) {
    for (const [key, value] of object) {
      yield formatField(key, value, "observablehq--key");
    }
  }

  function formatPrototype(value) {
    const item = document.createElement("div");
    const span = item.appendChild(document.createElement("span"));
    item.className = "observablehq--field";
    span.className = "observablehq--prototype-key";
    span.textContent = `  <prototype>`;
    item.appendChild(document.createTextNode(": "));
    item.appendChild(inspect(value, undefined, undefined, undefined, true));
    return item;
  }

  function formatField(key, value, className) {
    const item = document.createElement("div");
    const span = item.appendChild(document.createElement("span"));
    item.className = "observablehq--field";
    span.className = className;
    span.textContent = `  ${key}`;
    item.appendChild(document.createTextNode(": "));
    item.appendChild(inspect(value));
    return item;
  }

  function formatMapField(key, value) {
    const item = document.createElement("div");
    item.className = "observablehq--field";
    item.appendChild(document.createTextNode("  "));
    item.appendChild(inspect(key));
    item.appendChild(document.createTextNode(" => "));
    item.appendChild(inspect(value));
    return item;
  }

  function formatSetField(value) {
    const item = document.createElement("div");
    item.className = "observablehq--field";
    item.appendChild(document.createTextNode("  "));
    item.appendChild(inspect(value));
    return item;
  }

  function hasSelection(elem) {
    const sel = window.getSelection();
    return (
      sel.type === "Range" &&
      (sel.containsNode(elem, true) ||
        sel.anchorNode.isSelfOrDescendant(elem) ||
        sel.focusNode.isSelfOrDescendant(elem))
    );
  }

  function inspectCollapsed(object, shallow, name, proto) {
    let arrayish = isarray(object);
    let tag, fields, next, n;

    if (object instanceof Map) {
      if (object instanceof object.constructor) {
        tag = `Map(${object.size})`;
        fields = iterateMap$1;
      } else { // avoid incompatible receiver error for prototype
        tag = "Map()";
        fields = iterateObject$1;
      }
    } else if (object instanceof Set) {
      if (object instanceof object.constructor) {
        tag = `Set(${object.size})`;
        fields = iterateSet$1;
      } else { // avoid incompatible receiver error for prototype
        tag = "Set()";
        fields = iterateObject$1;
      }
    } else if (arrayish) {
      tag = `${object.constructor.name}(${object.length})`;
      fields = iterateArray$1;
    } else if ((n = immutableName(object))) {
      tag = `Immutable.${n.name}${n.name === 'Record' ? '' : `(${object.size})`}`;
      arrayish = n.arrayish;
      fields = n.arrayish ? iterateImArray$1 : n.setish ? iterateImSet$1 : iterateImObject$1;
    } else {
      tag = tagof(object);
      fields = iterateObject$1;
    }

    if (shallow) {
      const span = document.createElement("span");
      span.className = "observablehq--shallow";
      if (name) {
        span.appendChild(inspectName(name));
      }
      span.appendChild(document.createTextNode(tag));
      span.addEventListener("mouseup", function(event) {
        if (hasSelection(span)) return;
        event.stopPropagation();
        replace(span, inspectCollapsed(object));
      });
      return span;
    }

    const span = document.createElement("span");
    span.className = "observablehq--collapsed";
    if (name) {
      span.appendChild(inspectName(name));
    }
    const a = span.appendChild(document.createElement("a"));
    a.innerHTML = `<svg width=8 height=8 class='observablehq--caret'>
    <path d='M7 4L1 8V0z' fill='currentColor' />
  </svg>`;
    a.appendChild(document.createTextNode(`${tag}${arrayish ? " [" : " {"}`));
    span.addEventListener("mouseup", function(event) {
      if (hasSelection(span)) return;
      event.stopPropagation();
      replace(span, inspectExpanded(object, null, name, proto));
    }, true);

    fields = fields(object);
    for (let i = 0; !(next = fields.next()).done && i < 20; ++i) {
      if (i > 0) span.appendChild(document.createTextNode(", "));
      span.appendChild(next.value);
    }

    if (!next.done) span.appendChild(document.createTextNode(", …"));
    span.appendChild(document.createTextNode(arrayish ? "]" : "}"));

    return span;
  }

  function* iterateMap$1(map) {
    for (const [key, value] of map) {
      yield formatMapField$1(key, value);
    }
    yield* iterateObject$1(map);
  }

  function* iterateSet$1(set) {
    for (const value of set) {
      yield inspect(value, true);
    }
    yield* iterateObject$1(set);
  }

  function* iterateImSet$1(set) {
    for (const value of set) {
      yield inspect(value, true);
    }
  }

  function* iterateImArray$1(array) {
    let i0 = -1, i1 = 0;
    for (const n = array.size; i1 < n; ++i1) {
      if (i1 > i0 + 1) yield formatEmpty(i1 - i0 - 1);
      yield inspect(array.get(i1), true);
      i0 = i1;
    }
    if (i1 > i0 + 1) yield formatEmpty(i1 - i0 - 1);
  }

  function* iterateArray$1(array) {
    let i0 = -1, i1 = 0;
    for (const n = array.length; i1 < n; ++i1) {
      if (i1 in array) {
        if (i1 > i0 + 1) yield formatEmpty(i1 - i0 - 1);
        yield inspect(valueof(array, i1), true);
        i0 = i1;
      }
    }
    if (i1 > i0 + 1) yield formatEmpty(i1 - i0 - 1);
    for (const key in array) {
      if (!isindex(key) && isown(array, key)) {
        yield formatField$1(key, valueof(array, key), "observablehq--key");
      }
    }
    for (const symbol of symbolsof(array)) {
      yield formatField$1(formatSymbol(symbol), valueof(array, symbol), "observablehq--symbol");
    }
  }

  function* iterateObject$1(object) {
    for (const key in object) {
      if (isown(object, key)) {
        yield formatField$1(key, valueof(object, key), "observablehq--key");
      }
    }
    for (const symbol of symbolsof(object)) {
      yield formatField$1(formatSymbol(symbol), valueof(object, symbol), "observablehq--symbol");
    }
  }

  function* iterateImObject$1(object) {
    for (const [key, value] of object) {
      yield formatField$1(key, value, "observablehq--key");
    }
  }

  function formatEmpty(e) {
    const span = document.createElement("span");
    span.className = "observablehq--empty";
    span.textContent = e === 1 ? "empty" : `empty × ${e}`;
    return span;
  }

  function formatField$1(key, value, className) {
    const fragment = document.createDocumentFragment();
    const span = fragment.appendChild(document.createElement("span"));
    span.className = className;
    span.textContent = key;
    fragment.appendChild(document.createTextNode(": "));
    fragment.appendChild(inspect(value, true));
    return fragment;
  }

  function formatMapField$1(key, value) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(inspect(key, true));
    fragment.appendChild(document.createTextNode(" => "));
    fragment.appendChild(inspect(value, true));
    return fragment;
  }

  function format(date, fallback) {
    if (!(date instanceof Date)) date = new Date(+date);
    if (isNaN(date)) return typeof fallback === "function" ? fallback(date) : fallback;
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    const milliseconds = date.getUTCMilliseconds();
    return `${formatYear(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}${
    hours || minutes || seconds || milliseconds ? `T${pad(hours, 2)}:${pad(minutes, 2)}${
      seconds || milliseconds ? `:${pad(seconds, 2)}${
        milliseconds ? `.${pad(milliseconds, 3)}` : ``
      }` : ``
    }Z` : ``
  }`;
  }

  function formatYear(year) {
    return year < 0 ? `-${pad(-year, 6)}`
      : year > 9999 ? `+${pad(year, 6)}`
      : pad(year, 4);
  }

  function pad(value, width) {
    return `${value}`.padStart(width, "0");
  }

  function formatDate(date) {
    return format(date, "Invalid Date");
  }

  var errorToString = Error.prototype.toString;

  function formatError(value) {
    return value.stack || errorToString.call(value);
  }

  var regExpToString = RegExp.prototype.toString;

  function formatRegExp(value) {
    return regExpToString.call(value);
  }

  /* eslint-disable no-control-regex */
  const NEWLINE_LIMIT = 20;

  function formatString(string, shallow, expanded, name) {
    if (shallow === false) {
      // String has fewer escapes displayed with double quotes
      if (count(string, /["\n]/g) <= count(string, /`|\${/g)) {
        const span = document.createElement("span");
        if (name) span.appendChild(inspectName(name));
        const textValue = span.appendChild(document.createElement("span"));
        textValue.className = "observablehq--string";
        textValue.textContent = JSON.stringify(string);
        return span;
      }
      const lines = string.split("\n");
      if (lines.length > NEWLINE_LIMIT && !expanded) {
        const div = document.createElement("div");
        if (name) div.appendChild(inspectName(name));
        const textValue = div.appendChild(document.createElement("span"));
        textValue.className = "observablehq--string";
        textValue.textContent = "`" + templatify(lines.slice(0, NEWLINE_LIMIT).join("\n"));
        const splitter = div.appendChild(document.createElement("span"));
        const truncatedCount = lines.length - NEWLINE_LIMIT;
        splitter.textContent = `Show ${truncatedCount} truncated line${truncatedCount > 1 ? "s": ""}`; splitter.className = "observablehq--string-expand";
        splitter.addEventListener("mouseup", function (event) {
          event.stopPropagation();
          replace(div, inspect(string, shallow, true, name));
        });
        return div;
      }
      const span = document.createElement("span");
      if (name) span.appendChild(inspectName(name));
      const textValue = span.appendChild(document.createElement("span"));
      textValue.className = `observablehq--string${expanded ? " observablehq--expanded" : ""}`;
      textValue.textContent = "`" + templatify(string) + "`";
      return span;
    }

    const span = document.createElement("span");
    if (name) span.appendChild(inspectName(name));
    const textValue = span.appendChild(document.createElement("span"));
    textValue.className = "observablehq--string";
    textValue.textContent = JSON.stringify(string.length > 100 ?
      `${string.slice(0, 50)}…${string.slice(-49)}` : string);
    return span;
  }

  function templatify(string) {
    return string.replace(/[\\`\x00-\x09\x0b-\x19]|\${/g, templatifyChar);
  }

  function templatifyChar(char) {
    var code = char.charCodeAt(0);
    switch (code) {
      case 0x8: return "\\b";
      case 0x9: return "\\t";
      case 0xb: return "\\v";
      case 0xc: return "\\f";
      case 0xd: return "\\r";
    }
    return code < 0x10 ? "\\x0" + code.toString(16)
        : code < 0x20 ? "\\x" + code.toString(16)
        : "\\" + char;
  }

  function count(string, re) {
    var n = 0;
    while (re.exec(string)) ++n;
    return n;
  }

  var toString = Function.prototype.toString,
      TYPE_ASYNC = {prefix: "async ƒ"},
      TYPE_ASYNC_GENERATOR = {prefix: "async ƒ*"},
      TYPE_CLASS = {prefix: "class"},
      TYPE_FUNCTION = {prefix: "ƒ"},
      TYPE_GENERATOR = {prefix: "ƒ*"};

  function inspectFunction(f, name) {
    var type, m, t = toString.call(f);

    switch (f.constructor && f.constructor.name) {
      case "AsyncFunction": type = TYPE_ASYNC; break;
      case "AsyncGeneratorFunction": type = TYPE_ASYNC_GENERATOR; break;
      case "GeneratorFunction": type = TYPE_GENERATOR; break;
      default: type = /^class\b/.test(t) ? TYPE_CLASS : TYPE_FUNCTION; break;
    }

    // A class, possibly named.
    // class Name
    if (type === TYPE_CLASS) {
      return formatFunction(type, "", name);
    }

    // An arrow function with a single argument.
    // foo =>
    // async foo =>
    if ((m = /^(?:async\s*)?(\w+)\s*=>/.exec(t))) {
      return formatFunction(type, "(" + m[1] + ")", name);
    }

    // An arrow function with parenthesized arguments.
    // (…)
    // async (…)
    if ((m = /^(?:async\s*)?\(\s*(\w+(?:\s*,\s*\w+)*)?\s*\)/.exec(t))) {
      return formatFunction(type, m[1] ? "(" + m[1].replace(/\s*,\s*/g, ", ") + ")" : "()", name);
    }

    // A function, possibly: async, generator, anonymous, simply arguments.
    // function name(…)
    // function* name(…)
    // async function name(…)
    // async function* name(…)
    if ((m = /^(?:async\s*)?function(?:\s*\*)?(?:\s*\w+)?\s*\(\s*(\w+(?:\s*,\s*\w+)*)?\s*\)/.exec(t))) {
      return formatFunction(type, m[1] ? "(" + m[1].replace(/\s*,\s*/g, ", ") + ")" : "()", name);
    }

    // Something else, like destructuring, comments or default values.
    return formatFunction(type, "(…)", name);
  }

  function formatFunction(type, args, cellname) {
    var span = document.createElement("span");
    span.className = "observablehq--function";
    if (cellname) {
      span.appendChild(inspectName(cellname));
    }
    var spanType = span.appendChild(document.createElement("span"));
    spanType.className = "observablehq--keyword";
    spanType.textContent = type.prefix;
    span.appendChild(document.createTextNode(args));
    return span;
  }

  const {prototype: {toString: toString$1}} = Object;

  function inspect(value, shallow, expand, name, proto) {
    let type = typeof value;
    switch (type) {
      case "boolean":
      case "undefined": { value += ""; break; }
      case "number": { value = value === 0 && 1 / value < 0 ? "-0" : value + ""; break; }
      case "bigint": { value = value + "n"; break; }
      case "symbol": { value = formatSymbol(value); break; }
      case "function": { return inspectFunction(value, name); }
      case "string": { return formatString(value, shallow, expand, name); }
      default: {
        if (value === null) { type = null, value = "null"; break; }
        if (value instanceof Date) { type = "date", value = formatDate(value); break; }
        if (value === FORBIDDEN) { type = "forbidden", value = "[forbidden]"; break; }
        switch (toString$1.call(value)) {
          case "[object RegExp]": { type = "regexp", value = formatRegExp(value); break; }
          case "[object Error]": // https://github.com/lodash/lodash/blob/master/isError.js#L26
          case "[object DOMException]": { type = "error", value = formatError(value); break; }
          default: return (expand ? inspectExpanded : inspectCollapsed)(value, shallow, name, proto);
        }
        break;
      }
    }
    const span = document.createElement("span");
    if (name) span.appendChild(inspectName(name));
    const n = span.appendChild(document.createElement("span"));
    n.className = `observablehq--${type}`;
    n.textContent = value;
    return span;
  }

  function replace(spanOld, spanNew) {
    if (spanOld.classList.contains("observablehq--inspect")) spanNew.classList.add("observablehq--inspect");
    spanOld.parentNode.replaceChild(spanNew, spanOld);
    dispatch(spanNew, "load");
  }

  const LOCATION_MATCH = /\s+\(\d+:\d+\)$/m;

  class Inspector {
    constructor(node) {
      if (!node) throw new Error("invalid node");
      this._node = node;
      node.classList.add("observablehq");
    }
    pending() {
      const {_node} = this;
      _node.classList.remove("observablehq--error");
      _node.classList.add("observablehq--running");
    }
    fulfilled(value, name) {
      const {_node} = this;
      if (!isnode(value) || (value.parentNode && value.parentNode !== _node)) {
        value = inspect(value, false, _node.firstChild // TODO Do this better.
            && _node.firstChild.classList
            && _node.firstChild.classList.contains("observablehq--expanded"), name);
        value.classList.add("observablehq--inspect");
      }
      _node.classList.remove("observablehq--running", "observablehq--error");
      if (_node.firstChild !== value) {
        if (_node.firstChild) {
          while (_node.lastChild !== _node.firstChild) _node.removeChild(_node.lastChild);
          _node.replaceChild(value, _node.firstChild);
        } else {
          _node.appendChild(value);
        }
      }
      dispatch(_node, "update");
    }
    rejected(error, name) {
      const {_node} = this;
      _node.classList.remove("observablehq--running");
      _node.classList.add("observablehq--error");
      while (_node.lastChild) _node.removeChild(_node.lastChild);
      var div = document.createElement("div");
      div.className = "observablehq--inspect";
      if (name) div.appendChild(inspectName(name));
      div.appendChild(document.createTextNode((error + "").replace(LOCATION_MATCH, "")));
      _node.appendChild(div);
      dispatch(_node, "error", {error: error});
    }
  }

  Inspector.into = function(container) {
    if (typeof container === "string") {
      container = document.querySelector(container);
      if (container == null) throw new Error("container not found");
    }
    return function() {
      return new Inspector(container.appendChild(document.createElement("div")));
    };
  };

  // Returns true if the given value is something that should be added to the DOM
  // by the inspector, rather than being inspected. This deliberately excludes
  // DocumentFragment since appending a fragment “dissolves” (mutates) the
  // fragment, and we wish for the inspector to not have side-effects. Also,
  // HTMLElement.prototype is an instanceof Element, but not an element!
  function isnode(value) {
    return (value instanceof Element || value instanceof Text)
        && (value instanceof value.constructor);
  }

  var EOL = {},
      EOF = {},
      QUOTE = 34,
      NEWLINE = 10,
      RETURN = 13;

  function objectConverter(columns) {
    return new Function("d", "return {" + columns.map(function(name, i) {
      return JSON.stringify(name) + ": d[" + i + "] || \"\"";
    }).join(",") + "}");
  }

  function customConverter(columns, f) {
    var object = objectConverter(columns);
    return function(row, i) {
      return f(object(row), i, columns);
    };
  }

  // Compute unique columns in order of discovery.
  function inferColumns(rows) {
    var columnSet = Object.create(null),
        columns = [];

    rows.forEach(function(row) {
      for (var column in row) {
        if (!(column in columnSet)) {
          columns.push(columnSet[column] = column);
        }
      }
    });

    return columns;
  }

  function pad$1(value, width) {
    var s = value + "", length = s.length;
    return length < width ? new Array(width - length + 1).join(0) + s : s;
  }

  function formatYear$1(year) {
    return year < 0 ? "-" + pad$1(-year, 6)
      : year > 9999 ? "+" + pad$1(year, 6)
      : pad$1(year, 4);
  }

  function formatDate$1(date) {
    var hours = date.getUTCHours(),
        minutes = date.getUTCMinutes(),
        seconds = date.getUTCSeconds(),
        milliseconds = date.getUTCMilliseconds();
    return isNaN(date) ? "Invalid Date"
        : formatYear$1(date.getUTCFullYear()) + "-" + pad$1(date.getUTCMonth() + 1, 2) + "-" + pad$1(date.getUTCDate(), 2)
        + (milliseconds ? "T" + pad$1(hours, 2) + ":" + pad$1(minutes, 2) + ":" + pad$1(seconds, 2) + "." + pad$1(milliseconds, 3) + "Z"
        : seconds ? "T" + pad$1(hours, 2) + ":" + pad$1(minutes, 2) + ":" + pad$1(seconds, 2) + "Z"
        : minutes || hours ? "T" + pad$1(hours, 2) + ":" + pad$1(minutes, 2) + "Z"
        : "");
  }

  function dsv(delimiter) {
    var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
        DELIMITER = delimiter.charCodeAt(0);

    function parse(text, f) {
      var convert, columns, rows = parseRows(text, function(row, i) {
        if (convert) return convert(row, i - 1);
        columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
      });
      rows.columns = columns || [];
      return rows;
    }

    function parseRows(text, f) {
      var rows = [], // output rows
          N = text.length,
          I = 0, // current character index
          n = 0, // current line number
          t, // current token
          eof = N <= 0, // current token followed by EOF?
          eol = false; // current token followed by EOL?

      // Strip the trailing newline.
      if (text.charCodeAt(N - 1) === NEWLINE) --N;
      if (text.charCodeAt(N - 1) === RETURN) --N;

      function token() {
        if (eof) return EOF;
        if (eol) return eol = false, EOL;

        // Unescape quotes.
        var i, j = I, c;
        if (text.charCodeAt(j) === QUOTE) {
          while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
          if ((i = I) >= N) eof = true;
          else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
          else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
          return text.slice(j + 1, i - 1).replace(/""/g, "\"");
        }

        // Find next delimiter or newline.
        while (I < N) {
          if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
          else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
          else if (c !== DELIMITER) continue;
          return text.slice(j, i);
        }

        // Return last token before EOF.
        return eof = true, text.slice(j, N);
      }

      while ((t = token()) !== EOF) {
        var row = [];
        while (t !== EOL && t !== EOF) row.push(t), t = token();
        if (f && (row = f(row, n++)) == null) continue;
        rows.push(row);
      }

      return rows;
    }

    function preformatBody(rows, columns) {
      return rows.map(function(row) {
        return columns.map(function(column) {
          return formatValue(row[column]);
        }).join(delimiter);
      });
    }

    function format(rows, columns) {
      if (columns == null) columns = inferColumns(rows);
      return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
    }

    function formatBody(rows, columns) {
      if (columns == null) columns = inferColumns(rows);
      return preformatBody(rows, columns).join("\n");
    }

    function formatRows(rows) {
      return rows.map(formatRow).join("\n");
    }

    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }

    function formatValue(value) {
      return value == null ? ""
          : value instanceof Date ? formatDate$1(value)
          : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\""
          : value;
    }

    return {
      parse: parse,
      parseRows: parseRows,
      format: format,
      formatBody: formatBody,
      formatRows: formatRows,
      formatRow: formatRow,
      formatValue: formatValue
    };
  }

  var csv = dsv(",");

  var csvParse = csv.parse;
  var csvParseRows = csv.parseRows;

  var tsv = dsv("\t");

  var tsvParse = tsv.parse;
  var tsvParseRows = tsv.parseRows;

  function autoType(object) {
    for (var key in object) {
      var value = object[key].trim(), number, m;
      if (!value) value = null;
      else if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (value === "NaN") value = NaN;
      else if (!isNaN(number = +value)) value = number;
      else if (m = value.match(/^([-+]\d{2})?\d{4}(-\d{2}(-\d{2})?)?(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[-+]\d{2}:\d{2})?)?$/)) {
        if (fixtz && !!m[4] && !m[7]) value = value.replace(/-/g, "/").replace(/T/, " ");
        value = new Date(value);
      }
      else continue;
      object[key] = value;
    }
    return object;
  }

  // https://github.com/d3/d3-dsv/issues/45
  const fixtz = new Date("2019-01-01T00:00").getHours() || new Date("2019-07-01T00:00").getHours();

  const metas = new Map;
  const queue = [];
  const map = queue.map;
  const some = queue.some;
  const hasOwnProperty$1 = queue.hasOwnProperty;
  const origin = "https://cdn.jsdelivr.net/npm/";
  const identifierRe = /^((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(?:\/(.*))?$/;
  const versionRe = /^\d+\.\d+\.\d+(-[\w-.+]+)?$/;
  const extensionRe = /\.[^/]*$/;
  const mains = ["unpkg", "jsdelivr", "browser", "main"];

  class RequireError extends Error {
    constructor(message) {
      super(message);
    }
  }

  RequireError.prototype.name = RequireError.name;

  function main(meta) {
    for (const key of mains) {
      const value = meta[key];
      if (typeof value === "string") {
        return extensionRe.test(value) ? value : `${value}.js`;
      }
    }
  }

  function parseIdentifier(identifier) {
    const match = identifierRe.exec(identifier);
    return match && {
      name: match[1],
      version: match[2],
      path: match[3]
    };
  }

  function resolveMeta(target) {
    const url = `${origin}${target.name}${target.version ? `@${target.version}` : ""}/package.json`;
    let meta = metas.get(url);
    if (!meta) metas.set(url, meta = fetch(url).then(response => {
      if (!response.ok) throw new RequireError("unable to load package.json");
      if (response.redirected && !metas.has(response.url)) metas.set(response.url, meta);
      return response.json();
    }));
    return meta;
  }

  async function resolve(name, base) {
    if (name.startsWith(origin)) name = name.substring(origin.length);
    if (/^(\w+:)|\/\//i.test(name)) return name;
    if (/^[.]{0,2}\//i.test(name)) return new URL(name, base == null ? location : base).href;
    if (!name.length || /^[\s._]/.test(name) || /\s$/.test(name)) throw new RequireError("illegal name");
    const target = parseIdentifier(name);
    if (!target) return `${origin}${name}`;
    if (!target.version && base != null && base.startsWith(origin)) {
      const meta = await resolveMeta(parseIdentifier(base.substring(origin.length)));
      target.version = meta.dependencies && meta.dependencies[target.name] || meta.peerDependencies && meta.peerDependencies[target.name];
    }
    if (target.path && !extensionRe.test(target.path)) target.path += ".js";
    if (target.path && target.version && versionRe.test(target.version)) return `${origin}${target.name}@${target.version}/${target.path}`;
    const meta = await resolveMeta(target);
    return `${origin}${meta.name}@${meta.version}/${target.path || main(meta) || "index.js"}`;
  }

  var require = requireFrom(resolve);

  function requireFrom(resolver) {
    const cache = new Map;
    const requireBase = requireRelative(null);

    function requireAbsolute(url) {
      if (typeof url !== "string") return url;
      let module = cache.get(url);
      if (!module) cache.set(url, module = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.onload = () => {
          try { resolve(queue.pop()(requireRelative(url))); }
          catch (error) { reject(new RequireError("invalid module")); }
          script.remove();
        };
        script.onerror = () => {
          reject(new RequireError("unable to load module"));
          script.remove();
        };
        script.async = true;
        script.src = url;
        window.define = define;
        document.head.appendChild(script);
      }));
      return module;
    }

    function requireRelative(base) {
      return name => Promise.resolve(resolver(name, base)).then(requireAbsolute);
    }

    function requireAlias(aliases) {
      return requireFrom((name, base) => {
        if (name in aliases) {
          name = aliases[name], base = null;
          if (typeof name !== "string") return name;
        }
        return resolver(name, base);
      });
    }

    function require(name) {
      return arguments.length > 1
          ? Promise.all(map.call(arguments, requireBase)).then(merge)
          : requireBase(name);
    }

    require.alias = requireAlias;
    require.resolve = resolver;

    return require;
  }

  function merge(modules) {
    const o = {};
    for (const m of modules) {
      for (const k in m) {
        if (hasOwnProperty$1.call(m, k)) {
          if (m[k] == null) Object.defineProperty(o, k, {get: getter(m, k)});
          else o[k] = m[k];
        }
      }
    }
    return o;
  }

  function getter(object, name) {
    return () => object[name];
  }

  function isbuiltin(name) {
    name = name + "";
    return name === "exports" || name === "module";
  }

  function define(name, dependencies, factory) {
    const n = arguments.length;
    if (n < 2) factory = name, dependencies = [];
    else if (n < 3) factory = dependencies, dependencies = typeof name === "string" ? [] : name;
    queue.push(some.call(dependencies, isbuiltin) ? require => {
      const exports = {};
      const module = {exports};
      return Promise.all(map.call(dependencies, name => {
        name = name + "";
        return name === "exports" ? exports : name === "module" ? module : require(name);
      })).then(dependencies => {
        factory.apply(null, dependencies);
        return module.exports;
      });
    } : require => {
      return Promise.all(map.call(dependencies, require)).then(dependencies => {
        return typeof factory === "function" ? factory.apply(null, dependencies) : factory;
      });
    });
  }

  define.amd = {};

  function dependency(name, version, main) {
    return {
      resolve(path = main) {
        return `https://cdn.jsdelivr.net/npm/${name}@${version}/${path}`;
      }
    };
  }

  const d3 = dependency("d3", "7.3.0", "dist/d3.min.js");
  const inputs = dependency("@observablehq/inputs", "0.10.4", "dist/inputs.min.js");
  const plot = dependency("@observablehq/plot", "0.4.0", "dist/plot.umd.min.js");
  const graphviz = dependency("@observablehq/graphviz", "0.2.1", "dist/graphviz.min.js");
  const highlight = dependency("@observablehq/highlight.js", "2.0.0", "highlight.min.js");
  const katex = dependency("@observablehq/katex", "0.11.1", "dist/katex.min.js");
  const lodash = dependency("lodash", "4.17.21", "lodash.min.js");
  const htl = dependency("htl", "0.3.1", "dist/htl.min.js");
  const jszip = dependency("jszip", "3.7.1", "dist/jszip.min.js");
  const marked = dependency("marked", "0.3.12", "marked.min.js");
  const sql = dependency("sql.js", "1.6.2", "dist/sql-wasm.js");
  const vega = dependency("vega", "5.21.0", "build/vega.min.js");
  const vegalite = dependency("vega-lite", "5.2.0", "build/vega-lite.min.js");
  const vegaliteApi = dependency("vega-lite-api", "5.0.0", "build/vega-lite-api.min.js");
  const arrow = dependency("apache-arrow", "4.0.1", "Arrow.es2015.min.js");
  const arquero = dependency("arquero", "4.8.8", "dist/arquero.min.js");
  const topojson = dependency("topojson-client", "3.1.0", "dist/topojson-client.min.js");
  const exceljs = dependency("exceljs", "4.3.0", "dist/exceljs.min.js");

  async function sqlite(require) {
    const init = await require(sql.resolve());
    return init({locateFile: file => sql.resolve(`dist/${file}`)});
  }

  class SQLiteDatabaseClient {
    constructor(db) {
      Object.defineProperties(this, {
        _db: {value: db}
      });
    }
    static async open(source) {
      const [SQL, buffer] = await Promise.all([sqlite(require), Promise.resolve(source).then(load)]);
      return new SQLiteDatabaseClient(new SQL.Database(buffer));
    }
    async query(query, params) {
      return await exec(this._db, query, params);
    }
    async queryRow(query, params) {
      return (await this.query(query, params))[0] || null;
    }
    async explain(query, params) {
      const rows = await this.query(`EXPLAIN QUERY PLAN ${query}`, params);
      return element("pre", {className: "observablehq--inspect"}, [
        text(rows.map(row => row.detail).join("\n"))
      ]);
    }
    async describe(object) {
      const rows = await (object === undefined
        ? this.query(`SELECT name FROM sqlite_master WHERE type = 'table'`)
        : this.query(`SELECT * FROM pragma_table_info(?)`, [object]));
      if (!rows.length) throw new Error("Not found");
      const {columns} = rows;
      return element("table", {value: rows}, [
        element("thead", [element("tr", columns.map(c => element("th", [text(c)])))]),
        element("tbody", rows.map(r => element("tr", columns.map(c => element("td", [text(r[c])])))))
      ]);
    }
    async sql(strings, ...args) {
      return this.query(strings.join("?"), args);
    }
  }
  Object.defineProperty(SQLiteDatabaseClient.prototype, "dialect", {
    value: "sqlite"
  });

  function load(source) {
    return typeof source === "string" ? fetch(source).then(load)
      : source instanceof Response || source instanceof Blob ? source.arrayBuffer().then(load)
      : source instanceof ArrayBuffer ? new Uint8Array(source)
      : source;
  }

  async function exec(db, query, params) {
    const [result] = await db.exec(query, params);
    if (!result) return [];
    const {columns, values} = result;
    const rows = values.map(row => Object.fromEntries(row.map((value, i) => [columns[i], value])));
    rows.columns = columns;
    return rows;
  }

  function element(name, props, children) {
    if (arguments.length === 2) children = props, props = undefined;
    const element = document.createElement(name);
    if (props !== undefined) for (const p in props) element[p] = props[p];
    if (children !== undefined) for (const c of children) element.appendChild(c);
    return element;
  }

  function text(value) {
    return document.createTextNode(value);
  }

  class Workbook {
    constructor(workbook) {
      Object.defineProperties(this, {
        _: {value: workbook},
        sheetNames: {
          value: workbook.worksheets.map((s) => s.name),
          enumerable: true,
        },
      });
    }
    sheet(name, options) {
      const sname =
        typeof name === "number"
          ? this.sheetNames[name]
          : this.sheetNames.includes((name += ""))
          ? name
          : null;
      if (sname == null) throw new Error(`Sheet not found: ${name}`);
      const sheet = this._.getWorksheet(sname);
      return extract(sheet, options);
    }
  }

  function extract(sheet, {range, headers} = {}) {
    let [[c0, r0], [c1, r1]] = parseRange(range, sheet);
    const headerRow = headers ? sheet._rows[r0++] : null;
    let names = new Set(["#"]);
    for (let n = c0; n <= c1; n++) {
      const value = headerRow ? valueOf(headerRow.findCell(n + 1)) : null;
      let name = (value && value + "") || toColumn(n);
      while (names.has(name)) name += "_";
      names.add(name);
    }
    names = new Array(c0).concat(Array.from(names));

    const output = new Array(r1 - r0 + 1);
    for (let r = r0; r <= r1; r++) {
      const row = (output[r - r0] = Object.create(null, {"#": {value: r + 1}}));
      const _row = sheet.getRow(r + 1);
      if (_row.hasValues)
        for (let c = c0; c <= c1; c++) {
          const value = valueOf(_row.findCell(c + 1));
          if (value != null) row[names[c + 1]] = value;
        }
    }

    output.columns = names.filter(() => true); // Filter sparse columns
    return output;
  }

  function valueOf(cell) {
    if (!cell) return;
    const {value} = cell;
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if (value.formula || value.sharedFormula) {
        return value.result && value.result.error ? NaN : value.result;
      }
      if (value.richText) {
        return richText(value);
      }
      if (value.text) {
        let {text} = value;
        if (text.richText) text = richText(text);
        return value.hyperlink && value.hyperlink !== text
          ? `${value.hyperlink} ${text}`
          : text;
      }
      return value;
    }
    return value;
  }

  function richText(value) {
    return value.richText.map((d) => d.text).join("");
  }

  function parseRange(specifier = ":", {columnCount, rowCount}) {
    specifier += "";
    if (!specifier.match(/^[A-Z]*\d*:[A-Z]*\d*$/))
      throw new Error("Malformed range specifier");
    const [[c0 = 0, r0 = 0], [c1 = columnCount - 1, r1 = rowCount - 1]] =
      specifier.split(":").map(fromCellReference);
    return [
      [c0, r0],
      [c1, r1],
    ];
  }

  // Returns the default column name for a zero-based column index.
  // For example: 0 -> "A", 1 -> "B", 25 -> "Z", 26 -> "AA", 27 -> "AB".
  function toColumn(c) {
    let sc = "";
    c++;
    do {
      sc = String.fromCharCode(64 + (c % 26 || 26)) + sc;
    } while ((c = Math.floor((c - 1) / 26)));
    return sc;
  }

  // Returns the zero-based indexes from a cell reference.
  // For example: "A1" -> [0, 0], "B2" -> [1, 1], "AA10" -> [26, 9].
  function fromCellReference(s) {
    const [, sc, sr] = s.match(/^([A-Z]*)(\d*)$/);
    let c = 0;
    if (sc)
      for (let i = 0; i < sc.length; i++)
        c += Math.pow(26, sc.length - i - 1) * (sc.charCodeAt(i) - 64);
    return [c ? c - 1 : undefined, sr ? +sr - 1 : undefined];
  }

  async function remote_fetch(file) {
    const response = await fetch(await file.url());
    if (!response.ok) throw new Error(`Unable to load file: ${file.name}`);
    return response;
  }

  async function dsv$1(file, delimiter, {array = false, typed = false} = {}) {
    const text = await file.text();
    return (delimiter === "\t"
        ? (array ? tsvParseRows : tsvParse)
        : (array ? csvParseRows : csvParse))(text, typed && autoType);
  }

  class AbstractFile {
    constructor(name) {
      Object.defineProperty(this, "name", {value: name, enumerable: true});
    }
    async blob() {
      return (await remote_fetch(this)).blob();
    }
    async arrayBuffer() {
      return (await remote_fetch(this)).arrayBuffer();
    }
    async text() {
      return (await remote_fetch(this)).text();
    }
    async json() {
      return (await remote_fetch(this)).json();
    }
    async stream() {
      return (await remote_fetch(this)).body;
    }
    async csv(options) {
      return dsv$1(this, ",", options);
    }
    async tsv(options) {
      return dsv$1(this, "\t", options);
    }
    async image(props) {
      const url = await this.url();
      return new Promise((resolve, reject) => {
        const i = new Image();
        if (new URL(url, document.baseURI).origin !== new URL(location).origin) {
          i.crossOrigin = "anonymous";
        }
        Object.assign(i, props);
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error(`Unable to load file: ${this.name}`));
        i.src = url;
      });
    }
    async arrow() {
      const [Arrow, response] = await Promise.all([require(arrow.resolve()), remote_fetch(this)]);
      return Arrow.Table.from(response);
    }
    async sqlite() {
      return SQLiteDatabaseClient.open(remote_fetch(this));
    }
    async zip() {
      const [JSZip, buffer] = await Promise.all([require(jszip.resolve()), this.arrayBuffer()]);
      return new ZipArchive(await JSZip.loadAsync(buffer));
    }
    async xml(mimeType = "application/xml") {
      return (new DOMParser).parseFromString(await this.text(), mimeType);
    }
    async html() {
      return this.xml("text/html");
    }
    async xlsx() {
      const [ExcelJS, buffer] = await Promise.all([require(exceljs.resolve()), this.arrayBuffer()]);
      return new Workbook(await new ExcelJS.Workbook().xlsx.load(buffer));
    }
  }

  class FileAttachment extends AbstractFile {
    constructor(url, name) {
      super(name);
      Object.defineProperty(this, "_url", {value: url});
    }
    async url() {
      return (await this._url) + "";
    }
  }

  function NoFileAttachments(name) {
    throw new Error(`File not found: ${name}`);
  }

  function FileAttachments(resolve) {
    return Object.assign(
      name => {
        const url = resolve(name += ""); // Returns a Promise, string, or null.
        if (url == null) throw new Error(`File not found: ${name}`);
        return new FileAttachment(url, name);
      },
      {prototype: FileAttachment.prototype} // instanceof
    );
  }

  class ZipArchive {
    constructor(archive) {
      Object.defineProperty(this, "_", {value: archive});
      this.filenames = Object.keys(archive.files).filter(name => !archive.files[name].dir);
    }
    file(path) {
      const object = this._.file(path += "");
      if (!object || object.dir) throw new Error(`file not found: ${path}`);
      return new ZipArchiveEntry(object);
    }
  }

  class ZipArchiveEntry extends AbstractFile {
    constructor(object) {
      super(object.name);
      Object.defineProperty(this, "_", {value: object});
      Object.defineProperty(this, "_url", {writable: true});
    }
    async url() {
      return this._url || (this._url = this.blob().then(URL.createObjectURL));
    }
    async blob() {
      return this._.async("blob");
    }
    async arrayBuffer() {
      return this._.async("arraybuffer");
    }
    async text() {
      return this._.async("text");
    }
    async json() {
      return JSON.parse(await this.text());
    }
  }

  function canvas(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function context2d(width, height, dpi) {
    if (dpi == null) dpi = devicePixelRatio;
    var canvas = document.createElement("canvas");
    canvas.width = width * dpi;
    canvas.height = height * dpi;
    canvas.style.width = width + "px";
    var context = canvas.getContext("2d");
    context.scale(dpi, dpi);
    return context;
  }

  function download(value, name = "untitled", label = "Save") {
    const a = document.createElement("a");
    const b = a.appendChild(document.createElement("button"));
    b.textContent = label;
    a.download = name;

    async function reset() {
      await new Promise(requestAnimationFrame);
      URL.revokeObjectURL(a.href);
      a.removeAttribute("href");
      b.textContent = label;
      b.disabled = false;
    }

    a.onclick = async event => {
      b.disabled = true;
      if (a.href) return reset(); // Already saved.
      b.textContent = "Saving…";
      try {
        const object = await (typeof value === "function" ? value() : value);
        b.textContent = "Download";
        a.href = URL.createObjectURL(object); // eslint-disable-line require-atomic-updates
      } catch (ignore) {
        b.textContent = label;
      }
      if (event.eventPhase) return reset(); // Already downloaded.
      b.disabled = false;
    };

    return a;
  }

  var namespaces = {
    math: "http://www.w3.org/1998/Math/MathML",
    svg: "http://www.w3.org/2000/svg",
    xhtml: "http://www.w3.org/1999/xhtml",
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function element$1(name, attributes) {
    var prefix = name += "", i = prefix.indexOf(":"), value;
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    var element = namespaces.hasOwnProperty(prefix) // eslint-disable-line no-prototype-builtins
        ? document.createElementNS(namespaces[prefix], name)
        : document.createElement(name);
    if (attributes) for (var key in attributes) {
      prefix = key, i = prefix.indexOf(":"), value = attributes[key];
      if (i >= 0 && (prefix = key.slice(0, i)) !== "xmlns") key = key.slice(i + 1);
      if (namespaces.hasOwnProperty(prefix)) element.setAttributeNS(namespaces[prefix], key, value); // eslint-disable-line no-prototype-builtins
      else element.setAttribute(key, value);
    }
    return element;
  }

  function input(type) {
    var input = document.createElement("input");
    if (type != null) input.type = type;
    return input;
  }

  function range(min, max, step) {
    if (arguments.length === 1) max = min, min = null;
    var input = document.createElement("input");
    input.min = min = min == null ? 0 : +min;
    input.max = max = max == null ? 1 : +max;
    input.step = step == null ? "any" : step = +step;
    input.type = "range";
    return input;
  }

  function select(values) {
    var select = document.createElement("select");
    Array.prototype.forEach.call(values, function(value) {
      var option = document.createElement("option");
      option.value = option.textContent = value;
      select.appendChild(option);
    });
    return select;
  }

  function svg(width, height) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", [0, 0, width, height]);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    return svg;
  }

  function text$1(value) {
    return document.createTextNode(value);
  }

  var count$1 = 0;

  function uid(name) {
    return new Id("O-" + (name == null ? "" : name + "-") + ++count$1);
  }

  function Id(id) {
    this.id = id;
    this.href = new URL(`#${id}`, location) + "";
  }

  Id.prototype.toString = function() {
    return "url(" + this.href + ")";
  };

  var DOM = {
    canvas: canvas,
    context2d: context2d,
    download: download,
    element: element$1,
    input: input,
    range: range,
    select: select,
    svg: svg,
    text: text$1,
    uid: uid
  };

  function buffer(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader;
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function text$2(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader;
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function url(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader;
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  var Files = {
    buffer: buffer,
    text: text$2,
    url: url
  };

  function that() {
    return this;
  }

  function disposable(value, dispose) {
    let done = false;
    if (typeof dispose !== "function") {
      throw new Error("dispose is not a function");
    }
    return {
      [Symbol.iterator]: that,
      next: () => done ? {done: true} : (done = true, {done: false, value}),
      return: () => (done = true, dispose(value), {done: true}),
      throw: () => ({done: done = true})
    };
  }

  function* filter(iterator, test) {
    var result, index = -1;
    while (!(result = iterator.next()).done) {
      if (test(result.value, ++index)) {
        yield result.value;
      }
    }
  }

  function observe(initialize) {
    let stale = false;
    let value;
    let resolve;
    const dispose = initialize(change);

    if (dispose != null && typeof dispose !== "function") {
      throw new Error(typeof dispose.then === "function"
          ? "async initializers are not supported"
          : "initializer returned something, but not a dispose function");
    }

    function change(x) {
      if (resolve) resolve(x), resolve = null;
      else stale = true;
      return value = x;
    }

    function next() {
      return {done: false, value: stale
          ? (stale = false, Promise.resolve(value))
          : new Promise(_ => (resolve = _))};
    }

    return {
      [Symbol.iterator]: that,
      throw: () => ({done: true}),
      return: () => (dispose != null && dispose(), {done: true}),
      next
    };
  }

  function input$1(input) {
    return observe(function(change) {
      var event = eventof(input), value = valueof$1(input);
      function inputted() { change(valueof$1(input)); }
      input.addEventListener(event, inputted);
      if (value !== undefined) change(value);
      return function() { input.removeEventListener(event, inputted); };
    });
  }

  function valueof$1(input) {
    switch (input.type) {
      case "range":
      case "number": return input.valueAsNumber;
      case "date": return input.valueAsDate;
      case "checkbox": return input.checked;
      case "file": return input.multiple ? input.files : input.files[0];
      case "select-multiple": return Array.from(input.selectedOptions, o => o.value);
      default: return input.value;
    }
  }

  function eventof(input) {
    switch (input.type) {
      case "button":
      case "submit":
      case "checkbox": return "click";
      case "file": return "change";
      default: return "input";
    }
  }

  function* map$1(iterator, transform) {
    var result, index = -1;
    while (!(result = iterator.next()).done) {
      yield transform(result.value, ++index);
    }
  }

  function queue$1(initialize) {
    let resolve;
    const queue = [];
    const dispose = initialize(push);

    if (dispose != null && typeof dispose !== "function") {
      throw new Error(typeof dispose.then === "function"
          ? "async initializers are not supported"
          : "initializer returned something, but not a dispose function");
    }

    function push(x) {
      queue.push(x);
      if (resolve) resolve(queue.shift()), resolve = null;
      return x;
    }

    function next() {
      return {done: false, value: queue.length
          ? Promise.resolve(queue.shift())
          : new Promise(_ => (resolve = _))};
    }

    return {
      [Symbol.iterator]: that,
      throw: () => ({done: true}),
      return: () => (dispose != null && dispose(), {done: true}),
      next
    };
  }

  function* range$1(start, stop, step) {
    start = +start;
    stop = +stop;
    step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
    var i = -1, n = Math.max(0, Math.ceil((stop - start) / step)) | 0;
    while (++i < n) {
      yield start + i * step;
    }
  }

  function valueAt(iterator, i) {
    if (!isFinite(i = +i) || i < 0 || i !== i | 0) return;
    var result, index = -1;
    while (!(result = iterator.next()).done) {
      if (++index === i) {
        return result.value;
      }
    }
  }

  function worker(source) {
    const url = URL.createObjectURL(new Blob([source], {type: "text/javascript"}));
    const worker = new Worker(url);
    return disposable(worker, () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    });
  }

  var Generators = {
    disposable: disposable,
    filter: filter,
    input: input$1,
    map: map$1,
    observe: observe,
    queue: queue$1,
    range: range$1,
    valueAt: valueAt,
    worker: worker
  };

  function template(render, wrapper) {
    return function(strings) {
      var string = strings[0],
          parts = [], part,
          root = null,
          node, nodes,
          walker,
          i, n, j, m, k = -1;

      // Concatenate the text using comments as placeholders.
      for (i = 1, n = arguments.length; i < n; ++i) {
        part = arguments[i];
        if (part instanceof Node) {
          parts[++k] = part;
          string += "<!--o:" + k + "-->";
        } else if (Array.isArray(part)) {
          for (j = 0, m = part.length; j < m; ++j) {
            node = part[j];
            if (node instanceof Node) {
              if (root === null) {
                parts[++k] = root = document.createDocumentFragment();
                string += "<!--o:" + k + "-->";
              }
              root.appendChild(node);
            } else {
              root = null;
              string += node;
            }
          }
          root = null;
        } else {
          string += part;
        }
        string += strings[i];
      }

      // Render the text.
      root = render(string);

      // Walk the rendered content to replace comment placeholders.
      if (++k > 0) {
        nodes = new Array(k);
        walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null, false);
        while (walker.nextNode()) {
          node = walker.currentNode;
          if (/^o:/.test(node.nodeValue)) {
            nodes[+node.nodeValue.slice(2)] = node;
          }
        }
        for (i = 0; i < k; ++i) {
          if (node = nodes[i]) {
            node.parentNode.replaceChild(parts[i], node);
          }
        }
      }

      // Is the rendered content
      // … a parent of a single child? Detach and return the child.
      // … a document fragment? Replace the fragment with an element.
      // … some other node? Return it.
      return root.childNodes.length === 1 ? root.removeChild(root.firstChild)
          : root.nodeType === 11 ? ((node = wrapper()).appendChild(root), node)
          : root;
    };
  }

  var html = template(function(string) {
    var template = document.createElement("template");
    template.innerHTML = string.trim();
    return document.importNode(template.content, true);
  }, function() {
    return document.createElement("span");
  });

  function md(require) {
    return require(marked.resolve()).then(function(marked) {
      return template(
        function(string) {
          var root = document.createElement("div");
          root.innerHTML = marked(string, {langPrefix: ""}).trim();
          var code = root.querySelectorAll("pre code[class]");
          if (code.length > 0) {
            require(highlight.resolve()).then(function(hl) {
              code.forEach(function(block) {
                function done() {
                  hl.highlightBlock(block);
                  block.parentNode.classList.add("observablehq--md-pre");
                }
                if (hl.getLanguage(block.className)) {
                  done();
                } else {
                  require(highlight.resolve("async-languages/index.js"))
                    .then(index => {
                      if (index.has(block.className)) {
                        return require(highlight.resolve("async-languages/" + index.get(block.className))).then(language => {
                          hl.registerLanguage(block.className, language);
                        });
                      }
                    })
                    .then(done, done);
                }
              });
            });
          }
          return root;
        },
        function() {
          return document.createElement("div");
        }
      );
    });
  }

  function Mutable(value) {
    let change;
    Object.defineProperties(this, {
      generator: {value: observe(_ => void (change = _))},
      value: {get: () => value, set: x => change(value = x)} // eslint-disable-line no-setter-return
    });
    if (value !== undefined) change(value);
  }

  function* now() {
    while (true) {
      yield Date.now();
    }
  }

  function delay(duration, value) {
    return new Promise(function(resolve) {
      setTimeout(function() {
        resolve(value);
      }, duration);
    });
  }

  var timeouts = new Map;

  function timeout(now, time) {
    var t = new Promise(function(resolve) {
      timeouts.delete(time);
      var delay = time - now;
      if (!(delay > 0)) throw new Error("invalid time");
      if (delay > 0x7fffffff) throw new Error("too long to wait");
      setTimeout(resolve, delay);
    });
    timeouts.set(time, t);
    return t;
  }

  function when(time, value) {
    var now;
    return (now = timeouts.get(time = +time)) ? now.then(() => value)
        : (now = Date.now()) >= time ? Promise.resolve(value)
        : timeout(now, time).then(() => value);
  }

  function tick(duration, value) {
    return when(Math.ceil((Date.now() + 1) / duration) * duration, value);
  }

  var Promises = {
    delay: delay,
    tick: tick,
    when: when
  };

  function resolve$1(name, base) {
    if (/^(\w+:)|\/\//i.test(name)) return name;
    if (/^[.]{0,2}\//i.test(name)) return new URL(name, base == null ? location : base).href;
    if (!name.length || /^[\s._]/.test(name) || /\s$/.test(name)) throw new Error("illegal name");
    return "https://unpkg.com/" + name;
  }

  function requirer(resolve) {
    return resolve == null ? require : requireFrom(resolve);
  }

  var svg$1 = template(function(string) {
    var root = document.createElementNS("http://www.w3.org/2000/svg", "g");
    root.innerHTML = string.trim();
    return root;
  }, function() {
    return document.createElementNS("http://www.w3.org/2000/svg", "g");
  });

  var raw = String.raw;

  function style(href) {
    return new Promise(function(resolve, reject) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onerror = reject;
      link.onload = resolve;
      document.head.appendChild(link);
    });
  }

  function tex(require) {
    return Promise.all([
      require(katex.resolve()),
      style(katex.resolve("dist/katex.min.css"))
    ]).then(function(values) {
      var katex = values[0], tex = renderer();

      function renderer(options) {
        return function() {
          var root = document.createElement("div");
          katex.render(raw.apply(String, arguments), root, options);
          return root.removeChild(root.firstChild);
        };
      }

      tex.options = renderer;
      tex.block = renderer({displayMode: true});
      return tex;
    });
  }

  async function vl(require) {
    const [v, vl, api] = await Promise.all([vega, vegalite, vegaliteApi].map(d => require(d.resolve())));
    return api.register(v, vl);
  }

  function width() {
    return observe(function(change) {
      var width = change(document.body.clientWidth);
      function resized() {
        var w = document.body.clientWidth;
        if (w !== width) change(width = w);
      }
      window.addEventListener("resize", resized);
      return function() {
        window.removeEventListener("resize", resized);
      };
    });
  }

  var Library = Object.assign(function Library(resolver) {
    const require = requirer(resolver);
    Object.defineProperties(this, properties({
      FileAttachment: () => NoFileAttachments,
      Arrow: () => require(arrow.resolve()),
      Inputs: () => require(inputs.resolve()).then(Inputs => ({...Inputs, file: Inputs.fileOf(AbstractFile)})),
      Mutable: () => Mutable,
      Plot: () => require(plot.resolve()),
      SQLite: () => sqlite(require),
      SQLiteDatabaseClient: () => SQLiteDatabaseClient,
      _: () => require(lodash.resolve()),
      aq: () => require.alias({"apache-arrow": arrow.resolve()})(arquero.resolve()),
      d3: () => require(d3.resolve()),
      dot: () => require(graphviz.resolve()),
      htl: () => require(htl.resolve()),
      html: () => html,
      md: () => md(require),
      now,
      require: () => require,
      resolve: () => resolve$1,
      svg: () => svg$1,
      tex: () => tex(require),
      topojson: () => require(topojson.resolve()),
      vl: () => vl(require),
      width,

      // Note: these are namespace objects, and thus exposed directly rather than
      // being wrapped in a function. This allows library.Generators to resolve,
      // rather than needing module.value.
      DOM,
      Files,
      Generators,
      Promises
    }));
  }, {resolve: require.resolve});

  function properties(values) {
    return Object.fromEntries(Object.entries(values).map(property));
  }

  function property([key, value]) {
    return [key, ({value, writable: true, enumerable: true})];
  }

  function RuntimeError(message, input) {
    this.message = message + "";
    this.input = input;
  }

  RuntimeError.prototype = Object.create(Error.prototype);
  RuntimeError.prototype.name = "RuntimeError";
  RuntimeError.prototype.constructor = RuntimeError;

  function generatorish(value) {
    return value
        && typeof value.next === "function"
        && typeof value.return === "function";
  }

  function load$1(notebook, library, observer) {
    if (typeof library == "function") observer = library, library = null;
    if (typeof observer !== "function") throw new Error("invalid observer");
    if (library == null) library = new Library();

    const {modules, id} = notebook;
    const map = new Map;
    const runtime = new Runtime(library);
    const main = runtime_module(id);

    function runtime_module(id) {
      let module = map.get(id);
      if (!module) map.set(id, module = runtime.module());
      return module;
    }

    for (const m of modules) {
      const module = runtime_module(m.id);
      let i = 0;
      for (const v of m.variables) {
        if (v.from) module.import(v.remote, v.name, runtime_module(v.from));
        else if (module === main) module.variable(observer(v, i, m.variables)).define(v.name, v.inputs, v.value);
        else module.define(v.name, v.inputs, v.value);
        ++i;
      }
    }

    return runtime;
  }

  var prototype = Array.prototype;
  var map$2 = prototype.map;
  var forEach = prototype.forEach;

  function constant(x) {
    return function() {
      return x;
    };
  }

  function identity(x) {
    return x;
  }

  function rethrow(e) {
    return function() {
      throw e;
    };
  }

  function noop() {}

  var TYPE_NORMAL = 1; // a normal variable
  var TYPE_IMPLICIT = 2; // created on reference
  var TYPE_DUPLICATE = 3; // created on duplicate definition

  var no_observer = {};

  function Variable(type, module, observer) {
    if (!observer) observer = no_observer;
    Object.defineProperties(this, {
      _observer: {value: observer, writable: true},
      _definition: {value: variable_undefined, writable: true},
      _duplicate: {value: undefined, writable: true},
      _duplicates: {value: undefined, writable: true},
      _indegree: {value: NaN, writable: true}, // The number of computing inputs.
      _inputs: {value: [], writable: true},
      _invalidate: {value: noop, writable: true},
      _module: {value: module},
      _name: {value: null, writable: true},
      _outputs: {value: new Set, writable: true},
      _promise: {value: Promise.resolve(undefined), writable: true},
      _reachable: {value: observer !== no_observer, writable: true}, // Is this variable transitively visible?
      _rejector: {value: variable_rejector(this)},
      _type: {value: type},
      _value: {value: undefined, writable: true},
      _version: {value: 0, writable: true}
    });
  }

  Object.defineProperties(Variable.prototype, {
    _pending: {value: variable_pending, writable: true, configurable: true},
    _fulfilled: {value: variable_fulfilled, writable: true, configurable: true},
    _rejected: {value: variable_rejected, writable: true, configurable: true},
    define: {value: variable_define, writable: true, configurable: true},
    delete: {value: variable_delete, writable: true, configurable: true},
    import: {value: variable_import, writable: true, configurable: true}
  });

  function variable_attach(variable) {
    variable._module._runtime._dirty.add(variable);
    variable._outputs.add(this);
  }

  function variable_detach(variable) {
    variable._module._runtime._dirty.add(variable);
    variable._outputs.delete(this);
  }

  function variable_undefined() {
    throw variable_undefined;
  }

  function variable_rejector(variable) {
    return function(error) {
      if (error === variable_undefined) throw new RuntimeError(variable._name + " is not defined", variable._name);
      if (error instanceof Error && error.message) throw new RuntimeError(error.message, variable._name);
      throw new RuntimeError(variable._name + " could not be resolved", variable._name);
    };
  }

  function variable_duplicate(name) {
    return function() {
      throw new RuntimeError(name + " is defined more than once");
    };
  }

  function variable_define(name, inputs, definition) {
    switch (arguments.length) {
      case 1: {
        definition = name, name = inputs = null;
        break;
      }
      case 2: {
        definition = inputs;
        if (typeof name === "string") inputs = null;
        else inputs = name, name = null;
        break;
      }
    }
    return variable_defineImpl.call(this,
      name == null ? null : name + "",
      inputs == null ? [] : map$2.call(inputs, this._module._resolve, this._module),
      typeof definition === "function" ? definition : constant(definition)
    );
  }

  function variable_defineImpl(name, inputs, definition) {
    var scope = this._module._scope, runtime = this._module._runtime;

    this._inputs.forEach(variable_detach, this);
    inputs.forEach(variable_attach, this);
    this._inputs = inputs;
    this._definition = definition;
    this._value = undefined;

    // Is this an active variable (that may require disposal)?
    if (definition === noop) runtime._variables.delete(this);
    else runtime._variables.add(this);

    // Did the variable’s name change? Time to patch references!
    if (name !== this._name || scope.get(name) !== this) {
      var error, found;

      if (this._name) { // Did this variable previously have a name?
        if (this._outputs.size) { // And did other variables reference this variable?
          scope.delete(this._name);
          found = this._module._resolve(this._name);
          found._outputs = this._outputs, this._outputs = new Set;
          found._outputs.forEach(function(output) { output._inputs[output._inputs.indexOf(this)] = found; }, this);
          found._outputs.forEach(runtime._updates.add, runtime._updates);
          runtime._dirty.add(found).add(this);
          scope.set(this._name, found);
        } else if ((found = scope.get(this._name)) === this) { // Do no other variables reference this variable?
          scope.delete(this._name); // It’s safe to delete!
        } else if (found._type === TYPE_DUPLICATE) { // Do other variables assign this name?
          found._duplicates.delete(this); // This variable no longer assigns this name.
          this._duplicate = undefined;
          if (found._duplicates.size === 1) { // Is there now only one variable assigning this name?
            found = found._duplicates.keys().next().value; // Any references are now fixed!
            error = scope.get(this._name);
            found._outputs = error._outputs, error._outputs = new Set;
            found._outputs.forEach(function(output) { output._inputs[output._inputs.indexOf(error)] = found; });
            found._definition = found._duplicate, found._duplicate = undefined;
            runtime._dirty.add(error).add(found);
            runtime._updates.add(found);
            scope.set(this._name, found);
          }
        } else {
          throw new Error;
        }
      }

      if (this._outputs.size) throw new Error;

      if (name) { // Does this variable have a new name?
        if (found = scope.get(name)) { // Do other variables reference or assign this name?
          if (found._type === TYPE_DUPLICATE) { // Do multiple other variables already define this name?
            this._definition = variable_duplicate(name), this._duplicate = definition;
            found._duplicates.add(this);
          } else if (found._type === TYPE_IMPLICIT) { // Are the variable references broken?
            this._outputs = found._outputs, found._outputs = new Set; // Now they’re fixed!
            this._outputs.forEach(function(output) { output._inputs[output._inputs.indexOf(found)] = this; }, this);
            runtime._dirty.add(found).add(this);
            scope.set(name, this);
          } else { // Does another variable define this name?
            found._duplicate = found._definition, this._duplicate = definition; // Now they’re duplicates.
            error = new Variable(TYPE_DUPLICATE, this._module);
            error._name = name;
            error._definition = this._definition = found._definition = variable_duplicate(name);
            error._outputs = found._outputs, found._outputs = new Set;
            error._outputs.forEach(function(output) { output._inputs[output._inputs.indexOf(found)] = error; });
            error._duplicates = new Set([this, found]);
            runtime._dirty.add(found).add(error);
            runtime._updates.add(found).add(error);
            scope.set(name, error);
          }
        } else {
          scope.set(name, this);
        }
      }

      this._name = name;
    }

    runtime._updates.add(this);
    runtime._compute();
    return this;
  }

  function variable_import(remote, name, module) {
    if (arguments.length < 3) module = name, name = remote;
    return variable_defineImpl.call(this, name + "", [module._resolve(remote + "")], identity);
  }

  function variable_delete() {
    return variable_defineImpl.call(this, null, [], noop);
  }

  function variable_pending() {
    if (this._observer.pending) this._observer.pending();
  }

  function variable_fulfilled(value) {
    if (this._observer.fulfilled) this._observer.fulfilled(value, this._name);
  }

  function variable_rejected(error) {
    if (this._observer.rejected) this._observer.rejected(error, this._name);
  }

  function Module(runtime, builtins = []) {
    Object.defineProperties(this, {
      _runtime: {value: runtime},
      _scope: {value: new Map},
      _builtins: {value: new Map([
        ["invalidation", variable_invalidation],
        ["visibility", variable_visibility],
        ...builtins
      ])},
      _source: {value: null, writable: true}
    });
  }

  Object.defineProperties(Module.prototype, {
    _copy: {value: module_copy, writable: true, configurable: true},
    _resolve: {value: module_resolve, writable: true, configurable: true},
    redefine: {value: module_redefine, writable: true, configurable: true},
    define: {value: module_define, writable: true, configurable: true},
    derive: {value: module_derive, writable: true, configurable: true},
    import: {value: module_import, writable: true, configurable: true},
    value: {value: module_value, writable: true, configurable: true},
    variable: {value: module_variable, writable: true, configurable: true},
    builtin: {value: module_builtin, writable: true, configurable: true}
  });

  function module_redefine(name) {
    var v = this._scope.get(name);
    if (!v) throw new RuntimeError(name + " is not defined");
    if (v._type === TYPE_DUPLICATE) throw new RuntimeError(name + " is defined more than once");
    return v.define.apply(v, arguments);
  }

  function module_define() {
    var v = new Variable(TYPE_NORMAL, this);
    return v.define.apply(v, arguments);
  }

  function module_import() {
    var v = new Variable(TYPE_NORMAL, this);
    return v.import.apply(v, arguments);
  }

  function module_variable(observer) {
    return new Variable(TYPE_NORMAL, this, observer);
  }

  async function module_value(name) {
    var v = this._scope.get(name);
    if (!v) throw new RuntimeError(name + " is not defined");
    if (v._observer === no_observer) {
      v._observer = true;
      this._runtime._dirty.add(v);
    }
    await this._runtime._compute();
    return v._promise;
  }

  function module_derive(injects, injectModule) {
    var copy = new Module(this._runtime, this._builtins);
    copy._source = this;
    forEach.call(injects, function(inject) {
      if (typeof inject !== "object") inject = {name: inject + ""};
      if (inject.alias == null) inject.alias = inject.name;
      copy.import(inject.name, inject.alias, injectModule);
    });
    Promise.resolve().then(() => {
      const modules = new Set([this]);
      for (const module of modules) {
        for (const variable of module._scope.values()) {
          if (variable._definition === identity) { // import
            const module = variable._inputs[0]._module;
            const source = module._source || module;
            if (source === this) { // circular import-with!
              console.warn("circular module definition; ignoring"); // eslint-disable-line no-console
              return;
            }
            modules.add(source);
          }
        }
      }
      this._copy(copy, new Map);
    });
    return copy;
  }

  function module_copy(copy, map) {
    copy._source = this;
    map.set(this, copy);
    for (const [name, source] of this._scope) {
      var target = copy._scope.get(name);
      if (target && target._type === TYPE_NORMAL) continue; // injection
      if (source._definition === identity) { // import
        var sourceInput = source._inputs[0],
            sourceModule = sourceInput._module;
        copy.import(sourceInput._name, name, map.get(sourceModule)
          || (sourceModule._source
             ? sourceModule._copy(new Module(copy._runtime, copy._builtins), map) // import-with
             : sourceModule));
      } else {
        copy.define(name, source._inputs.map(variable_name), source._definition);
      }
    }
    return copy;
  }

  function module_resolve(name) {
    var variable = this._scope.get(name), value;
    if (!variable) {
      variable = new Variable(TYPE_IMPLICIT, this);
      if (this._builtins.has(name)) {
        variable.define(name, constant(this._builtins.get(name)));
      } else if (this._runtime._builtin._scope.has(name)) {
        variable.import(name, this._runtime._builtin);
      } else {
        try {
          value = this._runtime._global(name);
        } catch (error) {
          return variable.define(name, rethrow(error));
        }
        if (value === undefined) {
          this._scope.set(variable._name = name, variable);
        } else {
          variable.define(name, constant(value));
        }
      }
    }
    return variable;
  }

  function module_builtin(name, value) {
    this._builtins.set(name, value);
  }

  function variable_name(variable) {
    return variable._name;
  }

  const frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setImmediate;

  var variable_invalidation = {};
  var variable_visibility = {};

  function Runtime(builtins = new Library, global = window_global) {
    var builtin = this.module();
    Object.defineProperties(this, {
      _dirty: {value: new Set},
      _updates: {value: new Set},
      _precomputes: {value: [], writable: true},
      _computing: {value: null, writable: true},
      _init: {value: null, writable: true},
      _modules: {value: new Map},
      _variables: {value: new Set},
      _disposed: {value: false, writable: true},
      _builtin: {value: builtin},
      _global: {value: global}
    });
    if (builtins) for (var name in builtins) {
      (new Variable(TYPE_IMPLICIT, builtin)).define(name, [], builtins[name]);
    }
  }

  Object.defineProperties(Runtime, {
    load: {value: load$1, writable: true, configurable: true}
  });

  Object.defineProperties(Runtime.prototype, {
    _precompute: {value: runtime_precompute, writable: true, configurable: true},
    _compute: {value: runtime_compute, writable: true, configurable: true},
    _computeSoon: {value: runtime_computeSoon, writable: true, configurable: true},
    _computeNow: {value: runtime_computeNow, writable: true, configurable: true},
    dispose: {value: runtime_dispose, writable: true, configurable: true},
    module: {value: runtime_module, writable: true, configurable: true},
    fileAttachments: {value: FileAttachments, writable: true, configurable: true}
  });

  function runtime_dispose() {
    this._computing = Promise.resolve();
    this._disposed = true;
    this._variables.forEach(v => {
      v._invalidate();
      v._version = NaN;
    });
  }

  function runtime_module(define, observer = noop) {
    let module;
    if (define === undefined) {
      if (module = this._init) {
        this._init = null;
        return module;
      }
      return new Module(this);
    }
    module = this._modules.get(define);
    if (module) return module;
    this._init = module = new Module(this);
    this._modules.set(define, module);
    try {
      define(this, observer);
    } finally {
      this._init = null;
    }
    return module;
  }

  function runtime_precompute(callback) {
    this._precomputes.push(callback);
    this._compute();
  }

  function runtime_compute() {
    return this._computing || (this._computing = this._computeSoon());
  }

  function runtime_computeSoon() {
    return new Promise(frame).then(() => this._disposed ? undefined : this._computeNow());
  }

  async function runtime_computeNow() {
    var queue = [],
        variables,
        variable,
        precomputes = this._precomputes;

    // If there are any paused generators, resume them before computing so they
    // can update (if synchronous) before computing downstream variables.
    if (precomputes.length) {
      this._precomputes = [];
      for (const callback of precomputes) callback();
      await runtime_defer(3);
    }

    // Compute the reachability of the transitive closure of dirty variables.
    // Any newly-reachable variable must also be recomputed.
    // Any no-longer-reachable variable must be terminated.
    variables = new Set(this._dirty);
    variables.forEach(function(variable) {
      variable._inputs.forEach(variables.add, variables);
      const reachable = variable_reachable(variable);
      if (reachable > variable._reachable) {
        this._updates.add(variable);
      } else if (reachable < variable._reachable) {
        variable._invalidate();
      }
      variable._reachable = reachable;
    }, this);

    // Compute the transitive closure of updating, reachable variables.
    variables = new Set(this._updates);
    variables.forEach(function(variable) {
      if (variable._reachable) {
        variable._indegree = 0;
        variable._outputs.forEach(variables.add, variables);
      } else {
        variable._indegree = NaN;
        variables.delete(variable);
      }
    });

    this._computing = null;
    this._updates.clear();
    this._dirty.clear();

    // Compute the indegree of updating variables.
    variables.forEach(function(variable) {
      variable._outputs.forEach(variable_increment);
    });

    do {
      // Identify the root variables (those with no updating inputs).
      variables.forEach(function(variable) {
        if (variable._indegree === 0) {
          queue.push(variable);
        }
      });

      // Compute the variables in topological order.
      while (variable = queue.pop()) {
        variable_compute(variable);
        variable._outputs.forEach(postqueue);
        variables.delete(variable);
      }

      // Any remaining variables are circular, or depend on them.
      variables.forEach(function(variable) {
        if (variable_circular(variable)) {
          variable_error(variable, new RuntimeError("circular definition"));
          variable._outputs.forEach(variable_decrement);
          variables.delete(variable);
        }
      });
    } while (variables.size);

    function postqueue(variable) {
      if (--variable._indegree === 0) {
        queue.push(variable);
      }
    }
  }

  // We want to give generators, if they’re defined synchronously, a chance to
  // update before computing downstream variables. This creates a synchronous
  // promise chain of the given depth that we’ll await before recomputing
  // downstream variables.
  function runtime_defer(depth = 0) {
    let p = Promise.resolve();
    for (let i = 0; i < depth; ++i) p = p.then(() => {});
    return p;
  }

  function variable_circular(variable) {
    const inputs = new Set(variable._inputs);
    for (const i of inputs) {
      if (i === variable) return true;
      i._inputs.forEach(inputs.add, inputs);
    }
    return false;
  }

  function variable_increment(variable) {
    ++variable._indegree;
  }

  function variable_decrement(variable) {
    --variable._indegree;
  }

  function variable_value(variable) {
    return variable._promise.catch(variable._rejector);
  }

  function variable_invalidator(variable) {
    return new Promise(function(resolve) {
      variable._invalidate = resolve;
    });
  }

  function variable_intersector(invalidation, variable) {
    let node = typeof IntersectionObserver === "function" && variable._observer && variable._observer._node;
    let visible = !node, resolve = noop, reject = noop, promise, observer;
    if (node) {
      observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting) && (promise = null, resolve()));
      observer.observe(node);
      invalidation.then(() => (observer.disconnect(), observer = null, reject()));
    }
    return function(value) {
      if (visible) return Promise.resolve(value);
      if (!observer) return Promise.reject();
      if (!promise) promise = new Promise((y, n) => (resolve = y, reject = n));
      return promise.then(() => value);
    };
  }

  function variable_compute(variable) {
    variable._invalidate();
    variable._invalidate = noop;
    variable._pending();

    const value0 = variable._value;
    const version = ++variable._version;

    // Lazily-constructed invalidation variable; only constructed if referenced as an input.
    let invalidation = null;

    // If the variable doesn’t have any inputs, we can optimize slightly.
    const promise = variable._promise = (variable._inputs.length
        ? Promise.all(variable._inputs.map(variable_value)).then(define)
        : new Promise(resolve => resolve(variable._definition.call(value0))))
      .then(generate);

    // Compute the initial value of the variable.
    function define(inputs) {
      if (variable._version !== version) return;

      // Replace any reference to invalidation with the promise, lazily.
      for (var i = 0, n = inputs.length; i < n; ++i) {
        switch (inputs[i]) {
          case variable_invalidation: {
            inputs[i] = invalidation = variable_invalidator(variable);
            break;
          }
          case variable_visibility: {
            if (!invalidation) invalidation = variable_invalidator(variable);
            inputs[i] = variable_intersector(invalidation, variable);
            break;
          }
        }
      }

      return variable._definition.apply(value0, inputs);
    }

    // If the value is a generator, then retrieve its first value, and dispose of
    // the generator if the variable is invalidated. Note that the cell may
    // already have been invalidated here, in which case we need to terminate the
    // generator immediately!
    function generate(value) {
      if (generatorish(value)) {
        if (variable._version !== version) return void value.return();
        (invalidation || variable_invalidator(variable)).then(variable_return(value));
        return variable_generate(variable, version, value);
      }
      return value;
    }

    promise.then((value) => {
      if (variable._version !== version) return;
      variable._value = value;
      variable._fulfilled(value);
    }, (error) => {
      if (variable._version !== version) return;
      variable._value = undefined;
      variable._rejected(error);
    });
  }

  function variable_generate(variable, version, generator) {
    const runtime = variable._module._runtime;

    // Retrieve the next value from the generator; if successful, invoke the
    // specified callback. The returned promise resolves to the yielded value, or
    // to undefined if the generator is done.
    function compute(onfulfilled) {
      return new Promise(resolve => resolve(generator.next())).then(({done, value}) => {
        return done ? undefined : Promise.resolve(value).then(onfulfilled);
      });
    }

    // Retrieve the next value from the generator; if successful, fulfill the
    // variable, compute downstream variables, and schedule the next value to be
    // pulled from the generator at the start of the next animation frame. If not
    // successful, reject the variable, compute downstream variables, and return.
    function recompute() {
      const promise = compute((value) => {
        if (variable._version !== version) return;
        postcompute(value, promise).then(() => runtime._precompute(recompute));
        variable._fulfilled(value);
        return value;
      });
      promise.catch((error) => {
        if (variable._version !== version) return;
        postcompute(undefined, promise);
        variable._rejected(error);
      });
    }

    // After the generator fulfills or rejects, set its current value, promise,
    // and schedule any downstream variables for update.
    function postcompute(value, promise) {
      variable._value = value;
      variable._promise = promise;
      variable._outputs.forEach(runtime._updates.add, runtime._updates);
      return runtime._compute();
    }

    // When retrieving the first value from the generator, the promise graph is
    // already established, so we only need to queue the next pull.
    return compute((value) => {
      if (variable._version !== version) return;
      runtime._precompute(recompute);
      return value;
    });
  }

  function variable_error(variable, error) {
    variable._invalidate();
    variable._invalidate = noop;
    variable._pending();
    ++variable._version;
    variable._indegree = NaN;
    (variable._promise = Promise.reject(error)).catch(noop);
    variable._value = undefined;
    variable._rejected(error);
  }

  function variable_return(generator) {
    return function() {
      generator.return();
    };
  }

  function variable_reachable(variable) {
    if (variable._observer !== no_observer) return true; // Directly reachable.
    var outputs = new Set(variable._outputs);
    for (const output of outputs) {
      if (output._observer !== no_observer) return true;
      output._outputs.forEach(outputs.add, outputs);
    }
    return false;
  }

  function window_global(name) {
    return window[name];
  }

  function styleInject(css, ref) {
    if ( ref === void 0 ) ref = {};
    var insertAt = ref.insertAt;

    if (!css || typeof document === 'undefined') { return; }

    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';

    if (insertAt === 'top') {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  // Reserved word lists for various dialects of the language

  var reservedWords = {
    3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
    5: "class enum extends super const export import",
    6: "enum",
    strict: "implements interface let package private protected public static yield",
    strictBind: "eval arguments"
  };

  // And the keywords

  var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

  var keywords$1 = {
    5: ecma5AndLessKeywords,
    "5module": ecma5AndLessKeywords + " export import",
    6: ecma5AndLessKeywords + " const class extends export import super"
  };

  var keywordRelationalOperator = /^in(stanceof)?$/;

  // ## Character categories

  // Big ugly regular expressions that match characters in the
  // whitespace, identifier, and identifier-start categories. These
  // are only applied when a character is found to actually have a
  // code point above 128.
  // Generated by `bin/generate-identifier-regex.js`.
  var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u0870-\u0887\u0889-\u088e\u08a0-\u08c9\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c5d\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cdd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d04-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u1711\u171f-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4c\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31bf\u31f0-\u31ff\u3400-\u4dbf\u4e00-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ca\ua7d0\ua7d1\ua7d3\ua7d5-\ua7d9\ua7f2-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab69\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
  var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u0898-\u089f\u08ca-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b55-\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3c\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d81-\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1715\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u180f-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1abf-\u1ace\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua82c\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

  var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
  var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

  nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

  // These are a run-length and offset encoded representation of the
  // >0xffff code points that are a valid part of identifiers. The
  // offset starts at 0x10000, and each pair of numbers represents an
  // offset to the next range, and then a size of the range. They were
  // generated by bin/generate-identifier-regex.js

  // eslint-disable-next-line comma-spacing
  var astralIdentifierStartCodes = [0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,14,29,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,13,10,2,14,2,6,2,1,2,10,2,14,2,6,2,1,68,310,10,21,11,7,25,5,2,41,2,8,70,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,28,43,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,14,35,349,41,7,1,79,28,11,0,9,21,43,17,47,20,28,22,13,52,58,1,3,0,14,44,33,24,27,35,30,0,3,0,9,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,21,2,31,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,14,0,72,26,38,6,186,43,117,63,32,7,3,0,3,7,2,1,2,23,16,0,2,0,95,7,3,38,17,0,2,0,29,0,11,39,8,0,22,0,12,45,20,0,19,72,264,8,2,36,18,0,50,29,113,6,2,1,2,37,22,0,26,5,2,1,2,31,15,0,328,18,190,0,80,921,103,110,18,195,2637,96,16,1070,4050,582,8634,568,8,30,18,78,18,29,19,47,17,3,32,20,6,18,689,63,129,74,6,0,67,12,65,1,2,0,29,6135,9,1237,43,8,8936,3,2,6,2,1,2,290,46,2,18,3,9,395,2309,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,1845,30,482,44,11,6,17,0,322,29,19,43,1269,6,2,3,2,1,2,14,2,196,60,67,8,0,1205,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42719,33,4152,8,221,3,5761,15,7472,3104,541,1507,4938];

  // eslint-disable-next-line comma-spacing
  var astralIdentifierCodes = [509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,574,3,9,9,370,1,154,10,50,3,123,2,54,14,32,10,3,1,11,3,46,10,8,0,46,9,7,2,37,13,2,9,6,1,45,0,13,2,49,13,9,3,2,11,83,11,7,0,161,11,6,9,7,3,56,1,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,5,0,82,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,243,14,166,9,71,5,2,1,3,3,2,0,2,1,13,9,120,6,3,6,4,0,29,9,41,6,2,3,9,0,10,10,47,15,406,7,2,7,17,9,57,21,2,13,123,5,4,0,2,1,2,6,2,0,9,9,49,4,2,1,2,4,9,9,330,3,19306,9,87,9,39,4,60,6,26,9,1014,0,2,54,8,3,82,0,12,1,19628,1,4706,45,3,22,543,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,262,6,10,9,357,0,62,13,1495,6,110,6,6,9,4759,9,787719,239];

  // This has a complexity linear to the value of the code. The
  // assumption is that looking up astral identifier characters is
  // rare.
  function isInAstralSet(code, set) {
    var pos = 0x10000;
    for (var i = 0; i < set.length; i += 2) {
      pos += set[i];
      if (pos > code) { return false }
      pos += set[i + 1];
      if (pos >= code) { return true }
    }
  }

  // Test whether a given character code starts an identifier.

  function isIdentifierStart(code, astral) {
    if (code < 65) { return code === 36 }
    if (code < 91) { return true }
    if (code < 97) { return code === 95 }
    if (code < 123) { return true }
    if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
    if (astral === false) { return false }
    return isInAstralSet(code, astralIdentifierStartCodes)
  }

  // Test whether a given character is part of an identifier.

  function isIdentifierChar(code, astral) {
    if (code < 48) { return code === 36 }
    if (code < 58) { return true }
    if (code < 65) { return false }
    if (code < 91) { return true }
    if (code < 97) { return code === 95 }
    if (code < 123) { return true }
    if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
    if (astral === false) { return false }
    return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
  }

  // ## Token types

  // The assignment of fine-grained, information-carrying type objects
  // allows the tokenizer to store the information it has about a
  // token in a way that is very cheap for the parser to look up.

  // All token type variables start with an underscore, to make them
  // easy to recognize.

  // The `beforeExpr` property is used to disambiguate between regular
  // expressions and divisions. It is set on all token types that can
  // be followed by an expression (thus, a slash after them would be a
  // regular expression).
  //
  // The `startsExpr` property is used to check if the token ends a
  // `yield` expression. It is set on all token types that either can
  // directly start an expression (like a quotation mark) or can
  // continue an expression (like the body of a string).
  //
  // `isLoop` marks a keyword as starting a loop, which is important
  // to know when parsing a label, in order to allow or disallow
  // continue jumps to that label.

  var TokenType = function TokenType(label, conf) {
    if ( conf === void 0 ) conf = {};

    this.label = label;
    this.keyword = conf.keyword;
    this.beforeExpr = !!conf.beforeExpr;
    this.startsExpr = !!conf.startsExpr;
    this.isLoop = !!conf.isLoop;
    this.isAssign = !!conf.isAssign;
    this.prefix = !!conf.prefix;
    this.postfix = !!conf.postfix;
    this.binop = conf.binop || null;
    this.updateContext = null;
  };

  function binop(name, prec) {
    return new TokenType(name, {beforeExpr: true, binop: prec})
  }
  var beforeExpr = {beforeExpr: true}, startsExpr = {startsExpr: true};

  // Map keyword names to token types.

  var keywords = {};

  // Succinct definitions of keyword token types
  function kw(name, options) {
    if ( options === void 0 ) options = {};

    options.keyword = name;
    return keywords[name] = new TokenType(name, options)
  }

  var types$1 = {
    num: new TokenType("num", startsExpr),
    regexp: new TokenType("regexp", startsExpr),
    string: new TokenType("string", startsExpr),
    name: new TokenType("name", startsExpr),
    privateId: new TokenType("privateId", startsExpr),
    eof: new TokenType("eof"),

    // Punctuation token types.
    bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
    bracketR: new TokenType("]"),
    braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
    braceR: new TokenType("}"),
    parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
    parenR: new TokenType(")"),
    comma: new TokenType(",", beforeExpr),
    semi: new TokenType(";", beforeExpr),
    colon: new TokenType(":", beforeExpr),
    dot: new TokenType("."),
    question: new TokenType("?", beforeExpr),
    questionDot: new TokenType("?."),
    arrow: new TokenType("=>", beforeExpr),
    template: new TokenType("template"),
    invalidTemplate: new TokenType("invalidTemplate"),
    ellipsis: new TokenType("...", beforeExpr),
    backQuote: new TokenType("`", startsExpr),
    dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),

    // Operators. These carry several kinds of properties to help the
    // parser use them properly (the presence of these properties is
    // what categorizes them as operators).
    //
    // `binop`, when present, specifies that this operator is a binary
    // operator, and will refer to its precedence.
    //
    // `prefix` and `postfix` mark the operator as a prefix or postfix
    // unary operator.
    //
    // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
    // binary operators with a very low precedence, that should result
    // in AssignmentExpression nodes.

    eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
    assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
    incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
    prefix: new TokenType("!/~", {beforeExpr: true, prefix: true, startsExpr: true}),
    logicalOR: binop("||", 1),
    logicalAND: binop("&&", 2),
    bitwiseOR: binop("|", 3),
    bitwiseXOR: binop("^", 4),
    bitwiseAND: binop("&", 5),
    equality: binop("==/!=/===/!==", 6),
    relational: binop("</>/<=/>=", 7),
    bitShift: binop("<</>>/>>>", 8),
    plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
    modulo: binop("%", 10),
    star: binop("*", 10),
    slash: binop("/", 10),
    starstar: new TokenType("**", {beforeExpr: true}),
    coalesce: binop("??", 1),

    // Keyword token types.
    _break: kw("break"),
    _case: kw("case", beforeExpr),
    _catch: kw("catch"),
    _continue: kw("continue"),
    _debugger: kw("debugger"),
    _default: kw("default", beforeExpr),
    _do: kw("do", {isLoop: true, beforeExpr: true}),
    _else: kw("else", beforeExpr),
    _finally: kw("finally"),
    _for: kw("for", {isLoop: true}),
    _function: kw("function", startsExpr),
    _if: kw("if"),
    _return: kw("return", beforeExpr),
    _switch: kw("switch"),
    _throw: kw("throw", beforeExpr),
    _try: kw("try"),
    _var: kw("var"),
    _const: kw("const"),
    _while: kw("while", {isLoop: true}),
    _with: kw("with"),
    _new: kw("new", {beforeExpr: true, startsExpr: true}),
    _this: kw("this", startsExpr),
    _super: kw("super", startsExpr),
    _class: kw("class", startsExpr),
    _extends: kw("extends", beforeExpr),
    _export: kw("export"),
    _import: kw("import", startsExpr),
    _null: kw("null", startsExpr),
    _true: kw("true", startsExpr),
    _false: kw("false", startsExpr),
    _in: kw("in", {beforeExpr: true, binop: 7}),
    _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
    _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
    _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
    _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
  };

  // Matches a whole line break (where CRLF is considered a single
  // line break). Used to count lines.

  var lineBreak = /\r\n?|\n|\u2028|\u2029/;
  var lineBreakG = new RegExp(lineBreak.source, "g");

  function isNewLine(code) {
    return code === 10 || code === 13 || code === 0x2028 || code === 0x2029
  }

  function nextLineBreak(code, from, end) {
    if ( end === void 0 ) end = code.length;

    for (var i = from; i < end; i++) {
      var next = code.charCodeAt(i);
      if (isNewLine(next))
        { return i < end - 1 && next === 13 && code.charCodeAt(i + 1) === 10 ? i + 2 : i + 1 }
    }
    return -1
  }

  var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

  var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

  var ref = Object.prototype;
  var hasOwnProperty$2 = ref.hasOwnProperty;
  var toString$2 = ref.toString;

  var hasOwn = Object.hasOwn || (function (obj, propName) { return (
    hasOwnProperty$2.call(obj, propName)
  ); });

  var isArray = Array.isArray || (function (obj) { return (
    toString$2.call(obj) === "[object Array]"
  ); });

  function wordsRegexp(words) {
    return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$")
  }

  var loneSurrogate = /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/;

  // These are used when `options.locations` is on, for the
  // `startLoc` and `endLoc` properties.

  var Position = function Position(line, col) {
    this.line = line;
    this.column = col;
  };

  Position.prototype.offset = function offset (n) {
    return new Position(this.line, this.column + n)
  };

  var SourceLocation = function SourceLocation(p, start, end) {
    this.start = start;
    this.end = end;
    if (p.sourceFile !== null) { this.source = p.sourceFile; }
  };

  // The `getLineInfo` function is mostly useful when the
  // `locations` option is off (for performance reasons) and you
  // want to find the line/column position for a given character
  // offset. `input` should be the code string that the offset refers
  // into.

  function getLineInfo(input, offset) {
    for (var line = 1, cur = 0;;) {
      var nextBreak = nextLineBreak(input, cur, offset);
      if (nextBreak < 0) { return new Position(line, offset - cur) }
      ++line;
      cur = nextBreak;
    }
  }

  // A second argument must be given to configure the parser process.
  // These options are recognized (only `ecmaVersion` is required):

  var defaultOptions = {
    // `ecmaVersion` indicates the ECMAScript version to parse. Must be
    // either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10
    // (2019), 11 (2020), 12 (2021), 13 (2022), or `"latest"` (the
    // latest version the library supports). This influences support
    // for strict mode, the set of reserved words, and support for
    // new syntax features.
    ecmaVersion: null,
    // `sourceType` indicates the mode the code should be parsed in.
    // Can be either `"script"` or `"module"`. This influences global
    // strict mode and parsing of `import` and `export` declarations.
    sourceType: "script",
    // `onInsertedSemicolon` can be a callback that will be called
    // when a semicolon is automatically inserted. It will be passed
    // the position of the comma as an offset, and if `locations` is
    // enabled, it is given the location as a `{line, column}` object
    // as second argument.
    onInsertedSemicolon: null,
    // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
    // trailing commas.
    onTrailingComma: null,
    // By default, reserved words are only enforced if ecmaVersion >= 5.
    // Set `allowReserved` to a boolean value to explicitly turn this on
    // an off. When this option has the value "never", reserved words
    // and keywords can also not be used as property names.
    allowReserved: null,
    // When enabled, a return at the top level is not considered an
    // error.
    allowReturnOutsideFunction: false,
    // When enabled, import/export statements are not constrained to
    // appearing at the top of the program, and an import.meta expression
    // in a script isn't considered an error.
    allowImportExportEverywhere: false,
    // By default, await identifiers are allowed to appear at the top-level scope only if ecmaVersion >= 2022.
    // When enabled, await identifiers are allowed to appear at the top-level scope,
    // but they are still not allowed in non-async functions.
    allowAwaitOutsideFunction: null,
    // When enabled, super identifiers are not constrained to
    // appearing in methods and do not raise an error when they appear elsewhere.
    allowSuperOutsideMethod: null,
    // When enabled, hashbang directive in the beginning of file
    // is allowed and treated as a line comment.
    allowHashBang: false,
    // When `locations` is on, `loc` properties holding objects with
    // `start` and `end` properties in `{line, column}` form (with
    // line being 1-based and column 0-based) will be attached to the
    // nodes.
    locations: false,
    // A function can be passed as `onToken` option, which will
    // cause Acorn to call that function with object in the same
    // format as tokens returned from `tokenizer().getToken()`. Note
    // that you are not allowed to call the parser from the
    // callback—that will corrupt its internal state.
    onToken: null,
    // A function can be passed as `onComment` option, which will
    // cause Acorn to call that function with `(block, text, start,
    // end)` parameters whenever a comment is skipped. `block` is a
    // boolean indicating whether this is a block (`/* */`) comment,
    // `text` is the content of the comment, and `start` and `end` are
    // character offsets that denote the start and end of the comment.
    // When the `locations` option is on, two more parameters are
    // passed, the full `{line, column}` locations of the start and
    // end of the comments. Note that you are not allowed to call the
    // parser from the callback—that will corrupt its internal state.
    onComment: null,
    // Nodes have their start and end characters offsets recorded in
    // `start` and `end` properties (directly on the node, rather than
    // the `loc` object, which holds line/column data. To also add a
    // [semi-standardized][range] `range` property holding a `[start,
    // end]` array with the same numbers, set the `ranges` option to
    // `true`.
    //
    // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
    ranges: false,
    // It is possible to parse multiple files into a single AST by
    // passing the tree produced by parsing the first file as
    // `program` option in subsequent parses. This will add the
    // toplevel forms of the parsed file to the `Program` (top) node
    // of an existing parse tree.
    program: null,
    // When `locations` is on, you can pass this to record the source
    // file in every node's `loc` object.
    sourceFile: null,
    // This value, if given, is stored in every node, whether
    // `locations` is on or off.
    directSourceFile: null,
    // When enabled, parenthesized expressions are represented by
    // (non-standard) ParenthesizedExpression nodes
    preserveParens: false
  };

  // Interpret and default an options object

  var warnedAboutEcmaVersion = false;

  function getOptions(opts) {
    var options = {};

    for (var opt in defaultOptions)
      { options[opt] = opts && hasOwn(opts, opt) ? opts[opt] : defaultOptions[opt]; }

    if (options.ecmaVersion === "latest") {
      options.ecmaVersion = 1e8;
    } else if (options.ecmaVersion == null) {
      if (!warnedAboutEcmaVersion && typeof console === "object" && console.warn) {
        warnedAboutEcmaVersion = true;
        console.warn("Since Acorn 8.0.0, options.ecmaVersion is required.\nDefaulting to 2020, but this will stop working in the future.");
      }
      options.ecmaVersion = 11;
    } else if (options.ecmaVersion >= 2015) {
      options.ecmaVersion -= 2009;
    }

    if (options.allowReserved == null)
      { options.allowReserved = options.ecmaVersion < 5; }

    if (isArray(options.onToken)) {
      var tokens = options.onToken;
      options.onToken = function (token) { return tokens.push(token); };
    }
    if (isArray(options.onComment))
      { options.onComment = pushComment(options, options.onComment); }

    return options
  }

  function pushComment(options, array) {
    return function(block, text, start, end, startLoc, endLoc) {
      var comment = {
        type: block ? "Block" : "Line",
        value: text,
        start: start,
        end: end
      };
      if (options.locations)
        { comment.loc = new SourceLocation(this, startLoc, endLoc); }
      if (options.ranges)
        { comment.range = [start, end]; }
      array.push(comment);
    }
  }

  // Each scope gets a bitset that may contain these flags
  var
      SCOPE_TOP = 1,
      SCOPE_FUNCTION = 2,
      SCOPE_ASYNC = 4,
      SCOPE_GENERATOR = 8,
      SCOPE_ARROW = 16,
      SCOPE_SIMPLE_CATCH = 32,
      SCOPE_SUPER = 64,
      SCOPE_DIRECT_SUPER = 128,
      SCOPE_CLASS_STATIC_BLOCK = 256,
      SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK;

  function functionFlags(async, generator) {
    return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0)
  }

  // Used in checkLVal* and declareName to determine the type of a binding
  var
      BIND_NONE = 0, // Not a binding
      BIND_VAR = 1, // Var-style binding
      BIND_LEXICAL = 2, // Let- or const-style binding
      BIND_FUNCTION = 3, // Function declaration
      BIND_SIMPLE_CATCH = 4, // Simple (identifier pattern) catch binding
      BIND_OUTSIDE = 5; // Special case for function names as bound inside the function

  var Parser = function Parser(options, input, startPos) {
    this.options = options = getOptions(options);
    this.sourceFile = options.sourceFile;
    this.keywords = wordsRegexp(keywords$1[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
    var reserved = "";
    if (options.allowReserved !== true) {
      reserved = reservedWords[options.ecmaVersion >= 6 ? 6 : options.ecmaVersion === 5 ? 5 : 3];
      if (options.sourceType === "module") { reserved += " await"; }
    }
    this.reservedWords = wordsRegexp(reserved);
    var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
    this.reservedWordsStrict = wordsRegexp(reservedStrict);
    this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords.strictBind);
    this.input = String(input);

    // Used to signal to callers of `readWord1` whether the word
    // contained any escape sequences. This is needed because words with
    // escape sequences must not be interpreted as keywords.
    this.containsEsc = false;

    // Set up token state

    // The current position of the tokenizer in the input.
    if (startPos) {
      this.pos = startPos;
      this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
      this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
    } else {
      this.pos = this.lineStart = 0;
      this.curLine = 1;
    }

    // Properties of the current token:
    // Its type
    this.type = types$1.eof;
    // For tokens that include more information than their type, the value
    this.value = null;
    // Its start and end offset
    this.start = this.end = this.pos;
    // And, if locations are used, the {line, column} object
    // corresponding to those offsets
    this.startLoc = this.endLoc = this.curPosition();

    // Position information for the previous token
    this.lastTokEndLoc = this.lastTokStartLoc = null;
    this.lastTokStart = this.lastTokEnd = this.pos;

    // The context stack is used to superficially track syntactic
    // context to predict whether a regular expression is allowed in a
    // given position.
    this.context = this.initialContext();
    this.exprAllowed = true;

    // Figure out if it's a module code.
    this.inModule = options.sourceType === "module";
    this.strict = this.inModule || this.strictDirective(this.pos);

    // Used to signify the start of a potential arrow function
    this.potentialArrowAt = -1;
    this.potentialArrowInForAwait = false;

    // Positions to delayed-check that yield/await does not exist in default parameters.
    this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
    // Labels in scope.
    this.labels = [];
    // Thus-far undefined exports.
    this.undefinedExports = Object.create(null);

    // If enabled, skip leading hashbang line.
    if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
      { this.skipLineComment(2); }

    // Scope tracking for duplicate variable names (see scope.js)
    this.scopeStack = [];
    this.enterScope(SCOPE_TOP);

    // For RegExp validation
    this.regexpState = null;

    // The stack of private names.
    // Each element has two properties: 'declared' and 'used'.
    // When it exited from the outermost class definition, all used private names must be declared.
    this.privateNameStack = [];
  };

  var prototypeAccessors = { inFunction: { configurable: true },inGenerator: { configurable: true },inAsync: { configurable: true },canAwait: { configurable: true },allowSuper: { configurable: true },allowDirectSuper: { configurable: true },treatFunctionsAsVar: { configurable: true },allowNewDotTarget: { configurable: true },inClassStaticBlock: { configurable: true } };

  Parser.prototype.parse = function parse () {
    var node = this.options.program || this.startNode();
    this.nextToken();
    return this.parseTopLevel(node)
  };

  prototypeAccessors.inFunction.get = function () { return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0 };

  prototypeAccessors.inGenerator.get = function () { return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0 && !this.currentVarScope().inClassFieldInit };

  prototypeAccessors.inAsync.get = function () { return (this.currentVarScope().flags & SCOPE_ASYNC) > 0 && !this.currentVarScope().inClassFieldInit };

  prototypeAccessors.canAwait.get = function () {
    for (var i = this.scopeStack.length - 1; i >= 0; i--) {
      var scope = this.scopeStack[i];
      if (scope.inClassFieldInit || scope.flags & SCOPE_CLASS_STATIC_BLOCK) { return false }
      if (scope.flags & SCOPE_FUNCTION) { return (scope.flags & SCOPE_ASYNC) > 0 }
    }
    return (this.inModule && this.options.ecmaVersion >= 13) || this.options.allowAwaitOutsideFunction
  };

  prototypeAccessors.allowSuper.get = function () {
    var ref = this.currentThisScope();
      var flags = ref.flags;
      var inClassFieldInit = ref.inClassFieldInit;
    return (flags & SCOPE_SUPER) > 0 || inClassFieldInit || this.options.allowSuperOutsideMethod
  };

  prototypeAccessors.allowDirectSuper.get = function () { return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0 };

  prototypeAccessors.treatFunctionsAsVar.get = function () { return this.treatFunctionsAsVarInScope(this.currentScope()) };

  prototypeAccessors.allowNewDotTarget.get = function () {
    var ref = this.currentThisScope();
      var flags = ref.flags;
      var inClassFieldInit = ref.inClassFieldInit;
    return (flags & (SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK)) > 0 || inClassFieldInit
  };

  prototypeAccessors.inClassStaticBlock.get = function () {
    return (this.currentVarScope().flags & SCOPE_CLASS_STATIC_BLOCK) > 0
  };

  Parser.extend = function extend () {
      var plugins = [], len = arguments.length;
      while ( len-- ) plugins[ len ] = arguments[ len ];

    var cls = this;
    for (var i = 0; i < plugins.length; i++) { cls = plugins[i](cls); }
    return cls
  };

  Parser.parse = function parse (input, options) {
    return new this(options, input).parse()
  };

  Parser.parseExpressionAt = function parseExpressionAt (input, pos, options) {
    var parser = new this(options, input, pos);
    parser.nextToken();
    return parser.parseExpression()
  };

  Parser.tokenizer = function tokenizer (input, options) {
    return new this(options, input)
  };

  Object.defineProperties( Parser.prototype, prototypeAccessors );

  var pp$9 = Parser.prototype;

  // ## Parser utilities

  var literal = /^(?:'((?:\\.|[^'\\])*?)'|"((?:\\.|[^"\\])*?)")/;
  pp$9.strictDirective = function(start) {
    for (;;) {
      // Try to find string literal.
      skipWhiteSpace.lastIndex = start;
      start += skipWhiteSpace.exec(this.input)[0].length;
      var match = literal.exec(this.input.slice(start));
      if (!match) { return false }
      if ((match[1] || match[2]) === "use strict") {
        skipWhiteSpace.lastIndex = start + match[0].length;
        var spaceAfter = skipWhiteSpace.exec(this.input), end = spaceAfter.index + spaceAfter[0].length;
        var next = this.input.charAt(end);
        return next === ";" || next === "}" ||
          (lineBreak.test(spaceAfter[0]) &&
           !(/[(`.[+\-/*%<>=,?^&]/.test(next) || next === "!" && this.input.charAt(end + 1) === "="))
      }
      start += match[0].length;

      // Skip semicolon, if any.
      skipWhiteSpace.lastIndex = start;
      start += skipWhiteSpace.exec(this.input)[0].length;
      if (this.input[start] === ";")
        { start++; }
    }
  };

  // Predicate that tests whether the next token is of the given
  // type, and if yes, consumes it as a side effect.

  pp$9.eat = function(type) {
    if (this.type === type) {
      this.next();
      return true
    } else {
      return false
    }
  };

  // Tests whether parsed token is a contextual keyword.

  pp$9.isContextual = function(name) {
    return this.type === types$1.name && this.value === name && !this.containsEsc
  };

  // Consumes contextual keyword if possible.

  pp$9.eatContextual = function(name) {
    if (!this.isContextual(name)) { return false }
    this.next();
    return true
  };

  // Asserts that following token is given contextual keyword.

  pp$9.expectContextual = function(name) {
    if (!this.eatContextual(name)) { this.unexpected(); }
  };

  // Test whether a semicolon can be inserted at the current position.

  pp$9.canInsertSemicolon = function() {
    return this.type === types$1.eof ||
      this.type === types$1.braceR ||
      lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
  };

  pp$9.insertSemicolon = function() {
    if (this.canInsertSemicolon()) {
      if (this.options.onInsertedSemicolon)
        { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
      return true
    }
  };

  // Consume a semicolon, or, failing that, see if we are allowed to
  // pretend that there is a semicolon at this position.

  pp$9.semicolon = function() {
    if (!this.eat(types$1.semi) && !this.insertSemicolon()) { this.unexpected(); }
  };

  pp$9.afterTrailingComma = function(tokType, notNext) {
    if (this.type === tokType) {
      if (this.options.onTrailingComma)
        { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
      if (!notNext)
        { this.next(); }
      return true
    }
  };

  // Expect a token of a given type. If found, consume it, otherwise,
  // raise an unexpected token error.

  pp$9.expect = function(type) {
    this.eat(type) || this.unexpected();
  };

  // Raise an unexpected token error.

  pp$9.unexpected = function(pos) {
    this.raise(pos != null ? pos : this.start, "Unexpected token");
  };

  function DestructuringErrors() {
    this.shorthandAssign =
    this.trailingComma =
    this.parenthesizedAssign =
    this.parenthesizedBind =
    this.doubleProto =
      -1;
  }

  pp$9.checkPatternErrors = function(refDestructuringErrors, isAssign) {
    if (!refDestructuringErrors) { return }
    if (refDestructuringErrors.trailingComma > -1)
      { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
    var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
    if (parens > -1) { this.raiseRecoverable(parens, "Parenthesized pattern"); }
  };

  pp$9.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
    if (!refDestructuringErrors) { return false }
    var shorthandAssign = refDestructuringErrors.shorthandAssign;
    var doubleProto = refDestructuringErrors.doubleProto;
    if (!andThrow) { return shorthandAssign >= 0 || doubleProto >= 0 }
    if (shorthandAssign >= 0)
      { this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns"); }
    if (doubleProto >= 0)
      { this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property"); }
  };

  pp$9.checkYieldAwaitInDefaultParams = function() {
    if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
      { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
    if (this.awaitPos)
      { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
  };

  pp$9.isSimpleAssignTarget = function(expr) {
    if (expr.type === "ParenthesizedExpression")
      { return this.isSimpleAssignTarget(expr.expression) }
    return expr.type === "Identifier" || expr.type === "MemberExpression"
  };

  var pp$8 = Parser.prototype;

  // ### Statement parsing

  // Parse a program. Initializes the parser, reads any number of
  // statements, and wraps them in a Program node.  Optionally takes a
  // `program` argument.  If present, the statements will be appended
  // to its body instead of creating a new node.

  pp$8.parseTopLevel = function(node) {
    var exports = Object.create(null);
    if (!node.body) { node.body = []; }
    while (this.type !== types$1.eof) {
      var stmt = this.parseStatement(null, true, exports);
      node.body.push(stmt);
    }
    if (this.inModule)
      { for (var i = 0, list = Object.keys(this.undefinedExports); i < list.length; i += 1)
        {
          var name = list[i];

          this.raiseRecoverable(this.undefinedExports[name].start, ("Export '" + name + "' is not defined"));
        } }
    this.adaptDirectivePrologue(node.body);
    this.next();
    node.sourceType = this.options.sourceType;
    return this.finishNode(node, "Program")
  };

  var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

  pp$8.isLet = function(context) {
    if (this.options.ecmaVersion < 6 || !this.isContextual("let")) { return false }
    skipWhiteSpace.lastIndex = this.pos;
    var skip = skipWhiteSpace.exec(this.input);
    var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
    // For ambiguous cases, determine if a LexicalDeclaration (or only a
    // Statement) is allowed here. If context is not empty then only a Statement
    // is allowed. However, `let [` is an explicit negative lookahead for
    // ExpressionStatement, so special-case it first.
    if (nextCh === 91 || nextCh === 92 || nextCh > 0xd7ff && nextCh < 0xdc00) { return true } // '[', '/', astral
    if (context) { return false }

    if (nextCh === 123) { return true } // '{'
    if (isIdentifierStart(nextCh, true)) {
      var pos = next + 1;
      while (isIdentifierChar(nextCh = this.input.charCodeAt(pos), true)) { ++pos; }
      if (nextCh === 92 || nextCh > 0xd7ff && nextCh < 0xdc00) { return true }
      var ident = this.input.slice(next, pos);
      if (!keywordRelationalOperator.test(ident)) { return true }
    }
    return false
  };

  // check 'async [no LineTerminator here] function'
  // - 'async /*foo*/ function' is OK.
  // - 'async /*\n*/ function' is invalid.
  pp$8.isAsyncFunction = function() {
    if (this.options.ecmaVersion < 8 || !this.isContextual("async"))
      { return false }

    skipWhiteSpace.lastIndex = this.pos;
    var skip = skipWhiteSpace.exec(this.input);
    var next = this.pos + skip[0].length, after;
    return !lineBreak.test(this.input.slice(this.pos, next)) &&
      this.input.slice(next, next + 8) === "function" &&
      (next + 8 === this.input.length ||
       !(isIdentifierChar(after = this.input.charCodeAt(next + 8)) || after > 0xd7ff && after < 0xdc00))
  };

  // Parse a single statement.
  //
  // If expecting a statement and finding a slash operator, parse a
  // regular expression literal. This is to handle cases like
  // `if (foo) /blah/.exec(foo)`, where looking at the previous token
  // does not help.

  pp$8.parseStatement = function(context, topLevel, exports) {
    var starttype = this.type, node = this.startNode(), kind;

    if (this.isLet(context)) {
      starttype = types$1._var;
      kind = "let";
    }

    // Most types of statements are recognized by the keyword they
    // start with. Many are trivial to parse, some require a bit of
    // complexity.

    switch (starttype) {
    case types$1._break: case types$1._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
    case types$1._debugger: return this.parseDebuggerStatement(node)
    case types$1._do: return this.parseDoStatement(node)
    case types$1._for: return this.parseForStatement(node)
    case types$1._function:
      // Function as sole body of either an if statement or a labeled statement
      // works, but not when it is part of a labeled statement that is the sole
      // body of an if statement.
      if ((context && (this.strict || context !== "if" && context !== "label")) && this.options.ecmaVersion >= 6) { this.unexpected(); }
      return this.parseFunctionStatement(node, false, !context)
    case types$1._class:
      if (context) { this.unexpected(); }
      return this.parseClass(node, true)
    case types$1._if: return this.parseIfStatement(node)
    case types$1._return: return this.parseReturnStatement(node)
    case types$1._switch: return this.parseSwitchStatement(node)
    case types$1._throw: return this.parseThrowStatement(node)
    case types$1._try: return this.parseTryStatement(node)
    case types$1._const: case types$1._var:
      kind = kind || this.value;
      if (context && kind !== "var") { this.unexpected(); }
      return this.parseVarStatement(node, kind)
    case types$1._while: return this.parseWhileStatement(node)
    case types$1._with: return this.parseWithStatement(node)
    case types$1.braceL: return this.parseBlock(true, node)
    case types$1.semi: return this.parseEmptyStatement(node)
    case types$1._export:
    case types$1._import:
      if (this.options.ecmaVersion > 10 && starttype === types$1._import) {
        skipWhiteSpace.lastIndex = this.pos;
        var skip = skipWhiteSpace.exec(this.input);
        var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
        if (nextCh === 40 || nextCh === 46) // '(' or '.'
          { return this.parseExpressionStatement(node, this.parseExpression()) }
      }

      if (!this.options.allowImportExportEverywhere) {
        if (!topLevel)
          { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
        if (!this.inModule)
          { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
      }
      return starttype === types$1._import ? this.parseImport(node) : this.parseExport(node, exports)

      // If the statement does not start with a statement keyword or a
      // brace, it's an ExpressionStatement or LabeledStatement. We
      // simply start parsing an expression, and afterwards, if the
      // next token is a colon and the expression was a simple
      // Identifier node, we switch to interpreting it as a label.
    default:
      if (this.isAsyncFunction()) {
        if (context) { this.unexpected(); }
        this.next();
        return this.parseFunctionStatement(node, true, !context)
      }

      var maybeName = this.value, expr = this.parseExpression();
      if (starttype === types$1.name && expr.type === "Identifier" && this.eat(types$1.colon))
        { return this.parseLabeledStatement(node, maybeName, expr, context) }
      else { return this.parseExpressionStatement(node, expr) }
    }
  };

  pp$8.parseBreakContinueStatement = function(node, keyword) {
    var isBreak = keyword === "break";
    this.next();
    if (this.eat(types$1.semi) || this.insertSemicolon()) { node.label = null; }
    else if (this.type !== types$1.name) { this.unexpected(); }
    else {
      node.label = this.parseIdent();
      this.semicolon();
    }

    // Verify that there is an actual destination to break or
    // continue to.
    var i = 0;
    for (; i < this.labels.length; ++i) {
      var lab = this.labels[i];
      if (node.label == null || lab.name === node.label.name) {
        if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
        if (node.label && isBreak) { break }
      }
    }
    if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
    return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
  };

  pp$8.parseDebuggerStatement = function(node) {
    this.next();
    this.semicolon();
    return this.finishNode(node, "DebuggerStatement")
  };

  pp$8.parseDoStatement = function(node) {
    this.next();
    this.labels.push(loopLabel);
    node.body = this.parseStatement("do");
    this.labels.pop();
    this.expect(types$1._while);
    node.test = this.parseParenExpression();
    if (this.options.ecmaVersion >= 6)
      { this.eat(types$1.semi); }
    else
      { this.semicolon(); }
    return this.finishNode(node, "DoWhileStatement")
  };

  // Disambiguating between a `for` and a `for`/`in` or `for`/`of`
  // loop is non-trivial. Basically, we have to parse the init `var`
  // statement or expression, disallowing the `in` operator (see
  // the second parameter to `parseExpression`), and then check
  // whether the next token is `in` or `of`. When there is no init
  // part (semicolon immediately after the opening parenthesis), it
  // is a regular `for` loop.

  pp$8.parseForStatement = function(node) {
    this.next();
    var awaitAt = (this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await")) ? this.lastTokStart : -1;
    this.labels.push(loopLabel);
    this.enterScope(0);
    this.expect(types$1.parenL);
    if (this.type === types$1.semi) {
      if (awaitAt > -1) { this.unexpected(awaitAt); }
      return this.parseFor(node, null)
    }
    var isLet = this.isLet();
    if (this.type === types$1._var || this.type === types$1._const || isLet) {
      var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
      this.next();
      this.parseVar(init$1, true, kind);
      this.finishNode(init$1, "VariableDeclaration");
      if ((this.type === types$1._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1) {
        if (this.options.ecmaVersion >= 9) {
          if (this.type === types$1._in) {
            if (awaitAt > -1) { this.unexpected(awaitAt); }
          } else { node.await = awaitAt > -1; }
        }
        return this.parseForIn(node, init$1)
      }
      if (awaitAt > -1) { this.unexpected(awaitAt); }
      return this.parseFor(node, init$1)
    }
    var startsWithLet = this.isContextual("let"), isForOf = false;
    var refDestructuringErrors = new DestructuringErrors;
    var init = this.parseExpression(awaitAt > -1 ? "await" : true, refDestructuringErrors);
    if (this.type === types$1._in || (isForOf = this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
      if (this.options.ecmaVersion >= 9) {
        if (this.type === types$1._in) {
          if (awaitAt > -1) { this.unexpected(awaitAt); }
        } else { node.await = awaitAt > -1; }
      }
      if (startsWithLet && isForOf) { this.raise(init.start, "The left-hand side of a for-of loop may not start with 'let'."); }
      this.toAssignable(init, false, refDestructuringErrors);
      this.checkLValPattern(init);
      return this.parseForIn(node, init)
    } else {
      this.checkExpressionErrors(refDestructuringErrors, true);
    }
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, init)
  };

  pp$8.parseFunctionStatement = function(node, isAsync, declarationPosition) {
    this.next();
    return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync)
  };

  pp$8.parseIfStatement = function(node) {
    this.next();
    node.test = this.parseParenExpression();
    // allow function declarations in branches, but only in non-strict mode
    node.consequent = this.parseStatement("if");
    node.alternate = this.eat(types$1._else) ? this.parseStatement("if") : null;
    return this.finishNode(node, "IfStatement")
  };

  pp$8.parseReturnStatement = function(node) {
    if (!this.inFunction && !this.options.allowReturnOutsideFunction)
      { this.raise(this.start, "'return' outside of function"); }
    this.next();

    // In `return` (and `break`/`continue`), the keywords with
    // optional arguments, we eagerly look for a semicolon or the
    // possibility to insert one.

    if (this.eat(types$1.semi) || this.insertSemicolon()) { node.argument = null; }
    else { node.argument = this.parseExpression(); this.semicolon(); }
    return this.finishNode(node, "ReturnStatement")
  };

  pp$8.parseSwitchStatement = function(node) {
    this.next();
    node.discriminant = this.parseParenExpression();
    node.cases = [];
    this.expect(types$1.braceL);
    this.labels.push(switchLabel);
    this.enterScope(0);

    // Statements under must be grouped (by label) in SwitchCase
    // nodes. `cur` is used to keep the node that we are currently
    // adding statements to.

    var cur;
    for (var sawDefault = false; this.type !== types$1.braceR;) {
      if (this.type === types$1._case || this.type === types$1._default) {
        var isCase = this.type === types$1._case;
        if (cur) { this.finishNode(cur, "SwitchCase"); }
        node.cases.push(cur = this.startNode());
        cur.consequent = [];
        this.next();
        if (isCase) {
          cur.test = this.parseExpression();
        } else {
          if (sawDefault) { this.raiseRecoverable(this.lastTokStart, "Multiple default clauses"); }
          sawDefault = true;
          cur.test = null;
        }
        this.expect(types$1.colon);
      } else {
        if (!cur) { this.unexpected(); }
        cur.consequent.push(this.parseStatement(null));
      }
    }
    this.exitScope();
    if (cur) { this.finishNode(cur, "SwitchCase"); }
    this.next(); // Closing brace
    this.labels.pop();
    return this.finishNode(node, "SwitchStatement")
  };

  pp$8.parseThrowStatement = function(node) {
    this.next();
    if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
      { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
    node.argument = this.parseExpression();
    this.semicolon();
    return this.finishNode(node, "ThrowStatement")
  };

  // Reused empty array added for node fields that are always empty.

  var empty$1 = [];

  pp$8.parseTryStatement = function(node) {
    this.next();
    node.block = this.parseBlock();
    node.handler = null;
    if (this.type === types$1._catch) {
      var clause = this.startNode();
      this.next();
      if (this.eat(types$1.parenL)) {
        clause.param = this.parseBindingAtom();
        var simple = clause.param.type === "Identifier";
        this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
        this.checkLValPattern(clause.param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
        this.expect(types$1.parenR);
      } else {
        if (this.options.ecmaVersion < 10) { this.unexpected(); }
        clause.param = null;
        this.enterScope(0);
      }
      clause.body = this.parseBlock(false);
      this.exitScope();
      node.handler = this.finishNode(clause, "CatchClause");
    }
    node.finalizer = this.eat(types$1._finally) ? this.parseBlock() : null;
    if (!node.handler && !node.finalizer)
      { this.raise(node.start, "Missing catch or finally clause"); }
    return this.finishNode(node, "TryStatement")
  };

  pp$8.parseVarStatement = function(node, kind) {
    this.next();
    this.parseVar(node, false, kind);
    this.semicolon();
    return this.finishNode(node, "VariableDeclaration")
  };

  pp$8.parseWhileStatement = function(node) {
    this.next();
    node.test = this.parseParenExpression();
    this.labels.push(loopLabel);
    node.body = this.parseStatement("while");
    this.labels.pop();
    return this.finishNode(node, "WhileStatement")
  };

  pp$8.parseWithStatement = function(node) {
    if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
    this.next();
    node.object = this.parseParenExpression();
    node.body = this.parseStatement("with");
    return this.finishNode(node, "WithStatement")
  };

  pp$8.parseEmptyStatement = function(node) {
    this.next();
    return this.finishNode(node, "EmptyStatement")
  };

  pp$8.parseLabeledStatement = function(node, maybeName, expr, context) {
    for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1)
      {
      var label = list[i$1];

      if (label.name === maybeName)
        { this.raise(expr.start, "Label '" + maybeName + "' is already declared");
    } }
    var kind = this.type.isLoop ? "loop" : this.type === types$1._switch ? "switch" : null;
    for (var i = this.labels.length - 1; i >= 0; i--) {
      var label$1 = this.labels[i];
      if (label$1.statementStart === node.start) {
        // Update information about previous labels on this node
        label$1.statementStart = this.start;
        label$1.kind = kind;
      } else { break }
    }
    this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
    node.body = this.parseStatement(context ? context.indexOf("label") === -1 ? context + "label" : context : "label");
    this.labels.pop();
    node.label = expr;
    return this.finishNode(node, "LabeledStatement")
  };

  pp$8.parseExpressionStatement = function(node, expr) {
    node.expression = expr;
    this.semicolon();
    return this.finishNode(node, "ExpressionStatement")
  };

  // Parse a semicolon-enclosed block of statements, handling `"use
  // strict"` declarations when `allowStrict` is true (used for
  // function bodies).

  pp$8.parseBlock = function(createNewLexicalScope, node, exitStrict) {
    if ( createNewLexicalScope === void 0 ) createNewLexicalScope = true;
    if ( node === void 0 ) node = this.startNode();

    node.body = [];
    this.expect(types$1.braceL);
    if (createNewLexicalScope) { this.enterScope(0); }
    while (this.type !== types$1.braceR) {
      var stmt = this.parseStatement(null);
      node.body.push(stmt);
    }
    if (exitStrict) { this.strict = false; }
    this.next();
    if (createNewLexicalScope) { this.exitScope(); }
    return this.finishNode(node, "BlockStatement")
  };

  // Parse a regular `for` loop. The disambiguation code in
  // `parseStatement` will already have parsed the init statement or
  // expression.

  pp$8.parseFor = function(node, init) {
    node.init = init;
    this.expect(types$1.semi);
    node.test = this.type === types$1.semi ? null : this.parseExpression();
    this.expect(types$1.semi);
    node.update = this.type === types$1.parenR ? null : this.parseExpression();
    this.expect(types$1.parenR);
    node.body = this.parseStatement("for");
    this.exitScope();
    this.labels.pop();
    return this.finishNode(node, "ForStatement")
  };

  // Parse a `for`/`in` and `for`/`of` loop, which are almost
  // same from parser's perspective.

  pp$8.parseForIn = function(node, init) {
    var isForIn = this.type === types$1._in;
    this.next();

    if (
      init.type === "VariableDeclaration" &&
      init.declarations[0].init != null &&
      (
        !isForIn ||
        this.options.ecmaVersion < 8 ||
        this.strict ||
        init.kind !== "var" ||
        init.declarations[0].id.type !== "Identifier"
      )
    ) {
      this.raise(
        init.start,
        ((isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer")
      );
    }
    node.left = init;
    node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
    this.expect(types$1.parenR);
    node.body = this.parseStatement("for");
    this.exitScope();
    this.labels.pop();
    return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement")
  };

  // Parse a list of variable declarations.

  pp$8.parseVar = function(node, isFor, kind) {
    node.declarations = [];
    node.kind = kind;
    for (;;) {
      var decl = this.startNode();
      this.parseVarId(decl, kind);
      if (this.eat(types$1.eq)) {
        decl.init = this.parseMaybeAssign(isFor);
      } else if (kind === "const" && !(this.type === types$1._in || (this.options.ecmaVersion >= 6 && this.isContextual("of")))) {
        this.unexpected();
      } else if (decl.id.type !== "Identifier" && !(isFor && (this.type === types$1._in || this.isContextual("of")))) {
        this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
      } else {
        decl.init = null;
      }
      node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
      if (!this.eat(types$1.comma)) { break }
    }
    return node
  };

  pp$8.parseVarId = function(decl, kind) {
    decl.id = this.parseBindingAtom();
    this.checkLValPattern(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
  };

  var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;

  // Parse a function declaration or literal (depending on the
  // `statement & FUNC_STATEMENT`).

  // Remove `allowExpressionBody` for 7.0.0, as it is only called with false
  pp$8.parseFunction = function(node, statement, allowExpressionBody, isAsync, forInit) {
    this.initFunction(node);
    if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
      if (this.type === types$1.star && (statement & FUNC_HANGING_STATEMENT))
        { this.unexpected(); }
      node.generator = this.eat(types$1.star);
    }
    if (this.options.ecmaVersion >= 8)
      { node.async = !!isAsync; }

    if (statement & FUNC_STATEMENT) {
      node.id = (statement & FUNC_NULLABLE_ID) && this.type !== types$1.name ? null : this.parseIdent();
      if (node.id && !(statement & FUNC_HANGING_STATEMENT))
        // If it is a regular function declaration in sloppy mode, then it is
        // subject to Annex B semantics (BIND_FUNCTION). Otherwise, the binding
        // mode depends on properties of the current scope (see
        // treatFunctionsAsVar).
        { this.checkLValSimple(node.id, (this.strict || node.generator || node.async) ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION); }
    }

    var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    this.enterScope(functionFlags(node.async, node.generator));

    if (!(statement & FUNC_STATEMENT))
      { node.id = this.type === types$1.name ? this.parseIdent() : null; }

    this.parseFunctionParams(node);
    this.parseFunctionBody(node, allowExpressionBody, false, forInit);

    this.yieldPos = oldYieldPos;
    this.awaitPos = oldAwaitPos;
    this.awaitIdentPos = oldAwaitIdentPos;
    return this.finishNode(node, (statement & FUNC_STATEMENT) ? "FunctionDeclaration" : "FunctionExpression")
  };

  pp$8.parseFunctionParams = function(node) {
    this.expect(types$1.parenL);
    node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
    this.checkYieldAwaitInDefaultParams();
  };

  // Parse a class declaration or literal (depending on the
  // `isStatement` parameter).

  pp$8.parseClass = function(node, isStatement) {
    this.next();

    // ecma-262 14.6 Class Definitions
    // A class definition is always strict mode code.
    var oldStrict = this.strict;
    this.strict = true;

    this.parseClassId(node, isStatement);
    this.parseClassSuper(node);
    var privateNameMap = this.enterClassBody();
    var classBody = this.startNode();
    var hadConstructor = false;
    classBody.body = [];
    this.expect(types$1.braceL);
    while (this.type !== types$1.braceR) {
      var element = this.parseClassElement(node.superClass !== null);
      if (element) {
        classBody.body.push(element);
        if (element.type === "MethodDefinition" && element.kind === "constructor") {
          if (hadConstructor) { this.raise(element.start, "Duplicate constructor in the same class"); }
          hadConstructor = true;
        } else if (element.key && element.key.type === "PrivateIdentifier" && isPrivateNameConflicted(privateNameMap, element)) {
          this.raiseRecoverable(element.key.start, ("Identifier '#" + (element.key.name) + "' has already been declared"));
        }
      }
    }
    this.strict = oldStrict;
    this.next();
    node.body = this.finishNode(classBody, "ClassBody");
    this.exitClassBody();
    return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
  };

  pp$8.parseClassElement = function(constructorAllowsSuper) {
    if (this.eat(types$1.semi)) { return null }

    var ecmaVersion = this.options.ecmaVersion;
    var node = this.startNode();
    var keyName = "";
    var isGenerator = false;
    var isAsync = false;
    var kind = "method";
    var isStatic = false;

    if (this.eatContextual("static")) {
      // Parse static init block
      if (ecmaVersion >= 13 && this.eat(types$1.braceL)) {
        this.parseClassStaticBlock(node);
        return node
      }
      if (this.isClassElementNameStart() || this.type === types$1.star) {
        isStatic = true;
      } else {
        keyName = "static";
      }
    }
    node.static = isStatic;
    if (!keyName && ecmaVersion >= 8 && this.eatContextual("async")) {
      if ((this.isClassElementNameStart() || this.type === types$1.star) && !this.canInsertSemicolon()) {
        isAsync = true;
      } else {
        keyName = "async";
      }
    }
    if (!keyName && (ecmaVersion >= 9 || !isAsync) && this.eat(types$1.star)) {
      isGenerator = true;
    }
    if (!keyName && !isAsync && !isGenerator) {
      var lastValue = this.value;
      if (this.eatContextual("get") || this.eatContextual("set")) {
        if (this.isClassElementNameStart()) {
          kind = lastValue;
        } else {
          keyName = lastValue;
        }
      }
    }

    // Parse element name
    if (keyName) {
      // 'async', 'get', 'set', or 'static' were not a keyword contextually.
      // The last token is any of those. Make it the element name.
      node.computed = false;
      node.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
      node.key.name = keyName;
      this.finishNode(node.key, "Identifier");
    } else {
      this.parseClassElementName(node);
    }

    // Parse element value
    if (ecmaVersion < 13 || this.type === types$1.parenL || kind !== "method" || isGenerator || isAsync) {
      var isConstructor = !node.static && checkKeyName(node, "constructor");
      var allowsDirectSuper = isConstructor && constructorAllowsSuper;
      // Couldn't move this check into the 'parseClassMethod' method for backward compatibility.
      if (isConstructor && kind !== "method") { this.raise(node.key.start, "Constructor can't have get/set modifier"); }
      node.kind = isConstructor ? "constructor" : kind;
      this.parseClassMethod(node, isGenerator, isAsync, allowsDirectSuper);
    } else {
      this.parseClassField(node);
    }

    return node
  };

  pp$8.isClassElementNameStart = function() {
    return (
      this.type === types$1.name ||
      this.type === types$1.privateId ||
      this.type === types$1.num ||
      this.type === types$1.string ||
      this.type === types$1.bracketL ||
      this.type.keyword
    )
  };

  pp$8.parseClassElementName = function(element) {
    if (this.type === types$1.privateId) {
      if (this.value === "constructor") {
        this.raise(this.start, "Classes can't have an element named '#constructor'");
      }
      element.computed = false;
      element.key = this.parsePrivateIdent();
    } else {
      this.parsePropertyName(element);
    }
  };

  pp$8.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
    // Check key and flags
    var key = method.key;
    if (method.kind === "constructor") {
      if (isGenerator) { this.raise(key.start, "Constructor can't be a generator"); }
      if (isAsync) { this.raise(key.start, "Constructor can't be an async method"); }
    } else if (method.static && checkKeyName(method, "prototype")) {
      this.raise(key.start, "Classes may not have a static property named prototype");
    }

    // Parse value
    var value = method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);

    // Check value
    if (method.kind === "get" && value.params.length !== 0)
      { this.raiseRecoverable(value.start, "getter should have no params"); }
    if (method.kind === "set" && value.params.length !== 1)
      { this.raiseRecoverable(value.start, "setter should have exactly one param"); }
    if (method.kind === "set" && value.params[0].type === "RestElement")
      { this.raiseRecoverable(value.params[0].start, "Setter cannot use rest params"); }

    return this.finishNode(method, "MethodDefinition")
  };

  pp$8.parseClassField = function(field) {
    if (checkKeyName(field, "constructor")) {
      this.raise(field.key.start, "Classes can't have a field named 'constructor'");
    } else if (field.static && checkKeyName(field, "prototype")) {
      this.raise(field.key.start, "Classes can't have a static field named 'prototype'");
    }

    if (this.eat(types$1.eq)) {
      // To raise SyntaxError if 'arguments' exists in the initializer.
      var scope = this.currentThisScope();
      var inClassFieldInit = scope.inClassFieldInit;
      scope.inClassFieldInit = true;
      field.value = this.parseMaybeAssign();
      scope.inClassFieldInit = inClassFieldInit;
    } else {
      field.value = null;
    }
    this.semicolon();

    return this.finishNode(field, "PropertyDefinition")
  };

  pp$8.parseClassStaticBlock = function(node) {
    node.body = [];

    var oldLabels = this.labels;
    this.labels = [];
    this.enterScope(SCOPE_CLASS_STATIC_BLOCK | SCOPE_SUPER);
    while (this.type !== types$1.braceR) {
      var stmt = this.parseStatement(null);
      node.body.push(stmt);
    }
    this.next();
    this.exitScope();
    this.labels = oldLabels;

    return this.finishNode(node, "StaticBlock")
  };

  pp$8.parseClassId = function(node, isStatement) {
    if (this.type === types$1.name) {
      node.id = this.parseIdent();
      if (isStatement)
        { this.checkLValSimple(node.id, BIND_LEXICAL, false); }
    } else {
      if (isStatement === true)
        { this.unexpected(); }
      node.id = null;
    }
  };

  pp$8.parseClassSuper = function(node) {
    node.superClass = this.eat(types$1._extends) ? this.parseExprSubscripts(false) : null;
  };

  pp$8.enterClassBody = function() {
    var element = {declared: Object.create(null), used: []};
    this.privateNameStack.push(element);
    return element.declared
  };

  pp$8.exitClassBody = function() {
    var ref = this.privateNameStack.pop();
    var declared = ref.declared;
    var used = ref.used;
    var len = this.privateNameStack.length;
    var parent = len === 0 ? null : this.privateNameStack[len - 1];
    for (var i = 0; i < used.length; ++i) {
      var id = used[i];
      if (!hasOwn(declared, id.name)) {
        if (parent) {
          parent.used.push(id);
        } else {
          this.raiseRecoverable(id.start, ("Private field '#" + (id.name) + "' must be declared in an enclosing class"));
        }
      }
    }
  };

  function isPrivateNameConflicted(privateNameMap, element) {
    var name = element.key.name;
    var curr = privateNameMap[name];

    var next = "true";
    if (element.type === "MethodDefinition" && (element.kind === "get" || element.kind === "set")) {
      next = (element.static ? "s" : "i") + element.kind;
    }

    // `class { get #a(){}; static set #a(_){} }` is also conflict.
    if (
      curr === "iget" && next === "iset" ||
      curr === "iset" && next === "iget" ||
      curr === "sget" && next === "sset" ||
      curr === "sset" && next === "sget"
    ) {
      privateNameMap[name] = "true";
      return false
    } else if (!curr) {
      privateNameMap[name] = next;
      return false
    } else {
      return true
    }
  }

  function checkKeyName(node, name) {
    var computed = node.computed;
    var key = node.key;
    return !computed && (
      key.type === "Identifier" && key.name === name ||
      key.type === "Literal" && key.value === name
    )
  }

  // Parses module export declaration.

  pp$8.parseExport = function(node, exports) {
    this.next();
    // export * from '...'
    if (this.eat(types$1.star)) {
      if (this.options.ecmaVersion >= 11) {
        if (this.eatContextual("as")) {
          node.exported = this.parseModuleExportName();
          this.checkExport(exports, node.exported.name, this.lastTokStart);
        } else {
          node.exported = null;
        }
      }
      this.expectContextual("from");
      if (this.type !== types$1.string) { this.unexpected(); }
      node.source = this.parseExprAtom();
      this.semicolon();
      return this.finishNode(node, "ExportAllDeclaration")
    }
    if (this.eat(types$1._default)) { // export default ...
      this.checkExport(exports, "default", this.lastTokStart);
      var isAsync;
      if (this.type === types$1._function || (isAsync = this.isAsyncFunction())) {
        var fNode = this.startNode();
        this.next();
        if (isAsync) { this.next(); }
        node.declaration = this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync);
      } else if (this.type === types$1._class) {
        var cNode = this.startNode();
        node.declaration = this.parseClass(cNode, "nullableID");
      } else {
        node.declaration = this.parseMaybeAssign();
        this.semicolon();
      }
      return this.finishNode(node, "ExportDefaultDeclaration")
    }
    // export var|const|let|function|class ...
    if (this.shouldParseExportStatement()) {
      node.declaration = this.parseStatement(null);
      if (node.declaration.type === "VariableDeclaration")
        { this.checkVariableExport(exports, node.declaration.declarations); }
      else
        { this.checkExport(exports, node.declaration.id.name, node.declaration.id.start); }
      node.specifiers = [];
      node.source = null;
    } else { // export { x, y as z } [from '...']
      node.declaration = null;
      node.specifiers = this.parseExportSpecifiers(exports);
      if (this.eatContextual("from")) {
        if (this.type !== types$1.string) { this.unexpected(); }
        node.source = this.parseExprAtom();
      } else {
        for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
          // check for keywords used as local names
          var spec = list[i];

          this.checkUnreserved(spec.local);
          // check if export is defined
          this.checkLocalExport(spec.local);

          if (spec.local.type === "Literal") {
            this.raise(spec.local.start, "A string literal cannot be used as an exported binding without `from`.");
          }
        }

        node.source = null;
      }
      this.semicolon();
    }
    return this.finishNode(node, "ExportNamedDeclaration")
  };

  pp$8.checkExport = function(exports, name, pos) {
    if (!exports) { return }
    if (hasOwn(exports, name))
      { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
    exports[name] = true;
  };

  pp$8.checkPatternExport = function(exports, pat) {
    var type = pat.type;
    if (type === "Identifier")
      { this.checkExport(exports, pat.name, pat.start); }
    else if (type === "ObjectPattern")
      { for (var i = 0, list = pat.properties; i < list.length; i += 1)
        {
          var prop = list[i];

          this.checkPatternExport(exports, prop);
        } }
    else if (type === "ArrayPattern")
      { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
        var elt = list$1[i$1];

          if (elt) { this.checkPatternExport(exports, elt); }
      } }
    else if (type === "Property")
      { this.checkPatternExport(exports, pat.value); }
    else if (type === "AssignmentPattern")
      { this.checkPatternExport(exports, pat.left); }
    else if (type === "RestElement")
      { this.checkPatternExport(exports, pat.argument); }
    else if (type === "ParenthesizedExpression")
      { this.checkPatternExport(exports, pat.expression); }
  };

  pp$8.checkVariableExport = function(exports, decls) {
    if (!exports) { return }
    for (var i = 0, list = decls; i < list.length; i += 1)
      {
      var decl = list[i];

      this.checkPatternExport(exports, decl.id);
    }
  };

  pp$8.shouldParseExportStatement = function() {
    return this.type.keyword === "var" ||
      this.type.keyword === "const" ||
      this.type.keyword === "class" ||
      this.type.keyword === "function" ||
      this.isLet() ||
      this.isAsyncFunction()
  };

  // Parses a comma-separated list of module exports.

  pp$8.parseExportSpecifiers = function(exports) {
    var nodes = [], first = true;
    // export { x, y as z } [from '...']
    this.expect(types$1.braceL);
    while (!this.eat(types$1.braceR)) {
      if (!first) {
        this.expect(types$1.comma);
        if (this.afterTrailingComma(types$1.braceR)) { break }
      } else { first = false; }

      var node = this.startNode();
      node.local = this.parseModuleExportName();
      node.exported = this.eatContextual("as") ? this.parseModuleExportName() : node.local;
      this.checkExport(
        exports,
        node.exported[node.exported.type === "Identifier" ? "name" : "value"],
        node.exported.start
      );
      nodes.push(this.finishNode(node, "ExportSpecifier"));
    }
    return nodes
  };

  // Parses import declaration.

  pp$8.parseImport = function(node) {
    this.next();
    // import '...'
    if (this.type === types$1.string) {
      node.specifiers = empty$1;
      node.source = this.parseExprAtom();
    } else {
      node.specifiers = this.parseImportSpecifiers();
      this.expectContextual("from");
      node.source = this.type === types$1.string ? this.parseExprAtom() : this.unexpected();
    }
    this.semicolon();
    return this.finishNode(node, "ImportDeclaration")
  };

  // Parses a comma-separated list of module imports.

  pp$8.parseImportSpecifiers = function() {
    var nodes = [], first = true;
    if (this.type === types$1.name) {
      // import defaultObj, { x, y as z } from '...'
      var node = this.startNode();
      node.local = this.parseIdent();
      this.checkLValSimple(node.local, BIND_LEXICAL);
      nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
      if (!this.eat(types$1.comma)) { return nodes }
    }
    if (this.type === types$1.star) {
      var node$1 = this.startNode();
      this.next();
      this.expectContextual("as");
      node$1.local = this.parseIdent();
      this.checkLValSimple(node$1.local, BIND_LEXICAL);
      nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
      return nodes
    }
    this.expect(types$1.braceL);
    while (!this.eat(types$1.braceR)) {
      if (!first) {
        this.expect(types$1.comma);
        if (this.afterTrailingComma(types$1.braceR)) { break }
      } else { first = false; }

      var node$2 = this.startNode();
      node$2.imported = this.parseModuleExportName();
      if (this.eatContextual("as")) {
        node$2.local = this.parseIdent();
      } else {
        this.checkUnreserved(node$2.imported);
        node$2.local = node$2.imported;
      }
      this.checkLValSimple(node$2.local, BIND_LEXICAL);
      nodes.push(this.finishNode(node$2, "ImportSpecifier"));
    }
    return nodes
  };

  pp$8.parseModuleExportName = function() {
    if (this.options.ecmaVersion >= 13 && this.type === types$1.string) {
      var stringLiteral = this.parseLiteral(this.value);
      if (loneSurrogate.test(stringLiteral.value)) {
        this.raise(stringLiteral.start, "An export name cannot include a lone surrogate.");
      }
      return stringLiteral
    }
    return this.parseIdent(true)
  };

  // Set `ExpressionStatement#directive` property for directive prologues.
  pp$8.adaptDirectivePrologue = function(statements) {
    for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
      statements[i].directive = statements[i].expression.raw.slice(1, -1);
    }
  };
  pp$8.isDirectiveCandidate = function(statement) {
    return (
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "Literal" &&
      typeof statement.expression.value === "string" &&
      // Reject parenthesized strings.
      (this.input[statement.start] === "\"" || this.input[statement.start] === "'")
    )
  };

  var pp$7 = Parser.prototype;

  // Convert existing expression atom to assignable pattern
  // if possible.

  pp$7.toAssignable = function(node, isBinding, refDestructuringErrors) {
    if (this.options.ecmaVersion >= 6 && node) {
      switch (node.type) {
      case "Identifier":
        if (this.inAsync && node.name === "await")
          { this.raise(node.start, "Cannot use 'await' as identifier inside an async function"); }
        break

      case "ObjectPattern":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "RestElement":
        break

      case "ObjectExpression":
        node.type = "ObjectPattern";
        if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
        for (var i = 0, list = node.properties; i < list.length; i += 1) {
          var prop = list[i];

        this.toAssignable(prop, isBinding);
          // Early error:
          //   AssignmentRestProperty[Yield, Await] :
          //     `...` DestructuringAssignmentTarget[Yield, Await]
          //
          //   It is a Syntax Error if |DestructuringAssignmentTarget| is an |ArrayLiteral| or an |ObjectLiteral|.
          if (
            prop.type === "RestElement" &&
            (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")
          ) {
            this.raise(prop.argument.start, "Unexpected token");
          }
        }
        break

      case "Property":
        // AssignmentProperty has type === "Property"
        if (node.kind !== "init") { this.raise(node.key.start, "Object pattern can't contain getter or setter"); }
        this.toAssignable(node.value, isBinding);
        break

      case "ArrayExpression":
        node.type = "ArrayPattern";
        if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
        this.toAssignableList(node.elements, isBinding);
        break

      case "SpreadElement":
        node.type = "RestElement";
        this.toAssignable(node.argument, isBinding);
        if (node.argument.type === "AssignmentPattern")
          { this.raise(node.argument.start, "Rest elements cannot have a default value"); }
        break

      case "AssignmentExpression":
        if (node.operator !== "=") { this.raise(node.left.end, "Only '=' operator can be used for specifying default value."); }
        node.type = "AssignmentPattern";
        delete node.operator;
        this.toAssignable(node.left, isBinding);
        break

      case "ParenthesizedExpression":
        this.toAssignable(node.expression, isBinding, refDestructuringErrors);
        break

      case "ChainExpression":
        this.raiseRecoverable(node.start, "Optional chaining cannot appear in left-hand side");
        break

      case "MemberExpression":
        if (!isBinding) { break }

      default:
        this.raise(node.start, "Assigning to rvalue");
      }
    } else if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
    return node
  };

  // Convert list of expression atoms to binding list.

  pp$7.toAssignableList = function(exprList, isBinding) {
    var end = exprList.length;
    for (var i = 0; i < end; i++) {
      var elt = exprList[i];
      if (elt) { this.toAssignable(elt, isBinding); }
    }
    if (end) {
      var last = exprList[end - 1];
      if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
        { this.unexpected(last.argument.start); }
    }
    return exprList
  };

  // Parses spread element.

  pp$7.parseSpread = function(refDestructuringErrors) {
    var node = this.startNode();
    this.next();
    node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
    return this.finishNode(node, "SpreadElement")
  };

  pp$7.parseRestBinding = function() {
    var node = this.startNode();
    this.next();

    // RestElement inside of a function parameter must be an identifier
    if (this.options.ecmaVersion === 6 && this.type !== types$1.name)
      { this.unexpected(); }

    node.argument = this.parseBindingAtom();

    return this.finishNode(node, "RestElement")
  };

  // Parses lvalue (assignable) atom.

  pp$7.parseBindingAtom = function() {
    if (this.options.ecmaVersion >= 6) {
      switch (this.type) {
      case types$1.bracketL:
        var node = this.startNode();
        this.next();
        node.elements = this.parseBindingList(types$1.bracketR, true, true);
        return this.finishNode(node, "ArrayPattern")

      case types$1.braceL:
        return this.parseObj(true)
      }
    }
    return this.parseIdent()
  };

  pp$7.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
    var elts = [], first = true;
    while (!this.eat(close)) {
      if (first) { first = false; }
      else { this.expect(types$1.comma); }
      if (allowEmpty && this.type === types$1.comma) {
        elts.push(null);
      } else if (allowTrailingComma && this.afterTrailingComma(close)) {
        break
      } else if (this.type === types$1.ellipsis) {
        var rest = this.parseRestBinding();
        this.parseBindingListItem(rest);
        elts.push(rest);
        if (this.type === types$1.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
        this.expect(close);
        break
      } else {
        var elem = this.parseMaybeDefault(this.start, this.startLoc);
        this.parseBindingListItem(elem);
        elts.push(elem);
      }
    }
    return elts
  };

  pp$7.parseBindingListItem = function(param) {
    return param
  };

  // Parses assignment pattern around given atom if possible.

  pp$7.parseMaybeDefault = function(startPos, startLoc, left) {
    left = left || this.parseBindingAtom();
    if (this.options.ecmaVersion < 6 || !this.eat(types$1.eq)) { return left }
    var node = this.startNodeAt(startPos, startLoc);
    node.left = left;
    node.right = this.parseMaybeAssign();
    return this.finishNode(node, "AssignmentPattern")
  };

  // The following three functions all verify that a node is an lvalue —
  // something that can be bound, or assigned to. In order to do so, they perform
  // a variety of checks:
  //
  // - Check that none of the bound/assigned-to identifiers are reserved words.
  // - Record name declarations for bindings in the appropriate scope.
  // - Check duplicate argument names, if checkClashes is set.
  //
  // If a complex binding pattern is encountered (e.g., object and array
  // destructuring), the entire pattern is recursively checked.
  //
  // There are three versions of checkLVal*() appropriate for different
  // circumstances:
  //
  // - checkLValSimple() shall be used if the syntactic construct supports
  //   nothing other than identifiers and member expressions. Parenthesized
  //   expressions are also correctly handled. This is generally appropriate for
  //   constructs for which the spec says
  //
  //   > It is a Syntax Error if AssignmentTargetType of [the production] is not
  //   > simple.
  //
  //   It is also appropriate for checking if an identifier is valid and not
  //   defined elsewhere, like import declarations or function/class identifiers.
  //
  //   Examples where this is used include:
  //     a += …;
  //     import a from '…';
  //   where a is the node to be checked.
  //
  // - checkLValPattern() shall be used if the syntactic construct supports
  //   anything checkLValSimple() supports, as well as object and array
  //   destructuring patterns. This is generally appropriate for constructs for
  //   which the spec says
  //
  //   > It is a Syntax Error if [the production] is neither an ObjectLiteral nor
  //   > an ArrayLiteral and AssignmentTargetType of [the production] is not
  //   > simple.
  //
  //   Examples where this is used include:
  //     (a = …);
  //     const a = …;
  //     try { … } catch (a) { … }
  //   where a is the node to be checked.
  //
  // - checkLValInnerPattern() shall be used if the syntactic construct supports
  //   anything checkLValPattern() supports, as well as default assignment
  //   patterns, rest elements, and other constructs that may appear within an
  //   object or array destructuring pattern.
  //
  //   As a special case, function parameters also use checkLValInnerPattern(),
  //   as they also support defaults and rest constructs.
  //
  // These functions deliberately support both assignment and binding constructs,
  // as the logic for both is exceedingly similar. If the node is the target of
  // an assignment, then bindingType should be set to BIND_NONE. Otherwise, it
  // should be set to the appropriate BIND_* constant, like BIND_VAR or
  // BIND_LEXICAL.
  //
  // If the function is called with a non-BIND_NONE bindingType, then
  // additionally a checkClashes object may be specified to allow checking for
  // duplicate argument names. checkClashes is ignored if the provided construct
  // is an assignment (i.e., bindingType is BIND_NONE).

  pp$7.checkLValSimple = function(expr, bindingType, checkClashes) {
    if ( bindingType === void 0 ) bindingType = BIND_NONE;

    var isBind = bindingType !== BIND_NONE;

    switch (expr.type) {
    case "Identifier":
      if (this.strict && this.reservedWordsStrictBind.test(expr.name))
        { this.raiseRecoverable(expr.start, (isBind ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
      if (isBind) {
        if (bindingType === BIND_LEXICAL && expr.name === "let")
          { this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name"); }
        if (checkClashes) {
          if (hasOwn(checkClashes, expr.name))
            { this.raiseRecoverable(expr.start, "Argument name clash"); }
          checkClashes[expr.name] = true;
        }
        if (bindingType !== BIND_OUTSIDE) { this.declareName(expr.name, bindingType, expr.start); }
      }
      break

    case "ChainExpression":
      this.raiseRecoverable(expr.start, "Optional chaining cannot appear in left-hand side");
      break

    case "MemberExpression":
      if (isBind) { this.raiseRecoverable(expr.start, "Binding member expression"); }
      break

    case "ParenthesizedExpression":
      if (isBind) { this.raiseRecoverable(expr.start, "Binding parenthesized expression"); }
      return this.checkLValSimple(expr.expression, bindingType, checkClashes)

    default:
      this.raise(expr.start, (isBind ? "Binding" : "Assigning to") + " rvalue");
    }
  };

  pp$7.checkLValPattern = function(expr, bindingType, checkClashes) {
    if ( bindingType === void 0 ) bindingType = BIND_NONE;

    switch (expr.type) {
    case "ObjectPattern":
      for (var i = 0, list = expr.properties; i < list.length; i += 1) {
        var prop = list[i];

      this.checkLValInnerPattern(prop, bindingType, checkClashes);
      }
      break

    case "ArrayPattern":
      for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
        var elem = list$1[i$1];

      if (elem) { this.checkLValInnerPattern(elem, bindingType, checkClashes); }
      }
      break

    default:
      this.checkLValSimple(expr, bindingType, checkClashes);
    }
  };

  pp$7.checkLValInnerPattern = function(expr, bindingType, checkClashes) {
    if ( bindingType === void 0 ) bindingType = BIND_NONE;

    switch (expr.type) {
    case "Property":
      // AssignmentProperty has type === "Property"
      this.checkLValInnerPattern(expr.value, bindingType, checkClashes);
      break

    case "AssignmentPattern":
      this.checkLValPattern(expr.left, bindingType, checkClashes);
      break

    case "RestElement":
      this.checkLValPattern(expr.argument, bindingType, checkClashes);
      break

    default:
      this.checkLValPattern(expr, bindingType, checkClashes);
    }
  };

  // The algorithm used to determine whether a regexp can appear at a

  var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
    this.token = token;
    this.isExpr = !!isExpr;
    this.preserveSpace = !!preserveSpace;
    this.override = override;
    this.generator = !!generator;
  };

  var types = {
    b_stat: new TokContext("{", false),
    b_expr: new TokContext("{", true),
    b_tmpl: new TokContext("${", false),
    p_stat: new TokContext("(", false),
    p_expr: new TokContext("(", true),
    q_tmpl: new TokContext("`", true, true, function (p) { return p.tryReadTemplateToken(); }),
    f_stat: new TokContext("function", false),
    f_expr: new TokContext("function", true),
    f_expr_gen: new TokContext("function", true, false, null, true),
    f_gen: new TokContext("function", false, false, null, true)
  };

  var pp$6 = Parser.prototype;

  pp$6.initialContext = function() {
    return [types.b_stat]
  };

  pp$6.curContext = function() {
    return this.context[this.context.length - 1]
  };

  pp$6.braceIsBlock = function(prevType) {
    var parent = this.curContext();
    if (parent === types.f_expr || parent === types.f_stat)
      { return true }
    if (prevType === types$1.colon && (parent === types.b_stat || parent === types.b_expr))
      { return !parent.isExpr }

    // The check for `tt.name && exprAllowed` detects whether we are
    // after a `yield` or `of` construct. See the `updateContext` for
    // `tt.name`.
    if (prevType === types$1._return || prevType === types$1.name && this.exprAllowed)
      { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
    if (prevType === types$1._else || prevType === types$1.semi || prevType === types$1.eof || prevType === types$1.parenR || prevType === types$1.arrow)
      { return true }
    if (prevType === types$1.braceL)
      { return parent === types.b_stat }
    if (prevType === types$1._var || prevType === types$1._const || prevType === types$1.name)
      { return false }
    return !this.exprAllowed
  };

  pp$6.inGeneratorContext = function() {
    for (var i = this.context.length - 1; i >= 1; i--) {
      var context = this.context[i];
      if (context.token === "function")
        { return context.generator }
    }
    return false
  };

  pp$6.updateContext = function(prevType) {
    var update, type = this.type;
    if (type.keyword && prevType === types$1.dot)
      { this.exprAllowed = false; }
    else if (update = type.updateContext)
      { update.call(this, prevType); }
    else
      { this.exprAllowed = type.beforeExpr; }
  };

  // Used to handle egde case when token context could not be inferred correctly in tokenize phase
  pp$6.overrideContext = function(tokenCtx) {
    if (this.curContext() !== tokenCtx) {
      this.context[this.context.length - 1] = tokenCtx;
    }
  };

  // Token-specific context update code

  types$1.parenR.updateContext = types$1.braceR.updateContext = function() {
    if (this.context.length === 1) {
      this.exprAllowed = true;
      return
    }
    var out = this.context.pop();
    if (out === types.b_stat && this.curContext().token === "function") {
      out = this.context.pop();
    }
    this.exprAllowed = !out.isExpr;
  };

  types$1.braceL.updateContext = function(prevType) {
    this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
    this.exprAllowed = true;
  };

  types$1.dollarBraceL.updateContext = function() {
    this.context.push(types.b_tmpl);
    this.exprAllowed = true;
  };

  types$1.parenL.updateContext = function(prevType) {
    var statementParens = prevType === types$1._if || prevType === types$1._for || prevType === types$1._with || prevType === types$1._while;
    this.context.push(statementParens ? types.p_stat : types.p_expr);
    this.exprAllowed = true;
  };

  types$1.incDec.updateContext = function() {
    // tokExprAllowed stays unchanged
  };

  types$1._function.updateContext = types$1._class.updateContext = function(prevType) {
    if (prevType.beforeExpr && prevType !== types$1._else &&
        !(prevType === types$1.semi && this.curContext() !== types.p_stat) &&
        !(prevType === types$1._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) &&
        !((prevType === types$1.colon || prevType === types$1.braceL) && this.curContext() === types.b_stat))
      { this.context.push(types.f_expr); }
    else
      { this.context.push(types.f_stat); }
    this.exprAllowed = false;
  };

  types$1.backQuote.updateContext = function() {
    if (this.curContext() === types.q_tmpl)
      { this.context.pop(); }
    else
      { this.context.push(types.q_tmpl); }
    this.exprAllowed = false;
  };

  types$1.star.updateContext = function(prevType) {
    if (prevType === types$1._function) {
      var index = this.context.length - 1;
      if (this.context[index] === types.f_expr)
        { this.context[index] = types.f_expr_gen; }
      else
        { this.context[index] = types.f_gen; }
    }
    this.exprAllowed = true;
  };

  types$1.name.updateContext = function(prevType) {
    var allowed = false;
    if (this.options.ecmaVersion >= 6 && prevType !== types$1.dot) {
      if (this.value === "of" && !this.exprAllowed ||
          this.value === "yield" && this.inGeneratorContext())
        { allowed = true; }
    }
    this.exprAllowed = allowed;
  };

  // A recursive descent parser operates by defining functions for all

  var pp$5 = Parser.prototype;

  // Check if property name clashes with already added.
  // Object/class getters and setters are not allowed to clash —
  // either with each other or with an init property — and in
  // strict mode, init properties are also not allowed to be repeated.

  pp$5.checkPropClash = function(prop, propHash, refDestructuringErrors) {
    if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement")
      { return }
    if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
      { return }
    var key = prop.key;
    var name;
    switch (key.type) {
    case "Identifier": name = key.name; break
    case "Literal": name = String(key.value); break
    default: return
    }
    var kind = prop.kind;
    if (this.options.ecmaVersion >= 6) {
      if (name === "__proto__" && kind === "init") {
        if (propHash.proto) {
          if (refDestructuringErrors) {
            if (refDestructuringErrors.doubleProto < 0) {
              refDestructuringErrors.doubleProto = key.start;
            }
          } else {
            this.raiseRecoverable(key.start, "Redefinition of __proto__ property");
          }
        }
        propHash.proto = true;
      }
      return
    }
    name = "$" + name;
    var other = propHash[name];
    if (other) {
      var redefinition;
      if (kind === "init") {
        redefinition = this.strict && other.init || other.get || other.set;
      } else {
        redefinition = other.init || other[kind];
      }
      if (redefinition)
        { this.raiseRecoverable(key.start, "Redefinition of property"); }
    } else {
      other = propHash[name] = {
        init: false,
        get: false,
        set: false
      };
    }
    other[kind] = true;
  };

  // ### Expression parsing

  // These nest, from the most general expression type at the top to
  // 'atomic', nondivisible expression types at the bottom. Most of
  // the functions will simply let the function(s) below them parse,
  // and, *if* the syntactic construct they handle is present, wrap
  // the AST node that the inner parser gave them in another node.

  // Parse a full expression. The optional arguments are used to
  // forbid the `in` operator (in for loops initalization expressions)
  // and provide reference for storing '=' operator inside shorthand
  // property assignment in contexts where both object expression
  // and object pattern might appear (so it's possible to raise
  // delayed syntax error at correct position).

  pp$5.parseExpression = function(forInit, refDestructuringErrors) {
    var startPos = this.start, startLoc = this.startLoc;
    var expr = this.parseMaybeAssign(forInit, refDestructuringErrors);
    if (this.type === types$1.comma) {
      var node = this.startNodeAt(startPos, startLoc);
      node.expressions = [expr];
      while (this.eat(types$1.comma)) { node.expressions.push(this.parseMaybeAssign(forInit, refDestructuringErrors)); }
      return this.finishNode(node, "SequenceExpression")
    }
    return expr
  };

  // Parse an assignment expression. This includes applications of
  // operators like `+=`.

  pp$5.parseMaybeAssign = function(forInit, refDestructuringErrors, afterLeftParse) {
    if (this.isContextual("yield")) {
      if (this.inGenerator) { return this.parseYield(forInit) }
      // The tokenizer will assume an expression is allowed after
      // `yield`, but this isn't that kind of yield
      else { this.exprAllowed = false; }
    }

    var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1, oldDoubleProto = -1;
    if (refDestructuringErrors) {
      oldParenAssign = refDestructuringErrors.parenthesizedAssign;
      oldTrailingComma = refDestructuringErrors.trailingComma;
      oldDoubleProto = refDestructuringErrors.doubleProto;
      refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
    } else {
      refDestructuringErrors = new DestructuringErrors;
      ownDestructuringErrors = true;
    }

    var startPos = this.start, startLoc = this.startLoc;
    if (this.type === types$1.parenL || this.type === types$1.name) {
      this.potentialArrowAt = this.start;
      this.potentialArrowInForAwait = forInit === "await";
    }
    var left = this.parseMaybeConditional(forInit, refDestructuringErrors);
    if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
    if (this.type.isAssign) {
      var node = this.startNodeAt(startPos, startLoc);
      node.operator = this.value;
      if (this.type === types$1.eq)
        { left = this.toAssignable(left, false, refDestructuringErrors); }
      if (!ownDestructuringErrors) {
        refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
      }
      if (refDestructuringErrors.shorthandAssign >= left.start)
        { refDestructuringErrors.shorthandAssign = -1; } // reset because shorthand default was used correctly
      if (this.type === types$1.eq)
        { this.checkLValPattern(left); }
      else
        { this.checkLValSimple(left); }
      node.left = left;
      this.next();
      node.right = this.parseMaybeAssign(forInit);
      if (oldDoubleProto > -1) { refDestructuringErrors.doubleProto = oldDoubleProto; }
      return this.finishNode(node, "AssignmentExpression")
    } else {
      if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
    }
    if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
    if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
    return left
  };

  // Parse a ternary conditional (`?:`) operator.

  pp$5.parseMaybeConditional = function(forInit, refDestructuringErrors) {
    var startPos = this.start, startLoc = this.startLoc;
    var expr = this.parseExprOps(forInit, refDestructuringErrors);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    if (this.eat(types$1.question)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.test = expr;
      node.consequent = this.parseMaybeAssign();
      this.expect(types$1.colon);
      node.alternate = this.parseMaybeAssign(forInit);
      return this.finishNode(node, "ConditionalExpression")
    }
    return expr
  };

  // Start the precedence parser.

  pp$5.parseExprOps = function(forInit, refDestructuringErrors) {
    var startPos = this.start, startLoc = this.startLoc;
    var expr = this.parseMaybeUnary(refDestructuringErrors, false, false, forInit);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, forInit)
  };

  // Parse binary operators with the operator precedence parsing
  // algorithm. `left` is the left-hand side of the operator.
  // `minPrec` provides context that allows the function to stop and
  // defer further parser to one of its callers when it encounters an
  // operator that has a lower precedence than the set it is parsing.

  pp$5.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, forInit) {
    var prec = this.type.binop;
    if (prec != null && (!forInit || this.type !== types$1._in)) {
      if (prec > minPrec) {
        var logical = this.type === types$1.logicalOR || this.type === types$1.logicalAND;
        var coalesce = this.type === types$1.coalesce;
        if (coalesce) {
          // Handle the precedence of `tt.coalesce` as equal to the range of logical expressions.
          // In other words, `node.right` shouldn't contain logical expressions in order to check the mixed error.
          prec = types$1.logicalAND.binop;
        }
        var op = this.value;
        this.next();
        var startPos = this.start, startLoc = this.startLoc;
        var right = this.parseExprOp(this.parseMaybeUnary(null, false, false, forInit), startPos, startLoc, prec, forInit);
        var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical || coalesce);
        if ((logical && this.type === types$1.coalesce) || (coalesce && (this.type === types$1.logicalOR || this.type === types$1.logicalAND))) {
          this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses");
        }
        return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, forInit)
      }
    }
    return left
  };

  pp$5.buildBinary = function(startPos, startLoc, left, right, op, logical) {
    if (right.type === "PrivateIdentifier") { this.raise(right.start, "Private identifier can only be left side of binary expression"); }
    var node = this.startNodeAt(startPos, startLoc);
    node.left = left;
    node.operator = op;
    node.right = right;
    return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
  };

  // Parse unary operators, both prefix and postfix.

  pp$5.parseMaybeUnary = function(refDestructuringErrors, sawUnary, incDec, forInit) {
    var startPos = this.start, startLoc = this.startLoc, expr;
    if (this.isContextual("await") && this.canAwait) {
      expr = this.parseAwait(forInit);
      sawUnary = true;
    } else if (this.type.prefix) {
      var node = this.startNode(), update = this.type === types$1.incDec;
      node.operator = this.value;
      node.prefix = true;
      this.next();
      node.argument = this.parseMaybeUnary(null, true, update, forInit);
      this.checkExpressionErrors(refDestructuringErrors, true);
      if (update) { this.checkLValSimple(node.argument); }
      else if (this.strict && node.operator === "delete" &&
               node.argument.type === "Identifier")
        { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
      else if (node.operator === "delete" && isPrivateFieldAccess(node.argument))
        { this.raiseRecoverable(node.start, "Private fields can not be deleted"); }
      else { sawUnary = true; }
      expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
    } else if (!sawUnary && this.type === types$1.privateId) {
      if (forInit || this.privateNameStack.length === 0) { this.unexpected(); }
      expr = this.parsePrivateIdent();
      // only could be private fields in 'in', such as #x in obj
      if (this.type !== types$1._in) { this.unexpected(); }
    } else {
      expr = this.parseExprSubscripts(refDestructuringErrors, forInit);
      if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
      while (this.type.postfix && !this.canInsertSemicolon()) {
        var node$1 = this.startNodeAt(startPos, startLoc);
        node$1.operator = this.value;
        node$1.prefix = false;
        node$1.argument = expr;
        this.checkLValSimple(expr);
        this.next();
        expr = this.finishNode(node$1, "UpdateExpression");
      }
    }

    if (!incDec && this.eat(types$1.starstar)) {
      if (sawUnary)
        { this.unexpected(this.lastTokStart); }
      else
        { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false, false, forInit), "**", false) }
    } else {
      return expr
    }
  };

  function isPrivateFieldAccess(node) {
    return (
      node.type === "MemberExpression" && node.property.type === "PrivateIdentifier" ||
      node.type === "ChainExpression" && isPrivateFieldAccess(node.expression)
    )
  }

  // Parse call, dot, and `[]`-subscript expressions.

  pp$5.parseExprSubscripts = function(refDestructuringErrors, forInit) {
    var startPos = this.start, startLoc = this.startLoc;
    var expr = this.parseExprAtom(refDestructuringErrors, forInit);
    if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")")
      { return expr }
    var result = this.parseSubscripts(expr, startPos, startLoc, false, forInit);
    if (refDestructuringErrors && result.type === "MemberExpression") {
      if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
      if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
      if (refDestructuringErrors.trailingComma >= result.start) { refDestructuringErrors.trailingComma = -1; }
    }
    return result
  };

  pp$5.parseSubscripts = function(base, startPos, startLoc, noCalls, forInit) {
    var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
        this.lastTokEnd === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 &&
        this.potentialArrowAt === base.start;
    var optionalChained = false;

    while (true) {
      var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit);

      if (element.optional) { optionalChained = true; }
      if (element === base || element.type === "ArrowFunctionExpression") {
        if (optionalChained) {
          var chainNode = this.startNodeAt(startPos, startLoc);
          chainNode.expression = element;
          element = this.finishNode(chainNode, "ChainExpression");
        }
        return element
      }

      base = element;
    }
  };

  pp$5.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit) {
    var optionalSupported = this.options.ecmaVersion >= 11;
    var optional = optionalSupported && this.eat(types$1.questionDot);
    if (noCalls && optional) { this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions"); }

    var computed = this.eat(types$1.bracketL);
    if (computed || (optional && this.type !== types$1.parenL && this.type !== types$1.backQuote) || this.eat(types$1.dot)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.object = base;
      if (computed) {
        node.property = this.parseExpression();
        this.expect(types$1.bracketR);
      } else if (this.type === types$1.privateId && base.type !== "Super") {
        node.property = this.parsePrivateIdent();
      } else {
        node.property = this.parseIdent(this.options.allowReserved !== "never");
      }
      node.computed = !!computed;
      if (optionalSupported) {
        node.optional = optional;
      }
      base = this.finishNode(node, "MemberExpression");
    } else if (!noCalls && this.eat(types$1.parenL)) {
      var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
      this.yieldPos = 0;
      this.awaitPos = 0;
      this.awaitIdentPos = 0;
      var exprList = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
      if (maybeAsyncArrow && !optional && !this.canInsertSemicolon() && this.eat(types$1.arrow)) {
        this.checkPatternErrors(refDestructuringErrors, false);
        this.checkYieldAwaitInDefaultParams();
        if (this.awaitIdentPos > 0)
          { this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function"); }
        this.yieldPos = oldYieldPos;
        this.awaitPos = oldAwaitPos;
        this.awaitIdentPos = oldAwaitIdentPos;
        return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true, forInit)
      }
      this.checkExpressionErrors(refDestructuringErrors, true);
      this.yieldPos = oldYieldPos || this.yieldPos;
      this.awaitPos = oldAwaitPos || this.awaitPos;
      this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
      var node$1 = this.startNodeAt(startPos, startLoc);
      node$1.callee = base;
      node$1.arguments = exprList;
      if (optionalSupported) {
        node$1.optional = optional;
      }
      base = this.finishNode(node$1, "CallExpression");
    } else if (this.type === types$1.backQuote) {
      if (optional || optionalChained) {
        this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
      }
      var node$2 = this.startNodeAt(startPos, startLoc);
      node$2.tag = base;
      node$2.quasi = this.parseTemplate({isTagged: true});
      base = this.finishNode(node$2, "TaggedTemplateExpression");
    }
    return base
  };

  // Parse an atomic expression — either a single token that is an
  // expression, an expression started by a keyword like `function` or
  // `new`, or an expression wrapped in punctuation like `()`, `[]`,
  // or `{}`.

  pp$5.parseExprAtom = function(refDestructuringErrors, forInit) {
    // If a division operator appears in an expression position, the
    // tokenizer got confused, and we force it to read a regexp instead.
    if (this.type === types$1.slash) { this.readRegexp(); }

    var node, canBeArrow = this.potentialArrowAt === this.start;
    switch (this.type) {
    case types$1._super:
      if (!this.allowSuper)
        { this.raise(this.start, "'super' keyword outside a method"); }
      node = this.startNode();
      this.next();
      if (this.type === types$1.parenL && !this.allowDirectSuper)
        { this.raise(node.start, "super() call outside constructor of a subclass"); }
      // The `super` keyword can appear at below:
      // SuperProperty:
      //     super [ Expression ]
      //     super . IdentifierName
      // SuperCall:
      //     super ( Arguments )
      if (this.type !== types$1.dot && this.type !== types$1.bracketL && this.type !== types$1.parenL)
        { this.unexpected(); }
      return this.finishNode(node, "Super")

    case types$1._this:
      node = this.startNode();
      this.next();
      return this.finishNode(node, "ThisExpression")

    case types$1.name:
      var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
      var id = this.parseIdent(false);
      if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types$1._function)) {
        this.overrideContext(types.f_expr);
        return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true, forInit)
      }
      if (canBeArrow && !this.canInsertSemicolon()) {
        if (this.eat(types$1.arrow))
          { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false, forInit) }
        if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types$1.name && !containsEsc &&
            (!this.potentialArrowInForAwait || this.value !== "of" || this.containsEsc)) {
          id = this.parseIdent(false);
          if (this.canInsertSemicolon() || !this.eat(types$1.arrow))
            { this.unexpected(); }
          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true, forInit)
        }
      }
      return id

    case types$1.regexp:
      var value = this.value;
      node = this.parseLiteral(value.value);
      node.regex = {pattern: value.pattern, flags: value.flags};
      return node

    case types$1.num: case types$1.string:
      return this.parseLiteral(this.value)

    case types$1._null: case types$1._true: case types$1._false:
      node = this.startNode();
      node.value = this.type === types$1._null ? null : this.type === types$1._true;
      node.raw = this.type.keyword;
      this.next();
      return this.finishNode(node, "Literal")

    case types$1.parenL:
      var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow, forInit);
      if (refDestructuringErrors) {
        if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
          { refDestructuringErrors.parenthesizedAssign = start; }
        if (refDestructuringErrors.parenthesizedBind < 0)
          { refDestructuringErrors.parenthesizedBind = start; }
      }
      return expr

    case types$1.bracketL:
      node = this.startNode();
      this.next();
      node.elements = this.parseExprList(types$1.bracketR, true, true, refDestructuringErrors);
      return this.finishNode(node, "ArrayExpression")

    case types$1.braceL:
      this.overrideContext(types.b_expr);
      return this.parseObj(false, refDestructuringErrors)

    case types$1._function:
      node = this.startNode();
      this.next();
      return this.parseFunction(node, 0)

    case types$1._class:
      return this.parseClass(this.startNode(), false)

    case types$1._new:
      return this.parseNew()

    case types$1.backQuote:
      return this.parseTemplate()

    case types$1._import:
      if (this.options.ecmaVersion >= 11) {
        return this.parseExprImport()
      } else {
        return this.unexpected()
      }

    default:
      this.unexpected();
    }
  };

  pp$5.parseExprImport = function() {
    var node = this.startNode();

    // Consume `import` as an identifier for `import.meta`.
    // Because `this.parseIdent(true)` doesn't check escape sequences, it needs the check of `this.containsEsc`.
    if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword import"); }
    var meta = this.parseIdent(true);

    switch (this.type) {
    case types$1.parenL:
      return this.parseDynamicImport(node)
    case types$1.dot:
      node.meta = meta;
      return this.parseImportMeta(node)
    default:
      this.unexpected();
    }
  };

  pp$5.parseDynamicImport = function(node) {
    this.next(); // skip `(`

    // Parse node.source.
    node.source = this.parseMaybeAssign();

    // Verify ending.
    if (!this.eat(types$1.parenR)) {
      var errorPos = this.start;
      if (this.eat(types$1.comma) && this.eat(types$1.parenR)) {
        this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
      } else {
        this.unexpected(errorPos);
      }
    }

    return this.finishNode(node, "ImportExpression")
  };

  pp$5.parseImportMeta = function(node) {
    this.next(); // skip `.`

    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);

    if (node.property.name !== "meta")
      { this.raiseRecoverable(node.property.start, "The only valid meta property for import is 'import.meta'"); }
    if (containsEsc)
      { this.raiseRecoverable(node.start, "'import.meta' must not contain escaped characters"); }
    if (this.options.sourceType !== "module" && !this.options.allowImportExportEverywhere)
      { this.raiseRecoverable(node.start, "Cannot use 'import.meta' outside a module"); }

    return this.finishNode(node, "MetaProperty")
  };

  pp$5.parseLiteral = function(value) {
    var node = this.startNode();
    node.value = value;
    node.raw = this.input.slice(this.start, this.end);
    if (node.raw.charCodeAt(node.raw.length - 1) === 110) { node.bigint = node.raw.slice(0, -1).replace(/_/g, ""); }
    this.next();
    return this.finishNode(node, "Literal")
  };

  pp$5.parseParenExpression = function() {
    this.expect(types$1.parenL);
    var val = this.parseExpression();
    this.expect(types$1.parenR);
    return val
  };

  pp$5.parseParenAndDistinguishExpression = function(canBeArrow, forInit) {
    var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
    if (this.options.ecmaVersion >= 6) {
      this.next();

      var innerStartPos = this.start, innerStartLoc = this.startLoc;
      var exprList = [], first = true, lastIsComma = false;
      var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
      this.yieldPos = 0;
      this.awaitPos = 0;
      // Do not save awaitIdentPos to allow checking awaits nested in parameters
      while (this.type !== types$1.parenR) {
        first ? first = false : this.expect(types$1.comma);
        if (allowTrailingComma && this.afterTrailingComma(types$1.parenR, true)) {
          lastIsComma = true;
          break
        } else if (this.type === types$1.ellipsis) {
          spreadStart = this.start;
          exprList.push(this.parseParenItem(this.parseRestBinding()));
          if (this.type === types$1.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
          break
        } else {
          exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
        }
      }
      var innerEndPos = this.lastTokEnd, innerEndLoc = this.lastTokEndLoc;
      this.expect(types$1.parenR);

      if (canBeArrow && !this.canInsertSemicolon() && this.eat(types$1.arrow)) {
        this.checkPatternErrors(refDestructuringErrors, false);
        this.checkYieldAwaitInDefaultParams();
        this.yieldPos = oldYieldPos;
        this.awaitPos = oldAwaitPos;
        return this.parseParenArrowList(startPos, startLoc, exprList, forInit)
      }

      if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
      if (spreadStart) { this.unexpected(spreadStart); }
      this.checkExpressionErrors(refDestructuringErrors, true);
      this.yieldPos = oldYieldPos || this.yieldPos;
      this.awaitPos = oldAwaitPos || this.awaitPos;

      if (exprList.length > 1) {
        val = this.startNodeAt(innerStartPos, innerStartLoc);
        val.expressions = exprList;
        this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
      } else {
        val = exprList[0];
      }
    } else {
      val = this.parseParenExpression();
    }

    if (this.options.preserveParens) {
      var par = this.startNodeAt(startPos, startLoc);
      par.expression = val;
      return this.finishNode(par, "ParenthesizedExpression")
    } else {
      return val
    }
  };

  pp$5.parseParenItem = function(item) {
    return item
  };

  pp$5.parseParenArrowList = function(startPos, startLoc, exprList, forInit) {
    return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, false, forInit)
  };

  // New's precedence is slightly tricky. It must allow its argument to
  // be a `[]` or dot subscript expression, but not a call — at least,
  // not without wrapping it in parentheses. Thus, it uses the noCalls
  // argument to parseSubscripts to prevent it from consuming the
  // argument list.

  var empty = [];

  pp$5.parseNew = function() {
    if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword new"); }
    var node = this.startNode();
    var meta = this.parseIdent(true);
    if (this.options.ecmaVersion >= 6 && this.eat(types$1.dot)) {
      node.meta = meta;
      var containsEsc = this.containsEsc;
      node.property = this.parseIdent(true);
      if (node.property.name !== "target")
        { this.raiseRecoverable(node.property.start, "The only valid meta property for new is 'new.target'"); }
      if (containsEsc)
        { this.raiseRecoverable(node.start, "'new.target' must not contain escaped characters"); }
      if (!this.allowNewDotTarget)
        { this.raiseRecoverable(node.start, "'new.target' can only be used in functions and class static block"); }
      return this.finishNode(node, "MetaProperty")
    }
    var startPos = this.start, startLoc = this.startLoc, isImport = this.type === types$1._import;
    node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true, false);
    if (isImport && node.callee.type === "ImportExpression") {
      this.raise(startPos, "Cannot use new with import()");
    }
    if (this.eat(types$1.parenL)) { node.arguments = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false); }
    else { node.arguments = empty; }
    return this.finishNode(node, "NewExpression")
  };

  // Parse template expression.

  pp$5.parseTemplateElement = function(ref) {
    var isTagged = ref.isTagged;

    var elem = this.startNode();
    if (this.type === types$1.invalidTemplate) {
      if (!isTagged) {
        this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
      }
      elem.value = {
        raw: this.value,
        cooked: null
      };
    } else {
      elem.value = {
        raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
        cooked: this.value
      };
    }
    this.next();
    elem.tail = this.type === types$1.backQuote;
    return this.finishNode(elem, "TemplateElement")
  };

  pp$5.parseTemplate = function(ref) {
    if ( ref === void 0 ) ref = {};
    var isTagged = ref.isTagged; if ( isTagged === void 0 ) isTagged = false;

    var node = this.startNode();
    this.next();
    node.expressions = [];
    var curElt = this.parseTemplateElement({isTagged: isTagged});
    node.quasis = [curElt];
    while (!curElt.tail) {
      if (this.type === types$1.eof) { this.raise(this.pos, "Unterminated template literal"); }
      this.expect(types$1.dollarBraceL);
      node.expressions.push(this.parseExpression());
      this.expect(types$1.braceR);
      node.quasis.push(curElt = this.parseTemplateElement({isTagged: isTagged}));
    }
    this.next();
    return this.finishNode(node, "TemplateLiteral")
  };

  pp$5.isAsyncProp = function(prop) {
    return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
      (this.type === types$1.name || this.type === types$1.num || this.type === types$1.string || this.type === types$1.bracketL || this.type.keyword || (this.options.ecmaVersion >= 9 && this.type === types$1.star)) &&
      !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
  };

  // Parse an object literal or binding pattern.

  pp$5.parseObj = function(isPattern, refDestructuringErrors) {
    var node = this.startNode(), first = true, propHash = {};
    node.properties = [];
    this.next();
    while (!this.eat(types$1.braceR)) {
      if (!first) {
        this.expect(types$1.comma);
        if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types$1.braceR)) { break }
      } else { first = false; }

      var prop = this.parseProperty(isPattern, refDestructuringErrors);
      if (!isPattern) { this.checkPropClash(prop, propHash, refDestructuringErrors); }
      node.properties.push(prop);
    }
    return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
  };

  pp$5.parseProperty = function(isPattern, refDestructuringErrors) {
    var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
    if (this.options.ecmaVersion >= 9 && this.eat(types$1.ellipsis)) {
      if (isPattern) {
        prop.argument = this.parseIdent(false);
        if (this.type === types$1.comma) {
          this.raise(this.start, "Comma is not permitted after the rest element");
        }
        return this.finishNode(prop, "RestElement")
      }
      // To disallow parenthesized identifier via `this.toAssignable()`.
      if (this.type === types$1.parenL && refDestructuringErrors) {
        if (refDestructuringErrors.parenthesizedAssign < 0) {
          refDestructuringErrors.parenthesizedAssign = this.start;
        }
        if (refDestructuringErrors.parenthesizedBind < 0) {
          refDestructuringErrors.parenthesizedBind = this.start;
        }
      }
      // Parse argument.
      prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
      // To disallow trailing comma via `this.toAssignable()`.
      if (this.type === types$1.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
        refDestructuringErrors.trailingComma = this.start;
      }
      // Finish
      return this.finishNode(prop, "SpreadElement")
    }
    if (this.options.ecmaVersion >= 6) {
      prop.method = false;
      prop.shorthand = false;
      if (isPattern || refDestructuringErrors) {
        startPos = this.start;
        startLoc = this.startLoc;
      }
      if (!isPattern)
        { isGenerator = this.eat(types$1.star); }
    }
    var containsEsc = this.containsEsc;
    this.parsePropertyName(prop);
    if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
      isAsync = true;
      isGenerator = this.options.ecmaVersion >= 9 && this.eat(types$1.star);
      this.parsePropertyName(prop, refDestructuringErrors);
    } else {
      isAsync = false;
    }
    this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
    return this.finishNode(prop, "Property")
  };

  pp$5.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
    if ((isGenerator || isAsync) && this.type === types$1.colon)
      { this.unexpected(); }

    if (this.eat(types$1.colon)) {
      prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
      prop.kind = "init";
    } else if (this.options.ecmaVersion >= 6 && this.type === types$1.parenL) {
      if (isPattern) { this.unexpected(); }
      prop.kind = "init";
      prop.method = true;
      prop.value = this.parseMethod(isGenerator, isAsync);
    } else if (!isPattern && !containsEsc &&
               this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
               (prop.key.name === "get" || prop.key.name === "set") &&
               (this.type !== types$1.comma && this.type !== types$1.braceR && this.type !== types$1.eq)) {
      if (isGenerator || isAsync) { this.unexpected(); }
      prop.kind = prop.key.name;
      this.parsePropertyName(prop);
      prop.value = this.parseMethod(false);
      var paramCount = prop.kind === "get" ? 0 : 1;
      if (prop.value.params.length !== paramCount) {
        var start = prop.value.start;
        if (prop.kind === "get")
          { this.raiseRecoverable(start, "getter should have no params"); }
        else
          { this.raiseRecoverable(start, "setter should have exactly one param"); }
      } else {
        if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
          { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
      }
    } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
      if (isGenerator || isAsync) { this.unexpected(); }
      this.checkUnreserved(prop.key);
      if (prop.key.name === "await" && !this.awaitIdentPos)
        { this.awaitIdentPos = startPos; }
      prop.kind = "init";
      if (isPattern) {
        prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
      } else if (this.type === types$1.eq && refDestructuringErrors) {
        if (refDestructuringErrors.shorthandAssign < 0)
          { refDestructuringErrors.shorthandAssign = this.start; }
        prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
      } else {
        prop.value = this.copyNode(prop.key);
      }
      prop.shorthand = true;
    } else { this.unexpected(); }
  };

  pp$5.parsePropertyName = function(prop) {
    if (this.options.ecmaVersion >= 6) {
      if (this.eat(types$1.bracketL)) {
        prop.computed = true;
        prop.key = this.parseMaybeAssign();
        this.expect(types$1.bracketR);
        return prop.key
      } else {
        prop.computed = false;
      }
    }
    return prop.key = this.type === types$1.num || this.type === types$1.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never")
  };

  // Initialize empty function node.

  pp$5.initFunction = function(node) {
    node.id = null;
    if (this.options.ecmaVersion >= 6) { node.generator = node.expression = false; }
    if (this.options.ecmaVersion >= 8) { node.async = false; }
  };

  // Parse object or class method.

  pp$5.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
    var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

    this.initFunction(node);
    if (this.options.ecmaVersion >= 6)
      { node.generator = isGenerator; }
    if (this.options.ecmaVersion >= 8)
      { node.async = !!isAsync; }

    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));

    this.expect(types$1.parenL);
    node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
    this.checkYieldAwaitInDefaultParams();
    this.parseFunctionBody(node, false, true, false);

    this.yieldPos = oldYieldPos;
    this.awaitPos = oldAwaitPos;
    this.awaitIdentPos = oldAwaitIdentPos;
    return this.finishNode(node, "FunctionExpression")
  };

  // Parse arrow function expression with given parameters.

  pp$5.parseArrowExpression = function(node, params, isAsync, forInit) {
    var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

    this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
    this.initFunction(node);
    if (this.options.ecmaVersion >= 8) { node.async = !!isAsync; }

    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;

    node.params = this.toAssignableList(params, true);
    this.parseFunctionBody(node, true, false, forInit);

    this.yieldPos = oldYieldPos;
    this.awaitPos = oldAwaitPos;
    this.awaitIdentPos = oldAwaitIdentPos;
    return this.finishNode(node, "ArrowFunctionExpression")
  };

  // Parse function body and check parameters.

  pp$5.parseFunctionBody = function(node, isArrowFunction, isMethod, forInit) {
    var isExpression = isArrowFunction && this.type !== types$1.braceL;
    var oldStrict = this.strict, useStrict = false;

    if (isExpression) {
      node.body = this.parseMaybeAssign(forInit);
      node.expression = true;
      this.checkParams(node, false);
    } else {
      var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
      if (!oldStrict || nonSimple) {
        useStrict = this.strictDirective(this.end);
        // If this is a strict mode function, verify that argument names
        // are not repeated, and it does not try to bind the words `eval`
        // or `arguments`.
        if (useStrict && nonSimple)
          { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
      }
      // Start a new scope with regard to labels and the `inFunction`
      // flag (restore them to their old value afterwards).
      var oldLabels = this.labels;
      this.labels = [];
      if (useStrict) { this.strict = true; }

      // Add the params to varDeclaredNames to ensure that an error is thrown
      // if a let/const declaration in the function clashes with one of the params.
      this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
      // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
      if (this.strict && node.id) { this.checkLValSimple(node.id, BIND_OUTSIDE); }
      node.body = this.parseBlock(false, undefined, useStrict && !oldStrict);
      node.expression = false;
      this.adaptDirectivePrologue(node.body.body);
      this.labels = oldLabels;
    }
    this.exitScope();
  };

  pp$5.isSimpleParamList = function(params) {
    for (var i = 0, list = params; i < list.length; i += 1)
      {
      var param = list[i];

      if (param.type !== "Identifier") { return false
    } }
    return true
  };

  // Checks function params for various disallowed patterns such as using "eval"
  // or "arguments" and duplicate parameters.

  pp$5.checkParams = function(node, allowDuplicates) {
    var nameHash = Object.create(null);
    for (var i = 0, list = node.params; i < list.length; i += 1)
      {
      var param = list[i];

      this.checkLValInnerPattern(param, BIND_VAR, allowDuplicates ? null : nameHash);
    }
  };

  // Parses a comma-separated list of expressions, and returns them as
  // an array. `close` is the token type that ends the list, and
  // `allowEmpty` can be turned on to allow subsequent commas with
  // nothing in between them to be parsed as `null` (which is needed
  // for array literals).

  pp$5.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
    var elts = [], first = true;
    while (!this.eat(close)) {
      if (!first) {
        this.expect(types$1.comma);
        if (allowTrailingComma && this.afterTrailingComma(close)) { break }
      } else { first = false; }

      var elt = (void 0);
      if (allowEmpty && this.type === types$1.comma)
        { elt = null; }
      else if (this.type === types$1.ellipsis) {
        elt = this.parseSpread(refDestructuringErrors);
        if (refDestructuringErrors && this.type === types$1.comma && refDestructuringErrors.trailingComma < 0)
          { refDestructuringErrors.trailingComma = this.start; }
      } else {
        elt = this.parseMaybeAssign(false, refDestructuringErrors);
      }
      elts.push(elt);
    }
    return elts
  };

  pp$5.checkUnreserved = function(ref) {
    var start = ref.start;
    var end = ref.end;
    var name = ref.name;

    if (this.inGenerator && name === "yield")
      { this.raiseRecoverable(start, "Cannot use 'yield' as identifier inside a generator"); }
    if (this.inAsync && name === "await")
      { this.raiseRecoverable(start, "Cannot use 'await' as identifier inside an async function"); }
    if (this.currentThisScope().inClassFieldInit && name === "arguments")
      { this.raiseRecoverable(start, "Cannot use 'arguments' in class field initializer"); }
    if (this.inClassStaticBlock && (name === "arguments" || name === "await"))
      { this.raise(start, ("Cannot use " + name + " in class static initialization block")); }
    if (this.keywords.test(name))
      { this.raise(start, ("Unexpected keyword '" + name + "'")); }
    if (this.options.ecmaVersion < 6 &&
      this.input.slice(start, end).indexOf("\\") !== -1) { return }
    var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
    if (re.test(name)) {
      if (!this.inAsync && name === "await")
        { this.raiseRecoverable(start, "Cannot use keyword 'await' outside an async function"); }
      this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved"));
    }
  };

  // Parse the next token as an identifier. If `liberal` is true (used
  // when parsing properties), it will also convert keywords into
  // identifiers.

  pp$5.parseIdent = function(liberal, isBinding) {
    var node = this.startNode();
    if (this.type === types$1.name) {
      node.name = this.value;
    } else if (this.type.keyword) {
      node.name = this.type.keyword;

      // To fix https://github.com/acornjs/acorn/issues/575
      // `class` and `function` keywords push new context into this.context.
      // But there is no chance to pop the context if the keyword is consumed as an identifier such as a property name.
      // If the previous token is a dot, this does not apply because the context-managing code already ignored the keyword
      if ((node.name === "class" || node.name === "function") &&
          (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
        this.context.pop();
      }
    } else {
      this.unexpected();
    }
    this.next(!!liberal);
    this.finishNode(node, "Identifier");
    if (!liberal) {
      this.checkUnreserved(node);
      if (node.name === "await" && !this.awaitIdentPos)
        { this.awaitIdentPos = node.start; }
    }
    return node
  };

  pp$5.parsePrivateIdent = function() {
    var node = this.startNode();
    if (this.type === types$1.privateId) {
      node.name = this.value;
    } else {
      this.unexpected();
    }
    this.next();
    this.finishNode(node, "PrivateIdentifier");

    // For validating existence
    if (this.privateNameStack.length === 0) {
      this.raise(node.start, ("Private field '#" + (node.name) + "' must be declared in an enclosing class"));
    } else {
      this.privateNameStack[this.privateNameStack.length - 1].used.push(node);
    }

    return node
  };

  // Parses yield expression inside generator.

  pp$5.parseYield = function(forInit) {
    if (!this.yieldPos) { this.yieldPos = this.start; }

    var node = this.startNode();
    this.next();
    if (this.type === types$1.semi || this.canInsertSemicolon() || (this.type !== types$1.star && !this.type.startsExpr)) {
      node.delegate = false;
      node.argument = null;
    } else {
      node.delegate = this.eat(types$1.star);
      node.argument = this.parseMaybeAssign(forInit);
    }
    return this.finishNode(node, "YieldExpression")
  };

  pp$5.parseAwait = function(forInit) {
    if (!this.awaitPos) { this.awaitPos = this.start; }

    var node = this.startNode();
    this.next();
    node.argument = this.parseMaybeUnary(null, true, false, forInit);
    return this.finishNode(node, "AwaitExpression")
  };

  var pp$4 = Parser.prototype;

  // This function is used to raise exceptions on parse errors. It
  // takes an offset integer (into the current `input`) to indicate
  // the location of the error, attaches the position to the end
  // of the error message, and then raises a `SyntaxError` with that
  // message.

  pp$4.raise = function(pos, message) {
    var loc = getLineInfo(this.input, pos);
    message += " (" + loc.line + ":" + loc.column + ")";
    var err = new SyntaxError(message);
    err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
    throw err
  };

  pp$4.raiseRecoverable = pp$4.raise;

  pp$4.curPosition = function() {
    if (this.options.locations) {
      return new Position(this.curLine, this.pos - this.lineStart)
    }
  };

  var pp$3 = Parser.prototype;

  var Scope = function Scope(flags) {
    this.flags = flags;
    // A list of var-declared names in the current lexical scope
    this.var = [];
    // A list of lexically-declared names in the current lexical scope
    this.lexical = [];
    // A list of lexically-declared FunctionDeclaration names in the current lexical scope
    this.functions = [];
    // A switch to disallow the identifier reference 'arguments'
    this.inClassFieldInit = false;
  };

  // The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

  pp$3.enterScope = function(flags) {
    this.scopeStack.push(new Scope(flags));
  };

  pp$3.exitScope = function() {
    this.scopeStack.pop();
  };

  // The spec says:
  // > At the top level of a function, or script, function declarations are
  // > treated like var declarations rather than like lexical declarations.
  pp$3.treatFunctionsAsVarInScope = function(scope) {
    return (scope.flags & SCOPE_FUNCTION) || !this.inModule && (scope.flags & SCOPE_TOP)
  };

  pp$3.declareName = function(name, bindingType, pos) {
    var redeclared = false;
    if (bindingType === BIND_LEXICAL) {
      var scope = this.currentScope();
      redeclared = scope.lexical.indexOf(name) > -1 || scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
      scope.lexical.push(name);
      if (this.inModule && (scope.flags & SCOPE_TOP))
        { delete this.undefinedExports[name]; }
    } else if (bindingType === BIND_SIMPLE_CATCH) {
      var scope$1 = this.currentScope();
      scope$1.lexical.push(name);
    } else if (bindingType === BIND_FUNCTION) {
      var scope$2 = this.currentScope();
      if (this.treatFunctionsAsVar)
        { redeclared = scope$2.lexical.indexOf(name) > -1; }
      else
        { redeclared = scope$2.lexical.indexOf(name) > -1 || scope$2.var.indexOf(name) > -1; }
      scope$2.functions.push(name);
    } else {
      for (var i = this.scopeStack.length - 1; i >= 0; --i) {
        var scope$3 = this.scopeStack[i];
        if (scope$3.lexical.indexOf(name) > -1 && !((scope$3.flags & SCOPE_SIMPLE_CATCH) && scope$3.lexical[0] === name) ||
            !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name) > -1) {
          redeclared = true;
          break
        }
        scope$3.var.push(name);
        if (this.inModule && (scope$3.flags & SCOPE_TOP))
          { delete this.undefinedExports[name]; }
        if (scope$3.flags & SCOPE_VAR) { break }
      }
    }
    if (redeclared) { this.raiseRecoverable(pos, ("Identifier '" + name + "' has already been declared")); }
  };

  pp$3.checkLocalExport = function(id) {
    // scope.functions must be empty as Module code is always strict.
    if (this.scopeStack[0].lexical.indexOf(id.name) === -1 &&
        this.scopeStack[0].var.indexOf(id.name) === -1) {
      this.undefinedExports[id.name] = id;
    }
  };

  pp$3.currentScope = function() {
    return this.scopeStack[this.scopeStack.length - 1]
  };

  pp$3.currentVarScope = function() {
    for (var i = this.scopeStack.length - 1;; i--) {
      var scope = this.scopeStack[i];
      if (scope.flags & SCOPE_VAR) { return scope }
    }
  };

  // Could be useful for `this`, `new.target`, `super()`, `super.property`, and `super[property]`.
  pp$3.currentThisScope = function() {
    for (var i = this.scopeStack.length - 1;; i--) {
      var scope = this.scopeStack[i];
      if (scope.flags & SCOPE_VAR && !(scope.flags & SCOPE_ARROW)) { return scope }
    }
  };

  var Node$1 = function Node(parser, pos, loc) {
    this.type = "";
    this.start = pos;
    this.end = 0;
    if (parser.options.locations)
      { this.loc = new SourceLocation(parser, loc); }
    if (parser.options.directSourceFile)
      { this.sourceFile = parser.options.directSourceFile; }
    if (parser.options.ranges)
      { this.range = [pos, 0]; }
  };

  // Start an AST node, attaching a start offset.

  var pp$2 = Parser.prototype;

  pp$2.startNode = function() {
    return new Node$1(this, this.start, this.startLoc)
  };

  pp$2.startNodeAt = function(pos, loc) {
    return new Node$1(this, pos, loc)
  };

  // Finish an AST node, adding `type` and `end` properties.

  function finishNodeAt(node, type, pos, loc) {
    node.type = type;
    node.end = pos;
    if (this.options.locations)
      { node.loc.end = loc; }
    if (this.options.ranges)
      { node.range[1] = pos; }
    return node
  }

  pp$2.finishNode = function(node, type) {
    return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
  };

  // Finish node at given position

  pp$2.finishNodeAt = function(node, type, pos, loc) {
    return finishNodeAt.call(this, node, type, pos, loc)
  };

  pp$2.copyNode = function(node) {
    var newNode = new Node$1(this, node.start, this.startLoc);
    for (var prop in node) { newNode[prop] = node[prop]; }
    return newNode
  };

  // This file contains Unicode properties extracted from the ECMAScript
  // specification. The lists are extracted like so:
  // $$('#table-binary-unicode-properties > figure > table > tbody > tr > td:nth-child(1) code').map(el => el.innerText)

  // #table-binary-unicode-properties
  var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
  var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
  var ecma11BinaryProperties = ecma10BinaryProperties;
  var ecma12BinaryProperties = ecma11BinaryProperties + " EBase EComp EMod EPres ExtPict";
  var ecma13BinaryProperties = ecma12BinaryProperties;
  var unicodeBinaryProperties = {
    9: ecma9BinaryProperties,
    10: ecma10BinaryProperties,
    11: ecma11BinaryProperties,
    12: ecma12BinaryProperties,
    13: ecma13BinaryProperties
  };

  // #table-unicode-general-category-values
  var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";

  // #table-unicode-script-values
  var ecma9ScriptValues = "Adlam Adlm Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
  var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
  var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
  var ecma12ScriptValues = ecma11ScriptValues + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi";
  var ecma13ScriptValues = ecma12ScriptValues + " Cypro_Minoan Cpmn Old_Uyghur Ougr Tangsa Tnsa Toto Vithkuqi Vith";
  var unicodeScriptValues = {
    9: ecma9ScriptValues,
    10: ecma10ScriptValues,
    11: ecma11ScriptValues,
    12: ecma12ScriptValues,
    13: ecma13ScriptValues
  };

  var data = {};
  function buildUnicodeData(ecmaVersion) {
    var d = data[ecmaVersion] = {
      binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
      nonBinary: {
        General_Category: wordsRegexp(unicodeGeneralCategoryValues),
        Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
      }
    };
    d.nonBinary.Script_Extensions = d.nonBinary.Script;

    d.nonBinary.gc = d.nonBinary.General_Category;
    d.nonBinary.sc = d.nonBinary.Script;
    d.nonBinary.scx = d.nonBinary.Script_Extensions;
  }

  for (var i = 0, list = [9, 10, 11, 12, 13]; i < list.length; i += 1) {
    var ecmaVersion = list[i];

    buildUnicodeData(ecmaVersion);
  }

  var pp$1 = Parser.prototype;

  var RegExpValidationState = function RegExpValidationState(parser) {
    this.parser = parser;
    this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "") + (parser.options.ecmaVersion >= 13 ? "d" : "");
    this.unicodeProperties = data[parser.options.ecmaVersion >= 13 ? 13 : parser.options.ecmaVersion];
    this.source = "";
    this.flags = "";
    this.start = 0;
    this.switchU = false;
    this.switchN = false;
    this.pos = 0;
    this.lastIntValue = 0;
    this.lastStringValue = "";
    this.lastAssertionIsQuantifiable = false;
    this.numCapturingParens = 0;
    this.maxBackReference = 0;
    this.groupNames = [];
    this.backReferenceNames = [];
  };

  RegExpValidationState.prototype.reset = function reset (start, pattern, flags) {
    var unicode = flags.indexOf("u") !== -1;
    this.start = start | 0;
    this.source = pattern + "";
    this.flags = flags;
    this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
    this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
  };

  RegExpValidationState.prototype.raise = function raise (message) {
    this.parser.raiseRecoverable(this.start, ("Invalid regular expression: /" + (this.source) + "/: " + message));
  };

  // If u flag is given, this returns the code point at the index (it combines a surrogate pair).
  // Otherwise, this returns the code unit of the index (can be a part of a surrogate pair).
  RegExpValidationState.prototype.at = function at (i, forceU) {
      if ( forceU === void 0 ) forceU = false;

    var s = this.source;
    var l = s.length;
    if (i >= l) {
      return -1
    }
    var c = s.charCodeAt(i);
    if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l) {
      return c
    }
    var next = s.charCodeAt(i + 1);
    return next >= 0xDC00 && next <= 0xDFFF ? (c << 10) + next - 0x35FDC00 : c
  };

  RegExpValidationState.prototype.nextIndex = function nextIndex (i, forceU) {
      if ( forceU === void 0 ) forceU = false;

    var s = this.source;
    var l = s.length;
    if (i >= l) {
      return l
    }
    var c = s.charCodeAt(i), next;
    if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l ||
        (next = s.charCodeAt(i + 1)) < 0xDC00 || next > 0xDFFF) {
      return i + 1
    }
    return i + 2
  };

  RegExpValidationState.prototype.current = function current (forceU) {
      if ( forceU === void 0 ) forceU = false;

    return this.at(this.pos, forceU)
  };

  RegExpValidationState.prototype.lookahead = function lookahead (forceU) {
      if ( forceU === void 0 ) forceU = false;

    return this.at(this.nextIndex(this.pos, forceU), forceU)
  };

  RegExpValidationState.prototype.advance = function advance (forceU) {
      if ( forceU === void 0 ) forceU = false;

    this.pos = this.nextIndex(this.pos, forceU);
  };

  RegExpValidationState.prototype.eat = function eat (ch, forceU) {
      if ( forceU === void 0 ) forceU = false;

    if (this.current(forceU) === ch) {
      this.advance(forceU);
      return true
    }
    return false
  };

  function codePointToString$1(ch) {
    if (ch <= 0xFFFF) { return String.fromCharCode(ch) }
    ch -= 0x10000;
    return String.fromCharCode((ch >> 10) + 0xD800, (ch & 0x03FF) + 0xDC00)
  }

  /**
   * Validate the flags part of a given RegExpLiteral.
   *
   * @param {RegExpValidationState} state The state to validate RegExp.
   * @returns {void}
   */
  pp$1.validateRegExpFlags = function(state) {
    var validFlags = state.validFlags;
    var flags = state.flags;

    for (var i = 0; i < flags.length; i++) {
      var flag = flags.charAt(i);
      if (validFlags.indexOf(flag) === -1) {
        this.raise(state.start, "Invalid regular expression flag");
      }
      if (flags.indexOf(flag, i + 1) > -1) {
        this.raise(state.start, "Duplicate regular expression flag");
      }
    }
  };

  /**
   * Validate the pattern part of a given RegExpLiteral.
   *
   * @param {RegExpValidationState} state The state to validate RegExp.
   * @returns {void}
   */
  pp$1.validateRegExpPattern = function(state) {
    this.regexp_pattern(state);

    // The goal symbol for the parse is |Pattern[~U, ~N]|. If the result of
    // parsing contains a |GroupName|, reparse with the goal symbol
    // |Pattern[~U, +N]| and use this result instead. Throw a *SyntaxError*
    // exception if _P_ did not conform to the grammar, if any elements of _P_
    // were not matched by the parse, or if any Early Error conditions exist.
    if (!state.switchN && this.options.ecmaVersion >= 9 && state.groupNames.length > 0) {
      state.switchN = true;
      this.regexp_pattern(state);
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Pattern
  pp$1.regexp_pattern = function(state) {
    state.pos = 0;
    state.lastIntValue = 0;
    state.lastStringValue = "";
    state.lastAssertionIsQuantifiable = false;
    state.numCapturingParens = 0;
    state.maxBackReference = 0;
    state.groupNames.length = 0;
    state.backReferenceNames.length = 0;

    this.regexp_disjunction(state);

    if (state.pos !== state.source.length) {
      // Make the same messages as V8.
      if (state.eat(0x29 /* ) */)) {
        state.raise("Unmatched ')'");
      }
      if (state.eat(0x5D /* ] */) || state.eat(0x7D /* } */)) {
        state.raise("Lone quantifier brackets");
      }
    }
    if (state.maxBackReference > state.numCapturingParens) {
      state.raise("Invalid escape");
    }
    for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
      var name = list[i];

      if (state.groupNames.indexOf(name) === -1) {
        state.raise("Invalid named capture referenced");
      }
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Disjunction
  pp$1.regexp_disjunction = function(state) {
    this.regexp_alternative(state);
    while (state.eat(0x7C /* | */)) {
      this.regexp_alternative(state);
    }

    // Make the same message as V8.
    if (this.regexp_eatQuantifier(state, true)) {
      state.raise("Nothing to repeat");
    }
    if (state.eat(0x7B /* { */)) {
      state.raise("Lone quantifier brackets");
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Alternative
  pp$1.regexp_alternative = function(state) {
    while (state.pos < state.source.length && this.regexp_eatTerm(state))
      { }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Term
  pp$1.regexp_eatTerm = function(state) {
    if (this.regexp_eatAssertion(state)) {
      // Handle `QuantifiableAssertion Quantifier` alternative.
      // `state.lastAssertionIsQuantifiable` is true if the last eaten Assertion
      // is a QuantifiableAssertion.
      if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
        // Make the same message as V8.
        if (state.switchU) {
          state.raise("Invalid quantifier");
        }
      }
      return true
    }

    if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
      this.regexp_eatQuantifier(state);
      return true
    }

    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Assertion
  pp$1.regexp_eatAssertion = function(state) {
    var start = state.pos;
    state.lastAssertionIsQuantifiable = false;

    // ^, $
    if (state.eat(0x5E /* ^ */) || state.eat(0x24 /* $ */)) {
      return true
    }

    // \b \B
    if (state.eat(0x5C /* \ */)) {
      if (state.eat(0x42 /* B */) || state.eat(0x62 /* b */)) {
        return true
      }
      state.pos = start;
    }

    // Lookahead / Lookbehind
    if (state.eat(0x28 /* ( */) && state.eat(0x3F /* ? */)) {
      var lookbehind = false;
      if (this.options.ecmaVersion >= 9) {
        lookbehind = state.eat(0x3C /* < */);
      }
      if (state.eat(0x3D /* = */) || state.eat(0x21 /* ! */)) {
        this.regexp_disjunction(state);
        if (!state.eat(0x29 /* ) */)) {
          state.raise("Unterminated group");
        }
        state.lastAssertionIsQuantifiable = !lookbehind;
        return true
      }
    }

    state.pos = start;
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Quantifier
  pp$1.regexp_eatQuantifier = function(state, noError) {
    if ( noError === void 0 ) noError = false;

    if (this.regexp_eatQuantifierPrefix(state, noError)) {
      state.eat(0x3F /* ? */);
      return true
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-QuantifierPrefix
  pp$1.regexp_eatQuantifierPrefix = function(state, noError) {
    return (
      state.eat(0x2A /* * */) ||
      state.eat(0x2B /* + */) ||
      state.eat(0x3F /* ? */) ||
      this.regexp_eatBracedQuantifier(state, noError)
    )
  };
  pp$1.regexp_eatBracedQuantifier = function(state, noError) {
    var start = state.pos;
    if (state.eat(0x7B /* { */)) {
      var min = 0, max = -1;
      if (this.regexp_eatDecimalDigits(state)) {
        min = state.lastIntValue;
        if (state.eat(0x2C /* , */) && this.regexp_eatDecimalDigits(state)) {
          max = state.lastIntValue;
        }
        if (state.eat(0x7D /* } */)) {
          // SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-term
          if (max !== -1 && max < min && !noError) {
            state.raise("numbers out of order in {} quantifier");
          }
          return true
        }
      }
      if (state.switchU && !noError) {
        state.raise("Incomplete quantifier");
      }
      state.pos = start;
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Atom
  pp$1.regexp_eatAtom = function(state) {
    return (
      this.regexp_eatPatternCharacters(state) ||
      state.eat(0x2E /* . */) ||
      this.regexp_eatReverseSolidusAtomEscape(state) ||
      this.regexp_eatCharacterClass(state) ||
      this.regexp_eatUncapturingGroup(state) ||
      this.regexp_eatCapturingGroup(state)
    )
  };
  pp$1.regexp_eatReverseSolidusAtomEscape = function(state) {
    var start = state.pos;
    if (state.eat(0x5C /* \ */)) {
      if (this.regexp_eatAtomEscape(state)) {
        return true
      }
      state.pos = start;
    }
    return false
  };
  pp$1.regexp_eatUncapturingGroup = function(state) {
    var start = state.pos;
    if (state.eat(0x28 /* ( */)) {
      if (state.eat(0x3F /* ? */) && state.eat(0x3A /* : */)) {
        this.regexp_disjunction(state);
        if (state.eat(0x29 /* ) */)) {
          return true
        }
        state.raise("Unterminated group");
      }
      state.pos = start;
    }
    return false
  };
  pp$1.regexp_eatCapturingGroup = function(state) {
    if (state.eat(0x28 /* ( */)) {
      if (this.options.ecmaVersion >= 9) {
        this.regexp_groupSpecifier(state);
      } else if (state.current() === 0x3F /* ? */) {
        state.raise("Invalid group");
      }
      this.regexp_disjunction(state);
      if (state.eat(0x29 /* ) */)) {
        state.numCapturingParens += 1;
        return true
      }
      state.raise("Unterminated group");
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedAtom
  pp$1.regexp_eatExtendedAtom = function(state) {
    return (
      state.eat(0x2E /* . */) ||
      this.regexp_eatReverseSolidusAtomEscape(state) ||
      this.regexp_eatCharacterClass(state) ||
      this.regexp_eatUncapturingGroup(state) ||
      this.regexp_eatCapturingGroup(state) ||
      this.regexp_eatInvalidBracedQuantifier(state) ||
      this.regexp_eatExtendedPatternCharacter(state)
    )
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-InvalidBracedQuantifier
  pp$1.regexp_eatInvalidBracedQuantifier = function(state) {
    if (this.regexp_eatBracedQuantifier(state, true)) {
      state.raise("Nothing to repeat");
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-SyntaxCharacter
  pp$1.regexp_eatSyntaxCharacter = function(state) {
    var ch = state.current();
    if (isSyntaxCharacter(ch)) {
      state.lastIntValue = ch;
      state.advance();
      return true
    }
    return false
  };
  function isSyntaxCharacter(ch) {
    return (
      ch === 0x24 /* $ */ ||
      ch >= 0x28 /* ( */ && ch <= 0x2B /* + */ ||
      ch === 0x2E /* . */ ||
      ch === 0x3F /* ? */ ||
      ch >= 0x5B /* [ */ && ch <= 0x5E /* ^ */ ||
      ch >= 0x7B /* { */ && ch <= 0x7D /* } */
    )
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-PatternCharacter
  // But eat eager.
  pp$1.regexp_eatPatternCharacters = function(state) {
    var start = state.pos;
    var ch = 0;
    while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
      state.advance();
    }
    return state.pos !== start
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedPatternCharacter
  pp$1.regexp_eatExtendedPatternCharacter = function(state) {
    var ch = state.current();
    if (
      ch !== -1 &&
      ch !== 0x24 /* $ */ &&
      !(ch >= 0x28 /* ( */ && ch <= 0x2B /* + */) &&
      ch !== 0x2E /* . */ &&
      ch !== 0x3F /* ? */ &&
      ch !== 0x5B /* [ */ &&
      ch !== 0x5E /* ^ */ &&
      ch !== 0x7C /* | */
    ) {
      state.advance();
      return true
    }
    return false
  };

  // GroupSpecifier ::
  //   [empty]
  //   `?` GroupName
  pp$1.regexp_groupSpecifier = function(state) {
    if (state.eat(0x3F /* ? */)) {
      if (this.regexp_eatGroupName(state)) {
        if (state.groupNames.indexOf(state.lastStringValue) !== -1) {
          state.raise("Duplicate capture group name");
        }
        state.groupNames.push(state.lastStringValue);
        return
      }
      state.raise("Invalid group");
    }
  };

  // GroupName ::
  //   `<` RegExpIdentifierName `>`
  // Note: this updates `state.lastStringValue` property with the eaten name.
  pp$1.regexp_eatGroupName = function(state) {
    state.lastStringValue = "";
    if (state.eat(0x3C /* < */)) {
      if (this.regexp_eatRegExpIdentifierName(state) && state.eat(0x3E /* > */)) {
        return true
      }
      state.raise("Invalid capture group name");
    }
    return false
  };

  // RegExpIdentifierName ::
  //   RegExpIdentifierStart
  //   RegExpIdentifierName RegExpIdentifierPart
  // Note: this updates `state.lastStringValue` property with the eaten name.
  pp$1.regexp_eatRegExpIdentifierName = function(state) {
    state.lastStringValue = "";
    if (this.regexp_eatRegExpIdentifierStart(state)) {
      state.lastStringValue += codePointToString$1(state.lastIntValue);
      while (this.regexp_eatRegExpIdentifierPart(state)) {
        state.lastStringValue += codePointToString$1(state.lastIntValue);
      }
      return true
    }
    return false
  };

  // RegExpIdentifierStart ::
  //   UnicodeIDStart
  //   `$`
  //   `_`
  //   `\` RegExpUnicodeEscapeSequence[+U]
  pp$1.regexp_eatRegExpIdentifierStart = function(state) {
    var start = state.pos;
    var forceU = this.options.ecmaVersion >= 11;
    var ch = state.current(forceU);
    state.advance(forceU);

    if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
      ch = state.lastIntValue;
    }
    if (isRegExpIdentifierStart(ch)) {
      state.lastIntValue = ch;
      return true
    }

    state.pos = start;
    return false
  };
  function isRegExpIdentifierStart(ch) {
    return isIdentifierStart(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */
  }

  // RegExpIdentifierPart ::
  //   UnicodeIDContinue
  //   `$`
  //   `_`
  //   `\` RegExpUnicodeEscapeSequence[+U]
  //   <ZWNJ>
  //   <ZWJ>
  pp$1.regexp_eatRegExpIdentifierPart = function(state) {
    var start = state.pos;
    var forceU = this.options.ecmaVersion >= 11;
    var ch = state.current(forceU);
    state.advance(forceU);

    if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
      ch = state.lastIntValue;
    }
    if (isRegExpIdentifierPart(ch)) {
      state.lastIntValue = ch;
      return true
    }

    state.pos = start;
    return false
  };
  function isRegExpIdentifierPart(ch) {
    return isIdentifierChar(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */ || ch === 0x200C /* <ZWNJ> */ || ch === 0x200D /* <ZWJ> */
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-AtomEscape
  pp$1.regexp_eatAtomEscape = function(state) {
    if (
      this.regexp_eatBackReference(state) ||
      this.regexp_eatCharacterClassEscape(state) ||
      this.regexp_eatCharacterEscape(state) ||
      (state.switchN && this.regexp_eatKGroupName(state))
    ) {
      return true
    }
    if (state.switchU) {
      // Make the same message as V8.
      if (state.current() === 0x63 /* c */) {
        state.raise("Invalid unicode escape");
      }
      state.raise("Invalid escape");
    }
    return false
  };
  pp$1.regexp_eatBackReference = function(state) {
    var start = state.pos;
    if (this.regexp_eatDecimalEscape(state)) {
      var n = state.lastIntValue;
      if (state.switchU) {
        // For SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-atomescape
        if (n > state.maxBackReference) {
          state.maxBackReference = n;
        }
        return true
      }
      if (n <= state.numCapturingParens) {
        return true
      }
      state.pos = start;
    }
    return false
  };
  pp$1.regexp_eatKGroupName = function(state) {
    if (state.eat(0x6B /* k */)) {
      if (this.regexp_eatGroupName(state)) {
        state.backReferenceNames.push(state.lastStringValue);
        return true
      }
      state.raise("Invalid named reference");
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-CharacterEscape
  pp$1.regexp_eatCharacterEscape = function(state) {
    return (
      this.regexp_eatControlEscape(state) ||
      this.regexp_eatCControlLetter(state) ||
      this.regexp_eatZero(state) ||
      this.regexp_eatHexEscapeSequence(state) ||
      this.regexp_eatRegExpUnicodeEscapeSequence(state, false) ||
      (!state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state)) ||
      this.regexp_eatIdentityEscape(state)
    )
  };
  pp$1.regexp_eatCControlLetter = function(state) {
    var start = state.pos;
    if (state.eat(0x63 /* c */)) {
      if (this.regexp_eatControlLetter(state)) {
        return true
      }
      state.pos = start;
    }
    return false
  };
  pp$1.regexp_eatZero = function(state) {
    if (state.current() === 0x30 /* 0 */ && !isDecimalDigit(state.lookahead())) {
      state.lastIntValue = 0;
      state.advance();
      return true
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-ControlEscape
  pp$1.regexp_eatControlEscape = function(state) {
    var ch = state.current();
    if (ch === 0x74 /* t */) {
      state.lastIntValue = 0x09; /* \t */
      state.advance();
      return true
    }
    if (ch === 0x6E /* n */) {
      state.lastIntValue = 0x0A; /* \n */
      state.advance();
      return true
    }
    if (ch === 0x76 /* v */) {
      state.lastIntValue = 0x0B; /* \v */
      state.advance();
      return true
    }
    if (ch === 0x66 /* f */) {
      state.lastIntValue = 0x0C; /* \f */
      state.advance();
      return true
    }
    if (ch === 0x72 /* r */) {
      state.lastIntValue = 0x0D; /* \r */
      state.advance();
      return true
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-ControlLetter
  pp$1.regexp_eatControlLetter = function(state) {
    var ch = state.current();
    if (isControlLetter(ch)) {
      state.lastIntValue = ch % 0x20;
      state.advance();
      return true
    }
    return false
  };
  function isControlLetter(ch) {
    return (
      (ch >= 0x41 /* A */ && ch <= 0x5A /* Z */) ||
      (ch >= 0x61 /* a */ && ch <= 0x7A /* z */)
    )
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-RegExpUnicodeEscapeSequence
  pp$1.regexp_eatRegExpUnicodeEscapeSequence = function(state, forceU) {
    if ( forceU === void 0 ) forceU = false;

    var start = state.pos;
    var switchU = forceU || state.switchU;

    if (state.eat(0x75 /* u */)) {
      if (this.regexp_eatFixedHexDigits(state, 4)) {
        var lead = state.lastIntValue;
        if (switchU && lead >= 0xD800 && lead <= 0xDBFF) {
          var leadSurrogateEnd = state.pos;
          if (state.eat(0x5C /* \ */) && state.eat(0x75 /* u */) && this.regexp_eatFixedHexDigits(state, 4)) {
            var trail = state.lastIntValue;
            if (trail >= 0xDC00 && trail <= 0xDFFF) {
              state.lastIntValue = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
              return true
            }
          }
          state.pos = leadSurrogateEnd;
          state.lastIntValue = lead;
        }
        return true
      }
      if (
        switchU &&
        state.eat(0x7B /* { */) &&
        this.regexp_eatHexDigits(state) &&
        state.eat(0x7D /* } */) &&
        isValidUnicode(state.lastIntValue)
      ) {
        return true
      }
      if (switchU) {
        state.raise("Invalid unicode escape");
      }
      state.pos = start;
    }

    return false
  };
  function isValidUnicode(ch) {
    return ch >= 0 && ch <= 0x10FFFF
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-IdentityEscape
  pp$1.regexp_eatIdentityEscape = function(state) {
    if (state.switchU) {
      if (this.regexp_eatSyntaxCharacter(state)) {
        return true
      }
      if (state.eat(0x2F /* / */)) {
        state.lastIntValue = 0x2F; /* / */
        return true
      }
      return false
    }

    var ch = state.current();
    if (ch !== 0x63 /* c */ && (!state.switchN || ch !== 0x6B /* k */)) {
      state.lastIntValue = ch;
      state.advance();
      return true
    }

    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalEscape
  pp$1.regexp_eatDecimalEscape = function(state) {
    state.lastIntValue = 0;
    var ch = state.current();
    if (ch >= 0x31 /* 1 */ && ch <= 0x39 /* 9 */) {
      do {
        state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
        state.advance();
      } while ((ch = state.current()) >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */)
      return true
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClassEscape
  pp$1.regexp_eatCharacterClassEscape = function(state) {
    var ch = state.current();

    if (isCharacterClassEscape(ch)) {
      state.lastIntValue = -1;
      state.advance();
      return true
    }

    if (
      state.switchU &&
      this.options.ecmaVersion >= 9 &&
      (ch === 0x50 /* P */ || ch === 0x70 /* p */)
    ) {
      state.lastIntValue = -1;
      state.advance();
      if (
        state.eat(0x7B /* { */) &&
        this.regexp_eatUnicodePropertyValueExpression(state) &&
        state.eat(0x7D /* } */)
      ) {
        return true
      }
      state.raise("Invalid property name");
    }

    return false
  };
  function isCharacterClassEscape(ch) {
    return (
      ch === 0x64 /* d */ ||
      ch === 0x44 /* D */ ||
      ch === 0x73 /* s */ ||
      ch === 0x53 /* S */ ||
      ch === 0x77 /* w */ ||
      ch === 0x57 /* W */
    )
  }

  // UnicodePropertyValueExpression ::
  //   UnicodePropertyName `=` UnicodePropertyValue
  //   LoneUnicodePropertyNameOrValue
  pp$1.regexp_eatUnicodePropertyValueExpression = function(state) {
    var start = state.pos;

    // UnicodePropertyName `=` UnicodePropertyValue
    if (this.regexp_eatUnicodePropertyName(state) && state.eat(0x3D /* = */)) {
      var name = state.lastStringValue;
      if (this.regexp_eatUnicodePropertyValue(state)) {
        var value = state.lastStringValue;
        this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
        return true
      }
    }
    state.pos = start;

    // LoneUnicodePropertyNameOrValue
    if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
      var nameOrValue = state.lastStringValue;
      this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
      return true
    }
    return false
  };
  pp$1.regexp_validateUnicodePropertyNameAndValue = function(state, name, value) {
    if (!hasOwn(state.unicodeProperties.nonBinary, name))
      { state.raise("Invalid property name"); }
    if (!state.unicodeProperties.nonBinary[name].test(value))
      { state.raise("Invalid property value"); }
  };
  pp$1.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
    if (!state.unicodeProperties.binary.test(nameOrValue))
      { state.raise("Invalid property name"); }
  };

  // UnicodePropertyName ::
  //   UnicodePropertyNameCharacters
  pp$1.regexp_eatUnicodePropertyName = function(state) {
    var ch = 0;
    state.lastStringValue = "";
    while (isUnicodePropertyNameCharacter(ch = state.current())) {
      state.lastStringValue += codePointToString$1(ch);
      state.advance();
    }
    return state.lastStringValue !== ""
  };
  function isUnicodePropertyNameCharacter(ch) {
    return isControlLetter(ch) || ch === 0x5F /* _ */
  }

  // UnicodePropertyValue ::
  //   UnicodePropertyValueCharacters
  pp$1.regexp_eatUnicodePropertyValue = function(state) {
    var ch = 0;
    state.lastStringValue = "";
    while (isUnicodePropertyValueCharacter(ch = state.current())) {
      state.lastStringValue += codePointToString$1(ch);
      state.advance();
    }
    return state.lastStringValue !== ""
  };
  function isUnicodePropertyValueCharacter(ch) {
    return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch)
  }

  // LoneUnicodePropertyNameOrValue ::
  //   UnicodePropertyValueCharacters
  pp$1.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
    return this.regexp_eatUnicodePropertyValue(state)
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClass
  pp$1.regexp_eatCharacterClass = function(state) {
    if (state.eat(0x5B /* [ */)) {
      state.eat(0x5E /* ^ */);
      this.regexp_classRanges(state);
      if (state.eat(0x5D /* ] */)) {
        return true
      }
      // Unreachable since it threw "unterminated regular expression" error before.
      state.raise("Unterminated character class");
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassRanges
  // https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRanges
  // https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRangesNoDash
  pp$1.regexp_classRanges = function(state) {
    while (this.regexp_eatClassAtom(state)) {
      var left = state.lastIntValue;
      if (state.eat(0x2D /* - */) && this.regexp_eatClassAtom(state)) {
        var right = state.lastIntValue;
        if (state.switchU && (left === -1 || right === -1)) {
          state.raise("Invalid character class");
        }
        if (left !== -1 && right !== -1 && left > right) {
          state.raise("Range out of order in character class");
        }
      }
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtom
  // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtomNoDash
  pp$1.regexp_eatClassAtom = function(state) {
    var start = state.pos;

    if (state.eat(0x5C /* \ */)) {
      if (this.regexp_eatClassEscape(state)) {
        return true
      }
      if (state.switchU) {
        // Make the same message as V8.
        var ch$1 = state.current();
        if (ch$1 === 0x63 /* c */ || isOctalDigit(ch$1)) {
          state.raise("Invalid class escape");
        }
        state.raise("Invalid escape");
      }
      state.pos = start;
    }

    var ch = state.current();
    if (ch !== 0x5D /* ] */) {
      state.lastIntValue = ch;
      state.advance();
      return true
    }

    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassEscape
  pp$1.regexp_eatClassEscape = function(state) {
    var start = state.pos;

    if (state.eat(0x62 /* b */)) {
      state.lastIntValue = 0x08; /* <BS> */
      return true
    }

    if (state.switchU && state.eat(0x2D /* - */)) {
      state.lastIntValue = 0x2D; /* - */
      return true
    }

    if (!state.switchU && state.eat(0x63 /* c */)) {
      if (this.regexp_eatClassControlLetter(state)) {
        return true
      }
      state.pos = start;
    }

    return (
      this.regexp_eatCharacterClassEscape(state) ||
      this.regexp_eatCharacterEscape(state)
    )
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassControlLetter
  pp$1.regexp_eatClassControlLetter = function(state) {
    var ch = state.current();
    if (isDecimalDigit(ch) || ch === 0x5F /* _ */) {
      state.lastIntValue = ch % 0x20;
      state.advance();
      return true
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
  pp$1.regexp_eatHexEscapeSequence = function(state) {
    var start = state.pos;
    if (state.eat(0x78 /* x */)) {
      if (this.regexp_eatFixedHexDigits(state, 2)) {
        return true
      }
      if (state.switchU) {
        state.raise("Invalid escape");
      }
      state.pos = start;
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalDigits
  pp$1.regexp_eatDecimalDigits = function(state) {
    var start = state.pos;
    var ch = 0;
    state.lastIntValue = 0;
    while (isDecimalDigit(ch = state.current())) {
      state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
      state.advance();
    }
    return state.pos !== start
  };
  function isDecimalDigit(ch) {
    return ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigits
  pp$1.regexp_eatHexDigits = function(state) {
    var start = state.pos;
    var ch = 0;
    state.lastIntValue = 0;
    while (isHexDigit(ch = state.current())) {
      state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
      state.advance();
    }
    return state.pos !== start
  };
  function isHexDigit(ch) {
    return (
      (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) ||
      (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) ||
      (ch >= 0x61 /* a */ && ch <= 0x66 /* f */)
    )
  }
  function hexToInt(ch) {
    if (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) {
      return 10 + (ch - 0x41 /* A */)
    }
    if (ch >= 0x61 /* a */ && ch <= 0x66 /* f */) {
      return 10 + (ch - 0x61 /* a */)
    }
    return ch - 0x30 /* 0 */
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-LegacyOctalEscapeSequence
  // Allows only 0-377(octal) i.e. 0-255(decimal).
  pp$1.regexp_eatLegacyOctalEscapeSequence = function(state) {
    if (this.regexp_eatOctalDigit(state)) {
      var n1 = state.lastIntValue;
      if (this.regexp_eatOctalDigit(state)) {
        var n2 = state.lastIntValue;
        if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
          state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
        } else {
          state.lastIntValue = n1 * 8 + n2;
        }
      } else {
        state.lastIntValue = n1;
      }
      return true
    }
    return false
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-OctalDigit
  pp$1.regexp_eatOctalDigit = function(state) {
    var ch = state.current();
    if (isOctalDigit(ch)) {
      state.lastIntValue = ch - 0x30; /* 0 */
      state.advance();
      return true
    }
    state.lastIntValue = 0;
    return false
  };
  function isOctalDigit(ch) {
    return ch >= 0x30 /* 0 */ && ch <= 0x37 /* 7 */
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Hex4Digits
  // https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigit
  // And HexDigit HexDigit in https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
  pp$1.regexp_eatFixedHexDigits = function(state, length) {
    var start = state.pos;
    state.lastIntValue = 0;
    for (var i = 0; i < length; ++i) {
      var ch = state.current();
      if (!isHexDigit(ch)) {
        state.pos = start;
        return false
      }
      state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
      state.advance();
    }
    return true
  };

  // Object type used to represent tokens. Note that normally, tokens
  // simply exist as properties on the parser object. This is only
  // used for the onToken callback and the external tokenizer.

  var Token = function Token(p) {
    this.type = p.type;
    this.value = p.value;
    this.start = p.start;
    this.end = p.end;
    if (p.options.locations)
      { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
    if (p.options.ranges)
      { this.range = [p.start, p.end]; }
  };

  // ## Tokenizer

  var pp = Parser.prototype;

  // Move to the next token

  pp.next = function(ignoreEscapeSequenceInKeyword) {
    if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc)
      { this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword); }
    if (this.options.onToken)
      { this.options.onToken(new Token(this)); }

    this.lastTokEnd = this.end;
    this.lastTokStart = this.start;
    this.lastTokEndLoc = this.endLoc;
    this.lastTokStartLoc = this.startLoc;
    this.nextToken();
  };

  pp.getToken = function() {
    this.next();
    return new Token(this)
  };

  // If we're in an ES6 environment, make parsers iterable
  if (typeof Symbol !== "undefined")
    { pp[Symbol.iterator] = function() {
      var this$1$1 = this;

      return {
        next: function () {
          var token = this$1$1.getToken();
          return {
            done: token.type === types$1.eof,
            value: token
          }
        }
      }
    }; }

  // Toggle strict mode. Re-reads the next number or string to please
  // pedantic tests (`"use strict"; 010;` should fail).

  // Read a single token, updating the parser object's token-related
  // properties.

  pp.nextToken = function() {
    var curContext = this.curContext();
    if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

    this.start = this.pos;
    if (this.options.locations) { this.startLoc = this.curPosition(); }
    if (this.pos >= this.input.length) { return this.finishToken(types$1.eof) }

    if (curContext.override) { return curContext.override(this) }
    else { this.readToken(this.fullCharCodeAtPos()); }
  };

  pp.readToken = function(code) {
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
      { return this.readWord() }

    return this.getTokenFromCode(code)
  };

  pp.fullCharCodeAtPos = function() {
    var code = this.input.charCodeAt(this.pos);
    if (code <= 0xd7ff || code >= 0xdc00) { return code }
    var next = this.input.charCodeAt(this.pos + 1);
    return next <= 0xdbff || next >= 0xe000 ? code : (code << 10) + next - 0x35fdc00
  };

  pp.skipBlockComment = function() {
    var startLoc = this.options.onComment && this.curPosition();
    var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
    if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
    this.pos = end + 2;
    if (this.options.locations) {
      for (var nextBreak = (void 0), pos = start; (nextBreak = nextLineBreak(this.input, pos, this.pos)) > -1;) {
        ++this.curLine;
        pos = this.lineStart = nextBreak;
      }
    }
    if (this.options.onComment)
      { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                             startLoc, this.curPosition()); }
  };

  pp.skipLineComment = function(startSkip) {
    var start = this.pos;
    var startLoc = this.options.onComment && this.curPosition();
    var ch = this.input.charCodeAt(this.pos += startSkip);
    while (this.pos < this.input.length && !isNewLine(ch)) {
      ch = this.input.charCodeAt(++this.pos);
    }
    if (this.options.onComment)
      { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                             startLoc, this.curPosition()); }
  };

  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.

  pp.skipSpace = function() {
    loop: while (this.pos < this.input.length) {
      var ch = this.input.charCodeAt(this.pos);
      switch (ch) {
      case 32: case 160: // ' '
        ++this.pos;
        break
      case 13:
        if (this.input.charCodeAt(this.pos + 1) === 10) {
          ++this.pos;
        }
      case 10: case 8232: case 8233:
        ++this.pos;
        if (this.options.locations) {
          ++this.curLine;
          this.lineStart = this.pos;
        }
        break
      case 47: // '/'
        switch (this.input.charCodeAt(this.pos + 1)) {
        case 42: // '*'
          this.skipBlockComment();
          break
        case 47:
          this.skipLineComment(2);
          break
        default:
          break loop
        }
        break
      default:
        if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
          ++this.pos;
        } else {
          break loop
        }
      }
    }
  };

  // Called at the end of every token. Sets `end`, `val`, and
  // maintains `context` and `exprAllowed`, and skips the space after
  // the token, so that the next one's `start` will point at the
  // right position.

  pp.finishToken = function(type, val) {
    this.end = this.pos;
    if (this.options.locations) { this.endLoc = this.curPosition(); }
    var prevType = this.type;
    this.type = type;
    this.value = val;

    this.updateContext(prevType);
  };

  // ### Token reading

  // This is the function that is called to fetch the next token. It
  // is somewhat obscure, because it works in character codes rather
  // than characters, and because operator parsing has been inlined
  // into it.
  //
  // All in the name of speed.
  //
  pp.readToken_dot = function() {
    var next = this.input.charCodeAt(this.pos + 1);
    if (next >= 48 && next <= 57) { return this.readNumber(true) }
    var next2 = this.input.charCodeAt(this.pos + 2);
    if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
      this.pos += 3;
      return this.finishToken(types$1.ellipsis)
    } else {
      ++this.pos;
      return this.finishToken(types$1.dot)
    }
  };

  pp.readToken_slash = function() { // '/'
    var next = this.input.charCodeAt(this.pos + 1);
    if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
    if (next === 61) { return this.finishOp(types$1.assign, 2) }
    return this.finishOp(types$1.slash, 1)
  };

  pp.readToken_mult_modulo_exp = function(code) { // '%*'
    var next = this.input.charCodeAt(this.pos + 1);
    var size = 1;
    var tokentype = code === 42 ? types$1.star : types$1.modulo;

    // exponentiation operator ** and **=
    if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
      ++size;
      tokentype = types$1.starstar;
      next = this.input.charCodeAt(this.pos + 2);
    }

    if (next === 61) { return this.finishOp(types$1.assign, size + 1) }
    return this.finishOp(tokentype, size)
  };

  pp.readToken_pipe_amp = function(code) { // '|&'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === code) {
      if (this.options.ecmaVersion >= 12) {
        var next2 = this.input.charCodeAt(this.pos + 2);
        if (next2 === 61) { return this.finishOp(types$1.assign, 3) }
      }
      return this.finishOp(code === 124 ? types$1.logicalOR : types$1.logicalAND, 2)
    }
    if (next === 61) { return this.finishOp(types$1.assign, 2) }
    return this.finishOp(code === 124 ? types$1.bitwiseOR : types$1.bitwiseAND, 1)
  };

  pp.readToken_caret = function() { // '^'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 61) { return this.finishOp(types$1.assign, 2) }
    return this.finishOp(types$1.bitwiseXOR, 1)
  };

  pp.readToken_plus_min = function(code) { // '+-'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === code) {
      if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 &&
          (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
        // A `-->` line comment
        this.skipLineComment(3);
        this.skipSpace();
        return this.nextToken()
      }
      return this.finishOp(types$1.incDec, 2)
    }
    if (next === 61) { return this.finishOp(types$1.assign, 2) }
    return this.finishOp(types$1.plusMin, 1)
  };

  pp.readToken_lt_gt = function(code) { // '<>'
    var next = this.input.charCodeAt(this.pos + 1);
    var size = 1;
    if (next === code) {
      size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
      if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types$1.assign, size + 1) }
      return this.finishOp(types$1.bitShift, size)
    }
    if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 &&
        this.input.charCodeAt(this.pos + 3) === 45) {
      // `<!--`, an XML-style comment that should be interpreted as a line comment
      this.skipLineComment(4);
      this.skipSpace();
      return this.nextToken()
    }
    if (next === 61) { size = 2; }
    return this.finishOp(types$1.relational, size)
  };

  pp.readToken_eq_excl = function(code) { // '=!'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 61) { return this.finishOp(types$1.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
    if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
      this.pos += 2;
      return this.finishToken(types$1.arrow)
    }
    return this.finishOp(code === 61 ? types$1.eq : types$1.prefix, 1)
  };

  pp.readToken_question = function() { // '?'
    var ecmaVersion = this.options.ecmaVersion;
    if (ecmaVersion >= 11) {
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 46) {
        var next2 = this.input.charCodeAt(this.pos + 2);
        if (next2 < 48 || next2 > 57) { return this.finishOp(types$1.questionDot, 2) }
      }
      if (next === 63) {
        if (ecmaVersion >= 12) {
          var next2$1 = this.input.charCodeAt(this.pos + 2);
          if (next2$1 === 61) { return this.finishOp(types$1.assign, 3) }
        }
        return this.finishOp(types$1.coalesce, 2)
      }
    }
    return this.finishOp(types$1.question, 1)
  };

  pp.readToken_numberSign = function() { // '#'
    var ecmaVersion = this.options.ecmaVersion;
    var code = 35; // '#'
    if (ecmaVersion >= 13) {
      ++this.pos;
      code = this.fullCharCodeAtPos();
      if (isIdentifierStart(code, true) || code === 92 /* '\' */) {
        return this.finishToken(types$1.privateId, this.readWord1())
      }
    }

    this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
  };

  pp.getTokenFromCode = function(code) {
    switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.
    case 46: // '.'
      return this.readToken_dot()

    // Punctuation tokens.
    case 40: ++this.pos; return this.finishToken(types$1.parenL)
    case 41: ++this.pos; return this.finishToken(types$1.parenR)
    case 59: ++this.pos; return this.finishToken(types$1.semi)
    case 44: ++this.pos; return this.finishToken(types$1.comma)
    case 91: ++this.pos; return this.finishToken(types$1.bracketL)
    case 93: ++this.pos; return this.finishToken(types$1.bracketR)
    case 123: ++this.pos; return this.finishToken(types$1.braceL)
    case 125: ++this.pos; return this.finishToken(types$1.braceR)
    case 58: ++this.pos; return this.finishToken(types$1.colon)

    case 96: // '`'
      if (this.options.ecmaVersion < 6) { break }
      ++this.pos;
      return this.finishToken(types$1.backQuote)

    case 48: // '0'
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
      if (this.options.ecmaVersion >= 6) {
        if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
        if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
      }

    // Anything else beginning with a digit is an integer, octal
    // number, or float.
    case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
      return this.readNumber(false)

    // Quotes produce strings.
    case 34: case 39: // '"', "'"
      return this.readString(code)

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.
    case 47: // '/'
      return this.readToken_slash()

    case 37: case 42: // '%*'
      return this.readToken_mult_modulo_exp(code)

    case 124: case 38: // '|&'
      return this.readToken_pipe_amp(code)

    case 94: // '^'
      return this.readToken_caret()

    case 43: case 45: // '+-'
      return this.readToken_plus_min(code)

    case 60: case 62: // '<>'
      return this.readToken_lt_gt(code)

    case 61: case 33: // '=!'
      return this.readToken_eq_excl(code)

    case 63: // '?'
      return this.readToken_question()

    case 126: // '~'
      return this.finishOp(types$1.prefix, 1)

    case 35: // '#'
      return this.readToken_numberSign()
    }

    this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
  };

  pp.finishOp = function(type, size) {
    var str = this.input.slice(this.pos, this.pos + size);
    this.pos += size;
    return this.finishToken(type, str)
  };

  pp.readRegexp = function() {
    var escaped, inClass, start = this.pos;
    for (;;) {
      if (this.pos >= this.input.length) { this.raise(start, "Unterminated regular expression"); }
      var ch = this.input.charAt(this.pos);
      if (lineBreak.test(ch)) { this.raise(start, "Unterminated regular expression"); }
      if (!escaped) {
        if (ch === "[") { inClass = true; }
        else if (ch === "]" && inClass) { inClass = false; }
        else if (ch === "/" && !inClass) { break }
        escaped = ch === "\\";
      } else { escaped = false; }
      ++this.pos;
    }
    var pattern = this.input.slice(start, this.pos);
    ++this.pos;
    var flagsStart = this.pos;
    var flags = this.readWord1();
    if (this.containsEsc) { this.unexpected(flagsStart); }

    // Validate pattern
    var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
    state.reset(start, pattern, flags);
    this.validateRegExpFlags(state);
    this.validateRegExpPattern(state);

    // Create Literal#value property value.
    var value = null;
    try {
      value = new RegExp(pattern, flags);
    } catch (e) {
      // ESTree requires null if it failed to instantiate RegExp object.
      // https://github.com/estree/estree/blob/a27003adf4fd7bfad44de9cef372a2eacd527b1c/es5.md#regexpliteral
    }

    return this.finishToken(types$1.regexp, {pattern: pattern, flags: flags, value: value})
  };

  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.

  pp.readInt = function(radix, len, maybeLegacyOctalNumericLiteral) {
    // `len` is used for character escape sequences. In that case, disallow separators.
    var allowSeparators = this.options.ecmaVersion >= 12 && len === undefined;

    // `maybeLegacyOctalNumericLiteral` is true if it doesn't have prefix (0x,0o,0b)
    // and isn't fraction part nor exponent part. In that case, if the first digit
    // is zero then disallow separators.
    var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;

    var start = this.pos, total = 0, lastCode = 0;
    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
      var code = this.input.charCodeAt(this.pos), val = (void 0);

      if (allowSeparators && code === 95) {
        if (isLegacyOctalNumericLiteral) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals"); }
        if (lastCode === 95) { this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore"); }
        if (i === 0) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits"); }
        lastCode = code;
        continue
      }

      if (code >= 97) { val = code - 97 + 10; } // a
      else if (code >= 65) { val = code - 65 + 10; } // A
      else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
      else { val = Infinity; }
      if (val >= radix) { break }
      lastCode = code;
      total = total * radix + val;
    }

    if (allowSeparators && lastCode === 95) { this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits"); }
    if (this.pos === start || len != null && this.pos - start !== len) { return null }

    return total
  };

  function stringToNumber(str, isLegacyOctalNumericLiteral) {
    if (isLegacyOctalNumericLiteral) {
      return parseInt(str, 8)
    }

    // `parseFloat(value)` stops parsing at the first numeric separator then returns a wrong value.
    return parseFloat(str.replace(/_/g, ""))
  }

  function stringToBigInt(str) {
    if (typeof BigInt !== "function") {
      return null
    }

    // `BigInt(value)` throws syntax error if the string contains numeric separators.
    return BigInt(str.replace(/_/g, ""))
  }

  pp.readRadixNumber = function(radix) {
    var start = this.pos;
    this.pos += 2; // 0x
    var val = this.readInt(radix);
    if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
    if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
      val = stringToBigInt(this.input.slice(start, this.pos));
      ++this.pos;
    } else if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
    return this.finishToken(types$1.num, val)
  };

  // Read an integer, octal integer, or floating-point number.

  pp.readNumber = function(startsWithDot) {
    var start = this.pos;
    if (!startsWithDot && this.readInt(10, undefined, true) === null) { this.raise(start, "Invalid number"); }
    var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
    if (octal && this.strict) { this.raise(start, "Invalid number"); }
    var next = this.input.charCodeAt(this.pos);
    if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
      var val$1 = stringToBigInt(this.input.slice(start, this.pos));
      ++this.pos;
      if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
      return this.finishToken(types$1.num, val$1)
    }
    if (octal && /[89]/.test(this.input.slice(start, this.pos))) { octal = false; }
    if (next === 46 && !octal) { // '.'
      ++this.pos;
      this.readInt(10);
      next = this.input.charCodeAt(this.pos);
    }
    if ((next === 69 || next === 101) && !octal) { // 'eE'
      next = this.input.charCodeAt(++this.pos);
      if (next === 43 || next === 45) { ++this.pos; } // '+-'
      if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
    }
    if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

    var val = stringToNumber(this.input.slice(start, this.pos), octal);
    return this.finishToken(types$1.num, val)
  };

  // Read a string value, interpreting backslash-escapes.

  pp.readCodePoint = function() {
    var ch = this.input.charCodeAt(this.pos), code;

    if (ch === 123) { // '{'
      if (this.options.ecmaVersion < 6) { this.unexpected(); }
      var codePos = ++this.pos;
      code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
      ++this.pos;
      if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
    } else {
      code = this.readHexChar(4);
    }
    return code
  };

  function codePointToString(code) {
    // UTF-16 Decoding
    if (code <= 0xFFFF) { return String.fromCharCode(code) }
    code -= 0x10000;
    return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
  }

  pp.readString = function(quote) {
    var out = "", chunkStart = ++this.pos;
    for (;;) {
      if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated string constant"); }
      var ch = this.input.charCodeAt(this.pos);
      if (ch === quote) { break }
      if (ch === 92) { // '\'
        out += this.input.slice(chunkStart, this.pos);
        out += this.readEscapedChar(false);
        chunkStart = this.pos;
      } else if (ch === 0x2028 || ch === 0x2029) {
        if (this.options.ecmaVersion < 10) { this.raise(this.start, "Unterminated string constant"); }
        ++this.pos;
        if (this.options.locations) {
          this.curLine++;
          this.lineStart = this.pos;
        }
      } else {
        if (isNewLine(ch)) { this.raise(this.start, "Unterminated string constant"); }
        ++this.pos;
      }
    }
    out += this.input.slice(chunkStart, this.pos++);
    return this.finishToken(types$1.string, out)
  };

  // Reads template string tokens.

  var INVALID_TEMPLATE_ESCAPE_ERROR = {};

  pp.tryReadTemplateToken = function() {
    this.inTemplateElement = true;
    try {
      this.readTmplToken();
    } catch (err) {
      if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
        this.readInvalidTemplateToken();
      } else {
        throw err
      }
    }

    this.inTemplateElement = false;
  };

  pp.invalidStringToken = function(position, message) {
    if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
      throw INVALID_TEMPLATE_ESCAPE_ERROR
    } else {
      this.raise(position, message);
    }
  };

  pp.readTmplToken = function() {
    var out = "", chunkStart = this.pos;
    for (;;) {
      if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated template"); }
      var ch = this.input.charCodeAt(this.pos);
      if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) { // '`', '${'
        if (this.pos === this.start && (this.type === types$1.template || this.type === types$1.invalidTemplate)) {
          if (ch === 36) {
            this.pos += 2;
            return this.finishToken(types$1.dollarBraceL)
          } else {
            ++this.pos;
            return this.finishToken(types$1.backQuote)
          }
        }
        out += this.input.slice(chunkStart, this.pos);
        return this.finishToken(types$1.template, out)
      }
      if (ch === 92) { // '\'
        out += this.input.slice(chunkStart, this.pos);
        out += this.readEscapedChar(true);
        chunkStart = this.pos;
      } else if (isNewLine(ch)) {
        out += this.input.slice(chunkStart, this.pos);
        ++this.pos;
        switch (ch) {
        case 13:
          if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; }
        case 10:
          out += "\n";
          break
        default:
          out += String.fromCharCode(ch);
          break
        }
        if (this.options.locations) {
          ++this.curLine;
          this.lineStart = this.pos;
        }
        chunkStart = this.pos;
      } else {
        ++this.pos;
      }
    }
  };

  // Reads a template token to search for the end, without validating any escape sequences
  pp.readInvalidTemplateToken = function() {
    for (; this.pos < this.input.length; this.pos++) {
      switch (this.input[this.pos]) {
      case "\\":
        ++this.pos;
        break

      case "$":
        if (this.input[this.pos + 1] !== "{") {
          break
        }

      // falls through
      case "`":
        return this.finishToken(types$1.invalidTemplate, this.input.slice(this.start, this.pos))

      // no default
      }
    }
    this.raise(this.start, "Unterminated template");
  };

  // Used to read escaped characters

  pp.readEscapedChar = function(inTemplate) {
    var ch = this.input.charCodeAt(++this.pos);
    ++this.pos;
    switch (ch) {
    case 110: return "\n" // 'n' -> '\n'
    case 114: return "\r" // 'r' -> '\r'
    case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
    case 117: return codePointToString(this.readCodePoint()) // 'u'
    case 116: return "\t" // 't' -> '\t'
    case 98: return "\b" // 'b' -> '\b'
    case 118: return "\u000b" // 'v' -> '\u000b'
    case 102: return "\f" // 'f' -> '\f'
    case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\r\n'
    case 10: // ' \n'
      if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
      return ""
    case 56:
    case 57:
      if (this.strict) {
        this.invalidStringToken(
          this.pos - 1,
          "Invalid escape sequence"
        );
      }
      if (inTemplate) {
        var codePos = this.pos - 1;

        this.invalidStringToken(
          codePos,
          "Invalid escape sequence in template string"
        );

        return null
      }
    default:
      if (ch >= 48 && ch <= 55) {
        var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
        var octal = parseInt(octalStr, 8);
        if (octal > 255) {
          octalStr = octalStr.slice(0, -1);
          octal = parseInt(octalStr, 8);
        }
        this.pos += octalStr.length - 1;
        ch = this.input.charCodeAt(this.pos);
        if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
          this.invalidStringToken(
            this.pos - 1 - octalStr.length,
            inTemplate
              ? "Octal literal in template string"
              : "Octal literal in strict mode"
          );
        }
        return String.fromCharCode(octal)
      }
      if (isNewLine(ch)) {
        // Unicode new line characters after \ get removed from output in both
        // template literals and strings
        return ""
      }
      return String.fromCharCode(ch)
    }
  };

  // Used to read character escape sequences ('\x', '\u', '\U').

  pp.readHexChar = function(len) {
    var codePos = this.pos;
    var n = this.readInt(16, len);
    if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
    return n
  };

  // Read an identifier, and return it as a string. Sets `this.containsEsc`
  // to whether the word contained a '\u' escape.
  //
  // Incrementally adds only escaped chars, adding other chunks as-is
  // as a micro-optimization.

  pp.readWord1 = function() {
    this.containsEsc = false;
    var word = "", first = true, chunkStart = this.pos;
    var astral = this.options.ecmaVersion >= 6;
    while (this.pos < this.input.length) {
      var ch = this.fullCharCodeAtPos();
      if (isIdentifierChar(ch, astral)) {
        this.pos += ch <= 0xffff ? 1 : 2;
      } else if (ch === 92) { // "\"
        this.containsEsc = true;
        word += this.input.slice(chunkStart, this.pos);
        var escStart = this.pos;
        if (this.input.charCodeAt(++this.pos) !== 117) // "u"
          { this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX"); }
        ++this.pos;
        var esc = this.readCodePoint();
        if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
          { this.invalidStringToken(escStart, "Invalid Unicode escape"); }
        word += codePointToString(esc);
        chunkStart = this.pos;
      } else {
        break
      }
      first = false;
    }
    return word + this.input.slice(chunkStart, this.pos)
  };

  // Read an identifier or keyword token. Will check for reserved
  // words when necessary.

  pp.readWord = function() {
    var word = this.readWord1();
    var type = types$1.name;
    if (this.keywords.test(word)) {
      type = keywords[word];
    }
    return this.finishToken(type, word)
  };

  // Acorn is a tiny, fast JavaScript parser written in JavaScript.

  var version = "8.7.0";

  Parser.acorn = {
    Parser: Parser,
    version: version,
    defaultOptions: defaultOptions,
    Position: Position,
    SourceLocation: SourceLocation,
    getLineInfo: getLineInfo,
    Node: Node$1,
    TokenType: TokenType,
    tokTypes: types$1,
    keywordTypes: keywords,
    TokContext: TokContext,
    tokContexts: types,
    isIdentifierChar: isIdentifierChar,
    isIdentifierStart: isIdentifierStart,
    Token: Token,
    isNewLine: isNewLine,
    lineBreak: lineBreak,
    lineBreakG: lineBreakG,
    nonASCIIwhitespace: nonASCIIwhitespace
  };

  var defaultGlobals = new Set([
    "Array",
    "ArrayBuffer",
    "atob",
    "AudioContext",
    "Blob",
    "Boolean",
    "BigInt",
    "btoa",
    "clearInterval",
    "clearTimeout",
    "console",
    "crypto",
    "CustomEvent",
    "DataView",
    "Date",
    "decodeURI",
    "decodeURIComponent",
    "devicePixelRatio",
    "document",
    "encodeURI",
    "encodeURIComponent",
    "Error",
    "escape",
    "eval",
    "fetch",
    "File",
    "FileList",
    "FileReader",
    "Float32Array",
    "Float64Array",
    "Function",
    "Headers",
    "Image",
    "ImageData",
    "Infinity",
    "Int16Array",
    "Int32Array",
    "Int8Array",
    "Intl",
    "isFinite",
    "isNaN",
    "JSON",
    "Map",
    "Math",
    "NaN",
    "Number",
    "navigator",
    "Object",
    "parseFloat",
    "parseInt",
    "performance",
    "Path2D",
    "Promise",
    "Proxy",
    "RangeError",
    "ReferenceError",
    "Reflect",
    "RegExp",
    "cancelAnimationFrame",
    "requestAnimationFrame",
    "Set",
    "setInterval",
    "setTimeout",
    "String",
    "Symbol",
    "SyntaxError",
    "TextDecoder",
    "TextEncoder",
    "this",
    "TypeError",
    "Uint16Array",
    "Uint32Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "undefined",
    "unescape",
    "URIError",
    "URL",
    "WeakMap",
    "WeakSet",
    "WebSocket",
    "Worker",
    "window"
  ]);

  // AST walker module for Mozilla Parser API compatible trees

  // A simple walk is one where you simply specify callbacks to be
  // called on specific nodes. The last two arguments are optional. A
  // simple use would be
  //
  //     walk.simple(myTree, {
  //         Expression: function(node) { ... }
  //     });
  //
  // to do something with all expressions. All Parser API node types
  // can be used to identify node types, as well as Expression and
  // Statement, which denote categories of nodes.
  //
  // The base argument can be used to pass a custom (recursive)
  // walker, and state can be used to give this walked an initial
  // state.

  function simple(node, visitors, baseVisitor, state, override) {
    if (!baseVisitor) { baseVisitor = base
    ; }(function c(node, st, override) {
      var type = override || node.type, found = visitors[type];
      baseVisitor[type](node, st, c);
      if (found) { found(node, st); }
    })(node, state, override);
  }

  // An ancestor walk keeps an array of ancestor nodes (including the
  // current node) and passes them to the callback as third parameter
  // (and also as state parameter when no other state is present).
  function ancestor(node, visitors, baseVisitor, state, override) {
    var ancestors = [];
    if (!baseVisitor) { baseVisitor = base
    ; }(function c(node, st, override) {
      var type = override || node.type, found = visitors[type];
      var isNew = node !== ancestors[ancestors.length - 1];
      if (isNew) { ancestors.push(node); }
      baseVisitor[type](node, st, c);
      if (found) { found(node, st || ancestors, ancestors); }
      if (isNew) { ancestors.pop(); }
    })(node, state, override);
  }

  // Used to create a custom walker. Will fill in all missing node
  // type properties with the defaults.
  function make(funcs, baseVisitor) {
    var visitor = Object.create(baseVisitor || base);
    for (var type in funcs) { visitor[type] = funcs[type]; }
    return visitor
  }

  function skipThrough(node, st, c) { c(node, st); }
  function ignore(_node, _st, _c) {}

  // Node walkers.

  var base = {};

  base.Program = base.BlockStatement = base.StaticBlock = function (node, st, c) {
    for (var i = 0, list = node.body; i < list.length; i += 1)
      {
      var stmt = list[i];

      c(stmt, st, "Statement");
    }
  };
  base.Statement = skipThrough;
  base.EmptyStatement = ignore;
  base.ExpressionStatement = base.ParenthesizedExpression = base.ChainExpression =
    function (node, st, c) { return c(node.expression, st, "Expression"); };
  base.IfStatement = function (node, st, c) {
    c(node.test, st, "Expression");
    c(node.consequent, st, "Statement");
    if (node.alternate) { c(node.alternate, st, "Statement"); }
  };
  base.LabeledStatement = function (node, st, c) { return c(node.body, st, "Statement"); };
  base.BreakStatement = base.ContinueStatement = ignore;
  base.WithStatement = function (node, st, c) {
    c(node.object, st, "Expression");
    c(node.body, st, "Statement");
  };
  base.SwitchStatement = function (node, st, c) {
    c(node.discriminant, st, "Expression");
    for (var i$1 = 0, list$1 = node.cases; i$1 < list$1.length; i$1 += 1) {
      var cs = list$1[i$1];

      if (cs.test) { c(cs.test, st, "Expression"); }
      for (var i = 0, list = cs.consequent; i < list.length; i += 1)
        {
        var cons = list[i];

        c(cons, st, "Statement");
      }
    }
  };
  base.SwitchCase = function (node, st, c) {
    if (node.test) { c(node.test, st, "Expression"); }
    for (var i = 0, list = node.consequent; i < list.length; i += 1)
      {
      var cons = list[i];

      c(cons, st, "Statement");
    }
  };
  base.ReturnStatement = base.YieldExpression = base.AwaitExpression = function (node, st, c) {
    if (node.argument) { c(node.argument, st, "Expression"); }
  };
  base.ThrowStatement = base.SpreadElement =
    function (node, st, c) { return c(node.argument, st, "Expression"); };
  base.TryStatement = function (node, st, c) {
    c(node.block, st, "Statement");
    if (node.handler) { c(node.handler, st); }
    if (node.finalizer) { c(node.finalizer, st, "Statement"); }
  };
  base.CatchClause = function (node, st, c) {
    if (node.param) { c(node.param, st, "Pattern"); }
    c(node.body, st, "Statement");
  };
  base.WhileStatement = base.DoWhileStatement = function (node, st, c) {
    c(node.test, st, "Expression");
    c(node.body, st, "Statement");
  };
  base.ForStatement = function (node, st, c) {
    if (node.init) { c(node.init, st, "ForInit"); }
    if (node.test) { c(node.test, st, "Expression"); }
    if (node.update) { c(node.update, st, "Expression"); }
    c(node.body, st, "Statement");
  };
  base.ForInStatement = base.ForOfStatement = function (node, st, c) {
    c(node.left, st, "ForInit");
    c(node.right, st, "Expression");
    c(node.body, st, "Statement");
  };
  base.ForInit = function (node, st, c) {
    if (node.type === "VariableDeclaration") { c(node, st); }
    else { c(node, st, "Expression"); }
  };
  base.DebuggerStatement = ignore;

  base.FunctionDeclaration = function (node, st, c) { return c(node, st, "Function"); };
  base.VariableDeclaration = function (node, st, c) {
    for (var i = 0, list = node.declarations; i < list.length; i += 1)
      {
      var decl = list[i];

      c(decl, st);
    }
  };
  base.VariableDeclarator = function (node, st, c) {
    c(node.id, st, "Pattern");
    if (node.init) { c(node.init, st, "Expression"); }
  };

  base.Function = function (node, st, c) {
    if (node.id) { c(node.id, st, "Pattern"); }
    for (var i = 0, list = node.params; i < list.length; i += 1)
      {
      var param = list[i];

      c(param, st, "Pattern");
    }
    c(node.body, st, node.expression ? "Expression" : "Statement");
  };

  base.Pattern = function (node, st, c) {
    if (node.type === "Identifier")
      { c(node, st, "VariablePattern"); }
    else if (node.type === "MemberExpression")
      { c(node, st, "MemberPattern"); }
    else
      { c(node, st); }
  };
  base.VariablePattern = ignore;
  base.MemberPattern = skipThrough;
  base.RestElement = function (node, st, c) { return c(node.argument, st, "Pattern"); };
  base.ArrayPattern = function (node, st, c) {
    for (var i = 0, list = node.elements; i < list.length; i += 1) {
      var elt = list[i];

      if (elt) { c(elt, st, "Pattern"); }
    }
  };
  base.ObjectPattern = function (node, st, c) {
    for (var i = 0, list = node.properties; i < list.length; i += 1) {
      var prop = list[i];

      if (prop.type === "Property") {
        if (prop.computed) { c(prop.key, st, "Expression"); }
        c(prop.value, st, "Pattern");
      } else if (prop.type === "RestElement") {
        c(prop.argument, st, "Pattern");
      }
    }
  };

  base.Expression = skipThrough;
  base.ThisExpression = base.Super = base.MetaProperty = ignore;
  base.ArrayExpression = function (node, st, c) {
    for (var i = 0, list = node.elements; i < list.length; i += 1) {
      var elt = list[i];

      if (elt) { c(elt, st, "Expression"); }
    }
  };
  base.ObjectExpression = function (node, st, c) {
    for (var i = 0, list = node.properties; i < list.length; i += 1)
      {
      var prop = list[i];

      c(prop, st);
    }
  };
  base.FunctionExpression = base.ArrowFunctionExpression = base.FunctionDeclaration;
  base.SequenceExpression = function (node, st, c) {
    for (var i = 0, list = node.expressions; i < list.length; i += 1)
      {
      var expr = list[i];

      c(expr, st, "Expression");
    }
  };
  base.TemplateLiteral = function (node, st, c) {
    for (var i = 0, list = node.quasis; i < list.length; i += 1)
      {
      var quasi = list[i];

      c(quasi, st);
    }

    for (var i$1 = 0, list$1 = node.expressions; i$1 < list$1.length; i$1 += 1)
      {
      var expr = list$1[i$1];

      c(expr, st, "Expression");
    }
  };
  base.TemplateElement = ignore;
  base.UnaryExpression = base.UpdateExpression = function (node, st, c) {
    c(node.argument, st, "Expression");
  };
  base.BinaryExpression = base.LogicalExpression = function (node, st, c) {
    c(node.left, st, "Expression");
    c(node.right, st, "Expression");
  };
  base.AssignmentExpression = base.AssignmentPattern = function (node, st, c) {
    c(node.left, st, "Pattern");
    c(node.right, st, "Expression");
  };
  base.ConditionalExpression = function (node, st, c) {
    c(node.test, st, "Expression");
    c(node.consequent, st, "Expression");
    c(node.alternate, st, "Expression");
  };
  base.NewExpression = base.CallExpression = function (node, st, c) {
    c(node.callee, st, "Expression");
    if (node.arguments)
      { for (var i = 0, list = node.arguments; i < list.length; i += 1)
        {
          var arg = list[i];

          c(arg, st, "Expression");
        } }
  };
  base.MemberExpression = function (node, st, c) {
    c(node.object, st, "Expression");
    if (node.computed) { c(node.property, st, "Expression"); }
  };
  base.ExportNamedDeclaration = base.ExportDefaultDeclaration = function (node, st, c) {
    if (node.declaration)
      { c(node.declaration, st, node.type === "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression"); }
    if (node.source) { c(node.source, st, "Expression"); }
  };
  base.ExportAllDeclaration = function (node, st, c) {
    if (node.exported)
      { c(node.exported, st); }
    c(node.source, st, "Expression");
  };
  base.ImportDeclaration = function (node, st, c) {
    for (var i = 0, list = node.specifiers; i < list.length; i += 1)
      {
      var spec = list[i];

      c(spec, st);
    }
    c(node.source, st, "Expression");
  };
  base.ImportExpression = function (node, st, c) {
    c(node.source, st, "Expression");
  };
  base.ImportSpecifier = base.ImportDefaultSpecifier = base.ImportNamespaceSpecifier = base.Identifier = base.PrivateIdentifier = base.Literal = ignore;

  base.TaggedTemplateExpression = function (node, st, c) {
    c(node.tag, st, "Expression");
    c(node.quasi, st, "Expression");
  };
  base.ClassDeclaration = base.ClassExpression = function (node, st, c) { return c(node, st, "Class"); };
  base.Class = function (node, st, c) {
    if (node.id) { c(node.id, st, "Pattern"); }
    if (node.superClass) { c(node.superClass, st, "Expression"); }
    c(node.body, st);
  };
  base.ClassBody = function (node, st, c) {
    for (var i = 0, list = node.body; i < list.length; i += 1)
      {
      var elt = list[i];

      c(elt, st);
    }
  };
  base.MethodDefinition = base.PropertyDefinition = base.Property = function (node, st, c) {
    if (node.computed) { c(node.key, st, "Expression"); }
    if (node.value) { c(node.value, st, "Expression"); }
  };

  var walk = make({
    Import() {},
    ViewExpression(node, st, c) {
      c(node.id, st, "Identifier");
    },
    MutableExpression(node, st, c) {
      c(node.id, st, "Identifier");
    }
  });

  // Based on https://github.com/ForbesLindesay/acorn-globals

  function isScope(node) {
    return node.type === "FunctionExpression"
        || node.type === "FunctionDeclaration"
        || node.type === "ArrowFunctionExpression"
        || node.type === "Program";
  }

  function isBlockScope(node) {
    return node.type === "BlockStatement"
        || node.type === "ForInStatement"
        || node.type === "ForOfStatement"
        || node.type === "ForStatement"
        || isScope(node);
  }

  function declaresArguments(node) {
    return node.type === "FunctionExpression"
        || node.type === "FunctionDeclaration";
  }

  function findReferences(cell, globals) {
    const ast = {type: "Program", body: [cell.body]};
    const locals = new Map;
    const globalSet = new Set(globals);
    const references = [];

    function hasLocal(node, name) {
      const l = locals.get(node);
      return l ? l.has(name) : false;
    }

    function declareLocal(node, id) {
      const l = locals.get(node);
      if (l) l.add(id.name);
      else locals.set(node, new Set([id.name]));
    }

    function declareClass(node) {
      if (node.id) declareLocal(node, node.id);
    }

    function declareFunction(node) {
      node.params.forEach(param => declarePattern(param, node));
      if (node.id) declareLocal(node, node.id);
    }

    function declareCatchClause(node) {
      if (node.param) declarePattern(node.param, node);
    }

    function declarePattern(node, parent) {
      switch (node.type) {
        case "Identifier":
          declareLocal(parent, node);
          break;
        case "ObjectPattern":
          node.properties.forEach(node => declarePattern(node, parent));
          break;
        case "ArrayPattern":
          node.elements.forEach(node => node && declarePattern(node, parent));
          break;
        case "Property":
          declarePattern(node.value, parent);
          break;
        case "RestElement":
          declarePattern(node.argument, parent);
          break;
        case "AssignmentPattern":
          declarePattern(node.left, parent);
          break;
        default:
          throw new Error("Unrecognized pattern type: " + node.type);
      }
    }

    function declareModuleSpecifier(node) {
      declareLocal(ast, node.local);
    }

    ancestor(
      ast,
      {
        VariableDeclaration: (node, parents) => {
          let parent = null;
          for (let i = parents.length - 1; i >= 0 && parent === null; --i) {
            if (node.kind === "var" ? isScope(parents[i]) : isBlockScope(parents[i])) {
              parent = parents[i];
            }
          }
          node.declarations.forEach(declaration => declarePattern(declaration.id, parent));
        },
        FunctionDeclaration: (node, parents) => {
          let parent = null;
          for (let i = parents.length - 2; i >= 0 && parent === null; --i) {
            if (isScope(parents[i])) {
              parent = parents[i];
            }
          }
          declareLocal(parent, node.id);
          declareFunction(node);
        },
        Function: declareFunction,
        ClassDeclaration: (node, parents) => {
          let parent = null;
          for (let i = parents.length - 2; i >= 0 && parent === null; i--) {
            if (isScope(parents[i])) {
              parent = parents[i];
            }
          }
          declareLocal(parent, node.id);
        },
        Class: declareClass,
        CatchClause: declareCatchClause,
        ImportDefaultSpecifier: declareModuleSpecifier,
        ImportSpecifier: declareModuleSpecifier,
        ImportNamespaceSpecifier: declareModuleSpecifier
      },
      walk
    );

    function identifier(node, parents) {
      let name = node.name;
      if (name === "undefined") return;
      for (let i = parents.length - 2; i >= 0; --i) {
        if (name === "arguments") {
          if (declaresArguments(parents[i])) {
            return;
          }
        }
        if (hasLocal(parents[i], name)) {
          return;
        }
        if (parents[i].type === "ViewExpression") {
          node = parents[i];
          name = `viewof ${node.id.name}`;
        }
        if (parents[i].type === "MutableExpression") {
          node = parents[i];
          name = `mutable ${node.id.name}`;
        }
      }
      if (!globalSet.has(name)) {
        if (name === "arguments") {
          throw Object.assign(new SyntaxError(`arguments is not allowed`), {node});
        }
        references.push(node);
      }
    }

    ancestor(
      ast,
      {
        VariablePattern: identifier,
        Identifier: identifier
      },
      walk
    );

    function checkConst(node, parents) {
      if (!node) return;
      switch (node.type) {
        case "Identifier":
        case "VariablePattern": {
          for (const parent of parents) {
            if (hasLocal(parent, node.name)) {
              return;
            }
          }
          if (parents[parents.length - 2].type === "MutableExpression") {
            return;
          }
          throw Object.assign(new SyntaxError(`Assignment to constant variable ${node.name}`), {node});
        }
        case "ArrayPattern": {
          for (const element of node.elements) {
            checkConst(element, parents);
          }
          return;
        }
        case "ObjectPattern": {
          for (const property of node.properties) {
            checkConst(property, parents);
          }
          return;
        }
        case "Property": {
          checkConst(node.value, parents);
          return;
        }
        case "RestElement": {
          checkConst(node.argument, parents);
          return;
        }
      }
    }

    function checkConstArgument(node, parents) {
      checkConst(node.argument, parents);
    }

    function checkConstLeft(node, parents) {
      checkConst(node.left, parents);
    }

    ancestor(
      ast,
      {
        AssignmentExpression: checkConstLeft,
        AssignmentPattern: checkConstLeft,
        UpdateExpression: checkConstArgument,
        ForOfStatement: checkConstLeft,
        ForInStatement: checkConstLeft
      },
      walk
    );

    return references;
  }

  function findFeatures(cell, featureName) {
    const ast = {type: "Program", body: [cell.body]};
    const features = new Map();
    const {references} = cell;

    simple(
      ast,
      {
        CallExpression: node => {
          const {callee, arguments: args} = node;

          // Ignore function calls that are not references to the feature.
          if (
            callee.type !== "Identifier" ||
            callee.name !== featureName ||
            references.indexOf(callee) < 0
          ) return;

          // Forbid dynamic calls.
          if (
            args.length !== 1 ||
            !((args[0].type === "Literal" && /^['"]/.test(args[0].raw)) ||
              (args[0].type === "TemplateLiteral" && args[0].expressions.length === 0))
          ) {
            throw Object.assign(new SyntaxError(`${featureName} requires a single literal string argument`), {node});
          }

          const [arg] = args;
          const name = arg.type === "Literal" ? arg.value : arg.quasis[0].value.cooked;
          const location = {start: arg.start, end: arg.end};
          if (features.has(name)) features.get(name).push(location);
          else features.set(name, [location]);
        }
      },
      walk
    );

    return features;
  }

  const SCOPE_FUNCTION$1 = 2;
  const SCOPE_ASYNC$1 = 4;
  const SCOPE_GENERATOR$1 = 8;

  class CellParser extends Parser {
    constructor(options, ...args) {
      super(Object.assign({ecmaVersion: 13}, options), ...args);
    }
    enterScope(flags) {
      if (flags & SCOPE_FUNCTION$1) ++this.O_function;
      return super.enterScope(flags);
    }
    exitScope() {
      if (this.currentScope().flags & SCOPE_FUNCTION$1) --this.O_function;
      return super.exitScope();
    }
    parseForIn(node, init) {
      if (this.O_function === 1 && node.await) this.O_async = true;
      return super.parseForIn(node, init);
    }
    parseAwait() {
      if (this.O_function === 1) this.O_async = true;
      return super.parseAwait();
    }
    parseYield(noIn) {
      if (this.O_function === 1) this.O_generator = true;
      return super.parseYield(noIn);
    }
    parseImport(node) {
      this.next();
      node.specifiers = this.parseImportSpecifiers();
      if (this.type === types$1._with) {
        this.next();
        node.injections = this.parseImportSpecifiers();
      }
      this.expectContextual("from");
      node.source = this.type === types$1.string ? this.parseExprAtom() : this.unexpected();
      return this.finishNode(node, "ImportDeclaration");
    }
    parseImportSpecifiers() {
      const nodes = [];
      const identifiers = new Set;
      let first = true;
      this.expect(types$1.braceL);
      while (!this.eat(types$1.braceR)) {
        if (first) {
          first = false;
        } else {
          this.expect(types$1.comma);
          if (this.afterTrailingComma(types$1.braceR)) break;
        }
        const node = this.startNode();
        node.view = this.eatContextual("viewof");
        node.mutable = node.view ? false : this.eatContextual("mutable");
        node.imported = this.parseIdent();
        this.checkUnreserved(node.imported);
        this.checkLocal(node.imported);
        if (this.eatContextual("as")) {
          node.local = this.parseIdent();
          this.checkUnreserved(node.local);
          this.checkLocal(node.local);
        } else {
          node.local = node.imported;
        }
        this.checkLValSimple(node.local, "let");
        if (identifiers.has(node.local.name)) {
          this.raise(node.local.start, `Identifier '${node.local.name}' has already been declared`);
        }
        identifiers.add(node.local.name);
        nodes.push(this.finishNode(node, "ImportSpecifier"));
      }
      return nodes;
    }
    parseExprAtom(refDestructuringErrors) {
      return (
        this.parseMaybeKeywordExpression("viewof", "ViewExpression") ||
        this.parseMaybeKeywordExpression("mutable", "MutableExpression") ||
        super.parseExprAtom(refDestructuringErrors)
      );
    }
    startCell() {
      this.O_function = 0;
      this.O_async = false;
      this.O_generator = false;
      this.strict = true;
      this.enterScope(SCOPE_FUNCTION$1 | SCOPE_ASYNC$1 | SCOPE_GENERATOR$1);
    }
    finishCell(node, body, id) {
      if (id) this.checkLocal(id);
      node.id = id;
      node.body = body;
      node.async = this.O_async;
      node.generator = this.O_generator;
      this.exitScope();
      return this.finishNode(node, "Cell");
    }
    parseCell(node, eof) {
      const lookahead = new CellParser({}, this.input, this.start);
      let token = lookahead.getToken();
      let body = null;
      let id = null;

      this.startCell();

      // An import?
      if (token.type === types$1._import && lookahead.getToken().type !== types$1.parenL) {
        body = this.parseImport(this.startNode());
      }

      // A non-empty cell?
      else if (token.type !== types$1.eof && token.type !== types$1.semi) {
        // A named cell?
        if (token.type === types$1.name) {
          if (token.value === "viewof" || token.value === "mutable") {
            token = lookahead.getToken();
            if (token.type !== types$1.name) {
              lookahead.unexpected();
            }
          }
          token = lookahead.getToken();
          if (token.type === types$1.eq) {
            id =
              this.parseMaybeKeywordExpression("viewof", "ViewExpression") ||
              this.parseMaybeKeywordExpression("mutable", "MutableExpression") ||
              this.parseIdent();
            token = lookahead.getToken();
            this.expect(types$1.eq);
          }
        }

        // A block?
        if (token.type === types$1.braceL) {
          body = this.parseBlock();
        }

        // An expression?
        // Possibly a function or class declaration?
        else {
          body = this.parseExpression();
          if (
            id === null &&
            (body.type === "FunctionExpression" ||
              body.type === "ClassExpression")
          ) {
            id = body.id;
          }
        }
      }

      this.semicolon();
      if (eof) this.expect(types$1.eof); // TODO

      return this.finishCell(node, body, id);
    }
    parseTopLevel(node) {
      return this.parseCell(node, true);
    }
    toAssignable(node, isBinding, refDestructuringErrors) {
      return node.type === "MutableExpression"
        ? node
        : super.toAssignable(node, isBinding, refDestructuringErrors);
    }
    checkLocal(id) {
      const node = id.id || id;
      if (defaultGlobals.has(node.name) || node.name === "arguments") {
        this.raise(node.start, `Identifier '${node.name}' is reserved`);
      }
    }
    checkUnreserved(node) {
      if (node.name === "viewof" || node.name === "mutable") {
        this.raise(node.start, `Unexpected keyword '${node.name}'`);
      }
      return super.checkUnreserved(node);
    }
    checkLValSimple(expr, bindingType, checkClashes) {
      return super.checkLValSimple(
        expr.type === "MutableExpression" ? expr.id : expr,
        bindingType,
        checkClashes
      );
    }
    unexpected(pos) {
      this.raise(
        pos != null ? pos : this.start,
        this.type === types$1.eof ? "Unexpected end of input" : "Unexpected token"
      );
    }
    parseMaybeKeywordExpression(keyword, type) {
      if (this.isContextual(keyword)) {
        const node = this.startNode();
        this.next();
        node.id = this.parseIdent();
        return this.finishNode(node, type);
      }
    }
  }

  // const SCOPE_FUNCTION = 2;
  // const SCOPE_ASYNC = 4;
  // const SCOPE_GENERATOR = 8;
  // function parseCell(input, { tag, raw, globals, ...options } = {}) {
  //     let cell;
  //     // Parse empty input as JavaScript to keep ensure resulting ast
  //     // is consistent for all empty input cases.
  //     if (tag != null && input) {
  //         cell = TemplateCellParser.parse(input, options);
  //         const parsedTag = CellTagParser.parse(tag, options);
  //         parseReferences(parsedTag, tag, globals);
  //         parseFeatures(parsedTag, tag);
  //         cell.tag = parsedTag;
  //         cell.raw = !!raw;
  //     } else {
  //         cell = CellParser.parse(input, options);
  //     }
  //     parseReferences(cell, input, globals);
  //     parseFeatures(cell, input);
  //     return cell;
  // }
  // class CellParser extends Parser {
  //     constructor(options, ...args) {
  //         super(Object.assign({ ecmaVersion: 13 }, options), ...args);
  //     }
  //     enterScope(flags) {
  //         if (flags & SCOPE_FUNCTION) ++this.O_function;
  //         return super.enterScope(flags);
  //     }
  //     exitScope() {
  //         if (this.currentScope().flags & SCOPE_FUNCTION) --this.O_function;
  //         return super.exitScope();
  //     }
  //     parseForIn(node, init) {
  //         if (this.O_function === 1 && node.await) this.O_async = true;
  //         return super.parseForIn(node, init);
  //     }
  //     parseAwait() {
  //         if (this.O_function === 1) this.O_async = true;
  //         return super.parseAwait();
  //     }
  //     parseYield(noIn) {
  //         if (this.O_function === 1) this.O_generator = true;
  //         return super.parseYield(noIn);
  //     }
  //     parseImport(node) {
  //         this.next();
  //         node.specifiers = this.parseImportSpecifiers();
  //         if (this.type === tt._with) {
  //             this.next();
  //             node.injections = this.parseImportSpecifiers();
  //         }
  //         this.expectContextual("from");
  //         node.source = this.type === tt.string ? this.parseExprAtom() : this.unexpected();
  //         return this.finishNode(node, "ImportDeclaration");
  //     }
  //     parseImportSpecifiers() {
  //         const nodes = [];
  //         const identifiers = new Set;
  //         let first = true;
  //         this.expect(tt.braceL);
  //         while (!this.eat(tt.braceR)) {
  //             if (first) {
  //                 first = false;
  //             } else {
  //                 this.expect(tt.comma);
  //                 if (this.afterTrailingComma(tt.braceR)) break;
  //             }
  //             const node = this.startNode();
  //             node.view = this.eatContextual("viewof");
  //             node.mutable = node.view ? false : this.eatContextual("mutable");
  //             node.imported = this.parseIdent();
  //             this.checkUnreserved(node.imported);
  //             this.checkLocal(node.imported);
  //             if (this.eatContextual("as")) {
  //                 node.local = this.parseIdent();
  //                 this.checkUnreserved(node.local);
  //                 this.checkLocal(node.local);
  //             } else {
  //                 node.local = node.imported;
  //             }
  //             this.checkLValSimple(node.local, "let");
  //             if (identifiers.has(node.local.name)) {
  //                 this.raise(node.local.start, `Identifier '${node.local.name}' has already been declared`);
  //             }
  //             identifiers.add(node.local.name);
  //             nodes.push(this.finishNode(node, "ImportSpecifier"));
  //         }
  //         return nodes;
  //     }
  //     parseExprAtom(refDestructuringErrors) {
  //         return (
  //             this.parseMaybeKeywordExpression("viewof", "ViewExpression") ||
  //             this.parseMaybeKeywordExpression("mutable", "MutableExpression") ||
  //             super.parseExprAtom(refDestructuringErrors)
  //         );
  //     }
  //     startCell() {
  //         this.O_function = 0;
  //         this.O_async = false;
  //         this.O_generator = false;
  //         this.strict = true;
  //         this.enterScope(SCOPE_FUNCTION | SCOPE_ASYNC | SCOPE_GENERATOR);
  //     }
  //     finishCell(node, body, id) {
  //         if (id) this.checkLocal(id);
  //         node.id = id;
  //         node.body = body;
  //         node.async = this.O_async;
  //         node.generator = this.O_generator;
  //         this.exitScope();
  //         return this.finishNode(node, "Cell");
  //     }
  //     parseCell(node, eof) {
  //         const lookahead = new CellParser({}, this.input, this.start);
  //         let token = lookahead.getToken();
  //         let body = null;
  //         let id = null;
  //         this.startCell();
  //         // An import?
  //         if (token.type === tt._import && lookahead.getToken().type !== tt.parenL) {
  //             body = this.parseImport(this.startNode());
  //         }
  //         // A non-empty cell?
  //         else if (token.type !== tt.eof && token.type !== tt.semi) {
  //             // A named cell?
  //             if (token.type === tt.name) {
  //                 if (token.value === "viewof" || token.value === "mutable") {
  //                     token = lookahead.getToken();
  //                     if (token.type !== tt.name) {
  //                         lookahead.unexpected();
  //                     }
  //                 }
  //                 token = lookahead.getToken();
  //                 if (token.type === tt.eq) {
  //                     id =
  //                         this.parseMaybeKeywordExpression("viewof", "ViewExpression") ||
  //                         this.parseMaybeKeywordExpression("mutable", "MutableExpression") ||
  //                         this.parseIdent();
  //                     token = lookahead.getToken();
  //                     this.expect(tt.eq);
  //                 }
  //             }
  //             // A block?
  //             if (token.type === tt.braceL) {
  //                 body = this.parseBlock();
  //             }
  //             // An expression?
  //             // Possibly a function or class declaration?
  //             else {
  //                 body = this.parseExpression();
  //                 if (
  //                     id === null &&
  //                     (body.type === "FunctionExpression" ||
  //                         body.type === "ClassExpression")
  //                 ) {
  //                     id = body.id;
  //                 }
  //             }
  //         }
  //         this.semicolon();
  //         if (eof) this.expect(tt.eof); // TODO
  //         return this.finishCell(node, body, id);
  //     }
  //     parseTopLevel(node) {
  //         return this.parseCell(node, true);
  //     }
  //     toAssignable(node, isBinding, refDestructuringErrors) {
  //         return node.type === "MutableExpression"
  //             ? node
  //             : super.toAssignable(node, isBinding, refDestructuringErrors);
  //     }
  //     checkLocal(id) {
  //         const node = id.id || id;
  //         if (defaultGlobals.has(node.name) || node.name === "arguments") {
  //             this.raise(node.start, `Identifier '${node.name}' is reserved`);
  //         }
  //     }
  //     checkUnreserved(node) {
  //         if (node.name === "viewof" || node.name === "mutable") {
  //             this.raise(node.start, `Unexpected keyword '${node.name}'`);
  //         }
  //         return super.checkUnreserved(node);
  //     }
  //     checkLValSimple(expr, bindingType, checkClashes) {
  //         return super.checkLValSimple(
  //             expr.type === "MutableExpression" ? expr.id : expr,
  //             bindingType,
  //             checkClashes
  //         );
  //     }
  //     unexpected(pos) {
  //         this.raise(
  //             pos != null ? pos : this.start,
  //             this.type === tt.eof ? "Unexpected end of input" : "Unexpected token"
  //         );
  //     }
  //     parseMaybeKeywordExpression(keyword, type) {
  //         if (this.isContextual(keyword)) {
  //             const node = this.startNode();
  //             this.next();
  //             node.id = this.parseIdent();
  //             return this.finishNode(node, type);
  //         }
  //     }
  // }
  // // Based on acorn’s q_tmpl. We will use this to initialize the
  // // parser context so our `readTemplateToken` override is called.
  // // `readTemplateToken` is based on acorn's `readTmplToken` which
  // // is used inside template literals. Our version allows backQuotes.
  // const o_tmpl = new TokContext(
  //     "`", // token
  //     true, // isExpr
  //     true, // preserveSpace
  //     parser => readTemplateToken.call(parser) // override
  // );
  // class TemplateCellParser extends CellParser {
  //     constructor(...args) {
  //         super(...args);
  //         // Initialize the type so that we're inside a backQuote
  //         this.type = tt.backQuote;
  //         this.exprAllowed = false;
  //     }
  //     initialContext() {
  //         // Provide our custom TokContext
  //         return [o_tmpl];
  //     }
  //     parseCell(node) {
  //         this.startCell();
  //         // Fix for nextToken calling finishToken(tt.eof)
  //         if (this.type === tt.eof) this.value = "";
  //         // Based on acorn.Parser.parseTemplate
  //         const isTagged = true;
  //         const body = this.startNode();
  //         body.expressions = [];
  //         let curElt = this.parseTemplateElement({ isTagged });
  //         body.quasis = [curElt];
  //         while (this.type !== tt.eof) {
  //             this.expect(tt.dollarBraceL);
  //             body.expressions.push(this.parseExpression());
  //             this.expect(tt.braceR);
  //             body.quasis.push(curElt = this.parseTemplateElement({ isTagged }));
  //         }
  //         curElt.tail = true;
  //         this.next();
  //         this.finishNode(body, "TemplateLiteral");
  //         this.expect(tt.eof);
  //         return this.finishCell(node, body, null);
  //     }
  // }
  // // This is our custom override for parsing a template that allows backticks.
  // // Based on acorn's readInvalidTemplateToken.
  // function readTemplateToken() {
  //     out: for (; this.pos < this.input.length; this.pos++) {
  //         switch (this.input.charCodeAt(this.pos)) {
  //             case 92: { // slash
  //                 if (this.pos < this.input.length - 1) ++this.pos; // not a terminal slash
  //                 break;
  //             }
  //             case 36: { // dollar
  //                 if (this.input.charCodeAt(this.pos + 1) === 123) { // dollar curly
  //                     if (this.pos === this.start && this.type === tt.invalidTemplate) {
  //                         this.pos += 2;
  //                         return this.finishToken(tt.dollarBraceL);
  //                     }
  //                     break out;
  //                 }
  //                 break;
  //             }
  //         }
  //     }
  //     return this.finishToken(tt.invalidTemplate, this.input.slice(this.start, this.pos));
  // }
  // class CellTagParser extends Parser {
  //     constructor(options, ...args) {
  //         super(Object.assign({ ecmaVersion: 12 }, options), ...args);
  //     }
  //     enterScope(flags) {
  //         if (flags & SCOPE_FUNCTION) ++this.O_function;
  //         return super.enterScope(flags);
  //     }
  //     exitScope() {
  //         if (this.currentScope().flags & SCOPE_FUNCTION) --this.O_function;
  //         return super.exitScope();
  //     }
  //     parseForIn(node, init) {
  //         if (this.O_function === 1 && node.await) this.O_async = true;
  //         return super.parseForIn(node, init);
  //     }
  //     parseAwait() {
  //         if (this.O_function === 1) this.O_async = true;
  //         return super.parseAwait();
  //     }
  //     parseYield(noIn) {
  //         if (this.O_function === 1) this.O_generator = true;
  //         return super.parseYield(noIn);
  //     }
  //     parseTopLevel(node) {
  //         this.O_function = 0;
  //         this.O_async = false;
  //         this.O_generator = false;
  //         this.strict = true;
  //         this.enterScope(SCOPE_FUNCTION | SCOPE_ASYNC | SCOPE_GENERATOR);
  //         node.body = this.parseExpression();
  //         node.input = this.input;
  //         node.async = this.O_async;
  //         node.generator = this.O_generator;
  //         this.exitScope();
  //         return this.finishNode(node, "CellTag");
  //     }
  // }
  // Find references.
  // Check for illegal references to arguments.
  // Check for illegal assignments to global references.
  function parseReferences(cell, input, globals = defaultGlobals) {
      if (!cell.body) {
          cell.references = [];
      }
      else if (cell.body.type === "ImportDeclaration") {
          cell.references = cell.body.injections
              ? cell.body.injections.map(i => i.imported)
              : [];
      }
      else {
          try {
              cell.references = findReferences(cell, globals);
          }
          catch (error) {
              if (error.node) {
                  const loc = getLineInfo(input, error.node.start);
                  error.message += ` (${loc.line}:${loc.column})`;
                  error.pos = error.node.start;
                  error.loc = loc;
                  delete error.node;
              }
              throw error;
          }
      }
      return cell;
  }
  // Find features: file attachments, secrets, database clients.
  // Check for illegal references to arguments.
  // Check for illegal assignments to global references.
  function parseFeatures(cell, input) {
      if (cell.body && cell.body.type !== "ImportDeclaration") {
          try {
              cell.fileAttachments = findFeatures(cell, "FileAttachment");
              cell.databaseClients = findFeatures(cell, "DatabaseClient");
              cell.secrets = findFeatures(cell, "Secret");
          }
          catch (error) {
              if (error.node) {
                  const loc = getLineInfo(input, error.node.start);
                  error.message += ` (${loc.line}:${loc.column})`;
                  error.pos = error.node.start;
                  error.loc = loc;
                  delete error.node;
              }
              throw error;
          }
      }
      else {
          cell.fileAttachments = new Map();
          cell.databaseClients = new Map();
          cell.secrets = new Map();
      }
      return cell;
  }
  // @ts-ignore
  function parseModule(input, { globals } = {}) {
      // @ts-ignore
      const program = ModuleParser.parse(input);
      for (const cell of program.cells) {
          parseReferences(cell, input, globals);
          parseFeatures(cell, input);
      }
      return program;
  }
  class ModuleParser extends CellParser {
      parseTopLevel(node) {
          if (!node.cells)
              node.cells = [];
          // @ts-ignore
          while (this.type !== types$1.eof) {
              // @ts-ignore
              const cell = this.parseCell(this.startNode());
              // @ts-ignore
              cell.input = this.input;
              node.cells.push(cell);
          }
          // @ts-ignore
          this.next();
          // @ts-ignore
          return this.finishNode(node, "Program");
      }
  }

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */
  /* global Reflect, Promise */

  var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
          function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
      return extendStatics(d, b);
  };

  function __extends(d, b) {
      if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  var __assign = function() {
      __assign = Object.assign || function __assign(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
      };
      return __assign.apply(this, arguments);
  };

  function __decorate(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
  }

  function __metadata(metadataKey, metadataValue) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
  }

  function __spreadArray(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
          if (ar || !(i in from)) {
              if (!ar) ar = Array.prototype.slice.call(from, 0, i);
              ar[i] = from[i];
          }
      }
      return to.concat(ar || from);
  }

  function __await(v) {
      return this instanceof __await ? (this.v = v, this) : new __await(v);
  }

  function __asyncGenerator(thisArg, _arguments, generator) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var g = generator.apply(thisArg, _arguments || []), i, q = [];
      return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
      function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
      function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
      function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
      function fulfill(value) { resume("next", value); }
      function reject(value) { resume("throw", value); }
      function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
  }

  const FuncTypes = {
      functionType: Object.getPrototypeOf(function () { }).constructor,
      asyncFunctionType: Object.getPrototypeOf(async function () { }).constructor,
      generatorFunctionType: Object.getPrototypeOf(function* () { }).constructor,
      asyncGeneratorFunctionType: Object.getPrototypeOf(function () { return __asyncGenerator(this, arguments, function* () { }); }).constructor
  };
  function funcType(async = false, generator = false) {
      if (!async && !generator)
          return FuncTypes.functionType;
      if (async && !generator)
          return FuncTypes.asyncFunctionType;
      if (!async && generator)
          return FuncTypes.generatorFunctionType;
      return FuncTypes.asyncGeneratorFunctionType;
  }
  function createFunction(refs, _body, async = false, generator = false, blockStatement = false) {
      const args = [];
      const replace = [];
      let body = _body;
      for (const key in refs) {
          args.push(refs[key]);
          replace.push({ from: key, to: refs[key] });
      }
      //  Need to sort by length - otherwise it matches on prefix...
      replace.sort((l, r) => r.from.length - l.from.length);
      replace.forEach(r => {
          if (r.from !== r.to) {
              if (r.from.indexOf("mutable ") === 0) {
                  body = body.split(r.from).join(`${r.to}.value`);
              }
              else {
                  body = body.split(r.from).join(r.to);
              }
          }
      });
      return new (funcType(async, generator))(...args, blockStatement ? body : `{ return (${body}); }`);
  }
  function calcRefs(refs, str) {
      if (refs === undefined)
          return {};
      const dedup = {};
      refs.forEach(r => {
          if (r.name) {
              dedup[r.name] = r.name.split(" ").join("_");
          }
          else if (r.start !== undefined && r.end !== undefined) {
              const name = str.substring(r.start, r.end);
              dedup[name] = name.split(" ").join("_");
          }
      });
      return dedup;
  }
  function encodeOMD(str) {
      return str
          .split("`").join("\`")
          .split("$").join("\$");
  }
  function encodeMD(str) {
      return str
          .split("`").join("\\`")
          .split("$").join("\\$");
  }
  function encodeBacktick(str) {
      return str
          .split("`").join("\\`");
  }
  class OJSSyntaxError {
      constructor(start, end, message) {
          this.start = start;
          this.end = end;
          this.message = message;
          this.name = "OJSSyntaxError";
      }
  }
  class OJSRuntimeError {
      constructor(severity, start, end, message) {
          this.severity = severity;
          this.start = start;
          this.end = end;
          this.message = message;
          this.name = "OJSRuntimeError";
      }
  }

  function createParsedOJS(ojs, offset, inlineMD) {
      return {
          ojs,
          offset,
          inlineMD
      };
  }
  function createParsedECL(ecl, offset, origStr) {
      const text = origStr.substr(0, origStr.indexOf(ecl));
      const lineOffset = text.split("\n").length - 1;
      return {
          ecl,
          offset,
          lineOffset
      };
  }
  function ojsParse(ojs) {
      return parseModule(ojs);
  }
  function omd2ojs(_, extractECL = false) {
      const ojsArr = [];
      const eclArr = [];
      //  Load Markdown  ---
      const re = /(```(?:\s|\S)[\s\S]*?```)/g;
      let prevOffset = 0;
      let match = re.exec(_);
      while (match !== null) {
          if (match.index > prevOffset) {
              ojsArr.push(createParsedOJS("md`" + encodeBacktick(_.substring(prevOffset, match.index)) + "`", prevOffset, true));
          }
          const outer = match[0];
          if (outer.indexOf("``` ") === 0 || outer.indexOf("```\n") === 0 || outer.indexOf("```\r\n") === 0) {
              const prefixLen = 3;
              const inner = outer.substring(prefixLen, outer.length - prefixLen);
              ojsArr.push(createParsedOJS(inner, match.index + prefixLen, false));
          }
          else if (extractECL && (outer.indexOf("```ecl ") === 0 || outer.indexOf("```ecl\n") === 0 || outer.indexOf("```ecl\r\n") === 0)) {
              const prefixLen = 6;
              const inner = outer.substring(prefixLen, outer.length - prefixLen);
              eclArr.push(createParsedECL(inner, match.index + prefixLen, _));
          }
          else {
              ojsArr.push(createParsedOJS("md`\\n" + encodeBacktick(outer) + "\\n`", match.index, true));
          }
          prevOffset = match.index + match[0].length;
          match = re.exec(_);
      }
      if (_.length > prevOffset) {
          ojsArr.push(createParsedOJS("md`\\n" + encodeBacktick(_.substring(prevOffset, _.length)) + "\\n`", prevOffset, true));
      }
      return { ojsArr, eclArr };
  }
  function omdParse(ojs) {
      const retVal = {
          cells: []
      };
      omd2ojs(ojs).ojsArr.forEach(pOmd => {
          try {
              parseModule(pOmd.ojs).cells.forEach(cell => {
                  retVal.cells.push(cell);
              });
          }
          catch (e) {
              e.pos += pOmd.offset;
              e.raisedAt += pOmd.offset;
              throw e;
          }
      });
      return retVal;
  }

  //  Ported to TypeScript from:  https://github.com/bevacqua/hash-sum
  function pad$2(hash, len) {
      while (hash.length < len) {
          hash = "0" + hash;
      }
      return hash;
  }
  function fold(hash, text) {
      if (text.length === 0) {
          return hash;
      }
      for (var i = 0; i < text.length; ++i) {
          var chr = text.charCodeAt(i);
          hash = ((hash << 5) - hash) + chr;
          hash |= 0;
      }
      return hash < 0 ? hash * -2 : hash;
  }
  function foldObject(hash, o, seen) {
      if (typeof o.hashSum === "function") {
          return o.hashSum();
      }
      return Object.keys(o).sort().reduce(function (input, key) {
          return foldValue(input, o[key], key, seen);
      }, hash);
  }
  function foldValue(input, value, key, seen) {
      var hash = fold(fold(fold(input, key), toString$3(value)), typeof value);
      if (value === null) {
          return fold(hash, "null");
      }
      if (value === undefined) {
          return fold(hash, "undefined");
      }
      if (typeof value === "object") {
          if (seen.indexOf(value) !== -1) {
              return fold(hash, "[Circular]" + key);
          }
          seen.push(value);
          return foldObject(hash, value, seen);
      }
      return fold(hash, value.toString());
  }
  function toString$3(o) {
      return Object.prototype.toString.call(o);
  }
  function hashSum(o) {
      return pad$2(foldValue(0, o, "", []).toString(16), 8);
  }

  var root = typeof globalThis !== "undefined" ? globalThis : window;
  var isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
  var isCI = isNode && process.env != null && (process.env.TRAVIS != null || process.env.GITHUB_ACTIONS != null);

  function classID2Meta(classID) {
      var info = classID.split("_");
      var classInfo = info[1].split(".");
      return {
          module: "@hpcc-js/" + info[0],
          file: classInfo[0],
          class: classInfo[1] || classInfo[0]
      };
  }

  var requestAnimationFrame$1;
  // let cancelAnimationFrame: CancelAnimationFrame;
  (function () {
      if (root.requestAnimationFrame) {
          requestAnimationFrame$1 = root.requestAnimationFrame;
          // cancelAnimationFrame = root.cancelAnimationFrame;
      }
      else {
          var lastTime_1 = 0;
          requestAnimationFrame$1 = function (callback) {
              var currTime = new Date().getTime();
              var timeToCall = Math.max(0, 16 - (currTime - lastTime_1));
              var id = setTimeout(function () { return callback(currTime + timeToCall); }, timeToCall);
              lastTime_1 = currTime + timeToCall;
              return id;
          };
          // cancelAnimationFrame = function (handle: number): void {
          //     clearTimeout(handle);
          // };
      }
  })();
  var Message = /** @class */ (function () {
      function Message() {
      }
      Object.defineProperty(Message.prototype, "canConflate", {
          get: function () { return false; },
          enumerable: false,
          configurable: true
      });
      Message.prototype.conflate = function (other) {
          return false;
      };
      Message.prototype.void = function () {
          return false;
      };
      return Message;
  }());
  var Dispatch = /** @class */ (function () {
      function Dispatch() {
          this._observerID = 0;
          this._observers = [];
          this._messageBuffer = [];
      }
      Dispatch.prototype.observers = function () {
          return this._observers;
      };
      Dispatch.prototype.messages = function () {
          var retVal = [];
          this._messageBuffer.forEach(function (msg) {
              if (!retVal.some(function (msg2) { return msg2.canConflate && msg2.conflate(msg); })) {
                  retVal.push(msg);
              }
          });
          return retVal;
      };
      Dispatch.prototype.dispatchAll = function () {
          this.dispatch(this.messages());
          this.flush();
      };
      Dispatch.prototype.dispatch = function (messages) {
          if (messages.length === 0)
              return;
          this.observers().forEach(function (o) {
              var msgs = messages.filter(function (m) { return !m.void() && (o.type === undefined || m instanceof o.type); });
              if (msgs.length) {
                  o.callback(msgs);
              }
          });
      };
      Dispatch.prototype.hasObserver = function () {
          return this._observers.length > 0;
      };
      Dispatch.prototype.flush = function () {
          this._messageBuffer = [];
      };
      Dispatch.prototype.send = function (msg) {
          this.dispatch([msg]);
      };
      Dispatch.prototype.post = function (msg) {
          var _this = this;
          this._messageBuffer.push(msg);
          requestAnimationFrame$1(function () { return _this.dispatchAll(); });
      };
      Dispatch.prototype.attach = function (callback, type) {
          var context = this;
          var id = ++this._observerID;
          this._observers.push({ id: id, type: type, callback: callback });
          return {
              release: function () {
                  context._observers = context._observers.filter(function (o) { return o.id !== id; });
              },
              unwatch: function () {
                  this.release();
              }
          };
      };
      return Dispatch;
  }());

  function join() {
      var segments = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          segments[_i] = arguments[_i];
      }
      var parts = segments.reduce(function (parts, segment) {
          // Remove leading slashes from non-first part.
          if (parts.length > 0) {
              segment = segment.replace(/^\//, "");
          }
          // Remove trailing slashes.
          segment = segment.replace(/\/$/, "");
          return __spreadArray(__spreadArray([], parts), segment.split("/"));
      }, []);
      var resultParts = [];
      for (var _a = 0, parts_1 = parts; _a < parts_1.length; _a++) {
          var part = parts_1[_a];
          if (part === ".") {
              continue;
          }
          if (part === "..") {
              resultParts.pop();
              continue;
          }
          resultParts.push(part);
      }
      return resultParts.join("/");
  }
  function dirname(path) {
      return join(path, "..");
  }

  class OJSVariableMessage extends Message {
      constructor(variable, type, value) {
          super();
          this.variable = variable;
          this.type = type;
          this.value = value;
      }
      get canConflate() { return false; }
      conflate(other) {
          if (this.variable === other.variable) {
              this.type = other.type;
              this.value = other.value;
              return true;
          }
          return false;
      }
  }
  class OJSVariable {
      constructor(_ojsRuntime, _module, _cell, foreign = false) {
          this._ojsRuntime = _ojsRuntime;
          this._module = _module;
          this._cell = _cell;
          this._dispatcher = new Dispatch();
          const v = this.variable(_cell);
          this._id = v.id;
          this._uid = hashSum(_cell.input.substring(_cell.start, _cell.end));
          if (!foreign) {
              this._inspector = this._ojsRuntime._inspector();
          }
          this._value = new Promise((resolve, reject) => {
              this._valueResolve = resolve;
          });
      }
      watch(callback) {
          return this._dispatcher.attach(callback);
      }
      pending() {
          this._dispatcher.post(new OJSVariableMessage(this, "pending", undefined));
          this._inspector && this._inspector.pending();
      }
      fulfilled(value) {
          this._latest = {
              type: "fulfilled",
              value
          };
          this._valueResolve(value);
          this._dispatcher.post(new OJSVariableMessage(this, "fulfilled", value));
          this._inspector && this._inspector.fulfilled(value);
      }
      rejected(error) {
          this._latest = {
              type: "rejected",
              value: error
          };
          this._valueResolve(error);
          this._dispatcher.post(new OJSVariableMessage(this, "rejected", error));
          this._inspector && this._inspector.rejected(error);
      }
      variable(cell) {
          const input = cell.input;
          let id = cell.id ? input.substring(cell.id.start, cell.id.end) : ""; // `unnamed_${++idx}`;
          const body = cell.body ? input.substring(cell.body.start, cell.body.end) : "";
          const refs = calcRefs(cell.references, input);
          let variable;
          if (cell.id && cell.id.type === "MutableExpression") {
              const mutableID = input.substring(cell.id.id.start, cell.id.id.end);
              const func = createFunction(refs, body, cell.async, cell.generator, cell.body && cell.body.type === "BlockStatement");
              this._module.define(`initial ${mutableID}`, Object.keys(refs), func);
              this._module.variable().define(id, ["Mutable", `initial ${mutableID}`], (M, _) => new M(_));
              variable = this._module.variable(this).define(mutableID, [id], _ => _.generator);
              id = mutableID;
          }
          else {
              const func = createFunction(refs, body, cell.async, cell.generator, cell.body && cell.body.type === "BlockStatement");
              variable = this._module.variable(this).define(id, Object.keys(refs), func);
          }
          if (cell.id && cell.id.type === "ViewExpression") {
              const viewID = input.substring(cell.id.id.start, cell.id.id.end);
              this._module.variable().define(viewID, ["Generators", id], (G, _) => G.input(_));
          }
          return { id, variable };
      }
      id() {
          return this._id;
      }
      uid() {
          return this._uid;
      }
      pos() {
          if (this._cell.id) {
              return { start: this._cell.id.start, end: this._cell.id.end };
          }
          return { start: this._cell.body.start, end: this._cell.body.start };
      }
      value() {
          if (this._latest) {
              return Promise.resolve(this._latest);
          }
          return this._value
              .catch(error => {
              return {
                  type: "rejected",
                  value: error.message
              };
          });
      }
      latestValue() {
          return this._latest || { type: "pending", value: "" };
      }
  }

  class OJSModule {
      constructor(ojsRuntime, id, module, ojs, folder) {
          this._variableMap = {};
          this._variables = [];
          this._ojsRuntime = ojsRuntime;
          this._id = id;
          this._module = module;
          this._ojs = ojs;
          this._folder = folder;
      }
      variables() {
          return this._variables;
      }
      async fetchUrl(url) {
          return fetch(url).then(r => r.text());
      }
      async importUrl(url) {
          return import(url);
      }
      async importFile(partial) {
          const path = join(this._folder, partial);
          let ojs = await this.fetchUrl(path);
          if (partial.indexOf(".omd") > 1) {
              ojs = omd2ojs(ojs).ojsArr.map(row => row.ojs).join("\n");
          }
          const context = this;
          return {
              default: function define(runtime, observer) {
                  const newModule = runtime.module();
                  const ojsModule = new OJSModule(context._ojsRuntime, partial, newModule, ojs, dirname(path));
                  ojsModule.parse(true);
              }
          };
      }
      async importNotebook(partial) {
          return this.importUrl(`https://api.observablehq.com/${partial[0] === "@" ? partial : `d/${partial}`}.js?v=3`);
      }
      async module(cell, idx) {
          if (cell && cell.body && cell.body.source && cell.body.specifiers) {
              const impMod = [".", "/"].indexOf(cell.body.source.value[0]) === 0 ? await this.importFile(cell.body.source.value) : await this.importNotebook(cell.body.source.value);
              let mod = this._ojsRuntime.module(impMod.default);
              if (cell.body.injections) {
                  mod = mod.derive(cell.body.injections.map(inj => {
                      return { name: inj.imported.name, alias: inj.local.name };
                  }), this._module);
              }
              cell.body.specifiers.forEach(s => {
                  if (s.view) {
                      if (s.imported.name === s.local.name) {
                          this._module.import(`viewof ${s.imported.name}`, mod);
                      }
                      else {
                          this._module.import(`viewof ${s.imported.name}`, `viewof ${s.local.name}`, mod);
                      }
                  }
                  if (s.imported.name === s.local.name) {
                      this._module.import(s.imported.name, mod);
                  }
                  else {
                      this._module.import(s.imported.name, s.local.name, mod);
                  }
              });
          }
      }
      async parse(foreign = false) {
          const retVal = [];
          try {
              const cells = parseModule(this._ojs).cells;
              let idx = 0;
              for (const cell of cells) {
                  switch (cell.body && cell.body.type) {
                      case "ImportDeclaration":
                          await this.module(cell, idx);
                          break;
                      default:
                          const ojsVar = new OJSVariable(this._ojsRuntime, this._module, cell, foreign);
                          const id = ojsVar.id();
                          if (!foreign) {
                              if (id) {
                                  this._variableMap[id] = ojsVar;
                              }
                              this._variables.push(ojsVar);
                          }
                          retVal.push(ojsVar);
                  }
                  ++idx;
              }
          }
          catch (e) {
              const pos = e.pos || 0;
              let raisedAt = e.raisedAt || pos;
              raisedAt += raisedAt === pos ? 1 : 0;
              throw new OJSSyntaxError(pos, raisedAt, e.message);
          }
          return retVal;
      }
  }

  class FakeVariable {
      constructor(_module) {
          this._module = _module;
      }
      define(...args) {
          let id = args.length > 1 ? args[0] : "";
          if (Array.isArray(id)) {
              id = "";
          }
          const xxx = args[args.length - 1].toString();
          const func = args[args.length - 1].toString().split("\n");
          const firstLine = func.shift();
          if (firstLine.indexOf("{return(") >= 0) {
              func.pop();
          }
          this._module._runtime.append(id, func.join("\n"));
      }
  }
  class FakeModule {
      constructor(_runtime, _modID) {
          this._runtime = _runtime;
          this._modID = _modID;
      }
      modString() {
          return ` from "${this._modID}"`;
      }
      builtin(...args) {
      }
      derive(...args) {
          args.pop();
          const context = this;
          return {
              modString() {
                  return ` with { ${args.map(arg => `${arg.name} as ${arg.alias}`).join(",")} } ${context.modString()}`;
              }
          };
      }
      import(...args) {
          const fakeMod = args.pop();
          this._runtime.append("", `import {${args.join(",")}}${fakeMod.modString()}`);
      }
      variable(...args) {
          return new FakeVariable(this);
      }
  }
  class FakeRuntime {
      constructor(rawText) {
          this._definesArr = [];
          this._defines = {};
          this._rawText = "";
          const imports = rawText.match(/import (define\d) from \"\/(.*).js\?v=3\"/g);
          for (const item of imports) {
              const m = item.match(/import (define\d) from \"\/(.*).js\?v=3\"/);
              this._defines[m[1]] = m[2];
              this._definesArr.push(m[2]);
          }
      }
      text() {
          return this._rawText;
      }
      append(id, content) {
          if (content) {
              this._rawText += id ? `${id} = ${content};\n` : `${content};\n`;
          }
      }
      module(def) {
          if (def) {
              return new FakeModule(this, this._definesArr.shift());
          }
          return new FakeModule(this);
      }
      fileAttachments(...args) {
      }
  }

  class OJSRuntimeNotification extends Message {
      constructor(variable, type, value) {
          super();
          this.variable = variable;
          this.type = type;
          this.value = value;
      }
      get canConflate() { return true; }
      conflate(other) {
          if (this.variable === other.variable) {
              this.type = other.type;
              this.value = other.value;
              return true;
          }
          return false;
      }
  }
  class OJSRuntime {
      constructor(container, plugins = {}) {
          this._dispatcher = new Dispatch();
          this._watches = [];
          if (typeof container === "string") {
              this._container = document.querySelector(container);
          }
          else {
              this._container = container;
          }
          const library = new Library();
          library.FileAttachment = function () {
              return FileAttachments(name => {
                  return `${name}`;
              });
          };
          this._runtime = new Runtime(Object.assign(Object.assign({}, library), plugins));
      }
      watch(callback) {
          return this._dispatcher.attach(callback);
      }
      _inspector() {
          if (this._container) {
              return new Inspector(this._container.appendChild(document.createElement("div")));
          }
      }
      module(modDefine) {
          return this._runtime.module(modDefine);
      }
      async parse(id, ojs, folder) {
          this._watches.forEach(w => w.release());
          this._main = new OJSModule(this, id, this._runtime.module(), ojs, folder);
          const retVal = await this._main.parse();
          const variables = this._main.variables();
          this._watches = variables.map(variable => {
              return variable.watch(messages => {
                  messages.filter(m => m.type !== "pending").forEach(m => {
                      this._dispatcher.post(new OJSRuntimeNotification(m.variable, m.type, m.value));
                  });
              });
          });
          return retVal;
      }
      async checkSyntax(id, ojs, folder) {
          try {
              await this.parse(id, ojs, folder);
          }
          catch (e) {
              return [e];
          }
          return [];
      }
      async evaluate(id, ojs, folder) {
          await this.parse(id, ojs, folder);
          return this.refresh();
      }
      variableValue(variable, type, value) {
          return {
              variable,
              type,
              value
          };
      }
      async refresh() {
          const variables = this._main.variables();
          return Promise.all(variables.map(v => v.value())).then(values => {
              return values.map((val, idx) => {
                  const variable = variables[idx];
                  return this.variableValue(variable, val.type, val.value);
              });
          });
      }
      latest() {
          const variables = this._main.variables();
          return variables.map((v) => {
              const { type, value } = v.latestValue();
              return this.variableValue(v, type, value);
          });
      }
      // "https://observablehq.com/@observablehq/a-taste-of-observable"
      async pull(url) {
          url = url.replace("https://", "https://api.") + ".js?v=3";
          const modText = await fetch(url).then(r => r.text());
          const mod = await import(url);
          const frt = new FakeRuntime(modText);
          mod.default(frt, (...args) => { });
          return frt.text();
      }
      push(url, ojs) {
          //  TODO
          return false;
      }
  }

  class OMDRuntime extends OJSRuntime {
      constructor() {
          super(...arguments);
          this._omdIndex = [];
          this._eclIndex = [];
      }
      async parse(id, omd, path, extractECL = false) {
          const { ojsArr, eclArr } = omd2ojs(omd, extractECL);
          this._omdIndex = ojsArr;
          this._eclIndex = eclArr;
          return super.parse(id, this._omdIndex.map(_ => _.ojs).join("\n"), path);
      }
      ecl() {
          return this._eclIndex.map(_ => _.ecl).join("\n");
      }
  }

  /* var css_248z = ":root{--syntax_diff:#24292e;--syntax_diff_bg:#fff;--selection:#d7d4f0;--hr:rgba(0,0,0,0.05);--sans-serif:-apple-system,BlinkMacSystemFont,\"avenir next\",avenir,helvetica,\"helvetica neue\",ubuntu,roboto,noto,\"segoe ui\",arial,sans-serif}h1,h2,h3,h4,h5,h6{color:#333;font-weight:700;line-height:1.15;margin-top:0;margin-bottom:.25em}h2~p,h3~p,h4~p{margin-top:0}a[href]{text-decoration:none}a[href]:hover{text-decoration:underline}h1 code,h2 code,h3 code,h4 code,h5 code,h6 code{font-size:90%}code,pre,tt{font:var(--mono_fonts)}img{max-width:calc(100vw - 28px)}.katex-display,figure,h1,h2,h3,h4,h5,h6,p,table{max-width:640px}blockquote,ol,ul{max-width:600px}blockquote{margin:1em 1.5em}ol,ul{padding-left:28px}hr{height:1px;margin:1em 0;padding:1em 0;border:none;background:no-repeat 50%/100% 1px linear-gradient(90deg,var(--hr),var(--hr))}pre{padding:2px 0}";
  styleInject(css_248z);
 */
  function renderTo(domNode, languageId, ojs, path) {
      const compiler = languageId === "omd" ? new OMDRuntime(domNode) : new OJSRuntime(domNode);
      compiler.evaluate("", ojs, path);
  }

  var xhtml = "http://www.w3.org/1999/xhtml";

  var namespaces$1 = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces$1.hasOwnProperty(prefix) ? {space: namespaces$1[prefix], local: name} : name;
  }

  function creatorInherit(name) {
    return function() {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri === xhtml && document.documentElement.namespaceURI === xhtml
          ? document.createElement(name)
          : document.createElementNS(uri, name);
    };
  }

  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }

  function creator(name) {
    var fullname = namespace(name);
    return (fullname.local
        ? creatorFixed
        : creatorInherit)(fullname);
  }

  function none() {}

  function selector(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  function selection_select(select) {
    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function empty$2() {
    return [];
  }

  function selectorAll(selector) {
    return selector == null ? empty$2 : function() {
      return this.querySelectorAll(selector);
    };
  }

  function selection_selectAll(select) {
    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }

    return new Selection(subgroups, parents);
  }

  function matcher(selector) {
    return function() {
      return this.matches(selector);
    };
  }

  function selection_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function sparse(update) {
    return new Array(update.length);
  }

  function selection_enter() {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }

  function EnterNode(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }

  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
    insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
    querySelector: function(selector) { return this._parent.querySelector(selector); },
    querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
  };

  function constant$1(x) {
    return function() {
      return x;
    };
  }

  var keyPrefix = "$"; // Protect against keys like “__proto__”.

  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0,
        node,
        groupLength = group.length,
        dataLength = data.length;

    // Put any non-null nodes that fit into update.
    // Put any null nodes into enter.
    // Put any remaining data into enter.
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Put any non-null nodes that don’t fit into exit.
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }

  function bindKey(parent, group, enter, update, exit, data, key) {
    var i,
        node,
        nodeByKeyValue = {},
        groupLength = group.length,
        dataLength = data.length,
        keyValues = new Array(groupLength),
        keyValue;

    // Compute the key for each node.
    // If multiple nodes have the same key, the duplicates are added to exit.
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
        if (keyValue in nodeByKeyValue) {
          exit[i] = node;
        } else {
          nodeByKeyValue[keyValue] = node;
        }
      }
    }

    // Compute the key for each datum.
    // If there a node associated with this key, join and add it to update.
    // If there is not (or the key is a duplicate), add it to enter.
    for (i = 0; i < dataLength; ++i) {
      keyValue = keyPrefix + key.call(parent, data[i], i, data);
      if (node = nodeByKeyValue[keyValue]) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue[keyValue] = null;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Add any remaining nodes that were not bound to data to exit.
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
        exit[i] = node;
      }
    }
  }

  function selection_data(value, key) {
    if (!value) {
      data = new Array(this.size()), j = -1;
      this.each(function(d) { data[++j] = d; });
      return data;
    }

    var bind = key ? bindKey : bindIndex,
        parents = this._parents,
        groups = this._groups;

    if (typeof value !== "function") value = constant$1(value);

    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j],
          group = groups[j],
          groupLength = group.length,
          data = value.call(parent, parent && parent.__data__, j, parents),
          dataLength = data.length,
          enterGroup = enter[j] = new Array(dataLength),
          updateGroup = update[j] = new Array(dataLength),
          exitGroup = exit[j] = new Array(groupLength);

      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

      // Now connect the enter nodes to their following update node, such that
      // appendChild can insert the materialized enter node before this node,
      // rather than at the end of the parent node.
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength);
          previous._next = next || null;
        }
      }
    }

    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }

  function selection_exit() {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }

  function selection_join(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
    if (onupdate != null) update = onupdate(update);
    if (onexit == null) exit.remove(); else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  function selection_merge(selection) {

    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Selection(merges, this._parents);
  }

  function selection_order() {

    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort(compare) {
    if (!compare) compare = ascending;

    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }

    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }

    return new Selection(sortgroups, this._parents).order();
  }

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes() {
    var nodes = new Array(this.size()), i = -1;
    this.each(function() { nodes[++i] = this; });
    return nodes;
  }

  function selection_node() {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size() {
    var size = 0;
    this.each(function() { ++size; });
    return size;
  }

  function selection_empty() {
    return !this.node();
  }

  function selection_each(callback) {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }

  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }

  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }

  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }

  function selection_attr(name, value) {
    var fullname = namespace(name);

    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local
          ? node.getAttributeNS(fullname.space, fullname.local)
          : node.getAttribute(fullname);
    }

    return this.each((value == null
        ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
        ? (fullname.local ? attrFunctionNS : attrFunction)
        : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
  }

  function defaultView(node) {
    return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
        || (node.document && node) // node is a Window
        || node.defaultView; // node is a Document
  }

  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }

  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }

  function selection_style(name, value, priority) {
    return arguments.length > 1
        ? this.each((value == null
              ? styleRemove : typeof value === "function"
              ? styleFunction
              : styleConstant)(name, value, priority == null ? "" : priority))
        : styleValue(this.node(), name);
  }

  function styleValue(node, name) {
    return node.style.getPropertyValue(name)
        || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }

  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }

  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }

  function selection_property(name, value) {
    return arguments.length > 1
        ? this.each((value == null
            ? propertyRemove : typeof value === "function"
            ? propertyFunction
            : propertyConstant)(name, value))
        : this.node()[name];
  }

  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }

  function classList(node) {
    return node.classList || new ClassList(node);
  }

  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }

  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };

  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }

  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }

  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }

  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }

  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }

  function selection_classed(name, value) {
    var names = classArray(name + "");

    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }

    return this.each((typeof value === "function"
        ? classedFunction : value
        ? classedTrue
        : classedFalse)(names, value));
  }

  function textRemove() {
    this.textContent = "";
  }

  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }

  function selection_text(value) {
    return arguments.length
        ? this.each(value == null
            ? textRemove : (typeof value === "function"
            ? textFunction
            : textConstant)(value))
        : this.node().textContent;
  }

  function htmlRemove() {
    this.innerHTML = "";
  }

  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }

  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }

  function selection_html(value) {
    return arguments.length
        ? this.each(value == null
            ? htmlRemove : (typeof value === "function"
            ? htmlFunction
            : htmlConstant)(value))
        : this.node().innerHTML;
  }

  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise() {
    return this.each(raise);
  }

  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower() {
    return this.each(lower);
  }

  function selection_append(name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull() {
    return null;
  }

  function selection_insert(name, before) {
    var create = typeof name === "function" ? name : creator(name),
        select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove() {
    return this.each(remove);
  }

  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_clone(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  function selection_datum(value) {
    return arguments.length
        ? this.property("__data__", value)
        : this.node().__data__;
  }

  var filterEvents = {};

  var event = null;

  if (typeof document !== "undefined") {
    var element$2 = document.documentElement;
    if (!("onmouseenter" in element$2)) {
      filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
    }
  }

  function filterContextListener(listener, index, group) {
    listener = contextListener(listener, index, group);
    return function(event) {
      var related = event.relatedTarget;
      if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
        listener.call(this, event);
      }
    };
  }

  function contextListener(listener, index, group) {
    return function(event1) {
      var event0 = event; // Events can be reentrant (e.g., focus).
      event = event1;
      try {
        listener.call(this, this.__data__, index, group);
      } finally {
        event = event0;
      }
    };
  }

  function parseTypenames(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return {type: t, name: name};
    });
  }

  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }

  function onAdd(typename, value, capture) {
    var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
    return function(d, i, group) {
      var on = this.__on, o, listener = wrap(value, i, group);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
          this.addEventListener(o.type, o.listener = listener, o.capture = capture);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, capture);
      o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }

  function selection_on(typename, value, capture) {
    var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }

    on = value ? onAdd : onRemove;
    if (capture == null) capture = false;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
    return this;
  }

  function dispatchEvent(node, type, params) {
    var window = defaultView(node),
        event = window.CustomEvent;

    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }

  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }

  function selection_dispatch(type, params) {
    return this.each((typeof params === "function"
        ? dispatchFunction
        : dispatchConstant)(type, params));
  }

  var root$1 = [null];

  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }

  function selection() {
    return new Selection([[document.documentElement]], root$1);
  }

  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: selection_select,
    selectAll: selection_selectAll,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    join: selection_join,
    merge: selection_merge,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    classed: selection_classed,
    text: selection_text,
    html: selection_html,
    raise: selection_raise,
    lower: selection_lower,
    append: selection_append,
    insert: selection_insert,
    remove: selection_remove,
    clone: selection_clone,
    datum: selection_datum,
    on: selection_on,
    dispatch: selection_dispatch
  };

  function select$1(selector) {
    return typeof selector === "string"
        ? new Selection([[document.querySelector(selector)]], [document.documentElement])
        : new Selection([[selector]], root$1);
  }

  var noop$1 = {value: function() {}};

  function dispatch$1() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch$1(_);
  }

  function Dispatch$1(_) {
    this._ = _;
  }

  function parseTypenames$1(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return {type: t, name: name};
    });
  }

  Dispatch$1.prototype = dispatch$1.prototype = {
    constructor: Dispatch$1,
    on: function(typename, callback) {
      var _ = this._,
          T = parseTypenames$1(typename + "", _),
          t,
          i = -1,
          n = T.length;

      // If no callback was specified, return the callback of the given type and name.
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }

      // If a type was specified, set the callback for the given type and name.
      // Otherwise, if a null callback was specified, remove callbacks of the given name.
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }

      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch$1(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };

  function get(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }

  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop$1, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({name: name, value: callback});
    return type;
  }

  var frame$1 = 0, // is an animation frame pending?
      timeout$1 = 0, // is a timeout pending?
      interval = 0, // are any timers active?
      pokeDelay = 1000, // how frequently we check for clock skew
      taskHead,
      taskTail,
      clockLast = 0,
      clockNow = 0,
      clockSkew = 0,
      clock = typeof performance === "object" && performance.now ? performance : Date,
      setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

  function now$1() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }

  function clearNow() {
    clockNow = 0;
  }

  function Timer() {
    this._call =
    this._time =
    this._next = null;
  }

  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now$1() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;
        else taskHead = this;
        taskTail = this;
      }
      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };

  function timer(callback, delay, time) {
    var t = new Timer;
    t.restart(callback, delay, time);
    return t;
  }

  function timerFlush() {
    now$1(); // Get the current time, if not already set.
    ++frame$1; // Pretend we’ve set an alarm, if we haven’t already.
    var t = taskHead, e;
    while (t) {
      if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
      t = t._next;
    }
    --frame$1;
  }

  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame$1 = timeout$1 = 0;
    try {
      timerFlush();
    } finally {
      frame$1 = 0;
      nap();
      clockNow = 0;
    }
  }

  function poke() {
    var now = clock.now(), delay = now - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
  }

  function nap() {
    var t0, t1 = taskHead, t2, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }
    taskTail = t0;
    sleep(time);
  }

  function sleep(time) {
    if (frame$1) return; // Soonest alarm already set, or will be.
    if (timeout$1) timeout$1 = clearTimeout(timeout$1);
    var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
    if (delay > 24) {
      if (time < Infinity) timeout$1 = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval) interval = clearInterval(interval);
    } else {
      if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame$1 = 1, setFrame(wake);
    }
  }

  function timeout$2(callback, delay, time) {
    var t = new Timer;
    delay = delay == null ? 0 : +delay;
    t.restart(function(elapsed) {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  var emptyOn = dispatch$1("start", "end", "cancel", "interrupt");
  var emptyTween = [];

  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;

  function schedule(node, name, id, index, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};
    else if (id in schedules) return;
    create(node, id, {
      name: name,
      index: index, // For context during callback.
      group: group, // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }

  function init(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }

  function set$1(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }

  function get$1(node, id) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
    return schedule;
  }

  function create(node, id, self) {
    var schedules = node.__transition,
        tween;

    // Initialize the self timer when the transition is created.
    // Note the actual delay is not known until the first callback!
    schedules[id] = self;
    self.timer = timer(schedule, 0, self.time);

    function schedule(elapsed) {
      self.state = SCHEDULED;
      self.timer.restart(start, self.delay, self.time);

      // If the elapsed delay is less than our first sleep, start immediately.
      if (self.delay <= elapsed) start(elapsed - self.delay);
    }

    function start(elapsed) {
      var i, j, n, o;

      // If the state is not SCHEDULED, then we previously errored on start.
      if (self.state !== SCHEDULED) return stop();

      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self.name) continue;

        // While this element already has a starting transition during this frame,
        // defer starting an interrupting transition until that transition has a
        // chance to tick (and possibly end); see d3/d3-transition#54!
        if (o.state === STARTED) return timeout$2(start);

        // Interrupt the active transition, if any.
        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }

        // Cancel any pre-empted transitions.
        else if (+i < id) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("cancel", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }
      }

      // Defer the first tick to end of the current frame; see d3/d3#1576.
      // Note the transition may be canceled after start and before the first tick!
      // Note this must be scheduled before the start event; see d3/d3-transition#16!
      // Assuming this is successful, subsequent callbacks go straight to tick.
      timeout$2(function() {
        if (self.state === STARTED) {
          self.state = RUNNING;
          self.timer.restart(tick, self.delay, self.time);
          tick(elapsed);
        }
      });

      // Dispatch the start event.
      // Note this must be done before the tween are initialized.
      self.state = STARTING;
      self.on.call("start", node, node.__data__, self.index, self.group);
      if (self.state !== STARTING) return; // interrupted
      self.state = STARTED;

      // Initialize the tween, deleting null tween.
      tween = new Array(n = self.tween.length);
      for (i = 0, j = -1; i < n; ++i) {
        if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
          tween[++j] = o;
        }
      }
      tween.length = j + 1;
    }

    function tick(elapsed) {
      var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
          i = -1,
          n = tween.length;

      while (++i < n) {
        tween[i].call(node, t);
      }

      // Dispatch the end event.
      if (self.state === ENDING) {
        self.on.call("end", node, node.__data__, self.index, self.group);
        stop();
      }
    }

    function stop() {
      self.state = ENDED;
      self.timer.stop();
      delete schedules[id];
      for (var i in schedules) return; // eslint-disable-line no-unused-vars
      delete node.__transition;
    }
  }

  function interrupt(node, name) {
    var schedules = node.__transition,
        schedule,
        active,
        empty = true,
        i;

    if (!schedules) return;

    name = name == null ? null : name + "";

    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }

    if (empty) delete node.__transition;
  }

  function selection_interrupt(name) {
    return this.each(function() {
      interrupt(this, name);
    });
  }

  function define$1(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }

  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  function Color() {}

  var darker = 0.7;
  var brighter = 1 / darker;

  var reI = "\\s*([+-]?\\d+)\\s*",
      reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
      reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
      reHex = /^#([0-9a-f]{3,8})$/,
      reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
      reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
      reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
      reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
      reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
      reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

  var named = {
    aliceblue: 0xf0f8ff,
    antiquewhite: 0xfaebd7,
    aqua: 0x00ffff,
    aquamarine: 0x7fffd4,
    azure: 0xf0ffff,
    beige: 0xf5f5dc,
    bisque: 0xffe4c4,
    black: 0x000000,
    blanchedalmond: 0xffebcd,
    blue: 0x0000ff,
    blueviolet: 0x8a2be2,
    brown: 0xa52a2a,
    burlywood: 0xdeb887,
    cadetblue: 0x5f9ea0,
    chartreuse: 0x7fff00,
    chocolate: 0xd2691e,
    coral: 0xff7f50,
    cornflowerblue: 0x6495ed,
    cornsilk: 0xfff8dc,
    crimson: 0xdc143c,
    cyan: 0x00ffff,
    darkblue: 0x00008b,
    darkcyan: 0x008b8b,
    darkgoldenrod: 0xb8860b,
    darkgray: 0xa9a9a9,
    darkgreen: 0x006400,
    darkgrey: 0xa9a9a9,
    darkkhaki: 0xbdb76b,
    darkmagenta: 0x8b008b,
    darkolivegreen: 0x556b2f,
    darkorange: 0xff8c00,
    darkorchid: 0x9932cc,
    darkred: 0x8b0000,
    darksalmon: 0xe9967a,
    darkseagreen: 0x8fbc8f,
    darkslateblue: 0x483d8b,
    darkslategray: 0x2f4f4f,
    darkslategrey: 0x2f4f4f,
    darkturquoise: 0x00ced1,
    darkviolet: 0x9400d3,
    deeppink: 0xff1493,
    deepskyblue: 0x00bfff,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1e90ff,
    firebrick: 0xb22222,
    floralwhite: 0xfffaf0,
    forestgreen: 0x228b22,
    fuchsia: 0xff00ff,
    gainsboro: 0xdcdcdc,
    ghostwhite: 0xf8f8ff,
    gold: 0xffd700,
    goldenrod: 0xdaa520,
    gray: 0x808080,
    green: 0x008000,
    greenyellow: 0xadff2f,
    grey: 0x808080,
    honeydew: 0xf0fff0,
    hotpink: 0xff69b4,
    indianred: 0xcd5c5c,
    indigo: 0x4b0082,
    ivory: 0xfffff0,
    khaki: 0xf0e68c,
    lavender: 0xe6e6fa,
    lavenderblush: 0xfff0f5,
    lawngreen: 0x7cfc00,
    lemonchiffon: 0xfffacd,
    lightblue: 0xadd8e6,
    lightcoral: 0xf08080,
    lightcyan: 0xe0ffff,
    lightgoldenrodyellow: 0xfafad2,
    lightgray: 0xd3d3d3,
    lightgreen: 0x90ee90,
    lightgrey: 0xd3d3d3,
    lightpink: 0xffb6c1,
    lightsalmon: 0xffa07a,
    lightseagreen: 0x20b2aa,
    lightskyblue: 0x87cefa,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xb0c4de,
    lightyellow: 0xffffe0,
    lime: 0x00ff00,
    limegreen: 0x32cd32,
    linen: 0xfaf0e6,
    magenta: 0xff00ff,
    maroon: 0x800000,
    mediumaquamarine: 0x66cdaa,
    mediumblue: 0x0000cd,
    mediumorchid: 0xba55d3,
    mediumpurple: 0x9370db,
    mediumseagreen: 0x3cb371,
    mediumslateblue: 0x7b68ee,
    mediumspringgreen: 0x00fa9a,
    mediumturquoise: 0x48d1cc,
    mediumvioletred: 0xc71585,
    midnightblue: 0x191970,
    mintcream: 0xf5fffa,
    mistyrose: 0xffe4e1,
    moccasin: 0xffe4b5,
    navajowhite: 0xffdead,
    navy: 0x000080,
    oldlace: 0xfdf5e6,
    olive: 0x808000,
    olivedrab: 0x6b8e23,
    orange: 0xffa500,
    orangered: 0xff4500,
    orchid: 0xda70d6,
    palegoldenrod: 0xeee8aa,
    palegreen: 0x98fb98,
    paleturquoise: 0xafeeee,
    palevioletred: 0xdb7093,
    papayawhip: 0xffefd5,
    peachpuff: 0xffdab9,
    peru: 0xcd853f,
    pink: 0xffc0cb,
    plum: 0xdda0dd,
    powderblue: 0xb0e0e6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xff0000,
    rosybrown: 0xbc8f8f,
    royalblue: 0x4169e1,
    saddlebrown: 0x8b4513,
    salmon: 0xfa8072,
    sandybrown: 0xf4a460,
    seagreen: 0x2e8b57,
    seashell: 0xfff5ee,
    sienna: 0xa0522d,
    silver: 0xc0c0c0,
    skyblue: 0x87ceeb,
    slateblue: 0x6a5acd,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xfffafa,
    springgreen: 0x00ff7f,
    steelblue: 0x4682b4,
    tan: 0xd2b48c,
    teal: 0x008080,
    thistle: 0xd8bfd8,
    tomato: 0xff6347,
    turquoise: 0x40e0d0,
    violet: 0xee82ee,
    wheat: 0xf5deb3,
    white: 0xffffff,
    whitesmoke: 0xf5f5f5,
    yellow: 0xffff00,
    yellowgreen: 0x9acd32
  };

  define$1(Color, color, {
    copy: function(channels) {
      return Object.assign(new this.constructor, this, channels);
    },
    displayable: function() {
      return this.rgb().displayable();
    },
    hex: color_formatHex, // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });

  function color_formatHex() {
    return this.rgb().formatHex();
  }

  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }

  function color_formatRgb() {
    return this.rgb().formatRgb();
  }

  function color(format) {
    var m, l;
    format = (format + "").trim().toLowerCase();
    return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
        : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
        : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
        : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
        : null) // invalid hex
        : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
        : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
        : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
        : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
        : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
        : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
        : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
        : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
        : null;
  }

  function rgbn(n) {
    return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
  }

  function rgba(r, g, b, a) {
    if (a <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }

  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb;
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }

  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }

  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }

  define$1(Rgb, rgb, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb: function() {
      return this;
    },
    displayable: function() {
      return (-0.5 <= this.r && this.r < 255.5)
          && (-0.5 <= this.g && this.g < 255.5)
          && (-0.5 <= this.b && this.b < 255.5)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex, // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));

  function rgb_formatHex() {
    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
  }

  function rgb_formatRgb() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "rgb(" : "rgba(")
        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
        + (a === 1 ? ")" : ", " + a + ")");
  }

  function hex(value) {
    value = Math.max(0, Math.min(255, Math.round(value) || 0));
    return (value < 16 ? "0" : "") + value.toString(16);
  }

  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }

  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl;
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        min = Math.min(r, g, b),
        max = Math.max(r, g, b),
        h = NaN,
        s = max - min,
        l = (max + min) / 2;
    if (s) {
      if (r === max) h = (g - b) / s + (g < b) * 6;
      else if (g === max) h = (b - r) / s + 2;
      else h = (r - g) / s + 4;
      s /= l < 0.5 ? max + min : 2 - max - min;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }

  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }

  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define$1(Hsl, hsl, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function() {
      var h = this.h % 360 + (this.h < 0) * 360,
          s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
          l = this.l,
          m2 = l + (l < 0.5 ? l : 1 - l) * s,
          m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    displayable: function() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s))
          && (0 <= this.l && this.l <= 1)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl: function() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "hsl(" : "hsla(")
          + (this.h || 0) + ", "
          + (this.s || 0) * 100 + "%, "
          + (this.l || 0) * 100 + "%"
          + (a === 1 ? ")" : ", " + a + ")");
    }
  }));

  /* From FvD 13.37, CSS Color Module Level 3 */
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60
        : h < 180 ? m2
        : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
        : m1) * 255;
  }

  function constant$2(x) {
    return function() {
      return x;
    };
  }

  function linear(a, d) {
    return function(t) {
      return a + t * d;
    };
  }

  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
      return Math.pow(a + t * b, y);
    };
  }

  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y) : constant$2(isNaN(a) ? b : a);
    };
  }

  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant$2(isNaN(a) ? b : a);
  }

  var interpolateRgb = (function rgbGamma(y) {
    var color = gamma(y);

    function rgb$1(start, end) {
      var r = color((start = rgb(start)).r, (end = rgb(end)).r),
          g = color(start.g, end.g),
          b = color(start.b, end.b),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.r = r(t);
        start.g = g(t);
        start.b = b(t);
        start.opacity = opacity(t);
        return start + "";
      };
    }

    rgb$1.gamma = rgbGamma;

    return rgb$1;
  })(1);

  function reinterpolate(a, b) {
    return a = +a, b = +b, function(t) {
      return a * (1 - t) + b * t;
    };
  }

  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
      reB = new RegExp(reA.source, "g");

  function zero(b) {
    return function() {
      return b;
    };
  }

  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }

  function interpolateString(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
        am, // current match in a
        bm, // current match in b
        bs, // string preceding current number in b, if any
        i = -1, // index in s
        s = [], // string constants and placeholders
        q = []; // number interpolators

    // Coerce inputs to strings.
    a = a + "", b = b + "";

    // Interpolate pairs of numbers in a & b.
    while ((am = reA.exec(a))
        && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) { // a string precedes the next number in b
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
        if (s[i]) s[i] += bm; // coalesce with previous string
        else s[++i] = bm;
      } else { // interpolate non-matching numbers
        s[++i] = null;
        q.push({i: i, x: reinterpolate(am, bm)});
      }
      bi = reB.lastIndex;
    }

    // Add remains of b.
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }

    // Special optimization for only a single match.
    // Otherwise, interpolate each of the numbers and rejoin the string.
    return s.length < 2 ? (q[0]
        ? one(q[0].x)
        : zero(b))
        : (b = q.length, function(t) {
            for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
            return s.join("");
          });
  }

  var degrees = 180 / Math.PI;

  var identity$1 = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };

  function decompose(a, b, c, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
    if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX: scaleX,
      scaleY: scaleY
    };
  }

  var cssNode,
      cssRoot,
      cssView,
      svgNode;

  function parseCss(value) {
    if (value === "none") return identity$1;
    if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
    cssNode.style.transform = value;
    value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
    cssRoot.removeChild(cssNode);
    value = value.slice(7, -1).split(",");
    return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
  }

  function parseSvg(value) {
    if (value == null) return identity$1;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity$1;
    value = value.matrix;
    return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  function interpolateTransform(parse, pxComma, pxParen, degParen) {

    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }

    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({i: i - 4, x: reinterpolate(xa, xb)}, {i: i - 2, x: reinterpolate(ya, yb)});
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }

    function rotate(a, b, s, q) {
      if (a !== b) {
        if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
        q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: reinterpolate(a, b)});
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }

    function skewX(a, b, s, q) {
      if (a !== b) {
        q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: reinterpolate(a, b)});
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }

    function scale(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({i: i - 4, x: reinterpolate(xa, xb)}, {i: i - 2, x: reinterpolate(ya, yb)});
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }

    return function(a, b) {
      var s = [], // string constants and placeholders
          q = []; // number interpolators
      a = parse(a), b = parse(b);
      translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
      rotate(a.rotate, b.rotate, s, q);
      skewX(a.skewX, b.skewX, s, q);
      scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
      a = b = null; // gc
      return function(t) {
        var i = -1, n = q.length, o;
        while (++i < n) s[(o = q[i]).i] = o.x(t);
        return s.join("");
      };
    };
  }

  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  function tweenRemove(id, name) {
    var tween0, tween1;
    return function() {
      var schedule = set$1(this, id),
          tween = schedule.tween;

      // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }

      schedule.tween = tween1;
    };
  }

  function tweenFunction(id, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error;
    return function() {
      var schedule = set$1(this, id),
          tween = schedule.tween;

      // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1[i] = t;
            break;
          }
        }
        if (i === n) tween1.push(t);
      }

      schedule.tween = tween1;
    };
  }

  function transition_tween(name, value) {
    var id = this._id;

    name += "";

    if (arguments.length < 2) {
      var tween = get$1(this.node(), id).tween;
      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name) {
          return t.value;
        }
      }
      return null;
    }

    return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
  }

  function tweenValue(transition, name, value) {
    var id = transition._id;

    transition.each(function() {
      var schedule = set$1(this, id);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });

    return function(node) {
      return get$1(node, id).value[name];
    };
  }

  function interpolate(a, b) {
    var c;
    return (typeof b === "number" ? reinterpolate
        : b instanceof color ? interpolateRgb
        : (c = color(b)) ? (b = c, interpolateRgb)
        : interpolateString)(a, b);
  }

  function attrRemove$1(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS$1(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrConstantNS$1(fullname, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrFunction$1(name, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function attrFunctionNS$1(fullname, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function transition_attr(name, value) {
    var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
    return this.attrTween(name, typeof value === "function"
        ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value))
        : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
        : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value));
  }

  function attrInterpolate(name, i) {
    return function(t) {
      this.setAttribute(name, i.call(this, t));
    };
  }

  function attrInterpolateNS(fullname, i) {
    return function(t) {
      this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
    };
  }

  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function attrTween(name, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function transition_attrTween(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    var fullname = namespace(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  function delayFunction(id, value) {
    return function() {
      init(this, id).delay = +value.apply(this, arguments);
    };
  }

  function delayConstant(id, value) {
    return value = +value, function() {
      init(this, id).delay = value;
    };
  }

  function transition_delay(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? delayFunction
            : delayConstant)(id, value))
        : get$1(this.node(), id).delay;
  }

  function durationFunction(id, value) {
    return function() {
      set$1(this, id).duration = +value.apply(this, arguments);
    };
  }

  function durationConstant(id, value) {
    return value = +value, function() {
      set$1(this, id).duration = value;
    };
  }

  function transition_duration(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? durationFunction
            : durationConstant)(id, value))
        : get$1(this.node(), id).duration;
  }

  function easeConstant(id, value) {
    if (typeof value !== "function") throw new Error;
    return function() {
      set$1(this, id).ease = value;
    };
  }

  function transition_ease(value) {
    var id = this._id;

    return arguments.length
        ? this.each(easeConstant(id, value))
        : get$1(this.node(), id).ease;
  }

  function transition_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  function transition_merge(transition) {
    if (transition._id !== this._id) throw new Error;

    for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Transition(merges, this._parents, this._name, this._id);
  }

  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function(t) {
      var i = t.indexOf(".");
      if (i >= 0) t = t.slice(0, i);
      return !t || t === "start";
    });
  }

  function onFunction(id, name, listener) {
    var on0, on1, sit = start(name) ? init : set$1;
    return function() {
      var schedule = sit(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

      schedule.on = on1;
    };
  }

  function transition_on(name, listener) {
    var id = this._id;

    return arguments.length < 2
        ? get$1(this.node(), id).on.on(name)
        : this.each(onFunction(id, name, listener));
  }

  function removeFunction(id) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition) if (+i !== id) return;
      if (parent) parent.removeChild(this);
    };
  }

  function transition_remove() {
    return this.on("end.remove", removeFunction(this._id));
  }

  function transition_select(select) {
    var name = this._name,
        id = this._id;

    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule(subgroup[i], name, id, i, subgroup, get$1(node, id));
        }
      }
    }

    return new Transition(subgroups, this._parents, name, id);
  }

  function transition_selectAll(select) {
    var name = this._name,
        id = this._id;

    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children = select.call(node, node.__data__, i, group), child, inherit = get$1(node, id), k = 0, l = children.length; k < l; ++k) {
            if (child = children[k]) {
              schedule(child, name, id, k, children, inherit);
            }
          }
          subgroups.push(children);
          parents.push(node);
        }
      }
    }

    return new Transition(subgroups, parents, name, id);
  }

  var Selection$1 = selection.prototype.constructor;

  function transition_selection() {
    return new Selection$1(this._groups, this._parents);
  }

  function styleNull(name, interpolate) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0 = styleValue(this, name),
          string1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }

  function styleRemove$1(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = styleValue(this, name);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function styleFunction$1(name, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0 = styleValue(this, name),
          value1 = value(this),
          string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function styleMaybeRemove(id, name) {
    var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
    return function() {
      var schedule = set$1(this, id),
          on = schedule.on,
          listener = schedule.value[key] == null ? remove || (remove = styleRemove$1(name)) : undefined;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

      schedule.on = on1;
    };
  }

  function transition_style(name, value, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
    return value == null ? this
        .styleTween(name, styleNull(name, i))
        .on("end.style." + name, styleRemove$1(name))
      : typeof value === "function" ? this
        .styleTween(name, styleFunction$1(name, i, tweenValue(this, "style." + name, value)))
        .each(styleMaybeRemove(this._id, name))
      : this
        .styleTween(name, styleConstant$1(name, i, value), priority)
        .on("end.style." + name, null);
  }

  function styleInterpolate(name, i, priority) {
    return function(t) {
      this.style.setProperty(name, i.call(this, t), priority);
    };
  }

  function styleTween(name, value, priority) {
    var t, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
      return t;
    }
    tween._value = value;
    return tween;
  }

  function transition_styleTween(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  function textConstant$1(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction$1(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }

  function transition_text(value) {
    return this.tween("text", typeof value === "function"
        ? textFunction$1(tweenValue(this, "text", value))
        : textConstant$1(value == null ? "" : value + ""));
  }

  function textInterpolate(i) {
    return function(t) {
      this.textContent = i.call(this, t);
    };
  }

  function textTween(value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function transition_textTween(value) {
    var key = "text";
    if (arguments.length < 1) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    return this.tween(key, textTween(value));
  }

  function transition_transition() {
    var name = this._name,
        id0 = this._id,
        id1 = newId();

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit = get$1(node, id0);
          schedule(node, name, id1, i, group, {
            time: inherit.time + inherit.delay + inherit.duration,
            delay: 0,
            duration: inherit.duration,
            ease: inherit.ease
          });
        }
      }
    }

    return new Transition(groups, this._parents, name, id1);
  }

  function transition_end() {
    var on0, on1, that = this, id = that._id, size = that.size();
    return new Promise(function(resolve, reject) {
      var cancel = {value: reject},
          end = {value: function() { if (--size === 0) resolve(); }};

      that.each(function() {
        var schedule = set$1(this, id),
            on = schedule.on;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }

        schedule.on = on1;
      });
    });
  }

  var id = 0;

  function Transition(groups, parents, name, id) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id;
  }

  function transition(name) {
    return selection().transition(name);
  }

  function newId() {
    return ++id;
  }

  var selection_prototype = selection.prototype;

  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: transition_select,
    selectAll: transition_selectAll,
    filter: transition_filter,
    merge: transition_merge,
    selection: transition_selection,
    transition: transition_transition,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: transition_on,
    attr: transition_attr,
    attrTween: transition_attrTween,
    style: transition_style,
    styleTween: transition_styleTween,
    text: transition_text,
    textTween: transition_textTween,
    remove: transition_remove,
    tween: transition_tween,
    delay: transition_delay,
    duration: transition_duration,
    ease: transition_ease,
    end: transition_end
  };

  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  var defaultTiming = {
    time: null, // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };

  function inherit(node, id) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id])) {
      if (!(node = node.parentNode)) {
        return defaultTiming.time = now$1(), defaultTiming;
      }
    }
    return timing;
  }

  function selection_transition(name) {
    var id,
        timing;

    if (name instanceof Transition) {
      id = name._id, name = name._name;
    } else {
      id = newId(), (timing = defaultTiming).time = now$1(), name = name == null ? null : name + "";
    }

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule(node, name, id, i, group, timing || inherit(node, id));
        }
      }
    }

    return new Transition(groups, this._parents, name, id);
  }

  selection.prototype.interrupt = selection_interrupt;
  selection.prototype.transition = selection_transition;

  function ascending$1(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function number(x) {
    return x === null ? NaN : +x;
  }

  function d3Variance(values, valueof) {
    var n = values.length,
        m = 0,
        i = -1,
        mean = 0,
        value,
        delta,
        sum = 0;

    if (valueof == null) {
      while (++i < n) {
        if (!isNaN(value = number(values[i]))) {
          delta = value - mean;
          mean += delta / ++m;
          sum += delta * (value - mean);
        }
      }
    }

    else {
      while (++i < n) {
        if (!isNaN(value = number(valueof(values[i], i, values)))) {
          delta = value - mean;
          mean += delta / ++m;
          sum += delta * (value - mean);
        }
      }
    }

    if (m > 1) return sum / (m - 1);
  }

  function d3Deviation(array, f) {
    var v = d3Variance(array, f);
    return v ? Math.sqrt(v) : v;
  }

  function threshold(values, p, valueof) {
    if (valueof == null) valueof = number;
    if (!(n = values.length)) return;
    if ((p = +p) <= 0 || n < 2) return +valueof(values[0], 0, values);
    if (p >= 1) return +valueof(values[n - 1], n - 1, values);
    var n,
        i = (n - 1) * p,
        i0 = Math.floor(i),
        value0 = +valueof(values[i0], i0, values),
        value1 = +valueof(values[i0 + 1], i0 + 1, values);
    return value0 + (value1 - value0) * (i - i0);
  }

  function d3Max(values, valueof) {
    var n = values.length,
        i = -1,
        value,
        max;

    if (valueof == null) {
      while (++i < n) { // Find the first comparable value.
        if ((value = values[i]) != null && value >= value) {
          max = value;
          while (++i < n) { // Compare the remaining values.
            if ((value = values[i]) != null && value > max) {
              max = value;
            }
          }
        }
      }
    }

    else {
      while (++i < n) { // Find the first comparable value.
        if ((value = valueof(values[i], i, values)) != null && value >= value) {
          max = value;
          while (++i < n) { // Compare the remaining values.
            if ((value = valueof(values[i], i, values)) != null && value > max) {
              max = value;
            }
          }
        }
      }
    }

    return max;
  }

  function d3Mean(values, valueof) {
    var n = values.length,
        m = n,
        i = -1,
        value,
        sum = 0;

    if (valueof == null) {
      while (++i < n) {
        if (!isNaN(value = number(values[i]))) sum += value;
        else --m;
      }
    }

    else {
      while (++i < n) {
        if (!isNaN(value = number(valueof(values[i], i, values)))) sum += value;
        else --m;
      }
    }

    if (m) return sum / m;
  }

  function d3Median(values, valueof) {
    var n = values.length,
        i = -1,
        value,
        numbers = [];

    if (valueof == null) {
      while (++i < n) {
        if (!isNaN(value = number(values[i]))) {
          numbers.push(value);
        }
      }
    }

    else {
      while (++i < n) {
        if (!isNaN(value = number(valueof(values[i], i, values)))) {
          numbers.push(value);
        }
      }
    }

    return threshold(numbers.sort(ascending$1), 0.5);
  }

  function d3Min(values, valueof) {
    var n = values.length,
        i = -1,
        value,
        min;

    if (valueof == null) {
      while (++i < n) { // Find the first comparable value.
        if ((value = values[i]) != null && value >= value) {
          min = value;
          while (++i < n) { // Compare the remaining values.
            if ((value = values[i]) != null && min > value) {
              min = value;
            }
          }
        }
      }
    }

    else {
      while (++i < n) { // Find the first comparable value.
        if ((value = valueof(values[i], i, values)) != null && value >= value) {
          min = value;
          while (++i < n) { // Compare the remaining values.
            if ((value = valueof(values[i], i, values)) != null && min > value) {
              min = value;
            }
          }
        }
      }
    }

    return min;
  }

  function d3Sum(values, valueof) {
    var n = values.length,
        i = -1,
        value,
        sum = 0;

    if (valueof == null) {
      while (++i < n) {
        if (value = +values[i]) sum += value; // Note: zero and null are equivalent.
      }
    }

    else {
      while (++i < n) {
        if (value = +valueof(values[i], i, values)) sum += value;
      }
    }

    return sum;
  }

  var prefix = "$";

  function Map$1() {}

  Map$1.prototype = map$3.prototype = {
    constructor: Map$1,
    has: function(key) {
      return (prefix + key) in this;
    },
    get: function(key) {
      return this[prefix + key];
    },
    set: function(key, value) {
      this[prefix + key] = value;
      return this;
    },
    remove: function(key) {
      var property = prefix + key;
      return property in this && delete this[property];
    },
    clear: function() {
      for (var property in this) if (property[0] === prefix) delete this[property];
    },
    keys: function() {
      var keys = [];
      for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
      return keys;
    },
    values: function() {
      var values = [];
      for (var property in this) if (property[0] === prefix) values.push(this[property]);
      return values;
    },
    entries: function() {
      var entries = [];
      for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
      return entries;
    },
    size: function() {
      var size = 0;
      for (var property in this) if (property[0] === prefix) ++size;
      return size;
    },
    empty: function() {
      for (var property in this) if (property[0] === prefix) return false;
      return true;
    },
    each: function(f) {
      for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
    }
  };

  function map$3(object, f) {
    var map = new Map$1;

    // Copy constructor.
    if (object instanceof Map$1) object.each(function(value, key) { map.set(key, value); });

    // Index array by numeric index or specified key function.
    else if (Array.isArray(object)) {
      var i = -1,
          n = object.length,
          o;

      if (f == null) while (++i < n) map.set(i, object[i]);
      else while (++i < n) map.set(f(o = object[i], i, object), o);
    }

    // Convert object to map.
    else if (object) for (var key in object) map.set(key, object[key]);

    return map;
  }

  function d3Nest() {
    var keys = [],
        sortKeys = [],
        sortValues,
        rollup,
        nest;

    function apply(array, depth, createResult, setResult) {
      if (depth >= keys.length) {
        if (sortValues != null) array.sort(sortValues);
        return rollup != null ? rollup(array) : array;
      }

      var i = -1,
          n = array.length,
          key = keys[depth++],
          keyValue,
          value,
          valuesByKey = map$3(),
          values,
          result = createResult();

      while (++i < n) {
        if (values = valuesByKey.get(keyValue = key(value = array[i]) + "")) {
          values.push(value);
        } else {
          valuesByKey.set(keyValue, [value]);
        }
      }

      valuesByKey.each(function(values, key) {
        setResult(result, key, apply(values, depth, createResult, setResult));
      });

      return result;
    }

    function entries(map, depth) {
      if (++depth > keys.length) return map;
      var array, sortKey = sortKeys[depth - 1];
      if (rollup != null && depth >= keys.length) array = map.entries();
      else array = [], map.each(function(v, k) { array.push({key: k, values: entries(v, depth)}); });
      return sortKey != null ? array.sort(function(a, b) { return sortKey(a.key, b.key); }) : array;
    }

    return nest = {
      object: function(array) { return apply(array, 0, createObject, setObject); },
      map: function(array) { return apply(array, 0, createMap, setMap); },
      entries: function(array) { return entries(apply(array, 0, createMap, setMap), 0); },
      key: function(d) { keys.push(d); return nest; },
      sortKeys: function(order) { sortKeys[keys.length - 1] = order; return nest; },
      sortValues: function(order) { sortValues = order; return nest; },
      rollup: function(f) { rollup = f; return nest; }
    };
  }

  function createObject() {
    return {};
  }

  function setObject(object, key, value) {
    object[key] = value;
  }

  function createMap() {
    return map$3();
  }

  function setMap(map, key, value) {
    map.set(key, value);
  }

  var EOL$1 = {},
      EOF$1 = {},
      QUOTE$1 = 34,
      NEWLINE$1 = 10,
      RETURN$1 = 13;

  function objectConverter$1(columns) {
    return new Function("d", "return {" + columns.map(function(name, i) {
      return JSON.stringify(name) + ": d[" + i + "] || \"\"";
    }).join(",") + "}");
  }

  function customConverter$1(columns, f) {
    var object = objectConverter$1(columns);
    return function(row, i) {
      return f(object(row), i, columns);
    };
  }

  // Compute unique columns in order of discovery.
  function inferColumns$1(rows) {
    var columnSet = Object.create(null),
        columns = [];

    rows.forEach(function(row) {
      for (var column in row) {
        if (!(column in columnSet)) {
          columns.push(columnSet[column] = column);
        }
      }
    });

    return columns;
  }

  function pad$3(value, width) {
    var s = value + "", length = s.length;
    return length < width ? new Array(width - length + 1).join(0) + s : s;
  }

  function formatYear$2(year) {
    return year < 0 ? "-" + pad$3(-year, 6)
      : year > 9999 ? "+" + pad$3(year, 6)
      : pad$3(year, 4);
  }

  function formatDate$2(date) {
    var hours = date.getUTCHours(),
        minutes = date.getUTCMinutes(),
        seconds = date.getUTCSeconds(),
        milliseconds = date.getUTCMilliseconds();
    return isNaN(date) ? "Invalid Date"
        : formatYear$2(date.getUTCFullYear()) + "-" + pad$3(date.getUTCMonth() + 1, 2) + "-" + pad$3(date.getUTCDate(), 2)
        + (milliseconds ? "T" + pad$3(hours, 2) + ":" + pad$3(minutes, 2) + ":" + pad$3(seconds, 2) + "." + pad$3(milliseconds, 3) + "Z"
        : seconds ? "T" + pad$3(hours, 2) + ":" + pad$3(minutes, 2) + ":" + pad$3(seconds, 2) + "Z"
        : minutes || hours ? "T" + pad$3(hours, 2) + ":" + pad$3(minutes, 2) + "Z"
        : "");
  }

  function dsv$2(delimiter) {
    var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
        DELIMITER = delimiter.charCodeAt(0);

    function parse(text, f) {
      var convert, columns, rows = parseRows(text, function(row, i) {
        if (convert) return convert(row, i - 1);
        columns = row, convert = f ? customConverter$1(row, f) : objectConverter$1(row);
      });
      rows.columns = columns || [];
      return rows;
    }

    function parseRows(text, f) {
      var rows = [], // output rows
          N = text.length,
          I = 0, // current character index
          n = 0, // current line number
          t, // current token
          eof = N <= 0, // current token followed by EOF?
          eol = false; // current token followed by EOL?

      // Strip the trailing newline.
      if (text.charCodeAt(N - 1) === NEWLINE$1) --N;
      if (text.charCodeAt(N - 1) === RETURN$1) --N;

      function token() {
        if (eof) return EOF$1;
        if (eol) return eol = false, EOL$1;

        // Unescape quotes.
        var i, j = I, c;
        if (text.charCodeAt(j) === QUOTE$1) {
          while (I++ < N && text.charCodeAt(I) !== QUOTE$1 || text.charCodeAt(++I) === QUOTE$1);
          if ((i = I) >= N) eof = true;
          else if ((c = text.charCodeAt(I++)) === NEWLINE$1) eol = true;
          else if (c === RETURN$1) { eol = true; if (text.charCodeAt(I) === NEWLINE$1) ++I; }
          return text.slice(j + 1, i - 1).replace(/""/g, "\"");
        }

        // Find next delimiter or newline.
        while (I < N) {
          if ((c = text.charCodeAt(i = I++)) === NEWLINE$1) eol = true;
          else if (c === RETURN$1) { eol = true; if (text.charCodeAt(I) === NEWLINE$1) ++I; }
          else if (c !== DELIMITER) continue;
          return text.slice(j, i);
        }

        // Return last token before EOF.
        return eof = true, text.slice(j, N);
      }

      while ((t = token()) !== EOF$1) {
        var row = [];
        while (t !== EOL$1 && t !== EOF$1) row.push(t), t = token();
        if (f && (row = f(row, n++)) == null) continue;
        rows.push(row);
      }

      return rows;
    }

    function preformatBody(rows, columns) {
      return rows.map(function(row) {
        return columns.map(function(column) {
          return formatValue(row[column]);
        }).join(delimiter);
      });
    }

    function format(rows, columns) {
      if (columns == null) columns = inferColumns$1(rows);
      return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
    }

    function formatBody(rows, columns) {
      if (columns == null) columns = inferColumns$1(rows);
      return preformatBody(rows, columns).join("\n");
    }

    function formatRows(rows) {
      return rows.map(formatRow).join("\n");
    }

    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }

    function formatValue(value) {
      return value == null ? ""
          : value instanceof Date ? formatDate$2(value)
          : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\""
          : value;
    }

    return {
      parse: parse,
      parseRows: parseRows,
      format: format,
      formatBody: formatBody,
      formatRows: formatRows,
      formatRow: formatRow,
      formatValue: formatValue
    };
  }

  var csv$1 = dsv$2(",");

  var csvParse$1 = csv$1.parse;
  var csvFormatRows = csv$1.formatRows;

  var tsv$1 = dsv$2("\t");

  var tsvParse$1 = tsv$1.parse;
  var tsvFormatRows = tsv$1.formatRows;

  function formatDecimal(x) {
    return Math.abs(x = Math.round(x)) >= 1e21
        ? x.toLocaleString("en").replace(/,/g, "")
        : x.toString(10);
  }

  // Computes the decimal coefficient and exponent of the specified number x with
  // significant digits p, where x is positive and p is in [1, 21] or undefined.
  // For example, formatDecimalParts(1.23) returns ["123", 0].
  function formatDecimalParts(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
    var i, coefficient = x.slice(0, i);

    // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
    // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  function exponent(x) {
    return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
  }

  function formatGroup(grouping, thousands) {
    return function(value, width) {
      var i = value.length,
          t = [],
          j = 0,
          g = grouping[0],
          length = 0;

      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = grouping[j = (j + 1) % grouping.length];
      }

      return t.reverse().join(thousands);
    };
  }

  function formatNumerals(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

  function formatSpecifier(specifier) {
    if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
    var match;
    return new FormatSpecifier({
      fill: match[1],
      align: match[2],
      sign: match[3],
      symbol: match[4],
      zero: match[5],
      width: match[6],
      comma: match[7],
      precision: match[8] && match[8].slice(1),
      trim: match[9],
      type: match[10]
    });
  }

  formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

  function FormatSpecifier(specifier) {
    this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
    this.align = specifier.align === undefined ? ">" : specifier.align + "";
    this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
    this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
    this.zero = !!specifier.zero;
    this.width = specifier.width === undefined ? undefined : +specifier.width;
    this.comma = !!specifier.comma;
    this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
    this.trim = !!specifier.trim;
    this.type = specifier.type === undefined ? "" : specifier.type + "";
  }

  FormatSpecifier.prototype.toString = function() {
    return this.fill
        + this.align
        + this.sign
        + this.symbol
        + (this.zero ? "0" : "")
        + (this.width === undefined ? "" : Math.max(1, this.width | 0))
        + (this.comma ? "," : "")
        + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
        + (this.trim ? "~" : "")
        + this.type;
  };

  // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
  function formatTrim(s) {
    out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
      switch (s[i]) {
        case ".": i0 = i1 = i; break;
        case "0": if (i0 === 0) i0 = i; i1 = i; break;
        default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
      }
    }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  var prefixExponent;

  function formatPrefixAuto(x, p) {
    var d = formatDecimalParts(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1],
        i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
        n = coefficient.length;
    return i === n ? coefficient
        : i > n ? coefficient + new Array(i - n + 1).join("0")
        : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
        : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
  }

  function formatRounded(x, p) {
    var d = formatDecimalParts(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
        : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
        : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  var formatTypes = {
    "%": function(x, p) { return (x * 100).toFixed(p); },
    "b": function(x) { return Math.round(x).toString(2); },
    "c": function(x) { return x + ""; },
    "d": formatDecimal,
    "e": function(x, p) { return x.toExponential(p); },
    "f": function(x, p) { return x.toFixed(p); },
    "g": function(x, p) { return x.toPrecision(p); },
    "o": function(x) { return Math.round(x).toString(8); },
    "p": function(x, p) { return formatRounded(x * 100, p); },
    "r": formatRounded,
    "s": formatPrefixAuto,
    "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
    "x": function(x) { return Math.round(x).toString(16); }
  };

  function identity$2(x) {
    return x;
  }

  var map$4 = Array.prototype.map,
      prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

  function formatLocale(locale) {
    var group = locale.grouping === undefined || locale.thousands === undefined ? identity$2 : formatGroup(map$4.call(locale.grouping, Number), locale.thousands + ""),
        currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
        currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
        decimal = locale.decimal === undefined ? "." : locale.decimal + "",
        numerals = locale.numerals === undefined ? identity$2 : formatNumerals(map$4.call(locale.numerals, String)),
        percent = locale.percent === undefined ? "%" : locale.percent + "",
        minus = locale.minus === undefined ? "-" : locale.minus + "",
        nan = locale.nan === undefined ? "NaN" : locale.nan + "";

    function newFormat(specifier) {
      specifier = formatSpecifier(specifier);

      var fill = specifier.fill,
          align = specifier.align,
          sign = specifier.sign,
          symbol = specifier.symbol,
          zero = specifier.zero,
          width = specifier.width,
          comma = specifier.comma,
          precision = specifier.precision,
          trim = specifier.trim,
          type = specifier.type;

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // The "" type, and any invalid type, is an alias for ".12~g".
      else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

      // Compute the prefix and suffix.
      // For SI-prefix, the suffix is lazily computed.
      var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
          suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

      // What format function should we use?
      // Is this an integer type?
      // Can this type generate exponential notation?
      var formatType = formatTypes[type],
          maybeSuffix = /[defgprs%]/.test(type);

      // Set the default precision if not specified,
      // or clamp the specified precision to the supported range.
      // For significant precision, it must be in [1, 21].
      // For fixed precision, it must be in [0, 20].
      precision = precision === undefined ? 6
          : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
          : Math.max(0, Math.min(20, precision));

      function format(value) {
        var valuePrefix = prefix,
            valueSuffix = suffix,
            i, n, c;

        if (type === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;

          // Determine the sign. -0 is not less than 0, but 1 / -0 is!
          var valueNegative = value < 0 || 1 / value < 0;

          // Perform the initial formatting.
          value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

          // Trim insignificant zeros.
          if (trim) value = formatTrim(value);

          // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
          if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

          // Compute the prefix and suffix.
          valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
          valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

          // Break the formatted value into the integer “value” part that can be
          // grouped, and fractional or exponential “suffix” part that is not.
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }

        // If the fill character is not "0", grouping is applied before padding.
        if (comma && !zero) value = group(value, Infinity);

        // Compute the padding.
        var length = valuePrefix.length + value.length + valueSuffix.length,
            padding = length < width ? new Array(width - length + 1).join(fill) : "";

        // If the fill character is "0", grouping is applied after padding.
        if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

        // Reconstruct the final output based on the desired alignment.
        switch (align) {
          case "<": value = valuePrefix + value + valueSuffix + padding; break;
          case "=": value = valuePrefix + padding + value + valueSuffix; break;
          case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
          default: value = padding + valuePrefix + value + valueSuffix; break;
        }

        return numerals(value);
      }

      format.toString = function() {
        return specifier + "";
      };

      return format;
    }

    function formatPrefix(specifier, value) {
      var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
          e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
          k = Math.pow(10, -e),
          prefix = prefixes[8 + e / 3];
      return function(value) {
        return f(k * value) + prefix;
      };
    }

    return {
      format: newFormat,
      formatPrefix: formatPrefix
    };
  }

  var locale;
  var format$1;
  var formatPrefix;

  defaultLocale({
    decimal: ".",
    thousands: ",",
    grouping: [3],
    currency: ["$", ""],
    minus: "-"
  });

  function defaultLocale(definition) {
    locale = formatLocale(definition);
    format$1 = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  var t0 = new Date,
      t1 = new Date;

  function newInterval(floori, offseti, count, field) {

    function interval(date) {
      return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
    }

    interval.floor = function(date) {
      return floori(date = new Date(+date)), date;
    };

    interval.ceil = function(date) {
      return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
    };

    interval.round = function(date) {
      var d0 = interval(date),
          d1 = interval.ceil(date);
      return date - d0 < d1 - date ? d0 : d1;
    };

    interval.offset = function(date, step) {
      return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
    };

    interval.range = function(start, stop, step) {
      var range = [], previous;
      start = interval.ceil(start);
      step = step == null ? 1 : Math.floor(step);
      if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
      do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
      while (previous < start && start < stop);
      return range;
    };

    interval.filter = function(test) {
      return newInterval(function(date) {
        if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
      }, function(date, step) {
        if (date >= date) {
          if (step < 0) while (++step <= 0) {
            while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
          } else while (--step >= 0) {
            while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
          }
        }
      });
    };

    if (count) {
      interval.count = function(start, end) {
        t0.setTime(+start), t1.setTime(+end);
        floori(t0), floori(t1);
        return Math.floor(count(t0, t1));
      };

      interval.every = function(step) {
        step = Math.floor(step);
        return !isFinite(step) || !(step > 0) ? null
            : !(step > 1) ? interval
            : interval.filter(field
                ? function(d) { return field(d) % step === 0; }
                : function(d) { return interval.count(0, d) % step === 0; });
      };
    }

    return interval;
  }

  var durationMinute = 6e4;
  var durationDay = 864e5;
  var durationWeek = 6048e5;

  var day = newInterval(function(date) {
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
  }, function(date) {
    return date.getDate() - 1;
  });

  function weekday(i) {
    return newInterval(function(date) {
      date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setDate(date.getDate() + step * 7);
    }, function(start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
    });
  }

  var sunday = weekday(0);
  var monday = weekday(1);
  var tuesday = weekday(2);
  var wednesday = weekday(3);
  var thursday = weekday(4);
  var friday = weekday(5);
  var saturday = weekday(6);

  var year = newInterval(function(date) {
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setFullYear(date.getFullYear() + step);
  }, function(start, end) {
    return end.getFullYear() - start.getFullYear();
  }, function(date) {
    return date.getFullYear();
  });

  // An optimized implementation for this simple case.
  year.every = function(k) {
    return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
      date.setFullYear(Math.floor(date.getFullYear() / k) * k);
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setFullYear(date.getFullYear() + step * k);
    });
  };

  var utcDay = newInterval(function(date) {
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step);
  }, function(start, end) {
    return (end - start) / durationDay;
  }, function(date) {
    return date.getUTCDate() - 1;
  });

  function utcWeekday(i) {
    return newInterval(function(date) {
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCDate(date.getUTCDate() + step * 7);
    }, function(start, end) {
      return (end - start) / durationWeek;
    });
  }

  var utcSunday = utcWeekday(0);
  var utcMonday = utcWeekday(1);
  var utcTuesday = utcWeekday(2);
  var utcWednesday = utcWeekday(3);
  var utcThursday = utcWeekday(4);
  var utcFriday = utcWeekday(5);
  var utcSaturday = utcWeekday(6);

  var utcYear = newInterval(function(date) {
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCFullYear(date.getUTCFullYear() + step);
  }, function(start, end) {
    return end.getUTCFullYear() - start.getUTCFullYear();
  }, function(date) {
    return date.getUTCFullYear();
  });

  // An optimized implementation for this simple case.
  utcYear.every = function(k) {
    return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
      date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCFullYear(date.getUTCFullYear() + step * k);
    });
  };

  function localDate(d) {
    if (0 <= d.y && d.y < 100) {
      var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
      date.setFullYear(d.y);
      return date;
    }
    return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
  }

  function utcDate(d) {
    if (0 <= d.y && d.y < 100) {
      var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
      date.setUTCFullYear(d.y);
      return date;
    }
    return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
  }

  function newDate(y, m, d) {
    return {y: y, m: m, d: d, H: 0, M: 0, S: 0, L: 0};
  }

  function formatLocale$1(locale) {
    var locale_dateTime = locale.dateTime,
        locale_date = locale.date,
        locale_time = locale.time,
        locale_periods = locale.periods,
        locale_weekdays = locale.days,
        locale_shortWeekdays = locale.shortDays,
        locale_months = locale.months,
        locale_shortMonths = locale.shortMonths;

    var periodRe = formatRe(locale_periods),
        periodLookup = formatLookup(locale_periods),
        weekdayRe = formatRe(locale_weekdays),
        weekdayLookup = formatLookup(locale_weekdays),
        shortWeekdayRe = formatRe(locale_shortWeekdays),
        shortWeekdayLookup = formatLookup(locale_shortWeekdays),
        monthRe = formatRe(locale_months),
        monthLookup = formatLookup(locale_months),
        shortMonthRe = formatRe(locale_shortMonths),
        shortMonthLookup = formatLookup(locale_shortMonths);

    var formats = {
      "a": formatShortWeekday,
      "A": formatWeekday,
      "b": formatShortMonth,
      "B": formatMonth,
      "c": null,
      "d": formatDayOfMonth,
      "e": formatDayOfMonth,
      "f": formatMicroseconds,
      "g": formatYearISO,
      "G": formatFullYearISO,
      "H": formatHour24,
      "I": formatHour12,
      "j": formatDayOfYear,
      "L": formatMilliseconds,
      "m": formatMonthNumber,
      "M": formatMinutes,
      "p": formatPeriod,
      "q": formatQuarter,
      "Q": formatUnixTimestamp,
      "s": formatUnixTimestampSeconds,
      "S": formatSeconds,
      "u": formatWeekdayNumberMonday,
      "U": formatWeekNumberSunday,
      "V": formatWeekNumberISO,
      "w": formatWeekdayNumberSunday,
      "W": formatWeekNumberMonday,
      "x": null,
      "X": null,
      "y": formatYear$3,
      "Y": formatFullYear,
      "Z": formatZone,
      "%": formatLiteralPercent
    };

    var utcFormats = {
      "a": formatUTCShortWeekday,
      "A": formatUTCWeekday,
      "b": formatUTCShortMonth,
      "B": formatUTCMonth,
      "c": null,
      "d": formatUTCDayOfMonth,
      "e": formatUTCDayOfMonth,
      "f": formatUTCMicroseconds,
      "g": formatUTCYearISO,
      "G": formatUTCFullYearISO,
      "H": formatUTCHour24,
      "I": formatUTCHour12,
      "j": formatUTCDayOfYear,
      "L": formatUTCMilliseconds,
      "m": formatUTCMonthNumber,
      "M": formatUTCMinutes,
      "p": formatUTCPeriod,
      "q": formatUTCQuarter,
      "Q": formatUnixTimestamp,
      "s": formatUnixTimestampSeconds,
      "S": formatUTCSeconds,
      "u": formatUTCWeekdayNumberMonday,
      "U": formatUTCWeekNumberSunday,
      "V": formatUTCWeekNumberISO,
      "w": formatUTCWeekdayNumberSunday,
      "W": formatUTCWeekNumberMonday,
      "x": null,
      "X": null,
      "y": formatUTCYear,
      "Y": formatUTCFullYear,
      "Z": formatUTCZone,
      "%": formatLiteralPercent
    };

    var parses = {
      "a": parseShortWeekday,
      "A": parseWeekday,
      "b": parseShortMonth,
      "B": parseMonth,
      "c": parseLocaleDateTime,
      "d": parseDayOfMonth,
      "e": parseDayOfMonth,
      "f": parseMicroseconds,
      "g": parseYear,
      "G": parseFullYear,
      "H": parseHour24,
      "I": parseHour24,
      "j": parseDayOfYear,
      "L": parseMilliseconds,
      "m": parseMonthNumber,
      "M": parseMinutes,
      "p": parsePeriod,
      "q": parseQuarter,
      "Q": parseUnixTimestamp,
      "s": parseUnixTimestampSeconds,
      "S": parseSeconds,
      "u": parseWeekdayNumberMonday,
      "U": parseWeekNumberSunday,
      "V": parseWeekNumberISO,
      "w": parseWeekdayNumberSunday,
      "W": parseWeekNumberMonday,
      "x": parseLocaleDate,
      "X": parseLocaleTime,
      "y": parseYear,
      "Y": parseFullYear,
      "Z": parseZone,
      "%": parseLiteralPercent
    };

    // These recursive directive definitions must be deferred.
    formats.x = newFormat(locale_date, formats);
    formats.X = newFormat(locale_time, formats);
    formats.c = newFormat(locale_dateTime, formats);
    utcFormats.x = newFormat(locale_date, utcFormats);
    utcFormats.X = newFormat(locale_time, utcFormats);
    utcFormats.c = newFormat(locale_dateTime, utcFormats);

    function newFormat(specifier, formats) {
      return function(date) {
        var string = [],
            i = -1,
            j = 0,
            n = specifier.length,
            c,
            pad,
            format;

        if (!(date instanceof Date)) date = new Date(+date);

        while (++i < n) {
          if (specifier.charCodeAt(i) === 37) {
            string.push(specifier.slice(j, i));
            if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
            else pad = c === "e" ? " " : "0";
            if (format = formats[c]) c = format(date, pad);
            string.push(c);
            j = i + 1;
          }
        }

        string.push(specifier.slice(j, i));
        return string.join("");
      };
    }

    function newParse(specifier, Z) {
      return function(string) {
        var d = newDate(1900, undefined, 1),
            i = parseSpecifier(d, specifier, string += "", 0),
            week, day$1;
        if (i != string.length) return null;

        // If a UNIX timestamp is specified, return it.
        if ("Q" in d) return new Date(d.Q);
        if ("s" in d) return new Date(d.s * 1000 + ("L" in d ? d.L : 0));

        // If this is utcParse, never use the local timezone.
        if (Z && !("Z" in d)) d.Z = 0;

        // The am-pm flag is 0 for AM, and 1 for PM.
        if ("p" in d) d.H = d.H % 12 + d.p * 12;

        // If the month was not specified, inherit from the quarter.
        if (d.m === undefined) d.m = "q" in d ? d.q : 0;

        // Convert day-of-week and week-of-year to day-of-year.
        if ("V" in d) {
          if (d.V < 1 || d.V > 53) return null;
          if (!("w" in d)) d.w = 1;
          if ("Z" in d) {
            week = utcDate(newDate(d.y, 0, 1)), day$1 = week.getUTCDay();
            week = day$1 > 4 || day$1 === 0 ? utcMonday.ceil(week) : utcMonday(week);
            week = utcDay.offset(week, (d.V - 1) * 7);
            d.y = week.getUTCFullYear();
            d.m = week.getUTCMonth();
            d.d = week.getUTCDate() + (d.w + 6) % 7;
          } else {
            week = localDate(newDate(d.y, 0, 1)), day$1 = week.getDay();
            week = day$1 > 4 || day$1 === 0 ? monday.ceil(week) : monday(week);
            week = day.offset(week, (d.V - 1) * 7);
            d.y = week.getFullYear();
            d.m = week.getMonth();
            d.d = week.getDate() + (d.w + 6) % 7;
          }
        } else if ("W" in d || "U" in d) {
          if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
          day$1 = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
          d.m = 0;
          d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$1 + 5) % 7 : d.w + d.U * 7 - (day$1 + 6) % 7;
        }

        // If a time zone is specified, all fields are interpreted as UTC and then
        // offset according to the specified time zone.
        if ("Z" in d) {
          d.H += d.Z / 100 | 0;
          d.M += d.Z % 100;
          return utcDate(d);
        }

        // Otherwise, all fields are in local time.
        return localDate(d);
      };
    }

    function parseSpecifier(d, specifier, string, j) {
      var i = 0,
          n = specifier.length,
          m = string.length,
          c,
          parse;

      while (i < n) {
        if (j >= m) return -1;
        c = specifier.charCodeAt(i++);
        if (c === 37) {
          c = specifier.charAt(i++);
          parse = parses[c in pads ? specifier.charAt(i++) : c];
          if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
        } else if (c != string.charCodeAt(j++)) {
          return -1;
        }
      }

      return j;
    }

    function parsePeriod(d, string, i) {
      var n = periodRe.exec(string.slice(i));
      return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseShortWeekday(d, string, i) {
      var n = shortWeekdayRe.exec(string.slice(i));
      return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseWeekday(d, string, i) {
      var n = weekdayRe.exec(string.slice(i));
      return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseShortMonth(d, string, i) {
      var n = shortMonthRe.exec(string.slice(i));
      return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseMonth(d, string, i) {
      var n = monthRe.exec(string.slice(i));
      return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseLocaleDateTime(d, string, i) {
      return parseSpecifier(d, locale_dateTime, string, i);
    }

    function parseLocaleDate(d, string, i) {
      return parseSpecifier(d, locale_date, string, i);
    }

    function parseLocaleTime(d, string, i) {
      return parseSpecifier(d, locale_time, string, i);
    }

    function formatShortWeekday(d) {
      return locale_shortWeekdays[d.getDay()];
    }

    function formatWeekday(d) {
      return locale_weekdays[d.getDay()];
    }

    function formatShortMonth(d) {
      return locale_shortMonths[d.getMonth()];
    }

    function formatMonth(d) {
      return locale_months[d.getMonth()];
    }

    function formatPeriod(d) {
      return locale_periods[+(d.getHours() >= 12)];
    }

    function formatQuarter(d) {
      return 1 + ~~(d.getMonth() / 3);
    }

    function formatUTCShortWeekday(d) {
      return locale_shortWeekdays[d.getUTCDay()];
    }

    function formatUTCWeekday(d) {
      return locale_weekdays[d.getUTCDay()];
    }

    function formatUTCShortMonth(d) {
      return locale_shortMonths[d.getUTCMonth()];
    }

    function formatUTCMonth(d) {
      return locale_months[d.getUTCMonth()];
    }

    function formatUTCPeriod(d) {
      return locale_periods[+(d.getUTCHours() >= 12)];
    }

    function formatUTCQuarter(d) {
      return 1 + ~~(d.getUTCMonth() / 3);
    }

    return {
      format: function(specifier) {
        var f = newFormat(specifier += "", formats);
        f.toString = function() { return specifier; };
        return f;
      },
      parse: function(specifier) {
        var p = newParse(specifier += "", false);
        p.toString = function() { return specifier; };
        return p;
      },
      utcFormat: function(specifier) {
        var f = newFormat(specifier += "", utcFormats);
        f.toString = function() { return specifier; };
        return f;
      },
      utcParse: function(specifier) {
        var p = newParse(specifier += "", true);
        p.toString = function() { return specifier; };
        return p;
      }
    };
  }

  var pads = {"-": "", "_": " ", "0": "0"},
      numberRe = /^\s*\d+/, // note: ignores next directive
      percentRe = /^%/,
      requoteRe = /[\\^$*+?|[\]().{}]/g;

  function pad$4(value, fill, width) {
    var sign = value < 0 ? "-" : "",
        string = (sign ? -value : value) + "",
        length = string.length;
    return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
  }

  function requote(s) {
    return s.replace(requoteRe, "\\$&");
  }

  function formatRe(names) {
    return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
  }

  function formatLookup(names) {
    var map = {}, i = -1, n = names.length;
    while (++i < n) map[names[i].toLowerCase()] = i;
    return map;
  }

  function parseWeekdayNumberSunday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.w = +n[0], i + n[0].length) : -1;
  }

  function parseWeekdayNumberMonday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.u = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberSunday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.U = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberISO(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.V = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberMonday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.W = +n[0], i + n[0].length) : -1;
  }

  function parseFullYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 4));
    return n ? (d.y = +n[0], i + n[0].length) : -1;
  }

  function parseYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
  }

  function parseZone(d, string, i) {
    var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
    return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
  }

  function parseQuarter(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
  }

  function parseMonthNumber(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
  }

  function parseDayOfMonth(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.d = +n[0], i + n[0].length) : -1;
  }

  function parseDayOfYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 3));
    return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
  }

  function parseHour24(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.H = +n[0], i + n[0].length) : -1;
  }

  function parseMinutes(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.M = +n[0], i + n[0].length) : -1;
  }

  function parseSeconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.S = +n[0], i + n[0].length) : -1;
  }

  function parseMilliseconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 3));
    return n ? (d.L = +n[0], i + n[0].length) : -1;
  }

  function parseMicroseconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 6));
    return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
  }

  function parseLiteralPercent(d, string, i) {
    var n = percentRe.exec(string.slice(i, i + 1));
    return n ? i + n[0].length : -1;
  }

  function parseUnixTimestamp(d, string, i) {
    var n = numberRe.exec(string.slice(i));
    return n ? (d.Q = +n[0], i + n[0].length) : -1;
  }

  function parseUnixTimestampSeconds(d, string, i) {
    var n = numberRe.exec(string.slice(i));
    return n ? (d.s = +n[0], i + n[0].length) : -1;
  }

  function formatDayOfMonth(d, p) {
    return pad$4(d.getDate(), p, 2);
  }

  function formatHour24(d, p) {
    return pad$4(d.getHours(), p, 2);
  }

  function formatHour12(d, p) {
    return pad$4(d.getHours() % 12 || 12, p, 2);
  }

  function formatDayOfYear(d, p) {
    return pad$4(1 + day.count(year(d), d), p, 3);
  }

  function formatMilliseconds(d, p) {
    return pad$4(d.getMilliseconds(), p, 3);
  }

  function formatMicroseconds(d, p) {
    return formatMilliseconds(d, p) + "000";
  }

  function formatMonthNumber(d, p) {
    return pad$4(d.getMonth() + 1, p, 2);
  }

  function formatMinutes(d, p) {
    return pad$4(d.getMinutes(), p, 2);
  }

  function formatSeconds(d, p) {
    return pad$4(d.getSeconds(), p, 2);
  }

  function formatWeekdayNumberMonday(d) {
    var day = d.getDay();
    return day === 0 ? 7 : day;
  }

  function formatWeekNumberSunday(d, p) {
    return pad$4(sunday.count(year(d) - 1, d), p, 2);
  }

  function dISO(d) {
    var day = d.getDay();
    return (day >= 4 || day === 0) ? thursday(d) : thursday.ceil(d);
  }

  function formatWeekNumberISO(d, p) {
    d = dISO(d);
    return pad$4(thursday.count(year(d), d) + (year(d).getDay() === 4), p, 2);
  }

  function formatWeekdayNumberSunday(d) {
    return d.getDay();
  }

  function formatWeekNumberMonday(d, p) {
    return pad$4(monday.count(year(d) - 1, d), p, 2);
  }

  function formatYear$3(d, p) {
    return pad$4(d.getFullYear() % 100, p, 2);
  }

  function formatYearISO(d, p) {
    d = dISO(d);
    return pad$4(d.getFullYear() % 100, p, 2);
  }

  function formatFullYear(d, p) {
    return pad$4(d.getFullYear() % 10000, p, 4);
  }

  function formatFullYearISO(d, p) {
    var day = d.getDay();
    d = (day >= 4 || day === 0) ? thursday(d) : thursday.ceil(d);
    return pad$4(d.getFullYear() % 10000, p, 4);
  }

  function formatZone(d) {
    var z = d.getTimezoneOffset();
    return (z > 0 ? "-" : (z *= -1, "+"))
        + pad$4(z / 60 | 0, "0", 2)
        + pad$4(z % 60, "0", 2);
  }

  function formatUTCDayOfMonth(d, p) {
    return pad$4(d.getUTCDate(), p, 2);
  }

  function formatUTCHour24(d, p) {
    return pad$4(d.getUTCHours(), p, 2);
  }

  function formatUTCHour12(d, p) {
    return pad$4(d.getUTCHours() % 12 || 12, p, 2);
  }

  function formatUTCDayOfYear(d, p) {
    return pad$4(1 + utcDay.count(utcYear(d), d), p, 3);
  }

  function formatUTCMilliseconds(d, p) {
    return pad$4(d.getUTCMilliseconds(), p, 3);
  }

  function formatUTCMicroseconds(d, p) {
    return formatUTCMilliseconds(d, p) + "000";
  }

  function formatUTCMonthNumber(d, p) {
    return pad$4(d.getUTCMonth() + 1, p, 2);
  }

  function formatUTCMinutes(d, p) {
    return pad$4(d.getUTCMinutes(), p, 2);
  }

  function formatUTCSeconds(d, p) {
    return pad$4(d.getUTCSeconds(), p, 2);
  }

  function formatUTCWeekdayNumberMonday(d) {
    var dow = d.getUTCDay();
    return dow === 0 ? 7 : dow;
  }

  function formatUTCWeekNumberSunday(d, p) {
    return pad$4(utcSunday.count(utcYear(d) - 1, d), p, 2);
  }

  function UTCdISO(d) {
    var day = d.getUTCDay();
    return (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
  }

  function formatUTCWeekNumberISO(d, p) {
    d = UTCdISO(d);
    return pad$4(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
  }

  function formatUTCWeekdayNumberSunday(d) {
    return d.getUTCDay();
  }

  function formatUTCWeekNumberMonday(d, p) {
    return pad$4(utcMonday.count(utcYear(d) - 1, d), p, 2);
  }

  function formatUTCYear(d, p) {
    return pad$4(d.getUTCFullYear() % 100, p, 2);
  }

  function formatUTCYearISO(d, p) {
    d = UTCdISO(d);
    return pad$4(d.getUTCFullYear() % 100, p, 2);
  }

  function formatUTCFullYear(d, p) {
    return pad$4(d.getUTCFullYear() % 10000, p, 4);
  }

  function formatUTCFullYearISO(d, p) {
    var day = d.getUTCDay();
    d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
    return pad$4(d.getUTCFullYear() % 10000, p, 4);
  }

  function formatUTCZone() {
    return "+0000";
  }

  function formatLiteralPercent() {
    return "%";
  }

  function formatUnixTimestamp(d) {
    return +d;
  }

  function formatUnixTimestampSeconds(d) {
    return Math.floor(+d / 1000);
  }

  var locale$1;
  var timeFormat;
  var timeParse;
  var utcFormat;
  var utcParse;

  defaultLocale$1({
    dateTime: "%x, %X",
    date: "%-m/%-d/%Y",
    time: "%-I:%M:%S %p",
    periods: ["AM", "PM"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  });

  function defaultLocale$1(definition) {
    locale$1 = formatLocale$1(definition);
    timeFormat = locale$1.format;
    timeParse = locale$1.parse;
    utcFormat = locale$1.utcFormat;
    utcParse = locale$1.utcParse;
    return locale$1;
  }

  function applyMixins(derivedCtor, baseCtors) {
      baseCtors.forEach(function (baseCtor) {
          Object.getOwnPropertyNames(baseCtor).forEach(function (name) {
              if (name !== "constructor") {
                  var descriptor = Object.getOwnPropertyDescriptor(baseCtor, name);
                  Object.defineProperty(derivedCtor, name, descriptor);
              }
          });
      });
  }
  var Class = /** @class */ (function () {
      function Class() {
      }
      Class.prototype.class = function (_) {
          if (!arguments.length)
              return this._class;
          this._class = _;
          return this;
      };
      Class.prototype.classID = function () {
          return this._class.split(" ").pop();
      };
      Class.prototype.classMeta = function () {
          return classID2Meta(this.classID());
      };
      Class.prototype.implements = function (source) {
          applyMixins(this, [source]);
      };
      Class.prototype.mixin = function (mixinClass) {
          this.implements(mixinClass.prototype);
          //  Special case mixins  ---
          if (mixinClass.prototype.hasOwnProperty("_class")) {
              this._class += " " + mixinClass.prototype._class.split(" ").pop();
          }
      };
      Class.prototype.overrideMethod = function (methodID, newMethod) {
          if (this[methodID] === undefined) {
              throw new Error("Method:  " + methodID + " does not exist.");
          }
          var origMethod = this[methodID];
          this[methodID] = function () {
              arguments[arguments.length] = origMethod;
              arguments.length++;
              return newMethod.apply(this, arguments);
          };
          return this;
      };
      Class.prototype.cssTag = function (id) {
          return ("" + id).replace(/[^a-z0-9]/g, function (s) {
              var c = s.charCodeAt(0);
              if (c === 32)
                  return "-";
              if (c >= 65 && c <= 90)
                  return "_" + s.toLowerCase();
              return "_0x" + c.toString(16);
          });
      };
      return Class;
  }());
  Class.prototype._class = "common_Class";

  function deepEqual(a, b) {
      if (a === b)
          return true;
      var arrA = Array.isArray(a);
      var arrB = Array.isArray(b);
      var i;
      if (arrA && arrB) {
          if (a.length !== b.length)
              return false;
          for (i = 0; i < a.length; i++)
              if (!deepEqual(a[i], b[i]))
                  return false;
          return true;
      }
      if (arrA != arrB)
          return false;
      if (a && b && typeof a === "object" && typeof b === "object") {
          var keys = Object.keys(a);
          if (keys.length !== Object.keys(b).length)
              return false;
          var dateA = a instanceof Date;
          var dateB = b instanceof Date;
          if (dateA && dateB)
              return a.getTime() === b.getTime();
          if (dateA != dateB)
              return false;
          var regexpA = a instanceof RegExp;
          var regexpB = b instanceof RegExp;
          if (regexpA && regexpB)
              return a.toString() === b.toString();
          if (regexpA != regexpB)
              return false;
          for (i = 0; i < keys.length; i++)
              if (!Object.prototype.hasOwnProperty.call(b, keys[i]))
                  return false;
          for (i = 0; i < keys.length; i++)
              if (!deepEqual(a[keys[i]], b[keys[i]]))
                  return false;
          return true;
      }
      return false;
  }
  var __meta_ = "__meta_";
  var __private_ = "__private_";
  var __prop_ = "_";
  var __prop_data_ = "__prop_";
  var __default_ = "__default_";
  function isMeta(key) {
      return key.indexOf(__meta_) === 0;
  }
  function isPrivate(obj, key) {
      return obj[__private_ + key] || obj[__private_ + __meta_ + key];
  }
  var Meta = /** @class */ (function () {
      function Meta(id, defaultValue, type, description, set, ext) {
          ext = ext || {};
          this.id = id;
          this.type = type;
          this.origDefaultValue = defaultValue;
          this.defaultValue = ext.optional && defaultValue === null ? undefined : defaultValue;
          this.description = description;
          this.set = set;
          this.ext = ext;
          switch (type) {
              case "any":
                  this.checkedAssign = function (_) { return _; };
                  break;
              case "set":
                  this.checkedAssign = function (_) {
                      if (window.__hpcc_debug) {
                          var options = typeof set === "function" ? set.call(this) : set;
                          if (options && options.length && options.indexOf(_) < 0) {
                              console.error("Invalid value for '" + this.classID() + "." + id + "':  " + _ + " expected " + JSON.stringify(options));
                          }
                      }
                      return _;
                  };
                  break;
              case "html-color":
                  this.checkedAssign = function (_) {
                      if (window.__hpcc_debug && _ && _ !== "red") {
                          var litmus = "red";
                          var d = document.createElement("div");
                          d.style.color = litmus;
                          d.style.color = _;
                          // Element's style.color will be reverted to litmus or set to "" if an invalid color is given
                          if (d.style.color === litmus || d.style.color === "") {
                              console.error("Invalid value for '" + this.classID() + "." + id + "':  " + _ + " expected " + type);
                          }
                      }
                      return _;
                  };
                  break;
              case "boolean":
                  this.checkedAssign = function (_) {
                      return typeof (_) === "string" && ["false", "off", "0"].indexOf(_.toLowerCase()) >= 0 ? false : Boolean(_);
                  };
                  break;
              case "number":
                  this.checkedAssign = function (_) {
                      return Number(_);
                  };
                  break;
              case "string":
                  this.checkedAssign = function (_) {
                      return String(_);
                  };
                  break;
              case "array":
                  this.checkedAssign = function (_) {
                      if (!(_ instanceof Array)) {
                          console.error("Invalid value for '" + this.classID() + "." + id + "':  " + _ + " expected " + type);
                      }
                      return _;
                  };
                  break;
              case "object":
                  this.checkedAssign = function (_) {
                      if (!(_ instanceof Object)) {
                          console.error("Invalid value for '" + this.classID() + "." + id + "':  " + _ + " expected " + type);
                      }
                      return _;
                  };
                  break;
              case "widget":
                  this.checkedAssign = function (_) {
                      if (!_._class || _._class.indexOf("common_PropertyExt") < 0) {
                          console.error("Invalid value for '" + this.classID() + "." + id + "':  " + _ + " expected " + type);
                      }
                      return _;
                  };
                  break;
              case "widgetArray":
                  this.checkedAssign = function (_) {
                      if (_.some(function (row) { return (!row._class || row._class.indexOf("common_Widget") < 0); })) {
                          console.error("Invalid value for '" + this.classID() + "." + id + "':  " + _ + " expected " + type);
                      }
                      return _;
                  };
                  break;
              case "propertyArray":
                  this.checkedAssign = function (_) {
                      if (_.some(function (row) { return !row.publishedProperties; })) {
                          console.log("Invalid value for '" + this.classID() + "." + id + "':  " + _ + " expected " + type);
                      }
                      return _;
                  };
                  break;
              default:
                  this.checkedAssign = function (_) {
                      if (window.__hpcc_debug) {
                          console.error("Unchecked property type for '" + this.classID() + "." + id + "':  " + _ + " expected " + type);
                      }
                      return _;
                  };
                  break;
          }
      }
      return Meta;
  }());
  var MetaProxy = /** @class */ (function () {
      function MetaProxy(id, proxy, method, defaultValue, ext) {
          this.id = id;
          this.type = "proxy";
          this.proxy = proxy;
          this.method = method;
          this.defaultValue = defaultValue;
          this.ext = ext || {};
      }
      return MetaProxy;
  }());
  function isMetaProxy(meta) {
      return meta.type === "proxy";
  }
  var propExtID = 0;
  var PropertyExt = /** @class */ (function (_super) {
      __extends(PropertyExt, _super);
      function PropertyExt() {
          var _this = _super.call(this) || this;
          _this._publishedProperties = [];
          _this.calcPublishedProperties();
          _this._id = "_pe" + (++propExtID);
          _this._watchArrIdx = 0;
          _this._watchArr = {};
          _this.publishedProperties(true).forEach(function (meta) {
              switch (meta.type) {
                  case "array":
                  case "widgetArray":
                  case "propertyArray":
                      this[meta.id + "_reset"]();
                      break;
              }
          }, _this);
          return _this;
      }
      PropertyExt.prototype.id = function (_) {
          if (!arguments.length)
              return this._id;
          this._id = _;
          return this;
      };
      // Publish Properties  ---
      PropertyExt.prototype.calcPublishedProperties = function (includePrivate, expandProxies) {
          this._publishedProperties = [];
          var protoStack = [];
          var __proto__ = Object.getPrototypeOf(this);
          while (__proto__) {
              if (__proto__ === PropertyExt.prototype) {
                  break;
              }
              protoStack.unshift(__proto__);
              __proto__ = Object.getPrototypeOf(__proto__);
          }
          for (var _i = 0, protoStack_1 = protoStack; _i < protoStack_1.length; _i++) {
              __proto__ = protoStack_1[_i];
              for (var key in __proto__) {
                  if (__proto__.hasOwnProperty(key)) {
                      if (isMeta(key)) {
                          this._publishedProperties.push(this[key]);
                      }
                  }
              }
          }
      };
      PropertyExt.prototype.resolvePublishedProxy = function (meta) {
          var item = this;
          while (meta instanceof MetaProxy) {
              item = item[meta.proxy];
              meta = item.publishedProperty(meta.method);
          }
          return meta;
      };
      PropertyExt.prototype.publishedProperties = function (includePrivate, expandProxies) {
          var _this = this;
          if (includePrivate === void 0) { includePrivate = false; }
          if (expandProxies === void 0) { expandProxies = false; }
          return this._publishedProperties.filter(function (meta) { return includePrivate || !isPrivate(_this, meta.id); }).map(function (meta) {
              if (expandProxies && isMetaProxy(meta)) {
                  var selfProp = meta;
                  var item = _this;
                  while (meta.type === "proxy") {
                      item = item[meta.proxy];
                      meta = item.publishedProperty(meta.method);
                  }
                  if (meta.id !== selfProp.id) {
                      meta = JSON.parse(JSON.stringify(meta)); //  Clone meta so we can safely replace the id.
                      meta.id = selfProp.id;
                  }
              }
              return meta;
          });
      };
      PropertyExt.prototype.widgetWalker = function (visitor) {
          var _this = this;
          visitor(this);
          this.publishedProperties(false, true).forEach(function (publishItem) {
              switch (publishItem.type) {
                  case "widget":
                      var widget = _this[publishItem.id]();
                      if (widget) {
                          widget.widgetWalker(visitor);
                      }
                      break;
                  case "widgetArray":
                  case "propertyArray":
                      var widgets = _this[publishItem.id]();
                      if (widgets) {
                          widgets.forEach(function (widget) {
                              widget.widgetWalker(visitor);
                          });
                      }
                      break;
              }
          });
      };
      PropertyExt.prototype.propertyWalker = function (visitor, filter) {
          var context = this;
          this.publishedProperties(false, true).forEach(function (publishItem) {
              if (typeof (filter) !== "function" || filter(context, publishItem)) {
                  visitor(context, publishItem);
              }
          });
      };
      PropertyExt.prototype.serialize = function () {
          var retVal = {
              __class: this.classID()
          };
          for (var _i = 0, _a = this.publishedProperties(); _i < _a.length; _i++) {
              var prop = _a[_i];
              if (prop.id === "fields")
                  continue;
              var val = this[prop.id]();
              switch (prop.type) {
                  case "propertyArray":
                      if (this[prop.id + "_modified"]()) ;
                      var serialization = val.filter(function (item) { return item.valid(); }).map(function (item) { return item.serialize(); }).filter(function (item) { return item !== undefined; });
                      if (serialization) {
                          retVal[prop.id] = serialization;
                      }
                      break;
                  case "widget":
                      retVal[prop.id] = val === null || val === void 0 ? void 0 : val.serialize();
                      break;
                  default:
                      if (this[prop.id + "_modified"]()) {
                          if (!(val instanceof Object)) {
                              retVal[prop.id] = val;
                          }
                      }
              }
          }
          return retVal;
      };
      PropertyExt.prototype.deserialize = function (props) {
          if (!props)
              return this;
          var _loop_1 = function (prop) {
              var val = props[prop.id];
              if (val !== undefined) {
                  switch (prop.type) {
                      case "propertyArray":
                          if (prop.ext && prop.ext.autoExpand) {
                              this_1["" + prop.id](val.map(function (item) { return new prop.ext.autoExpand().deserialize(item); }));
                          }
                          break;
                      case "widget":
                          var currVal = this_1["" + prop.id]();
                          if (currVal.classID() === val.__class) {
                              currVal.deserialize(val);
                          }
                          else {
                              console.log("Dynamic class initialization not supported.");
                          }
                          break;
                      default:
                          this_1["" + prop.id](val);
                  }
              }
          };
          var this_1 = this;
          for (var _i = 0, _a = this.publishedProperties(); _i < _a.length; _i++) {
              var prop = _a[_i];
              _loop_1(prop);
          }
          return this;
      };
      PropertyExt.prototype.publishedProperty = function (id) {
          return this[__meta_ + id];
      };
      PropertyExt.prototype.publishedModified = function () {
          return this.publishedProperties().some(function (prop) {
              return this[prop.id + "_modified"]();
          }, this);
      };
      PropertyExt.prototype.publishReset = function (privateArr, exceptionsArr) {
          privateArr = (privateArr || []).map(function (id) { return __meta_ + id; });
          exceptionsArr = (exceptionsArr || []).map(function (id) { return __meta_ + id; });
          for (var key in this) {
              if (isMeta(key)) {
                  var isPrivateItem = !privateArr.length || (privateArr.length && privateArr.indexOf(key) >= 0);
                  var isException = exceptionsArr.indexOf(key) >= 0;
                  if (isPrivateItem && !isException) {
                      this[__private_ + key] = true;
                  }
              }
          }
      };
      PropertyExt.prototype.publish = function (id, defaultValue, type, description, set, ext) {
          if (ext === void 0) { ext = {}; }
          if (id.indexOf("_") === 0) {
              id = id.slice(1);
          }
          if (this[__meta_ + id] !== undefined && !ext.override) {
              throw new Error(id + " is already published.");
          }
          var meta = this[__meta_ + id] = new Meta(id, defaultValue, type, description, set, ext);
          if (meta.ext.internal) {
              this[__private_ + id] = true;
          }
          Object.defineProperty(this, __prop_ + id, {
              set: function (_) {
                  if (_ === undefined) {
                      _ = null;
                  }
                  else if (_ === "" && meta.ext.optional) {
                      _ = null;
                  }
                  else if (_ !== null) {
                      _ = meta.checkedAssign.call(this, _);
                  }
                  this.broadcast(id, _, this[__prop_data_ + id]);
                  if (_ === null) {
                      delete this[__prop_data_ + id];
                  }
                  else {
                      this[__prop_data_ + id] = _;
                  }
              },
              get: function () {
                  if (this[id + "_disabled"]())
                      return this[id + "_default"]();
                  return this[__prop_data_ + id] !== undefined ? this[__prop_data_ + id] : this[id + "_default"]();
              },
              configurable: true
          });
          if (this[id]) ;
          else {
              if (type === "propertyArray") {
                  this[id] = function (_) {
                      var _this = this;
                      if (!arguments.length)
                          return this[__prop_ + id];
                      this[__prop_ + id] = _.map(function (item) {
                          if (!meta.ext.noDeserialize && meta.ext.autoExpand && !(item instanceof meta.ext.autoExpand)) {
                              item = new meta.ext.autoExpand().deserialize(item);
                          }
                          item.owner(_this);
                          return item;
                      });
                      return this;
                  };
              }
              else {
                  this[id] = function (_) {
                      if (!arguments.length)
                          return this[__prop_ + id];
                      this[__prop_ + id] = _;
                      return this;
                  };
              }
          }
          this[id + "_disabled"] = function () {
              return ext && ext.disable ? !!ext.disable(this) : false;
          };
          this[id + "_hidden"] = function () {
              return ext && ext.hidden ? !!ext.hidden(this) : false;
          };
          this[id + "_valid"] = function () {
              return ext && ext.validate ? this[id + "_disabled"]() || (ext.optional && !this[id + "_exists"]()) || (ext.autoExpand && !this.valid()) || !!ext.validate(this) : true;
          };
          this[id + "_modified"] = function () {
              if (type === "propertyArray") {
                  return this[__prop_data_ + id] && (this[__prop_data_ + id].some(function (item) { return item.valid(); }));
              }
              return this[__prop_data_ + id] !== undefined;
          };
          this[id + "_exists"] = function () {
              if (this[__prop_data_ + id] != null && !(this[__prop_data_ + id] === "" && ext.optional === true))
                  return true;
              if (this[id + "_default"]() != null && !(this[id + "_default"]() === "" && ext.optional === true))
                  return true;
              return false;
          };
          this[id + "_default"] = function (_) {
              if (!arguments.length)
                  return this[__default_ + id] !== undefined ? this[__default_ + id] : meta.defaultValue;
              if (_ === "") {
                  _ = null;
              }
              if (_ === null) {
                  delete this[__default_ + id];
              }
              else {
                  this[__default_ + id] = _;
              }
              return this;
          };
          this[id + "_reset"] = function () {
              switch (type) {
                  case "widget":
                      if (this[__prop_data_ + id]) {
                          this[__prop_data_ + id].target(null);
                      }
                      break;
                  case "widgetArray":
                      if (this[__prop_data_ + id]) {
                          this[__prop_data_ + id].forEach(function (widget) {
                              widget.target(null);
                          });
                      }
                      break;
              }
              switch (type) {
                  case "array":
                  case "widgetArray":
                  case "propertyArray":
                      this[__default_ + id] = this[id + "_default"]().map(function (row) { return row; });
                      break;
              }
              delete this[__prop_data_ + id];
              return this;
          };
          this[id + "_options"] = function () {
              if (typeof set === "function") {
                  var retVal = meta.ext.optional ? [null] : [];
                  return retVal.concat(set.apply(this, arguments));
              }
              return set;
          };
      };
      PropertyExt.prototype.publishWidget = function (prefix, WidgetType, id) {
          for (var key in WidgetType.prototype) {
              if (key.indexOf("__meta") === 0) {
                  var publishItem = WidgetType.prototype[key];
                  this.publishProxy(prefix + __prop_data_ + publishItem.id, id, publishItem.method || publishItem.id);
              }
          }
      };
      PropertyExt.prototype.publishProxy = function (id, proxy, method, defaultValue) {
          method = method || id;
          if (this[__meta_ + id] !== undefined) {
              throw new Error(id + " is already published.");
          }
          this[__meta_ + id] = new MetaProxy(id, proxy, method, defaultValue);
          this[id] = function (_) {
              if (!arguments.length)
                  return defaultValue === undefined || this[id + "_modified"]() ? this[proxy][method]() : defaultValue;
              if (defaultValue !== undefined && _ === defaultValue) {
                  this[proxy][method + "_reset"]();
              }
              else {
                  this[proxy][method](_);
              }
              return this;
          };
          this[id + "_disabled"] = function () {
              return this[proxy][method + "_disabled"]();
          };
          this[id + "_modified"] = function () {
              return this[proxy][method + "_modified"]() && (defaultValue === undefined || this[proxy][method]() !== defaultValue);
          };
          this[id + "_exists"] = function () {
              return this[proxy][method + "_exists"]();
          };
          this[id + "_default"] = function (_) {
              if (!arguments.length)
                  return this[proxy][method + "_default"]();
              this[proxy][method + "_default"](_);
              return this;
          };
          this[id + "_reset"] = function () {
              this[proxy][method + "_reset"]();
              return this;
          };
          this[id + "_options"] = function () {
              return this[proxy][method + "_options"]();
          };
      };
      PropertyExt.prototype.monitorProperty = function (propID, func) {
          var meta = this.publishedProperty(propID);
          switch (meta.type) {
              case "proxy":
                  if (this[meta.proxy]) {
                      return this[meta.proxy].monitorProperty(meta.method, function (_key, newVal, oldVal) {
                          func(meta.id, newVal, oldVal);
                      });
                  }
                  else {
                      return {
                          remove: function () { }
                      };
                  }
              default:
                  var idx_1 = this._watchArrIdx++;
                  this._watchArr[idx_1] = { propertyID: propID, callback: func };
                  var context_1 = this;
                  return {
                      remove: function () {
                          delete context_1._watchArr[idx_1];
                      }
                  };
          }
      };
      PropertyExt.prototype.monitor = function (func) {
          var _this = this;
          var idx = this._watchArrIdx++;
          this._watchArr[idx] = { propertyID: undefined, callback: func };
          return {
              remove: function () {
                  delete _this._watchArr[idx];
              }
          };
      };
      PropertyExt.prototype.broadcast = function (key, newVal, oldVal, source) {
          source = source || this;
          if (!deepEqual(newVal, oldVal)) {
              for (var idx in this._watchArr) {
                  var monitor = this._watchArr[idx];
                  if ((monitor.propertyID === undefined || monitor.propertyID === key) && monitor.callback) {
                      // console.log(`${this.classID()}->broadcast(${key}, ${newVal}, ${oldVal})`);
                      setTimeout(function (monitor2) {
                          monitor2.callback(key, newVal, oldVal, source);
                      }, 0, monitor);
                  }
              }
          }
      };
      PropertyExt.prototype.applyTheme = function (theme) {
          if (!theme) {
              return;
          }
          var clsArr = this._class.split(" ");
          for (var i in clsArr) {
              if (theme[clsArr[i]]) {
                  for (var paramName in theme[clsArr[i]]) {
                      if (paramName === "overrideTags" && theme[clsArr[i]][paramName] instanceof Object) {
                          for (var param in theme[clsArr[i]][paramName]) {
                              if (this.publishedProperty(paramName).ext) {
                                  this.publishedProperty(paramName).ext.tags = theme[clsArr[i]][paramName][param];
                              }
                          }
                          continue;
                      }
                      if (this.publishedProperty(paramName)) {
                          this.publishedProperty(paramName).defaultValue = theme[clsArr[i]][paramName];
                      }
                  }
              }
          }
      };
      PropertyExt.prototype.copyPropsTo = function (other, ignore) {
          var _this = this;
          if (ignore === void 0) { ignore = []; }
          this.publishedProperties(false).filter(function (meta) { return ignore.indexOf(meta.id) < 0; }).forEach(function (meta) {
              if (_this[meta.id + "_exists"]()) {
                  other[meta.id](_this[meta.id]());
              }
              else {
                  other[meta.id + "_reset"]();
              }
          });
          return this;
      };
      PropertyExt.prototype.metaHash = function (meta) {
          if (this[meta.id + "_exists"]()) {
              var value = this[meta.id]();
              var proxyMeta = this.resolvePublishedProxy(meta);
              switch (proxyMeta.type) {
                  case "widget":
                      value = value.hashSum();
                      break;
                  case "widgetArray":
                  case "propertyArray":
                      value = hashSum(value.map(function (v) { return v.hashSum(); }));
                      break;
              }
              return value;
          }
          return "";
      };
      PropertyExt.prototype.propertyHash = function (properties, more) {
          var _this = this;
          if (properties === void 0) { properties = []; }
          if (more === void 0) { more = {}; }
          var props = more;
          this.publishedProperties(false).filter(function (meta) { return properties.length === 0 || properties.indexOf(meta.id) >= 0; }).forEach(function (meta) {
              props[meta.id] = _this.metaHash(meta);
          });
          return hashSum(props);
      };
      PropertyExt.prototype.hashSum = function (ignore, more) {
          var _this = this;
          if (ignore === void 0) { ignore = []; }
          if (more === void 0) { more = {}; }
          ignore = __spreadArray(__spreadArray([], ignore), ["classed"]);
          var props = more;
          this.publishedProperties(false).filter(function (meta) { return ignore.indexOf(meta.id) < 0; }).forEach(function (meta) {
              props[meta.id] = _this.metaHash(meta);
          });
          return hashSum(props);
      };
      //  Events  ---
      PropertyExt.prototype.on = function (eventID, func, stopPropagation) {
          if (stopPropagation === void 0) { stopPropagation = false; }
          var context = this;
          this.overrideMethod(eventID, function () {
              var args = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                  args[_i] = arguments[_i];
              }
              var origFunc = args[args.length - 1];
              var retVal;
              if (stopPropagation) {
                  if (event && event.stopPropagation) {
                      event.stopPropagation();
                  }
                  [].push.call(args, origFunc);
              }
              else {
                  retVal = origFunc.apply(context, args);
              }
              var retVal2 = func.apply(context, args);
              return retVal2 !== undefined ? retVal2 : retVal;
          });
          return this;
      };
      PropertyExt.prevClassID = "";
      return PropertyExt;
  }(Class));
  PropertyExt.prototype._class += " common_PropertyExt";
  function publish(defaultValue, type, description, set, ext) {
      if (ext === void 0) { ext = {}; }
      return function (target, key) {
          if (!key)
              throw new Error("???");
          if (ext.reset) {
              target.publishReset();
          }
          target.publish(key, defaultValue, type, description, set, ext);
      };
  }

  //  Selection Bag(s)  ---
  var SelectionBase = /** @class */ (function () {
      function SelectionBase(widget) {
          //  Can't import Widget or SVGWidget as it breaks AMD loading...
          this.__widget = widget;
      }
      SelectionBase.prototype.svgGlowID = function () {
          if (this.__svgGlowID === undefined) {
              this.__svgGlowID = this.__widget.svgGlowID && this.__widget.svgGlowID() || "";
          }
          return this.__svgGlowID;
      };
      return SelectionBase;
  }());
  var SelectionBag = /** @class */ (function (_super) {
      __extends(SelectionBag, _super);
      function SelectionBag(widget) {
          var _this = _super.call(this, widget) || this;
          _this.click = function (item, evt) {
              if (evt.ctrlKey) {
                  if (this.items[item._id]) {
                      this.remove(item);
                  }
                  else {
                      this.append(item);
                  }
              }
              else {
                  this.clear();
                  this.append(item);
              }
          };
          _this.items = {};
          return _this;
      }
      SelectionBag.prototype.clear = function () {
          for (var key in this.items) {
              this.items[key].element()
                  .classed("selected", false)
                  .attr("filter", null);
          }
          this.items = {};
      };
      SelectionBag.prototype.isEmpty = function () {
          for (var _key in this.items) { // jshint ignore:line
              return false;
          }
          return true;
      };
      SelectionBag.prototype.append = function (item) {
          this.items[item._id] = item;
          item.element()
              .classed("selected", true)
              .attr("filter", this.svgGlowID() ? "url(#" + this.svgGlowID() + ")" : null);
      };
      SelectionBag.prototype.remove = function (item) {
          this.items[item._id].element()
              .classed("selected", false)
              .attr("filter", null);
          delete this.items[item._id];
      };
      SelectionBag.prototype.isSelected = function (item) {
          return this.items[item._id] !== undefined;
      };
      SelectionBag.prototype.get = function () {
          var retVal = [];
          for (var key in this.items) {
              retVal.push(this.items[key]);
          }
          return retVal;
      };
      SelectionBag.prototype.set = function (itemArray) {
          this.clear();
          itemArray.forEach(function (item) {
              this.append(item);
          }, this);
      };
      return SelectionBag;
  }(SelectionBase));
  var SimpleSelection = /** @class */ (function (_super) {
      __extends(SimpleSelection, _super);
      function SimpleSelection(widget, widgetElement, skipBringToTop) {
          var _this = _super.call(this, widget) || this;
          _this.widgetElement(widgetElement);
          _this.skipBringToTop(skipBringToTop);
          return _this;
      }
      SimpleSelection.prototype.widgetElement = function (_) {
          if (!arguments.length)
              return this._widgetElement;
          this._widgetElement = _;
          return this;
      };
      SimpleSelection.prototype.skipBringToTop = function (_) {
          if (!arguments.length)
              return this._skipBringToTop;
          this._skipBringToTop = _;
          return this;
      };
      SimpleSelection.prototype.enter = function (elements) {
          var context = this;
          elements
              .each(function (d) {
              var selected = context._initialSelection ? context._initialSelection.indexOf(JSON.stringify(d)) >= 0 : false;
              select$1(this)
                  .classed("selected", selected)
                  .classed("deselected", !selected)
                  .attr("filter", context.svgGlowID() && selected ? "url(#" + context.svgGlowID() + ")" : null);
          })
              .on("click.SimpleSelection", function () {
              context.click(this);
          })
              .on("mouseover.SimpleSelection", function () {
              context.mouseOver(this);
          })
              .on("mouseout.SimpleSelection", function () {
              context.mouseOut(this);
          });
      };
      SimpleSelection.prototype.click = function (domNode) {
          if (!this._skipBringToTop) {
              domNode.parentNode.appendChild(domNode);
          }
          var element = select$1(domNode);
          var wasSelected = element.classed("selected");
          this._widgetElement.selectAll(".selected")
              .classed("selected", false)
              .classed("deselected", true)
              .attr("filter", null);
          if (!wasSelected) {
              element
                  .classed("selected", true)
                  .classed("deselected", false)
                  .attr("filter", this.svgGlowID() ? "url(#" + this.svgGlowID() + ")" : null);
          }
          return !wasSelected;
      };
      SimpleSelection.prototype.mouseOver = function (domNode) {
          select$1(domNode)
              .classed("over", true);
      };
      SimpleSelection.prototype.mouseOut = function (domNode) {
          select$1(domNode)
              .classed("over", null);
      };
      SimpleSelection.prototype.selected = function (domNode) {
          return select$1(domNode).classed("selected");
      };
      SimpleSelection.prototype.selection = function (_) {
          if (!arguments.length) {
              var retVal_1 = [];
              if (this._widgetElement) {
                  this._widgetElement.selectAll(".selected")
                      .each(function (d) { retVal_1.push(JSON.stringify(d)); });
              }
              return retVal_1;
          }
          if (this._widgetElement) {
              var context_1 = this;
              this._widgetElement.selectAll(".selected,.deselected")
                  .each(function (d) {
                  var selected = _.indexOf(JSON.stringify(d)) >= 0;
                  select$1(this)
                      .classed("selected", selected)
                      .classed("deselected", !selected)
                      .attr("filter", context_1.svgGlowID() ? "url(#" + context_1.svgGlowID() + ")" : null);
              });
          }
          else {
              this._initialSelection = _;
          }
          return this;
      };
      return SimpleSelection;
  }(SelectionBase));
  function SimpleSelectionMixin(skipBringToTop) {
      this._selection = new SimpleSelection(this, null, skipBringToTop);
  }
  SimpleSelectionMixin.prototype.serializeState = function () {
      return {
          selection: this._selection.selection(),
          data: this.data()
      };
  };
  SimpleSelectionMixin.prototype.deserializeState = function (state) {
      if (state) {
          this._selection.selection(state.selection);
          if (state.data) {
              this.data(state.data);
          }
      }
      return this;
  };
  function removeHTMLFromString(str, div) {
      div = div ? div : document.createElement("div");
      div.innerHTML = str;
      return div.textContent || div.innerText || "";
  }
  function checksum(s) {
      if (s instanceof Array) {
          s = s.join("") + s.length;
      }
      switch (typeof s) {
          case "string":
              break;
          default:
              s = "" + s;
      }
      var chk = 0x12345678;
      for (var i = 0, l = s.length; i < l; ++i) {
          chk += (s.charCodeAt(i) * (i + 1));
      }
      return (chk & 0xffffffff).toString(16);
  }
  function debounce(func, threshold, execAsap) {
      if (threshold === void 0) { threshold = 100; }
      if (execAsap === void 0) { execAsap = false; }
      return function debounced() {
          var _dummyArgs = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              _dummyArgs[_i] = arguments[_i];
          }
          var obj = this || {};
          var args = arguments;
          function delayed() {
              if (!execAsap)
                  func.apply(obj, args);
              obj.__hpcc_debounce_timeout = null;
          }
          if (obj.__hpcc_debounce_timeout)
              clearTimeout(obj.__hpcc_debounce_timeout);
          else if (execAsap)
              func.apply(obj, args);
          obj.__hpcc_debounce_timeout = setTimeout(delayed, threshold);
      };
  }
  var g_fontSizeContext;
  var g_fontSizeContextCache = {};
  function textSize(_text, fontName, fontSize, bold) {
      if (fontName === void 0) { fontName = "Verdana"; }
      if (fontSize === void 0) { fontSize = 12; }
      if (bold === void 0) { bold = false; }
      g_fontSizeContext = globalCanvasContext();
      var text = _text instanceof Array ? _text : [_text];
      var hash = bold + "::" + fontSize + "::" + fontName + "::" + text.join("::");
      var retVal = g_fontSizeContextCache[hash];
      if (!retVal) {
          g_fontSizeContext.font = "" + (bold ? "bold " : "") + fontSize + "px " + fontName;
          g_fontSizeContextCache[hash] = retVal = {
              width: Math.max.apply(Math, text.map(function (t) { return g_fontSizeContext.measureText("" + t).width; })),
              height: fontSize * text.length
          };
      }
      return retVal;
  }
  var g_fontCanvas;
  var g_fontRectContextCache = {};
  function textRect(text, fontName, fontSize, bold) {
      if (fontName === void 0) { fontName = "Verdana"; }
      if (fontSize === void 0) { fontSize = 12; }
      if (bold === void 0) { bold = false; }
      // This function is relatively expensive and should be used conservatively
      g_fontCanvas = globalCanvasElement();
      g_fontSizeContext = globalCanvasContext();
      var hash = bold + "::" + fontSize + "::" + fontName + "::" + text;
      var retVal = g_fontRectContextCache[hash];
      if (!retVal) {
          var font = "" + (bold ? "bold " : "") + fontSize + "px '" + fontName + "'";
          g_fontSizeContext.font = font;
          var m = g_fontSizeContext.measureText(text);
          var w = g_fontCanvas.width = Math.ceil(m.width);
          var h = g_fontCanvas.height = fontSize * 1.5;
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          g_fontSizeContext.font = font;
          g_fontSizeContext.fillStyle = "black";
          g_fontSizeContext.textAlign = "start";
          g_fontSizeContext.textBaseline = "top";
          g_fontSizeContext.fillText(text, 0, 0);
          var top_1, right = void 0, bottom = void 0, left = 0;
          if (w > 0) {
              var data = g_fontSizeContext.getImageData(0, 0, w, h).data;
              for (var y = 0; y < h; y++) {
                  for (var x = 0; x < w; x++) {
                      var i = (x + y * w) * 4;
                      if (data[i + 3] !== 0) {
                          if (top_1 === undefined) {
                              top_1 = y;
                          }
                          if (left === undefined || left > x) {
                              left = x;
                          }
                          if (right === undefined || right < x) {
                              right = x;
                          }
                          bottom = y;
                      }
                  }
              }
          }
          retVal = {
              width: right - left + 1,
              height: bottom - top_1 + 1,
              top: top_1,
              right: right,
              bottom: bottom,
              left: left
          };
          g_fontRectContextCache[hash] = retVal;
      }
      return retVal;
  }
  function globalCanvasElement() {
      if (!g_fontCanvas) {
          g_fontCanvas = document.getElementById("hpcc_js_font_size");
          if (!g_fontCanvas) {
              g_fontCanvas = document.createElement("canvas");
              g_fontCanvas.id = "hpcc_js_font_size";
              document.body.appendChild(g_fontCanvas);
          }
      }
      return g_fontCanvas;
  }
  function globalCanvasContext() {
      if (!g_fontSizeContext) {
          g_fontCanvas = globalCanvasElement();
          g_fontSizeContext = g_fontCanvas.getContext("2d");
      }
      return g_fontSizeContext;
  }

  var d3Aggr = {
      min: d3Min,
      max: d3Max,
      mean: d3Mean,
      median: d3Median,
      variance: d3Variance,
      deviation: d3Deviation,
      sum: d3Sum
  };
  var lastFoundFormat = null;
  var Field = /** @class */ (function (_super) {
      __extends(Field, _super);
      function Field(id) {
          var _this = _super.call(this) || this;
          _this._children = [];
          _this._id = id || _this._id;
          return _this;
      }
      Field.prototype.owner = function (_) {
          if (!arguments.length)
              return this._owner;
          this._owner = _;
          return this;
      };
      Field.prototype.valid = function () {
          return !!this.label();
      };
      Field.prototype.checksum = function () {
          return checksum(this.label() + this.type() + this.mask() + this.format());
      };
      Field.prototype.typeTransformer = function (_) {
          switch (this.type()) {
              case "number":
                  return Number(_);
              case "string":
                  return String(_);
              case "boolean":
                  return typeof (_) === "string" && ["false", "off", "0"].indexOf(_.toLowerCase()) >= 0 ? false : Boolean(_);
              case "time":
              case "date":
                  return this.maskTransformer(_);
          }
          return _;
      };
      Field.prototype.maskTransformer = function (_) {
          return this.formatter(this.mask()).parse(String(_));
      };
      Field.prototype.formatTransformer = function (_) {
          return this.formatter(this.format())(_);
      };
      Field.prototype.parse = function (_) {
          if (!_) {
              return _;
          }
          try {
              return this.typeTransformer(_);
          }
          catch (e) {
              console.log("Unable to parse:  " + _);
              return null;
          }
      };
      Field.prototype.transform = function (_) {
          if (!_) {
              return _;
          }
          try {
              return this.formatTransformer(this.typeTransformer(_));
          }
          catch (e) {
              console.log("Unable to transform:  " + _);
              return null;
          }
      };
      Field.prototype.clone = function () {
          var context = this;
          var retVal = new Field(this._id);
          cloneProp(retVal, "label");
          cloneProp(retVal, "type");
          cloneProp(retVal, "mask");
          cloneProp(retVal, "format");
          function cloneProp(dest, key) {
              dest[key + "_default"](context[key + "_default"]());
              if (context[key + "_exists"]()) {
                  dest[key](context[key]());
              }
          }
          return retVal;
      };
      Field.prototype.formatter = function (format) {
          var retVal;
          if (!format) {
              retVal = function (_) {
                  return _;
              };
              retVal.parse = function (_) {
                  return _;
              };
              return retVal;
          }
          switch (this.type()) {
              case "time":
              case "date":
                  return timeFormat(format);
          }
          retVal = format$1(format);
          retVal.parse = function (_) {
              return _;
          };
          return retVal;
      };
      Field.prototype.children = function (_, asDefault) {
          if (_ === void 0)
              return this._children;
          this.type("nested");
          var fieldsArr = this._children;
          this._children = _.map(function (field, idx) {
              if (field instanceof Field) {
                  fieldsArr[idx] = field;
                  return field;
              }
              else if (typeof field === "string") {
                  if (asDefault) {
                      return (fieldsArr[idx] || new Field()).label_default(field);
                  }
                  else {
                      return (fieldsArr[idx] || new Field()).label(field);
                  }
              }
              else {
                  if (asDefault) {
                      return (fieldsArr[idx] || new Field())
                          .label_default(field.label)
                          .children(field.columns);
                  }
                  else {
                      return (fieldsArr[idx] || new Field())
                          .label(field.label)
                          .children(field.columns);
                  }
              }
          }, this);
          return this;
      };
      return Field;
  }(PropertyExt));
  Field.prototype._class += " common_Database.Field";
  Field.prototype.publish("label", "", "string", "Label", null, { optional: true });
  Field.prototype.publish("type", "", "set", "Type", ["", "string", "number", "boolean", "date", "time", "hidden", "nested"], { optional: true });
  Field.prototype.publish("mask", "", "string", "Time Mask", null, { disable: function (w) { return w.type() !== "time"; }, optional: true });
  Field.prototype.publish("format", "", "string", "Format", null, { optional: true });
  //  Grid  ---
  var Grid = /** @class */ (function (_super) {
      __extends(Grid, _super);
      function Grid(dataChecksum) {
          var _this = _super.call(this) || this;
          _this._data = [];
          _this._dataChecksums = [];
          dataChecksum = dataChecksum || false;
          _this._dataChecksum = dataChecksum;
          _this._dataVersion = 0;
          _this.clear();
          return _this;
      }
      Grid.prototype.clear = function () {
          this.fields([]);
          this._data = [];
          this._dataChecksums = [];
          ++this._dataVersion;
          return this;
      };
      //  Backward compatability  ---
      Grid.prototype.resetColumns = function () {
          var fields = this.fields();
          this.legacyColumns([]);
          this.legacyColumns(fields.map(function (field) {
              return field.label();
          }));
      };
      Grid.prototype.legacyColumns = function (_, asDefault) {
          if (!arguments.length)
              return this.row(0);
          this.row(0, _, asDefault);
          return this;
      };
      Grid.prototype.legacyData = function (_, _clone) {
          return Grid.prototype.data.apply(this, arguments);
      };
      //  Meta  ---
      Grid.prototype.schema = function () {
      };
      Grid.prototype.field = function (idx) {
          return this.fields()[idx];
      };
      Grid.prototype.fieldByLabel = function (_, ignoreCase) {
          return this.fields().filter(function (field, idx) {
              field.idx = idx;
              return ignoreCase ? field.label().toLowerCase() === _.toLowerCase() : field.label() === _;
          })[0];
      };
      Grid.prototype.data = function (_, clone) {
          if (!arguments.length)
              return this._data;
          this._data = clone ? _.map(function (d) { return d.map(function (d2) { return d2; }); }) : _;
          this._dataCalcChecksum();
          return this;
      };
      Grid.prototype.parsedData = function () {
          var context = this;
          return this._data.map(function (row) {
              return row.map(function (cell, idx) {
                  return context.fields()[idx].parse(cell);
              });
          });
      };
      Grid.prototype.formattedData = function () {
          var _this = this;
          return this._data.map(function (row) {
              return _this.fields().map(function (field, idx) {
                  return field.transform(row[idx]);
              });
          });
      };
      Grid.prototype.fieldsChecksum = function () {
          return checksum(this.fields().map(function (field) { return field.checksum(); }));
      };
      Grid.prototype.dataChecksum = function () {
          return checksum(this._dataChecksum ? this._dataChecksums : this._dataVersion);
      };
      Grid.prototype.checksum = function () {
          return checksum([this.dataChecksum(), this.fieldsChecksum()]);
      };
      //  Row Access  ---
      Grid.prototype._dataCalcChecksum = function (idx) {
          ++this._dataVersion;
          if (this._dataChecksum) {
              if (arguments.length) {
                  this._dataChecksums[idx] = checksum(this._data[idx]);
              }
              else {
                  this._dataChecksums = this._data.map(function (row) { return checksum(row); });
              }
          }
          return this;
      };
      Grid.prototype.row = function (row, _, asDefault) {
          if (arguments.length < 2)
              return row === 0 ? this.fields().map(function (d) { return d.label(); }) : this._data[row - 1];
          if (row === 0) {
              var fieldsArr_1 = this.fields();
              this.fields(_.map(function (field, idx) {
                  if (typeof field === "string") {
                      if (asDefault) {
                          return (fieldsArr_1[idx] || new Field()).label_default(field);
                      }
                      else {
                          return (fieldsArr_1[idx] || new Field()).label(field);
                      }
                  }
                  else {
                      if (asDefault) {
                          return (fieldsArr_1[idx] || new Field())
                              .label_default(field.label)
                              .children(field.columns);
                      }
                      else {
                          return (fieldsArr_1[idx] || new Field())
                              .label(field.label)
                              .children(field.columns);
                      }
                  }
              }, this));
          }
          else {
              this._data[row - 1] = _;
              this._dataCalcChecksum(row - 1);
          }
          return this;
      };
      Grid.prototype.rows = function (_) {
          if (!arguments.length)
              return [this.row(0)].concat(this._data);
          this.row(0, _[0]);
          this._data = _.filter(function (_row, idx) { return idx > 0; });
          this._dataCalcChecksum();
          return this;
      };
      //  Column Access  ---
      Grid.prototype.column = function (col, _) {
          if (arguments.length < 2)
              return [this.fields()[col].label()].concat(this._data.map(function (row, _idx) { return row[col]; }));
          _.forEach(function (d, idx) {
              if (idx === 0) {
                  this.fields()[col] = new Field().label(_[0]);
              }
              else {
                  this._data[idx - 1][col] = d;
                  this._dataCalcChecksum(idx - 1);
              }
          }, this);
          return this;
      };
      Grid.prototype.columnData = function (col, _) {
          if (arguments.length < 2)
              return this._data.map(function (row, _idx) { return row[col]; });
          _.forEach(function (d, idx) {
              this._data[idx][col] = d;
              this._dataCalcChecksum(idx);
          }, this);
          return this;
      };
      Grid.prototype.columns = function (_) {
          if (!arguments.length)
              return this.fields().map(function (_col, idx) {
                  return this.column(idx);
              }, this);
          _.forEach(function (_col, idx) {
              this.column(idx, _[idx]);
          }, this);
          return this;
      };
      //  Cell Access  ---
      Grid.prototype.cell = function (row, col, _) {
          if (arguments.length < 3)
              return this.row(row)[col];
          if (row === 0) {
              this.fields()[col] = new Field().label(_);
          }
          else {
              this._data[row][col] = _;
              this._dataCalcChecksum(row);
          }
          return this;
      };
      //  Grid Access  ---
      Grid.prototype.grid = function (_) {
          return Grid.prototype.rows.apply(this, arguments);
      };
      //  Hipie Helpers  ---
      Grid.prototype.hipieMappings = function (columns, missingDataString) {
          if (!this.fields().length || !this._data.length) {
              return [];
          }
          var mappedColumns = [];
          var hasRollup = false;
          columns.forEach(function (mapping, idx) {
              var mappedColumn = {
                  groupby: false,
                  func: "",
                  params: []
              };
              if (mapping.hasFunction()) {
                  mappedColumn.func = mapping.function();
                  if (mappedColumn.func === "SCALE") {
                      mappedColumn.groupby = true;
                  }
                  else {
                      hasRollup = true;
                  }
                  mapping.params().forEach(function (param) {
                      var field = this.fieldByLabel(param, true);
                      mappedColumn.params.push(field ? field.idx : -1);
                  }, this);
              }
              else {
                  mappedColumn.groupby = true;
                  var field = this.fieldByLabel(mapping.id(), true);
                  mappedColumn.params.push(field ? field.idx : -1);
              }
              mappedColumns.push(mappedColumn);
          }, this);
          if (hasRollup) {
              var retVal_1 = [];
              this.rollup(mappedColumns.filter(function (mappedColumn) {
                  return mappedColumn.groupby === true;
              }).map(function (d) {
                  return d.params[0];
              }), function (leaves) {
                  var row = mappedColumns.map(function (mappedColumn) {
                      var param1 = mappedColumn.params[0];
                      var param2 = mappedColumn.params[1];
                      switch (mappedColumn.func) {
                          case "SUM":
                              return d3Sum(leaves, function (d) { return d[param1]; });
                          case "AVE":
                              return d3Mean(leaves, function (d) { return d[param1] / d[param2]; });
                          case "MIN":
                              return d3Min(leaves, function (d) { return d[param1]; });
                          case "MAX":
                              return d3Max(leaves, function (d) { return d[param1]; });
                          case "SCALE":
                              console.log("Unexpected function:  " + mappedColumn.func);
                              //  All leaves should have the same values, use mean just in case they don't?
                              return d3Mean(leaves, function (d) { return d[param1] / +param2; });
                      }
                      //  All leaves should have the same value.
                      return leaves[0][param1];
                  });
                  retVal_1.push(row);
                  return row;
              });
              return retVal_1;
          }
          else {
              return this._data.map(function (row) {
                  return mappedColumns.map(function (mappedColumn) {
                      var param1 = mappedColumn.params[0];
                      var param2 = mappedColumn.params[1];
                      switch (mappedColumn.func) {
                          case "SCALE":
                              return row[param1] / +param2;
                          case "SUM":
                          case "AVE":
                          case "MIN":
                          case "MAX":
                              console.log("Unexpected function:  " + mappedColumn.func);
                      }
                      return row[param1];
                  });
              });
          }
      };
      Grid.prototype.legacyView = function () {
          return new LegacyView(this);
      };
      Grid.prototype.nestView = function (columnIndicies) {
          return new RollupView(this, columnIndicies);
      };
      Grid.prototype.rollupView = function (columnIndicies, rollupFunc) {
          return new RollupView(this, columnIndicies, rollupFunc);
      };
      Grid.prototype.aggregateView = function (columnIndicies, aggrType, aggrColumn, aggrDeltaColumn) {
          if (aggrDeltaColumn === void 0) { aggrDeltaColumn = ""; }
          var context = this;
          return new RollupView(this, columnIndicies, function (values) {
              switch (aggrType) {
                  case null:
                  case undefined:
                  case "":
                      values.aggregate = values.length;
                      return values;
                  default:
                      var columns = context.legacyColumns();
                      var colIdx_1 = columns.indexOf(aggrColumn);
                      var deltaIdx_1 = columns.indexOf(aggrDeltaColumn);
                      values.aggregate = d3Aggr[aggrType](values, function (value) {
                          return (+value[colIdx_1] - (deltaIdx_1 >= 0 ? +value[deltaIdx_1] : 0)) / (deltaIdx_1 >= 0 ? +value[deltaIdx_1] : 1);
                      });
                      return values;
              }
          });
      };
      //  Nesting  ---
      Grid.prototype._nest = function (columnIndicies, _rollup) {
          if (!(columnIndicies instanceof Array)) {
              columnIndicies = [columnIndicies];
          }
          var nest = d3Nest();
          columnIndicies.forEach(function (idx) {
              nest.key(function (d) {
                  return d[idx];
              });
          });
          return nest;
      };
      Grid.prototype.nest = function (columnIndicies) {
          return this._nest(columnIndicies)
              .entries(this._data);
      };
      Grid.prototype.rollup = function (columnIndicies, rollup) {
          return this._nest(columnIndicies)
              .rollup(rollup)
              .entries(this._data);
      };
      //  Util  ---
      Grid.prototype.length = function () {
          return this._data.length + 1;
      };
      Grid.prototype.width = function () {
          return this.fields().length;
      };
      Grid.prototype.pivot = function () {
          this.resetColumns();
          this.rows(this.columns());
          return this;
      };
      Grid.prototype.clone = function (deep) {
          return new Grid()
              .fields(this.fields(), deep)
              .data(this.data(), deep);
      };
      Grid.prototype.filter = function (filter) {
          var filterIdx = {};
          this.row(0).forEach(function (col, idx) {
              filterIdx[col] = idx;
          });
          return new Grid()
              .fields(this.fields(), true)
              .data(this.data().filter(function (row) {
              for (var key in filter) {
                  if (filter[key] !== row[filterIdx[key]]) {
                      return false;
                  }
              }
              return true;
          }));
      };
      Grid.prototype.analyse = function (columns) {
          if (!(columns instanceof Array)) {
              columns = [columns];
          }
          var retVal = [];
          columns.forEach(function (col) {
              var rollup = this.rollup(col, function (leaves) {
                  return leaves.length;
              });
              retVal.push(rollup);
              var keys = rollup.map(function (d) { return d.key; });
              this.fields()[col].isBoolean = typeTest(keys, isBoolean);
              this.fields()[col].isNumber = typeTest(keys, isNumber);
              this.fields()[col].isString = !this.fields()[col].isNumber && typeTest(keys, isString);
              this.fields()[col].isUSState = this.fields()[col].isString && typeTest(keys, isUSState);
              this.fields()[col].isDateTime = this.fields()[col].isString && typeTest(keys, isDateTime);
              this.fields()[col].isDateTimeFormat = lastFoundFormat;
              this.fields()[col].isDate = !this.fields()[col].isDateTime && typeTest(keys, isDate);
              this.fields()[col].isDateFormat = lastFoundFormat;
              this.fields()[col].isTime = this.fields()[col].isString && !this.fields()[col].isDateTime && !this.fields()[col].isDate && typeTest(keys, isTime);
              this.fields()[col].isTimeFormat = lastFoundFormat;
          }, this);
          return retVal;
      };
      //  Import/Export  ---
      Grid.prototype.jsonObj = function (_) {
          if (!arguments.length)
              return this._data.map(function (row) {
                  var retVal = {};
                  this.row(0).forEach(function (col, idx) {
                      retVal[col] = row[idx];
                  });
                  return retVal;
              }, this);
          this.clear();
          this.data(_.map(function (row) {
              var retVal = [];
              for (var key in row) {
                  var colIdx = this.row(0).indexOf(key);
                  if (colIdx < 0) {
                      colIdx = this.fields().length;
                      this.fields().push(new Field().label(key));
                  }
                  retVal[colIdx] = row[key];
              }
              return retVal;
          }, this));
          return this;
      };
      Grid.prototype.json = function (_) {
          if (!arguments.length)
              return JSON.stringify(this.jsonObj(), null, "  ");
          if (typeof (_) === "string") {
              _ = JSON.parse(_);
          }
          this.jsonObj(_);
          return this;
      };
      Grid.prototype.csv = function (_) {
          if (!arguments.length) {
              var temp_1 = document.createElement("div");
              return csvFormatRows(this.grid().map(function (row) {
                  return row.map(function (cell) {
                      return removeHTMLFromString(cell, temp_1);
                  });
              }));
          }
          this.jsonObj(csvParse$1(_));
          return this;
      };
      Grid.prototype.tsv = function (_) {
          if (!arguments.length)
              return tsvFormatRows(this.grid());
          this.jsonObj(tsvParse$1(_));
          return this;
      };
      return Grid;
  }(PropertyExt));
  Grid.prototype._class += " common_Database.Grid";
  Grid.prototype.publish("fields", [], "propertyArray", "Fields");
  var fieldsOrig = Grid.prototype.fields;
  Grid.prototype.fields = function (_, clone) {
      if (!arguments.length)
          return fieldsOrig.apply(this, arguments);
      return fieldsOrig.call(this, clone ? _.map(function (d) { return d.clone(); }) : _);
  };
  //  Views  ---
  var LegacyView = /** @class */ (function () {
      function LegacyView(grid) {
          this._grid = grid;
      }
      LegacyView.prototype.checksum = function () {
          var value = this._grid.on.apply(this._grid, arguments);
          return value === this._grid ? this : value;
      };
      LegacyView.prototype.fields = function () {
          var value = this._grid.on.apply(this._grid, arguments);
          return value === this._grid ? this : value;
      };
      LegacyView.prototype.grid = function () {
          return this._grid;
      };
      LegacyView.prototype.columns = function (_) {
          if (!arguments.length)
              return this._grid.legacyColumns();
          this._grid.legacyColumns(_);
          return this;
      };
      LegacyView.prototype.rawData = function (_) {
          if (!arguments.length)
              return this._grid.legacyData();
          this._grid.legacyData(_);
          return this;
      };
      LegacyView.prototype.formattedData = function () {
          if (this._formattedDataChecksum !== this._grid.checksum()) {
              this._formattedDataChecksum = this._grid.checksum();
              this._formattedData = this._grid.formattedData();
          }
          return this._formattedData;
      };
      LegacyView.prototype.parsedData = function () {
          if (this._parsedDataChecksum !== this._grid.checksum()) {
              this._parsedDataChecksum = this._grid.checksum();
              this._parsedData = this._grid.parsedData();
          }
          return this._parsedData;
      };
      LegacyView.prototype._whichData = function (opts) {
          if (opts) {
              if (opts.parsed) {
                  return this.formattedData();
              }
              else if (opts.formatted) {
                  return this.formattedData();
              }
          }
          return this.rawData();
      };
      LegacyView.prototype.data = function (_) {
          return LegacyView.prototype.rawData.apply(this, arguments);
      };
      return LegacyView;
  }());
  var RollupView = /** @class */ (function (_super) {
      __extends(RollupView, _super);
      function RollupView(grid, columns, rollup) {
          var _this = _super.call(this, grid) || this;
          if (!(columns instanceof Array)) {
              columns = [columns];
          }
          _this._columnIndicies = columns.filter(function (column) { return column; }).map(function (column) {
              switch (typeof column) {
                  case "string":
                      return this._grid.fieldByLabel(column).idx;
              }
              return column;
          }, _this);
          rollup = rollup || function (d) { return d; };
          _this._rollup = rollup;
          return _this;
      }
      RollupView.prototype.nest = function () {
          if (this._nestChecksum !== this._grid.checksum()) {
              this._nestChecksum = this._grid.checksum();
              var nest_1 = d3Nest();
              this._columnIndicies.forEach(function (idx) {
                  nest_1.key(function (d) {
                      return d[idx];
                  });
              });
              this._nest = nest_1
                  .rollup(this._rollup);
          }
          return this._nest;
      };
      RollupView.prototype.entries = function (opts) {
          return this.nest().entries(this._whichData(opts));
      };
      RollupView.prototype.map = function (opts) {
          return this.nest().map(this._whichData(opts));
      };
      RollupView.prototype.d3Map = function (opts) {
          return this.nest().map(this._whichData(opts), map$3);
      };
      RollupView.prototype._walkData = function (entries, prevRow) {
          if (prevRow === void 0) { prevRow = []; }
          var retVal = [];
          entries.forEach(function (entry) {
              if (entry instanceof Array) {
                  retVal.push(prevRow.concat([entry]));
              }
              else if (entry.values instanceof Array) {
                  retVal = retVal.concat(this._walkData(entry.values, prevRow.concat([entry.key])));
              }
              else if (entry.value instanceof Array) {
                  retVal = retVal.concat(this._walkData(entry.value, prevRow.concat([entry.key])));
              }
          }, this);
          return retVal;
      };
      RollupView.prototype.data = function (opts) {
          return this._walkData(this.entries(opts));
      };
      return RollupView;
  }(LegacyView));
  //  --- --- ---
  function typeTest(cells, test) {
      if (!(cells instanceof Array)) {
          cells = [cells];
      }
      return cells.filter(function (d) { return d !== ""; }).every(test);
  }
  function isBoolean(cell) {
      return typeof cell === "boolean";
  }
  function isNumber(cell) {
      return typeof cell === "number" || !isNaN(cell);
  }
  function isString(cell) {
      return typeof cell === "string";
  }
  var dateTimeFormats = [];
  var dateFormats = [
      "%Y-%m-%d",
      "%Y%m%d"
  ];
  var timeFormats = [
      "%H:%M:%S.%LZ",
      "%H:%M:%SZ",
      "%H:%M:%S"
  ];
  dateFormats.forEach(function (d) {
      timeFormats.forEach(function (t) {
          dateTimeFormats.push(d + "T" + t);
      });
  });
  function formatPicker(formats, cell) {
      for (var i = 0; i < formats.length; ++i) {
          var date = timeParse(formats[i])(cell);
          if (date) {
              lastFoundFormat = formats[i];
              return formats[i];
          }
      }
      return null;
  }
  function isDateTime(cell) {
      return formatPicker(dateTimeFormats, cell);
  }
  function isDate(cell) {
      return formatPicker(dateFormats, cell);
  }
  function isTime(cell) {
      return formatPicker(timeFormats, cell);
  }
  function isUSState(cell) {
      return ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "AS", "DC", "FM", "GU", "MH", "MP", "PW", "PR", "VI"].indexOf(String(cell).toUpperCase()) >= 0;
  }

/*   var css_248z$1 = ".common_Widget{font-family:Verdana,Geneva,sans-serif;font-size:12px}#hpcc_js_font_size{display:none}";
  styleInject(css_248z$1); */

  var widgetID = 0;
  var Widget = /** @class */ (function (_super) {
      __extends(Widget, _super);
      function Widget() {
          var _this = _super.call(this) || this;
          _this._isRootNode = true;
          _this._db = new Grid();
          _this._dataMeta = {};
          _this._appData = new Object({});
          //  Render  ---
          _this._prevNow = 0;
          _this._lazyRender = debounce(function (debouncedCallback) {
              this.render(debouncedCallback);
          }, 100);
          _this._class = Object.getPrototypeOf(_this)._class;
          _this._id = _this._idSeed + widgetID++;
          _this._db = new Grid();
          _this._pos = { x: 0, y: 0 };
          _this._size = { width: 0, height: 0 };
          _this._widgetScale = 1;
          _this._visible = true;
          _this._target = null;
          _this._placeholderElement = null;
          _this._parentWidget = null;
          _this._element = select$1(null);
          _this._renderCount = 0;
          if (window.__hpcc_debug) {
              if (window.g_all === undefined) {
                  window.g_all = {};
              }
              window.g_all[_this._id] = _this;
          }
          if (window.__hpcc_theme) {
              _this.applyTheme(window.__hpcc_theme);
          }
          return _this;
      }
      Widget.prototype.importJSON = function (_) {
          this._db.json(_);
          return this;
      };
      Widget.prototype.export = function (_) {
          if (_ === void 0) { _ = "JSON"; }
          switch (_) {
              case "CSV":
                  return this._db.csv();
              case "TSV":
                  return this._db.tsv();
              case "JSON":
              default:
                  return this._db.json();
          }
      };
      Widget.prototype.leakCheck = function (newNode) {
          var context = this;
          var watchArray = [newNode];
          var destructObserver = new MutationObserver(function (mutations) {
              var leaks = false;
              mutations.forEach(function (mutation) {
                  for (var i = 0; i < mutation.removedNodes.length; ++i) {
                      var node = mutation.removedNodes.item(i);
                      if (watchArray.indexOf(node) >= 0 && context._target) {
                          leaks = true;
                          destructObserver.disconnect();
                      }
                  }
              });
              if (leaks) {
                  console.log("leak:  " + context.id() + " - " + context.classID() + "\t\twidget.target(null); was not called for this widget before it was removed from the page.");
              }
          });
          var pNode = newNode.parentNode;
          while (pNode) {
              destructObserver.observe(pNode, { childList: true });
              watchArray.push(pNode);
              pNode = pNode.parentNode;
          }
      };
      Widget.prototype.renderCount = function () {
          return this._renderCount;
      };
      Widget.prototype.columns = function (_, asDefault) {
          if (!arguments.length)
              return this._db.legacyColumns();
          this._db.legacyColumns(_, asDefault);
          return this;
      };
      Widget.prototype.columnIdx = function (column) {
          return this.columns().indexOf(column);
      };
      Widget.prototype.cellIdxFunc = function (colIdx, defValue) {
          return colIdx < 0 ? function () { return defValue; } : function (row) { return row[colIdx]; };
      };
      Widget.prototype.cellFunc = function (column, defValue) {
          return this.cellIdxFunc(this.columnIdx(column), defValue);
      };
      Widget.prototype.parsedData = function () {
          return this._db.parsedData();
      };
      Widget.prototype.formattedData = function () {
          return this._db.formattedData();
      };
      Widget.prototype.data = function (_) {
          if (!arguments.length)
              return this._db.legacyData();
          this._db.legacyData(_);
          return this;
      };
      Widget.prototype.cloneData = function () {
          return this.data().map(function (row) { return row.slice(0); });
      };
      Widget.prototype.flattenData = function (columns, data) {
          if (columns === void 0) { columns = this.columns(); }
          if (data === void 0) { data = this.data(); }
          var retVal = [];
          data.forEach(function (row, rowIdx) {
              columns.filter(function (_col, idx) { return idx > 0; }).forEach(function (_col, idx) {
                  var val = row[idx + 1];
                  if (typeof val !== "undefined") {
                      var newItem = {
                          rowIdx: rowIdx,
                          colIdx: idx + 1,
                          label: row[0],
                          value: val
                      };
                      retVal.push(newItem);
                  }
              }, this);
          }, this);
          return retVal;
      };
      Widget.prototype.rowToObj = function (row) {
          if (!row)
              return {};
          var retVal = {};
          this.fields().forEach(function (field, idx) {
              retVal[field.label_default() || field.label()] = row[idx];
          });
          if (row.length === this.columns().length + 1) {
              retVal.__lparam = row[this.columns().length];
          }
          return retVal;
      };
      Widget.prototype.pos = function (_) {
          if (!arguments.length)
              return this._pos;
          this._pos = _;
          if (this._overlayElement) {
              this._overlayElement
                  .attr("transform", "translate(" + _.x + "," + _.y + ")scale(" + this._widgetScale + ")");
          }
          return this;
      };
      Widget.prototype.x = function (_) {
          if (!arguments.length)
              return this._pos.x;
          this.pos({ x: _, y: this._pos.y });
          return this;
      };
      Widget.prototype.y = function (_) {
          if (!arguments.length)
              return this._pos.y;
          this.pos({ x: this._pos.x, y: _ });
          return this;
      };
      Widget.prototype.size = function (_) {
          if (!arguments.length)
              return this._size;
          this._size = _;
          if (this._overlayElement) {
              this._overlayElement
                  .attr("width", _.width)
                  .attr("height", _.height);
          }
          return this;
      };
      Widget.prototype.width = function (_) {
          if (!arguments.length)
              return this._size.width;
          this.size({ width: _, height: this._size.height });
          return this;
      };
      Widget.prototype.height = function (_) {
          if (!arguments.length)
              return this._size.height;
          this.size({ width: this._size.width, height: _ });
          return this;
      };
      Widget.prototype.resize = function (size, delta) {
          if (delta === void 0) { delta = { width: 0, height: 0 }; }
          var width;
          var height;
          if (size && size.width && size.height) {
              width = size.width;
              height = size.height;
          }
          else {
              var style = window.getComputedStyle(this._target, null);
              width = parseFloat(style.getPropertyValue("width")) - delta.width;
              height = parseFloat(style.getPropertyValue("height")) - delta.height;
          }
          this.size({
              width: width,
              height: height
          });
          return this;
      };
      Widget.prototype.scale = function (_) {
          if (!arguments.length)
              return this._widgetScale;
          this._widgetScale = _;
          if (this._overlayElement) {
              this._overlayElement
                  .attr("transform", "translate(" + _.x + "," + _.y + ")scale(" + this._widgetScale + ")");
          }
          return this;
      };
      Widget.prototype.visible = function (_) {
          if (!arguments.length)
              return this._visible;
          this._visible = _;
          if (this._element) {
              this._element
                  .style("visibility", this._visible ? null : "hidden")
                  .style("opacity", this._visible ? null : 0);
          }
          return this;
      };
      Widget.prototype.display = function (_) {
          if (!arguments.length)
              return this._display;
          this._display = _;
          if (this._element) {
              this._element.style("display", this._display ? null : "none");
          }
          return this;
      };
      Widget.prototype.dataMeta = function (_) {
          if (!arguments.length)
              return this._dataMeta;
          this._dataMeta = _;
          return this;
      };
      Widget.prototype.appData = function (key, value) {
          if (arguments.length < 2)
              return this._appData[key];
          this._appData[key] = value;
          return this;
      };
      Widget.prototype.calcSnap = function (snapSize) {
          function snap(x, gridSize) {
              function snapDelta(x2, gridSize2) {
                  var dx = x2 % gridSize2;
                  if (Math.abs(dx) > gridSize2 - Math.abs(dx)) {
                      dx = (gridSize2 - Math.abs(dx)) * (dx < 0 ? 1 : -1);
                  }
                  return dx;
              }
              return x - snapDelta(x, gridSize);
          }
          var l = snap(this._pos.x - this._size.width / 2, snapSize);
          var t = snap(this._pos.y - this._size.height / 2, snapSize);
          var r = snap(this._pos.x + this._size.width / 2, snapSize);
          var b = snap(this._pos.y + this._size.height / 2, snapSize);
          var w = r - l;
          var h = b - t;
          return [{ x: l + w / 2, y: t + h / 2 }, { width: w, height: h }];
      };
      //  DOM/SVG Node Helpers  ---
      Widget.prototype.toWidget = function (domNode) {
          if (!domNode) {
              return null;
          }
          var element = select$1(domNode);
          if (element) {
              var widget = element.datum();
              if (widget && widget instanceof Widget) {
                  return widget;
              }
          }
          return null;
      };
      Widget.prototype.parentOverlay = function () {
          return null;
      };
      Widget.prototype.locateParentWidget = function (domNode) {
          domNode = domNode || (this._target ? this._target.parentNode : null);
          if (domNode) {
              var widget = this.toWidget(domNode);
              if (widget) {
                  return widget;
              }
              else if (domNode.parentNode) {
                  return this.locateParentWidget(domNode.parentNode);
              }
          }
          return null;
      };
      Widget.prototype.locateSVGNode = function (domNode) {
          if (!domNode) {
              return null;
          }
          if (domNode.tagName === "svg") {
              return domNode;
          }
          return this.locateSVGNode(domNode.parentNode);
      };
      Widget.prototype.locateOverlayNode = function () {
          var widget = this.locateParentWidget(this._target);
          while (widget) {
              var retVal = widget.parentOverlay();
              if (retVal) {
                  return retVal;
              }
              widget = this.locateParentWidget(widget._target.parentNode);
          }
          return null;
      };
      Widget.prototype.locateAncestor = function (classID) {
          return this.locateClosestAncestor([classID]);
      };
      Widget.prototype.locateClosestAncestor = function (classIDArr) {
          var widget = this.locateParentWidget(this._target);
          while (widget) {
              if (classIDArr.indexOf(widget.classID()) !== -1) {
                  return widget;
              }
              widget = this.locateParentWidget(widget._target.parentNode);
          }
          return null;
      };
      Widget.prototype.getAbsolutePos = function (domNode, w, h) {
          var root = this.locateSVGNode(domNode);
          if (!root) {
              return null;
          }
          var pos = root.createSVGPoint();
          var ctm = domNode.getCTM();
          pos = pos.matrixTransform(ctm);
          var retVal = {
              x: pos.x,
              y: pos.y
          };
          if (w !== undefined && h !== undefined) {
              var size = root.createSVGPoint();
              size.x = w;
              size.y = h;
              size = size.matrixTransform(ctm);
              retVal.width = size.x - pos.x;
              retVal.height = size.y - pos.y;
          }
          return retVal;
      };
      Widget.prototype.hasOverlay = function () {
          return this._overlayElement;
      };
      Widget.prototype.syncOverlay = function () {
          if (this._size.width && this._size.height) {
              var newPos = this.getAbsolutePos(this._overlayElement.node(), this._size.width, this._size.height);
              if (newPos && (!this._prevPos || newPos.x !== this._prevPos.x || newPos.y !== this._prevPos.y || newPos.width !== this._prevPos.width || newPos.height !== this._prevPos.height)) {
                  var xScale = newPos.width / this._size.width;
                  var yScale = newPos.height / this._size.height;
                  this._placeholderElement
                      .style("left", newPos.x - (newPos.width / xScale) / 2 + "px")
                      .style("top", newPos.y - (newPos.height / yScale) / 2 + "px")
                      .style("width", newPos.width / xScale + "px")
                      .style("height", newPos.height / yScale + "px");
                  var transform = "scale(" + xScale + "," + yScale + ")";
                  this._placeholderElement
                      .style("transform", transform)
                      .style("-moz-transform", transform)
                      .style("-ms-transform", transform)
                      .style("-webkit-transform", transform)
                      .style("-o-transform", transform);
              }
              this._prevPos = newPos;
          }
      };
      Widget.prototype.getBBox = function (refresh, round) {
          return {
              x: 0,
              y: 0,
              width: 0,
              height: 0
          };
      };
      Widget.prototype.textSize = function (_text, fontName, fontSize, bold) {
          if (fontName === void 0) { fontName = "Verdana"; }
          if (fontSize === void 0) { fontSize = 12; }
          if (bold === void 0) { bold = false; }
          return textSize(_text, fontName, fontSize, bold);
      };
      Widget.prototype.textRect = function (_text, fontName, fontSize, bold) {
          if (fontName === void 0) { fontName = "Verdana"; }
          if (fontSize === void 0) { fontSize = 12; }
          if (bold === void 0) { bold = false; }
          return textRect(_text, fontName, fontSize, bold);
      };
      Widget.prototype.element = function () {
          return this._element;
      };
      Widget.prototype.node = function () {
          return this._element.node();
      };
      Widget.prototype.target = function (_) {
          if (!arguments.length)
              return this._target;
          if (this._target && _) {
              throw new Error("Target can only be assigned once.");
          }
          if (_ === null) {
              this._target = null;
              if (this.renderCount()) {
                  this.exit();
              }
          }
          else if (typeof _ === "string") {
              this._target = document.getElementById(_);
          }
          else if (_ instanceof HTMLElement || _ instanceof SVGElement) {
              this._target = _;
          }
          return this;
      };
      Widget.prototype.isDOMHidden = function () {
          // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
          // Note:  Will return false for visible===hidden (which is ok as it still takes up space on the page)
          return this._isRootNode && this._placeholderElement.node().offsetParent === null;
      };
      Widget.prototype.hasSize = function () {
          return !isNaN(this.width()) && !isNaN(this.height());
      };
      Widget.prototype.publishedWidgets = function () {
          var widgets = [];
          this.publishedProperties(true).forEach(function (meta) {
              if (!meta.ext || meta.ext.render !== false) {
                  switch (meta.type) {
                      case "widget":
                          var widget = this[meta.id]();
                          if (widget) {
                              widgets.push(widget);
                          }
                          break;
                      case "widgetArray":
                          widgets = widgets.concat(this[meta.id]());
                          break;
                  }
              }
          }, this);
          return widgets;
      };
      Widget.prototype.render = function (callback) {
          if (window.__hpcc_debug) {
              var now = Date.now();
              if (now - this._prevNow < 500) {
                  console.log("Double Render:  " + (now - this._prevNow) + " - " + this.id() + " - " + this.classID());
              }
              this._prevNow = now;
          }
          callback = callback || function () { };
          if (!this._placeholderElement || !this.visible() || this.isDOMHidden() || !this.hasSize()) {
              callback(this);
              return this;
          }
          if (this._placeholderElement) {
              if (!this._tag)
                  throw new Error("No DOM tag specified");
              var elements = this._placeholderElement.selectAll("#" + this._id).data([this], function (d) { return d._id; });
              elements.enter().append(this._tag)
                  .classed(this._class, true)
                  .attr("id", this._id)
                  // .attr("opacity", 0.50)  //  Uncomment to debug position offsets  ---
                  .each(function (context2) {
                  context2._element = select$1(this);
                  context2.enter(this, context2._element);
                  if (window.__hpcc_debug) {
                      context2.leakCheck(this);
                  }
              })
                  .merge(elements)
                  .each(function (context2) {
                  var element = select$1(this);
                  var classed = context2.classed();
                  for (var key in classed) {
                      element.classed(key, classed[key]);
                  }
                  context2.preUpdate(this, context2._element);
                  context2.update(this, context2._element);
                  context2.postUpdate(this, context2._element);
              });
              elements.exit()
                  .each(function (context2) {
                  select$1(this).datum(null);
                  context2.exit(this, context2._element);
              })
                  .remove();
              this._renderCount++;
          }
          //  ASync Render Contained Widgets  ---
          var widgets = this.publishedWidgets();
          var context = this;
          switch (widgets.length) {
              case 0:
                  callback(this);
                  break;
              case 1:
                  widgets[0].render(function () {
                      callback(context);
                  });
                  break;
              default:
                  var renderCount_1 = widgets.length;
                  widgets.forEach(function (widget, _idx) {
                      setTimeout(function () {
                          widget.render(function () {
                              if (--renderCount_1 === 0) {
                                  callback(context);
                              }
                          });
                      }, 0);
                  });
                  break;
          }
          return this;
      };
      Widget.prototype.renderPromise = function () {
          var _this = this;
          return new Promise(function (resolve, reject) {
              _this.render(function (w) {
                  resolve(w);
              });
          });
      };
      Widget.prototype.lazyRender = function (callback) {
          this._lazyRender(callback);
          return this;
      };
      Widget.prototype.animationFrameRender = function () {
          var _this = this;
          if (requestAnimationFrame) {
              requestAnimationFrame(function () {
                  _this.render();
              });
          }
          else {
              //  Not a real replacement for requestAnimationFrame  ---
              this.renderPromise();
          }
          return this;
      };
      Widget.prototype.enter = function (_domNode, _element) { };
      Widget.prototype.preUpdate = function (_domNode, _element) { };
      Widget.prototype.update = function (_domNode, _element) { };
      Widget.prototype.postUpdate = function (_domNode, _element) { };
      Widget.prototype.exit = function (_domNode, _element) {
          this.publishedWidgets().forEach(function (w) { return w.target(null); });
      };
      return Widget;
  }(PropertyExt));
  Widget.prototype._class += " common_Widget";
  Widget.prototype._idSeed = "_w";
  Widget.prototype.publishProxy("fields", "_db", "fields");
  Widget.prototype.publish("classed", {}, "object", "HTML Classes", null, { tags: ["Private"] });
  var origClassed = Widget.prototype.classed;
  Widget.prototype.classed = function (str_obj, _) {
      var _a;
      if (typeof str_obj === "string") {
          if (arguments.length === 1)
              return origClassed.call(this)[str_obj];
          var classed = origClassed.call(this);
          origClassed.call(this, __assign(__assign({}, classed), (_a = {}, _a[str_obj] = _, _a)));
          return this;
      }
      return origClassed.apply(this, arguments);
  };

  var HTMLWidget = /** @class */ (function (_super) {
      __extends(HTMLWidget, _super);
      function HTMLWidget() {
          var _this = _super.call(this) || this;
          _this._drawStartPos = "origin";
          _this._tag = "div";
          _this._boundingBox = null;
          return _this;
      }
      HTMLWidget.prototype.calcFrameWidth = function (element) {
          var retVal = parseFloat(element.style("padding-left")) +
              parseFloat(element.style("padding-right")) +
              parseFloat(element.style("margin-left")) +
              parseFloat(element.style("margin-right")) +
              parseFloat(element.style("border-left-width")) +
              parseFloat(element.style("border-right-width"));
          return retVal;
      };
      HTMLWidget.prototype.calcWidth = function (element) {
          return parseFloat(element.style("width")) - this.calcFrameWidth(element);
      };
      HTMLWidget.prototype.calcFrameHeight = function (element) {
          var retVal = parseFloat(element.style("padding-top")) +
              parseFloat(element.style("padding-bottom")) +
              parseFloat(element.style("margin-top")) +
              parseFloat(element.style("margin-bottom")) +
              parseFloat(element.style("border-top-width")) +
              parseFloat(element.style("border-bottom-width"));
          return retVal;
      };
      HTMLWidget.prototype.calcHeight = function (element) {
          return parseFloat(element.style("height")) + this.calcFrameHeight(element);
      };
      HTMLWidget.prototype.hasHScroll = function (element) {
          element = element || this._element;
          return element.property("scrollWidth") > element.property("clientWidth");
      };
      HTMLWidget.prototype.hasVScroll = function (element) {
          element = element || this._element;
          return element.property("scrollHeight") > element.property("clientHeight");
      };
      HTMLWidget.prototype.clientWidth = function () {
          return this._size.width - this.calcFrameWidth(this._element);
      };
      HTMLWidget.prototype.clientHeight = function () {
          return this._size.height - this.calcFrameHeight(this._element);
      };
      HTMLWidget.prototype.getBBox = function (refresh, round) {
          if (refresh === void 0) { refresh = false; }
          if (round === void 0) { round = false; }
          if (refresh || this._boundingBox === null) {
              var domNode = this._element.node() ? this._element.node().firstElementChild : null; //  Needs to be first child, as element has its width/height forced onto it.
              if (domNode instanceof Element) {
                  var rect = domNode.getBoundingClientRect();
                  this._boundingBox = {
                      x: rect.left,
                      y: rect.top,
                      width: rect.width,
                      height: rect.height
                  };
              }
          }
          if (this._boundingBox === null) {
              return {
                  x: 0,
                  y: 0,
                  width: 0,
                  height: 0
              };
          }
          return {
              x: (round ? Math.round(this._boundingBox.x) : this._boundingBox.x) * this._widgetScale,
              y: (round ? Math.round(this._boundingBox.y) : this._boundingBox.y) * this._widgetScale,
              width: (round ? Math.round(this._boundingBox.width) : this._boundingBox.width) * this._widgetScale,
              height: (round ? Math.round(this._boundingBox.height) : this._boundingBox.height) * this._widgetScale
          };
      };
      HTMLWidget.prototype.reposition = function (pos) {
          // const retVal = super.reposition(pos);
          if (this._placeholderElement) {
              this._placeholderElement
                  .style("left", pos.x + "px")
                  .style("top", pos.y + "px");
          }
          return this;
      };
      HTMLWidget.prototype.resize = function (size) {
          var retVal = _super.prototype.resize.call(this, size);
          if (this._placeholderElement) {
              this._placeholderElement
                  .style("width", this._size.width + "px")
                  .style("height", this._size.height + "px");
          }
          return retVal;
      };
      HTMLWidget.prototype.target = function (_) {
          var _this = this;
          var retVal = _super.prototype.target.apply(this, arguments);
          if (arguments.length) {
              if (this._target instanceof SVGElement) {
                  //  Target is a SVG Node, so create an item in the Overlay and force it "over" the overlay element (cough)  ---
                  this._isRootNode = false;
                  var overlay = this.locateOverlayNode();
                  this._placeholderElement = overlay.append("div")
                      .style("position", "absolute")
                      .style("top", "0px")
                      .style("left", "0px")
                      .style("overflow", "hidden");
                  this._overlayElement = select$1(this._target);
                  this._prevPos = null;
                  this.observer = new MutationObserver(function (_mutation) {
                      _this.syncOverlay();
                  });
                  var domNode = this._overlayElement.node();
                  while (domNode) {
                      this.observer.observe(domNode, { attributes: true });
                      domNode = domNode.parentNode;
                  }
              }
              else if (this._target) { //  HTMLElement
                  this._placeholderElement = select$1(this._target);
                  if (!this._size.width && !this._size.height) {
                      var width = parseFloat(this._placeholderElement.style("width"));
                      var height = parseFloat(this._placeholderElement.style("height"));
                      this.size({
                          width: width,
                          height: height
                      });
                  }
                  this._placeholderElement = select$1(this._target).append("div");
              }
          }
          return retVal;
      };
      HTMLWidget.prototype.postUpdate = function (domNode, element) {
          _super.prototype.postUpdate.call(this, domNode, element);
          if (this._drawStartPos === "origin") {
              this._element
                  .style("position", "relative")
                  .style("left", this._pos.x + "px")
                  .style("top", this._pos.y + "px");
          }
          else {
              var bbox = this.getBBox(true);
              this._element
                  .style("position", "relative")
                  .style("float", "left")
                  .style("left", this._pos.x + (this._size.width - bbox.width) / 2 + "px")
                  .style("top", this._pos.y + (this._size.height - bbox.height) / 2 + "px");
          }
      };
      HTMLWidget.prototype.exit = function (domNode, element) {
          if (this.observer) {
              this.observer.disconnect();
          }
          this._prevPos = null;
          if (this._placeholderElement) {
              this._placeholderElement.remove();
          }
          _super.prototype.exit.call(this, domNode, element);
      };
      return HTMLWidget;
  }(Widget));
  HTMLWidget.prototype._class += " common_HTMLWidget";

  
  var css_248z$2 = ".observable-md_Observable .observablehq--inspect{background-color:#f5f5f5}.observable-md_Observable.hide-values .observablehq--inspect{display:none}.observable-md_Observable.hide-values .observablehq--error .observablehq--inspect{display:block}.observable-md_Observable .hljs{display:block;overflow-x:auto;padding:.5em;background:#f5f5f5}.observable-md_Observable .hljs-comment{color:var(--syntax_comment)}.observable-md_Observable .hljs-built_in{color:var(--syntax_known_variable)}.observable-md_Observable .hljs-doctag,.observable-md_Observable .hljs-keyword,.observable-md_Observable .hljs-name,.observable-md_Observable .hljs-section,.observable-md_Observable .hljs-selector-class,.observable-md_Observable .hljs-selector-id,.observable-md_Observable .hljs-selector-tag,.observable-md_Observable .hljs-strong,.observable-md_Observable .hljs-tag,.observable-md_Observable .hljs-type{color:var(--syntax_keyword)}.observable-md_Observable .hljs-deletion,.observable-md_Observable .hljs-variable{color:#e377c2}.observable-md_Observable .hljs-literal{color:var(--syntax_atom)}.observable-md_Observable .hljs-bullet,.observable-md_Observable .hljs-link,.observable-md_Observable .hljs-number,.observable-md_Observable .hljs-regexp{color:var(--syntax_number)}.observable-md_Observable .hljs-addition,.observable-md_Observable .hljs-meta,.observable-md_Observable .hljs-string,.observable-md_Observable .hljs-symbol,.observable-md_Observable .hljs-template-tag,.observable-md_Observable .hljs-template-variable{color:var(--syntax_string)}";
  styleInject(css_248z$2);

  function stringify(value) {
      if (value instanceof Element) {
          return value.outerHTML;
      }
      const type = typeof value;
      switch (type) {
          case "function":
              return "ƒ()";
          case "object":
              if (Array.isArray(value)) {
                  return "[Array]";
              }
              break;
      }
      if (value === null || value === void 0 ? void 0 : value.toString) {
          return value.toString();
      }
      return value;
  }
  function throttle(func, interval) {
      let timeout;
      return function () {
          const context = this;
          const args = arguments;
          const later = function () {
              timeout = false;
          };
          if (!timeout) {
              func.apply(context, args);
              timeout = true;
              setTimeout(later, interval);
          }
      };
  }
  class Observable extends HTMLWidget {
      constructor() {
          super();
          this._errors = [];
      }
      errors() {
          return this._errors;
      }
      update(domNode, element) {
          super.update(domNode, element);
          this._placeholderElement
              .style("width", null)
              .style("height", null);
          element
              .style("width", null)
              .style("height", null);
          element.classed("hide-values", !this.showValues() ? true : null);
          const hash = this.propertyHash(["mode", "text", "showValues"]);
          if (this._prevHash !== hash) {
              this._prevHash = hash;
              const context = this;
              const runtimeUpdated = throttle(function () {
                  context.runtimeUpdated();
              }, 500);
              element.html("");
              const runtime = this.mode() === "ojs" ? new OJSRuntime(domNode, this.plugins()) : new OMDRuntime(domNode, this.plugins());
              if (this._watcher) {
                  this._watcher.release();
              }
              this._watcher = runtime.watch(async (variableValues) => {
                  const vars = runtime.latest();
                  this._errors = vars.map(n => {
                      const { start, end } = n.variable.pos();
                      return new OJSRuntimeError(n.type, start, end, stringify(n.value));
                  });
                  runtimeUpdated();
              });
              runtime.evaluate("", this.text(), ".")
                  .catch((e) => {
                  this._errors = [new OJSRuntimeError("error", e.start, e.end, e.message)];
                  this.runtimeUpdated();
              });
          }
      }
      //  Events  ---
      runtimeUpdated() {
      }
  }
  __decorate([
      publish("ojs", "string", "Mode (ojs|omd)"),
      __metadata("design:type", Function)
  ], Observable.prototype, "mode", void 0);
  __decorate([
      publish("", "string", "OJS | OMD Text"),
      __metadata("design:type", Function)
  ], Observable.prototype, "text", void 0);
  __decorate([
      publish({}, "object", "Plugins"),
      __metadata("design:type", Function)
  ], Observable.prototype, "plugins", void 0);
  __decorate([
      publish(false, "boolean", "Show Observable Values"),
      __metadata("design:type", Function)
  ], Observable.prototype, "showValues", void 0);
  Observable.prototype._class += " observable-md_Observable";

  exports.BUILD_VERSION = BUILD_VERSION;
  exports.OJSModule = OJSModule;
  exports.OJSRuntime = OJSRuntime;
  exports.OJSRuntimeError = OJSRuntimeError;
  exports.OJSRuntimeNotification = OJSRuntimeNotification;
  exports.OJSSyntaxError = OJSSyntaxError;
  exports.OJSVariable = OJSVariable;
  exports.OJSVariableMessage = OJSVariableMessage;
  exports.OMDRuntime = OMDRuntime;
  exports.Observable = Observable;
  exports.PKG_NAME = PKG_NAME;
  exports.PKG_VERSION = PKG_VERSION;
  exports.calcRefs = calcRefs;
  exports.createFunction = createFunction;
  exports.encodeBacktick = encodeBacktick;
  exports.encodeMD = encodeMD;
  exports.encodeOMD = encodeOMD;
  exports.ojsParse = ojsParse;
  exports.omd2ojs = omd2ojs;
  exports.omdParse = omdParse;
  exports.renderTo = renderTo;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.full.js.map

