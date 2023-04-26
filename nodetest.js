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
const ARRIVAL_RUNOFF_TIME = 500; //ms
const SYS_ARRIVAL_NO = 0;
const SYS_ARRIVAL_START = 1;
const SYS_ARRIVAL_RUN = 2;
const SYS_ARRIVAL_END = 3;
var sys_arrival_state = SYS_ARRIVAL_NO;
var sys_arrival_compA = false;
var sys_arrival_compB = false;
var sys_arrival_interval;

const PREP_TIME = 2; //min
const PREP_RUNOFF_TIME = 500; //ms
const SYS_PREP_NO = 0;
const SYS_PREP_START = 1;
const SYS_PREP_RUN = 2;
const SYS_PREP_END = 3;
var sys_prep_state = SYS_ARRIVAL_NO;
var sys_prep_compA = false;
var sys_prep_compB = false;
var sys_prep_interval;

const SYS_STATE_INIT = 0;
const SYS_STATE_START = 1;
const SYS_STATE_ARRIVAL = 2;
const SYS_STATE_PREP = 3;
const SYS_STATE_BATTLE = 4;
const SYS_STATE_IDLE = 5;
var sys_state = SYS_STATE_INIT;
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
  //console.log('wr>', str)
}

function ramp_set(time_str) {
  var str = "SET:RMP(" + time_str + ")\n";
  sprint(str);
  //console.log('wr>', str)
}

function blade_set(time_str, rev_str, auto_str, auto_time_str) {
  var str = "SET:SPN(" + time_str + "," + rev_str + "," + auto_str + "," + auto_time_str + ")\n";
  sprint(str);
  //console.log('wr>', str)
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
    
    console.log('SRV:', q.pathname);
    
    if (q.pathname == "/data")
    {
      var data = {
        "sec": t_seconds,
        "min": t_minutes
      }
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      return res.end(JSON.stringify(data, null, 3));
    }
    else if (q.pathname == "/pause")
    {
      startBlink(500, 20000, "00,00,FF", "00,FF,00", "FF,00,00", "00,00,00", "00,00,00", "00,00,00");
      res.writeHead(200);
      return res.end();
    }
    else if (q.pathname == "/stop")
    {
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
  sys_interval = setInterval(sys_run, 1000);
}

// Set the date we're counting down to
var countStart = new Date().getTime();
function getElapsed(){
  var now = new Date().getTime();
  var distance = now - countStart;
  t_minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  t_seconds = Math.floor((distance % (1000 * 60)) / 1000);
}

function sys_run()
{
  if (sys_state === SYS_STATE_START)
  {
    if (sys_start_state === SYS_START_OK)
    {
      getElapsed();
    }
  }
  
}

function sys_end()
{
  clearInterval(sys_interval);
  sys_start_state = SYS_START_NO;
}

function arrival_start()
{
  sys_arrival_state = SYS_ARRIVAL_START;
  sys_arrival_interval = setTimeout(arrival_run, ARRIVAL_TIME * 60000);
}

function arrival_run()
{
  sys_arrival_state = SYS_ARRIVAL_RUN;
  sys_arrival_interval = setTimeout(arrival_end, ARRIVAL_RUNOFF_TIME);
}

function arrival_end()
{
  sys_arrival_state = SYS_ARRIVAL_END;
}

function prep_start()
{
  sys_prep_state = SYS_PREP_START;
  sys_prep_interval = setTimeout(prep_run, PREP_TIME * 60000);
}

function prep_run()
{
  sys_prep_state = SYS_PREP_RUN;
  sys_prep_interval = setTimeout(prep_end, PREP_RUNOFF_TIME);
}

function prep_end()
{
  sys_prep_state = SYS_PREP_END;
}

function input_update_states()
{
  if (sys_state === SYS_STATE_ARRIVAL)
  {
    if (sys_arrival_state === SYS_ARRIVAL_START || sys_arrival_state === SYS_ARRIVAL_RUN)
    {
      sys_arrival_compA = sys_right_sw;
      sys_arrival_compB = sys_left_sw;
    }
    
    if (sys_arrival_state === SYS_ARRIVAL_START)
    {
      if (sys_arrival_compA == true && sys_arrival_compB == true)
      {
        clearInterval(sys_arrival_interval);
        arrival_run();
      }
    }
  }
  else if (sys_state === SYS_STATE_PREP)
  {
    if (sys_prep_state === SYS_PREP_START || sys_prep_state === SYS_PREP_RUN)
    {
      if (sys_prep_compA == true && sys_right_door == false)
      {
        sys_right_door_open = true;
      }
      else if (sys_right_door_open == false && sys_right_door == false)
      {
        sys_right_door_open = true;
        sys_prep_compA = false;
      }
      else if (sys_right_door_open == true && sys_right_door == true)
      {
        sys_right_door_open = false;
        sys_prep_compA = true;
      }

      if (sys_prep_compB == true && sys_left_door == false)
      {
        sys_left_door_open = true;
      }
      else if (sys_left_door_open == false && sys_left_door == false)
      {
        sys_left_door_open = true;
        sys_prep_compB = false;
      }
      else if (sys_left_door_open == true && sys_left_door == true)
      {
        sys_left_door_open = false;
        sys_prep_compB = true;
      }
    }
    
    if (sys_prep_state === SYS_PREP_START)
    {
      if (sys_prep_compA == true && sys_prep_compB == true)
      {
        clearInterval(sys_prep_interval);
        prep_run();
      }
    }
  }

}

//blinkInterval = setInterval(blinkLED, 1000); //run the blinkLED function every 250ms
//ramp_set("2000");
//blade_set("5000", "0", "0", "0");
//setTimeout(endBlink, 20000); //stop blinking after 5 seconds
// function endBlink() { //function to stop blinking
//   clearInterval(blinkInterval); // Stop blink intervals
// }
