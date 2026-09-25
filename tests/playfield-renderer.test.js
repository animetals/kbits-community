/**
 * Kbits - playfield-renderer.test
 *
 * Checks playfield renderer behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const renderer = require("../js/features/playfield-renderer.js");

function fixture() {
  const calls = [], handlers = {}, nodes = { "#progress": {}, "#time": {} };
  let position = 2, now = 100, measurements = 0, sprites = 0, staff;
  const context = {};
  for (const name of ["clearRect", "setTransform", "beginPath", "moveTo", "lineTo", "stroke", "fillRect", "drawImage", "scale", "strokeText", "fillText"]) context[name] = (...args) => calls.push([name, ...args]);
  context.measureText = () => ({ width: 12 });
  const canvas = { clientWidth: 300, clientHeight: 400, width: 0, height: 0, getContext: () => context, getBoundingClientRect: () => ({ left: 100, top: 50 }), addEventListener: (name, fn) => { handlers[name] = fn; } };
  const state = { viewMode: "blocks", fallingStyle: "block", preview: 3, song: { duration: 4, notes: [{ note: 60, start: 2 }, { note: 61, start: 2 }] } };
  const view = { physical: [60], colors: ["red"], tuningOffsets: [0], layout: 17 };
  const api = renderer.create({ canvas, state, document: { body: { dataset: { theme: "grove" } }, querySelector: id => nodes[id], querySelectorAll: () => [{ dataset: { lane: "0" }, getBoundingClientRect: () => { measurements++; return { left: 130, top: 350, width: 20 }; } }], createElement: () => { sprites++; return { getContext: () => context }; } },
    getView: () => view, getStaff: () => staff, getPixelRatio: () => 2, now: () => now, requestAnimationFrame: callback => calls.push(["schedule", callback]),
    position: () => position, lowerBound: time => { const index = state.song.notes.findIndex(note => note.start >= time); return index < 0 ? state.song.notes.length : index; },
    midiName: () => "C4", numberName: () => "1", clock: value => String(Math.floor(value)),
    playNote: (...args) => calls.push(["play", ...args]), hit: note => calls.push(["hit", note])
  });
  return { api, state, view, calls, canvas, handlers, nodes, setTime: (p, n) => { position = p; now = n; }, setStaff: value => { staff = value; }, measurements: () => measurements, sprites: () => sprites };
}

test("falling notes reach canvas-relative tine tops using the playback clock; unmapped notes are hidden", () => {
  const f = fixture();
  f.api.renderFrame();
  assert.deepEqual(f.calls.filter(call => call[0] === "fillRect"), [["fillRect", 26, 295, 28, 10]]);
  assert.equal(f.measurements(), 1);
  assert.equal(f.nodes["#progress"].value, 500);
  f.view.layout = 34;
  f.calls.length = 0;
  f.api.renderFrame();
  assert.deepEqual(f.calls.find(call => call[0] === "fillRect"), ["fillRect", 34, 295, 12, 10]);
});

test("canvas scaling and progress throttling stay independent of render frequency", () => {
  const f = fixture();
  f.api.resize();
  assert.equal(f.canvas.width, 600);
  assert.equal(f.canvas.height, 800);
  assert.deepEqual(f.calls[0], ["setTransform", 2, 0, 0, 2, 0, 0]);
  f.api.renderFrame();
  f.setTime(3, 150); f.api.renderFrame();
  assert.equal(f.nodes["#progress"].value, 500);
  f.setTime(3, 200); f.api.renderFrame();
  assert.equal(f.nodes["#progress"].value, 750);
  f.api.resetProgress();
  assert.equal(f.nodes["#progress"].value, 0);
  assert.equal(f.nodes["#time"].textContent, "00:00 / 4");
});

test("text sprites are reused until invalidated and rendering does not advance the clock", () => {
  const f = fixture();
  f.state.fallingStyle = "note";
  f.api.renderFrame(); f.api.renderFrame();
  assert.equal(f.sprites(), 1);
  f.api.invalidateSprites(); f.api.renderFrame();
  assert.equal(f.sprites(), 2);
  assert.equal(f.nodes["#progress"].value, 500);
  f.api.start();
  assert.equal(f.calls.filter(call => call[0] === "schedule").length, 1);
});

test("staff receives shared clock/tuning and pointer previews do not alter playback", () => {
  const f = fixture();
  let supplied, point;
  f.state.viewMode = "staff";
  f.setStaff({ draw: options => { supplied = options; }, hitTest: (x, y) => { point = [x, y]; return { event: { note: 60, velocity: 90 } }; } });
  f.api.renderFrame();
  assert.equal(supplied.position, 2);
  assert.equal(supplied.keyShift, 0);
  assert.equal(supplied.theme, "grove");
  f.api.setupStaffInteraction();
  f.handlers.pointerdown({ clientX: 140, clientY: 90, preventDefault() {} });
  assert.deepEqual(point, [40, 40]);
  assert.deepEqual(f.calls.slice(-2), [["play", 60, 90, 0, 0.8], ["hit", 60]]);
  assert.equal(f.nodes["#progress"].value, 500);
});
