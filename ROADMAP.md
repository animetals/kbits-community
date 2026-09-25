# Kbits roadmap

This roadmap describes product outcomes rather than fixed delivery dates. Work is promoted only after local validation and user acceptance.

## Product boundaries

### Kbits Community

This repository remains the installable, offline-first application. It owns the player, local song library, container image, local preferences, and local game sessions.

The application must remain independently usable without a cloud account. Private local libraries must remain under the user's control.

## Priority 1: Complete Community modularization

Initial modularization is complete and accepted. The active work is preparing the first public Community release; see the [release checklist](docs/release-checklist.md).

Current status:

- **Complete:** initial music/layout/tuning core, MIDI validation core, library domain core, playback clock/scheduler core, browser/container library repositories, browser Web Audio adapter, player controller, Kalimba view/input controller, server library store, theme controller, tuning controller, compact song-library view controller, and playlist editor controller. The redesigned Song Details playlist workflow is locally accepted.
- **Protected:** 72 passing automated tests, including the browser-fixture server integration test, and a validation-only GitHub workflow. Browser UI execution is a separate check.
- **Locally accepted:** Browse coordination extracted from `js/app.js` into its own controller, preserving filters, navigation, row actions, and playlist ordering.
- **Validation update (2026-09-25):** all 72 Node tests passed again. Desktop workflows and four responsive viewport sizes passed browser checks; tested phone touch, timing, controls, and print/PDF workflows are accepted. Clean installation, backup/restore, and container upgrade verification remain open. Docker is unavailable locally.
- **Locally accepted:** print-preview coordination and application navigation controllers.
- **User accepted (2026-09-11):** Song Details/upload controller and settings/preferences controller, including legacy preference restoration and existing input/rendering callbacks.
- **User accepted (2026-09-11):** playfield renderer, including canvas sizing, falling-note sprites, staff delegation/input previews, and throttled progress painting.
- **User accepted (2026-09-11):** transport controller, including buttons, speed menu, loop controls, and keyboard shortcuts.
- **User accepted (2026-09-11):** library coordination, including catalog refresh, favorites, playlist selection, and explicit playback queues.
- **Extraction review:** planned initial module boundaries are in place. `app.js` retains controller construction, shared instrument/player state, repository forwarding, and cross-feature load/audio callbacks.
- **Current:** initial module extraction, documentation writing, and source API review are complete. The accepted modular application is merged into `main`. Release preparation targets a new GitHub account; owner, repository name, and publication settings will be finalized with that account.

## Priority 2: Community documentation

Documentation becomes the active priority after Community modularization. Responsive acceptance and UI fixes follow documentation. It will serve two distinct audiences:

1. **End-user documentation (primary):** installation, first use, MIDI library management, favorites, playlists, Browse, player controls, Kalimba models, tuning, sounds, themes, staff view, printing, phone use, persistence, backup, upgrades, and troubleshooting. It must assume no software-development experience.
2. **Developer documentation:** architecture, module boundaries, environment contracts, repository workflow, coding conventions, module-header and JSDoc standards, tests, container internals, storage behavior, contribution flow, and safe extension points.

The root `README.md` remains end-user-first. It should explain what Kbits is, provide the shortest supported installation path, and route technical contributors to the developer documentation and `CONTRIBUTING.md`. Developer details must not overwhelm the primary user path.

Documentation work should establish a navigable structure first, then document accepted behavior from the application and tests. Before public release, verify every instruction against a clean installation and supported phone/desktop workflows.

The planned documentation writing and source API review are complete as of 2026-09-11. The guides cover installation, player/library workflows, backups, updates, troubleshooting, architecture, runtime/storage/API contracts, tests and contribution paths. JSDoc covers core exports, platform and feature factories, helper exports, parsing and specialized views, including units, mutation, asynchronous behavior and failure limits. The [installation verification procedure](docs/installation-validation.md) covers fresh setup, persistence, restore and upgrades. Execution of clean-installation, container and device checks remains pending validation, not unfinished documentation writing.

## Stage 1: Community foundation

- Document container installation, persistence, backup, and upgrades.
- Add contribution, issue, pull-request, security, and release conventions.
- Add automated JavaScript, server, and container validation.
- Establish versioned data migrations and backup/restore behavior.
- Review public-repository licensing and remove local-only development artifacts from releases.

Exit criteria: a new user can install Kbits with Docker Compose, retain data across an upgrade, and understand how to report or contribute a change.

## Stage 2: Tested modular core

- Extract layouts, tuning, note mapping, playback clock, scheduler, and song validation from the application controller. **Initial extraction complete.**
- Define a storage interface with browser and container implementations.
- Add unit tests for pure music logic and server storage.
- Add browser smoke tests for desktop and phone layouts.
- Allow users to create a new playlist directly from Browse, then immediately assign songs and manage their playback order without leaving the catalog. **Implemented and accepted.**
- Complete responsive support for small phone screens, including Browse, song details, playlist controls, dialogs, navigation, the note highway, and the player transport in portrait and landscape orientations.
- Keep every primary action reachable with touch, account for device safe areas, and prevent horizontal page overflow at supported phone widths.
- Keep audio scheduling and visual arrival on one playback clock.

Exit criteria: core behavior can be changed with automated regression coverage, the UI no longer owns music-domain logic, playlists can be created without leaving Browse, and all primary Community workflows remain usable on supported small-screen phones.

## Stage 3: Screen game mode

The initial game accepts input only from on-screen tines, computer keyboard, and mouse. Microphone detection, Web MIDI, MIDI ports, and external controllers are outside the current scope.

- Create expected-note, input-event, note-matching, scoring, combo, and game-session modules.
- Use the existing playback clock for both expected notes and player input.
- Add Practice and Performance modes.
- Report timing accuracy, missed notes, extra notes, score, and personal best.
- Store sessions locally without requiring an account.
- Make timing windows configurable and test them with a simulated clock.

Exit criteria: the same song produces deterministic scoring across touch, mouse, and keyboard, and gameplay remains responsive on supported mobile browsers.
