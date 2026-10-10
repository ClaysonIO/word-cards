(() => {
  "use strict";

  const STORE_KEY = "wordcards.v2";
  const PRACTICE = Object.assign({ minRoundSize: 8 }, window.PRACTICE);
  const VOICE = Object.assign({ easySeconds: 2.5, goodSeconds: 6, giveUpSeconds: 15 }, window.VOICE);
  const MAX_BOX = 5;

  // ---------- Storage ----------
  // state = {
  //   cards:  { "<setId>:<word>": { box 0-5, lapses, seen, skipped, last } },
  //   rounds: { "<setId>": { queue: [{ w: "make", again: 0, hard: 0 }], total } },
  //   turn:   number of cards shown so far (used for "last seen")
  // }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.cards) return { cards: s.cards, rounds: s.rounds || {}, turn: s.turn || 0 };
    } catch (_) { /* ignore */ }
    return { cards: {}, rounds: {}, turn: 0 };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
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

  // ---------- Text to speech ----------
  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = (name) => (isNative && Cap.registerPlugin ? Cap.registerPlugin(name) : null);
  const nativeTTS = plugin("TextToSpeech");

  function stopSpeaking() {
    try {
      if (nativeTTS) nativeTTS.stop().catch(() => {});
      else if ("speechSynthesis" in window) speechSynthesis.cancel();
    } catch (_) { /* ignore */ }
  }

  // Resolves when the word has finished playing.
  async function speak(text) {
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

  // ---------- Study session ----------
  // One card at a time. The child just reads; the app listens, rates and moves on.
  // A card "turn" = { item, t0, hit, misses, helped, timer, raf, done, listening }
  let session = null;   // { set, round }
  let turn = null;

  function start(set, allWords) {
    const round = (!allWords && currentRound(set)) || buildRound(set, allWords);
    session = { set, round };
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
    turn = { item, t0: performance.now(), hit: 0, misses: 0, helped: false, timer: 0, raf: 0, done: false, listening: false };
    $("card").classList.remove("correct", "missed");
    for (const b of document.querySelectorAll(".rate-btn")) b.classList.remove("chosen");
    $("word").textContent = item.w;
    $("left").textContent = `${session.round.queue.length} left`;
    listen();
  }

  // Start (or resume) listening for the current card. The 15 s clock starts
  // the first time the microphone is actually on.
  function listen() {
    const t = turn;
    if (!t || t.done || t.listening || !voiceOn() || $("study").hidden) return;
    t.listening = true;
    stopSpeaking();
    const words = session.set.words.map((w) => wordText(w).toLowerCase());
    Listener.start({ words }).then(() => {
      if (turn !== t || t.done || !t.listening) { Listener.stop().catch(() => {}); return; }
      if (!t.timer) {
        t.t0 = performance.now();
        t.timer = setTimeout(() => giveUp(t), VOICE.giveUpSeconds * 1000);
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
    const frac = Math.min(1, (performance.now() - t.t0) / (VOICE.giveUpSeconds * 1000));
    $("timefill").style.transform = `scaleX(${1 - frac})`;
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

  // Nobody said it in time: read the word to them, then move on.
  function giveUp(t) {
    if (turn !== t || t.done) return;
    finish("again", "timeout");
  }

  // Show the rating for a moment, then go to the next card.
  async function finish(rating, how) {
    const t = turn;
    if (!t || t.done) return;
    t.done = true;
    clearTimeout(t.timer);
    cancelAnimationFrame(t.raf);
    pauseListening();
    $("listen").classList.add("idle");
    document.querySelector(`.rate-btn[data-rating="${rating}"]`).classList.add("chosen");
    if (how === "voice") {
      $("card").classList.add("correct");
      await wait(900);
    } else if (how === "timeout") {
      $("card").classList.add("missed");
      await speak(wordSay(findWord(session.set, t.item.w) || t.item.w));
      await wait(1500);
    } else {
      await wait(250);
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
  }

  // ---------- Screens ----------
  function show(name) {
    for (const s of ["home", "study", "done"]) $(s).hidden = s !== name;
  }

  function renderHome() {
    endTurn();
    stopSpeaking();
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
    show("home");
  }

  // ---------- Wiring ----------
  $("hintBtn").addEventListener("click", hint);
  $("rateBtns").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rating]");
    if (b) finish(b.dataset.rating, "tap");
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
    if (voiceOn()) listen(); else { pauseListening(); $("listen").classList.add("idle"); }
  });
  $("reset").addEventListener("click", () => {
    if (confirm("Erase all progress and start over?")) {
      state = { cards: {}, rounds: {}, turn: 0 };
      save();
      renderHome();
    }
  });

  if (isNative) {
    const App = plugin("App");
    // Android back button: go home instead of closing the app.
    App.addListener("backButton", () => {
      if (!$("home").hidden) App.exitApp(); else renderHome();
    });
    // Release the microphone in the background, pick up again on return.
    App.addListener("pause", () => pauseListening());
    App.addListener("resume", () => listen());
  }

  renderHome();
})();
