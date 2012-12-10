#!/bin/bash
echo "Build websvr JS, and keep watching the changes"
node tool/Combine.js -i MakeFile.list -o websvr.js -w

echo "Combine complete, Goodbye."
sleep 10