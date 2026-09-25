/**
 * Kbits - browse-controller.test
 *
 * Checks browse controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test"), assert = require("node:assert/strict");
var browse = require("../js/features/browse-controller.js");
var core = require("../js/core/library-core.js");

class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.value = ""; this.hidden = true; }
  set innerHTML(value) { this.children = []; }
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.append(item); }
  setAttribute(name, value) { this[name] = value; }
}

function fixture(overrides) {
  var nodes = {}, calls = [], classes = new Set();
  var songs = [
    core.normalizeSong({ id: "a", name: "Alpha", category: "Folk", favorite: false, tags: ["quiet"] }),
    core.normalizeSong({ id: "b", name: "Beta", category: "Game", favorite: true }),
    core.normalizeSong({ id: "c", name: "Gamma", category: "Folk", favorite: true })
  ];
  var playlists = [{ id: "p", name: "Practice", songIds: ["c", "a"], ordered: true }];
  function find(selector) { return nodes[selector] || (nodes[selector] = new Element(selector === "#browse-search" ? "input" : "select")); }
  var controller = browse.create(Object.assign({
    document: { querySelector: find, createElement: tag => new Element(tag), body: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } } },
    HTMLElement: Element, core: core, getSongs: () => songs, getPlaylists: () => playlists,
    favoriteButton: () => new Element("button"), layoutLabel: () => "17 keys",
    updatePlaylist: async (id, changes) => { calls.push(["save", id, changes]); return changes; },
    hydratePlaylistOrders: () => calls.push("hydrate"), renderLibraryRows: () => calls.push("rows"),
    renderLibrary: async () => calls.push("refresh"), closeLibrary: () => calls.push("closeLibrary"), openLibrary: () => calls.push("openLibrary"),
    loadLibrarySong: (song, auto) => calls.push(["play", song.id, auto]),
    openDetails: song => calls.push(["details", song.id]), openPrintOptions: song => calls.push(["print", song.id])
  }, overrides));
  return { controller, find, calls, classes, playlists, rows: () => find("#browse-results").children };
}

test("Browse scopes catalog, favorites, and ordered playlists while retaining filters and delete visibility", () => {
  var f = fixture();
  f.controller.render();
  assert.equal(f.rows().length, 3);
  assert.equal(f.rows()[0].children[7].children.length, 5);
  f.find("#browse-playlist").value = "favorites";
  f.controller.render();
  assert.deepEqual(f.rows().map(row => row.children[0].textContent), ["Beta", "Gamma"]);
  assert.equal(f.rows()[0].children[7].children.length, 4);
  assert.equal(f.find("#browse-edit-playlist").disabled, true);
  f.find("#browse-playlist").value = "p";
  f.controller.render();
  assert.deepEqual(f.rows().map(row => row.children[0].textContent), ["Gamma", "Alpha"]);
  f.find("#browse-category").value = "folk";
  f.find("#browse-search").value = "quiet";
  f.controller.render();
  assert.deepEqual(f.rows().map(row => row.children[0].textContent), ["Alpha"]);
  f.find("#browse-search").value = "missing";
  f.controller.render();
  assert.equal(f.find("#browse-empty").hidden, false);
  assert.equal(f.find("#browse-empty").textContent, "NO SONGS IN THIS PLAYLIST");
});

test("Browse persists reordered membership before refreshing both views and preserves it on failure", async () => {
  var f = fixture();
  f.find("#browse-playlist").value = "p";
  await f.controller.setPlaylistPosition("a", 1);
  assert.deepEqual(f.playlists[0].songIds, ["a", "c"]);
  assert.deepEqual(f.calls, [["save", "p", { name: "Practice", songIds: ["a", "c"] }], "hydrate", "rows"]);
  var failed = fixture({ updatePlaylist: async () => { throw new Error("Storage unavailable"); } });
  failed.find("#browse-playlist").value = "p";
  await assert.rejects(failed.controller.setPlaylistPosition("a", 1), /Storage unavailable/);
  assert.deepEqual(failed.playlists[0].songIds, ["c", "a"]);
  assert.deepEqual(failed.calls, []);
});

test("Browse navigation restores Song Library and row actions use the selected song", async () => {
  var f = fixture();
  f.controller.setup();
  f.find("#browse-library").onclick();
  await Promise.resolve();
  assert.equal(f.find("#browse-view").hidden, false);
  assert.equal(f.classes.has("browse-open"), true);
  var actions = f.rows()[0].children[7].children;
  actions[1].onclick();
  actions[3].onclick();
  actions[0].onclick();
  assert.equal(f.find("#browse-view").hidden, true);
  assert.deepEqual(f.calls.slice(-3), [["details", "a"], ["print", "a"], ["play", "a", false]]);
  f.find("#close-browse").onclick();
  assert.equal(f.calls.at(-1), "openLibrary");
  assert.equal(f.classes.has("browse-open"), false);
});
