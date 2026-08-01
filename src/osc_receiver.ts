import dgram, { Socket } from "node:dgram";
import { EventEmitter } from "node:events";
import * as osc from "osc-min";


export class OscReceiver extends EventEmitter {
  #socket: Socket;


  /**
   * Create a new OSC receiver object.
   */
  constructor() {
    super();

    this.#socket = dgram.createSocket("udp4");
    this.#socket.on("message", data => this.#receive(data));
  }


  /**
   * Bind the receiver to the specified host and port.
   *
   * @param {string} host a hostname to use for listening for OSC messages
   * @param {number} port a port for the specified hostname used for listening for OSC messages
   */
  bind(host: string, port: number) {
    this.#socket.bind(port, host);
  }


  /**
   * Disconnect/close the socket used to send OSC messages.
   */
  disconnect() {
    this.#socket.close();
  }


  #receive(data: any) {
    try {
      const messages: osc.OscMessageOutput[] = [];

      const decodedMsg = osc.fromBuffer(data);
      if (decodedMsg.oscType === "bundle")
        messages.push(...decodedMsg.elements as osc.OscMessageOutput[]);
      else if (decodedMsg.oscType === "message")
        messages.push(decodedMsg);

      messages.forEach(message => this.emit(message.address, ...message.args.map((arg: any) => arg.value)));
    } catch (e) {
      this.emit("error", e);
      return;
    }
  }
}
