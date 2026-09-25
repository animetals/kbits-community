/**
 * Kbits - library-core.test
 *
 * Checks library core behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var library = require("../js/core/library-core.js");

test("normalizes song metadata without retaining invalid values", function () {
  var data = new Uint8Array(12);
  var song = library.normalizeSong({
    id: 7,
    fileName: "Etude.mid",
    tags: " Calm, practice, CALM,  ",
    difficulty: "HARD",
    layout: 17,
    data: data
  }, 1234);
  assert.equal(song.name, "Etude");
  assert.deepEqual(song.tags, ["Calm", "practice"]);
  assert.equal(song.difficulty, "hard");
  assert.equal(song.layout, "17");
  assert.equal(song.favorite, true);
  assert.equal(song.added, 1234);
  assert.equal(song.size, 12);
  assert.equal(library.normalizeSong({ difficulty: "expert", layout: 12 }, 1).difficulty, "");
});

test("builds a lightweight searchable index record", function () {
  var record = library.songIndexRecord({
    name: "Moon Theme",
    artist: "Composer",
    category: "Game",
    tags: ["Retro"],
    favorite: false,
    data: new Uint8Array(4)
  }, 1);
  assert.equal(record.favoriteKey, "0");
  assert.equal(record.nameKey, "moon theme");
  assert.match(record.searchText, /composer/);
  assert.match(record.searchText, /game/);
  assert.match(record.searchText, /retro/);
  assert.equal(Object.prototype.hasOwnProperty.call(record, "data"), false);
});

test("hydrates ordered and legacy playlist membership consistently", function () {
  var result = library.hydratePlaylistOrders([
    { id: 1, playlistIds: ["legacy"] },
    { id: 2, playlistIds: ["legacy"] },
    { id: 3, playlistIds: [] }
  ], [
    { id: "ordered", songIds: ["2", "2", "missing", "1"], ordered: true },
    { id: "legacy", songIds: [], ordered: false }
  ]);
  assert.deepEqual(result.playlists[0].songIds, ["2", "1"]);
  assert.deepEqual(result.playlists[1].songIds, ["1", "2"]);
  assert.deepEqual(result.songs[0].playlistIds, ["ordered", "legacy"]);
  assert.deepEqual(result.songs[2].playlistIds, []);
});

test("inserts, moves, and removes songs without mutating playlist input", function () {
  var original = ["a", "b", "c"];
  assert.deepEqual(library.positionSong(original, "c", 1), ["c", "a", "b"]);
  assert.deepEqual(library.positionSong(original, "b", 8), ["a", "c", "b"]);
  assert.deepEqual(library.positionSong(original, "b", ""), ["a", "c"]);
  assert.deepEqual(original, ["a", "b", "c"]);
});

test("builds favorite or ordered playlist queues using existing songs only", function () {
  var songs = [{ id: 1, favorite: true }, { id: 2, favorite: false }, { id: 3, favorite: true }];
  var playlists = [{ id: "p", songIds: ["2", "missing", "1"] }];
  assert.deepEqual(library.queueSongIds(songs, playlists, ""), [1, 3]);
  assert.deepEqual(library.queueSongIds(songs, playlists, "favorites"), [1, 3]);
  assert.deepEqual(library.queueSongIds(songs, playlists, "all"), [1, 2, 3]);
  assert.deepEqual(library.queueSongIds(songs, playlists, "p"), ["2", "1"]);
});

test("orders playlist songs by saved position before unassigned catalog songs", function () {
  var songs = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  var ordered = library.orderSongsForPlaylist(songs, { songIds: ["c", "a"] });
  assert.deepEqual(ordered.map(function (song) { return song.id; }), ["c", "a", "b", "d"]);
  assert.deepEqual(songs.map(function (song) { return song.id; }), ["a", "b", "c", "d"]);
  assert.deepEqual(library.orderSongsForPlaylist(songs, null), songs);
});

test("filters Browse metadata and creates case-insensitive categories", function () {
  var songs = [
    { name: "Moon", artist: "Yoko", category: "Game", difficulty: "easy", layout: "17", tags: ["retro"], fileName: "moon.mid" },
    { name: "Etude", artist: "", category: "game", difficulty: "hard", layout: "21", tags: [], fileName: "etude.mid" },
    { name: "Waltz", artist: "Chopin", category: "Classical", difficulty: "hard", layout: "17", tags: [], fileName: "waltz.mid" }
  ];
  assert.equal(library.matchesBrowse(songs[0], { query: "yoko", category: "game", difficulty: "easy", layout: 17 }), true);
  assert.equal(library.matchesBrowse(songs[0], { query: "chopin" }), false);
  assert.deepEqual(library.browseCategories(songs), ["Classical", "Game"]);
});
