#!/bin/bash
echo start sitetest

#change current dir, in order to call it from anywhere.
cd $(dirname $0)

while true; do
  node svr/sitetest.js

  echo ***************************************
  echo Server stop working, restarting...
  echo ***************************************

  sleep 2
done