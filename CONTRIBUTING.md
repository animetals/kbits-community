# Contributing to Kbits Community

Thank you for helping improve Kbits. Changes should preserve offline operation, local data ownership, touch usability, and timing accuracy.

Start with the [developer guide](docs/developer.md) for module boundaries, runtime configuration, storage contracts, and test commands. Installation and everyday usage are documented separately in the [user documentation](README.md#start-here).

## Before opening an issue

Include:

- A concise problem or proposed outcome.
- Steps to reproduce, when reporting a bug.
- Expected and actual behavior.
- Browser, operating system, device, layout, tuning, and theme when relevant.
- A small non-copyrighted MIDI sample when the problem depends on a song.
- Acceptance criteria that another person can verify.

Security vulnerabilities and private data must not be posted in public issues. A private reporting channel will be documented before broad public contribution is enabled.

## Branches

- `main`: development changes; publishes `ghcr.io/animetals/kbits-community:testing` after validation. Manually accepted images are promoted to numbered releases, `stable`, and `latest` using the release workflow described in [CONTAINERS.md](CONTAINERS.md).
- `fix/<topic>`: isolated bug fixes.
- `feature/<topic>`: product improvements intended for production.
- `experiment/<topic>`: work requiring separate user testing and, when configured, a non-production container tag.
- `chore/<topic>`: documentation, tooling, or maintenance.

Never use `main` or the `latest` image to test an unfinished experiment.

## Development workflow

1. Reproduce or describe the current behavior.
2. Add regression coverage when practical.
3. Make one focused change.
4. Preserve user files and unrelated work.
5. Validate locally.
6. Ask for local user acceptance before committing, pushing, or publishing a container.
7. Keep the pull request focused and document risks and test evidence.

## Required validation

Run the checks relevant to the change:

```bash
node --check js/app.js
node --check js/core/music-core.js
node --check js/core/library-core.js
node --check js/core/playback-core.js
node --check js/platform/library-repositories.js
node --check js/midi-parser.js
node --check js/staff-view.js
node --check server.js
git diff --check
node --test tests/*.test.js
```

New domain logic should be placed in a core module when it does not require browser APIs. Core modules must be deterministic, accept explicit inputs, and return data instead of modifying the UI. Do not add a build system or runtime dependency merely to create a module.

Also test the affected playback flow manually. Changes to responsive controls or timing should be checked on both desktop and a phone-sized viewport. Container-storage changes must be tested with a mounted temporary data directory.

## Product rules

- Keep configuration in side panels and the main playfield clean.
- Keep audio scheduling and falling-note arrival driven by the same clock.
- Preserve touch behavior and desktop keyboard controls.
- Keep browser-only and container-backed libraries working.
- Do not introduce a required cloud service into Community.
- Treat the licenses in `licenses/` as authoritative for bundled sounds.
- Do not add MIDI files unless their redistribution rights are explicit.

## Scope

Contributions should focus on the self-hosted player, local library, notation, practice tools, and installation experience. Preserve independent operation and local ownership of user data.
