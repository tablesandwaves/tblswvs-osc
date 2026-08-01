import { MonomeDevice } from "./device.js";


const GRID_OSC_RECEIVER_PORT = 12005;

export const GRID_ROW_COUNT      = 8;
export const GRID_ROW_START      = 0;
export const GRID_ROW_BISECT     = 8;
export const GRID_ROW_BLANK_HALF = [0, 0, 0, 0,  0, 0, 0, 0];
export const GRID_COLUMN_COUNT   = 16;
export const GRID_COLUMN_START   = 0;


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
    for (let gridY = yOffset, matrixY = 0; gridY < GRID_ROW_COUNT; gridY++, matrixY++) {
      this.levelRow(GRID_ROW_START,  gridY, matrix[matrixY].slice(0, 8));
      this.levelRow(GRID_ROW_BISECT, gridY, matrix[matrixY].slice(8, 16));
    }
  }


  clearGridDisplay(rowCount: number = 8) {
    for (let gridY = GRID_COLUMN_START; gridY < rowCount; gridY++) {
      this.levelRow(GRID_ROW_START,  gridY, GRID_ROW_BLANK_HALF);
      this.levelRow(GRID_ROW_BISECT, gridY, GRID_ROW_BLANK_HALF);
    }
  }
}
