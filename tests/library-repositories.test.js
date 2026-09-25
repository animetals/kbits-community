/**
 * Kbits - library-repositories.test
 *
 * Checks library repositories behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var repositories = require("../js/platform/library-repositories.js");

function fakeRepository(prefix, calls) {
  var repository = {};
  ["listSongs", "getSong", "createSong", "updateSong", "deleteSong", "listPlaylists", "createPlaylist", "updatePlaylist", "deletePlaylist"].forEach(function (method) {
    repository[method] = function () {
      calls.push(prefix + "." + method);
      return Promise.resolve(prefix + "." + method);
    };
  });
  return repository;
}

test("routes server and local record identifiers to the correct repository", async function () {
  var calls = [];
  var hybrid = repositories.createHybridRepository(fakeRepository("remote", calls), fakeRepository("local", calls));
  await hybrid.getSong("song.mid");
  await hybrid.getSong("local-1");
  await hybrid.updatePlaylist("playlist-id", {});
  await hybrid.updatePlaylist("local-playlist", {});
  assert.deepEqual(calls, ["remote.getSong", "local.getSong", "remote.updatePlaylist", "local.updatePlaylist"]);
});

test("falls back to browser storage when container listing or creation is unavailable", async function () {
  var calls = [];
  var remote = fakeRepository("remote", calls);
  var local = fakeRepository("local", calls);
  remote.listSongs = function () { calls.push("remote.listSongs"); return Promise.reject(Error("offline")); };
  remote.createPlaylist = function () { calls.push("remote.createPlaylist"); return Promise.reject(Error("offline")); };
  var hybrid = repositories.createHybridRepository(remote, local);
  assert.equal(await hybrid.listSongs(), "local.listSongs");
  assert.equal(await hybrid.createPlaylist("Practice"), "local.createPlaylist");
  assert.deepEqual(calls, ["remote.listSongs", "local.listSongs", "remote.createPlaylist", "local.createPlaylist"]);
});

test("rejects direct-file song creation with the existing server guidance", async function () {
  var hybrid = repositories.createHybridRepository(fakeRepository("remote", []), fakeRepository("local", []), { fileProtocol: true });
  await assert.rejects(hybrid.createSong({ fileName: "song.mid" }, new ArrayBuffer(1)), /start-kbits\.bat/);
});
