/**
 * Kbits - Music Core
 *
 * Defines layouts, tuning transforms, note labels, and lane mapping.
 *
 * Environment and dependencies: Browser and Node.js; explicit music data inputs, no platform APIs.
 * Invariant: Music calculations remain independent of the UI.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsMusicCore = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var layouts = {
    8: {
      physical: [72, 69, 65, 62, 60, 64, 67, 71],
      numbers: ["1'", "6", "4", "2", "1", "3", "5", "7"],
      keys: ["S", "D", "F", "G", "H", "J", "K", "L"]
    },
    17: {
      physical: [86, 83, 79, 76, 72, 69, 65, 62, 60, 64, 67, 71, 74, 77, 81, 84, 88],
      numbers: ["2''", "7'", "5'", "3'", "1'", "6", "4", "2", "1", "3", "5", "7", "2'", "4'", "6'", "1''", "3''"],
      keys: ["E", "W", "Q", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "U", "I", "O", "P"]
    },
    21: {
      physical: [93, 89, 86, 83, 79, 76, 72, 69, 65, 62, 60, 64, 67, 71, 74, 77, 81, 84, 88, 91, 95],
      numbers: ["6''", "4''", "2''", "7'", "5'", "3'", "1'", "6", "4", "2", "1", "3", "5", "7", "2'", "4'", "6'", "1''", "3''", "5''", "7''"],
      keys: ["T", "R", "E", "W", "Q", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "U", "I", "O", "P", "[", "]"]
    },
    34: {
      physical: [86, 83, 79, 76, 72, 69, 65, 62, 60, 64, 67, 71, 74, 77, 81, 84, 88, 87, 84, 80, 77, 73, 70, 59, 55, 53, 57, 68, 72, 75, 78, 82, 85, 89],
      numbers: ["2''", "7'", "5'", "3'", "1'", "6", "4", "2", "1", "3", "5", "7", "2'", "4'", "6'", "1''", "3''", "2#''", "1''", "5#'", "4'", "1#'", "6#", "7↓", "5↓", "4↓", "6↓", "5#", "1'", "2#'", "4#'", "6#'", "1#''", "4''"],
      keys: Array(34).fill("")
    }
  };

  /**
   * @returns {number[]} New array of supported key counts.
   */
  function supportedLayouts() {
    return Object.keys(layouts).map(Number);
  }

  /**
   * @returns {boolean} Whether the numeric key count identifies a supported model.
   */
  function hasLayout(count) {
    return Object.prototype.hasOwnProperty.call(layouts, Number(count));
  }

  /**
   * @param {number|string} count Supported key count.
   * @returns {Object} Independent physical MIDI, number-label and keyboard arrays in lane order.
   * @throws {RangeError} For unsupported models.
   */
  function getLayout(count) {
    var layout = layouts[Number(count)];
    if (!layout) throw new RangeError("Unsupported kalimba layout: " + count);
    return {
      physical: layout.physical.slice(),
      numbers: layout.numbers.slice(),
      keys: layout.keys.slice()
    };
  }

  /**
   * @param {Array} offsets Semitone offsets; wrong length resets every lane.
   * @param {number} keyCount Required lane count.
   * @returns {number[]} New array; nonfinite entries become zero, without rounding or pitch clamping.
   */
  function normalizeTuning(offsets, keyCount) {
    if (!Array.isArray(offsets) || offsets.length !== keyCount) return Array(keyCount).fill(0);
    return offsets.map(function (offset) {
      var value = Number(offset);
      return Number.isFinite(value) ? value : 0;
    });
  }

  /**
   * @param {number[]} notes Base MIDI pitches in physical order.
   * @param {number[]} offsets Semitone offsets.
   * @returns {number[]} New tuned pitches; inputs remain unchanged.
   */
  function applyTuning(notes, offsets) {
    var normalized = normalizeTuning(offsets, notes.length);
    return notes.map(function (note, index) { return note + normalized[index]; });
  }

  /**
   * @param {string} name Uppercase pitch, optional #, and single-digit octave, optionally negative.
   * @returns {number} MIDI pitch or -1 for unmatched syntax; no MIDI-range check.
   */
  function nameToMidi(name) {
    var match = /^([A-G])(#?)(-?\d)$/.exec(name);
    var pitchClasses = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return match ? (+match[3] + 1) * 12 + pitchClasses[match[1]] + (match[2] ? 1 : 0) : -1;
  }

  /**
   * @param {number} note Integer MIDI pitch.
   * @returns {string} Sharp-based pitch name with octave.
   */
  function midiName(note) {
    var names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return names[(note % 12 + 12) % 12] + (Math.floor(note / 12) - 1);
  }

  /**
   * @param {number} note Integer MIDI pitch.
   * @returns {string} C-based number with sharps and octave marks relative to octave 4.
   */
  function numberName(note) {
    var values = ["1", "1#", "2", "2#", "3", "4", "4#", "5", "5#", "6", "6#", "7"];
    var octave = Math.floor(note / 12) - 1;
    var suffix = octave > 4 ? "'".repeat(octave - 4) : "↓".repeat(Math.max(0, 4 - octave));
    return values[(note % 12 + 12) % 12] + suffix;
  }

  /**
   * @param {number[]} physical Tuned pitches in lane order.
   * @param {number} note Exact MIDI pitch.
   * @returns {number} First matching lane or -1; duplicates prefer the first row.
   */
  function findLane(physical, note) {
    return physical.indexOf(note);
  }

  return {
    supportedLayouts: supportedLayouts,
    hasLayout: hasLayout,
    getLayout: getLayout,
    normalizeTuning: normalizeTuning,
    applyTuning: applyTuning,
    nameToMidi: nameToMidi,
    midiName: midiName,
    numberName: numberName,
    findLane: findLane
  };
}));
