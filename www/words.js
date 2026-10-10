// =====================================================================
//  WORD SETS — edit this file to add / change words and colors.
// =====================================================================
//
//  Each set becomes a big colored button on the home screen.
//
//    id         Unique, never change it once kids have used the set
//               (progress is saved under "<id>:<word>").
//    name       Label shown on the home screen.
//    color      Card background color (any CSS color).
//    textColor  Color of the word printed on the card.
//    words      The words in the set. Adding a word later keeps the
//               progress of all existing words. Removing a word just
//               hides it. If the voice mispronounces a word, write
//               { text: "read", say: "reed" } instead of "read".
//               The spoken audio is pre-recorded at build time
//               (scripts/generate-audio.mjs).
//
//  To add a new set, copy the yellow block, give it a new id/name/color
//  and a new word list. Then commit — GitHub Actions builds a new APK.
// =====================================================================

window.WORD_SETS = [
  {
    id: "yellow",
    name: "Yellow Words",
    color: "#ecc94b",
    textColor: "#1d1d1b",
    words: [
      "make", "like", "would", "up", "right", "to", "about", "many",
      "them", "other", "out", "then", "will", "see", "look", "time",
      "into", "more", "go", "him", "her", "these", "some", "has",
    ],
  },

  // Example of a future set:
  // {
  //   id: "blue",
  //   name: "Blue Words",
  //   color: "#8ec5ea",
  //   textColor: "#1d1d1b",
  //   words: ["the", "and", "is"],
  // },
];

// ---------------------------------------------------------------------
//  Practice rounds
// ---------------------------------------------------------------------
//  The first round goes through every word in the set. After that each
//  round is built weakest-words-first: words the child struggles with
//  come every round, words they know well come back every few rounds.
//  Rounds never "run out" — tap Keep going for another one.
window.PRACTICE = {
  minRoundSize: 8,   // a round always has at least this many words
};

// ---------------------------------------------------------------------
//  Voice (on-device speech recognition)
// ---------------------------------------------------------------------
//  The app listens while the word is shown and rates it from how the
//  child read it (there is a single "Don't know" button):
//    said it within easySeconds, first try   -> Easy
//    said it within goodSeconds (≤1 miss)    -> Good
//    got it eventually / after a few tries   -> Hard
//    "Don't know", or not said within giveUpSeconds -> Again (word is read aloud)
window.VOICE = {
  easySeconds: 2.5,
  goodSeconds: 6,
  giveUpSeconds: 15,   // default; each reader can change it on the home screen
};
