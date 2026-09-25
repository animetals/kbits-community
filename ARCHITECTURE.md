# Kbits product architecture

## Application scope

Kbits Community is a self-hosted application with browser-based playback and a local MIDI library. It runs through the Windows launcher or in a container and requires no cloud account or external database.

The browser owns audio, notation, input, and preferences. The local server serves application files and stores MIDI files, metadata, and playlists. Browser-only storage uses IndexedDB through the same library repository contract.

## Required contracts

The current code should evolve toward four explicit boundaries:

1. **Music core:** layouts, tuning, parsed MIDI events, validation, and note mapping.
2. **Playback core:** clock, scheduler, transport, and view-neutral playback events.
3. **Game core:** expected notes, normalized screen input, note matching, and scoring.
4. **Library adapter:** list, read, create, update, and delete operations independent of IndexedDB or server filesystem storage.

## Current module map

| Module | Responsibility | Environment |
| --- | --- | --- |
| `js/core/music-core.js` | Layout definitions, tuning transforms, note naming, numbered notation, and lane lookup | Browser and Node.js |
| `js/core/library-core.js` | Song/playlist normalization, search predicates, catalog categories, ordered membership, migration, and queue selection | Browser and Node.js |
| `js/core/playback-core.js` | Clock-derived position, seek bounds, note lookup, loop validation, and deterministic scheduler batches | Browser and Node.js |
| `js/core/midi-validation-core.js` | Binary normalization and parsed-song validation around the Standard MIDI parser | Browser and Node.js |
| `js/platform/library-repositories.js` | IndexedDB and Community container repository adapters plus offline routing | Browser, with routing tests in Node.js |
| `js/platform/audio-engine.js` | Web Audio context, output graph, sound banks, sample decoding, synthesis fallback, and active voices | Browser, with pure selection/rate tests in Node.js |
| `js/platform/server-library-store.js` | Container filesystem MIDI/catalog persistence, metadata normalization, and playlist storage | Node.js container |
| `js/features/player-controller.js` | Transport lifecycle, audio-clock scheduling, loop restart, seek, speed changes, and timed tine-hit events | Browser and Node.js with injected adapters |
| `js/features/transport-controller.js` | Transport buttons, speed menu, practice-loop controls, and keyboard bindings | Browser with injected player and state |
| `js/features/library-controller.js` | Catalog refresh, playlist selectors, favorites, explicit playback queues, and library actions | Browser with injected repositories, views, and playback callbacks |
| `js/features/kalimba-controller.js` | Tine rendering, tuned-note highlighting, keyboard mapping, and pointer/swipe input coordination | Browser and Node.js with injected DOM adapters |
| `js/features/theme-controller.js` | Theme selection, persistence, DOM application, and per-tine palette expansion | Browser and Node.js with injected DOM/storage adapters |
| `js/features/tuning-controller.js` | Per-layout tuning controls, presets, and sound selection | Browser with injected state and audio callbacks |
| `js/features/song-library-controller.js` | Compact song-library view and row actions | Browser with injected library callbacks |
| `js/features/playlist-editor-controller.js` | Playlist rename dialog, preserving ordered membership | Browser with injected persistence callbacks |
| `js/features/browse-controller.js` | Catalog filtering, Browse navigation, row actions, and playlist ordering | Browser with injected library callbacks |
| `js/features/print-controller.js` | Print options, editor draft selection, saved print tuning, and preview coordination | Browser with injected storage, parser, and renderer |
| `js/features/song-editor-controller.js` | Validated uploads, metadata editing, playlist drafts, Save/Cancel, and application refresh coordination | Browser with injected file reader, repositories, and playback/print callbacks |
| `js/features/navigation-controller.js` | Menu and side-panel visibility, saved top-bar visibility, and fullscreen controls | Browser with injected feature refresh and resize callbacks |
| `js/features/settings-controller.js` | Saved player preferences, legacy defaults, labels, stickers, and settings controls | Browser with injected audio, pointer, and rendering callbacks |
| `js/features/playfield-renderer.js` | Canvas sizing, falling-note geometry/sprite caching, staff delegation, note previews, and progress painting | Browser with injected playback clock and canvas adapters |
| `js/midi-parser.js` | Standard MIDI parsing and playback-ready note events | Browser and Node.js |
| `js/staff-view.js` | Music-staff rendering and note hit testing | Browser |
| `js/print-view.js` | Printable notation and preview document rendering | Browser |
| `js/app.js` | Application composition root, shared instrument/player state, and cross-feature load/audio callbacks | Browser |
| `server.js` | Static Community server and HTTP routing over the filesystem library store | Node.js container |

