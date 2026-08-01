import { MonomeDevice } from "./device.js";


const GRID_OSC_RECEIVER_PORT = 12005;


export class Grid extends MonomeDevice {

  constructor() {
    super(GRID_OSC_RECEIVER_PORT);
  }


  localDeviceMessages() {
    super.oscReceiver.removeAllListeners(super.prefix + "/grid/key");

    super.oscReceiver.on(super.prefix + "/grid/key", (x: number, y: number, s: number) => {
      this.emit("key", {x: x, y: y, s: s});
    });
  }


  levelSet(x: number, y: number, s: number) {
    super.oscSender.send(super.prefix + "/grid/led/level/set",
      { type: "integer", value: x },
      { type: "integer", value: y },
      { type: "integer", value: s }
    );
  }


  levelRow(xOffset: number, y: number, row: number[]) {
  }


  levelMatrix(matrix: number[][]) {
  }


  clearGridDisplay(rowCount: number) {
  }
}
