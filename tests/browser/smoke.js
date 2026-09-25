/**
 * Kbits - smoke
 *
 * Runs opt-in smoke checks against the isolated application iframe.
 *
 * Environment: Browser; fixture server and application iframe.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
/* Browser integration and viewport checks. SPDX-License-Identifier: MIT */
(function () {
  "use strict";
  const frame = document.querySelector("#app"), run = document.querySelector("#run"), status = document.querySelector("#status");
  const results = [], errors = [];
  let session, win, doc;
  function assert(value, message) { if (!value) throw new Error(message); }
  function find(selector) { const element = doc.querySelector(selector); assert(element, "Missing " + selector); return element; }
  async function until(predicate, message) {
    const deadline = performance.now() + 6000;
    while (performance.now() < deadline) {
      if (await predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error(message);
  }
  async function paint() {
    // Layout assertions use settled geometry, including in offscreen iframes.
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  async function click(selector) { find(selector).click(); await paint(); }
  async function change(selector, value) {
    const element = find(selector);
    element.value = value;
    element.dispatchEvent(new win.Event(element.tagName === "INPUT" ? "input" : "change", { bubbles: true }));
    await paint();
  }
  async function api(route, options) {
    const response = await fetch(route, options);
    assert(response.ok, route + " returned " + response.status);
    return response.status === 204 ? null : response.json();
  }
  async function reset() {
    await api("/api/midi?name=alpha.mid", { method: "PUT", body: JSON.stringify({ name: "Smoke Alpha", favorite: false }) });
    await api("/api/playlists?id=" + encodeURIComponent(session.playlistId), { method: "PUT", body: JSON.stringify({ name: "Smoke Practice", songIds: ["beta.mid", "alpha.mid"] }) });
  }
  async function load(width, height) {
    frame.width = width; frame.height = height;
    const loaded = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Application frame did not load")), 10000);
      frame.onload = () => { clearTimeout(timer); resolve(); };
    });
    frame.src = "/index.html?smoke=" + Date.now();
    await loaded;
    win = frame.contentWindow; doc = frame.contentDocument;
    const stableLayout = doc.createElement("style");
    stableLayout.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
    doc.head.appendChild(stableLayout);
    win.addEventListener("error", event => errors.push(event.message));
    win.addEventListener("unhandledrejection", event => errors.push(String(event.reason)));
    win.alert = message => { errors.push("Unexpected alert: " + message); };
    await until(() => [8, 17, 21, 34].includes(doc.querySelectorAll(".tine").length), "Application did not initialize tines");
    await paint();
    await panel("layouts");
    await click('[data-layout-count="17"]');
    await click("#layouts [data-close]");
    await panel("themes");
    await click('[data-theme-choice="snes"]');
    await click("#themes [data-close]");
  }
  async function panel(id) {
    await click("#menu-button");
    await click('#side-menu [data-open="' + id + '"]');
    assert(find("#" + id).open, id + " panel did not open");
  }
  function noPageOverflow(label) {
    assert(doc.documentElement.scrollWidth <= win.innerWidth + 1, label + ": horizontal page overflow");
  }
  async function reachable(selector) {
    const element = find(selector);
    element.scrollIntoView({ block: "center", inline: "center" });
    await paint();
    const rect = element.getBoundingClientRect();
    assert(rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= win.innerWidth + 1 && rect.top >= -1 && rect.bottom <= win.innerHeight + 1, selector + ": clipped or outside viewport");
    const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    assert(hit && (hit === element || element.contains(hit)), selector + ": covered by " + (hit ? hit.tagName + "#" + hit.id + "." + hit.className : "no hit") + " at " + Math.round(rect.left + rect.width / 2) + "," + Math.round(rect.top + rect.height / 2));
  }
  function rows() { return Array.from(doc.querySelectorAll("#browse-results tr")); }
  function names() { return rows().map(row => row.cells[0].textContent).join(","); }
  async function browse() {
    await panel("library");
    await until(() => doc.querySelectorAll("#recent-files .song-row").length === 2, "Library did not load both fixture songs");
    await click("#browse-library");
    await until(() => rows().length === 2, "Browse did not load both songs");
  }
  async function check(name, action) {
    status.textContent = name;
    const item = document.createElement("li");
    document.querySelector("#results").appendChild(item);
    try { await action(); results.push({ name, passed: true }); item.className = "pass"; item.textContent = "PASS: " + name; }
    catch (error) { results.push({ name, passed: false, error: error.message }); item.className = "fail"; item.textContent = "FAIL: " + name + " — " + error.message; }
  }
  async function workflows() {
    await browse();
    await change("#browse-search", "quiet");
    assert(names() === "Smoke Alpha", "Tag search did not isolate Alpha");
    await change("#browse-search", "");
    await change("#browse-category", "game");
    assert(names() === "Smoke Beta", "Category filter failed");
    await change("#browse-category", "");
    await change("#browse-playlist", "favorites");
    assert(names() === "Smoke Beta", "Favorites filter failed");
    assert(!doc.querySelector("#browse-results .delete"), "Favorites exposes catalog deletion");
    await change("#browse-playlist", session.playlistId);
    assert(names() === "Smoke Beta,Smoke Alpha", "Saved playlist order failed");
    const position = rows()[1].querySelector('input[type="number"]');
    position.value = "1"; position.dispatchEvent(new win.Event("change", { bubbles: true }));
    await until(() => names() === "Smoke Alpha,Smoke Beta", "Playlist move did not update Browse");
    const saved = await api("/api/playlists");
    assert(saved.find(item => item.id === session.playlistId).songIds[0] === "alpha.mid", "Playlist order was not persisted");
    await change("#browse-playlist", "");
    await change("#browse-search", "Smoke Alpha");
    await click('#browse-results [title="Song details"]');
    await change("#song-editor-name", "Discard this draft");
    await click("#song-playlist-memberships .song-playlist-remove");
    await click("#song-editor [data-song-editor-close]");
    await click('#browse-results [title="Song details"]');
    assert(find("#song-editor-name").value === "Smoke Alpha", "Cancel saved metadata");
    assert(doc.querySelectorAll("#song-playlist-memberships .song-playlist-remove").length === 1, "Cancel saved membership draft");
    await change("#song-editor-name", "Smoke Alpha Edited");
    await click("#save-song-details");
    await until(() => !find("#song-details").open && names() === "Smoke Alpha Edited", "Save did not refresh metadata");
    await click('#browse-results [title="Print song"]');
    assert(find("#print-options").open, "Print options did not open");
    await click("#print-form [data-print-close]");
    await click('#browse-results [title="Play"]');
    await until(() => find("#track-name").textContent === "Smoke Alpha Edited", "Song did not load into transport");
    assert(find("#browse-view").hidden, "Play did not return to player");
    await click("#stop");
    assert(find("#progress").value === "0", "Stop did not reset position");
    await panel("library");
    await click("#browse-library");
    await click("#close-browse");
    assert(find("#library").open, "Back to Songs did not restore Song Library");
  }
  async function responsive() {
    noPageOverflow("Player");
    for (const id of ["rewind", "play", "stop", "forward", "loop-start", "loop-toggle", "loop-end", "speed"]) await reachable("#" + id);
    await panel("layouts");
    for (const id of ["rewind", "play", "stop", "forward", "loop-start", "loop-toggle", "loop-end", "speed"]) await reachable("#" + id);
    for (const count of [8, 17, 21, 34]) {
      await reachable('[data-layout-count="' + count + '"]');
      await click('[data-layout-count="' + count + '"]');
      assert(doc.querySelectorAll(".tine").length === count, "Wrong tine count for " + count);
      noPageOverflow(count + " keys");
    }
    await click('[data-layout-count="17"]');
    await click("#layouts [data-close]");
    await panel("themes");
    for (const theme of ["snes", "real", "grove", "chrono", "fantasy"]) {
      await reachable('[data-theme-choice="' + theme + '"]');
      await click('[data-theme-choice="' + theme + '"]');
      assert(doc.body.dataset.theme === theme, "Theme did not apply: " + theme);
      noPageOverflow(theme);
    }
    await click('[data-theme-choice="snes"]');
    await click("#themes [data-close]");
    await panel("settings");
    await reachable("#tine-zoom");
    await reachable('#settings [data-open="tuning"]');
    await click('#settings [data-open="tuning"]');
    await reachable("#reset-tuning");
    await click("#tuning [data-close]");
    await browse();
    noPageOverflow("Browse");
    for (const id of ["browse-search", "browse-category", "browse-difficulty", "browse-layout", "browse-playlist", "browse-create-playlist"]) await reachable("#" + id);
    await reachable('#browse-results [title="Song details"]');
    await click('#browse-results [title="Song details"]');
    noPageOverflow("Song Details");
    await reachable("#save-song-details");
    await reachable("#print-song");
    await reachable("#song-editor [data-song-editor-close]");
    await click("#song-editor [data-song-editor-close]");
  }
  run.onclick = async function () {
    run.disabled = true; document.querySelector("#download").disabled = true;
    results.length = 0; errors.length = 0; document.querySelector("#results").innerHTML = "";
    try {
      await check("Desktop library and playlist workflows", async () => { await reset(); await load(1280, 800); await workflows(); });
      for (const [width, height] of [[1280, 800], [390, 844], [844, 390], [320, 568]]) {
        await check("Responsive controls " + width + " × " + height, async () => { await reset(); await load(width, height); await responsive(); });
      }
      await check("No captured runtime errors", () => assert(!errors.length, errors.join("\n")));
    } finally {
      const failed = results.filter(result => !result.passed).length;
      status.textContent = results.length + " checks finished; " + failed + " failed. Physical touch, audio timing, offline persistence, and print output require separate acceptance.";
      run.disabled = false; document.querySelector("#download").disabled = false;
    }
  };
  document.querySelector("#download").onclick = function () {
    const report = { date: new Date().toISOString(), userAgent: navigator.userAgent, results, errors };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "kbits-browser-smoke.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  fetch("session.json").then(response => { assert(response.ok, "Start the isolated smoke server first"); return response.json(); }).then(value => {
    assert(value.isolated === true && value.playlistId, "Missing isolated fixture marker");
    session = value; run.disabled = false; status.textContent = "Isolated fixture ready. Click Run checks.";
  }).catch(error => { status.textContent = error.message + ". Run: node tests/browser/serve.js"; });
}());
