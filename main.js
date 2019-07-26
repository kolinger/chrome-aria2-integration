var ARIA2 = (function () {
	"use strict";

	function get_auth(url) {
		return url.match(/^(?:(?![^:@]+:[^:@\/]*@)[^:\/?#.]+:)?(?:\/\/)?(?:([^:@]*(?::[^:@]*)?)?@)?/)[1];
	}

	function request(jsonrpc_path, method, params) {
		var jsonrpc_version = '2.0', xhr = new XMLHttpRequest(), auth = get_auth(jsonrpc_path);
		var request_obj = {
			jsonrpc: jsonrpc_version,
			method: method,
			id: (new Date()).getTime().toString()
		};
		if (params) {
			request_obj.params = params;
		}
		xhr.open("POST", jsonrpc_path + "?tm=" + (new Date()).getTime().toString(), true);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
		if (settings.get('rpcuser')) {
			xhr.setRequestHeader("Authorization", "Basic " + btoa(settings.get('rpcuser') + ':' + settings.get('rpctoken')));
		} else {
			if (settings.get('rpctoken')) {
				request_obj.params = ['token:' + settings.get('rpctoken')].concat(request_obj.params);
			}
		}
		xhr.send(JSON.stringify(request_obj));
	}

	return function (jsonrpc_path) {
		this.jsonrpc_path = jsonrpc_path;
		this.addUri = function (uri, options) {
			if (!(/^https?:\/\//.test(uri))) {
				showError('Invalid URL: ' + uri);
				return false;
			}
			request(this.jsonrpc_path, 'aria2.addUri', [[uri], options]);
			return true;
		};
		return this;
	};
}());

function showNotification() {
	"use strict";
	var notfopt = {
		type: "basic",
		title: "Aria2 Integration",
		iconUrl: "icons/notificationicon.png",
		message: "The download has been sent to aria2 queue"
	};
	chrome.notifications.create("senttoaria2", notfopt);
	window.setTimeout(function () {
		chrome.notifications.clear("senttoaria2");
	}, 3000);
}

function showError(message) {
	"use strict";
	var notfopt = {
		type: "basic",
		title: "Aria2 Integration",
		iconUrl: "icons/notificationicon.png",
		message: 'ERROR: ' + message
	};
	chrome.notifications.create("error", notfopt);
	window.setTimeout(function () {
		chrome.notifications.clear("error");
	}, 3000);
}

// context menu module
chrome.contextMenus.removeAll(function () {
	chrome.contextMenus.create(
		{
			title: 'Download with aria2',
			id: "linkclick",
			contexts: ['link']
		}
	);
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
	"use strict";
	if (info.menuItemId === "linkclick") {
		chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
			getCookies(info.linkUrl, function (cookies) {
				var aria2 = new ARIA2(settings.get('rpcpath'));
				var params = {};
				params.referer = tabs[0].url;
				params.header = "Cookie:" + cookies;
				if (aria2.addUri(info.linkUrl, params)) {
					showNotification();
				}
			});
		});
	}
});


function getCookies(url, callback) {
	var result = '';
	chrome.cookies.getAll({'url': url}, function (cookies) {
		for (i = 0; i < cookies.length; i++) {
			var cookie = cookies[i];
			result += cookie.name + '=' + cookie.value + ';';
		}
		callback(result)
	})
}

//Auto capture module
function convertListToRegex(list) {
	var regex;
	if (list === '') {
		regex = new RegExp('^\\s$', 'g');
	} else {
		list = list.trim();
		list = list.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		list = list.replace(/[,\n]/g, '|');
		list = list.replace(/\|{2,}/g, '|');
		list = list.replace(/\s+/g, '');
		list = list.replace(/\\\*/g, '[^ ]*');
		regex = new RegExp(list, 'gi');
	}
	return regex;
}

function validate(size, taburl, url, name) {
	"use strict";

	if (url.substring(0, 5) === 'blob:') {
		return false;
	}

	var regex = convertListToRegex(settings.get('blacklistsite'));
	if (regex.test(taburl) || regex.test(url)) {
		return false;
	}

	regex = convertListToRegex(settings.get('whitelistsite'));
	if (regex.test(taburl) || regex.test(url)) {
		return true;
	}

	regex = convertListToRegex(settings.get('whitelisttype'));
	if (regex.test(name)) {
		return true;
	}

	if (settings.get('sizecaptureCheckbox')) {
		var max = settings.get('filesizesetting');
		var suffixes = ['K', 'M', 'G', 'T'];
		max = max.match(/[\d.]+/)[0] * Math.pow(1024, suffixes.indexOf(max.match(/[a-zA-Z]+/)[0].toUpperCase()) + 1);
		if (size >= max) {
			return true;
		}
	}

	return false;
}

function captureAdd(item, taburl) {
	"use strict";

	var url = item.finalUrl ? item.finalUrl : item.url;
	var name = item.filename;
	if (!name) {
		name = url.split(/[\\/]/).pop();
	}

	if (validate(item.fileSize, taburl, url, name)) {
		getCookies(item.url, function (cookies) {
			var aria2 = new ARIA2(settings.get('rpcpath')),
				params = {};

			params.referer = taburl;
			params.header = "Cookie:" + cookies;
			params.out = item.filename;

			chrome.downloads.cancel(item.id, function () {
				if (aria2.addUri(url, params)) {
					showNotification();
				}
			});
		});
	}
}

chrome.downloads.onDeterminingFilename.addListener(function (Item) {
	"use strict";
	if (settings.get('captureCheckbox')) {
		chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
			captureAdd(Item, tabs[0].url);
		});
	}
});
