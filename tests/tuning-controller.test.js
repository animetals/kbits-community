/**
 * Kbits - tuning-controller.test
 *
 * Checks tuning controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test"), assert = require("node:assert/strict");
var tuning = require("../js/features/tuning-controller.js");

function musicFixture() {
  return {
    hasLayout: function (count) { return count === 8 || count === 17; },
    getLayout: function (count) { return { physical: count === 8 ? [60, 62] : [60, 62, 64], numbers: ["1", "2", "3"], keys: ["A", "S", "D"] }; },
    normalizeTuning: function (offsets, length) { return Array.from({ length: length }, function (_, index) { return Number.isFinite(offsets[index]) ? offsets[index] : 0; }); },
    applyTuning: function (physical, offsets) { return physical.map(function (note, index) { return note + offsets[index]; }); }
  };
}

test("reads current and legacy 17-key tuning safely", function () {
  var music = musicFixture();
  assert.deepEqual(tuning.readOffsets({ kbitsTuning8: "[1,-1]" }, music, 8, 2), [1, -1]);
  assert.deepEqual(tuning.readOffsets({ kbitsTuning: "[2,2,2]" }, music, 17, 3), [2, 2, 2]);
  assert.deepEqual(tuning.readOffsets({ kbitsTuning8: "broken" }, music, 8, 2), [0, 0]);
});

test("activates a valid layout and rejects an unsupported one", function () {
  var storage = {}, changed, rebuilt = 0;
  var documentRef = { body: { dataset: {} }, querySelectorAll: function () { return []; } };
  var controller = tuning.create({
    document: documentRef,
    storage: storage,
    music: musicFixture(),
    midiName: String,
    setTimeout: function () {},
    getState: function () { return changed || { currentLayout: 17 }; },
    onLayoutChanged: function (next) { changed = next; },
    onTuningChanged: function () {},
    updateLabels: function () {},
    previewNote: function () {},
    rebuildTines: function () { rebuilt++; }
  });
  assert.equal(controller.activateLayout(8), true);
  assert.equal(storage.kbitsLayout, "8");
  assert.deepEqual(changed.physical, [60, 62]);
  assert.equal(documentRef.body.dataset.layout, "8");
  assert.equal(rebuilt, 1);
  assert.equal(controller.activateLayout(34), false);
  assert.equal(rebuilt, 1);
});
