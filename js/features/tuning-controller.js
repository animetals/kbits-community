/**
 * Kbits - Tuning Controller
 *
 * Coordinates kalimba model selection, per-layout tuning, tuning previews,
 * persistence, and their DOM controls.
 *
 * Environment: Browser; testable in Node.js with injected DOM and storage.
 * Invariant: Tuning offsets always match the active layout's tine count.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsTuningController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * @param {Object} storage Preference storage supporting property reads.
   * @param {Object} music Music core normalization API.
   * @param {number} count Model key count; 17 also checks the legacy preference.
   * @param {number} length Required offset count.
   * @returns {number[]} Semitone offsets; malformed JSON falls back to zero tuning.
   */
  function readOffsets(storage, music, count, length) {
    try {
      var legacy = count === 17 ? storage.kbitsTuning : "[]";
      var saved = JSON.parse(storage["kbitsTuning" + count] || legacy || "[]");
      return music.normalizeTuning(saved, length);
    } catch (error) {
      return music.normalizeTuning([], length);
    }
  }

  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Uses injected document, storage, music core and live state callbacks. applyTuning accepts semitone offsets and persists them for the active model. activateLayout takes a supported key count; rendering updates controls and invokes application callbacks.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options) {
    var documentRef = options.document;

    function state() { return options.getState(); }

    function showLane(lane, active) {
      documentRef.querySelectorAll(".tine.tuning-target").forEach(function (tine) {
        tine.classList.remove("tuning-target");
      });
      if (active) {
        var tine = documentRef.querySelector('.tine[data-lane="' + lane + '"]');
        if (tine) tine.classList.add("tuning-target");
      }
    }

    function renderTuning() {
      var current = state(), grid = documentRef.querySelector("#tuning-grid");
      if (!grid) return;
      grid.innerHTML = "";
      var groups = current.currentLayout === 34
        ? [{ title: "UPPER · BASS + CHROMATIC", from: 17, to: 34 }, { title: "LOWER · DIATONIC", from: 0, to: 17 }]
        : [{ title: "TINES · LEFT TO RIGHT", from: 0, to: current.physical.length }];
      groups.forEach(function (group) {
        var section = documentRef.createElement("section"), heading = documentRef.createElement("h3"), items = documentRef.createElement("div");
        section.className = "tuning-row-group";
        heading.textContent = group.title;
        items.className = "tuning-row-items";
        for (var index = group.from; index < group.to; index++) {
          (function (lane) {
            var item = documentRef.createElement("label"), select = documentRef.createElement("select"), title = documentRef.createElement("strong"), preview = documentRef.createElement("button");
            item.className = "tuning-item";
            item.dataset.lane = lane;
            title.textContent = (lane - group.from + 1) + " · " + current.numbers[lane] + " · " + options.midiName(current.physical[lane]);
            preview.type = "button";
            preview.className = "tuning-preview";
            preview.textContent = "▶ HEAR";
            for (var semitone = -12; semitone <= 12; semitone++) {
              var choice = documentRef.createElement("option");
              choice.value = semitone;
              choice.textContent = (semitone > 0 ? "+" : "") + semitone + " st · " + options.midiName(current.basePhysical[lane] + semitone);
              choice.selected = semitone === current.tuningOffsets[lane];
              select.appendChild(choice);
            }
            function previewTine() {
              var latest = state();
              options.previewNote(latest.physical[lane]);
              showLane(lane, true);
              options.setTimeout(function () { showLane(lane, false); }, 650);
            }
            select.onchange = function () {
              var offsets = state().tuningOffsets.slice();
              offsets[lane] = +this.value;
              applyTuning(offsets);
              previewTine();
            };
            preview.onclick = previewTine;
            item.onmouseenter = function () { showLane(lane, true); };
            item.onmouseleave = function () { showLane(lane, false); };
            item.onfocusin = function () { showLane(lane, true); };
            item.onfocusout = function () { showLane(lane, false); };
            item.append(title, select, preview);
            items.appendChild(item);
          }(index));
        }
        section.append(heading, items);
        grid.appendChild(section);
      });
      documentRef.querySelectorAll("[data-tuning-preset]").forEach(function (button) {
        var shift = +button.dataset.tuningPreset;
        button.classList.toggle("active", state().tuningOffsets.every(function (value) { return value === shift; }));
      });
    }

    function applyTuning(offsets) {
      var current = state(), normalized = options.music.normalizeTuning(offsets || current.tuningOffsets, current.basePhysical.length);
      var physical = options.music.applyTuning(current.basePhysical, normalized);
      options.storage["kbitsTuning" + current.currentLayout] = JSON.stringify(normalized);
      if (current.currentLayout === 17) options.storage.kbitsTuning = JSON.stringify(normalized);
      options.onTuningChanged({ tuningOffsets: normalized, physical: physical, letters: physical.map(options.midiName) });
      documentRef.querySelectorAll(".tine").forEach(function (tine) {
        tine.dataset.note = physical[+tine.dataset.lane];
      });
      options.updateLabels();
      renderTuning();
    }

    function setupTuning() {
      renderTuning();
      documentRef.querySelectorAll("[data-tuning-preset]").forEach(function (button) {
        button.onclick = function () {
          applyTuning(Array(state().basePhysical.length).fill(+button.dataset.tuningPreset));
        };
      });
      var reset = documentRef.querySelector("#reset-tuning");
      if (reset) reset.onclick = function () { applyTuning(Array(state().basePhysical.length).fill(0)); };
    }

    function renderLayouts() {
      var count = state().currentLayout;
      documentRef.body.dataset.layout = String(count);
      documentRef.querySelectorAll("[data-layout-count]").forEach(function (button) {
        button.classList.toggle("selected", +button.dataset.layoutCount === count);
      });
    }

    function activateLayout(count) {
      if (!options.music.hasLayout(count)) return false;
      var layout = options.music.getLayout(count), offsets = readOffsets(options.storage, options.music, count, layout.physical.length);
      var physical = options.music.applyTuning(layout.physical, offsets);
      options.storage.kbitsLayout = String(count);
      options.onLayoutChanged({ currentLayout: count, layout: layout, basePhysical: layout.physical, numbers: layout.numbers, keys: layout.keys, tuningOffsets: offsets, physical: physical, letters: physical.map(options.midiName) });
      options.rebuildTines();
      renderLayouts();
      return true;
    }

    function setupLayouts() {
      documentRef.querySelectorAll("[data-layout-count]").forEach(function (button) {
        button.onclick = function () { activateLayout(+button.dataset.layoutCount); };
      });
      renderLayouts();
    }

    return { applyTuning: applyTuning, renderTuning: renderTuning, setupTuning: setupTuning, activateLayout: activateLayout, renderLayouts: renderLayouts, setupLayouts: setupLayouts };
  }

  return { create: create, readOffsets: readOffsets };
}));
