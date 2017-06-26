# Ortalctl: A REST API for Ortal gas fireplaces

I wanted to be able to control my Ortal gas fireplace with Alexa and/or other
home automation, so it needed to have an API. Mertik Maxitrol supplies the
control unit for Ortal fireplaces, and that provides a 4-wire control
interface to the fire that can be driven using relays connected to a 
Raspberry Pi (or other computer with IO pins capable of driving relays).

Ortalctl is a Node.js app that drives the relays with the appropriate timing
to control the fire according to commands received by a REST API running on
port 8000. Following the microservices doctrine, that's all it does. The rest
of the home automation integration (e.g. the Alexa skill for the fireplace)
is done in other services.

I also wrote this in such a way that it is designed to be deployed as a Docker
container running on the Pi, which makes it easier to assemble and maintain
the collection of services running on embedded hardware. The `Dockerfile` is
provided, and that is the easiest way to build it, but you are not forced
to use Docker and can just run `node ortalctl.js` provided you have installed
the dependencies, `pigpio` and `express`.
