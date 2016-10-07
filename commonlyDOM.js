/**
  @description 基于JavaScript实现CSS选择器选择DOM元素和集合一些常用的DOM属性\样式\Class操作、盒子读写、调整元素顺序、插入HTML\Text等方法
	@date 2016-10-7
	@email zeng_wen_bing@sina.com
**/

(function (win, undefined) {
  'use strict';

	var prev$ = win.$;
	var nativeSlice = Array.prototype.slice;
	var nativeToString = Object.prototype.toString;
	var matchTagExp = /<([a-z]+)[^>]*?>(.*?)<\/\1>/i;
	var matchSelectorExp = /^([.#]?)([\w-]+)$/i;

	var classTypeMap = {};
	['String', 'Number', 'Boolean', 'Function', 'Array', 'Object', 'Date', 'RegExp', 'Error'].forEach(function (type) {
	  classTypeMap['[object '+ type +']'] = type.toLowerCase();
	});

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

	var childrenParentTagNameMap = {
		'li': 'ul',
		'undefined': 'div'
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

	/**
   根据html创建element
	**/
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

	/**
   根据selector查找element
	**/
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

	InitSelector.prototype.each = function () {

	};

	function $ (selector, context) {
    return new InitSelector(selector, context);
	}

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
