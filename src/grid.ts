import { MonomeDevice } from "./device.js";


export const GRID_OSC_RECEIVER_PORT = 12005;

export const GRID_ROW_COUNT      = 8;
export const GRID_ROW_START      = 0;
export const GRID_ROW_BISECT     = 8;
export const GRID_ROW_BLANK_HALF = [0, 0, 0, 0,  0, 0, 0, 0];
export const GRID_COLUMN_COUNT   = 16;
export const GRID_COLUMN_START   = 0;


/**
 * A monome grid device that is a matrix of buttons. This object will emit events that correspond
 * to button key presses. A button press event will use the `key` message label and as an object
 * containing the `x` and `y` coordinates of the button and the button press state `s` (0 or 1).
 */
export class Grid extends MonomeDevice {

  /**
   * Create a new Grid device.
   */
  constructor() {
    super(GRID_OSC_RECEIVER_PORT);
  }


  /**
   * Load/reload all listeners for grid hardware messages.
   *
   * This will reset the listeners for the grid's button presses (/grid/key).
   */
  localDeviceMessages() {
    super.oscReceiver.removeAllListeners(super.prefix + "/grid/key");

    super.oscReceiver.on(super.prefix + "/grid/key", (x: number, y: number, s: number) => {
      this.emit("key", {x: x, y: y, s: s});
    });
  }


  /**
   * Set a single grid button to the specified brightness level.
   *
   * @param {number} x the x-coordinate of the button
   * @param {number} y the y-coordinate of the button
   * @param {number} s the state, or level, a number between 0 and 15
   */
  levelSet(x: number, y: number, s: number) {
    if (x < 0 || x > 15) throw new Error("x-coordinate must be between 0 and 15");
    if (y < 0 || y > 7)  throw new Error("y-coordinate must be between 0 and 7");
    if (s < 0 || s > 15) throw new Error("level state must be between 0 and 15");

    super.oscSender.send(super.prefix + "/grid/led/level/set",
      { type: "integer", value: x },
      { type: "integer", value: y },
      { type: "integer", value: s }
    );
  }


  /**
   * Set a half row of grid buttons.
   *
   * @param {number} xOffset the x-coordinate offset of the row, either 0 or 8
   * @param {number} y the y-coordinate offset of the row, number between 0 and 7
   * @param {number[]} row an `Array` of level values, numbers between 0 and 15
   */
  levelRow(xOffset: number, y: number, row: number[]) {
    if (xOffset !== 0 && xOffset !== 8) throw new Error("x-offset must be 0 or 8");
    if (y < 0 || y > 7) throw new Error("y-offset must be between 0 and 7")
    if (row.length !== 8) throw new Error("row must have length 8");
    if (!row.every(n => n >= 0 && n <= 15))
      throw new Error("grid levels must be between 0 and 15");

    super.oscSender.send(super.prefix + "/grid/led/level/row",
      { type: "integer", value: xOffset },
      { type: "integer", value: y },
      ...row.map(n => { return { type: "integer", value: n }; })
    );
  }


  /**
   * Set a matrix/grid of buttons.
   *
   * @param {matrix} matrix an n-by-16 2D `Array` of level values, numbers between 0 and 15
   * @param {number} yOffset the row index to start setting row values; optiona, default = 0
   */
  levelMatrix(matrix: number[][], yOffset: number = 0) {
    if (matrix.length > 8) throw new Error("matrix may not have more than 8 rows");
    if (!matrix.every(row => row.length === 16))
      throw new Error("matrix rows must contain 16 elements");

    for (let gridY = yOffset, matrixY = 0;
      gridY < GRID_ROW_COUNT && matrixY < matrix.length;
      gridY++, matrixY++) {
      this.levelRow(GRID_ROW_START,  gridY, matrix[matrixY].slice(0, 8));
      this.levelRow(GRID_ROW_BISECT, gridY, matrix[matrixY].slice(8, 16));
    }
  }


  /**
   * Turn all grid button lights off.
   */
  clearDisplay(rowCount: number = 8) {
    for (let gridY = GRID_COLUMN_START; gridY < rowCount; gridY++) {
      this.levelRow(GRID_ROW_START,  gridY, GRID_ROW_BLANK_HALF);
      this.levelRow(GRID_ROW_BISECT, gridY, GRID_ROW_BLANK_HALF);
    }
  }
}
