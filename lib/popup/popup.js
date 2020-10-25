function bytesToSize(bytes, precision) {
	var kilobyte = 1024;
	var megabyte = kilobyte * 1024;
	var gigabyte = megabyte * 1024;
	var terabyte = gigabyte * 1024;

	if ((bytes >= 0) && (bytes < kilobyte)) {
		return bytes + ' B';

	} else if ((bytes >= kilobyte) && (bytes < megabyte)) {
		return (bytes / kilobyte).toFixed(precision) + ' KB';

	} else if ((bytes >= megabyte) && (bytes < gigabyte)) {
		return (bytes / megabyte).toFixed(precision) + ' MB';

	} else if ((bytes >= gigabyte) && (bytes < terabyte)) {
		return (bytes / gigabyte).toFixed(precision) + ' GB';

	} else if (bytes >= terabyte) {
		return (bytes / terabyte).toFixed(precision) + ' TB';

	} else {
		return bytes + ' B';
	}
}

Number.prototype.toHHMMSS = function () {
	var sec_num = parseInt(this, 10); // don't forget the second param
	if (isNaN(sec_num) || sec_num === null) {
		time = '-';
		return time;
	} else {
		var hours = Math.floor(sec_num / 3600);
		var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
		var seconds = sec_num - (hours * 3600) - (minutes * 60);

		if (hours < 10) {
			hours = "0" + hours;
		}
		if (minutes < 10) {
			minutes = "0" + minutes;
		}
		if (seconds < 10) {
			seconds = "0" + seconds;
		}
		time = hours + 'h' + minutes + 'm' + seconds + 's';
		time = time.replace(/00[\w]{1}/g, '');
		if (isNaN(hours) && isNaN(minutes) && isNaN(seconds)) {
			time = '∞';
		}
		return time;
	}
};

function capitaliseFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

Object.defineProperty(Array.prototype, "prepend", {
	enumerable: false,
	configurable: false,
	writable: false,
	value: function (e) {
		if (e !== '') {
			this.unshift(e);
		}
		return this;
	}
});

var token = settings.get('rpctoken');
var user = settings.get('rpcuser');
var endpoint = settings.get('rpcpath');
if (user) {
	endpoint = endpoint.replace(/(:\/\/)/g, '$1' + user + ':' + token + '@');
	token = '';
} else {
	if (token) {
		token = 'token:' + token;
	} else {
		token = '';
	}
}

$.jsonRPC.setup({
	endPoint: endpoint,
	namespace: 'aria2'
});

function aria2CMD(c, i) {
	chrome.storage.local.get(null, function (obj) {
		$.jsonRPC.request(c, {
			params: [i].prepend(token)
		})
	});
}

// add new task manually
function addurisubmit() {
	var toadduri = (e_taskaddbox.value === '' ? e_taskaddbatch.value.split('\n') : e_taskaddbox.value.split('\n'));
	for (var i = 0, urilen = toadduri.length; i < urilen; i++) {
		var uri_i = toadduri[i];
		aria2CMD('addUri', [uri_i]);
	}
	e_addtaskctn.style.display = 'none';
	e_addbtn.value = 'Add';
}

function addmoretoggle() {
	if (e_addmore.value === '>>') {
		e_taskaddbox.style.display = 'none';
		e_taskaddbatch.style.display = 'inline-block';
		e_addmore.value = '<<';
	} else {
		e_taskaddbox.style.display = 'inline-block';
		e_taskaddbatch.style.display = 'none';
		e_addmore.value = '>>';
	}
}

function addtasktoggle() {
	e_addtaskctn.style.display = (e_addtaskctn.style.display !== 'none' ? 'none' : '');
	e_addbtn.value = (e_addbtn.value === 'Add' ? 'Cancel' : 'Add');
	e_taskaddbox.style.display = 'inline-block';
	e_taskaddbatch.style.display = 'none';
	e_addmore.value = '>>';
}

//event binding
var e_purgebtn = document.getElementById('purgebtn'), e_addbtn = document.getElementById('addbtn');
var e_addtask = document.getElementById("addtask");
var e_addmore = document.getElementById('addmore');
var e_addtaskctn = document.getElementById("addtaskcontainer");
var e_taskaddbox = document.getElementById("taskaddbox");
var e_taskaddbatch = document.getElementById("taskaddbatch");
var e_tasklist = document.getElementById('tasklist');
var headInfotpl = document.getElementById('headInfo').innerHTML;
var taskInfotpl = document.getElementById('taskInfo').innerHTML;
var e_globalstat = document.getElementById('globalstat');

e_purgebtn.addEventListener("click", function () {
	aria2CMD('purgeDownloadResult', '')
}, false);
e_addbtn.addEventListener("click", function () {
	addtasktoggle();
}, false);
e_addmore.addEventListener("click", function () {
	addmoretoggle();
}, false);
e_addtask.addEventListener("submit", function (e) {
	addurisubmit();
	e.preventDefault();
}, false);

