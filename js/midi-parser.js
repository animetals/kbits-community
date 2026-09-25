/**
 * Kbits - MIDI Parser
 *
 * Parses Standard MIDI bytes into timed notes and musical metadata.
 *
 * Environment and dependencies: Browser and Node.js; accepts binary MIDI input.
 * Invariant: Note timing follows the MIDI tempo map.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsMidi = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function Reader(bytes) { this.b = bytes; this.p = 0; }
  Reader.prototype.u8 = function () { return this.b[this.p++]; };
  Reader.prototype.u16 = function () { return (this.u8() << 8) | this.u8(); };
  Reader.prototype.u32 = function () { return ((this.u8() << 24) | (this.u8() << 16) | (this.u8() << 8) | this.u8()) >>> 0; };
  Reader.prototype.str = function (n) { var s = ""; while (n--) s += String.fromCharCode(this.u8()); return s; };
  Reader.prototype.vlq = function () { var v = 0, c; do { c = this.u8(); v = (v << 7) | (c & 127); } while (c & 128); return v; };

  /**
   * @param {ArrayBuffer} buffer Standard MIDI bytes; read without modification.
   * @returns {Object} Song with sorted notes, duration in seconds, division in
   *   ticks/quarter, time signatures and barTimes in seconds. Note records retain
   *   both seconds and ticks; note duration has a 0.04-second minimum.
   * @throws {Error} For unsupported/invalid MIDI or failed binary reads.
   */
  function parse(buffer) {
    var r = new Reader(new Uint8Array(buffer));
    if (r.str(4) !== "MThd") throw new Error("Not a Standard MIDI file");
    var headerLength = r.u32(), format = r.u16(), tracks = r.u16(), division = r.u16();
    if (division & 0x8000) throw new Error("SMPTE MIDI timing is not supported yet");
    r.p += headerLength - 6;
    var events = [], tempos = [{ tick: 0, mpqn: 500000 }], timeSignatures = [{ tick: 0, numerator: 4, denominator: 4 }], maxTick = 0;
    for (var t = 0; t < tracks; t++) {
      if (r.str(4) !== "MTrk") throw new Error("Invalid MIDI track");
      // Read the length first: r.p advances four bytes while reading it.
      // Using `r.p + r.u32()` captures the old position and truncates every
      // track by four bytes, which breaks most format-1 (multitrack) files.
      var trackLength = r.u32(), end = r.p + trackLength, tick = 0, running = 0;
      while (r.p < end) {
        tick += r.vlq();
        var status = r.u8();
        if (status < 128) { r.p--; status = running; } else if (status < 240) running = status;
        maxTick = Math.max(maxTick, tick);
        if (status === 255) {
          var type = r.u8(), len = r.vlq();
          if (type === 81 && len === 3) tempos.push({ tick: tick, mpqn: (r.u8() << 16) | (r.u8() << 8) | r.u8() });
          else if (type === 88 && len >= 2) { var numerator = r.u8(), denominator = Math.pow(2, r.u8()); timeSignatures.push({ tick: tick, numerator: numerator, denominator: denominator }); r.p += len - 2; }
          else r.p += len;
        } else if (status === 240 || status === 247) r.p += r.vlq();
        else {
          var kind = status & 240, channel = status & 15, a = r.u8(), b = (kind === 192 || kind === 208) ? 0 : r.u8();
          if (kind === 144 && b > 0) events.push({ tick: tick, type: "on", note: a, velocity: b, channel: channel });
          else if (kind === 128 || (kind === 144 && b === 0)) events.push({ tick: tick, type: "off", note: a, channel: channel });
        }
      }
      r.p = end;
    }
    tempos.sort(function (a, b) { return a.tick - b.tick; });
    var compact = [];
    tempos.forEach(function (tempo) { if (compact.length && compact[compact.length - 1].tick === tempo.tick) compact[compact.length - 1] = tempo; else compact.push(tempo); });
    var elapsed = 0;
    compact.forEach(function (tempo, i) { if (i) elapsed += (tempo.tick - compact[i - 1].tick) * compact[i - 1].mpqn / division / 1000000; tempo.seconds = elapsed; });
    function seconds(tick) { var tempo = compact[0]; for (var i = 1; i < compact.length && compact[i].tick <= tick; i++) tempo = compact[i]; return tempo.seconds + (tick - tempo.tick) * tempo.mpqn / division / 1000000; }
    timeSignatures.sort(function (a, b) { return a.tick - b.tick; });
    var compactSignatures = [];
    timeSignatures.forEach(function (signature) { if (compactSignatures.length && compactSignatures[compactSignatures.length - 1].tick === signature.tick) compactSignatures[compactSignatures.length - 1] = signature; else compactSignatures.push(signature); });
    compactSignatures.forEach(function (signature) { signature.seconds = seconds(signature.tick); });
    events.sort(function (a, b) { return a.tick - b.tick || (a.type === "off" ? -1 : 1); });
    var active = {}, notes = [], duration = 0;
    events.forEach(function (event) {
      var key = event.channel + ":" + event.note, time = seconds(event.tick);
      if (event.type === "on") (active[key] || (active[key] = [])).push({ note: event.note, velocity: event.velocity, start: time, startTick: event.tick });
      else if (active[key] && active[key].length) { var note = active[key].shift(); note.end = time; note.endTick = event.tick; note.durationTicks = Math.max(1, event.tick - note.startTick); note.duration = Math.max(.04, time - note.start); notes.push(note); duration = Math.max(duration, time); }
    });
    notes.sort(function (a, b) { return a.start - b.start; });
    var barTimes = [];
    compactSignatures.forEach(function (signature, index) {
      var endTick = index + 1 < compactSignatures.length ? compactSignatures[index + 1].tick : maxTick;
      var measureTicks = division * 4 / signature.denominator * signature.numerator;
      for (var barTick = signature.tick; barTick <= endTick && measureTicks > 0; barTick += measureTicks) barTimes.push(seconds(barTick));
    });
    return { format: format, notes: notes, duration: duration, division: division, timeSignatures: compactSignatures, barTimes: barTimes };
  }
  return { parse: parse };
}));
