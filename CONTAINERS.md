# Run Kbits in a container

Use Docker Compose or a container manager that supports Linux containers. The public image supports AMD64 and ARM64 and requires no registry login.

## Container settings

| Setting | Value |
| --- | --- |
| Image | `ghcr.io/animetals/kbits-community:latest` |
| Published port | Host `5248` to container `80` (TCP) |
| Persistent storage | A folder on the host mounted at `/data/midi` |
| Restart policy | `unless-stopped` |

Port **5248** spells **KBIT** on a phone keypad: K = 5, B = 2, I = 4, T = 8.

Choose a host folder for the library and make sure the container can write to it. Keep this folder when recreating or upgrading the container.

## Docker Compose

Save the following as `compose.yaml` in a folder for Kbits:

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

Create the `midi` folder beside the file, then run from that directory:

```sh
docker compose up -d
```

Open `http://localhost:5248` on the container host, or `http://HOST-IP:5248` from another device on the same network. Replace `HOST-IP` with the container host's address. If port 5248 is already in use, change the host-side port and use that port in the browser address.

## Library and backups

Uploaded MIDI files are saved in the mounted host folder. MIDI files copied into that folder also appear in Song Library. Editing a song name changes its displayed metadata, not its filename. Deleting a song removes the shared MIDI file and its playlist memberships.

Back up the entire library folder, including hidden `.kbits-library.json`, before upgrades. See [data and restore guidance](docs/data-and-troubleshooting.md). Browser preferences are stored separately on each device. Devices that can reach the server share library editing access; Kbits has no application login. Use it on a trusted local network.

## Update the container

After backing up the library, run from the Compose directory:

```sh
docker compose pull
docker compose up -d
```

Keep the same storage mount so the replacement container uses your existing library. With a graphical container manager, pull the updated image and recreate the container with the same port and storage settings.
