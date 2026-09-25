/**
 * Kbits - Kalimba Controller
 *
 * Renders tines and coordinates highlights, keyboard, and pointer input.
 *
 * Environment and dependencies: Browser; injected DOM, instrument getters, and playback callbacks.
 * Invariant: Input mapping follows the active physical notes and keyboard layout.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsKalimbaController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** @returns {number} Tine height in CSS pixels from the model, row and zero-based lane/pitch indices. */
  function tineHeight(layout, rowName, localIndex, center, pitchIndex) {
    if (layout === 34) return rowName === "upper" ? 125 - pitchIndex * 3 : 180 - Math.abs(localIndex - center) * 5;
    return 285 - (layout === 17 ? Math.abs(localIndex - center) : pitchIndex) * 11;
  }

  /** @returns {number} Lane matching the uppercased keyboard key, or -1; keys is not mutated. */
  function keyLane(keys, key) {
    return keys.indexOf(String(key || "").toUpperCase());
  }

  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Retains live physical/keyboard getters and injected DOM, note and timer callbacks. render replaces tine DOM; bind attaches pointer listeners once. highlightNote uses an exact MIDI pitch; handleKey consumes a keyboard event. Pointer coordinates are viewport CSS pixels.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options) {
    var container = options.container, documentRef = options.document;
    var host = typeof globalThis !== "undefined" ? globalThis : {};
    var timeout = options.setTimeout || host.setTimeout;
    var dragging = false, lastLane = -1, pointerId = null;

    function highlightTine(tine, duration) {
      if (!tine) return;
      tine.classList.add("active");
      timeout(function () { tine.classList.remove("active"); }, duration || 120);
    }

    function playTine(tine) {
      if (!tine) return false;
      var lane = +tine.dataset.lane;
      if (lane === lastLane) return false;
      lastLane = lane;
      options.playNote(+tine.dataset.note, 100, 0, .9);
      highlightTine(tine, 120);
      return true;
    }

    function highlightNote(note) {
      var lane = options.getPhysical().indexOf(note);
      if (lane < 0) return false;
      var tine = container.querySelector('.tine[data-lane="' + lane + '"]');
      highlightTine(tine, 120);
      return !!tine;
    }

    function tineAtPoint(x, y) {
      var target = documentRef.elementFromPoint(x, y);
      return target && target.closest(".tine");
    }

    function beginPointer(event) {
      var tine = event.target.closest(".tine");
      if (!tine || (event.pointerType === "mouse" && event.button !== 0)) return false;
      lastLane = -1;
      playTine(tine);
      dragging = event.pointerType !== "touch" || options.isSwipeEnabled();
      pointerId = event.pointerId;
      if (dragging) try { container.setPointerCapture(event.pointerId); } catch (error) {}
      event.preventDefault();
      return true;
    }

    function movePointer(event) {
      if (!dragging || event.pointerId !== pointerId) return false;
      var points = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
      points.forEach(function (point) { playTine(tineAtPoint(point.clientX, point.clientY)); });
      event.preventDefault();
      return true;
    }

    function overPointer(event) {
      if (!dragging || event.pointerType !== "mouse") return false;
      return playTine(event.target.closest(".tine"));
    }

    function endPointer() {
      dragging = false;
      lastLane = -1;
      pointerId = null;
    }

    function handleKey(event) {
      if (event.target.matches("input,select,textarea")) return false;
      var lane = keyLane(options.getKeys(), event.key);
      if (lane < 0 || event.repeat) return false;
      event.preventDefault();
      var note = options.getPhysical()[lane];
      options.playNote(note, 100, 0, .9);
      highlightNote(note);
      return true;
    }

    function render(config) {
      container.innerHTML = "";
      container.classList.toggle("dual", config.layout === 34);
      var rows = config.layout === 34 ? [{ name: "upper", from: 17, to: 34 }, { name: "lower", from: 0, to: 17 }] : [{ name: "single", from: 0, to: config.physical.length }];
      rows.forEach(function (row) {
        var holder = documentRef.createElement("div"), rowNotes = config.basePhysical.slice(row.from, row.to), center = (rowNotes.length - 1) / 2;
        var pitchOrder = rowNotes.slice().sort(function (a, b) { return a - b; });
        holder.className = "tine-row " + row.name;
        for (var index = row.from; index < row.to; index++) {
          var local = index - row.from, pitchIndex = pitchOrder.indexOf(config.basePhysical[index]), button = documentRef.createElement("button");
          button.className = "tine";
          button.dataset.note = config.physical[index];
          button.dataset.lane = index;
          button.style.setProperty("--h", tineHeight(config.layout, row.name, local, center, pitchIndex) + "px");
          button.innerHTML = '<span class="tine-label"></span><span class="tine-key">' + (config.keys[index] || "") + "</span>";
          holder.appendChild(button);
        }
        container.appendChild(holder);
      });
    }

    function bind(host) {
      container.addEventListener("pointerdown", beginPointer);
      container.addEventListener("pointermove", movePointer);
      container.addEventListener("pointerover", overPointer);
      host.addEventListener("pointerup", endPointer);
      host.addEventListener("pointercancel", endPointer);
      host.addEventListener("blur", endPointer);
      host.addEventListener("keydown", handleKey);
    }

    return { bind: bind, render: render, highlightNote: highlightNote, handleKey: handleKey, beginPointer: beginPointer, movePointer: movePointer, endPointer: endPointer };
  }

  return { create: create, tineHeight: tineHeight, keyLane: keyLane };
}));
