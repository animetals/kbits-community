/**
 * Kbits - browser-server.test
 *
 * Checks browser server behavior with the Node test runner.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs/promises");
const { start } = require("./browser/serve.js");
const midi = require("../js/midi-parser.js");

test("browser fixture serves the production app with disposable MIDI storage and cleans up", async t => {
  const session = await start();
  t.after(() => session.close());
  const get = route => fetch(session.url + route);
  const marker = await (await get("/tests/browser/session.json")).json();
  assert.equal(marker.isolated, true);
  const page = await get("/tests/browser/index.html");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Run checks/);
  const app = await (await get("/")).text();
  for (const match of app.matchAll(/(?:src|href)="((?:js|css|assets)\/[^\"]+)"/g)) {
    const asset = await get("/" + match[1]);
    assert.equal(asset.status, 200, match[1]);
    await asset.arrayBuffer();
  }
  const songs = await (await get("/api/midi")).json();
  assert.deepEqual(songs.map(song => song.fileName).sort(), ["alpha.mid", "beta.mid"]);
  const bytes = await (await get("/api/midi?name=alpha.mid")).arrayBuffer();
  assert.equal(midi.parse(bytes).notes[0].note, 60);
  const playlist = (await (await get("/api/playlists")).json())[0];
  assert.equal(playlist.id, marker.playlistId);
  assert.deepEqual(playlist.songIds, ["beta.mid", "alpha.mid"]);
  const update = await fetch(session.url + "/api/midi?name=alpha.mid", { method: "PUT", body: JSON.stringify({ name: "Edited fixture" }) });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).name, "Edited fixture");
  await session.close();
  await assert.rejects(fs.access(session.directory), { code: "ENOENT" });
});
