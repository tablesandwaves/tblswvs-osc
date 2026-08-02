import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { OscSender } from "../build/osc_sender.js";
import { OscReceiver } from "../build/osc_receiver.js";
import { Grid, GRID_OSC_RECEIVER_PORT } from "../build/grid.js";
import { SerialOsc } from "../build/serial_osc.js";


describe("Grid", () => {
  let sender;
  let serialosc;
  let grid;

  beforeEach(() => {
    sender = new OscSender();
    sender.add("localhost", GRID_OSC_RECEIVER_PORT);

    grid = new Grid();
    grid.localDeviceMessages();
  });

  afterEach(() => {
    sender.disconnect();
    grid.disconnect();
  })

  it("receives key press messages", (_, done) => {
    grid.on("key", (keyPress) => {
      try {
        assert.equal(keyPress.x, 0);
        assert.equal(keyPress.y, 0);
        assert.equal(keyPress.s, 1);
        done();
      } catch (error) {
        done(error);
      }
    })

    sender.send("/monome/grid/key",
      { type: "integer", value: 0 },
      { type: "integer", value: 0 },
      { type: "integer", value: 1 }
    );
  });
});
