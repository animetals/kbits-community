/**
 * Kbits - kalimba-controller.test
 *
 * Checks kalimba controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var kalimbaController = require("../js/features/kalimba-controller.js");

function tine(lane, note) {
  var classes = new Set();
  return {
    dataset: { lane: String(lane), note: String(note) },
    classList: { add: function (name) { classes.add(name); }, remove: function (name) { classes.delete(name); } },
    closest: function () { return this; },
    hasClass: function (name) { return classes.has(name); }
  };
}

function fixture() {
  var first = tine(0, 60), second = tine(1, 62), played = [], swipe = true;
  var container = {
    querySelector: function (selector) { return selector.includes('"0"') ? first : second; },
    setPointerCapture: function () {}, addEventListener: function () {}
  };
  var controller = kalimbaController.create({
    container: container,
    document: { elementFromPoint: function () { return second; } },
    getPhysical: function () { return [60, 62]; }, getKeys: function () { return ["A", "S"]; },
    isSwipeEnabled: function () { return swipe; },
    playNote: function () { played.push(Array.from(arguments)); }, setTimeout: function () { return 1; }
  });
  return { controller: controller, first: first, second: second, played: played, setSwipe: function (value) { swipe = value; } };
}

test("preserves tine geometry rules for single and dual-row kalimbas", function () {
  assert.equal(kalimbaController.tineHeight(17, "single", 8, 8, 0), 285);
  assert.equal(kalimbaController.tineHeight(21, "single", 0, 10, 20), 65);
  assert.equal(kalimbaController.tineHeight(34, "upper", 0, 8, 3), 116);
  assert.equal(kalimbaController.tineHeight(34, "lower", 8, 8, 0), 180);
});

test("maps keyboard input to the tuned physical note and highlights it", function () {
  var f = fixture(), prevented = false;
  var handled = f.controller.handleKey({ key: "s", repeat: false, target: { matches: function () { return false; } }, preventDefault: function () { prevented = true; } });
  assert.equal(handled, true);
  assert.equal(prevented, true);
  assert.deepEqual(f.played[0], [62, 100, 0, .9]);
  assert.equal(f.second.hasClass("active"), true);
  assert.equal(kalimbaController.keyLane(["A", "S"], "a"), 0);
});

test("plays the initial tine and applies swipe policy while dragging", function () {
  var f = fixture();
  f.setSwipe(false);
  f.controller.beginPointer({ target: f.first, pointerType: "touch", pointerId: 4, preventDefault: function () {} });
  assert.equal(f.controller.movePointer({ pointerId: 4, clientX: 1, clientY: 1, preventDefault: function () {} }), false);
  assert.equal(f.played.length, 1);

  f.controller.endPointer();
  f.setSwipe(true);
  f.controller.beginPointer({ target: f.first, pointerType: "touch", pointerId: 5, preventDefault: function () {} });
  f.controller.movePointer({ pointerId: 5, clientX: 2, clientY: 2, preventDefault: function () {} });
  assert.deepEqual(f.played.slice(1).map(function (call) { return call[0]; }), [60, 62]);
});
