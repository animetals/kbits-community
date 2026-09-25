/**
 * Kbits - song-editor-controller.test
 *
 * Checks song editor controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const editor = require("../js/features/song-editor-controller.js"), core = require("../js/core/library-core.js");
const validation = require("../js/core/midi-validation-core.js"), parser = require("../js/midi-parser.js");

class Element {
  constructor() { this.children = []; this.handlers = {}; this.value = ""; this.textContent = ""; this.open = false; }
  set value(value) { this._value = String(value); }
  get value() { return this._value; }
  set innerHTML(value) { this.children = []; this._html = value; }
  get innerHTML() { return this._html || this.textContent; }
  append(...elements) { this.children.push(...elements); }
  appendChild(element) { this.append(element); }
  setAttribute(name, value) { this[name] = value; }
  addEventListener(name, callback) { this.handlers[name] = callback; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() {}
}

function fixture(overrides) {
  const nodes = {}, calls = [], hostEvents = {};
  const song = core.normalizeSong({ id: "song", name: "Saved", fileName: "song.mid", tags: ["quiet"], favorite: true });
  const playlists = [{ id: "p", name: "Practice", songIds: ["song", "other"] }, { id: "q", name: "Queue", songIds: ["other"] }];
  const find = selector => nodes[selector] || (nodes[selector] = new Element());
  const controller = editor.create(Object.assign({
    document: { querySelector: find, querySelectorAll: () => [find("cancel")], createElement: () => new Element() },
    host: { addEventListener: (name, callback) => { hostEvents[name] = callback; } },
    core, setTimeout: callback => callback(), getSongs: () => [song], getPlaylists: () => playlists,
    selectPrintSong: id => calls.push(["printSong", id]), formatBytes: size => String(size),
    updateSong: async (id, meta) => { calls.push(["update", id, meta]); return meta; },
    saveSong: async meta => { calls.push(["create", meta]); return Object.assign({ id: "upload" }, meta); },
    updatePlaylist: async (id, changes) => { calls.push(["playlist", id, changes]); return changes; },
    onSongUpdated: (song, meta) => calls.push(["updated", meta.name]), onUploadSaved: saved => calls.push(["uploaded", saved.id]),
    renderLibrary: async () => calls.push("library"), renderBrowse: () => calls.push("browse"),
    reportError: message => calls.push(["error", message]),
    FileReader: class { readAsArrayBuffer(file) { this.result = file.data; this.onload(); } },
    validate: validation.validate, parse: parser.parse
  }, overrides));
  controller.setup();
  const save = () => find("#song-editor").onsubmit({ preventDefault() {} });
  return { controller, find, calls, song, playlists, save, hostEvents };
}

test("Song Details cancel and escape discard metadata and membership drafts without writes", () => {
  const f = fixture();
  f.controller.open(f.song);
  f.find("#song-editor-name").value = "Unsaved";
  f.find("#song-playlist-memberships").children[0].children[1].onclick();
  f.find("cancel").onclick();
  f.controller.open(f.song);
  assert.equal(f.find("#song-editor-name").value, "Saved");
  assert.equal(f.find("#song-playlist-memberships").children.length, 1);
  f.find("#song-details").handlers.cancel();
  assert.equal(f.find("#file-input").value, "");
  assert.deepEqual(f.calls, [["printSong", "song"], ["printSong", "song"]]);
});

test("Save persists metadata then changed playlist orders and refreshes both views", async () => {
  const f = fixture();
  f.controller.open(f.song);
  f.find("#song-editor-name").value = "  Renamed  ";
  f.find("#song-editor-tags").value = "quiet, quiet, new";
  f.find("#song-playlist-memberships").children[0].children[1].onclick();
  f.find("#song-playlist-select").value = "q";
  f.find("#song-playlist-add").onclick();
  await f.save();
  const update = f.calls.find(call => call[0] === "update");
  assert.equal(update[2].name, "Renamed");
  assert.equal(update[2].favorite, true);
  assert.deepEqual(update[2].tags, ["quiet", "new"]);
  assert.deepEqual(update[2].playlistIds, ["q"]);
  assert.deepEqual(f.calls.filter(call => call[0] === "playlist"), [
    ["playlist", "p", { name: "Practice", songIds: ["other"] }],
    ["playlist", "q", { name: "Queue", songIds: ["other", "song"] }]
  ]);
  assert.deepEqual(f.calls.slice(-3), [["updated", "Renamed"], "library", "browse"]);
  assert.equal(f.find("#song-details").open, false);
  assert.equal(f.find("#save-song-details").disabled, false);
  assert.deepEqual(f.playlists[0].songIds, ["song", "other"]);
});

test("failed saves keep the draft open and restore the save button", async () => {
  const f = fixture({ updateSong: async () => { throw new Error("Storage unavailable"); } });
  f.controller.open(f.song);
  f.find("#song-editor-name").value = "Retry this";
  await f.save();
  assert.equal(f.find("#song-details").open, true);
  assert.equal(f.find("#song-editor-name").value, "Retry this");
  assert.equal(f.find("#save-song-details").disabled, false);
  assert.equal(f.find("#save-song-details").textContent, "SAVE CHANGES");
  assert.deepEqual(f.calls.at(-1), ["error", "Could not save changes: Storage unavailable"]);
});

test("uploads validate before opening and save as non-favorites before updating playback", async () => {
  const f = fixture();
  await f.controller.loadFile({ name: "invalid.mid", data: new ArrayBuffer(0) });
  assert.equal(f.find("#song-details").open, false);
  assert.match(f.calls.at(-1)[1], /Could not read MIDI/);
  const data = Uint8Array.from([77,84,104,100,0,0,0,6,0,0,0,1,0,96,77,84,114,107,0,0,0,12,0,144,60,64,96,128,60,64,0,255,47,0]).buffer;
  await f.controller.loadFile({ name: "upload.mid", size: data.byteLength, data });
  assert.equal(f.find("#song-details").open, true);
  assert.equal(f.find("#print-song").hidden, true);
  assert.equal(f.find("#song-editor-name").value, "upload");
  assert.equal(f.calls.some(call => call[0] === "create"), false);
  await f.save();
  assert.equal(f.calls.find(call => call[0] === "create")[1].favorite, false);
  assert.deepEqual(f.calls.slice(-3), [["uploaded", "upload"], "library", "browse"]);
  assert.equal(f.find("#song-details").open, false);
});
