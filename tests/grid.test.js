import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { OscSender } from "../build/osc_sender.js";
import { OscReceiver } from "../build/osc_receiver.js";
import { Grid, GRID_OSC_RECEIVER_PORT } from "../build/grid.js";


describe("Grid", () => {
  let sender;   // mock sending messages from serialosc (mock key presses)
  let receiver; // mock serialosc receiving messages (mock setting grid button levels)
  let grid;

  beforeEach(() => {
    receiver = new OscReceiver();
    receiver.bind("localhost", 20_000);

    sender = new OscSender();
    sender.add("localhost", GRID_OSC_RECEIVER_PORT);

    grid = new Grid();
    grid.localDeviceMessages();
    grid.start({port: 20_000});
  });

  afterEach(() => {
    receiver.disconnect();
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
    });

    sender.send("/monome/grid/key",
      { type: "integer", value: 0 },
      { type: "integer", value: 0 },
      { type: "integer", value: 1 }
    );
  });

  it("can send messages to the grid for a single button", (_, done) => {
    receiver.on("/monome/grid/led/level/set", (x, y, s) => {
      try {
        assert.equal(x, 0);
        assert.equal(y, 0);
        assert.equal(s, 10);
        done();
      } catch (error) {
        done(error);
      }
    });

    grid.levelSet(0, 0, 10);
  });
});
