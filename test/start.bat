REM start sitetest

:loop
node svr/sitetest.js

REM waiting...
pause;

goto loop; 