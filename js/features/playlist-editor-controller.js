/**
 * Kbits - Playlist Editor Controller
 *
 * Owns the compact playlist rename dialog. Song Details owns membership;
 * Browse owns filtered viewing and playlist ordering.
 *
 * Environment: Browser with injected persistence callbacks.
 * Invariant: Renaming a playlist preserves its existing ordered song IDs.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsPlaylistEditorController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  /** @returns {{name: string, songIds: Array}} Trimmed rename draft with an independent membership array; does not persist or mutate the playlist. */
  function renameChanges(playlist, name) { return { name: String(name || "").trim(), songIds: playlist.songIds.slice() }; }
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Uses document, playlist getter and async persistence callbacks. open accepts a playlist ID; close discards the dialog; setup binds Save/Cancel once. Save renames while copying the current ordered membership.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options) {
    var documentRef = options.document;
    function find(selector) { return documentRef.querySelector(selector); }
    function open(id) {
      var playlist = options.getPlaylists().find(function (item) { return String(item.id) === String(id); });
      if (!playlist) return false;
      find("#playlist-editor-id").value = playlist.id;
      find("#playlist-editor-name").value = playlist.name;
      var dialog = find("#playlist-details");
      if (!dialog.open) dialog.showModal();
      options.setTimeout(function () { find("#playlist-editor-name").focus(); }, 0);
      return true;
    }
    function close() { var dialog = find("#playlist-details"); if (dialog.open) dialog.close(); }
    function setup() {
      documentRef.querySelectorAll("[data-playlist-editor-close]").forEach(function (button) { button.onclick = close; });
      find("#playlist-editor").onsubmit = function (event) {
        event.preventDefault();
        var id = find("#playlist-editor-id").value;
        var playlist = options.getPlaylists().find(function (item) { return String(item.id) === String(id); });
        var changes = playlist && renameChanges(playlist, find("#playlist-editor-name").value);
        if (!playlist || !changes.name) return;
        options.updatePlaylist(id, changes).then(function () { close(); return options.onSaved(id); }).catch(options.reportError);
      };
    }
    return { open: open, close: close, setup: setup };
  }
  return { create: create, renameChanges: renameChanges };
}));
