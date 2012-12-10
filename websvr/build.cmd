REM Build websvr JS, and keep watching the changes
node tool/Combine.js -i MakeFile.list -o websvr.js -w

REM Combine complete, Goodbye.
pause;