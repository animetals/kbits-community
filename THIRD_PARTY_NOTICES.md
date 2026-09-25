# Third-party notices

Kbits Community includes selected third-party audio assets. The application source code is licensed separately under the repository's MIT license.

## FreePats Kalimba

The samples embedded in `assets/freepats-kalimba.js` come from the FreePats Kalimba sound bank, version 2019-07-23. The bank was recorded in January 2019 by Xavimart (Javier), Gonzalo, and Roberto using two Zoom H1 portable recorders. Roberto cropped, edited, and processed the raw recordings.

FreePats published the sound bank under the [Creative Commons CC0 1.0 public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/). The source bank and its SFZ mapping are available from the [FreePats Kalimba page](https://freepats.zenvoid.org/Ethnic/kalimba.html).

Kbits includes one recording from each of the source bank's eight pitch regions, embeds the WAV data for offline playback, and applies the tuning offsets specified by the original SFZ mapping during playback. The complete upstream notice is preserved in `licenses/freepats-kalimba-CC0.txt`.

| Kbits asset | Original sample | Pitch center | SFZ tuning |
| --- | --- | ---: | ---: |
| `F3.wav` | `F3_01.wav` | F3 | 0 cents |
| `C4.wav` | `1_01.wav` | C4 | +25 cents |
| `Ds4.wav` | `2_01.wav` | D-sharp 4 | +5 cents |
| `E4.wav` | `3_01.wav` | E4 | -40 cents |
| `G4.wav` | `4_01.wav` | G4 | +7 cents |
| `Gs4.wav` | `5_01.wav` | G-sharp 4 | +17 cents |
| `C5.wav` | `6_01.wav` | C5 | +22 cents |
| `Cs5.wav` | `7_01.wav` | C-sharp 5 | -15 cents |

## Moozica Kalimba

`assets/moozica-kalimba.js` contains the 17 samples from Simone Piervergili's [Moozica Kalimba SoundFont](https://www.musical-artifacts.com/artifacts/2931). The artifact description says he sampled his own acoustic Moozica kalimba with a Samsung Galaxy A52 phone. The SoundFont's embedded metadata identifies Simone Piervergili as its sound designer and engineer and states: `Free to use, public domain.`

Kbits extracted the mono PCM recordings to WAV, embedded them for offline browser playback, and retained their authored MIDI root pitches. The downloaded source file has SHA-256 `acb540ecf1c17b980ee4985df785fd83d1ee109eff88cff04c015853b45f30a6`.

## Vini CC0 Real Kalimba

`assets/vini-kalimba.js` contains the three pitched samples used by the natural preset in Vini's [CC0 Real Kalimba SoundFont](https://www.musical-artifacts.com/artifacts/9028). Its embedded metadata identifies Vini as the sound designer and states `CC0 1.0 Universal`. Vini's [source repository](https://github.com/NeoSoundFonts/vini-kalimba) also describes the bank as sampled by Vini and carries a CC0 1.0 license.

Kbits extracted the preset's mono PCM recordings to WAV, embedded them for offline browser playback, and preserved the source preset's low, middle, and high key regions. The downloaded source file has SHA-256 `41e81b0b8de3a931592e11277043468722a480f62f334c707d38dc0f2bae5b2a`.

## Keylimba

Kbits obtained `assets/keylimba.js` from the MIT-licensed [Dunamis4tw/kalimba-online](https://github.com/Dunamis4tw/kalimba-online) repository. The upstream repository's complete MIT notice is preserved in `licenses/kalimba-online-MIT.txt`. Kbits changed only how the bank is selected and gain-staged alongside the other bundled sounds; Kbits does not claim authorship of its recordings.

The immediate source repository does not separately identify who recorded or created the underlying Keylimba samples or state an audio-specific license. The available attribution is therefore to the upstream repository and its maintainer, Artem; this notice does not claim a more complete provenance chain than the source provides.
