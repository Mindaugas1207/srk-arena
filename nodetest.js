var http = require('http');
var url = require('url');
var fs = require('fs');
var st = 0;
const { SerialPort } = require('serialport');

const EM_INPUT = 0;
const R_DOOR = 1;
const L_DOOR = 2;
const R_SW = 3;
const L_SW = 4;

// Create a port
const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 9600,
});

var t_seconds = 0;
var t_minutes = 0;

var t_start = new Date().getTime();
var t_period = 0;
var t_remaining = 0;
var sys_timer_end = false;
var sys_timer_pause = false;
var sys_timer_enabled = false;

var blinkInterval;
var blinkTimeout;
const SYS_START_NO = 0;
const SYS_START_PENDING = 1;
const SYS_START_OK = 2;
var sys_start_state = SYS_START_NO;
var sys_interval;
var sys_em_stop = false;
var sys_right_door = false;
var sys_left_door = false;
var sys_right_sw = false;
var sys_left_sw = false;

var sys_right_door_open = false;
var sys_left_door_open = false;

const ARRIVAL_TIME = 5; //min
const SYS_ARRIVAL_NO = 0;
const SYS_ARRIVAL_START = 1;
const SYS_ARRIVAL_END = 2;
var sys_arrival_state = SYS_ARRIVAL_NO;
var sys_arrival_compA = false;
var sys_arrival_compB = false;
var sys_arrival_interval;

const PREP_TIME = 2; //min
const SYS_PREP_NO = 0;
const SYS_PREP_START = 1;
const SYS_PREP_END = 2;
var sys_prep_state = SYS_PREP_NO;
var sys_prep_compA = false;
var sys_prep_compB = false;
var sys_prep_interval;

const MATCH_TIME = 5; //min
const SYS_MATCH_NO = 0;
const SYS_MATCH_START = 1;
const SYS_MATCH_END = 2;
var sys_match_state = SYS_MATCH_NO;

var sys_match_num = 0;
var sys_round_num = 0;
var sys_compA_name = "Dalyvis A";
var sys_compB_name = "Dalyvis B";
var sys_compA_pnts = 0;
var sys_compB_pnts = 0;
var sys_compA_arrived = false;
var sys_compB_arrived = false;
var sys_compA_ready = false;
var sys_compB_ready = false;

const SYS_STATE_INIT = 0;
const SYS_STATE_START = 1;
const SYS_STATE_ARRIVAL = 2;
const SYS_STATE_PREP = 3;
const SYS_STATE_MATCH = 4;
const SYS_STATE_IDLE = 5;
const SYS_STATE_DEMO = 6;
var sys_state = SYS_STATE_INIT;
var sys_next_state = SYS_STATE_INIT;
setTimeout(sys_start, 5000);

function sprint(str) {
    port.write(str, function(err) {
      if (err) {
        return console.log('ERROR:write:', err.message)
      }
    })
}

function leds_set(clr1_str, clr2_str, clr3_str) {
  var str = "SET:LED(" + clr1_str + ";" + clr2_str + ";" + clr3_str + ")\n";
  sprint(str);
}

function ramp_set(time_str) {
  var str = "SET:RMP(" + time_str + ")\n";
  sprint(str);
}

function blade_set(time_str, rev_str, auto_str, auto_time_str) {
  var str = "SET:SPN(" + time_str + "," + rev_str + "," + auto_str + "," + auto_time_str + ")\n";
  sprint(str);
}

// Open errors will be emitted as an error event
port.on('error', function(err) {
  console.log('Error: ', err.message)
})
// // Read data that is available but keep the stream in "paused mode"
port.on('readable', function () {
  let newData = port.read().toString();
  if (newData.startsWith("SET:INP("))
  {
    let res2 = newData.replace(/[^0-9,]/g, '')
    const myArray = res2.split(",");
    if (myArray.length == 5)
    {
      sys_em_stop = (myArray[EM_INPUT] == "1") ? true : false;
      sys_right_door = (myArray[R_DOOR] == "1") ? true : false;
      sys_left_door = (myArray[L_DOOR] == "1") ? true : false;
      sys_right_sw = (myArray[R_SW] == "1") ? true : false;
      sys_left_sw = (myArray[L_SW] == "1") ? true : false;
      input_update_states();
    }
  }
  else if (newData.startsWith("START_OK()"))
  {
    if (sys_start_state === SYS_START_PENDING)
    {
      sys_start_state = SYS_START_OK;
      console.log('SRV:', "SYS_START_OK");
    }
  }
  else if (newData.startsWith("OK"))
  {
    //ok
  }
  else
  {
    console.log('Data:', newData)
  }
})

