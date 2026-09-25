/**
 * Kbits - Player Controller
 *
 * Coordinates playback scheduling, seeking, speed, loops, and lifecycle.
 *
 * Environment and dependencies: Browser; injected state, playback core, audio, timers, and view callbacks.
 * Invariant: Audio scheduling and timed tine hits share the playback clock.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsPlayerController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * Create a controller retaining and mutating the supplied player state.
   * @param {Object} options Shared state, core, audio adapter, timer functions,
   *   hit/icon callbacks and onEnded/onStopped hooks. Audio time is seconds;
   *   injected setTimeout/setInterval delays are milliseconds.
   * @returns {Object} Transport methods. position/seek use song seconds and
   *   setSpeed uses a rate multiplier. play toggles pause and may prepare audio
   *   asynchronously; it does not return a completion promise. pause/stop cancel
   *   scheduled hits and voices. Stop preserves loop markers.
   */
  function create(options) {
    var state = options.state, core = options.core, audio = options.audio;
    var host = typeof globalThis !== "undefined" ? globalThis : {};
    var interval = options.setInterval || host.setInterval;
    var clearIntervalFn = options.clearInterval || host.clearInterval;
    var timeout = options.setTimeout || host.setTimeout;
    var clearTimeoutFn = options.clearTimeout || host.clearTimeout;
    var hitTimers = new Set();

    function position() {
      return core.currentPosition(state, state.playing ? audio.currentTime() : 0);
    }

    function lowerBound(time) {
      return state.song ? core.lowerBound(state.song.notes, time) : 0;
    }

    function loopReady() {
      return core.loopReady(state.loopStart, state.loopEnd);
    }

    function clearScheduledHits() {
      hitTimers.forEach(clearTimeoutFn);
      hitTimers.clear();
    }

    function restartLoop() {
      clearScheduledHits();
      audio.stopAll();
      state.position = state.loopStart;
      state.startPosition = state.loopStart;
      state.startedAt = audio.currentTime();
      state.index = lowerBound(state.loopStart);
    }

    function scheduleHit(note, delay) {
      var timer = timeout(function () {
        hitTimers.delete(timer);
        options.hit(note);
      }, delay);
      hitTimers.add(timer);
    }

    function schedule() {
      if (!state.playing || !state.song) return;
      var now = audio.currentTime(), current = position(), looping = state.loopEnabled && loopReady();
      if (looping && current >= state.loopEnd) {
        restartLoop();
        current = state.loopStart;
        now = audio.currentTime();
      }
      var horizon = core.scheduleHorizon(current, state.speed, .18, looping ? state.loopEnd : null);
      var batch = core.collectNotes(state.song.notes, state.index, current, horizon);
      state.index = batch.nextIndex;
      batch.notes.forEach(function (note) {
        var at = now + (note.start - current) / state.speed;
        options.playNote(note.note, note.velocity, at, note.duration / state.speed, "song");
        if (options.getPhysical().indexOf(note.note) >= 0) scheduleHit(note.note, Math.max(0, (at - audio.currentTime()) * 1000));
      });
      if (!looping && current >= state.song.duration) options.onEnded();
    }

    function play() {
      if (!state.song) return;
      if (state.playing) { pause(); return; }
      audio.context();
      if (!audio.isReady(state.sound)) {
        options.setPlayIcon("\u2026");
        audio.prepare(state.sound).then(play);
        return;
      }
      state.playing = true;
      state.startPosition = state.position;
      state.startedAt = audio.currentTime();
      state.index = lowerBound(state.position);
      state.timer = interval(schedule, 25);
      schedule();
      options.setPlayIcon("\u2161");
    }

    function pause(ended) {
      if (state.playing) state.position = ended ? 0 : Math.min(state.song.duration, position());
      state.playing = false;
      clearIntervalFn(state.timer);
      clearScheduledHits();
      audio.stopAll();
      state.index = state.song ? lowerBound(state.position) : 0;
      options.setPlayIcon("\u25b6");
    }

    function stop() {
      if (!state.song) return;
      pause();
      state.position = 0;
      state.startPosition = 0;
      state.index = 0;
      options.onStopped();
    }

    function seek(value) {
      if (!state.song) return;
      var wasPlaying = state.playing;
      pause();
      state.position = core.clampPosition(value, state.song.duration);
      if (wasPlaying) play();
    }

    function setSpeed(value) {
      var current = position(), wasPlaying = state.playing;
      pause();
      state.speed = Number(value) || 1;
      if (wasPlaying) { state.position = current; play(); }
    }

    return { position: position, lowerBound: lowerBound, loopReady: loopReady, schedule: schedule, play: play, pause: pause, stop: stop, seek: seek, setSpeed: setSpeed };
  }

  return { create: create };
}));
