/**
 * Kbits - Song Library Controller
 *
 * Renders the compact song library, favorite controls, and scoped filtering.
 * Repository access and playback remain injected application responsibilities.
 *
 * Environment: Browser; testable in Node.js with an injected DOM.
 * Invariant: Rendering never reads MIDI binary data.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsSongLibraryController = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** @returns {string} Compact file-size label for a value in bytes. */
  function formatBytes(value) {
    if (!value) return "SIZE UNKNOWN";
    if (value < 1024) return value + " B";
    return (value / 1024).toFixed(value < 10240 ? 1 : 0) + " KB";
  }

  /** @returns {string} Display label for stored layout metadata, including Seeds Pisces. */
  function layoutLabel(value) {
    return value ? value === "34" ? "Seeds Pisces · 34 Keys" : value + " Keys" : "—";
  }

  /**
   * @param {Object} options Feature dependencies supplied by app.js.
   * Uses document, live catalog/queue getters and row-action callbacks. renderRows replaces compact rows; filter updates visibility and labels; favoriteButton returns a DOM button whose async failures are reported. No binary reads occur here.
   * @returns {Object} Feature methods retaining these dependencies for the application lifetime.
   */
  function create(options) {
    var documentRef = options.document;
    function find(selector) { return documentRef.querySelector(selector); }

    function favoriteButton(song) {
      var button = documentRef.createElement("button");
      button.type = "button";
      button.className = "song-action favorite-toggle";
      button.textContent = song.favorite ? "★" : "☆";
      button.title = song.favorite ? "Remove from Song Library favorites" : "Add to Song Library favorites";
      button.setAttribute("aria-label", button.title);
      button.setAttribute("aria-pressed", String(song.favorite));
      button.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        options.toggleFavorite(song, !song.favorite).catch(function (error) {
          button.disabled = false;
          options.reportError(error);
        });
      };
      return button;
    }

    function filter() {
      var songs = options.getSongs(), query = (find("#song-search").value || "").trim().toLowerCase(), selection = find("#playlist-filter").value || "all";
      var favorites = selection === "favorites", all = selection === "all", custom = !favorites && !all;
      var selectedName = favorites ? "Favorites" : all ? "All Songs" : options.playlistName(selection), visible = 0, queue = options.queueForView();
      documentRef.querySelectorAll("#recent-files .song-row").forEach(function (row) {
        var favoriteMatch = !favorites || row.dataset.favorite === "true";
        var searchMatch = !query || row.dataset.search.indexOf(query) >= 0;
        var playlistMatch = !custom || (" " + row.dataset.playlists + " ").indexOf(" " + selection + " ") >= 0;
        var match = favoriteMatch && searchMatch && playlistMatch;
        row.hidden = !match;
        if (match) visible++;
      });
      var empty = find("#search-empty"), playButton = find("#play-playlist");
      empty.textContent = favorites && !query ? "NO FAVORITE SONGS · USE ALL SONGS, BROWSE OR SEARCH" : "NO MATCHING SONGS";
      empty.hidden = visible > 0 || !songs.length;
      find("#edit-playlist").disabled = !custom;
      find("#delete-playlist").disabled = !custom;
      find("#library-search-scope").textContent = 'SEARCH WITHIN "' + selectedName + '" BY NAME, ARTIST, CATEGORY, TAG, DIFFICULTY OR LAYOUT';
      playButton.disabled = !queue.length;
      playButton.textContent = favorites ? "▶ PLAY FAVORITES (" + queue.length + ")" : all ? "▶ PLAY ALL SONGS (" + queue.length + ")" : '▶ PLAY "' + selectedName + '" (' + queue.length + ")";
    }

    function renderRows() {
      var songs = options.getSongs(), list = find("#recent-files");
      list.innerHTML = "";
      if (!songs.length) {
        list.innerHTML = '<div class="library-empty">NO SAVED SONGS</div>';
        find("#search-empty").hidden = true;
        return;
      }
      songs.forEach(function (song) {
        var row = documentRef.createElement("div"), load = documentRef.createElement("button"), title = documentRef.createElement("span"), meta = documentRef.createElement("span"), info = documentRef.createElement("button");
        var difficulty = song.difficulty ? song.difficulty.charAt(0).toUpperCase() + song.difficulty.slice(1) : "", layoutName = song.layout ? layoutLabel(song.layout) : "";
        var parts = [song.artist, song.category, difficulty, layoutName, song.tags.join(", ")].filter(Boolean);
        row.className = "song-row";
        row.dataset.search = [song.name, song.artist, song.category, song.difficulty, layoutName, song.fileName, song.tags.join(" "), song.playlistIds.map(options.playlistName).join(" ")].join(" ").toLowerCase();
        row.dataset.playlists = song.playlistIds.join(" ");
        row.dataset.favorite = String(song.favorite);
        load.className = "song-load";
        title.className = "song-title";
        title.textContent = "▶ " + song.name;
        meta.className = "song-meta";
        meta.textContent = parts.join(" · ") || song.fileName;
        load.append(title, meta);
        load.onclick = function () { options.loadSong(song); };
        info.className = "song-action";
        info.title = "Song details";
        info.setAttribute("aria-label", "Details for " + song.name);
        info.textContent = "ⓘ";
        info.onclick = function () { options.openDetails(song); };
        row.append(load, info, favoriteButton(song));
        list.appendChild(row);
      });
      filter();
    }

    return { favoriteButton: favoriteButton, filter: filter, renderRows: renderRows };
  }

  return { create: create, formatBytes: formatBytes, layoutLabel: layoutLabel };
}));
