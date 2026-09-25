/**
 * Kbits - Library Repositories
 *
 * Adapts IndexedDB and local HTTP storage behind a shared repository API.
 *
 * Environment and dependencies: Browser; injected IndexedDB, fetch, and library core.
 * Invariant: Fallback stores remain separate; existing records route by ID.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KbitsLibraryRepositories = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * @param {Object} options Injected indexedDB and library core.
   * @returns {Object} Async repository; opens database version 4 lazily and caches
   *   the connection promise. Catalogs omit bytes; getSong returns stored data.
   *   Multi-store/membership operations are not one transaction. Errors reject.
   */
  function createBrowserRepository(options) {
    var indexedDB = options.indexedDB;
    var core = options.core;
    var dbPromise = null;

    function openDb() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise(function (resolve, reject) {
        var request = indexedDB.open("kbits-library", 4);
        request.onupgradeneeded = function () {
          var db = request.result;
          var tx = request.transaction;
          var songs = db.objectStoreNames.contains("songs") ? tx.objectStore("songs") : db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
          var indexStore;
          if (!db.objectStoreNames.contains("playlists")) db.createObjectStore("playlists", { keyPath: "id" });
          if (db.objectStoreNames.contains("songIndex")) db.deleteObjectStore("songIndex");
          indexStore = db.createObjectStore("songIndex", { keyPath: "id" });
          indexStore.createIndex("favoriteKey", "favoriteKey", { unique: false });
          indexStore.createIndex("nameKey", "nameKey", { unique: false });
          indexStore.createIndex("categoryKey", "categoryKey", { unique: false });
          indexStore.createIndex("difficulty", "difficulty", { unique: false });
          indexStore.createIndex("layout", "layout", { unique: false });
          indexStore.createIndex("tags", "tags", { unique: false, multiEntry: true });
          songs.openCursor().onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
              indexStore.put(core.songIndexRecord(cursor.value));
              cursor.continue();
            }
          };
        };
        request.onsuccess = function () {
          var db = request.result;
          db.onversionchange = function () { db.close(); };
          resolve(db);
        };
        request.onblocked = function () { reject(Error("Kbits library update is blocked. Close other Kbits tabs, then reload this page.")); };
        request.onerror = function () { reject(request.error); };
      });
      return dbPromise;
    }

    function request(storeName, mode, action) {
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(storeName, mode);
          var operation;
          var result;
          try { operation = action(tx.objectStore(storeName)); } catch (error) { reject(error); return; }
          operation.onsuccess = function () { result = operation.result; };
          operation.onerror = function () { reject(operation.error); };
          tx.oncomplete = function () { resolve(result); };
          tx.onerror = function () { reject(tx.error || Error("Library storage transaction failed")); };
          tx.onabort = function () { reject(tx.error || Error("The local library cancelled the operation")); };
        });
      });
    }

    function listSongs() { return request("songIndex", "readonly", function (store) { return store.getAll(); }).then(function (songs) { return songs.map(core.normalizeSong); }); }
    function getSong(id) { return request("songs", "readonly", function (store) { return store.get(id); }); }
    function createSong(meta, data) {
      var song = core.normalizeSong(Object.assign({ favorite: false }, meta, { data: data, added: Date.now(), size: data.byteLength }));
      delete song.id;
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(["songs", "songIndex"], "readwrite");
          var add = tx.objectStore("songs").add(song);
          add.onsuccess = function () { song.id = add.result; tx.objectStore("songIndex").put(core.songIndexRecord(song)); };
          tx.oncomplete = function () { resolve(song); };
          tx.onerror = function () { reject(tx.error || Error("Could not save MIDI to the local library")); };
          tx.onabort = function () { reject(tx.error || Error("The local library cancelled the MIDI save")); };
        });
      });
    }
    function updateSong(id, changes) {
      return getSong(id).then(function (song) {
        Object.assign(song, changes);
        song = core.normalizeSong(song);
        return request("songs", "readwrite", function (store) { return store.put(song); })
          .then(function () { return request("songIndex", "readwrite", function (store) { return store.put(core.songIndexRecord(song)); }); })
          .then(function () { return song; });
      });
    }
    function listPlaylists() { return request("playlists", "readonly", function (store) { return store.getAll(); }).then(function (items) { return items.map(core.normalizePlaylist); }); }
    function createPlaylist(name) {
      var item = { id: "local-" + Date.now() + "-" + Math.random().toString(16).slice(2), name: name, created: Date.now(), songIds: [] };
      return request("playlists", "readwrite", function (store) { return store.add(item); }).then(function () { return item; });
    }
    function updatePlaylist(id, changes) {
      return request("playlists", "readonly", function (store) { return store.get(id); }).then(function (item) {
        Object.assign(item, changes);
        return request("playlists", "readwrite", function (store) { return store.put(item); }).then(function () { return core.normalizePlaylist(item); });
      });
    }
    function deletePlaylist(id) {
      return Promise.all([listSongs().then(function (songs) {
        return Promise.all(songs.filter(function (song) { return song.playlistIds.indexOf(String(id)) >= 0; }).map(function (song) {
          return updateSong(song.id, { playlistIds: song.playlistIds.filter(function (value) { return value !== String(id); }) });
        }));
      }), request("playlists", "readwrite", function (store) { return store.delete(id); })]);
    }
    function deleteSong(id) {
      return listPlaylists().then(function (playlists) {
        var chain = Promise.resolve();
        playlists.forEach(function (playlist) {
          var order = playlist.songIds.filter(function (songId) { return String(songId) !== String(id); });
          if (order.length !== playlist.songIds.length) chain = chain.then(function () { return updatePlaylist(playlist.id, { songIds: order }); });
        });
        return chain.then(function () {
          return Promise.all([
            request("songs", "readwrite", function (store) { return store.delete(id); }),
            request("songIndex", "readwrite", function (store) { return store.delete(id); })
          ]);
        });
      });
    }
    return { listSongs: listSongs, getSong: getSong, createSong: createSong, updateSong: updateSong, deleteSong: deleteSong, listPlaylists: listPlaylists, createPlaylist: createPlaylist, updatePlaylist: updatePlaylist, deletePlaylist: deletePlaylist };
  }

  /**
   * @param {Object} options Injected fetch and normalization core.
   * @returns {Object} Async same-origin HTTP repository. getSong resolves to
   *   {data: ArrayBuffer}; create/update resolve to server records; deletes resolve
   *   without a value. HTTP/read failures reject. Upload timeout is 3000 ms.
   */
  function createContainerRepository(options) {
    var fetch = options.fetch;
    var core = options.core;
    function fetchWithTimeout(url, settings, timeout) {
      return new Promise(function (resolve, reject) {
        var controller = typeof AbortController === "function" ? new AbortController() : null;
        var timer = setTimeout(function () { if (controller) controller.abort(); reject(Error("server timeout")); }, timeout || 4000);
        var requestSettings = Object.assign({}, settings || {});
        if (controller) requestSettings.signal = controller.signal;
        fetch(url, requestSettings).then(function (response) { clearTimeout(timer); resolve(response); }, function (error) { clearTimeout(timer); reject(error); });
      });
    }
    function apiUrl(name, meta) {
      var query = [];
      if (name) query.push("name=" + encodeURIComponent(name));
      if (meta) query.push("meta=" + encodeURIComponent(JSON.stringify(meta)));
      return "/api/midi" + (query.length ? "?" + query.join("&") : "");
    }
    function checked(response, message) { if (!response.ok) throw Error(message); return response; }
    return {
      listSongs: function () { return fetch(apiUrl()).then(function (response) { return checked(response, "server unavailable").json(); }).then(function (songs) { return songs.map(core.normalizeSong); }); },
      getSong: function (id) { return fetch(apiUrl(id)).then(function (response) { return checked(response, "Could not load MIDI").arrayBuffer(); }).then(function (data) { return { data: data }; }); },
      createSong: function (meta, data) { meta = Object.assign({ favorite: false }, meta); return fetchWithTimeout(apiUrl(meta.fileName, meta), { method: "POST", headers: { "Content-Type": "audio/midi" }, body: data }, 3000).then(function (response) { return checked(response, "server unavailable").json(); }); },
      updateSong: function (id, changes) { return fetch(apiUrl(id), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) }).then(function (response) { return checked(response, "Could not update MIDI").json(); }); },
      deleteSong: function (id) { return fetch(apiUrl(id), { method: "DELETE" }).then(function (response) { checked(response, "Could not remove MIDI"); }); },
      listPlaylists: function () { return fetch("/api/playlists").then(function (response) { return checked(response, "server unavailable").json(); }).then(function (items) { return items.map(core.normalizePlaylist); }); },
      createPlaylist: function (name) { return fetch("/api/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name }) }).then(function (response) { return checked(response, "Could not create playlist").json(); }); },
      updatePlaylist: function (id, changes) { return fetch("/api/playlists?id=" + encodeURIComponent(id), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) }).then(function (response) { return checked(response, "Could not update playlist").json(); }); },
      deletePlaylist: function (id) { return fetch("/api/playlists?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function (response) { checked(response, "Could not delete playlist"); }); }
    };
  }

  /**
   * @param {Object} remote Container repository.
   * @param {Object} local Browser repository.
   * @param {Object} [options] fileProtocol rejects song creation on file: pages.
   * @returns {Object} Async router: listing/creation fall back on remote rejection;
   *   existing non-string/local- IDs route locally, other IDs remotely. No merging,
   *   replication or fallback for existing-record writes. An upload timeout does
   *   not prove the server rejected the write, so fallback can leave two copies.
   */
  function createHybridRepository(remote, local, options) {
    options = options || {};
    function isLocal(id) { return typeof id !== "string" || id.indexOf("local-") === 0; }
    return {
      listSongs: function () { return remote.listSongs().catch(function () { return local.listSongs(); }); },
      getSong: function (id) { return isLocal(id) ? local.getSong(id) : remote.getSong(id); },
      createSong: function (meta, data) {
        if (options.fileProtocol) return Promise.reject(Error("The managed song library requires the Kbits local server. Close this file page and run start-kbits.bat."));
        return remote.createSong(meta, data).catch(function () { return local.createSong(meta, data); });
      },
      updateSong: function (id, changes) { return isLocal(id) ? local.updateSong(id, changes) : remote.updateSong(id, changes); },
      deleteSong: function (id) { return isLocal(id) ? local.deleteSong(id) : remote.deleteSong(id); },
      listPlaylists: function () { return remote.listPlaylists().catch(function () { return local.listPlaylists(); }); },
      createPlaylist: function (name) { return remote.createPlaylist(name).catch(function () { return local.createPlaylist(name); }); },
      updatePlaylist: function (id, changes) { return isLocal(id) ? local.updatePlaylist(id, changes) : remote.updatePlaylist(id, changes); },
      deletePlaylist: function (id) { return isLocal(id) ? local.deletePlaylist(id) : remote.deletePlaylist(id); }
    };
  }

  return { createBrowserRepository: createBrowserRepository, createContainerRepository: createContainerRepository, createHybridRepository: createHybridRepository };
}));
