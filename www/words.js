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
//               hides it.
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

// How many never-seen words to introduce per set per day.
window.NEW_WORDS_PER_DAY = 8;
