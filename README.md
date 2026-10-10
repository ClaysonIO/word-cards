# Word Cards

<img src="design/icon-512.png" width="96" align="right">

A very simple spaced-repetition flashcard app for young readers (sight words),
packaged as an Android app with [Capacitor](https://capacitorjs.com).

- Hands-free: pick a color, then the child just reads each word out loud.
  The app listens **on the device** (no internet), rates the answer from how
  they read it and moves to the next card by itself:
  - said it within ~2.5 s on the first try → **Easy**
  - within ~6 s, at most one wrong try → **Good**
  - got there eventually / several tries → **Hard**
  - not said within the listening time (15 s by default, set per reader on the home screen) → the word is read aloud → **Again**
- There is just one button under the card: **Don't know**. It reads the word
  aloud and counts as Again.
- **Ember** the fox sits in the bottom-right corner: bouncing excitedly while
  waiting, celebrating and waving when the word is read right, and giving a
  gentle "you'll get it next time" look after Don't know.
- Cards are one-sided (no flipping). 🔊 on the card reads the word aloud
  (counts as help: best rating is Hard). With voice off, a grown-up taps the
  card when the word was read correctly.
- Every word is pre-recorded (see below), so it plays instantly.
- The 🎤 button in the corner turns listening on/off. The home screen shows
  whether voice is ready.
- Progress is stored on the device.

### Kid lock

Tap **🔒 Kid lock** at the bottom of the home screen before handing the phone
to a child. The app uses Android *screen pinning*, so Home, Recents and the
notification shade stop working and the child can't switch apps.

- The first time, you choose a grown-up PIN (4–8 numbers) and Android asks
  "Pin this app?" once.
- To unlock, tap **🔓 Unlock (grown-ups)** on the home screen and enter the PIN.
  **Change PIN** is next to **Reset progress** while the app is unlocked.
  **Reset progress** is hidden while the app is locked.
- Android always keeps its own way out: holding Back + Overview (or swipe up
  and hold with gesture navigation). Turn on **Settings → Security → App
  pinning → Ask for PIN before unpinning** so that way out needs the phone's
  PIN. With that setting on, the phone also locks when you unlock from the app.
- Forgot the PIN? Unpin with the Android gesture, then use **Change PIN**.

### Practice rounds (not "done for the day")

The first round goes through every word in the set. After that each round is
built weakest-word-first: "Again" words come back 3 cards later, "Hard" words
once more later in the round, struggling words appear every round and
well-known words every 2–4 rounds. At the end of a round tap **Keep going**
for another one, or **All the words** for a full pass.

### Speech recognition: why Vosk

Options considered (all must run fully offline, English only):

| Engine | Notes |
| --- | --- |
| **Vosk** (Kaldi) — *chosen* | 40 MB English model, streaming results (needed to time the answer), official Android library, Apache-2.0. Can be **restricted to a word list (grammar)** so it only has to choose between the set's words and "unknown" — the biggest accuracy win for short single words from young children. |
| Whisper tiny.en / whisper.cpp | Most accurate on kids' speech when fine-tuned (e.g. on the MyST children's corpus), but processes whole clips rather than streaming, slower on phones, no ready Android library. Good candidate if Vosk turns out to struggle. |
| sherpa-onnx (zipformer / keyword spotting) | Modern and streaming, has keyword spotting, but integration means vendoring native libs and Kotlin sources. |
| Android `SpeechRecognizer` | Depends on Google's recognizer/offline packs being installed; not guaranteed on-device. |
| Picovoice, SoapBox Labs | Commercial; licence keys / cloud. SoapBox is the only child-specific engine but isn't available for this. |

No openly available on-device model is trained specifically on children's
speech, so the grammar restriction is what makes Vosk work well here.
The model is downloaded at build time by `scripts/fetch-speech-model.sh`.

## Adding / changing words and colors

Edit **`www/words.js`**. Each set has an `id`, `name`, `color`, `textColor`
and a list of `words`. Voice timing thresholds (`VOICE`) and the minimum round
size (`PRACTICE`) are at the bottom of the same file. Commit and push — GitHub Actions builds a new APK.

If the voice says a word oddly, use `{ text: "read", say: "reed" }` instead of
a plain string.

### Word audio

Each word is recorded ahead of time into `www/audio/<word>.mp3` with
[Piper](https://github.com/rhasspy/piper) (offline neural text-to-speech,
voice `en-us-lessac-medium`). The app decodes them all into memory when it
opens, so pressing 🔊 or Don't know plays the word immediately instead of
waiting for the phone's text-to-speech engine. CI records any new words
automatically before building; to do it locally:

```sh
pip install piper-tts    # also needs ffmpeg
npm run audio            # records missing words, deletes unused ones
```

A word without a recording falls back to the phone's text-to-speech.

## Download

Latest APK: `https://github.com/ClaysonIO/simple-spaced-repetition/releases/latest/download/word-cards.apk`

Each build is published as a GitHub Release (`v1.0.<run number>`) with an
increasing version code, so it installs as an update over the previous one.

## Signing key

Android only accepts updates signed with the same key, so the build uses a
fixed key stored in repository secrets
(Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | base64 of the `.jks` file |
| `ANDROID_KEYSTORE_PASSWORD` | keystore/key password |
| `ANDROID_KEY_ALIAS` | optional, defaults to `wordcards` |

Until the secrets exist, CI still builds a test APK (signed with a throwaway
key, downloadable from the workflow run's artifacts) but doesn't publish a
release. Create them once with `scripts/generate-keystore.sh` and keep a backup of the
keystore — losing it means uninstalling the app (and its progress) to update.

## Local development

```sh
npm install
npm run serve        # open http://localhost:8080 in a browser
npm run sync         # copy www/ into the Android project
./scripts/fetch-speech-model.sh   # needed before building the APK locally
```

## License

MIT, see [LICENSE](LICENSE). Bundled third-party parts keep their own licenses: Didact Gothic font (SIL OFL, `www/fonts/`), Vosk speech model and library (Apache 2.0), Capacitor (MIT). The word recordings in `www/audio/` are made with the Piper `lessac` voice, trained on the [Lessac Blizzard 2013 dataset](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html) and covered by its license.
