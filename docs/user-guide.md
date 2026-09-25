# Using Kbits

[Home](../README.md) · [Installation](installation.md) · [Data and troubleshooting](data-and-troubleshooting.md)

This guide covers playback, tuning, song libraries, playlists, and printing in Kbits Community. Game scoring is not currently available.

## Load and organize songs

Open the menu and choose Songs. Upload a `.mid` or `.midi` file; Kbits validates it before opening the song editor. Enter a name, artist, category, comma-separated tags, difficulty, and intended Kalimba model as needed, then save. The model in song metadata describes the arrangement; choose your actual playing model separately in Kalimba.

New uploads start outside Favorites. Use the favorite control to include a song. Older songs without a saved favorite preference may appear as favorites by default.

Use Browse to search and filter the catalog. Song Details edits metadata and playlist membership. Select a playlist and Add, or Remove an existing membership; **Save Changes** applies the draft. Cancel or dismiss the dialog to discard it. Changing the display name does not rename the stored MIDI file.

Create playlists from Songs or Browse. Edit Playlist changes the playlist name; Browse manages its song order. Song Details adds and removes membership. Deleting a playlist leaves its songs in the library. The unrestricted Browse catalog's Delete action removes the song itself, including its playlist memberships.

Selecting an individual song loads it for playback. Use Play All, Favorites, or a custom playlist queue when you want automatic advancement between songs.

## Practice controls

| Control | Behavior |
| --- | --- |
| Play / Pause | Start or pause the loaded song |
| Stop | Return to the beginning; retain the current loop markers |
| Space | Toggle playback outside text-entry fields |
| Left / Right arrow | Move back or forward five seconds outside text-entry fields |
| Speed | Choose 0.5×, 0.75×, 1×, 1.25×, 1.5×, or 2× |
| Loop start / end | Set the practice section at the current position |
| Loop toggle | Enable a valid section after both markers are set |

Changing a loop marker disables the loop until you enable it again. Loading another song clears its markers. The falling notes and audio follow the same playback clock.

Play the on-screen tines with a pointer, touch, or their keyboard mappings. Setup controls touch swipe behavior. Manual-tine volume and song volume are separate.

## Instrument, sound, and appearance

Kalimba offers 8-, 17-, 21-, and 34-key models. Open Tuning through Setup to choose a tuning preset or change individual notes. Each model keeps its own saved tuning. Match the on-screen notes to your physical instrument before practicing.

MIDI pitches outside the selected model's tuned notes do not appear as falling notes. They remain audible unless you enable the setting to mute unmapped notes. Changing tuning changes which pitches can be displayed; it does not rearrange the MIDI into a new composition.

The sound selector offers the bundled Keylimba, FreePats, Moozica, and Vini banks. See [sound credits](../licenses/SOUNDFONTS.md) for their individual licenses. Theme changes the visual palette. Setup also controls tine labels, stickers, zoom, falling-note appearance, and the play view. These preferences belong to the current browser, not the shared library.

The Music Staff view shows the song as scrolling notation. Tapping a staff note previews it; it does not seek playback. Its notation is a practice aid, not a full notation editor.

## Print an arrangement

Open Print from Song Details. Choose numbered notes, note names, or standard notation; select the print model, paper size (Letter or A4), and orientation. The print model uses its own saved tuning and can differ from the active player model.

Printing can use the editor's current name, artist, and difficulty draft without saving it. Only pitches mapped to the selected print tuning are included. MIDI-derived notation is simplified and does not reconstruct all written-score details such as rests or dynamics.

Kbits opens a separate preview window for browser printing or saving as PDF. Allow that window if your browser blocks it.

## On a phone

Open the same server address on your phone while connected to its network. Choose the instrument and tuning, then use the menu to adjust labels or tine zoom. Hide panels and bars when you need more playing space. Keep the page in the foreground during practice; device sleep or browser background suspension can interrupt playback. Tested small-screen controls, swipe input, and audio/visual timing have been accepted. Keep the phone connected to the server's network for server-stored songs.
