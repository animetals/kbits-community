# Browser smoke checks

## Current acceptance summary

The accepted modular application and responsive/runtime fixes are merged into `main` at `84af712`. Desktop workflows and all four viewport sizes passed; tested phone swipe, timing, controls, and print/PDF workflows are accepted. Offline song playback remains deferred at the user's request. Dated entries below are historical evidence; older pending statements do not override later acceptance. The matrix records only the scope actually established, not every possible device combination.

## Dated evidence

User acceptance (2026-09-19): the user confirmed that the PDF saved successfully and its page layout looked correct for the print preview tested above. This verifies that specific PDF workflow; dense/multi-page scores, alternate formats, and physical printing remain separate checks.

Focused alternate-print check (2026-09-20, Chrome): the disposable 34-key Smoke Beta song generated a Standard Score preview with Seeds Pisces · 34 Keys metadata, treble clef, 4/4 time signature, and a mapped note. The preview was visually inspected. This covers one 34-key Standard Score page; dense/multi-page output and Note Names remain unverified.

Note Names print follow-up (2026-09-20, Chrome): the same Smoke Beta fixture generated a Seeds Pisces · 34 Keys preview with one mapped note and rendered note-name labels (including D6, B5, G5, and E5). This verifies the alternate Note Names format for a one-note 34-key page; dense/multi-page output and physical printing remain unverified.

Print acceptance (2026-09-20): the user confirmed the print checks are acceptable. Treat the tested preview and PDF workflow as accepted; no further print validation is required for this test pass.

Phone test acceptance (2026-09-20): the user confirmed the app remains usable with network disabled, touch swipe works, audio and falling-note timing works, and the tested controls/layouts are reachable. Songs do not play while network access is disabled; the user explicitly requested leaving that behavior unchanged for now.

Print follow-up (2026-09-19, Chrome): Song Details -> Print -> Open Print Preview generated a separate numbered-tablature page for the disposable Smoke Alpha fixture, with one mapped note, 17-key layout, difficulty, and measure/page caption. The HTML preview was visually inspected. Clicking Print / Save PDF timed out, and the browser interface did not expose a native print dialog; PDF export and printed pagination remain unverified. This one-note fixture does not validate dense or multi-page scores.

Desktop transport follow-up (2026-09-19 UTC, Chrome): with a disposable 30-second MIDI, verified Play/Pause, five-second forward seeking, Left/Right keyboard seeking, loop markers/enabling (8-13 seconds), double-speed selection, repeated playback within the loop range, and Stop returning to zero while preserving markers. No app console errors were captured. Audio quality and audiovisual alignment were not verified.

Latest Chrome run (2026-09-19 UTC): all six groups passed, including desktop library/playlist workflows, responsive controls at 1280 x 800, 390 x 844, 844 x 390 and 320 x 568, and no captured runtime errors. Local fixes bind the renderer animation callback and Song Details timer to window, use two transport-button rows beside open panels at widths up to 430px, and let Setup grid controls shrink within the panel. The earlier 320px overflow came from transport sizing, not the clipped tine group; subsequent Setup clipping was also fixed. A 320 x 568 visual check confirmed transport reflow and scroll access to Tine Size. Changes await user acceptance; physical-device, audio alignment, offline reload and print output remain pending.

Status (2026-09-11): the user accepted the remaining module extractions and authorized pending tests. All 72 Node tests passed, including the isolated fixture integration test. Browser execution remains pending: the automation session reported no connected browsers. Physical-device checks remain pending separately. The 2026-09-08 run found portrait Setup clipping and narrow-panel transport overflow. A later passing run used temporary CSS fixes that were reverted; it does not establish a passing baseline for the current application.

From the repository root, with Node.js 22 or newer:

```sh
node tests/browser/serve.js
```

Open the printed URL in a desktop browser, click **Run checks**, and keep the tab active until it finishes. Use **Download report** to save the browser version, timestamp, and results. Restart the fixture server after editing source files: it serves a snapshot of the application.

The launcher copies the app into a temporary directory, generates two valid MIDI songs and one ordered playlist, and starts the production server on a free port. It never copies the user's MIDI library. Ctrl+C stops the server and removes its temporary files. A forced process termination may leave that temporary directory behind. Browser preferences from the disposable origin are not removed; every new server uses a newly allocated port.

The runner refuses to enable checks without its generated session marker. Do not copy that marker or use the runner against a personal library. Checks rename fixture metadata and change fixture playlist order.

## Coverage

- Real app startup, script loading, catalog search, categories, Favorites, and custom playlist order.
- Persisting playlist moves through the production HTTP service.
- Song Details draft cancellation, metadata saving, Print options, loading a song, Stop, and Back to Songs.
- Layout and theme switching, scroll access to Setup/Tuning controls, Browse filters and row actions, and Song Details actions.
- Horizontal document overflow, viewport clipping, and covered control centers at 1280×800, 390×844, 844×390, and 320×568.

These checks use DOM events and real iframe layout. CSS animations and transitions are disabled inside the test frame so Chromium's offscreen-frame throttling cannot invalidate settled-layout hit tests; motion must be checked separately in the normal app. They do not provide trusted touch/keyboard input, phone browser chrome, a software keyboard, display cutouts, or mobile performance emulation. Scrollable tables may scroll horizontally inside their container; the page itself must not overflow. The runner captures runtime errors after the frame loads; startup failures are caught by initialization and workflow assertions, not a complete pre-start console trace.

## Acceptance matrix

Record actual browser/device, date, result, and any issue for each row. A passing Node test proves the fixture server works; it does not prove the browser checks passed.

| Check | Desktop | Phone portrait | Phone landscape |
| --- | --- | --- | --- |
| Browser smoke runner | Passed | Passed viewport checks | Passed viewport check |
| Upload, metadata Save/Cancel, Favorites, playlists | Passed harness | Phone workflow accepted; orientation not recorded | Orientation not separately recorded |
| Browse filters, table scroll, ordering, Back to Songs | Passed harness | Phone workflow accepted; orientation not recorded | Orientation not separately recorded |
| Dialog scrolling with software keyboard visible | N/A | Pending physical device | Pending physical device |
| Navigation, themes, all four layouts, tuning | Passed harness | Tested controls accepted; full combination matrix unverified | Full combination matrix unverified |
| Playback, seek, speed, loops, audio/visual alignment | Transport passed; audio alignment not separately recorded | Audio/timing accepted; orientation not recorded | Orientation not separately recorded |
| Touch swipe on/off and manual note input | Mouse/keyboard pending | Swipe accepted; orientation not recorded | Orientation not separately recorded |
| Both play views and all five themes | Pending | Pending physical device | Pending physical device |
| Safe areas, fullscreen, hidden top bar, tine zoom | Pending | Pending physical device | Pending physical device |
| Offline IndexedDB upload and reload persistence | Pending | Pending physical device | Pending physical device |
| Print preview and PDF output | Accepted by user | Accepted by user | Accepted by user |

For offline acceptance, use a separate static-only test origin and generated MIDI files; the smoke server intentionally exercises container storage. Check a full reload with network access disabled after the page is open where the browser supports it, and distinguish cached-page availability from library persistence. Do not mark offline reload support passed solely because IndexedDB retained a song.

## Automated fixture validation

```sh
node --test tests/browser-server.test.js
```

This verifies HTTP startup, served application assets, valid generated MIDI, playlist persistence, and temporary directory cleanup. The normal `node --test tests/*.test.js` command includes it. Browser checks remain a separate run until browser execution is added to the quality pipeline.
