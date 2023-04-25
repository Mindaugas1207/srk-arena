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
var inputsValues = ["0","0","0","0","0"];

// Create a port
const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 9600,
});
var blinkInterval = setInterval(blinkLED, 1000); //run the blinkLED function every 250ms

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
  console.log('wr>', str)
}

function ramp_set(time_str) {
  var str = "SET:RMP(" + time_str + ")\n";
  sprint(str);
  console.log('wr>', str)
}

function blade_set(time_str, rev_str, auto_str, auto_time_str) {
  var str = "SET:SPN(" + time_str + "," + rev_str + "," + auto_str + "," + auto_time_str + ")\n";
  sprint(str);
  console.log('wr>', str)
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
      inputsValues = myArray;
      console.log('inp:', myArray[0] + myArray[1] + myArray[2] + myArray[3] + myArray[4]);
    }
  }
  else
  {
    console.log('Data:', newData)
  }
})
// Switches the port into "flowing mode"
// port.on('data', function (data) {
//   console.log('Data:', data)
// })
//const lineStream = port.pipe(new Readline())

http.createServer(function (req, res) {
    var q = url.parse(req.url, true);
    var filename = "." + q.pathname;
    console.log('SRV:', q.pathname);
    fs.readFile(filename, function (err, data) {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end("404 Not Found");
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(data);
        return res.end();
    });
}).listen(8080);


function blinkLED() { //function to start blinking
  if (st === 0) { //check the pin state, if the state is 0 (or off)
    leds_set("FF,00,00","00,FF,00","00,00,FF");
    ramp_set("500");
    blade_set("500", "0", "0", "0");
    st = 1;
  } else {
    leds_set("00,00,00","00,00,00","00,00,00");
    st = 0;
  }
}

function endBlink() { //function to stop blinking
  clearInterval(blinkInterval); // Stop blink intervals
}

setTimeout(endBlink, 20000); //stop blinking after 5 seconds
