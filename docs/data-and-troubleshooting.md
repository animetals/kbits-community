# Data, backups, and troubleshooting

[Home](../README.md) · [Installation](installation.md) · [User guide](user-guide.md)

## Where your data lives

| Data | Location |
| --- | --- |
| Server MIDI files | Host folder mounted at `/data/midi`, or `midi/` when running the local Node server |
| Server song details and playlists | Hidden `.kbits-library.json` in that same folder |
| Browser fallback library | IndexedDB in the browser profile for the site's address |
| Tuning, theme, and player preferences | Local storage in the browser profile for the site's address |

Phones using the same server share the server library. Their preferences remain separate. Changing the hostname, port, or browser profile can make browser data appear missing because it belongs to a different site address.

The server library and browser fallback are separate stores. When the server catalog is unavailable, Kbits can show the browser library; it does not contain an automatic copy of the server's songs. Failed server uploads may be stored in the browser instead. Libraries are not automatically merged or synchronized when the server returns. Requests to change an existing server song still target the server.

Local operation means no Internet dependency during normal use. It does not guarantee that a page or a NAS library remains available after disconnecting from the server. Opening a `file:` page does not support managed uploads.

## Back up and restore

For a server installation, stop Kbits and copy the **entire library folder**, including hidden `.kbits-library.json`, to a separate backup location. Also retain your Compose file or other server configuration. Copying only MIDI files loses saved details and playlist definitions.

To restore, stop Kbits, preserve the current folder separately, and restore the backed-up folder to the configured library location. Start Kbits and check the catalog and playlists. Do not overwrite your only copy while testing a restore. Browser preferences need their own browser-profile backup; the server folder does not include them.

There is no complete in-app browser-library backup and restore workflow. Keep original MIDI files separately and preserve the browser profile if you depend on browser storage. Clearing site data or using a temporary/private profile can remove it.

## Update a Docker installation

Back up first and confirm the Compose volume still points to your existing library folder. From the folder containing your Compose file:

```sh
docker compose pull
docker compose up -d
```

These commands update the configured image tag and recreate the service as needed. They do not bring unpublished local source changes into the image. Keep test installations on their assigned tags and separate data folders. Retain a backup and the previous image reference until you have checked the updated installation.

For a source installation, stop the server, preserve the library folder, update the application files, and restart. Avoid replacing your data with an empty folder from a new checkout.

## Common problems

| Symptom | What to check |
| --- | --- |
| Page will not open | Keep the server running. Use `localhost` on the server itself and its LAN IP from another device. Check port 5248 and local firewall access. |
| Container image cannot be pulled | Confirm access to the private package and the intended tag; this is still a pre-release project. |
| Upload requests the local server | Open the HTTP server address instead of `index.html` directly. |
| MIDI upload is rejected | Use an actual `.mid` or `.midi` file. Renaming an audio file does not convert it. The server request limit is 50 MiB. |
| Songs disappear after changing address | Return to the original address and browser profile, then check server availability and the mounted library folder. |
| Changes appear on another device | Devices share server metadata and playlists. Preferences are browser-local. |
| No sound | Press Play or a tine to activate browser audio; check device output and both Kbits volume controls. |
| Some notes have sound but no falling note | Those pitches may be outside the current model and tuning. Check tuning and the unmapped-note setting. |
| Print preview does not open | Allow the popup from your Kbits address. |
| Playback stops when the phone locks | Keep the browser page active during practice. |

For a reproducible problem, record the browser, device, model, tuning, steps, and expected result. Share a small MIDI only when you have permission to redistribute it. See [contribution guidance](../CONTRIBUTING.md).
