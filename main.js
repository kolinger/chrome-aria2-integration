var settings = new Store('settings', {
	"rpcpath": "http://localhost:6800/jsonrpc",
	"rpcuser": "",
	"rpctoken": "",
	"filesizesetting": "500M",
	"whitelisttype": "",
	"whitelistsite": "",
	"blacklistsite": "",
	"captureCheckbox": true,
	"sizecaptureCheckbox": true
});

chrome.storage.local.set({"rpcpath": settings.get('rpcpath')});
chrome.storage.local.set({"rpcuser": settings.get('rpcuser')});
chrome.storage.local.set({"rpctoken": settings.get('rpctoken')});

//Binux
//https://github.com/binux

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
chrome.contextMenus.create(
	{
		title: 'Download with aria2',
		id: "linkclick",
		contexts: ['link']
	}
);

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

function isCapture(size, taburl, url, name) {
	"use strict";
	var bsites = settings.get('blacklistsite'), wsites = settings.get('whitelistsite');
	var re_bsites = convertListToRegex(bsites), re_wsites = convertListToRegex(wsites);

	var ftypes = settings.get('whitelisttype').toLowerCase();
	var Intype = ftypes.indexOf(name.split('.').pop().toLowerCase());

	var thsize = settings.get('filesizesetting');
	var thsizeprec = ['K', 'M', 'G', 'T'];
	var thsizebytes = thsize.match(/[\d.]+/)[0] * Math.pow(1024, thsizeprec.indexOf(thsize.match(/[a-zA-Z]+/)[0].toUpperCase()) + 1);

	var res;
	switch (true) {
		case url.substring(0, 5) === 'blob:':
			res = 0;
			break;
		case re_bsites.test(taburl):
			res = 0;
			break;
		case re_wsites.test(taburl):
			res = 1;
			break;
		case (Intype !== -1):
			res = 1;
			break;
		case (size >= thsizebytes && settings.get('sizecaptureCheckbox')):
			res = 1;
			break;
		default:
			res = 0;
	}

	return res;
}

function captureAdd(item, taburl) {
	"use strict";
	if (isCapture(item.fileSize, taburl, item.url, item.filename) === 1) {
		getCookies(item.url, function (cookies) {
			var aria2 = new ARIA2(settings.get('rpcpath')),
				params = {};

			params.referer = taburl;
			params.header = "Cookie:" + cookies;
			params.out = item.filename;

			chrome.downloads.cancel(item.id, function () {
				var url = item.url;
				if (url === 'about:blank') {
					url = item.finalUrl;
				}
				if (aria2.addUri(url, params)) {
					showNotification();
				}
			});
		});
	}
}

chrome.downloads.onCreated.addListener(function (Item) {
	"use strict";
	if (settings.get('captureCheckbox')) {
		chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
			captureAdd(Item, tabs[0].url);
		});
	}
});
