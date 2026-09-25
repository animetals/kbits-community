/**
 * Kbits - midi-validation-core.test
 *
 * Checks midi validation core behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var midi = require("../js/midi-parser.js");
var validation = require("../js/core/midi-validation-core.js");

function minimalMidi() {
  return Uint8Array.from([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96,
    0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 12,
    0, 0x90, 60, 64, 96, 0x80, 60, 64, 0, 0xff, 0x2f, 0
  ]);
}

test("validates a Standard MIDI buffer with the production parser", function () {
  var song = validation.validate(minimalMidi(), midi.parse);
  assert.equal(song.notes.length, 1);
  assert.equal(song.notes[0].note, 60);
  assert.equal(song.duration, 0.5);
});

test("copies only the addressed portion of a typed-array view", function () {
  var source = minimalMidi();
  var padded = new Uint8Array(source.length + 4);
  padded.set(source, 2);
  var song = validation.validate(padded.subarray(2, source.length + 2), midi.parse);
  assert.equal(song.notes.length, 1);
});

test("rejects malformed data and invalid parser results", function () {
  assert.throws(function () { validation.validate(Uint8Array.from([1, 2, 3]), midi.parse); }, /Standard MIDI/);
  assert.throws(function () { validation.validate("not binary", midi.parse); }, /ArrayBuffer/);
  assert.throws(function () { validation.validate(new ArrayBuffer(0), function () { return {}; }); }, /invalid song/);
  assert.throws(function () { validation.validate(new ArrayBuffer(0)); }, /parser is required/);
});
