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
    super.oscSender.send(super.prefix + "/grid/led/level/row",
      { type: "integer", value: xOffset },
      { type: "integer", value: y },
      ...row.map(n => { return { type: "integer", value: n }; })
    );
  }


  levelMatrix(matrix: number[][], yOffset: number = 0) {
    for (let y = 0; y < matrix.length; y++) {
      this.levelRow(0, y, matrix[y].slice(0, 8));
      this.levelRow(8, y, matrix[y].slice(8, 16));
    }
  }


  clearGridDisplay(rowCount: number = 8) {
    for (let i = 0; i < rowCount; i++) {
      this.levelRow(0, i, [0, 0, 0, 0,  0, 0, 0, 0]);
      this.levelRow(8, i, [0, 0, 0, 0,  0, 0, 0, 0]);
    }
  }
}
