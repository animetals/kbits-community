/**
 * Kbits - library-controller.test
 *
 * Checks library controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const library = require("../js/features/library-controller.js"), core = require("../js/core/library-core.js");

function fixture(overrides) {
  const nodes = {}, calls = [];
  const songs = [core.normalizeSong({ id: "a", name: "Alpha", added: 1, favorite: true }), core.normalizeSong({ id: "b", name: "Beta", added: 2, favorite: false })];
  const playlists = [{ id: "p", name: "Practice", songIds: ["a", "b"], ordered: true }];
  function element() { return { value: "", children: [], appendChild(item) { this.children.push(item); }, cloneNode() { return Object.assign(element(), this); } }; }
  const find = id => nodes[id] || (nodes[id] = element());
  const repository = Object.assign({ listSongs: async () => songs.map(song => ({ ...song })), listPlaylists: async () => playlists.map(item => ({ ...item })), getSong: async id => { calls.push(["read", id]); return { data: id }; }, updateSong: async (id, changes) => { Object.assign(songs.find(song => song.id === id), changes); return songs.find(song => song.id === id); } }, overrides);
  const controller = library.create({ document: { querySelector: find, createElement: element }, core, repository, MutationObserver: class { observe() {} }, loadBuffer: (data, name) => calls.push(["load", data, name]), play: () => calls.push("play"), pause: ended => calls.push(["pause", ended]), closeLibrary: () => calls.push("close"), renderLibraryRows: () => calls.push("rows"), renderBrowse: () => calls.push("browse"), filterLibrary() {}, reportError: error => calls.push(["error", error.message]) });
  controller.setup();
  return { controller, find, calls, songs };
}

test("catalog refresh keeps metadata separate from binaries and preserves playlist selection", async () => {
  const f = fixture();
  f.find("#playlist-filter").value = "p";
  f.find("#browse-playlist").value = "favorites";
  await f.controller.refresh();
  assert.deepEqual(f.calls, ["rows"]);
  assert.deepEqual(f.controller.getSongs().map(song => song.id), ["b", "a"]);
  assert.deepEqual(f.controller.queueForView(), ["a", "b"]);
  assert.equal(f.find("#browse-playlist").value, "favorites");
  f.find("#playlist-filter").value = "deleted";
  await f.controller.refresh();
  assert.equal(f.find("#playlist-filter").value, "all");
});

test("explicit playlist playback advances in order while individual selection stops at completion", async () => {
  const f = fixture();
  await f.controller.refresh();
  f.find("#playlist-filter").value = "p";
  f.find("#play-playlist").onclick();
  await Promise.resolve();
  assert.equal(f.controller.currentSongId(), "a");
  await f.controller.finishSong();
  assert.equal(f.controller.currentSongId(), "b");
  assert.deepEqual(f.calls.filter(call => call[0] === "read"), [["read", "a"], ["read", "b"]]);
  await f.controller.loadSong(f.controller.getSongs().find(song => song.id === "a"), false);
  const reads = f.calls.filter(call => call[0] === "read").length;
  await f.controller.finishSong();
  assert.equal(f.calls.filter(call => call[0] === "read").length, reads);
});

test("favorite updates refresh both views and failed persistence restores the original value", async () => {
  const f = fixture();
  await f.controller.refresh();
  await f.controller.setFavorite(f.controller.getSongs()[0], true);
  assert.equal(f.controller.getSongs()[0].favorite, true);
  assert.deepEqual(f.calls.slice(-2), ["rows", "browse"]);
  const failed = fixture({ updateSong: async () => { throw new Error("Unavailable"); } });
  await failed.controller.refresh();
  const song = failed.controller.getSongs()[0];
  await assert.rejects(failed.controller.setFavorite(song, true), /Unavailable/);
  assert.equal(song.favorite, false);
  assert.deepEqual(failed.calls.slice(-2), ["rows", "browse"]);
});
