REM start sitetest

:loop
  node svr/sitetest.js

  REM ***************************************
  REM Server stop working, restarting...
  REM ***************************************

  ping -n 2 127.1>nul
goto loop