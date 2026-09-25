/**
 * Kbits - song-library-controller.test
 *
 * Checks song library controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

var test = require("node:test"), assert = require("node:assert/strict");
var library = require("../js/features/song-library-controller.js");

test("formats library file sizes for compact display", function () {
  assert.equal(library.formatBytes(0), "SIZE UNKNOWN");
  assert.equal(library.formatBytes(512), "512 B");
  assert.equal(library.formatBytes(1536), "1.5 KB");
  assert.equal(library.formatBytes(20480), "20 KB");
});

test("formats standard and Seeds Pisces layout labels", function () {
  assert.equal(library.layoutLabel("17"), "17 Keys");
  assert.equal(library.layoutLabel("34"), "Seeds Pisces · 34 Keys");
  assert.equal(library.layoutLabel(""), "—");
});
