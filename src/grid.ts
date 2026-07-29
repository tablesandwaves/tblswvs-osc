import { MonomeDevice } from "./device.js";


export const ACTIVE_BRIGHTNESS    = 10;
export const SECONDARY_BRIGHTNESS = 1;
export const INACTIVE_BRIGHTNESS  = 0;
export const HIGHLIGHT_BRIGHTNESS = 15;


export interface GridControllerConfiguration {
  name: string,
  description: string,
  pages: GridPageConfiguration[]
}


export interface GridPageConfiguration {
  name: string,
  rows: any[],
  matrices?: any[]
}


export interface GridPageButton {
  mapping: string,
  shiftMapping?: string,
  value?: any,
  shiftValue?: any
}


export interface GridKeyPress {
  x: number,
  y: number,
  s: number
}


// const events: MessageEvents = {
//   "set-grid-matrix": (grid: Grid, params: any) => grid.levelMatrix(params.matrix),
//   "level-set": (grid: Grid, params: any) => grid.levelSet(params.x, params.y, params.level),
//   "level-row": (grid: Grid, params: any) => grid.levelRow(params.xOffset, params.y, params.row),
// }

const GRID_OSC_RECEIVER_PORT = 12005;


export class Grid extends MonomeDevice {
  #device: any;


  constructor() {
    super(GRID_OSC_RECEIVER_PORT);
  }


  async connect() {
    return new Promise((resolve, _) => {
      // serialosc.on("device:add", (device: any) => {
      //   if (this.#device)           return;
      //   if (device.type !== "grid") return;

      //   this.device = device;
      //   this.#device.on("initialized", () => {
      //     device.on("key", (keyPress: GridKeyPress) => this.keyPress(keyPress));
      //   });
      //   this.#device.start();

      //   resolve(
      //     `Connected to ${this.#device.model} ${this.#device.id} on ` +
      //     `${this.#device.deviceHost}:${this.#device.devicePort}`
      //   );
      // });
    });
  }


  get device() {
    return this.#device;
  }


  set device(device: any) {
    this.#device = device;
  }


  levelSet(x: number, y: number, s: number) {
    this.#device.levelSet(x, y, s);
  }


  levelRow(xOffset: number, y: number, row: number[]) {
    this.#device.levelRow(xOffset, y, row);
  }


  levelMatrix(matrix: number[][]) {
    for (let row = 0; row < matrix.length; row++) {
      this.levelRow(0, row, matrix[row].slice(0, 8));
      this.levelRow(8, row, matrix[row].slice(8, 16));
    }
  }


  keyPress(press: GridKeyPress) {
    this.emit("application-event", { event: "key-press", params: { press: press } });
  }


  clearGridDisplay(rowCount: number = 7) {
    for (let y = 0; y < rowCount; y++) {
      // this.#device.levelRow(0, y, blank1x8Row);
      // this.#device.levelRow(8, y, blank1x8Row);
    }
  }


  // event(message: EventMessage) {
  //   events[message.event](this, message.params);
  // }
}
