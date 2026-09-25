/**
 * Kbits - settings-controller.test
 *
 * Checks settings controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const settings = require("../js/features/settings-controller.js");

function fixture(saved) {
  const nodes = {}, created = [], classes = new Set(), properties = {}, calls = [], observers = [];
  const storage = Object.assign({ getItem(key) { return this[key] === undefined ? null : this[key]; } }, saved);
  function element() { return { value: "", checked: false, children: [], append(...items) { this.children.push(...items); }, appendChild(item) { this.append(item); }, style: { setProperty: (key, value) => { properties[key] = value; } } }; }
  function find(selector) { return created.find(item => "#" + item.id === selector) || nodes[selector] || (nodes[selector] = element()); }
  let physical = [60], letters = ["C4"];
  const label = { closest: () => ({ dataset: { lane: "0" } }) }, tine = Object.assign(element(), { dataset: { lane: "0" } });
  const document = {
    querySelector: find, querySelectorAll: selector => selector === ".tine-label" ? [label] : selector === ".tine" ? [tine] : [],
    createElement: () => { const item = element(); created.push(item); return item; }, createTextNode: text => ({ textContent: text }),
    body: { classList: { toggle: (name, value) => value ? classes.add(name) : classes.delete(name) } }, documentElement: element()
  };
  const state = {};
  const controller = settings.create({ document, storage, state, tines: find("#tines"), numberName: note => String(note), getPhysical: () => physical, getLetters: () => letters, getColors: () => ["red"],
    MutationObserver: class { constructor(callback) { observers.push(callback); } observe() {} },
    stopVoices: () => calls.push("stop"), refreshSoundfont: () => calls.push("sound"), prepareSamples: () => calls.push("prepare"),
    endPointer: () => calls.push("endPointer"), invalidateSprites: () => calls.push("invalidate"), setupStaffInteraction: () => calls.push("staff")
  });
  return { controller, state, storage, find, label, calls, classes, properties, observers, tune: () => { physical = [62]; letters = ["D4"]; } };
}

test("settings restores legacy volume and label preferences and rejects invalid zoom", () => {
  const f = fixture({ kbitsVolume: "0.4", kbitsLabels: "number", kbitsTineZoom: "9", kbitsSound: "keylimba" });
  f.controller.setup();
  assert.equal(f.state.tineVolume, 0.4);
  assert.equal(f.state.songVolume, 0.4);
  assert.equal(f.properties["--tine-zoom"], 1);
  assert.equal(f.find("#label-number").checked, true);
  assert.equal(f.find("#label-note").checked, false);
  assert.equal(f.label.textContent, "60");
  f.find("#label-note").checked = true;
  f.tune();
  f.controller.updateLabels();
  assert.equal(f.label.textContent, "62 D");
  assert.equal(f.storage.kbitsLabelNote, "1");
});

test("settings persists independent volumes and changes audio banks in the existing order", () => {
  const f = fixture({ kbitsSound: "keylimba", kbitsTineVolume: "0", kbitsSongVolume: "0.7" });
  f.controller.setup();
  assert.equal(f.state.tineVolume, 0);
  f.find("#tine-volume").value = "25";
  f.find("#tine-volume").oninput();
  assert.equal(f.storage.kbitsTineVolume, 0.25);
  assert.equal(f.state.songVolume, 0.7);
  f.find("#sound").value = "moozica";
  f.find("#sound").onchange();
  assert.deepEqual(f.calls, ["stop", "sound", "prepare"]);
  assert.equal(f.storage.kbitsSound, "moozica");
});

test("swipe, unmapped notes, stickers, falling style, and staff preferences retain their effects", () => {
  const f = fixture({ kbitsMuteUnmapped: "1", kbitsFallingStyle: "invalid", kbitsPlayView: "staff" });
  f.controller.setupSwipe(); f.controller.setupMuteUnmapped(); f.controller.setupFallingStyle(); f.controller.setupPlayView();
  assert.equal(f.state.tineSwipe, true);
  f.find("#tine-swipe").checked = false; f.find("#tine-swipe").onchange();
  assert.equal(f.storage.kbitsTineSwipe, "0");
  assert.equal(f.calls.includes("endPointer"), true);
  assert.equal(f.state.muteUnmapped, true);
  assert.equal(f.state.fallingStyle, "block");
  f.find("#falling-style").value = "number"; f.find("#falling-style").onchange();
  assert.equal(f.storage.kbitsFallingStyle, "number");
  assert.equal(f.calls.includes("invalidate"), true);
  assert.equal(f.classes.has("show-tine-stickers"), true);
  assert.equal(f.properties["--sticker-color"], "red");
  assert.equal(f.observers.length, 2);
  assert.equal(f.find("#falling-style-label").hidden, true);
  f.find("#play-view").value = "blocks"; f.find("#play-view").onchange();
  assert.equal(f.find("#falling-style-label").hidden, false);
  assert.equal(f.storage.kbitsPlayView, "blocks");
});
