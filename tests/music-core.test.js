/**
 * Kbits - music-core.test
 *
 * Checks music core behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var music = require("../js/core/music-core.js");

test("exposes every supported physical layout without mutable shared arrays", function () {
  assert.deepEqual(music.supportedLayouts(), [8, 17, 21, 34]);
  music.getLayout(8).physical[0] = 0;
  assert.equal(music.getLayout(8).physical[0], 72);
});

test("preserves the physical center and adjacent notes for standard layouts", function () {
  assert.deepEqual(music.getLayout(8).physical, [72, 69, 65, 62, 60, 64, 67, 71]);
  assert.equal(music.getLayout(17).physical[8], 60);
  assert.deepEqual(music.getLayout(21).physical.slice(9, 12), [62, 60, 64]);
});

test("preserves both physical rows of the Seeds Pisces 34-key layout", function () {
  var physical = music.getLayout(34).physical;
  assert.deepEqual(physical.slice(0, 17), [86, 83, 79, 76, 72, 69, 65, 62, 60, 64, 67, 71, 74, 77, 81, 84, 88]);
  assert.deepEqual(physical.slice(17), [87, 84, 80, 77, 73, 70, 59, 55, 53, 57, 68, 72, 75, 78, 82, 85, 89]);
});

test("normalizes and applies per-tine tuning without mutating inputs", function () {
  var notes = [60, 62, 64];
  var offsets = [1, -1, 12];
  assert.deepEqual(music.applyTuning(notes, offsets), [61, 61, 76]);
  assert.deepEqual(notes, [60, 62, 64]);
  assert.deepEqual(music.normalizeTuning([1], 3), [0, 0, 0]);
  assert.deepEqual(music.normalizeTuning([1, "bad", 2], 3), [1, 0, 2]);
});

test("converts MIDI names in both directions", function () {
  assert.equal(music.nameToMidi("C4"), 60);
  assert.equal(music.nameToMidi("F#6"), 90);
  assert.equal(music.nameToMidi("invalid"), -1);
  assert.equal(music.midiName(60), "C4");
  assert.equal(music.midiName(90), "F#6");
});

test("formats numbered notation and resolves duplicate pitches to the lower row", function () {
  assert.equal(music.numberName(60), "1");
  assert.equal(music.numberName(72), "1'");
  assert.equal(music.numberName(48), "1↓");
  assert.equal(music.findLane(music.getLayout(34).physical, 72), 4);
});

test("rejects unsupported layouts", function () {
  assert.equal(music.hasLayout(17), true);
  assert.equal(music.hasLayout(12), false);
  assert.throws(function () { music.getLayout(12); }, /Unsupported kalimba layout/);
});
