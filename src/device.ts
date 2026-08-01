import { EventEmitter } from "node:events";
import { OscReceiver } from "./osc_receiver.js";
import { OscSender } from "./osc_sender.js";


export interface DeviceOptions {
  id: string,
  model: string,
  port: number,
  type: string|undefined,
}


export class MonomeDevice extends EventEmitter {
  #id: string|undefined;
  #model: string|undefined;
  #type: string|undefined;
  #prefix: string|undefined;
  #rows: number|undefined;
  #columns: number|undefined;
  #angle: number|undefined;

  #receiverHost = "localhost";
  #receiverPort: number;

  #deviceHost = "localhost";
  #devicePort: number|undefined;

  #oscReceiver: OscReceiver;
  #oscSender: OscSender;

  #infoRequested: boolean;
  #connected: boolean;


  constructor(oscReceiverPort: number) {
    super();

    this.#receiverPort = oscReceiverPort;

    this.#oscReceiver = new OscReceiver();
    this.#oscSender  = new OscSender();

    this.#oscReceiver.bind(this.#receiverHost, this.#receiverPort);
    this.deviceMessages();

    this.#infoRequested = false;
    this.#connected     = false;
  }


  get id() {
    return this.#id;
  }


  get devicePort() {
    return this.#devicePort;
  }


  get oscReceiver() {
    return this.#oscReceiver;
  }


  get prefix() {
    return this.#prefix;
  }


  start(deviceOpts: DeviceOptions) {
    this.#id         = deviceOpts.id;
    this.#model      = deviceOpts.model;
    this.#devicePort = deviceOpts.port;
    this.#type       = deviceOpts.type;

    // serialosc has reported the port being used for this device, so now the emitter can be configured (via add()).
    // Then send a /sys/port message to begin device initialization.
    this.#oscSender.add(this.#deviceHost, this.#devicePort);
    this.#oscSender.send("/sys/port", { type: "integer", value: this.#receiverPort });
  }


  stop() {
    this.#connected = false;
  }


  disconnect() {
    this.#oscReceiver.disconnect();
    this.#oscSender.disconnect();
  }


  toString() {
    return `${this.#type} ${this.#id} ${this.#model} ${this.#prefix} ${this.#connected} ` +
      `${this.#rows} ${this.#columns} ${this.#angle}`;
  }


  localDeviceMessages() {}


  deviceMessages() {
    this.#oscReceiver.on("/sys/port", (port: number) => {
      this.#devicePort = port;
      this.#receiveMessage("/sys/port");
    });

    this.#oscReceiver.on("/sys/host", (host: string) => {
      this.#deviceHost = host;
      this.#receiveMessage("/sys/host");
    });

    this.#oscReceiver.on("/sys/id", (id: string) => {
      this.#id = id;
      this.#receiveMessage("/sys/id");
    });

    this.#oscReceiver.on("/sys/rotation", (angle: number) => {
      this.#angle = angle;
      this.#receiveMessage("/sys/rotation");
    });

    this.#oscReceiver.on("/sys/prefix", (prefix: string) => {
      this.#prefix = prefix;
      this.localDeviceMessages();
      this.#receiveMessage("/sys/prefix");
    });

    this.#oscReceiver.on("/sys/connect", () => {
      this.#connected = true;
      this.emit("connected");
    });

    this.#oscReceiver.on("/sys/disconnect", () => {
      this.#connected = false;
      this.emit("disconnected");
    });

    this.#oscReceiver.on("/sys/size", (x: number, y: number) => {
      this.#columns = x;
      this.#rows = y;
      this.#receiveMessage("/sys/size");
    });
  }


  #receiveMessage(message: string) {
    if (this.#connected) return;

    // Once all properties have been set, this device is connected and initialized.
    if (this.#id       !== undefined && this.#deviceHost !== undefined &&
      this.#devicePort !== undefined && this.#angle      !== undefined &&
      this.#columns    !== undefined && this.#rows       !== undefined) {
      this.#connected = true;
      this.emit("initialized");
    }

    // Port was sent to the device first in start(), so next send the host.
    if (this.#devicePort !== undefined && this.#deviceHost === undefined) {
      this.#oscSender.send("/sys/host", { type: "string", value: this.#receiverHost });
    }

    // Once the host and port are set, request all device info, but only once.
    if (!this.#infoRequested && this.#devicePort !== undefined && this.#deviceHost !== undefined) {
      this.#infoRequested = true;
      this.#oscSender.send("/sys/info");
    }
  }
}