$(e_tasklist).on("click", "button.removebtn", function () {
	var taskStatus = $(this).attr('class').split(' ')[0], taskId = $(this).attr('id').split('_').pop(), meth;
	switch (taskStatus) {
		case 'active':
		case 'waiting':
		case 'paused':
			meth = 'forceRemove';
			break;
		case 'error':
		case 'complete':
		case 'removed':
			meth = 'removeDownloadResult';
			break;
	}
	aria2CMD(meth, taskId);
});

$(e_tasklist).on("click", "div.progbar", function () {
	var taskStatus = $(this).attr('class').split(' ')[0], taskId = $(this).attr('id').split('_').pop(), meth;
	switch (taskStatus) {
		case 'active':
		case 'waiting':
			meth = 'pause';
			break;
		case 'error':
		case 'complete':
		case 'removed':
			meth = 'removeDownloadResult';
			break;
		case 'paused':
			meth = 'unpause';
			break;
	}
	aria2CMD(meth, taskId);
});

Mustache.parse(headInfotpl);
Mustache.parse(taskInfotpl);

var capture = document.getElementById('capture');
capture.value = 'Capture: ' + (settings.get('captureCheckbox') ? 'ON' : 'OFF');
capture.addEventListener("click", function () {
	var value = !settings.get('captureCheckbox');
	settings.set('captureCheckbox', value);
	writeUI();
}, false);

function writeUI() {
	chrome.storage.local.get(null, function (obj) {
		$.jsonRPC.request('getGlobalStat', {
			params: [token],
			success: function (result) {
				// headline part
				var res = result.result;
				var tplpart = {};
				if (res.downloadSpeed === 0) {
					tplpart.globspeed = '';
				} else {
					tplpart.globspeed = bytesToSize(res.downloadSpeed, 2) + '/s';
				}
				e_globalstat.innerHTML = Mustache.render(headInfotpl, res, tplpart);

				var capture = document.getElementById('capture');
				if (settings.get('captureCheckbox')) {
					if (capture.value.indexOf('ON') === -1) {
						capture.value = 'Capture: ON';
					}
				} else {
					if (capture.value.indexOf('OFF') === -1) {
						capture.value = 'Capture: OFF';
					}
				}

				var rquestParams = ["status", "gid", "completedLength", "totalLength", "files", "connections", "dir", "downloadSpeed", "bittorrent", "uploadSpeed", "numSeeders"];
				$.jsonRPC.batchRequest([
					{
						method: 'tellActive',
						params: [rquestParams].prepend(token)
					},
					{
						method: 'tellWaiting',
						params: [0, parseInt(res.numWaiting), rquestParams].prepend(token)
					},
					{
						method: 'tellStopped',
						params: [0, parseInt(res.numStopped), rquestParams].prepend(token)
					}
				], {
					success: function (result) {
						var activeRes = result[0].result, waitRes = result[1].result, stopRes = result[2].result;
						if (activeRes.length + waitRes.length + stopRes.length === 0 && !$(document).find('.tasktitle').length) {
							e_tasklist.innerHTML = 'Empty task list';
						} else {
							printTask(result);
						}
					}
				});
			}
		})
	})
}

function printTask(res) {
	var taskInfohtml = '', reslen = res.length;
	for (var i = 0; i < reslen; i++) {
		var r = res[i].result, rlen = r.length, files, taskid, tplpart = {}, etasec;
		for (var j = 0; j < rlen; j++) {
			files = r[j].files;
			taskid = r[j].gid;
			if (r[j].bittorrent && r[j].bittorrent.info && r[j].bittorrent.info.name) {
				tplpart.displayName = r[j].bittorrent.info.name;  /*display name */
			} else {
				tplpart.displayName = files[0].path.split("/").pop()
			}
			if (r[j].bittorrent) {
				tplpart.upspeedPrec = ' (up:' + bytesToSize(r[j].uploadSpeed, 2) + '/s)';
				tplpart.numSeedersf = '/' + r[j].numSeeders.toString() + ' seeds';
			} else {
				tplpart.upspeedPrec = '';
				tplpart.numSeedersf = '';
			}
			tplpart.dlspeedPrec = bytesToSize(r[j].downloadSpeed, 2);
			tplpart.tlengthPrec = bytesToSize(r[j].totalLength, 2);
			tplpart.clengthPrec = bytesToSize(r[j].completedLength, 2);
			tplpart.completeRatio = parseFloat(r[j].completedLength / r[j].totalLength * 100, 2).toFixed(2).toString();
			etasec = (r[j].totalLength - r[j].completedLength) / r[j].downloadSpeed;
			tplpart.eta = etasec.toHHMMSS();
			tplpart.statusUpper = capitaliseFirstLetter(r[j].status);
			if (isNaN(r[j].completedLength) || r[j].completedLength === 0) {
				tplpart.p = '0%';
			} else {
				tplpart.p = parseFloat(r[j].completedLength / r[j].totalLength * 100, 2).toFixed(2).toString() + '%';
			}
			taskInfohtml += Mustache.render(taskInfotpl, r[j], tplpart);
		}
	}
	e_tasklist.innerHTML = taskInfohtml;// write to html
}

writeUI();
setInterval(writeUI, 1000);
