/**
 * Kbits - Print Controller
 * Owns print options and preview coordination, with injected MIDI/storage/rendering.
 * Invariant: printing never persists Song Details drafts or changes player tuning.
 * Environment: Browser; injected platform and feature callbacks.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsPrintController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Uses document/storage/music, catalog/draft getters, parser, renderer and popup callbacks. open(song,useDraft) shows options; selectSong stores an ID; setup binds once. submit consumes a form event, opens synchronously, then returns a promise for loading/rendering or undefined on early exit. Async failures close the preview and report an error.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options) {
    var selectedId = null, fromEditor = false;
    function find(selector) { return options.document.querySelector(selector); }
    function selectedSong() { return options.getSongs().find(function (song) { return String(song.id) === String(selectedId); }); }
    function selectSong(id) { selectedId = id; }
    function close() { var dialog = find("#print-options"); if (dialog.open) dialog.close(); }
    function open(song, useDraft) {
      if (!song) return;
      selectedId = song.id;
      fromEditor = !!useDraft;
      find("#print-layout").value = song.layout || String(options.getCurrentLayout());
      var dialog = find("#print-options");
      if (!dialog.open) dialog.showModal();
    }
    function submit(event) {
      event.preventDefault();
      // Open synchronously during submission so popup blockers retain user activation.
      var song = selectedSong(), preview = options.openWindow();
      if (!song || !preview) {
        if (!preview) options.reportError("Allow pop-ups for Kbits to open the print preview.");
        return;
      }
      preview.document.write("<p style='font-family:sans-serif;padding:30px'>Preparing Kbits print preview…</p>");
      var draft = fromEditor ? options.getEditorDraft() : null;
      var meta = draft ? { name: draft.name.trim() || song.name, artist: draft.artist.trim() || song.artist, difficulty: draft.difficulty || song.difficulty } : { name: song.name, artist: song.artist, difficulty: song.difficulty };
      var count = +find("#print-layout").value, config = options.music.getLayout(count), offsets;
      try { offsets = options.music.normalizeTuning(JSON.parse(options.storage["kbitsTuning" + count] || "[]"), config.physical.length); }
      catch (error) { offsets = options.music.normalizeTuning([], config.physical.length); }
      return options.getSong(song.id).then(function (saved) {
        var parsed = options.parse(saved.data), physical = options.music.applyTuning(config.physical, offsets);
        options.render(preview, parsed, meta, { physical: physical, numbers: config.numbers.slice(), layoutName: count === 34 ? "Seeds Pisces · 34 Keys" : count + " Keys" }, {
          format: find("#print-format").value, paper: find("#print-paper").value, orientation: find("#print-orientation").value
        });
        close();
      }).catch(function (error) { preview.close(); options.reportError("Could not create print preview: " + error.message); });
    }
    function setup() {
      options.document.querySelectorAll("[data-print-close]").forEach(function (button) { button.onclick = close; });
      find("#print-song").onclick = function () { open(selectedSong(), true); };
      find("#print-form").onsubmit = submit;
    }
    return { open: open, selectSong: selectSong, setup: setup, submit: submit };
  }
  return { create: create };
}));
