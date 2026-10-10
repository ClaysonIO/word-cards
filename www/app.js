(() => {
  "use strict";

  const STORE_KEY = "wordcards.v2";
  const PRACTICE = Object.assign({ minRoundSize: 8 }, window.PRACTICE);
  const VOICE = Object.assign({ easySeconds: 2.5, goodSeconds: 6, giveUpSeconds: 15 }, window.VOICE);
  const MAX_BOX = 5;

  // ---------- Profiles ----------
  // Each reader has their own progress. The first profile keeps the original
  // storage key, so progress saved before profiles existed carries over.
  const PROFILES_KEY = "wordcards.profiles";
  const progressKey = (id) => (id === "p0" ? STORE_KEY : `${STORE_KEY}.${id}`);
  const profiles = (() => {
    try {
      const p = JSON.parse(localStorage.getItem(PROFILES_KEY));
      if (p && p.list && p.list.length) {
        if (!p.list.some((x) => x.id === p.current)) p.current = p.list[0].id;
        return p;
      }
    } catch (_) { /* ignore */ }
    return { list: [{ id: "p0", name: "Reader 1" }], current: "p0" };
  })();
  const saveProfiles = () => { try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch (_) { /* ignore */ } };
  const currentProfile = () => profiles.list.find((x) => x.id === profiles.current);
  // How long to listen for each word before treating it as "Don't know".
  // Each profile can set its own; VOICE.giveUpSeconds is the default.
  const TIMER_RANGE = [5, 60];
  const listenSeconds = () => currentProfile().listenSeconds || VOICE.giveUpSeconds;

  // ---------- Storage ----------
  // Progress of the current profile:
  // state = {
  //   cards:  { "<setId>:<word>": { box 0-5, lapses, seen, skipped, last } },
  //   rounds: { "<setId>": { queue: [{ w: "make", again: 0, hard: 0 }], total } },
  //   turn:   number of cards shown so far (used for "last seen")
  // }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(progressKey(profiles.current)));
      if (s && s.cards) return { cards: s.cards, rounds: s.rounds || {}, turn: s.turn || 0 };
    } catch (_) { /* ignore */ }
    return { cards: {}, rounds: {}, turn: 0 };
  }
  function save() {
    try { localStorage.setItem(progressKey(profiles.current), JSON.stringify(state)); } catch (_) { /* ignore */ }
  }
  let state = load();

  const settings = (() => {
    try { return JSON.parse(localStorage.getItem("wordcards.settings")) || {}; } catch (_) { return {}; }
  })();
  const saveSettings = () => { try { localStorage.setItem("wordcards.settings", JSON.stringify(settings)); } catch (_) { /* ignore */ } };

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  // A word can be "make" or { text: "read", say: "reed" } to fix pronunciation.
  const wordText = (w) => (typeof w === "string" ? w : w.text);
  const wordSay = (w) => (typeof w === "string" ? w : w.say || w.text);
  const cardId = (set, text) => `${set.id}:${text}`;
  const findWord = (set, text) => set.words.find((w) => wordText(w) === text);
  const card = (set, text) => state.cards[cardId(set, text)];

  // ---------- Rounds (continuous practice, weakest words first) ----------
  // How often a known word shows up: box 0-2 every round, box 3 every 2nd,
  // box 4 every 3rd, box 5 every 4th round.
  const roundsBetween = (box) => Math.max(1, box - 1);

  function weakness(set, text) {
    const c = card(set, text);
    if (!c) return [-1, 0, 0];                  // never seen: weakest
    return [c.box, -c.lapses, c.last];
  }
  function byWeakness(set) {
    return (a, b) => {
      const x = weakness(set, a), y = weakness(set, b);
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    };
  }

  function buildRound(set, allWords) {
    const texts = set.words.map(wordText);
    const unseen = texts.filter((t) => !card(set, t));
    let picked;
    if (allWords || unseen.length === texts.length) {
      // Whole set: the very first round in list order, later ones weakest first.
      picked = unseen.length === texts.length ? texts : [...texts].sort(byWeakness(set));
    } else {
      const sorted = [...texts].sort(byWeakness(set));
      picked = sorted.filter((t) => {
        const c = card(set, t);
        return !c || c.box <= 2 || (c.skipped || 0) + 1 >= roundsBetween(c.box);
      });
      for (const t of sorted) {
        if (picked.length >= Math.min(PRACTICE.minRoundSize, texts.length)) break;
        if (!picked.includes(t)) picked.push(t);
      }
      picked.sort(byWeakness(set));
    }
    for (const t of texts) {
      const c = card(set, t);
      if (c) c.skipped = picked.includes(t) ? 0 : (c.skipped || 0) + 1;
    }
    state.rounds[set.id] = { queue: picked.map((w) => ({ w, again: 0, hard: 0 })), total: picked.length };
    save();
    return state.rounds[set.id];
  }

  function currentRound(set) {
    const r = state.rounds[set.id];
    if (!r) return null;
    // Drop words that were removed from words.js.
    r.queue = r.queue.filter((q) => findWord(set, q.w) !== undefined);
    return r.queue.length ? r : null;
  }

  function rateCard(set, text, rating) {
    const id = cardId(set, text);
    const c = state.cards[id] || { box: 0, lapses: 0, seen: 0, skipped: 0, last: 0 };
    c.seen++;
    c.last = ++state.turn;
    if (rating === "again") { c.box = 0; c.lapses++; }
    else if (rating === "hard") { c.box = Math.max(1, Math.min(c.box, 2)); }
    else if (rating === "good") { c.box = Math.min(MAX_BOX, c.box + 1); }
    else if (rating === "easy") { c.box = Math.min(MAX_BOX, c.box + 2); }
    state.cards[id] = c;
  }

  // ---------- Saying words ----------
  // Every word is pre-recorded into www/audio/ (scripts/generate-audio.mjs) and
  // decoded into memory up front, so it plays the instant it is needed.
  // Text to speech is only a fallback for a word without a recording.
  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = (name) => (isNative && Cap.registerPlugin ? Cap.registerPlugin(name) : null);
  const nativeTTS = plugin("TextToSpeech");

  // Must match audioSlug() in scripts/generate-audio.mjs.
  const audioSlug = (say) => say.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  const clips = new Map();     // slug -> Promise<AudioBuffer|null>
  const decoded = new Map();   // slug -> AudioBuffer
  let playing = null;

  function audio() {
    if (!audioCtx && AudioCtx) audioCtx = new AudioCtx();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function loadClip(say) {
    const slug = audioSlug(say);
    if (!clips.has(slug)) {
      const ctx = audio();
      clips.set(slug, !ctx ? Promise.resolve(null) : fetch(`audio/${slug}.mp3`)
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((data) => new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail)))
        .then((buf) => { decoded.set(slug, buf); return buf; })
        .catch(() => null));
    }
    return clips.get(slug);
  }
  const preloadSet = (set) => set.words.forEach((w) => loadClip(wordSay(w)));

  function stopSpeaking() {
    if (playing) { try { playing.stop(); } catch (_) { /* ignore */ } playing = null; }
    try {
      if (nativeTTS) nativeTTS.stop().catch(() => {});
      else if ("speechSynthesis" in window) speechSynthesis.cancel();
    } catch (_) { /* ignore */ }
  }

  // Resolves when the word has finished playing.
  async function speak(text) {
    stopSpeaking();
    const buf = decoded.get(audioSlug(text)) || await loadClip(text);
    if (buf) {
      const ctx = audio();
      await new Promise((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.onended = resolve;
        playing = src;
        src.start();
        setTimeout(resolve, buf.duration * 1000 + 500);
      });
      return;
    }
    try {
      if (nativeTTS) {
        await nativeTTS.stop().catch(() => {});
        await nativeTTS.speak({ text, lang: "en-US", rate: 0.8, pitch: 1.0, volume: 1.0, category: "playback" });
        return;
      }
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        await new Promise((resolve) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "en-US";
          u.rate = 0.8;
          u.onend = u.onerror = resolve;
          speechSynthesis.speak(u);
          setTimeout(resolve, 3000);
        });
      }
    } catch (e) { console.warn("TTS failed", e); }
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Voice recognition (on-device Vosk, Android only) ----------
  const Listener = plugin("WordListener");
  const voice = { ready: false, denied: false, status: Listener ? "Voice: loading…" : "Voice: only in the Android app" };

  function voiceOn() {
    return !!(Listener && voice.ready && !voice.denied && settings.voice !== false);
  }
  function setVoiceStatus(text) {
    voice.status = text;
    $("voiceStatus").textContent = text;
  }

  if (Listener) {
    // Load the model after the first screen is drawn so the app opens instantly.
    setTimeout(() => {
      Listener.prepare()
        .then(() => {
          voice.ready = true;
          setVoiceStatus("Voice: ready 🎤");
          updateMicToggle();
          listen();
        })
        .catch((e) => setVoiceStatus("Voice unavailable: " + (e && e.message)));
    }, 50);
    Listener.addListener("partial", (e) => onHeard(e.text, false));
    Listener.addListener("result", (e) => onHeard(e.text, true));
    Listener.addListener("error", (e) => setVoiceStatus("Voice error: " + e.message));
  }

  // ---------- Ember the fox ----------
  // "wait" (excited, waiting for the word), "happy" (got it) or "sad" (didn't know it).
  // No speech bubble: the kids can't read it yet, so Ember only acts it out.
  function ember(mood) {
    const el = $("ember");
    el.classList.remove("wait", "happy", "sad");
    void el.offsetWidth;                         // restart the animations
    el.classList.add(mood);
  }

  // ---------- Study session ----------
  // One card at a time. The child just reads; the app listens, rates and moves on.
  // A card "turn" = { item, limit (ms), t0, elapsed, hit, misses, helped, timer, raf, done, listening }
  let session = null;   // { set, round }
  let turn = null;

  function start(set, allWords) {
    const round = (!allWords && currentRound(set)) || buildRound(set, allWords);
    session = { set, round };
    audio();                                     // unlock sound on this tap
    preloadSet(set);
    document.documentElement.style.setProperty("--card-color", set.color);
    document.documentElement.style.setProperty("--card-ink", set.textColor);
    updateMicToggle();
    show("study");
    showCard();
  }

  function showCard() {
    endTurn();
    const item = session.round.queue[0];
    if (!item) { show("done"); return; }
    $("timefill").style.setProperty("--time-left", "1");
    turn = { item, limit: listenSeconds() * 1000, t0: performance.now(), elapsed: 0, hit: 0, misses: 0, helped: false, timer: 0, raf: 0, done: false, listening: false };
    $("card").classList.remove("correct", "missed");
    $("dontKnow").disabled = false;
    $("gotIt").disabled = false;
    ember("wait");
    $("word").textContent = item.w;
    $("left").textContent = `${session.round.queue.length} left`;
    listen();
  }

  // Start (or resume) listening for the current card. The clock runs
  // only while the microphone is actually on, picking up where it stopped.
  function listen() {
    const t = turn;
    if (!t || t.done || t.listening || !voiceOn() || $("study").hidden) return;
    t.listening = true;
    stopSpeaking();
    const words = session.set.words.map((w) => wordText(w).toLowerCase());
    Listener.start({ words }).then(() => {
      if (turn !== t || t.done || !t.listening) { Listener.stop().catch(() => {}); return; }
      if (!t.timer) {
        t.t0 = performance.now() - t.elapsed;
        t.timer = setTimeout(() => giveUp(t), t.limit - t.elapsed);
        tickBar(t);
      }
      $("listen").classList.remove("idle", "heard");
    }).catch((e) => {
      t.listening = false;
      if (e && e.code === "DENIED") {
        voice.denied = true;
        setVoiceStatus("Voice: microphone permission was denied");
        updateMicToggle();
      } else {
        setVoiceStatus("Voice error: " + (e && e.message));
      }
    });
  }

  function pauseListening() {
    if (turn) turn.listening = false;
    if (Listener) Listener.stop().catch(() => {});
  }

  // Freeze the listening clock (e.g. the app went to the background). listen()
  // starts it again from the same point.
  function stopClock() {
    const t = turn;
    if (!t || t.done || !t.timer) return;
    t.elapsed = performance.now() - t.t0;
    clearTimeout(t.timer);
    cancelAnimationFrame(t.raf);
    t.timer = 0;
    t.hit = 0;
  }

  function toBackground() {
    stopClock();
    pauseListening();
  }

  function endTurn() {
    if (!turn) return;
    turn.done = true;
    clearTimeout(turn.timer);
    cancelAnimationFrame(turn.raf);
    pauseListening();
    turn = null;
    $("listen").classList.add("idle");
  }

  function tickBar(t) {
    if (turn !== t || t.done) return;
    const frac = Math.min(1, (performance.now() - t.t0) / t.limit);
    $("timefill").style.setProperty("--time-left", String(1 - frac));
    t.raf = requestAnimationFrame(() => tickBar(t));
  }

  function onHeard(text, final) {
    const t = turn;
    if (!t || t.done || !t.listening || !t.timer) return;
    const heard = (text || "").toLowerCase().split(/\s+/).filter((w) => w && w !== "[unk]");
    if (!heard.length) return;
    $("listen").classList.add("heard");
    if (heard.includes(t.item.w.toLowerCase())) {
      if (!t.hit) t.hit = performance.now();   // time it from when it was first heard
      if (final) {
        const secs = (t.hit - t.t0) / 1000;
        let rating = "hard";
        if (!t.helped && t.misses === 0 && secs <= VOICE.easySeconds) rating = "easy";
        else if (!t.helped && t.misses <= 1 && secs <= VOICE.goodSeconds) rating = "good";
        finish(rating, "voice");
      }
    } else if (final) {
      t.misses++;                              // said something, but not the word
      t.hit = 0;
    }
  }

  // Nobody said it in time: treat it like "Don't know".
  function giveUp(t) {
    if (turn !== t || t.done) return;
    finish("again", "timeout");
  }

  // Ember reacts for a moment, then go to the next card. "how" is
  // "voice" (read it), "tap" (a grown-up tapped the card, no voice),
  // "dontknow" (the button) or "timeout".
  async function finish(rating, how) {
    const t = turn;
    if (!t || t.done) return;
    t.done = true;
    clearTimeout(t.timer);
    cancelAnimationFrame(t.raf);
    pauseListening();
    $("listen").classList.add("idle");
    $("dontKnow").disabled = true;
    $("gotIt").disabled = true;
    if (how === "voice" || how === "tap") {
      $("card").classList.add("correct");
      ember("happy");
      await wait(1500);
    } else {
      $("card").classList.add("missed");
      ember("sad");
      await speak(wordSay(findWord(session.set, t.item.w) || t.item.w));
      await wait(1500);
    }
    if (turn !== t || $("study").hidden) return;   // left the screen meanwhile
    rate(rating);
  }

  // 🔊 on the card: read the word aloud. Needing help caps the rating at Hard.
  async function hint() {
    const t = turn;
    if (!t || t.done) return;
    t.helped = true;
    pauseListening();
    await speak(wordSay(findWord(session.set, t.item.w) || t.item.w));
    if (turn === t && !t.done) listen();
  }

  function rate(rating) {
    const q = session.round.queue;
    const item = q.shift();
    rateCard(session.set, item.w, rating);
    // Struggled words come back later in the same round.
    if (rating === "again" && item.again < 3) {
      item.again++;
      q.splice(Math.min(3, q.length), 0, item);
    } else if (rating === "hard" && item.hard < 1) {
      item.hard++;
      q.splice(Math.min(6, q.length), 0, item);
    }
    save();
    showCard();
  }

  function updateMicToggle() {
    const b = $("micToggle");
    b.hidden = !(Listener && voice.ready);
    b.classList.toggle("off", !voiceOn());
    b.setAttribute("aria-pressed", String(voiceOn()));
    // Without voice nothing moves the card on by itself, so a grown-up needs
    // a "Got it" button. With voice it would only be a distraction.
    $("gotIt").hidden = voiceOn();
  }

  // ---------- Kid lock (Android screen pinning) ----------
  // Locking pins the app so Home / Recents can't be used to leave it.
  // Unlocking needs the grown-up PIN chosen the first time the lock is used.
  const KidLock = plugin("KidLock");
  let kidLocked = false;

  // Shows the PIN dialog. check(pin) returns an error message to keep it open,
  // or nothing to accept. Resolves with the PIN, or null when cancelled.
  // With text set it asks for a name instead (prefilled with text.value),
  // or a visible number with text.numeric.
  function askPin(title, hint, check, text) {
    return new Promise((resolve) => {
      const input = $("pinInput");
      $("pinTitle").textContent = title;
      $("pinHint").textContent = hint || "";
      $("pinError").textContent = "";
      const numeric = !text || text.numeric;
      input.type = text ? "text" : "password";
      input.inputMode = numeric ? "numeric" : "text";
      input.maxLength = !text ? 8 : numeric ? 3 : 20;
      if (numeric) input.setAttribute("pattern", "[0-9]*"); else input.removeAttribute("pattern");
      input.classList.toggle("text", !!text);
      input.value = text ? text.value || "" : "";
      $("pinDialog").hidden = false;
      input.focus();
      const close = (result) => {
        $("pinDialog").hidden = true;
        $("pinForm").onsubmit = null;
        $("pinCancel").onclick = null;
        input.blur();
        resolve(result);
      };
      $("pinForm").onsubmit = (e) => {
        e.preventDefault();
        const value = text ? input.value.trim() : input.value;
        const error = check(value);
        if (!error) { close(value); return; }
        $("pinError").textContent = error;
        input.value = "";
        input.focus();
      };
      $("pinCancel").onclick = () => close(null);
    });
  }

  const pinRule = (pin) => (/^[0-9]{4,8}$/.test(pin) ? "" : "Use 4 to 8 numbers.");

  async function choosePin() {
    const pin = await askPin("Choose a grown-up PIN",
      "You'll need it to unlock the app. For extra safety, also turn on " +
      "\"Ask for PIN before unpinning\" in Android Settings → Security → App pinning.",
      pinRule);
    if (pin === null) return false;
    const again = await askPin("Type the PIN again", "", (p) => (p === pin ? "" : "That doesn't match. Try again."));
    if (again === null) return false;
    settings.kidPin = pin;
    saveSettings();
    return true;
  }

  function updateKidLock() {
    const b = $("kidLock");
    b.hidden = !KidLock;
    b.textContent = kidLocked ? "🔓 Unlock (grown-ups)" : "🔒 Kid lock";
    b.classList.toggle("locked", kidLocked);
    $("reset").hidden = kidLocked;
    $("removeProfile").hidden = kidLocked || profiles.list.length < 2;
    $("listenTime").hidden = kidLocked || !Listener;
    const add = $("profileAdd");
    if (add) add.hidden = kidLocked;
    $("changePin").hidden = kidLocked || !KidLock || !settings.kidPin;
  }

  async function refreshKidLock() {
    if (!KidLock) return;
    try { kidLocked = !!(await KidLock.status()).locked; } catch (_) { /* ignore */ }
    updateKidLock();
  }

  async function toggleKidLock() {
    await refreshKidLock();
    if (kidLocked) {
      const pin = await askPin("Grown-up PIN", "", (p) => (p === settings.kidPin ? "" : "Wrong PIN."));
      if (pin === null) return;
      try { await KidLock.unlock(); } catch (e) { alert(e && e.message); }
    } else {
      if (!settings.kidPin && !(await choosePin())) return;
      try { await KidLock.lock(); } catch (e) { alert(e && e.message); }
    }
    refreshKidLock();
  }

  // ---------- Profile management ----------
  function nameRule(except) {
    return (name) => {
      if (!name) return "Type a name.";
      const taken = profiles.list.some((x) => x !== except && x.name.toLowerCase() === name.toLowerCase());
      return taken ? "That name is already used." : "";
    };
  }

  function switchProfile(id) {
    endTurn();
    session = null;
    profiles.current = id;
    saveProfiles();
    state = load();
    renderHome();
  }

  async function addProfile() {
    const name = await askPin("New reader", "Who is reading?", nameRule(null), { value: "" });
    if (name === null) return;
    const id = "p" + Date.now().toString(36);
    profiles.list.push({ id, name });
    switchProfile(id);
  }

  async function renameProfile() {
    const p = currentProfile();
    const name = await askPin("Change name", "", nameRule(p), { value: p.name });
    if (name === null) return;
    p.name = name;
    saveProfiles();
    renderHome();
  }

  async function setListenTime() {
    const p = currentProfile();
    const [min, max] = TIMER_RANGE;
    const secs = await askPin("Listening time",
      `Seconds ${p.name} gets to read each word (${min} to ${max}).`,
      (v) => (/^[0-9]+$/.test(v) && +v >= min && +v <= max ? "" : `Use a number from ${min} to ${max}.`),
      { value: String(listenSeconds()), numeric: true });
    if (secs === null) return;
    p.listenSeconds = +secs;
    saveProfiles();
    renderHome();
  }

  function removeProfile() {
    const p = currentProfile();
    if (profiles.list.length < 2 || !confirm(`Remove ${p.name} and all their progress?`)) return;
    try { localStorage.removeItem(progressKey(p.id)); } catch (_) { /* ignore */ }
    profiles.list = profiles.list.filter((x) => x !== p);
    switchProfile(profiles.list[0].id);
  }

  function renderProfiles() {
    const box = $("profiles");
    box.innerHTML = "";
    for (const p of profiles.list) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "profile-btn";
      const active = p.id === profiles.current;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
      b.textContent = p.name;
      // Tapping the selected reader again renames it (grown-ups only).
      b.onclick = () => (!active ? switchProfile(p.id) : kidLocked ? null : renameProfile());
      box.appendChild(b);
    }
    const add = document.createElement("button");
    add.type = "button";
    add.id = "profileAdd";
    add.className = "profile-btn add";
    add.setAttribute("aria-label", "Add a reader");
    add.textContent = "+";
    add.hidden = kidLocked;
    add.onclick = addProfile;
    box.appendChild(add);
    $("removeProfile").textContent = `Remove ${currentProfile().name}`;
    $("removeProfile").hidden = kidLocked || profiles.list.length < 2;
    $("listenTime").textContent = `⏱ Listening time: ${listenSeconds()} s`;
    $("listenTime").hidden = kidLocked || !Listener;
  }

  // ---------- Screens ----------
  function show(name) {
    for (const s of ["home", "study", "done"]) $(s).hidden = s !== name;
    $("ember").hidden = name === "home";
    if (name === "done") ember("happy");
  }

  function renderHome() {
    endTurn();
    stopSpeaking();
    renderProfiles();
    const box = $("sets");
    box.innerHTML = "";
    for (const set of window.WORD_SETS) {
      const r = currentRound(set);
      const started = set.words.some((w) => card(set, wordText(w)));
      const label = r ? `Keep going ▶ ${r.queue.length} left`
        : started ? "Play ▶" : `Read all ${set.words.length} words ▶`;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "set-btn";
      b.style.background = set.color;
      b.style.color = set.textColor;
      b.style.borderColor = set.textColor;
      b.innerHTML = `${set.name}<span class="count">${label}</span>`;
      b.onclick = () => start(set, false);
      box.appendChild(b);
    }
    $("voiceStatus").textContent = voice.status;
    updateMicToggle();
    show("home");
    refreshKidLock();
  }

  // ---------- Wiring ----------
  $("hintBtn").addEventListener("click", hint);
  $("dontKnow").addEventListener("click", () => finish("again", "dontknow"));
  // Without voice, a grown-up taps "Got it" (or the card) when the word was read correctly.
  $("gotIt").addEventListener("click", () => finish("good", "tap"));
  $("card").addEventListener("click", (e) => {
    if (!voiceOn() && !e.target.closest("#hintBtn")) finish("good", "tap");
  });
  $("homeBtn").addEventListener("click", renderHome);
  $("doneHome").addEventListener("click", renderHome);
  $("moreBtn").addEventListener("click", () => start(session.set, false));
  $("allBtn").addEventListener("click", () => start(session.set, true));
  $("micToggle").addEventListener("click", () => {
    if (voice.denied) voice.denied = false;                 // let them grant it again
    else settings.voice = settings.voice === false;
    saveSettings();
    updateMicToggle();
  });
  $("kidLock").addEventListener("click", toggleKidLock);
  $("changePin").addEventListener("click", choosePin);
  $("removeProfile").addEventListener("click", removeProfile);
  $("listenTime").addEventListener("click", setListenTime);
  $("reset").addEventListener("click", () => {
    if (confirm(`Erase all of ${currentProfile().name}'s progress and start over?`)) {
      state = { cards: {}, rounds: {}, turn: 0 };
      save();
      renderHome();
    }
  });

  if (isNative) {
    const App = plugin("App");
    // Android back button: go home instead of closing the app
    // (and never close it while kid lock is on).
    App.addListener("backButton", () => {
      if (!$("pinDialog").hidden) $("pinCancel").click();
      else if ($("home").hidden) renderHome();
      else if (!kidLocked) App.exitApp();
    });
    // Release the microphone and stop the clock in the background,
    // pick up again on return.
    App.addListener("pause", toBackground);
    App.addListener("resume", () => { listen(); refreshKidLock(); });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) toBackground(); else listen();
  });

  // Android can also pin/unpin from outside the app (its "Pin this app?"
  // prompt, or the system unpin gesture), so keep the home screen in sync.
  if (KidLock) setInterval(() => { if (!$("home").hidden) refreshKidLock(); }, 1500);

  window.WORD_SETS.forEach(preloadSet);
  renderHome();
})();
