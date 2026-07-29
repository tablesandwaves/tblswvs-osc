import { MonomeDevice } from "./device.js";


export const ARC_ENCODER_RESOLUTION     = 16;
export const ARC_ENCODER_OFFSET         = 40;
export const ARC_ENCODER_LED_COUNT      = 64;
export const ARC_ENCODER_MIN_BRIGHTNESS = 0;
export const ARC_ENCODER_MAX_BRIGHTNESS = 15;
export const ARC_ENCODER_STEP_COUNT     = 48;
export const ARC_ENCODER_MIN_VALUE      = 0;
export const ARC_ENCODER_MAX_VALUE      = ARC_ENCODER_STEP_COUNT * ARC_ENCODER_RESOLUTION;


interface ArcDelta {
  n: 0 | 1 | 2 | 3;
  d: number;
}


interface ArcKeyPress {
  n: 0 | 1 | 2 | 3;
  s: 0 | 1;
}


// const events: MessageEvents = {
//   "dial-values": (arc: Arc, params: any) => arc.setDialValues(params.values),
// }

const ARC_OSC_RECEIVER_PORT  = 12004;


export class Arc extends MonomeDevice {
  #device: any;
  #encoderValues: number[];


  constructor() {
    super(ARC_OSC_RECEIVER_PORT);

    this.#encoderValues = new Array(4).fill(0);
  }


  // event(message: EventMessage) {
  //   events[message.event](this, message.params);
  // }


  get encoderValues() {
    return this.#encoderValues;
  }


  async connect() {
    return new Promise((resolve, _) => {
      // serialosc.on("device:add", (device: any) => {
      //   if (this.#device)          return;
      //   if (device.type !== "arc") return;

      //   this.#device = device;
      //   this.#device.on("initialized", () => {
      //     this.#device.on("key", (keyPress: ArcKeyPress) => this.keyPress(keyPress));
      //     this.#device.on("delta", (delta: ArcDelta) => this.delta(delta));
      //   });
      //   this.#device.start();

      //   resolve(
      //     `Connected to ${this.#device.model} ${this.#device.id} on ` +
      //     `${this.#device.deviceHost}:${this.#device.devicePort}`
      //   );
      // });
    });
  }


  clearDisplay() {
    for (let i = 0; i < 4; i++)
      this.#device.all(i, 0)
  }


  delta(delta: ArcDelta) {
    if ((this.#encoderValues[delta.n] == ARC_ENCODER_MIN_VALUE && delta.d < 0) ||
        (this.#encoderValues[delta.n] == ARC_ENCODER_MAX_VALUE && delta.d > 0)) return;

    const previousValue = this.#encoderValues[delta.n];
    this.#encoderValues[delta.n] += delta.d;
    this.#encoderValues[delta.n] = this.#encoderValues[delta.n] < ARC_ENCODER_MIN_VALUE ?
        ARC_ENCODER_MIN_VALUE : this.#encoderValues[delta.n];
    this.#encoderValues[delta.n] = this.#encoderValues[delta.n] > ARC_ENCODER_MAX_VALUE ?
        ARC_ENCODER_MAX_VALUE : this.#encoderValues[delta.n];

    // Tell the main application the updated value in normalized 0-1 range to pass onto the current track.
    this.emit("update-parameter", delta.n, this.#encoderValues[delta.n] / ARC_ENCODER_MAX_VALUE);

    this.#updateDeviceDials(delta.n, previousValue, this.#encoderValues[delta.n]);
  }


  setDialValues(parameters: number[]) {
    parameters.forEach((parameter, i) => {
      this.#encoderValues[i] = parameter;
      this.#device.all(i, 0);
      setTimeout(() => {
        this.#encoderValues[i] = parameter * ARC_ENCODER_MAX_VALUE;
        this.#updateDeviceDials(i, 0, this.#encoderValues[i]);
      }, 20);
    });
  }


  #updateDeviceDials(dialIndex: number, previousValue: number, newValue: number) {
    const previousLedValue   = previousValue / ARC_ENCODER_RESOLUTION;
    const ledValue           = this.#encoderValues[dialIndex] / ARC_ENCODER_RESOLUTION;
    const updatePartialValue = (ledValue % 1) * ARC_ENCODER_RESOLUTION;

    if (newValue > previousValue) {
      this.#device.range(
        dialIndex,
        Math.floor(previousLedValue - 1) + ARC_ENCODER_OFFSET,
        (Math.floor(ledValue) + ARC_ENCODER_OFFSET) % ARC_ENCODER_LED_COUNT,
        ARC_ENCODER_MAX_BRIGHTNESS
      );
      this.#device.set(dialIndex, (Math.floor(ledValue) + 41) % ARC_ENCODER_LED_COUNT, updatePartialValue);
    } else {
      this.#device.range(
        dialIndex,
        (Math.floor(ledValue) + 39) % ARC_ENCODER_LED_COUNT,
        (Math.floor(previousLedValue) + 41) % ARC_ENCODER_LED_COUNT,
        ARC_ENCODER_MIN_BRIGHTNESS
      );
      this.#device.set(dialIndex, (Math.floor(previousLedValue) + 40) % ARC_ENCODER_LED_COUNT - 1, updatePartialValue);
    }
  }


  keyPress(keyPress: ArcKeyPress) {
    if (keyPress.s === 1)
      this.emit("key-press");
  }
}
