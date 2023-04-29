var http = require('http');
var https = require('https');
const querystring = require('querystring');
var url = require('url');
var fs = require('fs');
var st = 0;
const { SerialPort } = require('serialport');

const EM_INPUT = 0;
const R_DOOR = 1;
const L_DOOR = 2;
const R_SW = 3;
const L_SW = 4;

const LEDA = 1;
const LEDB = 2;
const LEDC = 0;

const COLOR_RED = "FF,00,00";
const COLOR_GREEN = "00,FF,00";
const COLOR_BLUE = "00,00,FF";
const COLOR_YELLOW = "FF,FF,00";
const COLOR_PURPLE = "FF,00,FF";
const COLOR_WHITE = "FF,FF,FF";
const COLOR_OFF = "00,00,00";

// Create a port
const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 9600,
});
function open () {
  port.open(function (err) {
    if (!err)
    {
      setTimeout(sys_start, 5000);
      return;
    }
      
    setTimeout(open, 5000); // next attempt to open after 10s
  });
}

function reopen()
{
  port.close(function (err) {
    console.log('port closed', err);
    setTimeout(open, 5000);
  });
}



var t_seconds = 0;
var t_minutes = 0;
var t_start = new Date().getTime();
var t_period = 0;
var t_remaining = 0;
var sys_timer_end = false;
var sys_timer_pause = false;
var sys_timer_enabled = false;

var t_secondsA = 0;
var t_minutesA = 0;
var t_startA = new Date().getTime();
var t_remainingA = 0;
var sys_timer_endA = false;
var sys_timer_enabledA = false;

var t_secondsB = 0;
var t_minutesB = 0;
var t_startB = new Date().getTime();
var t_remainingB = 0;
var sys_timer_endB = false;
var sys_timer_enabledB = false;

var sys_demo_allow_spin = false;
var sys_demo_allow_ramp = false;

var sys_weapons_on = false;
var sys_weapons_on_req = false;


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
const ARRIVAL_WARN_TIME = 10; //s
const ARRIVAL_WARN_PRD = 2; //s
const SYS_ARRIVAL_NO = 0;
const SYS_ARRIVAL_START = 1;
const SYS_ARRIVAL_END = 2;
var sys_arrival_state = SYS_ARRIVAL_NO;
var sys_arrival_compA = false;
var sys_arrival_compB = false;
var sys_arrival_interval;

const PREP_TIME = 2; //min
const PREP_WARN_TIME = 10; //s
const PREP_WARN_PRD = 2; //s
const SYS_PREP_NO = 0;
const SYS_PREP_START = 1;
const SYS_PREP_END = 2;
var sys_prep_state = SYS_PREP_NO;
var sys_prep_compA = false;
var sys_prep_compB = false;
var sys_prep_interval;

const MATCH_TIME = 2; //min
const MATCH_START_TIME = 10; //s
const MATCH_INACTIVE_TIME = 10; //s
const MATCH_WEAPONS_TIME = (MATCH_TIME - 1) * 60; //s
const SYS_MATCH_NO = 0;
const SYS_MATCH_START = 1;
const SYS_MATCH_RUN = 2;
const SYS_MATCH_END = 3;
var sys_match_state = SYS_MATCH_NO;

var sys_weapons_time_req = MATCH_WEAPONS_TIME;

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

var sys_compA_pnts_round = 0;
var sys_compB_pnts_round = 0;

const SYS_STATE_INIT = 0;
const SYS_STATE_START = 1;
const SYS_STATE_ARRIVAL = 2;
const SYS_STATE_PREP = 3;
const SYS_STATE_MATCH = 4;
const SYS_STATE_IDLE = 5;
const SYS_STATE_DEMO = 6;
const SYS_STATE_RESULTS = 7;
var sys_state = SYS_STATE_INIT;
var sys_next_state = SYS_STATE_INIT;
setTimeout(reopen, 5000);

const api_user = "gustas23";
//MindaugasMikalauskas
const api_key = "cEYGHeAArMEVQfuWaHUgKKF4UiqEjg3i0NIN4St3";
//"TPl7VTI23iBck2iOaiBSBCU7YRDpYWXl6Ksm1tBa"
const api_tournament = "7dywihz9";//testtrn

