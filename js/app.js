/**
 * Kbits - Application Composition Root
 *
 * Connects controllers, shared instrument/player state, and application startup.
 *
 * Environment and dependencies: Browser; depends on the modules loaded earlier in index.html.
 * Invariant: Preserve initialization order and the shared audio playback clock.
 *
 * SPDX-License-Identifier: MIT
 */
(function () {
  "use strict";
  var music = window.KbitsMusicCore,
    libraryCore = window.KbitsLibraryCore,
    playbackCore = window.KbitsPlaybackCore,
    midiValidation = window.KbitsMidiValidationCore,
    nameToMidi = music.nameToMidi,
    midiName = music.midiName,
    numberName = music.numberName,
    normalizeTags = libraryCore.normalizeTags,
    normalizeSong = libraryCore.normalizeSong;
  var requestedLayout = Number(localStorage.kbitsLayout),
    currentLayout = music.hasLayout(requestedLayout) ? requestedLayout : 17,
    layout = music.getLayout(currentLayout),
    basePhysical = layout.physical,
    numbers = layout.numbers,
    keys = layout.keys,
    tuningOffsets = (function () {
      try {
        var saved = JSON.parse(
          localStorage["kbitsTuning" + currentLayout] ||
            (currentLayout === 17 ? localStorage.kbitsTuning : "[]") ||
            "[]"
        );
        return music.normalizeTuning(saved, basePhysical.length);
      } catch (e) {
        return music.normalizeTuning([], basePhysical.length);
      }
    })(),
    physical = music.applyTuning(basePhysical, tuningOffsets),
    letters = physical.map(midiName),
    colors = [];
  var state = {
    song: null,
    position: 0,
    playing: false,
    speed: 1,
    index: 0,
    startedAt: 0,
    startPosition: 0,
    timer: 0,
    preview: 3,
    tineVolume: 0.8,
    songVolume: 0.8,
    tineSwipe: true,
    muteUnmapped: false,
    fallingStyle: "block",
    viewMode: "blocks",
    loopEnabled: false,
    loopStart: null,
    loopEnd: null,
    sound: "keylimba",
    labels: "both"
  };
  if (localStorage.getItem("kbitsSound") === null) localStorage.kbitsSound = "keylimba";
  var audioEngine = window.KbitsAudioEngine.create({
    host: window,
    nameToMidi: nameToMidi,
    sound: state.sound
  });
  var $ = function (s) {
      return document.querySelector(s);
    },
    stage = $("#stage"),
    canvas = $("#highway"),
    tines = $("#tines");
  var kalimbaController = window.KbitsKalimbaController.create({
    container: tines,
    document: document,
    getPhysical: function () {
      return physical;
    },
    getKeys: function () {
      return keys;
    },
    isSwipeEnabled: function () {
      return state.tineSwipe;
    },
    playNote: function (note, velocity, when, duration) {
      playNote(note, velocity, when, duration);
    }
  });
  var themeController = window.KbitsThemeController.create({
    document: document,
    storage: localStorage,
    getTineCount: function () {
      return physical.length;
    },
    onApply: function (nextColors) {
      colors = nextColors;
      playfieldRenderer.invalidateSprites();
    }
  });
  var tuningController = window.KbitsTuningController.create({
    document: document,
    storage: localStorage,
    music: music,
    midiName: midiName,
    setTimeout: setTimeout,
    getState: function () {
      return {
        currentLayout: currentLayout,
        layout: layout,
        basePhysical: basePhysical,
        numbers: numbers,
        keys: keys,
        tuningOffsets: tuningOffsets,
        physical: physical,
        letters: letters
      };
    },
    onTuningChanged: function (next) {
      tuningOffsets = next.tuningOffsets;
      physical = next.physical;
      letters = next.letters;
      playfieldRenderer.invalidateSprites();
    },
    onLayoutChanged: function (next) {
      currentLayout = next.currentLayout;
      layout = next.layout;
      basePhysical = next.basePhysical;
      numbers = next.numbers;
      keys = next.keys;
      tuningOffsets = next.tuningOffsets;
      physical = next.physical;
      letters = next.letters;
      playfieldRenderer.invalidateSprites();
    },
    updateLabels: updateLabels,
    previewNote: function (note) {
      audio();
      playNote(note, 105, 0, 1.1);
    },
    rebuildTines: buildTines
  });
  var songLibraryController = window.KbitsSongLibraryController.create({
    document: document,
    getSongs: function () {
      return libraryController.orderedSongs();
    },
    playlistName: playlistName,
    queueForView: queueForCurrentView,
    toggleFavorite: setSongFavorite,
    reportError: function (error) {
      alert(error.message);
    },
    loadSong: function (song) {
      loadLibrarySong(song, false);
    },
    openDetails: function (song) {
      openSongEditor(song);
    }
  });
  var playlistEditorController = window.KbitsPlaylistEditorController.create({
    document: document,
    setTimeout: setTimeout,
    getPlaylists: function () {
      return libraryController.getPlaylists();
    },
    updatePlaylist: updatePlaylist,
    reportError: function (error) {
      alert(error.message);
    },
    onSaved: function (id) {
      return libraryController.playlistSaved(id);
    }
  });
  var browseController = window.KbitsBrowseController.create({
    document: document,
    HTMLElement: HTMLElement,
    core: libraryCore,
    getSongs: function () {
      return libraryController.getSongs();
    },
    getPlaylists: function () {
      return libraryController.getPlaylists();
    },
    updatePlaylist: updatePlaylist,
    hydratePlaylistOrders: hydratePlaylistOrders,
    renderLibraryRows: renderLibraryRows,
    favoriteButton: favoriteButton,
    loadLibrarySong: loadLibrarySong,
    openDetails: function (song) {
      openSongEditor(song);
    },
    openPrintOptions: openPrintOptions,
    removeSong: removeSong,
    renderLibrary: renderLibrary,
    layoutLabel: layoutLabel,
    createPlaylist: createPlaylist,
    openPlaylistEditor: openPlaylistEditor,
    closeLibrary: function () {
      closeSidePanel($("#library"));
    },
    openLibrary: function () {
      openSidePanel("library");
    },
    confirm: confirm.bind(window),
    prompt: prompt.bind(window),
    reportError: function (error) {
      alert(error.message);
    }
  });
  var printController = window.KbitsPrintController.create({
    document: document,
    storage: localStorage,
    music: music,
    getSongs: function () {
      return libraryController.getSongs();
    },
    getCurrentLayout: function () {
      return currentLayout;
    },
    getSong: getSong,
    parse: function (data) {
      return KbitsMidi.parse(data);
    },
    render: function () {
      return KbitsPrint.open.apply(KbitsPrint, arguments);
    },
    openWindow: function () {
      return window.open("", "_blank");
    },
    getEditorDraft: function () {
      return songEditorController.printDraft();
    },
    reportError: alert
  });
  var navigationController = window.KbitsNavigationController.create({
    document: document,
    host: window,
    storage: localStorage,
    setTimeout: setTimeout,
    resize: resize,
    beforeOpen: function (id) {
      if (id === "tuning") renderTuning();
      if (id === "library") renderLibrary();
    }
  });
  var songEditorController = window.KbitsSongEditorController.create({
    document: document,
    host: window,
    core: libraryCore,
    FileReader: FileReader,
    validate: midiValidation.validate,
    parse: KbitsMidi.parse,
    setTimeout: window.setTimeout.bind(window),
    getSongs: function () {
      return libraryController.getSongs();
    },
    getPlaylists: function () {
      return libraryController.getPlaylists();
    },
    saveSong: saveSong,
    updateSong: updateSong,
    updatePlaylist: updatePlaylist,
    renderLibrary: renderLibrary,
    renderBrowse: renderBrowse,
    formatBytes: formatBytes,
    selectPrintSong: function (id) {
      printController.selectSong(id);
    },
    onUploadSaved: function (saved, upload, meta) {
      libraryController.uploadSaved(saved, upload, meta);
    },
    onSongUpdated: function (song, meta) {
      if (String(libraryController.currentSongId()) === String(song.id))
        $("#track-name").textContent = meta.name;
    },
    reportError: alert
  });
  function openSongEditor(song) {
    return songEditorController.open(song);
  }
  var settingsController = window.KbitsSettingsController.create({
    document: document,
    storage: localStorage,
    state: state,
    tines: tines,
    MutationObserver: MutationObserver,
    numberName: numberName,
    getPhysical: function () {
      return physical;
    },
    getLetters: function () {
      return letters;
    },
    getColors: function () {
      return colors;
    },
    stopVoices: stopVoices,
    refreshSoundfont: refreshSoundfont,
    prepareSamples: prepareSamples,
    endPointer: function () {
      kalimbaController.endPointer();
    },
    invalidateSprites: function () {
      playfieldRenderer.invalidateSprites();
    },
    setupStaffInteraction: setupStaffInteraction
  });
  var playfieldRenderer = window.KbitsPlayfieldRenderer.create({
    document: document,
    canvas: canvas,
    state: state,
    getView: function () {
      return {
        physical: physical,
        colors: colors,
        tuningOffsets: tuningOffsets,
        layout: currentLayout
      };
    },
    getStaff: function () {
      return window.KbitsStaff;
    },
    getPixelRatio: function () {
      return devicePixelRatio || 1;
    },
    now: function () {
      return performance.now();
    },
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    position: position,
    lowerBound: lowerBound,
    midiName: midiName,
    numberName: numberName,
    clock: clock,
    playNote: playNote,
    hit: hit
  });
  function resize() {
    return playfieldRenderer.resize();
  }
  function draw() {
    return playfieldRenderer.start();
  }
  function setupStaffInteraction() {
    return playfieldRenderer.setupStaffInteraction();
  }
  kalimbaController.bind(window);
  function audio() {
    return audioEngine.context();
  }
  function refreshSoundfont() {
    audioEngine.setSound(state.sound);
  }
  function buildTines() {
    kalimbaController.render({
      layout: currentLayout,
      basePhysical: basePhysical,
      physical: physical,
      keys: keys
    });
    updateLabels();
    setupTuning();
    setupThemes();
    setupLayouts();
  }
  function updateLabels() {
    return settingsController.updateLabels();
  }
  function applyTuning() {
    tuningController.applyTuning(tuningOffsets);
  }
  function renderTuning() {
    tuningController.renderTuning();
  }
  function setupTuning() {
    tuningController.setupTuning();
  }
  function setupLayouts() {
    tuningController.setupLayouts();
  }
  function setupThemes() {
    themeController.setup();
  }
  function prepareSamples() {
    return audioEngine.prepare(state.sound);
  }
  function playNote(note, velocity, when, duration, source) {
    if (source === "song" && state.muteUnmapped && physical.indexOf(note) < 0) return;
    var level = source === "song" ? state.songVolume : state.tineVolume;
    audioEngine.play(note, velocity, when, duration, state.sound, level);
  }
  function stopVoices() {
    audioEngine.stopAll();
  }
  function hit(note) {
    kalimbaController.highlightNote(note);
  }
  function setPlayIcon(icon) {
    $("#play").textContent = icon;
  }
  var playerController = window.KbitsPlayerController.create({
    state: state,
    core: playbackCore,
    audio: audioEngine,
    playNote: playNote,
    hit: hit,
    getPhysical: function () {
      return physical;
    },
    setPlayIcon: setPlayIcon,
    onEnded: finishSong,
    onStopped: function () {
      playfieldRenderer.resetProgress();
    }
  });
  var transportController = window.KbitsTransportController.create({
    document: document,
    host: window,
    state: state,
    player: playerController,
    clock: clock
  });
  function resetLoop() {
    return transportController.resetLoop();
  }
  function position() {
    return playerController.position();
  }
  function lowerBound(time) {
    return playerController.lowerBound(time);
  }
  function play() {
    playerController.play();
  }
  function pause(ended) {
    playerController.pause(ended);
  }
  function loadBuffer(buffer, name) {
    try {
      state.song = midiValidation.validate(buffer, KbitsMidi.parse);
      state.position = 0;
      state.index = 0;
      resetLoop();
      $("#track-name").textContent = String(name || "Untitled").replace(/\.midi?$/i, "");
      $("#empty-state").classList.add("hidden");
      pause();
      prepareSamples();
    } catch (e) {
      alert("Could not read MIDI: " + e.message);
    }
  }
  var localLibraryRepository = KbitsLibraryRepositories.createBrowserRepository({
      indexedDB: indexedDB,
      core: libraryCore
    }),
    containerLibraryRepository = KbitsLibraryRepositories.createContainerRepository({
      fetch: fetch.bind(window),
      core: libraryCore
    }),
    libraryRepository = KbitsLibraryRepositories.createHybridRepository(
      containerLibraryRepository,
      localLibraryRepository,
      { fileProtocol: location.protocol === "file:" }
    );
  var libraryController = window.KbitsLibraryController.create({
    document: document,
    core: libraryCore,
    repository: libraryRepository,
    MutationObserver: MutationObserver,
    loadBuffer: loadBuffer,
    play: play,
    pause: pause,
    renderLibraryRows: renderLibraryRows,
    renderBrowse: renderBrowse,
    filterLibrary: filterLibrary,
    openPlaylistEditor: openPlaylistEditor,
    closeLibrary: function () {
      closeSidePanel($("#library"));
    },
    prompt: prompt.bind(window),
    confirm: confirm.bind(window),
    reportError: function (error) {
      alert(error.message);
    }
  });
  function playlistName(id) {
    return libraryController.playlistName(id);
  }
  function hydratePlaylistOrders() {
    return libraryController.hydrate();
  }
  function queueForCurrentView() {
    return libraryController.queueForView();
  }
  function loadLibrarySong(song, autoPlay) {
    return libraryController.loadSong(song, autoPlay);
  }
  function finishSong() {
    return libraryController.finishSong();
  }
  function setSongFavorite(song, value) {
    return libraryController.setFavorite(song, value);
  }
  function renderLibrary() {
    return libraryController.refresh();
  }

  function saveSong(meta, data) {
    return libraryRepository.createSong(meta, data);
  }
  function getSong(id) {
    return libraryRepository.getSong(id);
  }
  function removeSong(id) {
    return libraryRepository.deleteSong(id);
  }
  function updateSong(id, meta) {
    return libraryRepository.updateSong(id, meta);
  }
  function createPlaylist(name) {
    return libraryRepository.createPlaylist(name);
  }
  function updatePlaylist(id, changes) {
    return libraryRepository.updatePlaylist(id, changes);
  }
  function formatBytes(value) {
    return window.KbitsSongLibraryController.formatBytes(value);
  }
  function openPlaylistEditor(id) {
    return playlistEditorController.open(id);
  }
  function favoriteButton(song) {
    return songLibraryController.favoriteButton(song);
  }
  function renderLibraryRows() {
    songLibraryController.renderRows();
  }
  function layoutLabel(value) {
    return window.KbitsSongLibraryController.layoutLabel(value);
  }
  function renderBrowse() {
    return browseController.render();
  }
  function clock(s) {
    s = Math.max(0, s || 0);
    return (
      String(Math.floor(s / 60)).padStart(2, "0") +
      ":" +
      String(Math.floor(s % 60)).padStart(2, "0")
    );
  }
  function settings() {
    return settingsController.setup();
  }
  function setupSidebarMenu() {
    return navigationController.setupMenu();
  }
  function setupTopBar() {
    return navigationController.setupTopBar();
  }
  function setupFullscreen() {
    return navigationController.setupFullscreen();
  }
  function setupTineSwipe() {
    return settingsController.setupSwipe();
  }
  function setupMuteUnmapped() {
    return settingsController.setupMuteUnmapped();
  }

  function setupFallingStyle() {
    return settingsController.setupFallingStyle();
  }
  function setupPlayView() {
    return settingsController.setupPlayView();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  buildTines();
  settings();
  resize();
  addEventListener("resize", resize);
  transportController.setup();
  setupTineSwipe();
  setupMuteUnmapped();
  setupFallingStyle();
  setupPlayView();
  transportController.setupLoops();
  setupSidebarMenu();
  setupTopBar();
  setupFullscreen();
  resize();
  draw();
  renderLibrary();
  function filterLibrary() {
    songLibraryController.filter();
  }
  browseController.setup();
  libraryController.setup();
  function openPrintOptions(song, fromEditor) {
    return printController.open(song, fromEditor);
  }
  playlistEditorController.setup();
  printController.setup();
  songEditorController.setup();
  function closeSidePanel(dialog) {
    return navigationController.closePanel(dialog);
  }
  function openSidePanel(id) {
    return navigationController.openPanel(id);
  }
  navigationController.setupPanels();
})();
