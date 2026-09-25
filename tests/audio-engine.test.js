/**
 * Kbits - audio-engine.test
 *
 * Checks audio engine behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var audio = require("../js/platform/audio-engine.js");

test("maps supported sound choices and defaults to Keylimba", function () {
  assert.equal(audio.bankName("keylimba"), "kalimba");
  assert.equal(audio.bankName("freepats"), "kalimba_freepats");
  assert.equal(audio.bankName("moozica"), "kalimba_moozica");
  assert.equal(audio.bankName("vini"), "kalimba_vini");
  assert.equal(audio.bankName("unknown"), "kalimba");
});

test("selects ranged samples before the nearest pitched sample", function () {
  var samples = { 60: { lo: 58, hi: 62 }, 67: {} };
  assert.equal(audio.nearestSample(samples, 62), 60);
  assert.equal(audio.nearestSample(samples, 66), 67);
  assert.equal(audio.nearestSample({}, 60), undefined);
});

test("calculates playback rate from root note and tuning cents", function () {
  assert.equal(audio.playbackRate(60, 60, {}), 1);
  assert.equal(audio.playbackRate(72, 60, {}), 2);
  assert.ok(Math.abs(audio.playbackRate(60, 60, { tune: 100 }) - Math.pow(2, 1 / 12)) < 1e-12);
});
