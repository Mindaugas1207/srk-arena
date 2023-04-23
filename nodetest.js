var http = require('http');
var url = require('url');
var fs = require('fs');
var st = 0;
const { SerialPort } = require('serialport');

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

function leds_set(clr_str) {
  var str = "SET:LED(" + clr_str + ")\n";
  sprint(str);
  console.log('wr>', str)
}

// Open errors will be emitted as an error event
port.on('error', function(err) {
  console.log('Error: ', err.message)
})
// // Read data that is available but keep the stream in "paused mode"
port.on('readable', function () {
  console.log('Data:', port.read().toString())
})
// Switches the port into "flowing mode"
// port.on('data', function (data) {
//   console.log('Data:', data)
// })
//const lineStream = port.pipe(new Readline())

http.createServer(function (req, res) {
    var q = url.parse(req.url, true);
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
}).listen(8080);


function blinkLED() { //function to start blinking
  if (st === 0) { //check the pin state, if the state is 0 (or off)
    leds_set("FF,00,00;00,FF,00;00,00,FF");
    st = 1;
  } else {
    leds_set("00,00,00;00,00,00;00,00,00");
    st = 0;
  }
}

function endBlink() { //function to stop blinking
  clearInterval(blinkInterval); // Stop blink intervals
}

setTimeout(endBlink, 20000); //stop blinking after 5 seconds
