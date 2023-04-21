var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var http = require('http');
var url = require('url');
var fs = require('fs');
var st = 0;
var LED = new Gpio(27, 'out'); //use GPIO pin 4, and specify that it is output
const { SerialPort } = require('serialport');

// Create a port
const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 9600,
});
var blinkInterval = setInterval(blinkLED, 1000); //run the blinkLED function every 250ms
//var pushButton = new Gpio(4, 'in', 'both');


function sprint(str) {
    port.write(str, function(err) {
      if (err) {
        return console.log('ERROR:write:', err.message)
      }
    })
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
    LED.writeSync(1); //set pin state to 1 (turn LED on)
    st = 1;
  } else {
    LED.writeSync(0); //set pin state to 0 (turn LED off)
    st = 0;
  }
  sprint('hello');
}

function endBlink() { //function to stop blinking
  clearInterval(blinkInterval); // Stop blink intervals
  LED.writeSync(0); // Turn LED off
  LED.unexport(); // Unexport GPIO to free resources
}

setTimeout(endBlink, 10000); //stop blinking after 5 seconds

// pushButton.watch(function (err, value) { //Watch for hardware interrupts on pushButton GPIO, specify callback function
//   if (err) { //if an error
//     console.error('There was an error', err); //output error message to console
//   return;
//   }
//   LED.writeSync(value); //turn LED on or off depending on the button state (0 or 1)
// });

// function unexportOnClose() { //function to run when exiting program
//   LED.writeSync(0); // Turn LED off
//   LED.unexport(); // Unexport LED GPIO to free resources
//   pushButton.unexport(); // Unexport Button GPIO to free resources
// };

// process.on('SIGINT', unexportOnClose); //function to run when user closes using ctrl+c