http.createServer(function (req, res) {
    var q = url.parse(req.url, true);
    if (q.pathname == "/data")
    {
      var data = {
        "SEC": t_seconds,
        "MIN": t_minutes,
        "EM": sys_em_stop,
        "RD": sys_right_door,
        "LD": sys_left_door,
        "RS": sys_right_sw,
        "LS": sys_left_sw,
        "MATCH": sys_match_num,
        "ROUND": sys_round_num,
        "COMPA": sys_compA_name,
        "COMPB": sys_compB_name,
        "PNTA": sys_compA_pnts,
        "PNTB": sys_compB_pnts,
      }
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      return res.end(JSON.stringify(data, null, 3));
    }
    else if (q.pathname == "/confirmA")
    {
      sys_compA_arrived = true;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/confirmB")
    {
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/cancelA")
    {
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/cancelB")
    {
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/addA")
    {
      sys_compA_pnts += 1;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/addB")
    {
      sys_compB_pnts += 1;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/subA")
    {
      sys_compA_pnts -= 1;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/subB")
    {
      sys_compB_pnts -= 1;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/confirm")
    {
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/cancel")
    {
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/next")
    {
      sys_sw_state(sys_next_state);
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/back")
    {
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/pause")
    {
      pause_time();
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/resume")
    {
      resume_time();
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/stop")
    {
      cancel_time();
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/reset")
    {
      reset_time();
      res.writeHead(200);
      return res.end();
    }
    else
    {
      var filename = "." + q.pathname;
      fs.readFile(filename, function (err, data) {
          if (err) {
              res.writeHead(404, { 'Content-Type': 'text/html' });
              return res.end("404 Not Found");
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.write(data);
          return res.end();
      });
    }
}).listen(8080);

function startBlink(period, timeout, C1, C2, C3, _C1, _C2, _C3) {
  st = 0;
  blinkInterval = setInterval(blinkLED, period, C1, C2, C3, _C1, _C2, _C3);
  blinkTimeout = setTimeout(endBlink, timeout, _C1, _C2, _C3);
}

function blinkLED(C1, C2, C3, _C1, _C2, _C3) { //function to start blinking
  if (st === 0) { //check the pin state, if the state is 0 (or off)
    leds_set(C1,C2,C3);
    st = 1;
  } else {
    leds_set(_C1,_C2,_C3);
    st = 0;
  }
}

function endBlink(_C1,_C2,_C3) {
  clearInterval(blinkTimeout);
  clearInterval(blinkInterval);
  leds_set(_C1,_C2,_C3);
  st = 0;
}

function sys_start()
{
  sys_state = SYS_STATE_START;
  sys_start_state = SYS_START_PENDING;
  sprint("SYSTEM_START()\n");
  console.log('SRV:', "SYS_START_PENDING");
  sys_interval = setInterval(sys_run, 500);
}

function start_time(period)
{
  sys_timer_enabled = false;
  t_start = new Date().getTime();
  t_period = period;
  t_remaining = t_period;
  t_minutes = 0;
  t_seconds = 0;
  sys_timer_end = false;
  sys_timer_pause = false;
  sys_timer_enabled = true;
}

function pause_time()
{
  if (sys_timer_pause == true)
    return;
  check_time();
  sys_timer_pause = true;
}

function resume_time()
{
  if (sys_timer_pause == false)
    return;
  check_time();
  sys_timer_pause = false;
}

function cancel_time()
{
  sys_timer_enabled = false;
  t_remaining = 0;
  sys_timer_end = true;
  sys_timer_pause = false;
  t_minutes = 0;
  t_seconds = 0;
}

function reset_time()
{
  t_start = new Date().getTime();
  t_remaining = t_period;
  sys_timer_end = false;
  sys_timer_pause = false;
  sys_timer_enabled = true;
}

function run_time()
{
  if (sys_timer_enabled == false)
    return;

  var now = new Date().getTime();
  if (sys_timer_pause == false && sys_timer_end == false)
  {
    t_remaining = t_remaining - (now - t_start);
  }
  t_start = now;
  
  if (t_remaining <= 0)
  {
    t_remaining = 0;
    sys_timer_end = true;
    sys_timer_pause = false;
    t_minutes = 0;
    t_seconds = 0;
  }
  else
  {
    t_minutes = Math.floor((t_remaining % (1000 * 60 * 60)) / (1000 * 60));
    t_seconds = Math.floor((t_remaining % (1000 * 60)) / 1000);
  }
}

function check_time()
{
  return sys_timer_end;
}

function sys_run()
{
  run_time();

  if (sys_state === SYS_STATE_START)
  {
    if (sys_start_state === SYS_START_OK)
    {
      sys_state === SYS_STATE_IDLE;
    }
  }
  else if (sys_state === SYS_STATE_ARRIVAL)
  {
    arrival_run();
  }
  else if (sys_state === SYS_STATE_PREP)
  {
    prep_run();
  }
  else if (sys_state === SYS_STATE_MATCH)
  {
    match_run();
  }
  else if (sys_state === SYS_STATE_IDLE)
  {

  }
  else if (sys_state === SYS_STATE_DEMO)
  {
  }
}

function sys_sw_state(st)
{
  if (st === SYS_STATE_ARRIVAL)
  {
    arrival_start();
  }
  else if (st === SYS_STATE_PREP)
  {
    prep_start();
  }
  else if (st === SYS_STATE_MATCH)
  {
    match_start();
  }
}

function sys_end()
{
  clearInterval(sys_interval);
  sys_start_state = SYS_START_NO;
}

function arrival_start()
{
  start_time(ARRIVAL_TIME * 60000);
  sys_arrival_state = SYS_ARRIVAL_START;
  sys_state = SYS_STATE_ARRIVAL;
}

function arrival_run()
{
  if (sys_arrival_state === SYS_ARRIVAL_START)
  {
    if (check_time() == true)
    {
      sys_arrival_state = SYS_ARRIVAL_END;
      sys_next_state = SYS_STATE_PREP;
    }
    else
    {

    }
  }
}

function prep_start()
{
  start_time(PREP_TIME * 60000);
  sys_prep_state = SYS_PREP_START;
  sys_state = SYS_STATE_PREP;
}

function prep_run()
{
  if (sys_prep_state === SYS_PREP_START)
  {
    if (check_time() == true)
    {
      sys_prep_state = SYS_PREP_END;
      sys_next_state = SYS_STATE_MATCH;
    }
    else
    {
      
    }
  }
}

function match_start()
{
  start_time(MATCH_TIME * 60000);
  sys_match_state = SYS_MATCH_START;
  sys_state = SYS_STATE_MATCH;
}

function match_run()
{
  if (sys_match_state === SYS_MATCH_START)
  {
    if (check_time() == true)
    {
      sys_match_state = SYS_MATCH_END;
      sys_next_state = SYS_STATE_IDLE;
    }
    else
    {
      
    }
  }
}

function input_update_states()
{
  if (sys_right_door == sys_right_door_open || sys_left_door == sys_left_door_open)
  {
    sys_right_door_open = !sys_right_door;
    sys_left_door_open = !sys_left_door;

    if (sys_right_door_open || sys_left_door_open)
    {
      pause_time();
    }
    else
    {
      resume_time();
    }
  }

  if (sys_state === SYS_STATE_ARRIVAL)
  {

  }
  else if (sys_state === SYS_STATE_PREP)
  {

  }
  else if (sys_state === SYS_STATE_MATCH)
  {

  }
  else if (sys_state === SYS_STATE_IDLE)
  {

  }
  else if (sys_state === SYS_STATE_DEMO)
  {

  }
}

//blinkInterval = setInterval(blinkLED, 1000); //run the blinkLED function every 250ms
//ramp_set("2000");
//blade_set("5000", "0", "0", "0");
//setTimeout(endBlink, 20000); //stop blinking after 5 seconds
// function endBlink() { //function to stop blinking
//   clearInterval(blinkInterval); // Stop blink intervals
// }
