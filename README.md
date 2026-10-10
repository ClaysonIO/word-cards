# Word Cards

A very simple spaced-repetition flashcard app for young readers (sight words),
packaged as an Android app with [Capacitor](https://capacitorjs.com).

- Tap **🔊 Hear it** (or the card) to flip it and hear the word read aloud.
- Then tap **😟 Again / 🤔 Hard / 🙂 Good / 🤩 Easy**.
- Words come back on a schedule (simplified Anki/SM-2): "Again" repeats the
  word later in the same session; the others push it out by days.
- A few new words are introduced per day (`NEW_WORDS_PER_DAY`).
- Progress is stored on the device.

## Adding / changing words and colors

Edit **`www/words.js`**. Each set has an `id`, `name`, `color`, `textColor`
and a list of `words`. Commit and push — GitHub Actions builds a new APK.

If the voice says a word oddly, use `{ text: "read", say: "reed" }` instead of
a plain string.

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

Create them once with `scripts/generate-keystore.sh` and keep a backup of the
keystore — losing it means uninstalling the app (and its progress) to update.

## Local development

```sh
npm install
npm run serve        # open http://localhost:8080 in a browser
npm run sync         # copy www/ into the Android project
```
