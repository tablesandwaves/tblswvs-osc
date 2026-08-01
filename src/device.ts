import { EventEmitter } from "node:events";
import { OscReceiver } from "./osc_receiver.js";
import { OscSender } from "./osc_sender.js";


export interface DeviceOptions {
  id: string,
  model: string,
  port: number,
  type: string|undefined,
}


/**
 * A `MonomeDevice` represents either the connected grid or arc.
 */
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


  /**
   * Create a new monome device object, either a grid or an arc.
   *
   * @param {number} oscReceiverPort the port number this device should use to receive messages from serialoscd
   */
  constructor(oscReceiverPort: number) {
    super();

    this.#receiverPort = oscReceiverPort;

    this.#oscReceiver = new OscReceiver();
    this.#oscSender  = new OscSender();

    this.#oscReceiver.bind(this.#receiverHost, this.#receiverPort);
    this.#deviceMessages();

    this.#infoRequested = false;
    this.#connected     = false;
  }


  /**
   * Get the device id.
   *
   * @return {string} the device's hardware ID
   */
  get id() {
    return this.#id;
  }


  /**
   * Get the port of the monome device that messages are sent to.
   *
   * @return {number} the device's listening port.
   */
  get devicePort() {
    return this.#devicePort;
  }


  /**
   * Get the OSC receiver object used to listen to incoming messages.
   *
   * @return {OscReceiver} the OSC receiver listening for messages from this object's connected device
   */
  get oscReceiver() {
    return this.#oscReceiver;
  }


  /**
   * Get the OSC sender object used to send messages.
   *
   * @return {OscSender} the OSC sender that sends messages to this object's connected device
   */
  get oscSender() {
    return this.#oscSender;
  }


  /**
   * Get the monome device prefix.
   *
   * @return {string} the message prefix used by the connected monome device when it sends messages
   */
  get prefix() {
    return this.#prefix;
  }


  /**
   * Start this device.
   *
   * @param {DeviceOptions} deviceOpts the initial metadata used to startup the device
   *
   * Once notified with the `DeviceOptions` data, this device will then request the remaining information from the
   * serialoscd service to finish loading the current device properties.
   */
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


  /**
   * Stop this device and treat it as unconnected.
   */
  stop() {
    this.#connected = false;
  }


  /**
   * Disconnect/close sockets for receiving and transmitting OSC messages for this device.
   */
  disconnect() {
    this.#oscReceiver.disconnect();
    this.#oscSender.disconnect();
  }


  toString() {
    return `${this.#type} ${this.#id} ${this.#model} ${this.#prefix} ${this.#connected} ` +
      `${this.#rows} ${this.#columns} ${this.#angle}`;
  }


  localDeviceMessages() {}


  #deviceMessages() {
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