Core modules must remain free of DOM, Web Audio, `localStorage`, IndexedDB, and network access. A core module should accept data and return data so it can be reused and tested in Node.js. Browser adapters own browser APIs; the application composition root connects those adapters to the core.

Core modules use a small universal wrapper so the same source exposes a browser global and `module.exports` under Node.js. Kbits still has no build step or runtime package dependency.

### Library repository contract

Library storage adapters must provide these asynchronous operations while returning normalized domain records:

```js
{
  listSongs(),
  getSong(id),
  createSong(metadata, midiData),
  updateSong(id, changes),
  deleteSong(id),
  listPlaylists(),
  createPlaylist(name),
  updatePlaylist(id, changes),
  deletePlaylist(id)
}
```

Catalog listings use lightweight metadata records. `getSong(id)` resolves to a record containing `data` (an ArrayBuffer); the container adapter returns only that field, while IndexedDB can also return stored metadata. Callers must not require metadata from `getSong`. Create/update operations resolve to stored records; delete operations signal completion, and callers must not depend on a return value. Failures reject promises. These operations are not one transaction across songs and playlists.

Song records contain `id`, `fileName`, display `name`, `artist`, `category`, `tags`, `difficulty`, `layout`, `favorite`, `playlistIds`, `added` (epoch milliseconds), and catalog `size` (bytes). Update responses need not contain size. Playlist `songIds` define ordered membership; legacy per-song membership is normalized when reading the library. Browser and container IDs are not interchangeable: the hybrid adapter routes non-string and `local-` IDs locally, other strings to the container. Listing falls back without merging stores. Network, IndexedDB, and filesystem concerns must not enter `library-core.js`.

### Extraction sequence

1. Music core: layouts, tuning, note labels, mapping, and MIDI validation. **Initial extraction complete.**
2. Library domain: metadata normalization, search, playlist ordering, and repository contract. **Initial extraction complete.**
3. Playback core: transport state, loop boundaries, event selection, and clock contract. **Initial extraction complete.**
4. Platform adapters: IndexedDB/container HTTP library repositories, container filesystem storage, and Web Audio engine. **Initial extraction complete.**
5. Player feature: transport lifecycle and view-neutral scheduling coordination. **Initial extraction complete.**
6. Kalimba feature: tine rendering plus touch, mouse, and keyboard input coordination. **Initial extraction complete.**
7. Theme feature: selection, persistence, and display palette coordination. **Initial extraction complete.**
8. Remaining existing features: tuning, song library, playlist editor, Browse, printing, navigation, song editing, settings, playfield rendering, transport controls, and library coordination. **Initial extraction complete and user accepted as of 2026-09-11.** Browser/device validation remains separate.
9. Documentation: user workflows and separate developer contracts. **Current priority.** See the [developer guide](docs/developer.md).
10. Game core: normalized screen input, expected notes, matching, scoring, and sessions. **Future work.**

Each extraction must preserve existing behavior, add tests before expanding its responsibilities, and avoid combining architectural movement with unrelated UI changes.

Normalized game input should be source-neutral even though the supported sources are currently limited to touch, mouse, and keyboard:

```js
{
  note: 60,
  timestamp: 12450.5,
  source: "touch"
}
```

## Non-negotiable properties

- Community remains functional without Internet access or an account.
- User MIDI files and metadata survive container replacement.
- No private library is uploaded without an explicit user action.
- Audio, visuals, and game scoring use the same playback clock.
- Unmapped MIDI notes remain audible according to the user's existing preference.
