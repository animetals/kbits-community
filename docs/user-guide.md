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

## Player Setup

Open the menu and choose **Setup**. Changes take effect immediately and are saved automatically in the current browser; there is no Save button. Another browser, device, or server address can have different settings, even when it uses the same song library. Clearing browser site data can remove these preferences.

### Sound and volume

| Control | What it does |
| --- | --- |
| **Open Sound & Tuning** | Opens the sound-bank selector, tuning presets, and individual tine adjustments described below. Use **Back to Setup** to return. |
| **Tine Play Volume** | Sets the volume of notes you play manually, including tuning previews, from 0% to 100%. It does not change the song playback volume. |
| **Song / Note Volume** | Sets the volume of MIDI playback from 0% to 100%. Lower it to hear your own playing more clearly while following a song. |

### Play view and note appearance

| Control | What it does |
| --- | --- |
| **Play View: Falling Blocks** | Shows upcoming notes moving down toward their matching tines. Play the note when it reaches the tine. |
| **Play View: Music Staff** | Shows scrolling music notation moving toward a play line. Tapping a staff note previews its pitch without seeking or changing playback. |
| **Note Preview** | Chooses how far ahead notes are shown, from **2 to 10 seconds**. A longer preview lets you see more of what is coming; a shorter preview focuses on the next few notes. This changes the visual preview, not the song's playback speed. |
| **Falling Note Style: Color Block** | Displays notes as colored blocks. |
| **Falling Note Style: Color Note** | Displays colored note names for the currently tuned pitches. |
| **Falling Note Style: Color Number** | Displays colored numbered kalimba notation for the currently tuned pitches. |

**Falling Note Style** is available only in Falling Blocks view and is hidden in Music Staff view. It changes the falling notes, independently of the labels on the tines.

### Tine labels

These checkboxes can be combined independently:

| Control | What it does |
| --- | --- |
| **Number** | Shows numbered kalimba notation on each tine. Higher-octave notes use octave marks. |
| **Note Name** | Shows the tuned note name, such as C or F♯, on each tine. Tine labels omit the octave number; Sound & Tuning shows the full pitch, such as C4. |
| **Keyboard Key** | Shows the computer key assigned to a tine. The 34-key model has no computer-keyboard mapping, so this option does not add key assignments to that model. |
| **Color Stickers** | Shows small color markers on the tines to help match them to the falling-note colors. Sticker colors follow the selected theme. |

### Touch, MIDI playback, and tine size

| Control | What it does |
| --- | --- |
| **Tine Swipe** | When enabled, sliding a finger across the tines plays each tine you pass over. When disabled, a touch plays only the first tine; lift your finger before playing another. This setting affects touch input; mouse dragging remains available. |
| **Mute Notes Outside Layout** | Silences MIDI notes that do not exactly match a pitch in your selected model and tuning. When unchecked, those notes remain audible even though they are not drawn in either play view. It does not change or delete notes in the MIDI file. |
| **Tine Size** | Scales the on-screen tines. Choose **60%, 75%, 90%, 100%, 110%, 125%, or 140%**; 100% is the standard size. Use smaller tines to fit the display or larger tines for easier touch input. This does not change pitches, the model's key count, or playback speed. |

### Sound & Tuning

Choose the instrument model from **Menu → Kalimba** before adjusting its tuning. Each model keeps its own tuning settings.

| Control | What it does |
| --- | --- |
| **Sound** | Chooses the sample bank used for manual playing and MIDI playback: **Keylimba Samples**, **FreePats · Softened**, **Moozica Kalimba**, or **Vini · CC0 Real Kalimba**. Changing the bank changes the sound character, not the tuning. |
| **C, C♯, B, D presets** | Applies a tuning to every tine relative to the model's standard C layout: C restores the standard pitches, C♯ raises them one semitone, B lowers them one semitone, and D raises them two semitones. A preset replaces individual adjustments for the active model. |
| **Individual tine selector** | Adjusts one tine from **−12 to +12 semitones** relative to its standard pitch. Each choice shows the offset and resulting note. One semitone is one piano-key step, including black keys; 12 semitones is one octave. Changing a tine also previews its new pitch. |
| **Hear** | Plays a preview of that tine and briefly highlights its position on the instrument. Use Tine Play Volume to adjust the preview level. |
| **Reset Standard C** | Removes custom tuning offsets for the active model and restores its standard pitches. Other models retain their saved tuning. |
| **Back to Setup** | Returns to Player Setup. Changes are already saved automatically. |

Single-row models list tines from left to right. The 34-key model separates the upper bass/chromatic row from the lower diatonic row. Match each displayed pitch to your physical instrument; changing settings cannot retune a physical kalimba.

Only exact matches between a MIDI pitch and the active tuning appear in the play view. Tuning changes that mapping; it does not transpose or rewrite the song. Use **Mute Notes Outside Layout** to choose whether unmatched notes remain audible.

## Print an arrangement

Open Print from Song Details. Choose numbered notes, note names, or standard notation; select the print model, paper size (Letter or A4), and orientation. The print model uses its own saved tuning and can differ from the active player model.

Printing can use the editor's current name, artist, and difficulty draft without saving it. Only pitches mapped to the selected print tuning are included. MIDI-derived notation is simplified and does not reconstruct all written-score details such as rests or dynamics.

Kbits opens a separate preview window for browser printing or saving as PDF. Allow that window if your browser blocks it.

## On a phone

Open the same server address on your phone while connected to its network. Choose the instrument and tuning, then use the menu to adjust labels or tine zoom. Hide panels and bars when you need more playing space. Keep the page in the foreground during practice; device sleep or browser background suspension can interrupt playback. Tested small-screen controls, swipe input, and audio/visual timing have been accepted. Keep the phone connected to the server's network for server-stored songs.
