#!/bin/sh
PID_NODE="$(pidof node)"
PID_CH="$(pidof chromium-browser)"
awhile=3
if [  "$PID_NODE" != ""  ]; then
  kill $PID_NODE
  while kill -0 $PID_NODE; do 
    sleep 1
  done
fi
if [  "$PID_CH" != ""  ]; then
  kill $PID_CH
  while kill -0 $PID_CH; do 
    sleep 1
  done
fi
sleep $awhile && chromium-browser -kiosk --no-sandbox http://localhost:8080/pagetest.html & 
node nodetest.js &
