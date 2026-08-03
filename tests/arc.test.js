import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { OscSender } from "../build/osc_sender.js";
import { OscReceiver } from "../build/osc_receiver.js";
import { Arc, ARC_OSC_RECEIVER_PORT } from "../build/arc.js";


describe("Arc", () => {
  let sender;   // mock sending messages from serialosc (mock key presses)
  let receiver; // mock serialosc receiving messages (mock setting grid button levels)
  let arc;

  beforeEach(() => {
    receiver = new OscReceiver();
    receiver.bind("localhost", 20_001);

    sender = new OscSender();
    sender.add("localhost", ARC_OSC_RECEIVER_PORT);

    arc = new Arc();
    arc.localDeviceMessages();
    arc.start({port: 20_001});
  });

  afterEach(() => {
    receiver.disconnect();
    sender.disconnect();
    arc.disconnect();
  })

  it("receives key press messages", (_, done) => {
    arc.on("key", (keyPress) => {
      console.log("keyPress", keyPress)
      try {
        assert.equal(keyPress, 1);
        done();
      } catch (error) {
        done(error);
      }
    });

    sender.send("/monome/enc/key", { type: "integer", value: 0 }, { type: "integer", value: 1 });
  });

  it("receives dial turn messages and produces parameter values", (_, done) => {
    arc.on("parameter", (param) => {
      try {
        assert.equal(param.index, 0);
        assert.equal(Math.round((param.value + Number.EPSILON) * 1_000_000) / 1_000_000, 0.020833);
        done();
      } catch (error) {
        done(error);
      }
    });

    sender.send("/monome/enc/delta", { type: "integer", value: 0 }, { type: "integer", value: 16 });
  });

  it("sends dial LEDs messages to light up in response to dial turns", (_, done) => {
    receiver.on("/monome/ring/range", (dialIndex, rangeStart, rangeEnd, brightness) => {
      try {
        assert.equal(dialIndex, 0);
        assert.equal(rangeStart, 39);
        assert.equal(rangeEnd, 41);
        assert.equal(brightness, 15);
        done();
      } catch (error) {
        done(error);
      }
    });

    sender.send("/monome/enc/delta", { type: "integer", value: 0 }, { type: "integer", value: 16 });
  });

  it("can update all encoder/parameter values", (_, done) => {
    const messages = { ringAllLedResets: 0, ringRangeSets: 0 };

    const checkFinished = () => {
      if (messages.ringAllLedResets === 4 && messages.ringRangeSets === 4) {
        try {
          assert.deepEqual(arc.encoderValues, [0.5, 0.5, 1, 1]);
          done();
        } catch (error) {
          done(error);
        }
      }
    }

    receiver.on("/monome/ring/all", (...args) => {
      messages.ringAllLedResets += 1;
      checkFinished();
    });

    receiver.on("/monome/ring/range", (...args) => {
      messages.ringRangeSets += 1;
      checkFinished();
    });

    arc.setDialValues([0.5, 0.5, 1, 1]);

  });
});
