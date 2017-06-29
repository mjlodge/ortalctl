/*
Copyright (c) 2017 Mathew Lodge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const restify = require('restify')
const app = restify.createServer();
var gpio = require('pigpio').Gpio

const PORT = 8000 // Port to listen on

const STATUS_INIT = "0 Initializing"
const STATUS_FIRE_OFF = "1 Fire off"
const STATUS_FIRE_STARTING = "2 Turning fire on"
const STATUS_FIRE_LIT = "3 Fire lit"
const STATUS_FIRE_STOPPING = "4 Turning fire off"
const STATUS_ERROR = "5 Error in fire control"
var status = STATUS_INIT

const OFF_TIME = 1000 // Duration for fire off command per Mertik spec
const ON_TIME = 1000 // Duraton for fire on command per Mertik spec

const RPINS = { // Defines which GPIO pins connect to the 3 relays controlling the 3 wires of the fire
  1: 17,
  2: 27,
  3: 22
}

var pins = Array(3) // Array of pigpio GPIO pin objects
var cmdQueue = 0 // Number of commands currently pending

console.log('Initializing...')
init_fire(function(err) {
  if (err) {
    return new Error('Error initializing fire -- quitting')
  } else {
    app.use(restify.acceptParser(app.acceptable)) // Don't accept junk
    app.use(restify.throttle({ // Throttle connections to save on wear & tear
      rate: 2, // Max 2 requests per second
      burst: 2,
      ip: true})) // Track per IP address
    app.get('/hello', function(req, res, next) {
      textOut(res)
      res.send(200, 'Hello, ' + req.header('User-Agent') + '\n')
      next()
    })

    app.get('/status', function(req, res, next) {
      textOut(res)
      res.send(200, status + "\n")
      next()
    })

    app.get('/on', function(req, res, next) {
      ortal_on(function(err) {
        textOut(res)
        if (err) {
          res.send(503, 'Error starting fire\n')
        }
        else {
          res.send(200, 'Fire on\n')
        }
      })
      next()
    })

    app.get('/off', function(req, res, next) {
      ortal_off(function(err) {
        textOut(res)
        if (err) {
          res.send(503, 'Error stopping fire\n')
        }
        else {
          res.send(200, 'Fire off\n')
        }
      })
      next()
    })

    app.listen(PORT, function() {
      console.log('Ortal fire app listening at %s', app.url)
    })
  }
})

function init_fire(callback) {
  init_gpio() // Set up GPIO pins
  ortal_off(callback) // Turn off fire, so we definitively know what state it's in
}

function init_gpio() {
  // Sets up the 3 GPIO pins conntected to the relays that close the
  // control wires that control the fire
  // The relays are energized when 0 is written to the GPIO pin

  var i

  for (i in RPINS) {
    pins[i] = new gpio(RPINS[i], {mode: gpio.OUTPUT})
    pins[i].digitalWrite(1)
  }
}

function ortal_off(callback) {
  if (status === STATUS_FIRE_STARTING) {
    // Wait for the fire to finish starting before turning it off
    return setTimeout(function() {
      ortal_off(callback)
    }, ON_TIME);
  }
  status = STATUS_FIRE_STOPPING
  pins[1].digitalWrite(0)
  pins[2].digitalWrite(0)
  pins[3].digitalWrite(0)
  setTimeout(function() {
    end_fireoff(callback)
  }, OFF_TIME) // Keep relays closed per Mertik spec and then de-energize
}

function end_fireoff(callback) {
  // De-energize the 1, 2, 3 relays
  pins[1].digitalWrite(1)
  pins[2].digitalWrite(1)
  pins[3].digitalWrite(1)
  status = STATUS_FIRE_OFF
  callback(null)
}

function ortal_on(callback) {
  if (status === STATUS_FIRE_STOPPING) {
    // Wait for fire to stop before restarting
    return setTimeout(function() {
      ortal_on(callback)
    }, OFF_TIME)
  }
  // Energize the 1, 3 relays for fire on
  status = STATUS_FIRE_STARTING
  pins[1].digitalWrite(0)
  pins[3].digitalWrite(0)
  setTimeout(function() {
    end_fireon(callback)
  }, ON_TIME) // Schedule de-energizing of relays
}

function end_fireon(callback) {
  // De-energize 1,3 relays
  pins[1].digitalWrite(1)
  pins[3].digitalWrite(1)
  status = STATUS_FIRE_LIT
  callback(null)
}

function textOut(res) {
  return res.header('Content-Type', 'text/plain')
}
