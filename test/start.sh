#!/bin/bash
echo "start sitetest"

while true; do
  node svr/sitetest.js

  echo "exit, press any kep to continue..."
  read -N1
done