import dgram, { Socket } from "node:dgram";
import { EventEmitter } from "node:events";
import * as osc from "osc-min";


interface OscListener {
  host: string,
  port: number,
}

export type OscValue = {
  type: string,
  value: any,
}


export class OscSender extends EventEmitter {
  #listeners: OscListener[];
  #socket: Socket;


  /**
   * Create a new OSC sender object.
   */
  constructor() {
    super();

    this.#listeners= new Array();
    this.#socket = dgram.createSocket("udp4");
  }


  /**
   * Send an OSC message.
   *
   * @param {string} address the path-style address of the OSC message
   * @param {OscValue} parameters one or more values to send with the OSC message
   *
   * This function takes a variable list of parameters that will be expanded. Parameters should be sent
   * as `osc-min` typed objects. For example:
   *
   * ```
   *   { type: "integer", value: 127 },
   *   { type: "string",  value: "start" },
   * ```
   */
  send(address: string, ...parameters: any[]) {
    const message = osc.toBuffer({ address: address, args: parameters });

    this.#listeners.forEach(listener => {
      this.#socket.send(message, 0, message.byteLength, listener.port, listener.host);
    });
  }


  /**
   * Add an OSC message listener/receiver host/port combination.
   *
   * @param {string} host a hostname to send OSC messages to
   * @param {number} port a port for the specified hostname to send OSC messages to
   */
  add(host: string, port: number) {
    this.remove(host, port);
    this.#listeners.push({ host: host, port: port });
  }


  /**
   * Remove an OSC message listener/receiver host/port combination.
   *
   * @param {string} host a hostname to no longer send OSC messages to
   * @param {number} port a port for the specified hostname to no longer send OSC messages to
   */
  remove(host: string, port: number) {
    this.#listeners = this.#listeners.filter(listener => {
      return !(listener.host === host && listener.port === port);
    });
  }


  /**
   * Disconnect/close the socket used to send OSC messages.
   */
  disconnect() {
    this.#socket.close();
  }
}
