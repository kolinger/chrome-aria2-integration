@echo off
del chrome-aria2-integration.zip
7z a chrome-aria2-integration.zip . -x!.git -x!.gitignore -x!.idea -x!build.cmd -x!readme.md