var api_matches = [];
var api_matches_ok = false;
var api_match_active = false;
var api_next_match = 0;
var api_current_match = 0;
var api_participantA_ok = false;
var api_participantB_ok = false;

function sprint(str) {
    port.write(str, function(err) {
      console.log('Write:', str)
      if (err) {
        return console.log('ERROR:write:', err.message)
      }
    })
}

var ledOnClr = [COLOR_OFF, COLOR_OFF, COLOR_OFF];
var ledOffClr = [COLOR_OFF, COLOR_OFF, COLOR_OFF];
var ledBlinkPeriod_on = [0, 0, 0];
var ledBlinkPeriod_off = [0, 0, 0];
var ledFail = [false, false, false];

function led_set(ledN, clrOn, clrOff, BlinkPeriod_on, BlinkPeriod_off) {

  if (ledOnClr[ledN] == clrOn && ledOffClr[ledN] == clrOff && ledBlinkPeriod_on[ledN] == BlinkPeriod_on && ledBlinkPeriod_off[ledN] == BlinkPeriod_off && !ledFail[ledN])
    return;
  ledOnClr[ledN] = clrOn;
  ledOffClr[ledN] = clrOff;
  ledBlinkPeriod_on[ledN] = BlinkPeriod_on;
  ledBlinkPeriod_off[ledN] = BlinkPeriod_off;
  ledFail[ledN] = false;
  var str = "SET:LED" + (ledN + 1).toString() + "(" + clrOn + ";" + clrOff + ";" + BlinkPeriod_on.toString() + ';' + BlinkPeriod_off.toString() + ")\n";
  sprint(str);
}

function ramp_set(time_str) {
  var str = "SET:RMP(" + time_str.toString() + ")\n";
  sprint(str);
}

