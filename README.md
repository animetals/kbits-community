# Kbits Community

Kbits Community is a self-hosted kalimba MIDI player and practice tool. Run it on Windows with the included launcher or deploy it in a Docker container, then open it in your web browser. Your song library stays in your own storage, and no cloud account is required.

Choose between two play views: **Falling Blocks** and **Music Staff**. The player supports 8-, 17-, 21-, and 34-key layouts, per-layout tuning, practice loops, adjustable playback speed, playlists, printable scores, multiple visual themes, and four kalimba sound banks.

## Start here

- [Windows setup](#run-on-windows): start Kbits with the included batch file.
- [Container setup](#run-with-docker-compose): deploy with Docker Compose.
- [User guide](docs/user-guide.md): upload a song, practice, organize playlists, tune, and print.
- [Data, backups, and troubleshooting](docs/data-and-troubleshooting.md): keep your library safe and resolve common problems.

## Run on Windows

1. Install Node.js 22 or later and make sure the `node` command is available.
2. Download this repository using **Code → Download ZIP**, then extract the entire folder.
3. Double-click `start-kbits.bat` in the extracted folder.
4. The launcher opens `http://localhost:5248` in your browser. If the page opens before the server is ready, refresh it.

Keep the launcher window open while using Kbits. To stop it, press **Ctrl+C** in that window or close it. Your MIDI files, song details, and playlists are saved in the `midi/` folder beside the launcher.

## Run with Docker Compose

You need a container host with Docker Compose. Create a folder for Kbits and save the following as `compose.yaml`:

```yaml
services:
  kbits:
    image: ghcr.io/animetals/kbits-community:latest
    ports:
      - "5248:80"
    volumes:
      - ./midi:/data/midi
    restart: unless-stopped
```

From that folder, start the container:

```bash
docker compose up -d
```

Open `http://localhost:5248` in a browser on the container host. From a phone or another device on the same network, open `http://HOST-IP:5248`, replacing `HOST-IP` with the container host's address.

The image supports AMD64 and ARM64.

## Start playing

1. Open **Song Library** and choose **Upload MIDI**.
2. Select a MIDI file and save its song details.
3. Choose your kalimba model and tuning.
4. In **Player Setup**, choose **Falling Blocks** or **Music Staff**.
5. Play the song. Adjust speed or set a practice loop to work on a section.

## Data ownership

- On Windows, the `midi/` folder beside the launcher holds your MIDI files and library metadata.
- With Docker Compose, the mounted `midi/` folder holds the same data; the container sees it at `/data/midi`.
- Container replacement or upgrades do not remove a correctly mounted library.
- The Community edition does not require an external database, account, analytics service, or Internet connection.

Keep Kbits running and your browser connected to it for playback. Back up the entire `midi/` folder, including the hidden `.kbits-library.json` file, before replacing or upgrading your installation.

## Contributing

For bug reports and contributions, see [CONTRIBUTING.md](CONTRIBUTING.md). Developers can find the architecture and development setup in the [developer guide](docs/developer.md).

## Licensing

Application code is licensed under the [MIT License](LICENSE). Three bundled kalimba banks are public-domain or CC0 assets. The Keylimba bank is attributed to its immediate MIT-licensed upstream repository, which does not separately identify the original sample creator. Origins, modifications, and available notices are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [licenses/SOUNDFONTS.md](licenses/SOUNDFONTS.md).
