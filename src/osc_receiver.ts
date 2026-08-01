import dgram, { Socket } from "node:dgram";
import { EventEmitter } from "node:events";
import * as osc from "osc-min";


export class OscReceiver extends EventEmitter {
  #socket: Socket;


  constructor() {
    super();

    this.#socket = dgram.createSocket("udp4");
    this.#socket.on("message", data => this.#receive(data));
  }


  bind(host: string, port: number) {
    this.#socket.bind(port, host);
  }


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