function blade_set(time_str, rev_str, auto_str, auto_time_str) {
  var str = "SET:SPN(" + time_str.toString() + "," + ((rev_str) ? "1" : "0") + "," + ((auto_str) ? "1" : "0") + "," + auto_time_str.toString() + ")\n";
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
  else if (newData.startsWith("FAIL"))
  {
    ledFail[LEDA] = true;
    ledFail[LEDB] = true;
    ledFail[LEDC] = true;
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
        "SYS": sys_state,
        "SEC": t_seconds,
        "MIN": t_minutes,
        "PAUS": sys_timer_pause,
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
        "ARVA": sys_compA_arrived,
        "ARVB": sys_compB_arrived,
        "RDYA": sys_compA_ready,
        "RDYB": sys_compB_ready,
        "TIMA": sys_timer_enabledA,
        "TIMB": sys_timer_enabledB,
        "SECA": t_secondsA,
        "SECB": t_secondsB
      };
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      return res.end(JSON.stringify(data, null, 3));
    }
    else if (q.pathname == "/confirmA")
    {
      if (sys_state === SYS_STATE_ARRIVAL)
      {
        sys_compA_arrived = true;
      }
      else if (sys_state === SYS_STATE_PREP)
      {
        sys_compA_ready = true;
      }
      else if (sys_state === SYS_STATE_MATCH)
      {
        start_timeA(MATCH_INACTIVE_TIME * 1000);
      }
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/confirmB")
    {
      if (sys_state === SYS_STATE_ARRIVAL)
      {
        sys_compB_arrived = true;
      }
      else if (sys_state === SYS_STATE_PREP)
      {
        sys_compB_ready = true;
      }
      else if (sys_state === SYS_STATE_MATCH)
      {
        start_timeB(MATCH_INACTIVE_TIME * 1000);
      }
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/cancelA")
    {
      if (sys_state === SYS_STATE_ARRIVAL)
      {
        sys_compA_arrived = false;
      }
      else if (sys_state === SYS_STATE_PREP)
      {
        sys_compA_ready = false;
      }
      else if (sys_state === SYS_STATE_MATCH)
      {
        cancel_timeA();
      }
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/cancelB")
    {
      if (sys_state === SYS_STATE_ARRIVAL)
      {
        sys_compB_arrived = false;
      }
      else if (sys_state === SYS_STATE_PREP)
      {
        sys_compB_ready = false;
      }
      else if (sys_state === SYS_STATE_MATCH)
      {
        cancel_timeB();
      }
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/addA")
    {
      sys_compA_pnts += 1;
      sys_compA_pnts_round += 1;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/addB")
    {
      sys_compB_pnts += 1;
      sys_compB_pnts_round += 1;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/subA")
    {
      sys_compA_pnts -= 1;
      sys_compA_pnts_round -= 1;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/subB")
    {
      sys_compB_pnts -= 1;
      sys_compB_pnts_round -= 1;
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/confirmResults")
    {
      if (sys_state === SYS_STATE_RESULTS)
      {
        api_endMatch(sys_match_num);
        sys_match_num = sys_match_num + 1;
        if (sys_match_num >= api_matches.length)
        {
          sys_match_num = 0;
        }
        sys_sw_state(SYS_STATE_IDLE);
      }
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/resetMatches")
    {
      if (sys_state === SYS_STATE_IDLE)
        sys_match_num = 0
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/matchStart")
    {
      if (sys_state === SYS_STATE_IDLE)
      {
        sys_round_num = 0;
        sys_compA_pnts = 0;
        sys_compB_pnts = 0;
        sys_compA_arrived = false;
        sys_compB_arrived = false;
        sys_compA_ready = false;
        sys_compB_ready = false;
        api_startMatch(sys_match_num);
        sys_next_state = SYS_STATE_ARRIVAL;
      }
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/matchEnd")
    {
      sys_sw_state(SYS_STATE_RESULTS);
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/cancelResults")
    {
      if (sys_state === SYS_STATE_RESULTS)
      {
        sys_sw_state(SYS_STATE_IDLE);
      }
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/weapons")
    {
      sys_weapons_on = !sys_weapons_on;
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
      sys_sw_state_restart();
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/demo")
    {
      sys_sw_state(SYS_STATE_DEMO);
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/exit")
    {
      sys_end();
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/")
    {
      var filename = "." + "/mainpage.html";
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

function sys_start()
{
  sys_state = SYS_STATE_START;
  sys_start_state = SYS_START_PENDING;
  sprint("SYSTEM_START()\n");
  console.log('SRV:', "SYS_START_PENDING");
  sys_interval = setInterval(sys_run, 100);
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
  run_timeA();
  run_timeB();

  if (sys_state === SYS_STATE_START)
  {
    if (sys_start_state === SYS_START_OK)
    {
      sys_state = SYS_STATE_IDLE;
      led_set(LEDA,COLOR_GREEN,COLOR_OFF,500,2000);
      led_set(LEDB,COLOR_GREEN,COLOR_OFF,500,2000);
      led_set(LEDC,COLOR_GREEN,COLOR_OFF,500,2000);
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
  else if (sys_state === SYS_STATE_RESULTS)
  {
    led_set(LEDA,COLOR_OFF,COLOR_OFF,0,0);
    led_set(LEDB,COLOR_OFF,COLOR_OFF,0,0);
    led_set(LEDC,COLOR_GREEN,COLOR_GREEN,1000,1000);
  }
  else if (sys_state === SYS_STATE_IDLE)
  {
    led_set(LEDA,COLOR_GREEN,COLOR_OFF,1000,1000);
    led_set(LEDB,COLOR_GREEN,COLOR_OFF,1000,1000);
    led_set(LEDC,COLOR_GREEN,COLOR_OFF,1000,1000);
    sys_weapons_on = false;
  }
  else if (sys_state === SYS_STATE_DEMO)
  {
    led_set(LEDA,COLOR_PURPLE,COLOR_BLUE,500,500);
    led_set(LEDB,COLOR_PURPLE,COLOR_BLUE,500,500);
    led_set(LEDC,COLOR_PURPLE,COLOR_BLUE,500,500);
    sys_next_state = SYS_STATE_IDLE;
  }

  if (sys_weapons_on == true && (sys_state === SYS_STATE_DEMO || sys_state === SYS_STATE_MATCH))
  {
    setRamp(sys_demo_allow_ramp);
    setBlade(sys_demo_allow_spin);
  }
  else
  {
    setRamp(false);
    setBlade(false);
  }
}

var rmp_en = false;
var bld_en = false;

function setRamp(enbl)
{
  if (rmp_en == enbl)
    return;
  rmp_en = enbl;
  if (enbl)
  {
    ramp_set(240000);
  }
  else
  {
    ramp_set(0);
  }
}

function setBlade(enbl)
{
  if (bld_en == enbl)
    return;
  bld_en = enbl;
  if (enbl)
  {
    blade_set(240000,false,true,5000);
  }
  else
  {
    blade_set(0,false,false,0);
  }
}

function sys_sw_state(st)
{
  if (sys_state === st)
  {
    return;
  }

  

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
  sys_state = st;
  sys_next_state = sys_state;
  sys_weapons_on = false;
}

function sys_sw_state_restart()
{
  sys_state = SYS_STATE_INIT;
  sys_next_state = SYS_STATE_INIT;
  sys_start_state = SYS_START_NO;
  reopen();
}

function sys_end()
{
  sprint("SYSTEM_STOP()\n");
  console.log('SRV:', "SYS_STOPPING");
  clearInterval(sys_interval);
  sys_start_state = SYS_START_NO;
}

function arrival_start()
{
  start_time(ARRIVAL_TIME * 60000);
  sys_arrival_state = SYS_ARRIVAL_START;
  sys_compA_arrived = false;
  sys_compB_arrived = false;
  led_set(LEDA,COLOR_YELLOW,COLOR_YELLOW,0,0);
  led_set(LEDB,COLOR_YELLOW,COLOR_YELLOW,0,0);
  led_set(LEDC,COLOR_YELLOW,COLOR_YELLOW,0,0);
}

function arrival_run()
{
  if (sys_arrival_state === SYS_ARRIVAL_START)
  {
    if (check_time() == true)
    {
      sys_arrival_state = SYS_ARRIVAL_END;

      if (sys_compA_arrived)
      {
        led_set(LEDA,COLOR_GREEN,COLOR_GREEN,0,0);
      }
      else
      {
        led_set(LEDA,COLOR_RED,COLOR_RED,0,0);
      }

      if (sys_compB_arrived)
      {
        led_set(LEDB,COLOR_GREEN,COLOR_GREEN,0,0);
      }
      else
      {
        led_set(LEDB,COLOR_RED,COLOR_RED,0,0);
      }

      if (sys_compA_arrived && sys_compB_arrived)
      {
        led_set(LEDC,COLOR_GREEN,COLOR_GREEN,0,0);
        sys_next_state = SYS_STATE_PREP;
      }
      else
      {
        led_set(LEDC,COLOR_RED,COLOR_RED,0,0);
        sys_next_state = SYS_STATE_RESULTS;
      }
    }
    else
    {
      if (sys_compA_arrived)
      {
        led_set(LEDA,COLOR_GREEN,COLOR_GREEN,0,0);
      }
      else if (t_remaining < ARRIVAL_WARN_TIME * 1000)
      {
        led_set(LEDA,COLOR_YELLOW,COLOR_RED,ARRIVAL_WARN_PRD*1000,ARRIVAL_WARN_PRD*1000);
      }
      else
      {
        led_set(LEDA,COLOR_YELLOW,COLOR_YELLOW,0,0);
      }

      if (sys_compB_arrived)
      {
        led_set(LEDB,COLOR_GREEN,COLOR_GREEN,0,0);
      }
      else if (t_remaining < ARRIVAL_WARN_TIME * 1000)
      {
        led_set(LEDB,COLOR_YELLOW,COLOR_RED,ARRIVAL_WARN_PRD*1000,ARRIVAL_WARN_PRD*1000);
      }
      else
      {
        led_set(LEDB,COLOR_YELLOW,COLOR_YELLOW,0,0);
      }

      if (sys_compA_arrived && sys_compB_arrived)
      {
        led_set(LEDC,COLOR_GREEN,COLOR_GREEN,0,0);
        pause_time();
        sys_next_state = SYS_STATE_PREP;
      }
      else if (t_remaining < ARRIVAL_WARN_TIME * 1000)
      {
        led_set(LEDC,COLOR_YELLOW,COLOR_RED,ARRIVAL_WARN_PRD*1000,ARRIVAL_WARN_PRD*1000);
      }
      else
      {
        led_set(LEDC,COLOR_YELLOW,COLOR_YELLOW,0,0);
      }
    }
  }
  else if (sys_arrival_state === SYS_ARRIVAL_END)
  {
    if (sys_compA_arrived)
    {
      led_set(LEDA,COLOR_GREEN,COLOR_GREEN,0,0);
    }
    else
    {
      led_set(LEDA,COLOR_RED,COLOR_RED,0,0);
    }

    if (sys_compB_arrived)
    {
      led_set(LEDB,COLOR_GREEN,COLOR_GREEN,0,0);
    }
    else
    {
      led_set(LEDB,COLOR_RED,COLOR_RED,0,0);
    }
    if (sys_compA_arrived && sys_compB_arrived)
    {
      sys_next_state = SYS_STATE_PREP;
      led_set(LEDC,COLOR_GREEN,COLOR_GREEN,0,0);
    }
    else
    {
      led_set(LEDC,COLOR_RED,COLOR_RED,0,0);
    }
  }
}

function prep_start()
{
  start_time(PREP_TIME * 60000);
  sys_prep_state = SYS_PREP_START;
  if (sys_state == SYS_STATE_MATCH)
  {
    sys_round_num = sys_round_num + 1;
  }
  sys_compA_ready = false;
  sys_compB_ready = false;
  led_set(LEDA,COLOR_YELLOW,COLOR_YELLOW,0,0);
  led_set(LEDB,COLOR_YELLOW,COLOR_YELLOW,0,0);
  led_set(LEDC,COLOR_YELLOW,COLOR_YELLOW,0,0);
}

function prep_run()
{
  if (sys_prep_state === SYS_PREP_START)
  {
    if (check_time() == true)
    {
      sys_prep_state = SYS_PREP_END;

      if (sys_compA_ready)
      {
        led_set(LEDA,COLOR_GREEN,COLOR_GREEN,0,0);
      }
      else
      {
        led_set(LEDA,COLOR_RED,COLOR_RED,0,0);
      }

      if (sys_compB_ready)
      {
        led_set(LEDB,COLOR_GREEN,COLOR_GREEN,0,0);
      }
      else
      {
        led_set(LEDB,COLOR_RED,COLOR_RED,0,0);
      }

      if (sys_compA_ready && sys_compB_ready)
      {
        led_set(LEDC,COLOR_GREEN,COLOR_GREEN,0,0);
        sys_next_state = SYS_STATE_MATCH;
      }
      else
      {
        led_set(LEDC,COLOR_RED,COLOR_RED,0,0);
        sys_next_state = SYS_STATE_RESULTS;
      }
    }
    else
    {
      if (sys_compA_ready)
      {
        led_set(LEDA,COLOR_GREEN,COLOR_GREEN,0,0);
      }
      else if (t_remaining < PREP_WARN_TIME * 1000)
      {
        led_set(LEDA,COLOR_YELLOW,COLOR_RED,PREP_WARN_PRD*1000,PREP_WARN_PRD*1000);
      }
      else
      {
        led_set(LEDA,COLOR_YELLOW,COLOR_YELLOW,0,0);
      }

      if (sys_compB_ready)
      {
        led_set(LEDB,COLOR_GREEN,COLOR_GREEN,0,0);
      }
      else if (t_remaining < PREP_WARN_TIME * 1000)
      {
        led_set(LEDB,COLOR_YELLOW,COLOR_RED,PREP_WARN_PRD*1000,PREP_WARN_PRD*1000);
      }
      else
      {
        led_set(LEDB,COLOR_YELLOW,COLOR_YELLOW,0,0);
      }

      if (sys_compA_ready && sys_compB_ready)
      {
        led_set(LEDC,COLOR_GREEN,COLOR_GREEN,0,0);
        pause_time();
        sys_next_state = SYS_STATE_MATCH;
      }
      else if (t_remaining < PREP_WARN_TIME * 1000)
      {
        led_set(LEDC,COLOR_YELLOW,COLOR_RED,PREP_WARN_PRD*1000,PREP_WARN_PRD*1000);
      }
      else
      {
        led_set(LEDC,COLOR_YELLOW,COLOR_YELLOW,0,0);
      }
    }
  }
  else if (sys_prep_state === SYS_PREP_END)
  {
    if (sys_compA_ready)
    {
      led_set(LEDA,COLOR_GREEN,COLOR_GREEN,0,0);
    }
    else
    {
      led_set(LEDA,COLOR_RED,COLOR_RED,0,0);
    }

    if (sys_compB_ready)
    {
      led_set(LEDB,COLOR_GREEN,COLOR_GREEN,0,0);
    }
    else
    {
      led_set(LEDB,COLOR_RED,COLOR_RED,0,0);
    }
    if (sys_compA_ready && sys_compB_ready)
    {
      sys_next_state = SYS_STATE_MATCH;
      led_set(LEDC,COLOR_GREEN,COLOR_GREEN,0,0);
    }
    else
    {
      led_set(LEDC,COLOR_RED,COLOR_RED,0,0);
    }
  }
}

function match_start()
{
  cancel_timeA();
  cancel_timeB();
  start_time(MATCH_START_TIME * 1000);
  sys_match_state = SYS_MATCH_START;
  sys_compA_pnts_round = 0;
  sys_compB_pnts_round = 0;
  sys_weapons_on = false;
  led_set(LEDA,COLOR_RED,COLOR_WHITE,1000,1000);
  led_set(LEDB,COLOR_RED,COLOR_WHITE,1000,1000);
  led_set(LEDC,COLOR_RED,COLOR_WHITE,1000,1000);
}

function match_run()
{
  if (sys_match_state === SYS_MATCH_START)
  {
    if (check_time() == true)
    {
      sys_match_state = SYS_MATCH_RUN;
      sys_next_state = SYS_STATE_PREP;
      start_time(MATCH_TIME * 60000);
      led_set(LEDA,COLOR_WHITE,COLOR_WHITE,0,0);
      led_set(LEDB,COLOR_WHITE,COLOR_WHITE,0,0);
      led_set(LEDC,COLOR_WHITE,COLOR_WHITE,0,0);
    }
    else
    {
      if (sys_right_door_open)
      {
        led_set(LEDA,COLOR_PURPLE,COLOR_RED,500,1000);
      }
      else
      {
        led_set(LEDA,COLOR_RED,COLOR_WHITE,1000,1000);
      }

      if (sys_left_door_open)
      {
        led_set(LEDB,COLOR_PURPLE,COLOR_RED,500,1000);
      }
      else
      {
        led_set(LEDB,COLOR_RED,COLOR_WHITE,1000,1000);
      }

      if (sys_right_door_open || sys_left_door_open)
      {
        led_set(LEDC,COLOR_RED,COLOR_RED,0,0);
        pause_time();
      }
      else
      {
        led_set(LEDC,COLOR_RED,COLOR_WHITE,1000,1000);
      }
    }
  }
  else if (sys_match_state === SYS_MATCH_RUN)
  {
    
    if (check_time() == true)
    {
      led_set(LEDA,COLOR_RED,COLOR_RED,0,0);
      led_set(LEDB,COLOR_RED,COLOR_RED,0,0);
      led_set(LEDC,COLOR_RED,COLOR_RED,0,0);
      sys_match_state = SYS_MATCH_END;
      sys_next_state = SYS_STATE_PREP;
    }
    else if (check_timeA() == true || check_timeB() == true)
    {
      pause_time();
      cancel_timeA();
      cancel_timeB();
      led_set(LEDA,COLOR_RED,COLOR_RED,0,0);
      led_set(LEDB,COLOR_RED,COLOR_RED,0,0);
      led_set(LEDC,COLOR_RED,COLOR_RED,0,0);
    }
    else
    {
      if (sys_right_door_open)
      {
        led_set(LEDA,COLOR_PURPLE,COLOR_RED,250,250);
      }
      else if (sys_timer_enabledA)
      {
        led_set(LEDA,COLOR_RED,COLOR_BLUE,500,1000);
      }
      else
      {
        led_set(LEDA,COLOR_WHITE,COLOR_WHITE,0,0);
      }

      if (sys_left_door_open)
      {
        led_set(LEDB,COLOR_PURPLE,COLOR_RED,250,250);
      }
      else if (sys_timer_enabledB)
      {
        led_set(LEDB,COLOR_RED,COLOR_BLUE,500,1000);
      }
      else
      {
        led_set(LEDB,COLOR_WHITE,COLOR_WHITE,0,0);
      }

      if (sys_right_door_open || sys_left_door_open || sys_em_stop)
      {
        led_set(LEDC,COLOR_RED,COLOR_RED,0,0);
        pause_time();
        cancel_timeA();
        cancel_timeB();
        sys_weapons_on = false;
      }
      else
      {
        if (!sys_weapons_on)
        {
          if (t_remaining < MATCH_WEAPONS_TIME * 1000)
          {
            sys_weapons_on = true;
          }
        }
        else
        {
          led_set(LEDC,COLOR_RED,COLOR_WHITE,250,250);
        }
      }
    }
  }
  else if (sys_match_state === SYS_MATCH_END)
  {
    sys_weapons_on = false;
    if (sys_compA_pnts_round > sys_compB_pnts_round)
    {
      led_set(LEDA,COLOR_GREEN,COLOR_GREEN,0,0);
      led_set(LEDB,COLOR_RED,COLOR_RED,0,0);
    }
    else if (sys_compA_pnts_round < sys_compB_pnts_round)
    {
      led_set(LEDB,COLOR_GREEN,COLOR_GREEN,0,0);
      led_set(LEDA,COLOR_RED,COLOR_RED,0,0);
    }
    else if (sys_compA_pnts_round == 1 && sys_compB_pnts_round == 1)
    {
      led_set(LEDA,COLOR_BLUE,COLOR_BLUE,0,0);
      led_set(LEDB,COLOR_BLUE,COLOR_BLUE,0,0);
    }
  }
}

function input_update_states()
{
  if (sys_right_door == sys_right_door_open || sys_left_door == sys_left_door_open)
  {
    sys_right_door_open = !sys_right_door;
    sys_left_door_open = !sys_left_door;
  }

  if (sys_state === SYS_STATE_MATCH)
  {
    sys_demo_allow_ramp = sys_left_sw;
    sys_demo_allow_spin = sys_right_sw;
  }
  else if (sys_state === SYS_STATE_DEMO)
  {
    sys_demo_allow_ramp = sys_left_sw;
    sys_demo_allow_spin = sys_right_sw;
  }
}

function api_getMatches(){
  https.get('https://'+api_user+':'+api_key+'@api.challonge.com/v1/tournaments/'+api_tournament+'/matches.json', res => {
    let data = [];
    console.log('Get Matches code: ', res.statusCode);
  
    res.on('data', chunk => {
      data.push(chunk);
    });
  
    res.on('end', () => {
      api_matches = JSON.parse(Buffer.concat(data).toString());
      api_matches_ok = true;
      console.log('Get Matches: ', api_matches);
      if (api_matches.length >= api_next_match + 1)
      {
        if (api_next_match != api_current_match)
        {
          api_match_active = false;
          api_setMatchInactive(api_current_match);
        }

        api_setMatchActive(api_next_match);

        api_getParticipantA(api_next_match);
        api_getParticipantB(api_next_match);
      }
      else
      {
        sys_compA_name = "ERR";
        sys_compB_name = "ERR";
      }
      
    });
  }).on('error', err => {
    console.log('Get Matches Error: ', err.message);
  });
}

function api_getParticipantA(match_num){
  https.get('https://'+api_user+':'+api_key+'@api.challonge.com/v1/tournaments/'+api_tournament+'/participants/'+api_matches[match_num].match.player1_id+'.json', res => {
    let data = [];
    console.log('Get PartA code: ', res.statusCode);
  
    res.on('data', chunk => {
      data.push(chunk);
    });
  
    res.on('end', () => {
      res = JSON.parse(Buffer.concat(data).toString());
      console.log('Get PartA: ', res);
      sys_compA_name = res.participant.name;
      api_participantA_ok = true;
    });
  }).on('error', err => {
    console.log('Get PartA Error: ', err.message);
  });
}

function api_getParticipantB(match_num){
  https.get('https://'+api_user+':'+api_key+'@api.challonge.com/v1/tournaments/'+api_tournament+'/participants/'+api_matches[match_num].match.player2_id+'.json', res => {
    let data = [];
    console.log('Get PartB code: ', res.statusCode);
  
    res.on('data', chunk => {
      data.push(chunk);
    });
  
    res.on('end', () => {
      res = JSON.parse(Buffer.concat(data).toString());
      console.log('Get PartB: ', res);
      sys_compB_name = res.participant.name;
      api_participantB_ok = true;
    });
  }).on('error', err => {
    console.log('Get PartB Error: ', err.message);
  });
}

function api_setMatchInactive(match_num){
  var postData = JSON.stringify({
  });

  var options = {
    hostname: 'api.challonge.com',
    port: 443,
    path: '/v1/tournaments/'+api_tournament+'/matches/'+api_matches[match_num].match.id+'/unmark_as_underway.json',
    auth: api_user+':'+api_key,
    method: 'POST',
  };

  var req = https.request(options, (res) => {
    console.log('Set Inactive code:', res.statusCode);
  });

  req.on('error', (e) => {
    console.error(e);
  });

  req.write(postData);
  req.end();
}

function api_setMatchActive(match_num){
  var postData = JSON.stringify({
  });

  var options = {
    hostname: 'api.challonge.com',
    port: 443,
    path: '/v1/tournaments/'+api_tournament+'/matches/'+api_matches[match_num].match.id+'/mark_as_underway.json',
    auth: api_user+':'+api_key,
    method: 'POST',
  };

  var req = https.request(options, (res) => {
    console.log('Set Active code:', res.statusCode);

    res.on('end', () => {
      api_match_active = true;
      api_current_match = api_next_match;
    });
  });

  req.on('error', (e) => {
    console.error(e);
  });

  req.write(postData);
  req.end();
}

function api_startMatch(match_num)
{
  api_next_match = match_num;
  api_getMatches();
}

function api_endMatch(match_num)
{

}

function start_timeA(period)
{
  sys_timer_enabledA = false;
  t_startA = new Date().getTime();
  t_remainingA = period;
  t_minutesA = 0;
  t_secondsA = 0;
  sys_timer_endA = false;
  sys_timer_enabledA = true;
}

function cancel_timeA()
{
  sys_timer_enabledA = false;
  t_remainingA = 0;
  sys_timer_endA = false;
  t_minutesA = 0;
  t_secondsA = 0;
}

function run_timeA()
{
  if (sys_timer_enabledA == false)
    return;

  var now = new Date().getTime();
  if (sys_timer_endA == false)
  {
    t_remainingA = t_remainingA - (now - t_startA);
  }
  t_startA = now;
  
  if (t_remainingA <= 0)
  {
    t_remainingA = 0;
    sys_timer_endA = true;
    t_minutesA = 0;
    t_secondsA = 0;
  }
  else
  {
    t_minutesA = Math.floor((t_remainingA % (1000 * 60 * 60)) / (1000 * 60));
    t_secondsA = Math.floor((t_remainingA % (1000 * 60)) / 1000);
  }
}

function check_timeA()
{
  return sys_timer_endA && sys_timer_enabledA;
}

function start_timeB(period)
{
  sys_timer_enabledB = false;
  t_startB = new Date().getTime();
  t_remainingB = period;
  t_minutesB = 0;
  t_secondsB = 0;
  sys_timer_endB = false;
  sys_timer_enabledB = true;
}

function cancel_timeB()
{
  sys_timer_enabledB = false;
  t_remainingB = 0;
  sys_timer_endB = false;
  t_minutesB = 0;
  t_secondsB = 0;
}

function run_timeB()
{
  if (sys_timer_enabledB == false)
    return;

  var now = new Date().getTime();
  if (sys_timer_endB == false)
  {
    t_remainingB = t_remainingB - (now - t_startB);
  }
  t_startB = now;
  
  if (t_remainingB <= 0)
  {
    t_remainingB = 0;
    sys_timer_endB = true;
    t_minutesB = 0;
    t_secondsB = 0;
  }
  else
  {
    t_minutesB = Math.floor((t_remainingB % (1000 * 60 * 60)) / (1000 * 60));
    t_secondsB = Math.floor((t_remainingB % (1000 * 60)) / 1000);
  }
}

function check_timeB()
{
  return sys_timer_endB && sys_timer_enabledB;
}

//blinkInterval = setInterval(blinkLED, 1000); //run the blinkLED function every 250ms
//ramp_set("2000");
//blade_set("5000", "0", "0", "0");
//setTimeout(endBlink, 20000); //stop blinking after 5 seconds
// function endBlink() { //function to stop blinking
//   clearInterval(blinkInterval); // Stop blink intervals
// }
