#!/bin/sh
PID_NODE="$(pidof node)"
awhile=3
if [  "$PID_NODE" != ""  ]; then
  kill $PID_NODE
else
  sleep $awhile && chromium-browser -kiosk http://localhost:8080/pagetest.html & 
  node nodetest.js &
fi
