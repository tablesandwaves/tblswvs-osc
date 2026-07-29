import dgram, { Socket } from "node:dgram";
import { EventEmitter } from "node:events";
import * as osc from "osc-min";


export class OscReceiver extends EventEmitter {
  #socket: Socket;


  constructor() {
    super();

    this.#socket = dgram.createSocket("udp4");
    this.#socket.on("message", message => this.#receive(message));
  }


  bind(host: string, port: number) {
    this.#socket.bind(port, host);
  }


  #receive(message: any) {
    try {
      const msg = osc.fromBuffer(message);

      const elements = msg.oscType === "bundle" ? msg.elements : [msg];

      elements.forEach((element: any) => {
        const args: any = [];
        element.args.forEach((arg: any) => args.push(arg.value));
        console.log(element.address, ...args);
        this.emit(element.address, ...args);
      });
    } catch (e) {
      this.emit("error", e);
      return;
    }
  }
}
