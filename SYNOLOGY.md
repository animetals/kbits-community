# Kbits on Synology Container Manager

The GitHub workflow targets `ghcr.io/animetals/kbits-community:latest` after every push to `main` in the Community repository. The new image must pass publication verification before an existing installation switches to it.

In Synology Container Manager, create a project from `compose.yaml` or create a container with:

- Image: `ghcr.io/animetals/kbits-community:latest`
- Port: NAS `5248` to container `80` (`5248` spells KBIT on a phone keypad)
- Volume: `/volume1/docker/kbits/midi` to container `/data/midi`
- Restart policy: `unless-stopped`

Open `http://YOUR_NAS_IP:5248`.

MIDI files uploaded through Kbits are saved in the mounted Synology folder. MIDI files copied into that folder also appear in the Song Library. Editing a song name changes its displayed metadata, not its filename. Deleting a song removes the shared MIDI file and its playlist memberships.

Back up the entire mounted folder, including hidden `.kbits-library.json`, before upgrades. See [data and restore guidance](docs/data-and-troubleshooting.md). Browser preferences are stored separately on each device. Devices that can reach the server share library editing access; Kbits has no application login.

This project is still in private pre-release development. Use the image tag assigned to your installation; unpublished source changes are not included in `latest`.

For a private GHCR package, add `ghcr.io` as a registry in Container Manager using your GitHub username and a personal access token with `read:packages`. A public package needs no registry credentials.
