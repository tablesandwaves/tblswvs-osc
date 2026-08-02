import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { OscReceiver } from "../build/osc_receiver.js";
import { OscSender } from "../build/osc_sender.js";


describe("OSC messaging", () => {
  let receiver;
  let sender;

  beforeEach(() => {
    receiver = new OscReceiver();
    sender = new OscSender();
    receiver.bind("localhost", 33_000);
    sender.add("localhost", 33_000);
  });

  afterEach(() => {
    receiver.disconnect();
    sender.disconnect();
  });

  it("sends text messages over the network", (_, done) => {
    receiver.on("/string", (...data) => {
      try {
        assert.equal(data[0], "Hello, World!");
        done();
      } catch (error) {
        done(error);
      }
    });

    sender.send("/string", { type: "string", value: "Hello, World!" });
  });

  it("sends numeric messages over the network", (_, done) => {
    receiver.on("/string", (...data) => {
      try {
        assert.equal(data[0], 3);
        done();
      } catch (error) {
        done(error);
      }
    });

    sender.send("/string", { type: "integer", value: 3 });
  });

  it("sends mixed messages over the network", (_, done) => {
    receiver.on("/mixed", (...data) => {
      try {
        assert.equal(data[0], "Hello, World!");
        assert.equal(data[1], 3);
        done();
      } catch (error) {
        done(error);
      }
    });

    sender.send("/mixed", { type: "string", value: "Hello, World!" }, { type: "integer", value: 3 });
  });
});
