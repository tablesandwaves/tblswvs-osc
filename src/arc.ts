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


/**
 * A monome arc device with a button and four parameter dials. This object will emit events that
 * can be listened for that correspond to button presses and dial turns. A button press event will
 * use the `key` message label and have the value of 0 or 1 for released and pressed, respectively.
 * Parameter events will be emitted using the `parameter` label during dial rotation as an object
 * with an `index` (0-3) for the corresponding dial and a `value` normalized to the 0-1 range.
 */
export class Arc extends MonomeDevice {
  #encoderValues: number[];


  /**
   * Create a new Arc device.
   */
  constructor() {
    super(ARC_OSC_RECEIVER_PORT);

    this.#encoderValues = new Array(4).fill(0);
  }


  /**
   * Load/reload all listeners for arc hardware messages.
   *
   * This will reset the listeners for the arc's button presses (/enc/key) and dial turns
   * (/enc/delta) messages.
   */
  localDeviceMessages() {
    super.oscReceiver.removeAllListeners(super.prefix + "/enc/key");
    super.oscReceiver.removeAllListeners(super.prefix + "/enc/delta");

    super.oscReceiver.on(super.prefix + "/enc/key", (_: number, state: number) => {
      this.emit("key", state);
    });

    super.oscReceiver.on(super.prefix + "/enc/delta", (dialIndex: number, delta: number) => {
      this.#delta(dialIndex, delta);
    });
  }


  /**
   * Get this arc's current dial values.
   *
   * @return {number[]} an `Array` of the arc's dial values normalized to 0-1 range
   */
  get encoderValues() {
    return this.#encoderValues.map(value => value / ARC_ENCODER_MAX_VALUE);
  }


  /**
   * Set the arc's dial values to the current parameter list.
   *
   * @param {number[]} parameters the four values to set the arc's encoders to normalized to 0-1 range
   */
  setDialValues(parameters: number[]) {
    parameters.forEach((parameter, dialIndex) => {
      super.oscSender.send(super.prefix + "/ring/all",
        { type: "integer", value: dialIndex },
        { type: "integer", value: ARC_ENCODER_MIN_BRIGHTNESS }
      );

      setTimeout(() => {
        this.#encoderValues[dialIndex] = parameter * ARC_ENCODER_MAX_VALUE;
        this.#updateDeviceDials(dialIndex, 0, this.#encoderValues[dialIndex]);
      }, 5);
    });
  }


  /**
   * Set all arc dial values to 0.
   */
  clearDisplay() {
    this.setDialValues([0, 0, 0, 0]);
  }


  #delta(dialIndex: number, delta: number) {
    if ((this.#encoderValues[dialIndex] == ARC_ENCODER_MIN_VALUE && delta < 0) ||
        (this.#encoderValues[dialIndex] == ARC_ENCODER_MAX_VALUE && delta > 0)) return;

    const previousValue = this.#encoderValues[dialIndex];
    this.#encoderValues[dialIndex] += delta;
    this.#encoderValues[dialIndex] = this.#encoderValues[dialIndex] < ARC_ENCODER_MIN_VALUE ?
        ARC_ENCODER_MIN_VALUE : this.#encoderValues[dialIndex];
    this.#encoderValues[dialIndex] = this.#encoderValues[dialIndex] > ARC_ENCODER_MAX_VALUE ?
        ARC_ENCODER_MAX_VALUE : this.#encoderValues[dialIndex];

    // Tell listeners the new value normalized to 0-1 range, then update dial values.
    this.emit("parameter", { index: dialIndex, value: this.#encoderValues[dialIndex] / ARC_ENCODER_MAX_VALUE });
    this.#updateDeviceDials(dialIndex, previousValue, this.#encoderValues[dialIndex]);
  }


  #updateDeviceDials(dialIndex: number, previousValue: number, newValue: number) {
    const previousLedValue = previousValue / ARC_ENCODER_RESOLUTION;
    const ledValue         = this.#encoderValues[dialIndex] / ARC_ENCODER_RESOLUTION;

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
