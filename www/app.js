(() => {
  "use strict";

  const DAY = 24 * 60 * 60 * 1000;
  const STORE_KEY = "wordcards.v1";
  const SESSION_PRACTICE_SIZE = 10;

  // ---------- Storage ----------
  // state = { cards: { "<setId>:<word>": {iv, ease, due, reps, lapses} },
  //           newToday: { "<setId>": { day: "YYYY-MM-DD", count } } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.cards) return { cards: s.cards, newToday: s.newToday || {} };
    } catch (_) { /* ignore */ }
    return { cards: {}, newToday: {} };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
  }
  let state = load();

  // ---------- Helpers ----------
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const todayKey = () => new Date(startOfToday()).toISOString().slice(0, 10);
  const $ = (id) => document.getElementById(id);

  // A word can be "make" or { text: "read", say: "reed" } to fix pronunciation.
  const wordText = (w) => (typeof w === "string" ? w : w.text);
  const wordSay = (w) => (typeof w === "string" ? w : w.say || w.text);
  const cardId = (set, w) => `${set.id}:${wordText(w)}`;

  function newUsedToday(set) {
    const n = state.newToday[set.id];
    return n && n.day === todayKey() ? n.count : 0;
  }

  // Cards to study now: everything due, plus a few new words.
  function dueQueue(set) {
    const now = Date.now();
    const due = [];
    const fresh = [];
    for (const w of set.words) {
      const c = state.cards[cardId(set, w)];
      if (!c) fresh.push(w);
      else if (c.due <= now) due.push([c.due, w]);
    }
    due.sort((a, b) => a[0] - b[0]);
    const room = Math.max(0, (window.NEW_WORDS_PER_DAY || 8) - newUsedToday(set));
    return [...due.map((d) => d[1]), ...fresh.slice(0, room)];
  }

  // Extra practice after finishing: soonest-due words, schedule untouched.
  function practiceQueue(set) {
    const list = set.words.map((w) => [state.cards[cardId(set, w)]?.due ?? Infinity, w]);
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, SESSION_PRACTICE_SIZE).map((x) => x[1]);
  }

  // ---------- Scheduler (simplified SM-2 / Anki) ----------
  function schedule(set, w, rating) {
    const id = cardId(set, w);
    let c = state.cards[id];
    if (!c) {
      c = { iv: 0, ease: 2.5, due: 0, reps: 0, lapses: 0 };
      const n = state.newToday[set.id];
      state.newToday[set.id] = { day: todayKey(), count: (n && n.day === todayKey() ? n.count : 0) + 1 };
    }
    c.reps++;
    switch (rating) {
      case "again":
        c.lapses++;
        c.iv = 0;
        c.ease = Math.max(1.3, c.ease - 0.2);
        break;
      case "hard":
        c.iv = c.iv === 0 ? 1 : Math.max(1, Math.round(c.iv * 1.2));
        c.ease = Math.max(1.3, c.ease - 0.15);
        break;
      case "good":
        c.iv = c.iv === 0 ? 1 : c.iv === 1 ? 3 : Math.round(c.iv * c.ease);
        break;
      case "easy":
        c.iv = c.iv === 0 ? 3 : Math.round(c.iv * c.ease * 1.3);
        c.ease += 0.15;
        break;
    }
    c.due = c.iv === 0 ? Date.now() : startOfToday() + c.iv * DAY;
    state.cards[id] = c;
    save();
  }

  // ---------- Text to speech ----------
  const Cap = window.Capacitor;
  const nativeTTS = Cap && Cap.isNativePlatform && Cap.isNativePlatform() && Cap.registerPlugin
    ? Cap.registerPlugin("TextToSpeech") : null;

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

  // ---------- Screens ----------
  function show(name) {
    for (const s of ["home", "study", "done"]) $(s).hidden = s !== name;
  }

  function renderHome() {
    const box = $("sets");
    box.innerHTML = "";
    for (const set of window.WORD_SETS) {
      const n = dueQueue(set).length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "set-btn";
      b.style.background = set.color;
      b.style.color = set.textColor;
      b.style.borderColor = set.textColor;
      b.innerHTML = `${set.name}<span class="count">${n ? `${n} to practice ⭐` : "All done ✓"}</span>`;
      b.onclick = () => start(set, n ? dueQueue(set) : practiceQueue(set), n === 0);
      box.appendChild(b);
    }
    show("home");
  }

  // ---------- Study session ----------
  let session = null; // { set, queue, practice, flipped }

  function start(set, queue, practice) {
    if (!queue.length) return renderHome();
    session = { set, queue: [...queue], practice };
    document.documentElement.style.setProperty("--card-color", set.color);
    document.documentElement.style.setProperty("--card-ink", set.textColor);
    show("study");
    showCard();
  }

  function showCard() {
    const w = session.queue[0];
    if (w === undefined) { show("done"); return; }
    session.flipped = false;
    const card = $("card");
    card.style.transition = "none";      // jump back to the front instantly
    card.classList.remove("flipped");
    void card.offsetWidth;
    card.style.transition = "";
    $("wordFront").textContent = wordText(w);
    $("wordBack").textContent = wordText(w);
    $("left").textContent = `${session.queue.length} left`;
    $("hearBtn").hidden = false;
    $("rateBtns").hidden = true;
  }

  function flip() {
    if (!session) return;
    const w = session.queue[0];
    speak(wordSay(w));
    if (session.flipped) return;          // tapping again just repeats the word
    session.flipped = true;
    $("card").classList.add("flipped");
    $("hearBtn").hidden = true;
    $("rateBtns").hidden = false;
  }

  function rate(rating) {
    if (!session || !session.flipped) return;
    const w = session.queue.shift();
    if (!session.practice) schedule(session.set, w, rating);
    if (rating === "again") {
      // See it again a little later in this session.
      session.queue.splice(Math.min(3, session.queue.length), 0, w);
    }
    showCard();
  }

  // ---------- Wiring ----------
  $("card").addEventListener("click", flip);
  $("card").addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
  $("hearBtn").addEventListener("click", flip);
  $("rateBtns").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rating]");
    if (b) rate(b.dataset.rating);
  });
  $("homeBtn").addEventListener("click", renderHome);
  $("doneHome").addEventListener("click", renderHome);
  $("moreBtn").addEventListener("click", () => {
    const set = session.set;
    const q = dueQueue(set);
    q.length ? start(set, q, false) : start(set, practiceQueue(set), true);
  });
  $("reset").addEventListener("click", () => {
    if (confirm("Erase all progress and start over?")) {
      state = { cards: {}, newToday: {} };
      save();
      renderHome();
    }
  });

  // Android back button: go home instead of closing the app.
  if (Cap && Cap.isNativePlatform && Cap.isNativePlatform()) {
    try {
      const App = Cap.registerPlugin("App");
      App.addListener("backButton", () => {
        if (!$("home").hidden) App.exitApp(); else renderHome();
      });
    } catch (_) { /* App plugin not installed */ }
  }

  renderHome();
})();
