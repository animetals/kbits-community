# Installation verification

[Installation](installation.md) · [Developer guide](developer.md) · [Browser acceptance](../tests/browser/README.md)

This is the verification procedure for the documented installation, backup and upgrade instructions. Writing this procedure does not establish that a clean installation or physical-device test passed. Use disposable data and record the source commit or image tag, operating system, browser, date and result.

## Source installation

1. Copy the current application into a separate folder with an empty library. Install Node.js 22 or later; no package installation is required.
2. Run `node server.js` from that folder. Confirm `http://localhost:5248` loads; if another instance uses the port, choose a different `PORT` for this process.
3. Upload a permitted test MIDI, save metadata, mark it as a favorite and create a playlist. Reload and confirm each persists.
4. Stop and restart the server. Confirm the MIDI, details and playlist remain. On Windows, separately verify `start-kbits.bat` opens the address and reports startup errors.
5. Open the server's LAN address from another device. Confirm the shared catalog is visible and local theme/tuning preferences remain device-specific.

## Container installation

1. Use a separate Compose project, host port and empty host library folder. Select the intended image tag; do not reuse a production library for verification.
2. Follow the installation guide and confirm the mounted folder receives the test MIDI and hidden `.kbits-library.json`.
3. Repeat the upload, metadata and playlist checks. Recreate the container and confirm the same data remains.
4. Stop the service and back up the entire library and Compose configuration. Restore into another disposable folder and verify the catalog and playlist order.
5. Test an upgrade using the intended replacement image and the same disposable mount. Record both image references and confirm retained data. Retain the backup and previous image for rollback.

## Browser and offline checks

Use the separate browser acceptance matrix for touch, layout, audio alignment and PDF output. A server fixture test verifies HTTP/storage behavior, not browser rendering. For IndexedDB, use a disposable static HTTP origin without the container API, upload a test song and reload. Record library persistence separately from whether a page reload succeeds without network access. Browser storage is scoped to the origin; it is not a server-library backup.

## Current evidence

On 2026-09-25, all 72 automated tests passed again, including isolated production-server startup, fixture MIDI, HTTP persistence and cleanup. Desktop/responsive browser checks and tested phone and print/PDF workflows have passed acceptance. Clean source-installation acceptance, a local Docker build, and container upgrade/restore acceptance remain pending. Docker is unavailable in the preparation environment. See the browser evidence for device-test scope and the [release checklist](release-checklist.md) for publication steps.
