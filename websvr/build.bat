REM Build websvr JS, and keep watching the changes
node tool/Combine.js -i makefile.list -o websvr.js -w

REM Combine complete, Goodbye.
pause;