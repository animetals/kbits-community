# Install Kbits Community

[Home](../README.md) · [User guide](user-guide.md) · [Data and troubleshooting](data-and-troubleshooting.md)

Kbits runs a small local server. Open its address in a browser to use the player. No account or external database is needed for playback. Installation and downloading updates require access to the source or container image; the project is still in private pre-release development.

## Docker Compose

With Docker and its Compose command installed:

1. Create a folder for Kbits and put the project's [compose.yaml](../compose.yaml) in it.
2. Create a `midi` folder beside that file. This is your persistent library.
3. Open a terminal in the folder containing `compose.yaml` and run:

```sh
docker compose up -d
```

Open `http://localhost:5248` on that computer. On another device on the same network, use `http://YOUR_SERVER_IP:5248`. Keep the server running while using Kbits. The image build targets AMD64 and ARM64.

The supplied configuration targets `ghcr.io/animetals/kbits-community:latest`. This new image is awaiting first publication and verification; existing installations should keep their current image until migration is announced. A private image requires registry access. An integration or experimental image can differ from `latest`; use the exact image tag supplied for your test installation. See [Synology instructions](../SYNOLOGY.md) for NAS configuration.

## Run from source on a computer

Use Node.js 22 or later and a complete copy of the project. No package installation or build step is needed. Open a terminal in the project folder:

```sh
node server.js
```

Leave that terminal running, then open `http://localhost:5248`. Press Ctrl+C in the terminal when you want to stop the server. On Windows, you can instead double-click `start-kbits.bat`; it starts the server and opens the browser. If the browser opens before the server is ready, refresh the page.

Uploaded songs go into the project's `midi` folder. Keep this folder when replacing your source copy. Opening `index.html` directly is not a supported managed-library installation.

## First song

Open Songs, upload a `.mid` or `.midi` file, fill in its details, and save. Select the song and press Play. Choose your instrument in Kalimba and adjust tuning through Setup. See the [user guide](user-guide.md) for unmapped notes and practice controls.

The server has no application login or per-user permissions. Devices that can reach it share library editing and deletion access. Use it on a trusted local network.

Maintainers can use the [installation verification procedure](installation-validation.md) to check a fresh installation, persistence, restore and upgrades. These checks are recorded separately from the written instructions.
