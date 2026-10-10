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
  const nativeTTS = isNative && Cap.registerPlugin ? Cap.registerPlugin("TextToSpeech") : null;

  function stopSpeaking() {
    try {
      if (nativeTTS) nativeTTS.stop().catch(() => {});
      else if ("speechSynthesis" in window) speechSynthesis.cancel();
    } catch (_) { /* ignore */ }
  }

  async function speak(text) {
    try {
      if (nativeTTS) {
        await nativeTTS.stop().catch(() => {});
        await nativeTTS.speak({ text, lang: "en-US", rate: 0.8, pitch: 1.0, volume: 1.0, category: "playback" });
        return;
      }
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 0.8;
        speechSynthesis.speak(u);
      }
    } catch (e) { console.warn("TTS failed", e); }
  }

  // ---------- Voice recognition (on-device Vosk, Android only) ----------
  const Listener = isNative && Cap.registerPlugin ? Cap.registerPlugin("WordListener") : null;
  const voice = { ready: false, denied: false };

  function voiceOn() {
    return Listener && voice.ready && !voice.denied && settings.voice !== false;
  }

  if (Listener) {
    // Load the model after the first screen is drawn so the app opens instantly.
    setTimeout(() => {
      Listener.prepare()
        .then(() => { voice.ready = true; updateMicToggle(); maybeStartListening(); })
        .catch((e) => console.warn("Voice unavailable", e));
    }, 50);
    Listener.addListener("partial", (e) => onHeard(e.text, false));
    Listener.addListener("result", (e) => onHeard(e.text, true));
  }

  // One listening attempt per card.
  let attempt = null; // { word, t0, hit, misses, timer, raf }

  function maybeStartListening() {
    if (!session || session.flipped || attempt || !voiceOn() || $("study").hidden) return;
    const item = session.round.queue[0];
    if (!item) return;
    const thisAttempt = { word: item.w, t0: 0, hit: 0, misses: 0, timer: 0, raf: 0 };
    attempt = thisAttempt;
    stopSpeaking();
    const words = session.set.words.map((w) => wordText(w).toLowerCase());
    Listener.start({ words }).then(() => {
      if (attempt !== thisAttempt) { Listener.stop().catch(() => {}); return; }
      thisAttempt.t0 = performance.now();
      thisAttempt.timer = setTimeout(() => giveUp(thisAttempt), VOICE.giveUpSeconds * 1000);
      $("listen").hidden = false;
      $("listen").classList.remove("heard");
      tickBar(thisAttempt);
    }).catch((e) => {
      if (attempt === thisAttempt) attempt = null;
      if (e && e.code === "DENIED") { voice.denied = true; updateMicToggle(); }
      console.warn("Listening failed", e);
    });
  }

  function tickBar(a) {
    if (attempt !== a) return;
    const frac = Math.min(1, (performance.now() - a.t0) / (VOICE.giveUpSeconds * 1000));
    $("timefill").style.transform = `scaleX(${1 - frac})`;
    a.raf = requestAnimationFrame(() => tickBar(a));
  }

  function stopListening() {
    if (!attempt) return;
    clearTimeout(attempt.timer);
    cancelAnimationFrame(attempt.raf);
    attempt = null;
    $("listen").hidden = true;
    if (Listener) Listener.stop().catch(() => {});
  }

  function onHeard(text, final) {
    const a = attempt;
    if (!a || !a.t0) return;
    const heard = (text || "").toLowerCase().split(/\s+/).filter((t) => t && t !== "[unk]");
    if (!heard.length) return;
    $("listen").classList.add("heard");
    if (heard.includes(a.word.toLowerCase())) {
      if (!a.hit) a.hit = performance.now();   // time it from the moment it was first heard
      if (final) succeed(a);
    } else if (final) {
      a.misses++;                              // said something, but not the word
      a.hit = 0;
    }
  }

  function succeed(a) {
    const secs = (a.hit - a.t0) / 1000;
    let rating = "hard";
    if (a.misses === 0 && secs <= VOICE.easySeconds) rating = "easy";
    else if (a.misses <= 1 && secs <= VOICE.goodSeconds) rating = "good";
    stopListening();
    $("card").classList.add("correct");
    reveal(rating);
  }

  function giveUp(a) {
    if (attempt !== a) return;
    stopListening();
    reveal("again");
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
    stopListening();
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
    show("home");
  }

  // ---------- Study session ----------
  let session = null; // { set, round, flipped }

  function start(set, allWords) {
    const round = (!allWords && currentRound(set)) || buildRound(set, allWords);
    session = { set, round, flipped: false };
    document.documentElement.style.setProperty("--card-color", set.color);
    document.documentElement.style.setProperty("--card-ink", set.textColor);
    updateMicToggle();
    show("study");
    showCard();
  }

  function showCard() {
    stopListening();
    const item = session.round.queue[0];
    if (!item) { show("done"); return; }
    session.flipped = false;
    const c = $("card");
    c.style.transition = "none";          // jump back to the front instantly
    c.classList.remove("flipped", "correct");
    void c.offsetWidth;
    c.style.transition = "";
    $("wordFront").textContent = item.w;
    $("wordBack").textContent = item.w;
    $("left").textContent = `${session.round.queue.length} left`;
    $("hearBtn").hidden = false;
    $("rateBtns").hidden = true;
    for (const b of document.querySelectorAll(".rate-btn")) b.classList.remove("suggested");
    maybeStartListening();
  }

  // Flip to the back, read the word aloud and (optionally) pre-select a rating.
  function reveal(suggested) {
    if (!session) return;
    const item = session.round.queue[0];
    speak(wordSay(findWord(session.set, item.w) || item.w));
    if (session.flipped) return;          // tapping again just repeats the word
    stopListening();
    session.flipped = true;
    $("card").classList.add("flipped");
    $("hearBtn").hidden = true;
    $("rateBtns").hidden = false;
    for (const b of document.querySelectorAll(".rate-btn")) {
      b.classList.toggle("suggested", b.dataset.rating === suggested);
    }
  }

  // Asking to hear the word while listening means they needed help.
  function flipByHand() {
    if (!session) return;
    const wasListening = !!attempt;
    reveal(wasListening ? "again" : null);
  }

  function rate(rating) {
    if (!session || !session.flipped) return;
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

  // ---------- Wiring ----------
  $("card").addEventListener("click", flipByHand);
  $("card").addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flipByHand(); } });
  $("hearBtn").addEventListener("click", flipByHand);
  $("rateBtns").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rating]");
    if (b) rate(b.dataset.rating);
  });
  $("homeBtn").addEventListener("click", renderHome);
  $("doneHome").addEventListener("click", renderHome);
  $("moreBtn").addEventListener("click", () => start(session.set, false));
  $("allBtn").addEventListener("click", () => start(session.set, true));
  $("micToggle").addEventListener("click", () => {
    if (voice.denied) { voice.denied = false; }             // let them grant it again
    else settings.voice = settings.voice === false;
    saveSettings();
    updateMicToggle();
    if (voiceOn()) maybeStartListening(); else stopListening();
  });
  $("reset").addEventListener("click", () => {
    if (confirm("Erase all progress and start over?")) {
      state = { cards: {}, rounds: {}, turn: 0 };
      save();
      renderHome();
    }
  });

  if (isNative) {
    try {
      const App = Cap.registerPlugin("App");
      // Android back button: go home instead of closing the app.
      App.addListener("backButton", () => {
        if (!$("home").hidden) App.exitApp(); else renderHome();
      });
      // Microphone is released when the app is in the background.
      App.addListener("pause", () => { stopListening(); });
      App.addListener("resume", () => { maybeStartListening(); });
    } catch (_) { /* App plugin not installed */ }
  }

  renderHome();
})();
