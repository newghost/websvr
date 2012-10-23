REM Combine first
node tool/Combine.js -i makefile.list -o WebSvr.all.js

REM Then excute it
:start
node WebSvr.all.js

REM When error occured, restart the server.
REM goto start

pause;