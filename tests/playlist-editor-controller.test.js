/**
 * Kbits - playlist-editor-controller.test
 *
 * Checks playlist editor controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test"), assert = require("node:assert/strict");
var editor = require("../js/features/playlist-editor-controller.js");

test("builds rename changes without altering playlist membership", function () {
  var playlist = { name: "Old", songIds: ["c", "a"] };
  var changes = editor.renameChanges(playlist, "  New Name  ");
  assert.deepEqual(changes, { name: "New Name", songIds: ["c", "a"] });
  changes.songIds.push("b");
  assert.deepEqual(playlist.songIds, ["c", "a"]);
});
