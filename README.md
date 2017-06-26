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

## Use at your own risk

This is a program that controls a physical device, which means it's possible to
cause physical damage if improperly operated. There is no warranty of any kind
with this software (see LICENSE file) -- use it at your own risk.

## Hardware configuration

The program assumes that there are 3 relays connected to Raspberry Pi pins labelled
17, 27 and 22 on the Raspberry Pi GPIO. These pins are next to each other on the Pi GPIO.
The first relay
drives control wire 1 on the Maxitrol connector, the second control wire 2,
the third control wire 3. These are all wired to a common return wire on the Maxitrol
controller. See [the home automation spec sheet from Mertik Maxitrol](http://media.druservice.nl/Documents/Data/IH_Mertik_2008_EN_GV60_external_source.pdf)

## Installation

Install Docker on your Raspberry Pi, for example by burning a trusted pre-prepared image onto the Pi
flash card by [following a guide like this one from Hypriot](https://blog.hypriot.com/getting-started-with-docker-on-your-arm-device/). Or you can just burn the [standard Raspbian Lite image](https://www.raspberrypi.org/downloads/raspbian/)
and then install Docker for Pi by doing
...
curl -sSL https://get.docker.com | sh
...
Copy the files from this repo into an empty directory created on your Pi
(you can do `git clone` or just copy them). Then, build the container:
...
docker build -t ortalctl .
...
This will take some time, because the Pi has to download a base container and then install a bunch of packages, so go and
have a cup of tea and come back in a few minutes.

## Running the container

Ortalctl needs special privileges because it writes directly to the memory device to control the output pins, and
because I'm using the `pigpio` library, and it does all kinds of clever things with DMA etc. The net: you need to run the
container in privileged mode, like this:
...
docker run -it -p 8000:8000 --privileged ortalctl
...
When the container starts it will turn off the fireplace. If it's already off, nothing will happen. Ortalctl does this
because it has no way to query the status of the fireplace from the Mertik controller, so we put the fire into a known
state when the container starts, and go from there.


## The REST API

The REST API runs on port 8000. If you ran the command above, the API is available on port 8000 of the host Raspberry Pi.
To check that it's running properly, try the /hello command from the Pi's command line like this:
...
curl 127.0.0.1:8000/hello
...
You should see Hello back from `ortalctl`. The other commands are:

## `/on`
Turns on the fireplace

## `/off`
Turns off the fireplace

## `/status`
Shows the current status of the fireplace

## Important operational notes

Ortalctl assumes it is the only thing controlling the fireplace. If you use the fireplace remote or any other controls
for the fireplace, or trigger any of its safety features (e.g. the fireplace automatically turns itself off if it 
receives no commands in a set number of hours) then Ortalctl won't know about it, because it has no way to tell. In that
situation, the best thing to do is run the `/off` command and then the fireplace and Ortalctl will be back in sync.

Ortalctl has interlocks that prevent an On operation from interrupting an Off operation, and vice versa. The second command
you send will run after the first command has completed.
