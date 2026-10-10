// The fox styles a reader can pick. Every style draws the same parts with the
// same class names (e-tail, e-arm-l, e-eyes-happy, e-mouth-sad, ...) inside a
// 120 x 140 view box, so the moods and animations in style.css work for all.
// No ids: the same drawing is shown several times in the picker.
(() => {
  "use strict";

  // ---------- Classic (Ember) ----------
  const classic = `
    <g class="e-tail">
      <path d="M80 116 C104 116 120 96 114 70 C111 60 101 58 98 66 C104 82 96 100 74 104 Z" fill="#f08a3c"/>
      <path d="M114 70 C111 60 101 58 98 66 C100 72 106 76 114 70 Z" fill="#fff4e6"/>
    </g>
    <g class="e-body">
      <ellipse cx="60" cy="110" rx="26" ry="23" fill="#f08a3c"/>
      <ellipse cx="60" cy="115" rx="15" ry="16" fill="#fff4e6"/>
      <ellipse cx="47" cy="132" rx="9" ry="5" fill="#5b3a29"/>
      <ellipse cx="73" cy="132" rx="9" ry="5" fill="#5b3a29"/>
      <g class="e-arm e-arm-l">
        <line x1="40" y1="100" x2="34" y2="118" stroke="#e2782c" stroke-width="9" stroke-linecap="round"/>
        <circle cx="34" cy="118" r="5" fill="#5b3a29"/>
      </g>
      <g class="e-arm e-arm-r">
        <line x1="80" y1="100" x2="86" y2="118" stroke="#e2782c" stroke-width="9" stroke-linecap="round"/>
        <circle cx="86" cy="118" r="5" fill="#5b3a29"/>
      </g>
    </g>
    <g class="e-head">
      <g class="e-ear e-ear-l">
        <path d="M33 54 L30 16 L56 38 Z" fill="#f08a3c"/>
        <path d="M36 46 L34 25 L49 38 Z" fill="#5b3a29"/>
      </g>
      <g class="e-ear e-ear-r">
        <path d="M87 54 L90 16 L64 38 Z" fill="#f08a3c"/>
        <path d="M84 46 L86 25 L71 38 Z" fill="#5b3a29"/>
      </g>
      <path d="M28 58 C28 40 43 31 60 31 C77 31 92 40 92 58 C92 73 77 86 60 87 C43 86 28 73 28 58 Z" fill="#f08a3c"/>
      <path d="M31 63 C41 64 51 68 60 79 C69 68 79 64 89 63 C87 77 74 87 60 87 C46 87 33 77 31 63 Z" fill="#fff4e6"/>
      <ellipse class="e-blush" cx="40" cy="70" rx="5" ry="3" fill="#ff8fa3"/>
      <ellipse class="e-blush" cx="80" cy="70" rx="5" ry="3" fill="#ff8fa3"/>
      <g class="e-eyes-open">
        <circle cx="47" cy="57" r="5.5" fill="#2b1d16"/>
        <circle cx="73" cy="57" r="5.5" fill="#2b1d16"/>
        <circle cx="49" cy="55" r="1.8" fill="#fff"/>
        <circle cx="75" cy="55" r="1.8" fill="#fff"/>
      </g>
      <g class="e-eyes-happy" fill="none" stroke="#2b1d16" stroke-width="3.2" stroke-linecap="round">
        <path d="M41 59 Q47 50 53 59"/>
        <path d="M67 59 Q73 50 79 59"/>
      </g>
      <g class="e-eyes-sad">
        <circle cx="47" cy="59" r="4.5" fill="#2b1d16"/>
        <circle cx="73" cy="59" r="4.5" fill="#2b1d16"/>
        <circle cx="48.5" cy="57.5" r="1.6" fill="#fff"/>
        <circle cx="74.5" cy="57.5" r="1.6" fill="#fff"/>
        <path d="M40 51 L52 47 M80 51 L68 47" stroke="#5b3a29" stroke-width="2.6" stroke-linecap="round"/>
      </g>
      <ellipse cx="60" cy="74" rx="4.5" ry="3.2" fill="#2b1d16"/>
      <path class="e-mouth-wait" d="M54 79 Q60 86 66 79 Z" fill="#7a2e1e"/>
      <g class="e-mouth-happy">
        <path d="M51 78 Q60 92 69 78 Z" fill="#7a2e1e"/>
        <path d="M55 84 Q60 89 65 84 Q60 82 55 84 Z" fill="#ff8fa3"/>
      </g>
      <path class="e-mouth-sad" d="M55 81 Q60 84 65 81" fill="none" stroke="#2b1d16" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <g class="e-sparkles" fill="#ffd23f">
      <path d="M14 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z"/>
      <path d="M104 22 l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5 Z"/>
      <path d="M108 100 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z"/>
    </g>`;

  // ---------- Snowy: Ember's arctic cousin, with a scarf ----------
  const line = 'stroke="#aebdcf" stroke-width="1.6" stroke-linejoin="round"';
  const snowy = `
    <g class="e-tail">
      <path d="M80 116 C104 116 120 96 114 70 C111 60 101 58 98 66 C104 82 96 100 74 104 Z" fill="#e8eef6" ${line}/>
      <path d="M114 70 C111 60 101 58 98 66 C100 72 106 76 114 70 Z" fill="#fff"/>
    </g>
    <g class="e-body">
      <ellipse cx="60" cy="110" rx="26" ry="23" fill="#e8eef6" ${line}/>
      <ellipse cx="60" cy="115" rx="15" ry="16" fill="#fff"/>
      <ellipse cx="47" cy="132" rx="9" ry="5" fill="#8fa1b8"/>
      <ellipse cx="73" cy="132" rx="9" ry="5" fill="#8fa1b8"/>
      <path d="M34 91 C46 99 74 99 86 91 L87 99 C74 107 46 107 33 99 Z" fill="#e0475a"/>
      <path d="M68 100 L79 99 L83 121 L72 122 Z" fill="#e0475a"/>
      <path d="M69.5 107 L80.5 106 M71 114 L82 113" stroke="#fff" stroke-width="2.4"/>
      <g class="e-arm e-arm-l">
        <line x1="40" y1="100" x2="34" y2="118" stroke="#d6e0ec" stroke-width="9" stroke-linecap="round"/>
        <circle cx="34" cy="118" r="5" fill="#8fa1b8"/>
      </g>
      <g class="e-arm e-arm-r">
        <line x1="80" y1="100" x2="86" y2="118" stroke="#d6e0ec" stroke-width="9" stroke-linecap="round"/>
        <circle cx="86" cy="118" r="5" fill="#8fa1b8"/>
      </g>
    </g>
    <g class="e-head">
      <g class="e-ear e-ear-l">
        <path d="M33 54 L32 22 L56 38 Z" fill="#e8eef6" ${line}/>
        <path d="M36 46 L35 29 L49 38 Z" fill="#f4b6c2"/>
      </g>
      <g class="e-ear e-ear-r">
        <path d="M87 54 L88 22 L64 38 Z" fill="#e8eef6" ${line}/>
        <path d="M84 46 L85 29 L71 38 Z" fill="#f4b6c2"/>
      </g>
      <path d="M26 60 C26 41 42 32 60 32 C78 32 94 41 94 60 C94 74 78 86 60 87 C42 86 26 74 26 60 Z" fill="#e8eef6" ${line}/>
      <path d="M30 64 C41 65 51 69 60 79 C69 69 79 65 90 64 C87 78 74 86 60 86 C46 86 33 78 30 64 Z" fill="#fff"/>
      <ellipse class="e-blush" cx="39" cy="70" rx="5" ry="3" fill="#ff9fb2"/>
      <ellipse class="e-blush" cx="81" cy="70" rx="5" ry="3" fill="#ff9fb2"/>
      <g class="e-eyes-open">
        <circle cx="47" cy="57" r="5.5" fill="#24324a"/>
        <circle cx="73" cy="57" r="5.5" fill="#24324a"/>
        <circle cx="49" cy="55" r="1.8" fill="#fff"/>
        <circle cx="75" cy="55" r="1.8" fill="#fff"/>
      </g>
      <g class="e-eyes-happy" fill="none" stroke="#24324a" stroke-width="3.2" stroke-linecap="round">
        <path d="M41 59 Q47 50 53 59"/>
        <path d="M67 59 Q73 50 79 59"/>
      </g>
      <g class="e-eyes-sad">
        <circle cx="47" cy="59" r="4.5" fill="#24324a"/>
        <circle cx="73" cy="59" r="4.5" fill="#24324a"/>
        <circle cx="48.5" cy="57.5" r="1.6" fill="#fff"/>
        <circle cx="74.5" cy="57.5" r="1.6" fill="#fff"/>
        <path d="M40 51 L52 47 M80 51 L68 47" stroke="#8fa1b8" stroke-width="2.6" stroke-linecap="round"/>
      </g>
      <ellipse cx="60" cy="74" rx="4.5" ry="3.2" fill="#24324a"/>
      <path class="e-mouth-wait" d="M54 79 Q60 86 66 79 Z" fill="#8a3446"/>
      <g class="e-mouth-happy">
        <path d="M51 78 Q60 92 69 78 Z" fill="#8a3446"/>
        <path d="M55 84 Q60 89 65 84 Q60 82 55 84 Z" fill="#ff9fb2"/>
      </g>
      <path class="e-mouth-sad" d="M55 81 Q60 84 65 81" fill="none" stroke="#24324a" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <g class="e-sparkles" fill="#7cc6f2">
      <path d="M17 26 v22 M7.5 31.5 l19 11 M7.5 42.5 l19 -11" stroke="#7cc6f2" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M104 22 l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5 Z" fill="#ffd23f"/>
      <path d="M110 96 v14 M104 99.5 l12 7 M104 106.5 l12 -7" stroke="#7cc6f2" stroke-width="2.2" stroke-linecap="round"/>
    </g>`;

  // ---------- Pixel: 8-bit Ember on a 24 x 28 grid of 5-unit pixels ----------
  const PIX = { O: "#f08a3c", E: "#d9692a", W: "#fff4e6", D: "#5b3a29", K: "#2b1d16",
    L: "#fff", R: "#7a2e1e", P: "#ff8fa3", Y: "#ffd23f" };
  // rows of characters from PIX ("." = empty), drawn from grid cell (col, row).
  // Runs of the same colour become one rect so no seams show between pixels.
  function px(col, row, rows) {
    let out = "";
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length;) {
        let n = 1;
        while (r[x + n] === r[x]) n++;
        if (PIX[r[x]]) out += `<rect x="${(col + x) * 5}" y="${(row + y) * 5}" width="${n * 5}" height="5" fill="${PIX[r[x]]}"/>`;
        x += n;
      }
    });
    return out;
  }
  const pixel = `
    <g class="e-tail">${px(16, 13, [
      ".....W.",
      "....WWW",
      "....OOO",
      "...OOOE",
      "...OOOE",
      "..OOOE.",
      "..OOE..",
      ".OOE...",
      "OOE....",
      "OE.....",
    ])}</g>
    <g class="e-body">${px(7, 18, [
      "..OOOOOO..",
      ".OOOOOOOO.",
      "OOOWWWWOOE",
      "OOWWWWWWOE",
      "OOWWWWWWOE",
      "OOWWWWWWOE",
      ".OOWWWWOE.",
      "..OOOOEE..",
      ".DDD..DDD.",
    ])}
      <g class="e-arm e-arm-l">${px(6, 20, ["E", "E", "E", "D"])}</g>
      <g class="e-arm e-arm-r">${px(17, 20, ["E", "E", "E", "D"])}</g>
    </g>
    <g class="e-head">
      <g class="e-ear e-ear-l">${px(6, 3, ["O...", "OO..", "ODO.", "ODDO", "ODDO"])}</g>
      <g class="e-ear e-ear-r">${px(14, 3, ["...O", "..OO", ".ODO", "ODDO", "ODDO"])}</g>
      ${px(6, 7, [
        "..OOOOOOOO..",
        ".OOOOOOOOOO.",
        "OOOOOOOOOOOO",
        "OOOOOOOOOOOO",
        "OOOOOOOOOOOE",
        "OWWOOOOOOWWE",
        "OWWWWOOWWWWE",
        ".WWWWWWWWWW.",
        "..WWWWWWWW..",
        "....WWWW....",
      ])}
      <g class="e-blush">${px(7, 12, ["P"])}${px(16, 12, ["P"])}</g>
      <g class="e-eyes-open">${px(8, 10, ["KL", "KK"])}${px(14, 10, ["KL", "KK"])}</g>
      <g class="e-eyes-happy">${px(7, 10, [".KK.", "K..K"])}${px(13, 10, [".KK.", "K..K"])}</g>
      <g class="e-eyes-sad">${px(7, 8, ["...D", "..D.", "....", ".KK.", ".LK."])}${px(13, 8, ["D...", ".D..", "....", ".KK.", ".LK."])}</g>
      ${px(11, 13, ["KK"])}
      <g class="e-mouth-wait">${px(11, 14, ["RR"])}</g>
      <g class="e-mouth-happy">${px(10, 14, ["RRRR", ".PP."])}</g>
      <g class="e-mouth-sad">${px(10, 14, [".KK.", "K..K"])}</g>
    </g>
    <g class="e-sparkles">${px(2, 5, [".Y.", "YYY", ".Y."])}${px(20, 3, [".Y.", "YYY", ".Y."])}${px(21, 20, ["Y"])}</g>`;

  // ---------- Manga: big shiny eyes, ink outlines, a cowlick and a fang ----------
  const ink = 'stroke="#2b1d16" stroke-width="2.4" stroke-linejoin="round"';
  const mangaEye = (cx) => `
    <ellipse cx="${cx}" cy="57" rx="7" ry="9" fill="#2b1d16"/>
    <ellipse cx="${cx}" cy="59.5" rx="5" ry="6" fill="#a0521d"/>
    <ellipse cx="${cx}" cy="60.5" rx="2.8" ry="3.4" fill="#2b1d16"/>
    <circle cx="${cx - 2}" cy="53.5" r="3" fill="#fff"/>
    <circle cx="${cx + 3}" cy="62" r="1.4" fill="#fff"/>`;
  const manga = `
    <g class="e-tail">
      <path d="M79 116 C103 118 121 98 116 70 L111 76 L108 60 L100 70 C104 86 96 101 74 104 Z" fill="#ff7a2f" ${ink}/>
      <path d="M100 70 L108 60 L111 76 L116 70 C117 76 116 80 114 84 C107 83 102 78 100 70 Z" fill="#fff" ${ink}/>
    </g>
    <g class="e-body">
      <ellipse cx="60" cy="110" rx="25" ry="22" fill="#ff7a2f" ${ink}/>
      <path d="M77 95 C88 104 87 122 72 130 C80 121 82 107 77 95 Z" fill="#d9561a"/>
      <ellipse cx="60" cy="115" rx="14" ry="15" fill="#fff"/>
      <ellipse cx="47" cy="132" rx="9" ry="5" fill="#2b1d16"/>
      <ellipse cx="73" cy="132" rx="9" ry="5" fill="#2b1d16"/>
      <g class="e-arm e-arm-l">
        <line x1="40" y1="100" x2="34" y2="118" stroke="#2b1d16" stroke-width="12" stroke-linecap="round"/>
        <line x1="40" y1="100" x2="34" y2="118" stroke="#ff7a2f" stroke-width="7.5" stroke-linecap="round"/>
        <circle cx="34" cy="118" r="5" fill="#2b1d16"/>
      </g>
      <g class="e-arm e-arm-r">
        <line x1="80" y1="100" x2="86" y2="118" stroke="#2b1d16" stroke-width="12" stroke-linecap="round"/>
        <line x1="80" y1="100" x2="86" y2="118" stroke="#ff7a2f" stroke-width="7.5" stroke-linecap="round"/>
        <circle cx="86" cy="118" r="5" fill="#2b1d16"/>
      </g>
    </g>
    <g class="e-head">
      <g class="e-ear e-ear-l">
        <path d="M33 54 L26 10 L57 37 Z" fill="#ff7a2f" ${ink}/>
        <path d="M35 45 L31 21 L48 37 Z" fill="#2b1d16"/>
      </g>
      <g class="e-ear e-ear-r">
        <path d="M87 54 L94 10 L63 37 Z" fill="#ff7a2f" ${ink}/>
        <path d="M85 45 L89 21 L72 37 Z" fill="#2b1d16"/>
      </g>
      <path d="M57 33 C53 24 60 17 69 20 C63 22 62 27 63 33 Z" fill="#ff7a2f" ${ink}/>
      <path d="M28 60 C28 40 43 31 60 31 C77 31 92 40 92 60 L100 70 L89 71 L92 79 L80 80 C74 86 67 88 60 88 C53 88 46 86 40 80 L28 79 L31 71 L20 70 Z" fill="#ff7a2f" ${ink}/>
      <path d="M33 66 C42 66 52 70 60 80 C68 70 78 66 87 66 C84 80 72 88 60 88 C48 88 36 80 33 66 Z" fill="#fff"/>
      <g class="e-blush" stroke="#ff6f8e" stroke-width="1.8" stroke-linecap="round">
        <path d="M34 72 l3 -5 M38 72 l3 -5 M42 72 l3 -5"/>
        <path d="M75 72 l3 -5 M79 72 l3 -5 M83 72 l3 -5"/>
      </g>
      <g class="e-eyes-open">${mangaEye(46)}${mangaEye(74)}
        <path d="M37 51 Q45 44 55 50 M83 51 Q75 44 65 50" fill="none" stroke="#2b1d16" stroke-width="2.6" stroke-linecap="round"/>
      </g>
      <g class="e-eyes-happy" fill="none" stroke="#2b1d16" stroke-width="3.8" stroke-linecap="round">
        <path d="M38 60 Q46 48 54 60"/>
        <path d="M66 60 Q74 48 82 60"/>
      </g>
      <g class="e-eyes-sad">${mangaEye(46)}${mangaEye(74)}
        <path d="M38 47 L52 44 M82 47 L68 44" stroke="#2b1d16" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M95 40 C95 40 89 48 91 52 C93 55 98 54 98 50 C98 47 95 40 95 40 Z" fill="#8fd3ff" ${ink}/>
      </g>
      <path d="M56 73 L64 73 L60 77 Z" fill="#2b1d16" ${ink}/>
      <path class="e-mouth-wait" d="M54 80 Q57 84 60 80 Q63 84 66 80" fill="none" stroke="#2b1d16" stroke-width="2.2" stroke-linecap="round"/>
      <g class="e-mouth-happy">
        <path d="M51 79 Q60 94 69 79 Z" fill="#7a2e1e" ${ink}/>
        <path d="M55 86 Q60 91 65 86 Q60 84 55 86 Z" fill="#ff8fa3"/>
        <path d="M55 80 L57 84 L59 80 Z" fill="#fff"/>
      </g>
      <path class="e-mouth-sad" d="M55 84 Q60 80 65 84" fill="none" stroke="#2b1d16" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <g class="e-sparkles" fill="#ffe14d" stroke="#2b1d16" stroke-width="1.4" stroke-linejoin="round">
      <path d="M14 28 Q16 38 26 40 Q16 42 14 52 Q12 42 2 40 Q12 38 14 28 Z"/>
      <path d="M106 16 Q107.5 24 115 25.5 Q107.5 27 106 35 Q104.5 27 97 25.5 Q104.5 24 106 16 Z"/>
      <path d="M109 96 Q110 102 116 103 Q110 104 109 110 Q108 104 102 103 Q108 102 109 96 Z"/>
    </g>`;

  // ---------- Origami: folded paper, flat facets and no curves ----------
  const origami = `
    <g class="e-tail">
      <polygon points="74,114 96,72 104,100" fill="#f59b52"/>
      <polygon points="96,72 115,63 104,100" fill="#d8692a"/>
      <polygon points="96,72 106,54 115,63" fill="#fff4e6"/>
      <polygon points="106,54 115,63 112,52" fill="#e6d8c4"/>
    </g>
    <g class="e-body">
      <polygon points="36,98 60,88 60,132 40,128" fill="#f59b52"/>
      <polygon points="60,88 84,98 80,128 60,132" fill="#d8692a"/>
      <polygon points="48,95 60,95 60,124" fill="#fff4e6"/>
      <polygon points="60,95 72,95 60,124" fill="#e6d8c4"/>
      <polygon points="38,128 54,128 50,135 38,135" fill="#5b3a29"/>
      <polygon points="66,128 82,128 82,135 70,135" fill="#3f281c"/>
      <g class="e-arm e-arm-l">
        <polygon points="37,99 43,101 37,119 31,117" fill="#d8692a"/>
        <polygon points="34,114 39,118 34,123 29,118" fill="#5b3a29"/>
      </g>
      <g class="e-arm e-arm-r">
        <polygon points="83,99 77,101 83,119 89,117" fill="#c45d22"/>
        <polygon points="86,114 91,118 86,123 81,118" fill="#3f281c"/>
      </g>
    </g>
    <g class="e-head">
      <g class="e-ear e-ear-l">
        <polygon points="29,14 52,36 33,50" fill="#f59b52"/>
        <polygon points="32,23 45,36 35,44" fill="#5b3a29"/>
      </g>
      <g class="e-ear e-ear-r">
        <polygon points="91,14 68,36 87,50" fill="#d8692a"/>
        <polygon points="88,23 75,36 85,44" fill="#3f281c"/>
      </g>
      <polygon points="34,38 60,30 60,64 24,58" fill="#f59b52"/>
      <polygon points="60,30 86,38 96,58 60,64" fill="#d8692a"/>
      <polygon points="24,58 60,64 60,90" fill="#fff4e6"/>
      <polygon points="96,58 60,64 60,90" fill="#e6d8c4"/>
      <g class="e-blush" fill="#ff8fa3">
        <polygon points="34,66 42,67 37,71"/>
        <polygon points="86,66 78,67 83,71"/>
      </g>
      <g class="e-eyes-open" fill="#2b1d16">
        <polygon points="41,55 47,51 53,55 47,60"/>
        <polygon points="67,55 73,51 79,55 73,60"/>
        <polygon points="47,52 49.5,53.5 47,55" fill="#fff"/>
        <polygon points="73,52 75.5,53.5 73,55" fill="#fff"/>
      </g>
      <g class="e-eyes-happy" fill="none" stroke="#2b1d16" stroke-width="3.2" stroke-linejoin="miter" stroke-linecap="square">
        <polyline points="41,59 47,52 53,59"/>
        <polyline points="67,59 73,52 79,59"/>
      </g>
      <g class="e-eyes-sad" fill="#2b1d16">
        <polygon points="43,58 47,55 51,58 47,62"/>
        <polygon points="69,58 73,55 77,58 73,62"/>
        <path d="M40 51 L52 47 M80 51 L68 47" stroke="#5b3a29" stroke-width="2.6"/>
      </g>
      <polygon points="54,71 66,71 60,77" fill="#2b1d16"/>
      <polygon class="e-mouth-wait" points="56,80 64,80 60,85" fill="#7a2e1e"/>
      <g class="e-mouth-happy">
        <polygon points="52,79 68,79 60,89" fill="#7a2e1e"/>
        <polygon points="56,84 64,84 60,89" fill="#ff8fa3"/>
      </g>
      <polyline class="e-mouth-sad" points="55,84 60,81 65,84" fill="none" stroke="#2b1d16" stroke-width="2.2"/>
    </g>
    <g class="e-sparkles">
      <polygon points="14,28 18,38 14,52 10,38" fill="#ffd23f"/>
      <polygon points="2,40 14,36 26,40 14,44" fill="#f2b705"/>
      <polygon points="104,20 107,27 104,38 101,27" fill="#ffd23f"/>
      <polygon points="96,29 104,26 112,29 104,32" fill="#f2b705"/>
      <polygon points="108,98 110,104 108,112 106,104" fill="#ffd23f"/>
    </g>`;

  window.AVATARS = [
    { id: "classic", name: "Ember", svg: classic },
    { id: "snowy", name: "Snowy", svg: snowy },
    { id: "pixel", name: "Pixel", svg: pixel, crisp: true },
    { id: "manga", name: "Manga", svg: manga },
    { id: "origami", name: "Origami", svg: origami },
  ];
})();
