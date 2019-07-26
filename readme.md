aria2 integration extension for chrome
======================================

Updated aria2 integration for new version of chrome.

Features
--------
This extension captures new download tasks and sends them to aria2
automatically, as per capturing rules you set (file size, file type,
 site whitelist, site blacklist)

It also adds a context menu item. Right click any link and select
"Download with aria2" to add the link to aria2 download queue.

Click the extension icon to reveal a quick view of tasks. Click a
progress bar area to pause/unpause a task or remove a completed/error task.

Requirements
------------
aria2c with RPC enabled. RPC user and password/RPC secret can be set in options. Also rpc-listen-all and rpc-allow-origin-all needs to be switched on.

Example: aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all=true
