# Developing Kbits Community

[User documentation](../README.md) · [Architecture](../ARCHITECTURE.md) · [Contributing](../CONTRIBUTING.md) · [Roadmap](../ROADMAP.md)

Kbits uses plain JavaScript without a build step or runtime package dependencies. Run `node server.js` with Node.js 22 or later. Browser scripts load in the order listed in `index.html`; adding a module requires wiring that order and the composition root.

## Module boundaries

- `js/core/`: deterministic music, library, validation, and playback calculations. No DOM, storage, network, or Web Audio access.
- `js/platform/`: browser audio and library repositories, plus the Node filesystem store.
- `js/features/`: feature controllers and rendering coordination with injected dependencies.
- `js/app.js`: constructs controllers and connects shared state, loading, audio, and feature callbacks.
- `js/midi-parser.js`, `js/staff-view.js`, and `js/print-view.js`: parsing and specialized views.
- `server.js`: static serving and Community HTTP routes over the filesystem store.

The [module map](../ARCHITECTURE.md#current-module-map) names individual responsibilities. Core modules expose browser globals and CommonJS exports for Node tests. Preserve this convention without introducing a bundler merely for extraction.

Add a short module header describing responsibility, environment, and injected dependencies. Document exported functions with JSDoc where units, record shapes, async results, mutation, or error behavior are not obvious. In particular, distinguish playback seconds from event timestamps and explain ownership of mutable state. Keep comments about contracts and decisions rather than restating each line.

The source API review covers core exports, platform factories, feature factories and helper exports, the MIDI parser, and staff/print rendering. Factory JSDoc describes the returned controller's lifecycle and state ownership; method names and concrete dependency wiring remain in `app.js`. Internal DOM helpers need comments only when they add a non-obvious contract. For installation/upgrade evidence, follow the [installation verification procedure](installation-validation.md); unexecuted checks remain pending rather than documentation TODOs.

## Runtime and storage contracts

### Time and mutable state

Parsed notes use `start`, `end`, and `duration` in song seconds; `startTick`, `endTick`, and `durationTicks` retain MIDI ticks. `division` is ticks per quarter note. `barTimes` and time-signature `seconds` values use song seconds. Notes are sorted by `start`; scheduler binary search relies on this ordering. The parser enforces a minimum note duration of 0.04 seconds, so `duration` can differ from `end - start`.

The player reads Web Audio time in seconds. `startedAt` is an audio-clock value, while `position` and `startPosition` are song positions. `speed` is a multiplier. Timer delays use milliseconds; never pass wall-clock timestamps into playback calculations. The renderer reads the same player position and must not advance it. Core scheduling returns a new batch array containing original note references, not cloned notes.

Controllers retain injected state and callbacks; factories do not imply state isolation. Construct them once in `app.js`, then bind their setup methods in the existing startup order. Setup is not a general dispose/reinitialize protocol. Song Details keeps metadata and playlist membership as drafts until Save. Save performs metadata and playlist writes sequentially: failures can leave earlier writes persisted. Cancel discards the current draft; it does not roll back already completed writes.

### Print renderer

`KbitsPrint.open(target, song, meta, config, options)` replaces an already-open, same-origin preview document. The print controller opens that window synchronously during the form submission before fetching MIDI bytes. The renderer does not open a window or automatically print. Its toolbar invokes the browser print dialog.

`config.physical` contains tuned MIDI pitches in physical lane order; `config.numbers` contains corresponding labels. Only exact mapped pitches are printed, with duplicate pitches resolving to the first lane. Pass the UI's supported `format` (`numbers`, `notes`, `score`), `paper` (`Letter`, `A4`), and `orientation` (`portrait`, `landscape`) values. The renderer assigns `options.meta`; use a fresh options object. Song data and player tuning are unchanged. Document-access/rendering errors propagate to the controller, which closes the failed preview and reports the error.

| Setting | Local server default | Container |
| --- | --- | --- |
| `PORT` | `5248` | `80` |
| `MIDI_DIR` | Repository `midi/` | `/data/midi` |
| Listen address | `0.0.0.0` | `0.0.0.0` |

The Windows launcher explicitly sets the local defaults. The container needs a persistent mount at `/data/midi`; see [installation](installation.md). There is no server authentication or per-user isolation.

The repository contract is documented in [architecture](../ARCHITECTURE.md#library-repository-contract). Catalog reads return metadata; `getSong` supplies MIDI bytes. Browser fallback uses IndexedDB database `kbits-library`, version 4, with `songs`, `songIndex`, and `playlists` stores. Preferences use localStorage.

Hybrid catalog listing tries the server and falls back to IndexedDB; it does not merge both catalogs. Existing-record operations route by ID: browser records use local IDs (including legacy non-string IDs), while server records use filenames. Creation can fall back to browser storage, but direct `file:` uploads are rejected. Preserve these distinctions in error handling and tests; fallback is not replication.

The filesystem store keeps MIDI files beside version-1 `.kbits-library.json`. Display-name updates modify metadata, not filenames. Catalog writes use a temporary file followed by rename; this does not make multiple HTTP requests or playlist edits a single filesystem transaction. Preserve existing user files and schema compatibility when changing storage.

## Community HTTP API

These routes are local library services provided by the Kbits server. Query values must be URL-encoded.

| Method and route | Purpose |
| --- | --- |
| `GET /api/midi` | List song metadata |
| `GET /api/midi?name=...` | Read MIDI bytes |
| `POST /api/midi?name=...&meta=...` | Upload raw MIDI body; `meta` is JSON metadata |
| `PUT /api/midi?name=...` | Update metadata from a JSON body |
| `DELETE /api/midi?name=...` | Delete song and memberships |
| `GET /api/playlists` | List playlists |
| `POST /api/playlists` | Create using JSON containing `name` |
| `PUT /api/playlists?id=...` | Update playlist from JSON |
| `DELETE /api/playlists?id=...` | Delete playlist, retaining songs |

The request body limit is 50 MiB. See [server](../server.js) and [store](../js/platform/server-library-store.js) for normalization and error handling; new API behavior must keep repository adapters consistent.

## Validation

Syntax-check every JavaScript file you change with `node --check path/to/file.js`. Use the relevant Node tests for behavior changes and `git diff --check` for whitespace. The [quality workflow](../.github/workflows/quality.yml) is the full automated check reference.

To run the complete automated suite, including the isolated browser-fixture server test:

```powershell
node --test tests/*.test.js
```

Tests use Node's built-in runner and injected adapters; no package installation is required. Test observable behavior, timing boundaries, persistence, and error paths. Use temporary data directories for filesystem tests. Do not use the user's live library as test data.

The 2026-09-11 validation passed all 72 tests (71 feature/domain/adapter tests and one fixture integration test) and syntax checks for 50 first-party JavaScript files. Initial module extraction is user accepted. Browser execution awaits a connected browser; physical-phone acceptance remains separate. Docker was unavailable on the validation machine's PATH, so no local container build was verified. The [browser harness](../tests/browser/README.md) records the outstanding matrix; Node results do not establish responsive, audio, PDF, or offline-reload acceptance. Documentation-only edits need link and source checks, not repeated playback testing.

## Extension and release boundaries

Keep scheduling and visual arrival on the same playback clock. Add pure calculations in core, platform access in adapters, and UI behavior in the relevant feature. Preserve per-model tuning, browser fallback storage, and unmapped-note audio preferences. Game mode remains future work. Private libraries must remain under the user's control.

The [container workflow](../.github/workflows/container.yml) publishes AMD64 and ARM64 images. Its configured branch tags are `latest` for `main`, `staff-test` for `experiment/music-staff`, `print-test` for `experiment/print-scores`, and `modularization-test` for `integration/community-modularization`. It also publishes an immutable `sha-<commit>` tag. Version-tag pushes and manual runs can publish too; inspect the workflow before triggering it. A source edit or local commit does not update an image.

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for acceptance and publication. Keep experiments off production tags. Review [third-party notices](../THIRD_PARTY_NOTICES.md) before redistributing sample assets or adding MIDI files.
