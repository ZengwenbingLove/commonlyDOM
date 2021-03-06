/**
  @description 基于JavaScript实现CSS选择器选择DOM元素和集合一些常用的DOM属性\样式\Class操作、盒子模型读写、调整元素顺序、插入HTML\Text等方法
  @date 2016-10-7
  @email zeng_wen_bing@sina.com
**/

(function (win, undefined) {
  'use strict';

  var prev$ = win.$;

  var nativeSlice = Array.prototype.slice;
  var nativeToString = Object.prototype.toString;
  var nativeKeys = Object.keys;

  var matchTagExp = /<([a-z]+)[^>]*?>(.*?)<\/\1>/i;
  var matchSelectorExp = /^([.#]?)([\w-]+)$/i;

  var specialCSSProperties = [
    'line-height', 'zoom', 'z-index',
    'font-weight', 'opacity'
  ];

  var childrenParentTagNameMap = {
    'li': 'ul',
    'undefined': 'div'
  };

  var classTypeMap = {};
  ['String', 'Number', 'Boolean', 'Function', 'Array', 'Object', 'Date', 'RegExp', 'Error'].forEach(function (type) {
    classTypeMap['[object '+ type +']'] = type.toLowerCase();
  });

  /**
   全局/公共方法
  **/
  var getType = function (entry) {
    if (entry == null) {
      return String(entry);
    } else if (entry && entry.nodeType === 1 || entry.nodeType === 9) {
      return 'element';
    } else if (entry && entry.self === window) {
      return 'window';
    } else {
      return classTypeMap[naviveToString.call(entry)];
    }
  };

  var toArray = function (likeArray) {
    if (getType(likeArray) === 'array') {
      return likeArray;
    } else if (likeArray && 'length' in likeArray) {
      return nativeSlice.call(likeArray);
    } else {
      return [ likeArray ];
    }
  };

  var each = function (entry, iteratee) {
    var isArray = getType(entry) === 'array';
    var collections = isArray ? entry : nativeKeys(entry);

    for (var i = 0, length = collections.length; i < length; i++) {
      var item = isArray ? collections[i] : entry[collections[i]];
      var key = isArray ? i : collections[i];

      if (iteratee.call(item, key, item, entry) === false) {
        return;
      }
    }
  };

  var blankSplit = function (str) {
    return str.trim().split(/\s+/);
  };

  var camelCase = function (str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  };

  var getRealValue = function (value) {
    return
      value === 'true'
      || value === 'false'
        ? false
        : +value + '' === value
          ? +value
          : value === 'null'
            ? null
            : getType(value) === 'object' || getType(value) === 'array' && JSON.stringify(value);
  };

  var filterIndexRange = function (index, length) {
    return index < 0
     ? index += length
     : length - 1;
  };

  /**
    事件 Api
  **/
  var addEventListener = function (el, eventName, addHandler) {
    if (getType(eventName) === 'string') {
      eventName = blankSplit(eventName);
    }

    if (!getEvents(el)) {
      el.eventListeners = {};
    }

    each(eventName, function (index, name) {
      (getEvents(el)[name] || (getEvents(el)[name] = [])).push(addHandler);
      el.addEventListener(name, addHandler, false);
    });
  };

  var removeEventListener = function (el, eventName, removeHandle) {
    if (!getEvents(el)) {
      return;
    }

    var addedHandlers = getEvents(el)[eventName];
    var handlers = clearEventListener(getEvents(el)[eventName], removeHandle);

    getEvents(el)[eventName] = handlers;

    each(addedHandlers, function (index, handler) {
      if (handler === removeHandle) {
        el.removeEventListener(eventName, handler);
      }

      return false;
    });
  };

  var clearEventListener = function (handlers, removeHandler) {
    return handlers.filter(function (handler, index) {
      return handler !== removeHandler;
    });
  };

  var getEvents = function (el) {
    return el.eventListeners;
  };

  /**
    CSS Api
  **/
  var implicitCSSAccessor = function (el) {
    return document
      .defaultView
      .getComputedStyle(el, null)
      .getPropertyValue;
  };

  var getCSS = function (el, cssName) {
    var formatCSSName = camelCase(cssName);

    return el.style[formatCSSName] || implicitCSSAccessor(el)(formatCSSName);
  };

  var setCSS = function (el, cssName, cssValue) {
    if (getType(cssName) === 'object') {
      cssValue = JSON.stringify(cssName).replace(/[{}'"]/g, '').replace(/,/, ';');
      el.style.cssText += cssValue;
    } else {
      cssName = camelCase(cssName);
      var isSpecialCSSProperty = specialCSSProperties.find(cssName);

      if (!isSpecialCSSProperty && /^\d+$/.test(cssValue)) {
        cssValue = cssValue + 'px';
      }

      el.style[cssName] = cssValue;
    }
  };

  /**
    Dom Class Api
  **/
  var classApi = function (context, method, className, isToggle) {
    if (!className) {
      if (method === 'add') {
        return context;
      }

      return context.removeAttr('class');
    }

    return context.each(function () {
      if (getType(className) === 'function') {
        className = className(this.className);

        if (!className) {
          return false;
        }
      }

      var el = this;
      className = blankSplit(className);

      each(className, function (index, name) {
        isToggle == null
          ? this.classList[method](name);
          : this.classList.toggle(name, isToggle);
      });
    });
  };

  // 根据html创建element
  var createElement = function (html) {
    var tagName, children;

    // 如果匹配到输入合法的html tag
    if (matchTagExp.test(html)) {
      tagName = RegExp.$1.toLowerCase();
      children = RegExp.$2.toLowerCase();
    } else {
      tagName = 'div';
      children = '';
    }

    // 通过创建临时父节点，捕获当前html的tagName创建的节点插入到临时父节点
    // 通过获取临时父节点的lastElementChild来转换当前html为dom
    var tmpParentTagName = childrenParentTagNameMap[tagName];
    var tmpParent = document.createElement(tmpParentTagName);
    var tmpEl = document.createElement(tagName);
    tmpEl.insertAdjacentHTML('beforeEnd', children);
    tmpParent.appendChild(tmpEl);

    return tmpParent.lastElementChild;
  };

  // 根据selector查找element
  var findElement = function (selector, context) {
    context || (context = document);
    var dom;

    // 如果是class、id、html tag选择器里的各一种
    if (matchSelectorExp.test(selector)) {
      var mark = RegExp.$1;
      var name = RegExp.$2;

      if (mark === '.') {
        dom = context.getElementsByClassName(name);
      } else if (mark === '#') {
        dom = [ context.getElementById(name) ];
      } else {
        dom = context.getElementsByTagName(name);
      }
    } else {
      dom = context.querySelectorAll(selector);
    }

    if (!dom) {
      dom = [];
    }

    return toArray(dom);
  };

  /**
   selector constructor
  **/
  function InitSelector (selector, context) {
    var type = getType(selector);

    if (type === 'string') {
      if (selector.charAt(0) === '<') {
        this.dom = [ createElement(selector) ]
      } else {
        this.dom = findElement(selector, context);
      }
    } else if (type === 'element') {
      this.dom = [ selector ];
    } else if (type === 'array') {
      this.dom = selector;
    } else if (type === 'function') {
      return this.ready(selector);
    } else if (selector instanceof InitSelector) {
      return selector;
    } else {
      this.dom = [];
    }

    this.length = this.dom.length;
  }

  InitSelector.prototype.ready = function (handle) {
    this.dom = [ document ];
    this.length = 1;

    return this.on('DOMContentLoaded', handle);
  };

  InitSelector.prototype.each = function (iteratee) {
    $.each(this.dom, function (index, el) {
      return iteratee.call(this, index, el);
    });

    return this;
  };

  InitSelector.prototype.get = function (index) {
    if (getType(index) === 'undefined') {
      return this.dom;
    }

    index = filterIndexRange(index);

    return this.dom[index];
  };

  InitSelector.prototype.index = function (index) {
    var constructor = this.constructor;

    if (getType(index) === 'undefined') {
      return new constructor(this.dom);
    }

    index = filterIndexRange(index);

    return new constructor(this.dom[index]);
  };

  InitSelector.prototype.bind = InitSelector.prototype.on = function (eventName, addHandler) {
    this.each(this.dom, function (index, el) {
      addEventListener(el, eventName, addHandler);
    });

    return this;
  };

  InitSelector.prototype.unbind = InitSelector.prototype.off = function () {
    this.each(this.dom, function (index, el) {
      removeEventListener(el, eventName, addHandler);
    });

    return this;
  };

  InitSelector.prototype.attr = function (attrName, attrValue) {
    var self = this;

    if (attrValue == null && getType(attrName) !== 'object') {
      // get
      return self.get(0)[attrName] == null
       ? self.get(0).getAttribute(attrName)
       : self.get(0)[attrName];
    } else {
      // set
      if (getType(attrName) === 'object') {
        each(attrName, function (name, value) {
          self.attr(name, value);
        });

        return this;
      } else {
        return self.each(function (index, el) {
          if (getType(attrValue) === 'function') {
            attrValue = attrValue(el.getAttribute(attrName));
          }

          el.setAttribute(attrName, attrValue);
        });
      }
    }
  };

  InitSelector.prototype.removeAttr = function (attrName) {
    attrName = blankSplit(attrName);

    this.each(function (index, el) {
      each(attrName, function (idx, name) {
        el.removeAttribute(name);
      });
    });
  };

  InitSelector.prototype.css = function (cssName, cssValue) {
    if (cssValue == null && getType(cssName) !== 'object') {
      return getCSS(this.get(0), cssName);
    } else {
      return this.each(function (index, el) {
        setCSS(el, cssName, cssValue);
      });
    }
  }

  InitSelector.prototype.data = function (name, value) {
    name = 'data-' + camelCase(name);

    if (value == null) {
      return getRealValue(this.attr(name));
    }

    return this.attr(name, value);
  };

  InitSelector.prototype.addClass = function (className) {
    return classApi(this, 'add', className);
  };

  InitSelector.prototype.removeClass = function (className) {
    return classApi(this, 'remove', className);
  };

  InitSelector.prototype.toggleClass = function (className, mark) {
    return classApi(this, 'toggle', className, mark || false);
  };

  InitSelector.prototype.hasClass = function (className) {
    return this.get(0).classList.contains(className);
  };

  InitSelector.prototype.position = function () {
    var offset = this.offset();
    var offsetParent = el.offsetParent();
    var offsetParentOffset = $(offsetParent).offset();

    return {
      left: offset.left - offsetParentOffset.left,
      top: offset.top - offsetParentOffset.top
    };
  };

  InitSelector.prototype.offset = function () {
    var el = this.get(0);
    var ownerElement = (el.ownerElement || el).documentElement;
    var clientTop = ownerElement.clientTop;
    var clientLeft = ownerElement.clientLeft;
    var scrollTop = window.pageXOffset || ownerElement.scrollTop;
    var scrollLeft = window.pageYOffset || ownerElement.scrollLeft;
    var boundingRect = el.getBoundingClientRect();

    return {
      left: boundingRect.left + scrollLeft - clientLeft,
      top: boundingRect.top + scrollTop - clientTop,
      right: boundingRect.right + scrollLeft - clientLeft,
      bottom: boundingRect.bottom + scrollTop - clientTop,
      width: boundingRect.width,
      height: boundingRect.height
    }
  };


  /**
   export
  **/
  function $ (selector, context) {
    return new InitSelector(selector, context);
  }

  $.each = each;

  $.ready = function () {
    var args = toArray(arguments);
    var callback = args[0];

    win.addEventListener('DOMContentLoaded', function () {
      callback.apply($, args.slice(1));
    });
  };

  $.noConflict = function () {
    if (prev$) {
      win.$ = prev$;
    }

    return this;
  };

  win.$ = $;
})(window, void 0);
