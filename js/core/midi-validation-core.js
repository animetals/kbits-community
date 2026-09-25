/**
 * Kbits - MIDI Validation Core
 *
 * Normalizes binary input and validates parsed songs before use.
 *
 * Environment and dependencies: Browser and Node.js; depends on an injected MIDI parser.
 * Invariant: Invalid songs are rejected before playback or upload.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsMidiValidationCore = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * @param {ArrayBuffer|ArrayBufferView} value MIDI binary input.
   * @returns {ArrayBuffer} Original buffer, or a copy of only the view's byte range.
   * @throws {TypeError} If input is neither an ArrayBuffer nor a binary view.
   */
  function arrayBuffer(value) {
    if (value instanceof ArrayBuffer) return value;
    if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    throw new TypeError("MIDI data must be an ArrayBuffer or typed array");
  }

  /**
   * Validate the song envelope, not every individual note or MIDI license.
   * @param {ArrayBuffer|ArrayBufferView} data MIDI bytes; not mutated here.
   * @param {Function} parse Synchronous parser accepting an ArrayBuffer.
   * @returns {Object} Parser result with notes and nonnegative duration in seconds.
   * @throws {Error} Propagates parser errors and rejects invalid result envelopes.
   */
  function validate(data, parse) {
    if (typeof parse !== "function") throw new TypeError("A MIDI parser is required");
    var parsed = parse(arrayBuffer(data));
    if (!parsed || !Array.isArray(parsed.notes) || !Number.isFinite(parsed.duration) || parsed.duration < 0) {
      throw new Error("MIDI parser returned an invalid song");
    }
    return parsed;
  }

  return { arrayBuffer: arrayBuffer, validate: validate };
}));
