/**
 * Kbits - navigation-controller.test
 *
 * Checks navigation controller behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";
var test = require("node:test"), assert = require("node:assert/strict");
var navigation = require("../js/features/navigation-controller.js");

function fixture() {
  var classes = new Set(), nodes = {}, storage = {}, calls = [], host = {};
  var classList = { contains: name => classes.has(name), remove: name => classes.delete(name), add: name => classes.add(name), toggle: (name, value) => value ? classes.add(name) : classes.delete(name) };
  function find(id) { return nodes[id] || (nodes[id] = { open: false, setAttribute: function (key, value) { this[key] = value; }, querySelector: () => find("label"), show: function () { this.open = true; }, close: function () { this.open = false; } }); }
  var document = { body: { classList }, querySelector: find, querySelectorAll: selector => selector === "dialog[open]" ? Object.values(nodes).filter(node => node.open) : [], addEventListener() {}, fullscreenEnabled: false };
  var controller = navigation.create({ document, host, storage, setTimeout: callback => callback(), resize: () => calls.push("resize"), beforeOpen: id => calls.push(id) });
  controller.setupMenu();
  return { controller, classes, find, calls, storage, host };
}

test("navigation refreshes a panel on open, closes competing dialogs, and toggles it closed", () => {
  var f = fixture();
  f.find("#old-dialog").open = true;
  f.controller.openPanel("library");
  assert.equal(f.find("#old-dialog").open, false);
  assert.equal(f.find("#library").open, true);
  assert.equal(f.classes.has("side-panel-open"), true);
  assert.equal(f.calls.includes("library"), true);
  f.controller.openPanel("library");
  assert.equal(f.find("#library").open, false);
  assert.equal(f.classes.has("side-panel-open"), false);
  assert.equal(f.calls.filter(call => call === "library").length, 1);
});

test("hiding the top bar persists preference and closes the menu and panels", () => {
  var f = fixture();
  f.controller.setupTopBar();
  f.controller.openPanel("tuning");
  f.host.setSidebarMenu(true);
  f.find("#toggle-top-menu").onclick();
  assert.equal(f.find("#tuning").open, false);
  assert.equal(f.classes.has("side-menu-open"), false);
  assert.equal(f.classes.has("side-panel-open"), false);
  assert.equal(f.classes.has("top-menu-hidden"), true);
  assert.equal(f.storage.kbitsTopMenuHidden, "1");
  assert.equal(f.find("#menu-button")["aria-expanded"], "false");
  f.controller.setupFullscreen();
  assert.equal(f.find("#toggle-fullscreen").disabled, true);
});
