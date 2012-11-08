REM Build websvr JS, and keep watching the changes
node tool/Combine.js -i makefile.list -o websvr.js

REM Combine complete, Goodbye.
pause;