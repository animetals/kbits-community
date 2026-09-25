/**
 * Kbits - Playback Core
 *
 * Calculates playback position, seeking, loops, and scheduler batches.
 *
 * Environment and dependencies: Browser and Node.js; accepts player state, note events, and clock values.
 * Invariant: Timing uses the supplied clock rather than wall time.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsPlaybackCore = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** @returns {number} Position clamped to a nonnegative song duration, in seconds. */
  function clampPosition(value, duration) {
    return Math.max(0, Math.min(Number(duration) || 0, Number(value) || 0));
  }

  /**
   * @param {Object} state Shared player state; read only. Positions are song seconds,
   *   startedAt is audio-clock seconds, and speed is a playback-rate multiplier.
   * @param {number} clockTime Current audio-clock seconds, not Date.now().
   * @returns {number} Unclamped song position in seconds.
   */
  function currentPosition(state, clockTime) {
    if (!state.playing) return Number(state.position) || 0;
    return (Number(state.startPosition) || 0) +
      ((Number(clockTime) || 0) - (Number(state.startedAt) || 0)) * (Number(state.speed) || 1);
  }

  /**
   * @param {Array<{start: number}>} notes Notes sorted by start in song seconds.
   * @param {number} time Target song seconds.
   * @returns {number} First index at or after time, or notes.length. Does not mutate notes.
   */
  function lowerBound(notes, time) {
    var low = 0;
    var high = notes.length;
    while (low < high) {
      var middle = (low + high) >> 1;
      if (notes[middle].start < time) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  /** @returns {boolean} Whether non-null markers define an increasing range in seconds. */
  function loopReady(start, end) {
    return start !== null && end !== null && Number(end) > Number(start);
  }

  /**
   * @param {number} position Current song seconds.
   * @param {number} speed Playback-rate multiplier.
   * @param {number} lookahead Audio-clock seconds to schedule ahead.
   * @param {?number} loopEnd Optional song-seconds boundary.
   * @returns {number} Song-seconds horizon, capped 0.001 seconds before loopEnd.
   */
  function scheduleHorizon(position, speed, lookahead, loopEnd) {
    var horizon = position + lookahead * speed;
    return loopEnd === null || loopEnd === undefined ? horizon : Math.min(horizon, loopEnd - 0.001);
  }

  /**
   * @param {Array<{start: number}>} notes Notes sorted by start; never mutated.
   * @param {number} index Next unread note index.
   * @param {number} position Current song seconds.
   * @param {number} horizon Inclusive scheduling limit in song seconds.
   * @param {number} [tolerance=0.03] Allowed lateness in song seconds.
   * @returns {{notes: Array, nextIndex: number}} New array referencing original notes;
   *   nextIndex advances past expired notes as well as selected notes.
   */
  function collectNotes(notes, index, position, horizon, tolerance) {
    var nextIndex = index;
    var due = [];
    var grace = tolerance === undefined ? 0.03 : tolerance;
    while (nextIndex < notes.length && notes[nextIndex].start <= horizon) {
      var note = notes[nextIndex++];
      if (note.start >= position - grace) due.push(note);
    }
    return { notes: due, nextIndex: nextIndex };
  }

  return {
    clampPosition: clampPosition,
    currentPosition: currentPosition,
    lowerBound: lowerBound,
    loopReady: loopReady,
    scheduleHorizon: scheduleHorizon,
    collectNotes: collectNotes
  };
}));
