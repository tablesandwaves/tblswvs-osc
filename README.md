# tblswvs-osc

Open Sound Control (OSC) communication library for the tblswvs ecosystem.

Status: beta project; personal project; reference implementation.

## Overview

This codebase is used for communication with [monome](https://monome.org) grid and arc devices. It provides an entry point to the serialosc service running on a computer and will establish communication channels to a grid and an arc.

As a JavaScript (Typescript) project, the core classes here act as event emitters for listening to grid and arc hardware messages and provide a basic interface for interacting with the devices.

### Limitations

At the present time, this library provides *limited* functionality and likely always will (see **Gratitude, Inspiration, Motivation** below).

* It currently only supports a single device of each type connected to the computer.
* Note that this library only supports a subset of grid and arc messages.
* The arc functionality is highly opinionated and is designed for the purpose of acting as a bank-able endless encoder parameter device.

## Events Emitted (from devices)

* Grid button pushes result in `"key"` messages emitted from `SerialOsc.grid`.
* Arc button pushes will result in `"key"` messages emitted from `SerialOsc.arc`.
* Arc dial turns will result in `"parameter"` messages emitted from `SerialOsc.arc`.

## Interface (to devices)

The core API for the grid object includes:

* `levelSet()`: set a single grid button
* `levelRow()`: set a row of grid buttons
* `levelMatrix()`: set multiple rows of grid buttons
* `clearDisplay()`: clear (turn off) one or more rows of grid buttons

The core API for the arc object includes:

* get `encoderValues`: get the current encoder values
* `setDialValues()`: set the current encoder values (e.g., act as a bank-able parameter control device)
* `clearDisplay()`: reset all encoder values to 0

## Example Usage

```javascript
const serialosc = new SerialOsc();
serialosc.connect();

serialosc.grid.on("key", (keyPress) => {
  console.log("grid button", "x", keyPress.x, "y", keyPress.y, "s", keyPress.s);
});

serialosc.arc.on("key", (buttonPress) => {
  console.log("arc button", buttonPress);
});

serialosc.arc.on("parameter", (param) => {
  console.log("arc parameter", param.index, "value", param.value);
});
```

## Gratitude, Inspiration, Motivation

This library is indebted to the [node-osc](https://github.com/dinchak/node-serialosc) library for the paving my way to working with monome devices in Node.js.

The motivation for this code is primarily a learning project. Its goals are to develop a functioning library for working with the monome grid and arc devices in Node.js and to learn a little more about working with OSC. This code was not and will likely never be written directly by generative AI as that would run counter to its learning goals.

This code is intended to be run within a very specific personal ecosystem, the software I write to make my music. As a result, it does what I need but I am unlikely to implement more than I need personally. It is published here as a reference model for others to use and build upon. I have learned from other projects and codebases and am happy to share, but as a labor of love and personal practice (and as something that is not my day job), I will likely never have time and capacity to provide formal support. Hence...

## Contributing

This project does not accept external contributions or pull requests. Issues may be disabled or ignored. However, if you would like to discuss things, I should be easily findable over at [lines](https://llllllll.co) if ya wanna chat informally.
