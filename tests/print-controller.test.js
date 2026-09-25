/**
 * Kbits - print-controller.test
 *
 * Checks print controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
var test = require("node:test"), assert = require("node:assert/strict");
var printing = require("../js/features/print-controller.js"), music = require("../js/core/music-core.js");

function fixture(overrides) {
  var nodes = {}, calls = [], song = { id: "a", name: "Saved", artist: "Composer", difficulty: "easy", layout: "8" };
  function find(id) { return nodes[id] || (nodes[id] = { value: "", open: false, showModal: function () { this.open = true; }, close: function () { this.open = false; } }); }
  var preview = { document: { write: text => calls.push(["loading", text]) }, close: () => calls.push("closePreview") };
  var controller = printing.create(Object.assign({
    document: { querySelector: find, querySelectorAll: () => [] }, music, storage: { kbitsTuning8: JSON.stringify(Array(8).fill(1)) },
    getSongs: () => [song], getCurrentLayout: () => 17,
    getSong: async id => { calls.push(["read", id]); return { data: "midi" }; },
    parse: data => ({ parsed: data }), render: (...args) => calls.push(["render", ...args]),
    openWindow: () => { calls.push("openPreview"); return preview; },
    getEditorDraft: () => ({ name: "  Draft  ", artist: "", difficulty: "hard" }),
    reportError: message => calls.push(["error", message])
  }, overrides));
  find("#print-format").value = "numbers"; find("#print-paper").value = "a4"; find("#print-orientation").value = "landscape";
  return { controller, calls, find, song, preview };
}

test("print uses editor draft and selected layout tuning without changing saved song", async () => {
  var f = fixture();
  f.controller.open(f.song, true);
  assert.equal(f.find("#print-layout").value, "8");
  var pending = f.controller.submit({ preventDefault() {} });
  assert.equal(f.calls[0], "openPreview");
  await pending;
  var rendered = f.calls.find(call => Array.isArray(call) && call[0] === "render");
  assert.equal(rendered[1], f.preview);
  assert.deepEqual(rendered[3], { name: "Draft", artist: "Composer", difficulty: "hard" });
  assert.deepEqual(rendered[4].physical, music.getLayout(8).physical.map(note => note + 1));
  assert.deepEqual(rendered[5], { format: "numbers", paper: "a4", orientation: "landscape" });
  assert.equal(f.song.name, "Saved");
  assert.equal(f.find("#print-options").open, false);
});

test("catalog printing ignores drafts and falls back safely from malformed saved tuning", async () => {
  var f = fixture({ storage: { kbitsTuning8: "invalid" } });
  f.controller.setup();
  f.controller.open(f.song);
  await f.find("#print-form").onsubmit({ preventDefault() {} });
  var rendered = f.calls.find(call => Array.isArray(call) && call[0] === "render");
  assert.equal(rendered[3].name, "Saved");
  assert.deepEqual(rendered[4].physical, music.getLayout(8).physical);
});

test("blocked popups avoid binary reads and failed reads close only the preview", async () => {
  var blocked = fixture({ openWindow: () => null });
  blocked.controller.open(blocked.song);
  await blocked.controller.submit({ preventDefault() {} });
  assert.equal(blocked.calls.length, 1);
  assert.match(blocked.calls[0][1], /Allow pop-ups/);
  var failed = fixture({ getSong: async () => { throw new Error("Unavailable"); } });
  failed.controller.open(failed.song);
  await failed.controller.submit({ preventDefault() {} });
  assert.equal(failed.calls.includes("closePreview"), true);
  assert.equal(failed.find("#print-options").open, true);
  assert.deepEqual(failed.calls.at(-1), ["error", "Could not create print preview: Unavailable"]);
});
