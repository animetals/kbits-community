/**
 * Kbits - serve
 *
 * Creates a temporary production-server fixture for browser smoke checks.
 *
 * Environment: Node.js; built-in test/fixture APIs and application modules.
 * Invariant: Preserve the user library and unrelated local files.
 *
 * SPDX-License-Identifier: MIT
 */
"use strict";

const fs = require("node:fs/promises"), os = require("node:os"), path = require("node:path");
const net = require("node:net"), { spawn } = require("node:child_process");
const library = require("../../js/platform/server-library-store.js");
const root = path.resolve(__dirname, "../..");

function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function start() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "kbits-browser-"));
  let child, closing;
  async function close() {
    if (closing) return closing;
    closing = (async () => {
      if (child && child.exitCode === null && child.signalCode === null) {
        await new Promise(resolve => { child.once("exit", resolve); child.kill(); });
      }
      // Only remove the exact directory returned by mkdtemp, never a user library.
      if (path.dirname(directory) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith("kbits-browser-")) {
        throw new Error("Unexpected browser fixture directory");
      }
      await fs.rm(directory, { recursive: true, force: true, maxRetries: 3 });
    })();
    return closing;
  }
  try {
    for (const entry of ["index.html", "server.js", "js", "css", "assets"]) {
      await fs.cp(path.join(root, entry), path.join(directory, entry), { recursive: true });
    }
    const web = path.join(directory, "tests/browser");
    await fs.mkdir(web, { recursive: true });
    for (const entry of ["index.html", "smoke.js"]) await fs.copyFile(path.join(__dirname, entry), path.join(web, entry));
    const store = library.create({ directory: path.join(directory, "midi") });
    await store.ensure();
    const bytes = Buffer.from([
      0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96,
      0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 12,
      0, 0x90, 60, 64, 96, 0x80, 60, 64, 0, 0xff, 0x2f, 0
    ]);
    await store.createSong("alpha.mid", bytes, { name: "Smoke Alpha", category: "Practice", tags: ["quiet"], favorite: false, layout: "17", difficulty: "easy" });
    await store.createSong("beta.mid", bytes, { name: "Smoke Beta", category: "Game", favorite: true, layout: "34", difficulty: "hard" });
    const playlist = await store.createPlaylist({ name: "Smoke Practice" });
    await store.updatePlaylist(playlist.id, { name: playlist.name, songIds: ["beta.mid", "alpha.mid"] });
    await fs.writeFile(path.join(web, "session.json"), JSON.stringify({ isolated: true, playlistId: playlist.id }));
    const port = await availablePort();
    child = spawn(process.execPath, [path.join(directory, "server.js")], {
      cwd: directory, env: { ...process.env, PORT: String(port), MIDI_DIR: path.join(directory, "midi") },
      windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
    });
    await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => finish(new Error("Smoke server startup timed out")), 10000);
      function finish(error) { clearTimeout(timer); child.off("error", finish); child.off("exit", exited); error ? reject(error) : resolve(); }
      function exited(code) { finish(new Error("Smoke server exited (" + code + "): " + output)); }
      child.once("error", finish);
      child.once("exit", exited);
      child.stdout.on("data", data => { output += data; if (output.includes("Kbits listening on " + port + ";")) finish(); });
      child.stderr.on("data", data => { output += data; });
    });
    return { url: "http://127.0.0.1:" + port, directory, close };
  } catch (error) { await close(); throw error; }
}

module.exports = { start };
if (require.main === module) {
  start().then(session => {
    console.log("Open " + session.url + "/tests/browser/index.html in your desktop browser.");
    console.log("Temporary library: " + session.directory + "\nPress Ctrl+C to stop and remove the fixture.");
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
      session.close().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
    });
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
