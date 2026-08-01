import { MonomeDevice } from "./device.js";


export const ARC_ENCODER_RESOLUTION     = 16;
export const ARC_ENCODER_OFFSET         = 40;
export const ARC_ENCODER_LED_COUNT      = 64;
export const ARC_ENCODER_MIN_BRIGHTNESS = 0;
export const ARC_ENCODER_MAX_BRIGHTNESS = 15;
export const ARC_ENCODER_STEP_COUNT     = 48;
export const ARC_ENCODER_MIN_VALUE      = 0;
export const ARC_ENCODER_MAX_VALUE      = ARC_ENCODER_STEP_COUNT * ARC_ENCODER_RESOLUTION;

const ARC_OSC_RECEIVER_PORT  = 12004;


export class Arc extends MonomeDevice {
  #encoderValues: number[];


  constructor() {
    super(ARC_OSC_RECEIVER_PORT);

    this.#encoderValues = new Array(4).fill(0);
  }


  localDeviceMessages() {
    super.oscReceiver.removeAllListeners(super.prefix + "/enc/key");
    super.oscReceiver.removeAllListeners(super.prefix + "/enc/delta");

    super.oscReceiver.on(super.prefix + "/enc/key", (_: number, state: number) => {
      this.emit("key", state);
    });

    super.oscReceiver.on(super.prefix + "/enc/delta", (index: number, delta: number) => {
      this.#delta(index, delta);
    });
  }


  get encoderValues() {
    return this.#encoderValues.map(value => value / ARC_ENCODER_MAX_VALUE);
  }


  clearDisplay() {
  }


  #delta(index: number, delta: number) {
    if ((this.#encoderValues[index] == ARC_ENCODER_MIN_VALUE && delta < 0) ||
        (this.#encoderValues[index] == ARC_ENCODER_MAX_VALUE && delta > 0)) return;

    const previousValue = this.#encoderValues[index];
    this.#encoderValues[index] += delta;
    this.#encoderValues[index] = this.#encoderValues[index] < ARC_ENCODER_MIN_VALUE ?
        ARC_ENCODER_MIN_VALUE : this.#encoderValues[index];
    this.#encoderValues[index] = this.#encoderValues[index] > ARC_ENCODER_MAX_VALUE ?
        ARC_ENCODER_MAX_VALUE : this.#encoderValues[index];

    // Tell listeners the new value normalized to 0-1 range, then update dial values.
    this.emit("parameter", { index: index, value: this.#encoderValues[index] / ARC_ENCODER_MAX_VALUE });
    this.#updateDeviceDials(index, previousValue, this.#encoderValues[index]);
  }


  setDialValues(parameters: number[]) {
    // parameters.forEach((parameter, i) => {
    //   this.#encoderValues[i] = parameter;
    //   this.#device.all(i, 0);
    //   setTimeout(() => {
    //     this.#encoderValues[i] = parameter * ARC_ENCODER_MAX_VALUE;
    //     this.#updateDeviceDials(i, 0, this.#encoderValues[i]);
    //   }, 20);
    // });
  }


  #updateDeviceDials(dialIndex: number, previousValue: number, newValue: number) {
    const previousLedValue   = previousValue / ARC_ENCODER_RESOLUTION;
    const ledValue           = this.#encoderValues[dialIndex] / ARC_ENCODER_RESOLUTION;
    const updatePartialValue = (ledValue % 1) * ARC_ENCODER_RESOLUTION;

    if (newValue > previousValue) {
      super.oscSender.send(super.prefix + "/ring/range",
        { type: "integer", value: dialIndex },
        { type: "integer", value: Math.floor(previousLedValue - 1) + ARC_ENCODER_OFFSET },
        { type: "integer", value: (Math.floor(ledValue) + ARC_ENCODER_OFFSET) % ARC_ENCODER_LED_COUNT },
        { type: "integer", value: ARC_ENCODER_MAX_BRIGHTNESS },
      );
    } else {
      super.oscSender.send(super.prefix + "/ring/range",
        { type: "integer", value: dialIndex },
        { type: "integer", value: (Math.floor(ledValue) + 39) % ARC_ENCODER_LED_COUNT },
        { type: "integer", value: (Math.floor(previousLedValue) + 41) % ARC_ENCODER_LED_COUNT },
        { type: "integer", value: ARC_ENCODER_MIN_BRIGHTNESS },
      );
    }
  }
}
