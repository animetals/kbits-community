/**
 * Kbits - player-controller.test
 *
 * Checks player controller behavior with the Node test runner.
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
var playerController = require("../js/features/player-controller.js");

function fixture(changes) {
  var now = 10, intervals = [], timeouts = [], played = [], icons = [], stopped = 0, ended = 0;
  var state = Object.assign({ song: { duration: 8, notes: [{ note: 60, velocity: 90, start: 2, duration: 1 }] }, position: 2, playing: false, speed: 1, index: 0, startedAt: 0, startPosition: 0, timer: 0, sound: "keylimba", loopEnabled: false, loopStart: null, loopEnd: null }, changes || {});
  var audio = { context: function () {}, currentTime: function () { return now; }, isReady: function () { return true; }, prepare: function () { return Promise.resolve(); }, stopAll: function () { stopped += 1; } };
  var controller = playerController.create({
    state: state, core: playback, audio: audio,
    playNote: function () { played.push(Array.from(arguments)); }, hit: function () {}, getPhysical: function () { return [60, 62]; },
    setPlayIcon: function (icon) { icons.push(icon); }, onEnded: function () { ended += 1; }, onStopped: function () {},
    setInterval: function (callback, delay) { intervals.push({ callback: callback, delay: delay }); return 7; }, clearInterval: function () {},
    setTimeout: function (callback, delay) { timeouts.push({ callback: callback, delay: delay }); return timeouts.length; }, clearTimeout: function () {}
  });
  return { state: state, controller: controller, intervals: intervals, timeouts: timeouts, played: played, icons: icons, stopped: function () { return stopped; }, ended: function () { return ended; }, setNow: function (value) { now = value; } };
}

test("plays, schedules notes, and pauses against the injected audio clock", function () {
  var f = fixture();
  f.controller.play();
  assert.equal(f.state.playing, true);
  assert.equal(f.state.startedAt, 10);
  assert.equal(f.state.timer, 7);
  assert.equal(f.intervals[0].delay, 25);
  assert.deepEqual(f.played[0], [60, 90, 10, 1, "song"]);
  assert.equal(f.timeouts.length, 1);
  assert.equal(f.icons.at(-1), "\u2161");
  f.setNow(12);
  assert.equal(f.controller.position(), 4);
  f.controller.pause();
  assert.equal(f.state.position, 4);
  assert.equal(f.state.playing, false);
  assert.equal(f.stopped(), 1);
  assert.equal(f.icons.at(-1), "\u25b6");
});

test("restarts an enabled loop without ending the song", function () {
  var f = fixture({ position: 1, playing: true, startedAt: 10, startPosition: 1, loopEnabled: true, loopStart: 1, loopEnd: 2 });
  f.setNow(11.2);
  f.controller.schedule();
  assert.equal(f.state.position, 1);
  assert.equal(f.state.startPosition, 1);
  assert.equal(f.state.startedAt, 11.2);
  assert.equal(f.stopped(), 1);
  assert.equal(f.ended(), 0);
});

test("seek, speed, and stop preserve transport behavior", function () {
  var stoppedUi = 0, f = fixture();
  f.controller = playerController.create({
    state: f.state, core: playback,
    audio: { context: function () {}, currentTime: function () { return 10; }, isReady: function () { return true; }, prepare: function () { return Promise.resolve(); }, stopAll: function () {} },
    playNote: function () {}, hit: function () {}, getPhysical: function () { return []; }, setPlayIcon: function () {}, onEnded: function () {}, onStopped: function () { stoppedUi += 1; },
    setInterval: function () { return 1; }, clearInterval: function () {}, setTimeout: function () { return 1; }, clearTimeout: function () {}
  });
  f.controller.seek(99);
  assert.equal(f.state.position, 8);
  f.controller.setSpeed(1.5);
  assert.equal(f.state.speed, 1.5);
  f.controller.stop();
  assert.equal(f.state.position, 0);
  assert.equal(f.state.index, 0);
  assert.equal(stoppedUi, 1);
});
