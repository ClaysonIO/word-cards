// Pre-records every word in www/words.js into www/audio/<word>.mp3 so the app
// can play it instantly (no text-to-speech engine start-up on the device).
//
// Uses Piper (https://github.com/rhasspy/piper), an offline neural TTS:
//   pip install piper-tts      (ffmpeg must also be installed)
//   node scripts/generate-audio.mjs
//
// Only missing files are generated, and files for removed words are deleted,
// so it is cheap to run on every build. Set FORCE=1 to re-record everything.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "www", "audio");
const VOICE = "en-us-lessac-medium";
const VOICE_URL = `https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-${VOICE}.tar.gz`;
const VOICE_DIR = process.env.PIPER_VOICE_DIR || join(ROOT, ".cache", "piper-voice");
const LENGTH_SCALE = "1.2";   // > 1 speaks a little slower, for young readers

// Must match audioSlug() in www/app.js.
const audioSlug = (say) => say.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, "www", "words.js"), "utf8"), sandbox);
const says = new Set();
for (const set of sandbox.window.WORD_SETS) {
  for (const w of set.words) says.add(typeof w === "string" ? w : w.say || w.text);
}
const wanted = new Map([...says].map((s) => [audioSlug(s), s]));

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) {
  if (f.endsWith(".mp3") && !wanted.has(f.slice(0, -4))) {
    rmSync(join(OUT, f));
    console.log(`removed ${f}`);
  }
}

const todo = [...wanted].filter(([slug]) => process.env.FORCE || !existsSync(join(OUT, `${slug}.mp3`)));
if (!todo.length) { console.log(`Audio up to date (${wanted.size} words)`); process.exit(0); }

const model = join(VOICE_DIR, `${VOICE}.onnx`);
if (!existsSync(model)) {
  console.log(`Downloading Piper voice ${VOICE}…`);
  mkdirSync(VOICE_DIR, { recursive: true });
  execFileSync("sh", ["-c", `curl -fsSL --retry 3 "${VOICE_URL}" | tar xz -C "${VOICE_DIR}"`], { stdio: "inherit" });
}

const tmp = mkdtempSync(join(tmpdir(), "word-audio-"));
for (const [slug, say] of todo) {
  const wav = join(tmp, `${slug}.wav`);
  execFileSync("python3", ["-m", "piper", "-m", model, "-c", `${model}.json`, "-f", wav,
    "--length-scale", LENGTH_SCALE], { input: say, stdio: ["pipe", "ignore", "inherit"] });
  // Trim silence at both ends so the word starts the moment it is played.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav,
    "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.05",
    "-ac", "1", "-b:a", "48k", join(OUT, `${slug}.mp3`)]);
  console.log(`recorded ${slug}.mp3  ("${say}")`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Done: ${todo.length} new, ${wanted.size} words total`);
