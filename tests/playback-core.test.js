/**
 * Kbits - playback-core.test
 *
 * Checks playback core behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var playback = require("../js/core/playback-core.js");

test("derives playback position from one explicit clock", function () {
  assert.equal(playback.currentPosition({ playing: false, position: 4 }, 100), 4);
  assert.equal(playback.currentPosition({ playing: true, startPosition: 3, startedAt: 10, speed: 0.5 }, 14), 5);
});

test("clamps seeks to the song duration", function () {
  assert.equal(playback.clampPosition(-2, 30), 0);
  assert.equal(playback.clampPosition(12, 30), 12);
  assert.equal(playback.clampPosition(40, 30), 30);
});

test("finds the first note at or after a time", function () {
  var notes = [{ start: 0 }, { start: 1 }, { start: 1 }, { start: 3 }];
  assert.equal(playback.lowerBound(notes, 1), 1);
  assert.equal(playback.lowerBound(notes, 2), 3);
  assert.equal(playback.lowerBound(notes, 4), 4);
});

test("validates loop ranges and caps scheduling at their end", function () {
  assert.equal(playback.loopReady(null, 4), false);
  assert.equal(playback.loopReady(4, 4), false);
  assert.equal(playback.loopReady(2, 4), true);
  assert.equal(playback.scheduleHorizon(3.9, 1, 0.18, 4), 3.999);
  assert.equal(playback.scheduleHorizon(3, 2, 0.18, null), 3.36);
});

test("collects one scheduler batch and advances its index", function () {
  var notes = [{ start: 0.9 }, { start: 1.05 }, { start: 1.15 }, { start: 1.3 }];
  var batch = playback.collectNotes(notes, 0, 1, 1.18);
  assert.deepEqual(batch.notes, [notes[1], notes[2]]);
  assert.equal(batch.nextIndex, 3);
});
