# Community release preparation

This checklist covers the first public Community release from the accepted modular application. Account setup and publication are separate steps. The existing installation remains on its current image until the new image is verified.

## Prepared locally

- Initial modularization and source API documentation are complete and accepted.
- Desktop browser checks and four viewport sizes passed. Phone touch, timing, and tested controls were accepted, as was the tested print/PDF workflow.
- All 72 automated tests passed again on 2026-09-25.
- The tracked library contains only its README, with no user MIDI files.
- Container build context uses an explicit runtime-file allowlist to exclude local configuration, libraries, and development files.
- MIT code licensing and the separate sound-bank notices remain intact, including the documented Keylimba provenance limitation.

## Complete with the new account

1. Destination confirmed: `animetals/kbits-community`; account connection verified. Confirm public repository/package visibility and initial release version before publication.
2. Use a fresh initial commit, as selected by the owner. Preserve the original development repository separately; publish only the reviewed Community source snapshot.
3. Image references target `ghcr.io/animetals/kbits-community:latest`. The container workflow derives both owner and image name from the destination repository. Verify the image exists and can be pulled before migrating an installation.
4. Pushes to `main` publish `testing` and a SHA tag after validation. After manual acceptance, use the separate stable promotion workflow with the tested commit and a new version number; it reuses the existing image and publishes the numbered tag, `stable`, and `latest`. Create GitHub release notes separately.
5. Configure repository checks and a private security reporting channel; document the verified reporting route in the contribution guide.
6. Review the final source and notices, approve the destination and publication, then push only the intended branch/history. Preserve the old remote and installation until migration is verified.
7. Verify both quality and container workflows, public package access, and an anonymous image pull before announcing availability. Replace private/pre-release wording only when it is accurate.

## Remaining release validation

- Run the [installation verification](installation-validation.md) procedure with disposable data: clean installation, restart persistence, backup/restore, and upgrade/rollback.
- Docker is unavailable in the preparation environment; the revised build context and container image require a build and runtime check on a Docker-capable host or CI.
- The accepted phone test does not establish every device/theme/orientation combination. See [browser evidence](../tests/browser/README.md).

## Initial release notes draft

Kbits Community provides self-hosted MIDI playback with 8-, 17-, 21-, and 34-key kalimba layouts, per-layout tuning, Falling Blocks and Music Staff views, local libraries and playlists, practice loops and speed control, multiple themes and sound banks, and printable scores/PDF output. It requires no cloud account. Game scoring remains future work.

The browser must be able to reach its local server for server-stored songs. Song playback with the network disabled did not pass the phone test and remains deferred. Fully disconnected reload/playback is not a release promise. Browser-only libraries have no complete in-app backup/restore workflow; preserve original MIDI files separately.
