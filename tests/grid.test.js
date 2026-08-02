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

  it("only allows level set messages for x-coordinates 0-15", () => {
    assert.throws(() => {
      grid.levelSet(-1, 0, 10);
    }, /^Error: x-coordinate must be between 0 and 15/);
  });

  it("only allows level set messages for y-coordinates 0-7", () => {
    assert.throws(() => {
      grid.levelSet(0, 9, 10);
    }, /^Error: y-coordinate must be between 0 and 7/);
  });

  it("only allows level set messages for levels 0-15", () => {
    assert.throws(() => {
      grid.levelSet(0, 0, 20);
    }, /^Error: level state must be between 0 and 15/);
  });

  it("can send messages to the grid for the first half of a row", (_, done) => {
    receiver.on("/monome/grid/led/level/row", (...args) => {
      try {
        assert.equal(args[0], 0);
        assert.equal(args[1], 1);
        assert.deepEqual(args.slice(2), [ 1, 0, 0, 0,  1, 0, 0, 0 ]);
        done();
      } catch (error) {
        done(error);
      }
    });

    grid.levelRow(0, 1, [ 1, 0, 0, 0,  1, 0, 0, 0 ]);
  });

  it("can send messages to the grid for the second half of a row", (_, done) => {
    receiver.on("/monome/grid/led/level/row", (...args) => {
      try {
        assert.equal(args[0], 8);
        assert.equal(args[1], 1);
        assert.deepEqual(args.slice(2), [ 1, 0, 0, 0,  1, 0, 0, 0 ]);
        done();
      } catch (error) {
        done(error);
      }
    });

    grid.levelRow(8, 1, [ 1, 0, 0, 0,  1, 0, 0, 0 ]);
  });

  it("only allows level row messages with x-offsets that are 0 or 8", () => {
    assert.throws(() => {
      grid.levelRow(1, 1, [ 1, 0, 0, 0,  1, 0, 0, 0 ]);
    }, /^Error: x-offset must be 0 or 8/);
  });

  it("only allows level row messages with y-offsets between 0 and 7", () => {
    assert.throws(() => {
      grid.levelRow(0, 8, [ 1, 0, 0, 0,  1, 0, 0, 0 ]);
    }, /^Error: y-offset must be between 0 and 7/);
  });

  it("only allows level row messages with rows that have 8 elements", () => {
    assert.throws(() => {
      grid.levelRow(8, 1, [ 1, 0, 0, 0,  1, 0, 0, 0,  1 ]);
    }, /^Error: row must have length 8/);
  });

  it("only allows level row messages with rows containing digits 0-15", () => {
    assert.throws(() => {
      grid.levelRow(0, 0, [ -1, 0, 0, 0,  1, 0, 0, 0 ]);
    }, /^Error: grid levels must be between 0 and 15/);
  });


  describe("sending complete rows as matrices", () => {
    let matrix;

    beforeEach(() => {
      matrix = new Array();
      for (let i = 0; i < 8; i++)
        matrix[i] = [ 1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0 ];
    })

    it("can send a matrix for one complete row", (_, done) => {
      const messages = { firstHalf: false, secondHalf: false };

      receiver.on("/monome/grid/led/level/row", (...args) => {
        try {
          if (args[0] === 0)
            messages.firstHalf = true;
          else if (args[0] === 8)
            messages.secondHalf = true;
          assert.equal(args[1], 0);
          assert.deepEqual(args.slice(2), [ 1, 0, 0, 0,  1, 0, 0, 0 ]);

          if (messages.firstHalf && messages.secondHalf)
            done();
        } catch (error) {
          done(error);
        }
      });

      grid.levelMatrix(matrix.slice(0, 1));
    });

    it("can send a matrix for multiple complete rows", (_, done) => {
      const messages = new Array();

      receiver.on("/monome/grid/led/level/row", (...args) => {
        try {
          assert.deepEqual(args.slice(2), [ 1, 0, 0, 0,  1, 0, 0, 0 ]);

          // Add the 0/8 row half start indices to each message row
          if (messages[args[1]] === undefined)
            messages[args[1]] = new Array();
          messages[args[1]].push(args[0]);

          if (messages.length === 2) {
            const allMessagesReceived = messages.reduce((allReceived, rowStartIndices) => {
              if (rowStartIndices.length === 2 &&
                  rowStartIndices[0] === 0 &&
                  rowStartIndices[1] === 8)
                allReceived = true;
                return allReceived;
            }, false);

            if (allMessagesReceived)
              done();
          }
        } catch (error) {
          done(error);
        }
      });

      grid.levelMatrix(matrix.slice(0, 2));
    });

    it("can send a matrix for all complete rows", (_, done) => {
      const messages = new Array();

      receiver.on("/monome/grid/led/level/row", (...args) => {
        try {
          assert.deepEqual(args.slice(2), [ 1, 0, 0, 0,  1, 0, 0, 0 ]);

          // Add the 0/8 row half start indices to each message row
          if (messages[args[1]] === undefined)
            messages[args[1]] = new Array();
          messages[args[1]].push(args[0]);

          if (messages.length === 8) {
            const allMessagesReceived = messages.every(rowStartIndices => {
              return rowStartIndices.length === 2 &&
                rowStartIndices.includes(0) &&
                rowStartIndices.includes(8);
            });

            if (allMessagesReceived)
              done();
          }
        } catch (error) {
          done(error);
        }
      });

      grid.levelMatrix(matrix);
    });

    it("can send a matrix with an offset", (_, done) => {
      const messages = new Array();

      receiver.on("/monome/grid/led/level/row", (...args) => {
        try {
          assert.deepEqual(args.slice(2), [ 1, 0, 0, 0,  1, 0, 0, 0 ]);

          // Add the 0/8 row half start indices to each message row
          if (messages[args[1]] === undefined)
            messages[args[1]] = new Array();
          messages[args[1]].push(args[0]);

          if (messages.filter(Array).length === 2) {
            const allMessagesReceived = messages.filter(Array).every(rowStartIndices => {
              return rowStartIndices.length === 2 &&
                rowStartIndices.includes(0) &&
                rowStartIndices.includes(8);
            });

            if (allMessagesReceived) {
              // Finally verify the offset indices.
              assert.equal(messages[0], undefined);
              assert.notEqual(messages[1], undefined)
              assert.notEqual(messages[2], undefined)
              done();
            }
          }
        } catch (error) {
          done(error);
        }
      });

      grid.levelMatrix(matrix.slice(0, 2), 1);
    });

    it("only allows level matrix messages for matrices with a max of 8 rows", () => {
      matrix[8] = [ 1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0 ];
      assert.throws(() => {
        grid.levelMatrix(matrix);
      }, /^Error: matrix may not have more than 8 rows/);
    });

    it("only allows level matrix messages for matrices containing 16 element rows", () => {
      matrix[0] = [ 1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1 ];
      assert.throws(() => {
        grid.levelMatrix(matrix);
      }, /^Error: matrix rows must contain 16 elements/);
    });
  });


  it("can clear all rows", (_, done) => {
    const messages = new Array();

    receiver.on("/monome/grid/led/level/row", (...args) => {
      try {
        assert.deepEqual(args.slice(2), [ 0, 0, 0, 0,  0, 0, 0, 0 ]);

        // Add the 0/8 row half start indices to each message row
        if (messages[args[1]] === undefined)
          messages[args[1]] = new Array();
        messages[args[1]].push(args[0]);

        if (messages.filter(Array).length === 8) {
          const allMessagesReceived = messages.filter(Array).every(rowStartIndices => {
            return rowStartIndices.length === 2 &&
              rowStartIndices.includes(0) &&
              rowStartIndices.includes(8);
          });

          if (allMessagesReceived)
            done();
        }
      } catch (error) {
        done(error);
      }
    });

    grid.clearDisplay();
  });
});
