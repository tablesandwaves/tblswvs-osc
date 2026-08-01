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

    // Load the arc and grid devices. Note that they are fully started when notified by serialosc.
    this.#arc  = new Arc();
    this.#grid = new Grid();

    // Setup the listener to receive OSC messages coming from serialosc.
    this.#receiver = new OscReceiver();
    this.#listenForSerialOscDevices();
  }


  get arc() {
    return this.#arc;
  }


  get grid() {
    return this.#grid;
  }


  connect() {
    this.#receiver.bind(this.#host, this.#port);
    // Make the first request to begin monitoring connect/disconnect (add/remove) of devices
    this.#sender.send("/serialosc/notify", this.#host, this.#port);
    // Request a list of devices from serialosc, which will be handled by the receiver's .on()
    // handler for /serialosc/device
    this.#sender.send("/serialosc/list", this.#host, this.#port);
  }


  disconnect() {
    this.#grid.disconnect();
    this.#arc.disconnect();
    this.#sender.disconnect();
    this.#receiver.disconnect();
  }


  #listenForSerialOscDevices() {
    this.#receiver.on("/serialosc/device", (id, model, port) => {
      if ((this.#grid.id === id && this.#grid.devicePort === port) ||
          (this.#arc.id  === id && this.#arc.devicePort  === port)) return;

      const deviceOpts: DeviceOptions = { id: id, model: model, port: port, type: undefined };

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

    this.#receiver.on("/serialosc/add", () => {
      // First request all devices, which will handle connecting and configuring any devices not connected
      this.#sender.send("/serialosc/list", this.#host, this.#port);
      // Then send a request to continue listeing for any subsequent connect/disconnect (add/remove) messages
      this.#sender.send("/serialosc/notify", this.#host, this.#port);
    });

    this.#receiver.on("/serialosc/remove", (id: string) => {
      // First, stop the relevant device to set it up for the next reconnection
      if (this.#grid.id === id)
        this.#grid.stop();
      else if (this.#arc.id === id)
        this.#arc.stop();

      // Then send a request to continue listeing for any subsequent connect/disconnect (add/remove) messages
      this.#sender.send("/serialosc/notify", this.#host, this.#port);
    });
  }
}
