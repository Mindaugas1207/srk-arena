var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var http = require('http');
var url = require('url');
var fs = require('fs');

var LED = new Gpio(4, 'out'); //use GPIO pin 4, and specify that it is output
var blinkInterval = setInterval(blinkLED, 1000); //run the blinkLED function every 250ms

//var pushButton = new Gpio(4, 'in', 'both'); //use GPIO pin 17 as input, and 'both' button presses, and releases should be handled

// http.createServer(function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/html'});
//   res.end('Hello World!');
// }).listen(8080);

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
  if (LED.readSync() === 0) { //check the pin state, if the state is 0 (or off)
    LED.writeSync(1); //set pin state to 1 (turn LED on)
  } else {
    LED.writeSync(0); //set pin state to 0 (turn LED off)
  }
}

function endBlink() { //function to stop blinking
  clearInterval(blinkInterval); // Stop blink intervals
  LED.writeSync(0); // Turn LED off
  LED.unexport(); // Unexport GPIO to free resources
}

//setTimeout(endBlink, 100000); //stop blinking after 5 seconds

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
