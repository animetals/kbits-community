/**
 * Kbits - transport-controller.test
 *
 * Checks transport controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const transport = require("../js/features/transport-controller.js");

function fixture() {
  const nodes = {}, events = {}, calls = [];
  const state = { song: { duration: 20 }, speed: 1, loopStart: null, loopEnd: null, loopEnabled: false };
  let position = 4;
  function find(id) {
    if (!nodes[id]) nodes[id] = { hidden: true, properties: {}, classes: new Set(), setAttribute(key, value) { this[key] = value; },
      style: { setProperty: (key, value) => { nodes[id].properties[key] = value; } },
      classList: { toggle: (key, value) => value ? nodes[id].classes.add(key) : nodes[id].classes.delete(key) },
      closest: () => ({ contains: target => target === nodes["#speed"] }), querySelectorAll: () => [find("option")]
    };
    return nodes[id];
  }
  find("option").dataset = { speed: "1.5" };
  const player = { position: () => position, play: () => calls.push("play"), stop: () => calls.push("stop"), seek: value => calls.push(["seek", value]), setSpeed: value => { state.speed = value; calls.push(["speed", value]); }, loopReady: () => state.loopStart !== null && state.loopEnd !== null && state.loopEnd > state.loopStart + 0.05 };
  const controller = transport.create({ document: { querySelector: find }, host: { addEventListener: (name, handler) => { (events[name] ||= []).push(handler); } }, state, player, clock: String });
  controller.setup(); controller.setupLoops();
  return { controller, state, calls, find, events, position: value => { position = value; } };
}

test("transport delegates play, stop, relative seek, and progress seek to the player", () => {
  const f = fixture();
  f.find("#play").onclick(); f.find("#stop").onclick();
  f.find("#rewind").onclick(); f.find("#forward").onclick();
  f.find("#progress").value = "750"; f.find("#progress").oninput();
  assert.deepEqual(f.calls, ["play", "stop", ["seek", -1], ["seek", 9], ["seek", 15]]);
  f.state.song = null; f.find("#rewind").onclick();
  assert.equal(f.calls.length, 5);
});

test("speed menu delegates speed changes and keyboard shortcuts ignore editable controls", () => {
  const f = fixture(), event = { stopPropagation() {} };
  f.find("#speed").onclick(event);
  assert.equal(f.find("#speed-options").hidden, false);
  f.find("option").onclick(event);
  assert.equal(f.state.speed, 1.5);
  assert.equal(f.find("#speed")["aria-label"], "Playback speed ×1.5");
  assert.equal(f.find("#speed-options").hidden, true);
  f.find("#speed").onclick(event); f.events.pointerdown[0]({ target: {} });
  assert.equal(f.find("#speed-options").hidden, true);
  for (const handler of f.events.keydown) handler({ code: "Space", target: { matches: () => true } });
  assert.deepEqual(f.calls, [["speed", 1.5]]);
  for (const code of ["Space", "ArrowLeft", "ArrowRight"]) for (const handler of f.events.keydown) handler({ code, target: { matches: () => false }, preventDefault() {} });
  assert.deepEqual(f.calls.slice(1), ["play", ["seek", -1], ["seek", 9]]);
});

test("loop markers invalidate old ranges, enable with a clock-based seek, and reset on song load", () => {
  const f = fixture();
  f.find("#loop-start").onclick();
  f.position(10); f.find("#loop-end").onclick();
  assert.equal(f.find("#loop-toggle").disabled, false);
  assert.equal(f.find("#progress-shell").properties["--loop-start-position"], "20%");
  f.position(12); f.find("#loop-toggle").onclick();
  assert.equal(f.state.loopEnabled, true);
  assert.deepEqual(f.calls, [["seek", 4]]);
  f.find("#loop-start").onclick();
  assert.equal(f.state.loopEnd, null);
  assert.equal(f.state.loopEnabled, false);
  assert.equal(f.find("#loop-toggle").disabled, true);
  f.controller.resetLoop();
  assert.equal(f.state.loopStart, null);
  assert.equal(f.find("#progress-shell").classes.has("has-loop-start"), false);
});
