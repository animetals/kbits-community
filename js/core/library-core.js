/**
 * Kbits - Library Core
 *
 * Normalizes song metadata, playlists, filters, ordering, and queues.
 *
 * Environment and dependencies: Browser and Node.js; explicit catalog inputs, no storage access.
 * Invariant: Domain calculations do not read MIDI binaries or update the UI.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsLibraryCore = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var difficulties = ["easy", "medium", "hard", "impossible"];
  var layouts = ["8", "17", "21", "34"];

  /**
   * @param {string|Array} value Comma-separated text or tags.
   * @returns {string[]} New trimmed list, case-insensitively deduplicated and limited to 30.
   */
  function normalizeTags(value) {
    var values = Array.isArray(value) ? value : String(value || "").split(",");
    var seen = Object.create(null);
    return values.map(function (tag) { return String(tag).trim(); }).filter(function (tag) {
      var key = tag.toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, 30);
  }

  /**
   * @param {Object} song Source record; not mutated. Binary data remains a shared reference.
   * @param {number} [now] Fallback epoch milliseconds; omitted uses Date.now().
   * @returns {Object} Normalized record; missing favorite defaults to true for legacy records.
   */
  function normalizeSong(song, now) {
    song = song || {};
    var difficulty = String(song.difficulty || "").toLowerCase();
    var layout = String(song.layout || "");
    return {
      id: song.id,
      fileName: song.fileName || song.name || "",
      name: String(song.name || song.fileName || "Untitled").replace(/\.midi?$/i, ""),
      artist: String(song.artist || ""),
      category: String(song.category || ""),
      difficulty: difficulties.indexOf(difficulty) >= 0 ? difficulty : "",
      layout: layouts.indexOf(layout) >= 0 ? layout : "",
      tags: normalizeTags(song.tags),
      favorite: song.favorite === undefined ? true : !!song.favorite,
      playlistIds: Array.isArray(song.playlistIds) ? song.playlistIds.map(String) : [],
      added: Number(song.added) || (now === undefined ? Date.now() : Number(now)),
      size: Number(song.size) || (song.data && song.data.byteLength) || 0,
      data: song.data
    };
  }

  /**
   * @param {Object} song Source song.
   * @param {number} [now] Fallback epoch milliseconds.
   * @returns {Object} New searchable metadata record without MIDI data.
   */
  function songIndexRecord(song, now) {
    var item = normalizeSong(song, now);
    var record = Object.assign({}, item, {
      favoriteKey: item.favorite ? "1" : "0",
      nameKey: item.name.toLowerCase(),
      categoryKey: item.category.toLowerCase(),
      searchText: [item.name, item.artist, item.category, item.difficulty, item.layout, item.fileName, item.tags.join(" ")].join(" ").toLowerCase()
    });
    delete record.data;
    return record;
  }

  /**
   * @param {Object} item Source playlist; not mutated.
   * @param {number} [now] Fallback epoch milliseconds.
   * @returns {Object} New playlist with string song IDs; ordered indicates whether songIds existed.
   */
  function normalizePlaylist(item, now) {
    item = item || {};
    return {
      id: item.id,
      name: String(item.name || "Untitled Playlist"),
      created: Number(item.created) || (now === undefined ? Date.now() : Number(now)),
      songIds: Array.isArray(item.songIds) ? item.songIds.map(String) : [],
      ordered: Array.isArray(item.songIds)
    };
  }

  /**
   * @param {Object[]} songs Catalog records.
   * @param {Object[]} playlists Normalized playlists with the ordered migration flag.
   * @returns {{songs: Object[], playlists: Object[]}} New records and membership arrays, removing missing/duplicate IDs and migrating legacy membership without storage writes.
   */
  function hydratePlaylistOrders(songs, playlists) {
    var hydratedSongs = songs.map(function (song) {
      return Object.assign({}, song, { playlistIds: Array.isArray(song.playlistIds) ? song.playlistIds.map(String) : [] });
    });
    var validIds = hydratedSongs.map(function (song) { return String(song.id); });
    var hydratedPlaylists = playlists.map(function (playlist) {
      var seen = Object.create(null);
      var copy = Object.assign({}, playlist, { songIds: [] });
      (playlist.songIds || []).forEach(function (id) {
        var key = String(id);
        if (validIds.indexOf(key) >= 0 && !seen[key]) {
          seen[key] = true;
          copy.songIds.push(key);
        }
      });
      if (!playlist.ordered) hydratedSongs.forEach(function (song) {
        var songId = String(song.id);
        if (song.playlistIds.indexOf(String(playlist.id)) >= 0 && !seen[songId]) {
          seen[songId] = true;
          copy.songIds.push(songId);
        }
      });
      return copy;
    });
    hydratedSongs.forEach(function (song) {
      song.playlistIds = hydratedPlaylists.filter(function (playlist) {
        return playlist.songIds.indexOf(String(song.id)) >= 0;
      }).map(function (playlist) { return String(playlist.id); });
    });
    return { songs: hydratedSongs, playlists: hydratedPlaylists };
  }

  /**
   * @param {Array} songIds Existing order; not mutated.
   * @param {string|number} songId Song to insert or remove.
   * @param {?number} position One-based insertion position; nonpositive/invalid removes it.
   * @returns {string[]} New order with insertion clamped to the end.
   */
  function positionSong(songIds, songId, position) {
    var target = String(songId);
    var order = (songIds || []).map(String).filter(function (id) { return id !== target; });
    var parsed = parseInt(position, 10);
    if (parsed > 0) order.splice(Math.min(Math.max(parsed - 1, 0), order.length), 0, target);
    return order;
  }

  /**
   * @param {Object[]} songs Current catalog.
   * @param {Object[]} playlists Ordered playlists.
   * @param {string} playlistId all selects every song; an unknown ID selects favorites.
   * @returns {Array<string|number>} New queue of existing IDs; input records are unchanged.
   */
  function queueSongIds(songs, playlists, playlistId) {
    if (playlistId === "all") return songs.map(function (song) { return song.id; });
    var playlist = playlists.find(function (item) { return String(item.id) === String(playlistId); });
    if (playlist) return playlist.songIds.filter(function (id) {
      return songs.some(function (song) { return String(song.id) === String(id); });
    });
    return songs.filter(function (song) { return song.favorite; }).map(function (song) { return song.id; });
  }

  /**
   * @returns {Object[]} New array of original records: playlist members first, remaining songs in original order.
   */
  function orderSongsForPlaylist(songs, playlist) {
    if (!playlist) return songs.slice();
    var positions = Object.create(null);
    (playlist.songIds || []).forEach(function (id, index) { positions[String(id)] = index; });
    return songs.map(function (song, index) { return { song: song, index: index }; }).sort(function (a, b) {
      var first = positions[String(a.song.id)], second = positions[String(b.song.id)];
      var firstIncluded = first !== undefined, secondIncluded = second !== undefined;
      if (firstIncluded && secondIncluded) return first - second;
      if (firstIncluded) return -1;
      if (secondIncluded) return 1;
      return a.index - b.index;
    }).map(function (entry) { return entry.song; });
  }

  /**
   * @param {Object} song Normalized metadata.
   * @param {Object} filters Optional query/category/difficulty/layout filters.
   * @returns {boolean} Whether all active filters match; no mutation.
   */
  function matchesBrowse(song, filters) {
    filters = filters || {};
    var query = String(filters.query || "").trim().toLowerCase();
    var search = [song.name, song.artist, song.category, (song.tags || []).join(" "), song.fileName].join(" ").toLowerCase();
    return (!query || search.indexOf(query) >= 0) &&
      (!filters.category || song.category.toLowerCase() === String(filters.category).toLowerCase()) &&
      (!filters.difficulty || song.difficulty === filters.difficulty) &&
      (!filters.layout || song.layout === String(filters.layout));
  }

  /**
   * @returns {string[]} Sorted nonempty categories, deduplicated case-insensitively.
   */
  function browseCategories(songs) {
    var seen = Object.create(null);
    return songs.map(function (song) { return String(song.category || "").trim(); }).filter(function (category) {
      var key = category.toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (a, b) { return a.localeCompare(b); });
  }

  return {
    normalizeTags: normalizeTags,
    normalizeSong: normalizeSong,
    songIndexRecord: songIndexRecord,
    normalizePlaylist: normalizePlaylist,
    hydratePlaylistOrders: hydratePlaylistOrders,
    positionSong: positionSong,
    queueSongIds: queueSongIds,
    orderSongsForPlaylist: orderSongsForPlaylist,
    matchesBrowse: matchesBrowse,
    browseCategories: browseCategories
  };
}));
