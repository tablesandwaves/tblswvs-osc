import { Arc } from "./arc.js";
import { DeviceOptions } from "./device.js";
import { Grid } from "./grid.js";
import { OscSender } from "./osc_sender.js";
import { OscReceiver } from "./osc_receiver.js";


export class SerialOsc {
  // Hostname and port this process listens on.
  #host = "localhost";
  #port = 12003;

  // Hostname and port serialosc process is listening on.
  #serialoscHost = "localhost";
  #serialoscPort = 12002;

  #sender: OscSender;
  #receiver: OscReceiver;

  #arc: Arc;
  #grid: Grid;


  constructor() {
    // Setup communication to serialosc and notify it of a new listener.
    this.#sender = new OscSender();
    this.#sender.add(this.#serialoscHost, this.#serialoscPort);
    this.#sender.send("/serialosc/notify", this.#host, this.#port);

    // Load the arc and grid devices. Note that they are fully started when notified by serialosc.
    this.#arc  = new Arc();
    this.#grid = new Grid();

    // Setup the listener to receive OSC messages coming from serialosc.
    this.#receiver = new OscReceiver();
    this.#startOscReceiver();

    // Request a list of devices from serialosc, which will be handled by the receiver's .on()
    // handler for /serialosc/device
    this.#sender.send("/serialosc/list", this.#host, this.#port);
  }


  #startOscReceiver() {
    this.#receiver.bind(this.#host, this.#port);
    this.#listenForSerialOscDevices();
  }


  #listenForSerialOscDevices() {
    this.#receiver.on("/serialosc/device", (id, model, port) => {
      // console.log("HERE", id, model, port);

      const deviceOpts: DeviceOptions = { id: id, model: model, port: port, type: undefined };

      // Add the check here to see if the device has already been connected.

      if (model.match(/arc/)) {
        deviceOpts.type = "arc";
        this.#arc.start(deviceOpts);
        setTimeout(() => console.log(this.#arc.toString()), 10);
      } else {
        deviceOpts.type = "grid";
        this.#grid.start(deviceOpts);
        setTimeout(() => console.log(this.#grid.toString()), 10);
      }
    });
  }
}
