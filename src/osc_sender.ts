import dgram, { Socket } from "node:dgram";
import { EventEmitter } from "node:events";
import * as osc from "osc-min";


interface OscListener {
  host: string,
  port: number,
}


export class OscSender extends EventEmitter {
  #listeners: OscListener[];
  #socket: Socket;


  constructor() {
    super();

    this.#listeners= new Array();
    this.#socket = dgram.createSocket("udp4");
  }


  send(address: string, ...parameters: any[]) {
    const message = osc.toBuffer({ address: address, args: parameters });

    this.#listeners.forEach(listener => {
      this.#socket.send(message, 0, message.byteLength, listener.port, listener.host);
    });
  }


  add(host: string, port: number) {
    this.remove(host, port);
    this.#listeners.push({ host: host, port: port });
  }


  remove(host: string, port: number) {
    this.#listeners = this.#listeners.filter(listener => {
      return !(listener.host === host && listener.port === port);
    });
  }


  disconnect() {
    this.#socket.close();
  }
}
