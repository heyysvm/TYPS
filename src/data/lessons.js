export const lessons = [
  {
    id: 1,
    title: "Lesson 1: Home Row Anchors (F & J)",
    keys: ["f", "j"],
    targetWpm: 20,
    targetAccuracy: 95,
    description: "Learn your home-row anchor keys, F and J. Place your left index finger on F, right index finger on J.",
    steps: [
      { type: "single-key", text: "f f f f f", desc: "Type 'f' using your Left Index Finger. Keep resting." },
      { type: "single-key", text: "j j j j j", desc: "Type 'j' using your Right Index Finger. Keep resting." },
      { type: "alternate", text: "f j f j", desc: "Alternate between F and J. Shift focus between fingers." },
      { type: "double", text: "ff jj ff jj", desc: "Type double presses for F and J." },
      { type: "triple", text: "fff jjj", desc: "Type triple presses for F and J." },
      { type: "quad", text: "ffff jjjj", desc: "Type quadruple presses for F and J." },
      { type: "short-combo", text: "fj jf fj jf", desc: "Type alternating pairs quickly." },
      { type: "double-combo", text: "fjfj jfjf", desc: "Type alternating double pairs." },
      { type: "mixed", text: "ffff jjjj fjfj jfjf", desc: "Final mixed combinations for Lesson 1." }
    ]
  },
  {
    id: 2,
    title: "Lesson 2: Adding D & K",
    keys: ["d", "k"],
    targetWpm: 22,
    targetAccuracy: 95,
    description: "Learn home-row middle fingers, D and K. Left middle on D, right middle on K.",
    steps: [
      { type: "single-key", text: "d d d d d", desc: "Type 'd' using your Left Middle Finger." },
      { type: "single-key", text: "k k k k k", desc: "Type 'k' using your Right Middle Finger." },
      { type: "alternate", text: "d k d k", desc: "Alternate between D and K." },
      { type: "double", text: "dd kk dd kk", desc: "Type double presses for D and K." },
      { type: "combo", text: "dk kd dk kd", desc: "Type alternating middle finger pairs." },
      { type: "mixed-row", text: "fjdk kdjf ddd kkk", desc: "Mix middle fingers with anchor index fingers." },
      { type: "words", text: "jkdf dkfj fkdj jkdf", desc: "Practice basic finger patterns." }
    ]
  },
  {
    id: 3,
    title: "Lesson 3: Adding S & L",
    keys: ["s", "l"],
    targetWpm: 24,
    targetAccuracy: 95,
    description: "Learn home-row ring fingers, S and L. Left ring on S, right ring on L.",
    steps: [
      { type: "single-key", text: "s s s s s", desc: "Type 's' using your Left Ring Finger." },
      { type: "single-key", text: "l l l l l", desc: "Type 'l' using your Right Ring Finger." },
      { type: "alternate", text: "s l s l", desc: "Alternate between S and L." },
      { type: "double", text: "ss ll ss ll", desc: "Type double presses for S and L." },
      { type: "combo", text: "sl ls sl ls", desc: "Type alternating ring finger pairs." },
      { type: "mixed-row", text: "dslf ksld fjsl lskd", desc: "Combine index, middle, and ring fingers." },
      { type: "words", text: "slkd dkfj dslf jksl", desc: "Complete home-row patterns." }
    ]
  },
  {
    id: 4,
    title: "Lesson 4: Adding A & ;",
    keys: ["a", ";"],
    targetWpm: 25,
    targetAccuracy: 95,
    description: "Learn home-row pinky fingers, A and ;. Left pinky on A, right pinky on ;.",
    steps: [
      { type: "single-key", text: "a a a a a", desc: "Type 'a' using your Left Pinky Finger." },
      { type: "single-key", text: "; ; ; ; ;", desc: "Type ';' using your Right Pinky Finger." },
      { type: "alternate", text: "a ; a ;", desc: "Alternate between A and Semicolon." },
      { type: "double", text: "aa ;; aa ;;", desc: "Type double presses for A and Semicolon." },
      { type: "combo", text: "a; ;a a; ;a", desc: "Type alternating pinky finger pairs." },
      { type: "mixed-row", text: "asdf jkl; a;la s;ld", desc: "Type all fingers on the home row." },
      { type: "words", text: "k;sa adas s;ld k;sa", desc: "Review complete home row positions." }
    ]
  },
  {
    id: 5,
    title: "Lesson 5: Home Row Review",
    keys: ["f", "j", "d", "k", "s", "l", "a", ";"],
    targetWpm: 25,
    targetAccuracy: 95,
    description: "Review all home row keys together. Form simple real words using only the home row.",
    steps: [
      { type: "warmup", text: "asdf jkl; asdf jkl;", desc: "Practice moving through all home row keys." },
      { type: "words", text: "fall sad ask glass", desc: "Type real words using index and pinky fingers." },
      { type: "words", text: "salad alas flask salad", desc: "Type words with varying finger reaches." },
      { type: "words", text: "all dad ads lasses", desc: "Practice repeated keys and endings." },
      { type: "mixed", text: "alfalfa fall flask salad glad", desc: "Final review of home row anchors." }
    ]
  },
  {
    id: 6,
    title: "Lesson 6: Adding E & I",
    keys: ["e", "i"],
    targetWpm: 28,
    targetAccuracy: 95,
    description: "Reach up to the top row middle fingers, E and I. Left middle reaches to E, right middle reaches to I.",
    steps: [
      { type: "single-key", text: "e e e e e", desc: "Type 'e' by reaching up with your Left Middle Finger." },
      { type: "single-key", text: "i i i i i", desc: "Type 'i' by reaching up with your Right Middle Finger." },
      { type: "alternate", text: "e i e i", desc: "Alternate between E and I." },
      { type: "double", text: "ee ii ee ii", desc: "Type double presses for E and I." },
      { type: "reach-combo", text: "de ed ki ik", desc: "Practice reaching from home row middle to top row middle." },
      { type: "words", text: "side life file desk", desc: "Type words using top row middle reaches." },
      { type: "words", text: "idle self kiss line", desc: "Form common words with E and I." }
    ]
  },
  {
    id: 7,
    title: "Lesson 7: Adding R & U",
    keys: ["r", "u"],
    targetWpm: 30,
    targetAccuracy: 95,
    description: "Reach up to top row index fingers, R and U. Left index reaches up to R, right index reaches up to U.",
    steps: [
      { type: "single-key", text: "r r r r r", desc: "Type 'r' by reaching up with your Left Index Finger." },
      { type: "single-key", text: "u u u u u", desc: "Type 'u' by reaching up with your Right Index Finger." },
      { type: "alternate", text: "r u r u", desc: "Alternate between R and U." },
      { type: "reach-combo", text: "fr rf ju uj", desc: "Practice reaching from home row index to top row index." },
      { type: "words", text: "rude user sure fire", desc: "Type real words using R and U reaches." },
      { type: "words", text: "rise rule dirt free", desc: "Type words containing mixed top-row index keys." },
      { type: "words", text: "full dust rust fuel", desc: "More practice with R and U." }
    ]
  },
  {
    id: 8,
    title: "Lesson 8: Adding G & H",
    keys: ["g", "h"],
    targetWpm: 32,
    targetAccuracy: 95,
    description: "Reach sideways with index fingers on the home row, G and H. Left index to G, right index to H.",
    steps: [
      { type: "single-key", text: "g g g g g", desc: "Press 'g' by reaching sideways with your Left Index Finger." },
      { type: "single-key", text: "h h h h h", desc: "Press 'h' by reaching sideways with your Right Index Finger." },
      { type: "alternate", text: "g h g h", desc: "Alternate between G and H." },
      { type: "reach-combo", text: "fg gf jh hj", desc: "Practice horizontal home row index reaches." },
      { type: "words", text: "high huge hill glad", desc: "Type words containing G and H." },
      { type: "words", text: "gold good hair head", desc: "Focus on finger return after horizontal stretching." }
    ]
  },
  {
    id: 9,
    title: "Lesson 9: Adding T & Y",
    keys: ["t", "y"],
    targetWpm: 33,
    targetAccuracy: 95,
    description: "Reach up and sideways to top row index stretches, T and Y. Left index to T, right index to Y.",
    steps: [
      { type: "single-key", text: "t t t t t", desc: "Press 't' by reaching up-sideways with your Left Index Finger." },
      { type: "single-key", text: "y y y y y", desc: "Press 'y' by reaching up-sideways with your Right Index Finger." },
      { type: "alternate", text: "t y t y", desc: "Alternate between T and Y." },
      { type: "reach-combo", text: "ft tf jy yj", desc: "Practice stretching fingers up and inward." },
      { type: "words", text: "they that this they", desc: "Type common words using T and Y stretches." },
      { type: "words", text: "youth duty test try", desc: "Combine stretching fingers with index home anchors." }
    ]
  },
  {
    id: 10,
    title: "Lesson 10: Adding O & W",
    keys: ["o", "w"],
    targetWpm: 35,
    targetAccuracy: 95,
    description: "Reach up with ring fingers to top row keys, O and W. Left ring reaches to W, right ring reaches to O.",
    steps: [
      { type: "single-key", text: "w w w w w", desc: "Press 'w' by reaching up with your Left Ring Finger." },
      { type: "single-key", text: "o o o o o", desc: "Press 'o' by reaching up with your Right Ring Finger." },
      { type: "alternate", text: "w o w o", desc: "Alternate between W and O." },
      { type: "reach-combo", text: "sw ws lo ol", desc: "Practice reaching from home ring to top ring." },
      { type: "words", text: "show grow work flow", desc: "Type words using W and O reaches." },
      { type: "words", text: "word slow wood look", desc: "Focus on ring finger precision." }
    ]
  },
  {
    id: 11,
    title: "Lesson 11: Adding Q & P",
    keys: ["q", "p"],
    targetWpm: 35,
    targetAccuracy: 95,
    description: "Reach up with pinky fingers to top row keys, Q and P. Left pinky to Q, right pinky to P.",
    steps: [
      { type: "single-key", text: "q q q q q", desc: "Press 'q' by reaching up with your Left Pinky Finger." },
      { type: "single-key", text: "p p p p p", desc: "Press 'p' by reaching up with your Right Pinky Finger." },
      { type: "alternate", text: "q p q p", desc: "Alternate between Q and P." },
      { type: "reach-combo", text: "aq qa ;p p;", desc: "Practice reaching from home pinky to top pinky." },
      { type: "words", text: "quick quiet paper power", desc: "Type words using pinky reaches." },
      { type: "words", text: "space split price quote", desc: "Form complex words utilizing outer fingers." }
    ]
  },
  {
    id: 12,
    title: "Lesson 12: Bottom Row Index (V B M N)",
    keys: ["v", "b", "m", "n"],
    targetWpm: 36,
    targetAccuracy: 95,
    description: "Reach down to bottom row index keys, V, B, M, and N. Left index to V/B, right index to M/N.",
    steps: [
      { type: "single-key", text: "v v v v v", desc: "Press 'v' by reaching down-sideways with your Left Index Finger." },
      { type: "single-key", text: "b b b b b", desc: "Press 'b' by reaching down-sideways with your Left Index Finger." },
      { type: "single-key", text: "n n n n n", desc: "Press 'n' by reaching down-sideways with your Right Index Finger." },
      { type: "single-key", text: "m m m m m", desc: "Press 'm' by reaching down-sideways with your Right Index Finger." },
      { type: "alternate", text: "v b m n", desc: "Alternate bottom row index inputs." },
      { type: "reach-combo", text: "fv vf jn nj jm mj", desc: "Practice reaching downward from index positions." },
      { type: "words", text: "move name band give", desc: "Type words with bottom-row index reaches." },
      { type: "words", text: "verb back many very", desc: "Build muscle memory for lower reaches." }
    ]
  },
  {
    id: 13,
    title: "Lesson 13: Bottom Row Remaining (C X Z , . /)",
    keys: ["c", "x", "z", ",", ".", "/"],
    targetWpm: 38,
    targetAccuracy: 95,
    description: "Learn bottom row pinky, ring, and middle finger reaches: C, X, Z, comma, period, and slash.",
    steps: [
      { type: "single-key", text: "c c c c c", desc: "Press 'c' by reaching down with your Left Middle Finger." },
      { type: "single-key", text: "x x x x x", desc: "Press 'x' by reaching down with your Left Ring Finger." },
      { type: "single-key", text: "z z z z z", desc: "Press 'z' by reaching down with your Left Pinky Finger." },
      { type: "single-key", text: ", , , , ,", desc: "Press ',' by reaching down with your Right Middle Finger." },
      { type: "single-key", text: ". . . . .", desc: "Press '.' by reaching down with your Right Ring Finger." },
      { type: "single-key", text: "/ / / / /", desc: "Press '/' by reaching down with your Right Pinky Finger." },
      { type: "words", text: "call city check exit", desc: "Type words with middle finger reaches." },
      { type: "punctuation", text: "car, cat, dog.", desc: "Practice common punctuation reaches." }
    ]
  },
  {
    id: 14,
    title: "Lesson 14: Shift Key & Capital Letters",
    keys: ["Shift"],
    targetWpm: 35,
    targetAccuracy: 95,
    description: "Learn to use Shift keys for capitalization. Press Shift with the hand opposite to the letter key hand.",
    steps: [
      { type: "shift-reach", text: "F J D K S L A", desc: "Press Shift with right pinky, type home row letters with left hand." },
      { type: "shift-reach", text: "J F K D L S ; A", desc: "Alternate shifting hands. Pay close attention to opposite hands." },
      { type: "capital-words", text: "The Quick Brown Fox", desc: "Type capitalized phrases." },
      { type: "sentences", text: "React Vite Javascript CSS", desc: "Type programming words with capitals." }
    ]
  },
  {
    id: 15,
    title: "Lesson 15: Numbers & Symbols",
    keys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
    targetWpm: 30,
    targetAccuracy: 95,
    description: "Complete your training by learning number row keys and common code symbols. Keep home row alignment.",
    steps: [
      { type: "single-key", text: "1 2 3 4 5", desc: "Type numbers 1-5 using left hand fingers." },
      { type: "single-key", text: "6 7 8 9 0", desc: "Type numbers 6-0 using right hand fingers." },
      { type: "math-combo", text: "5 + 3 = 8", desc: "Combine numbers with mathematical symbols." },
      { type: "code-phrases", text: "width: 100%; border: 1px;", desc: "Type CSS style declarations." },
      { type: "brackets", text: "[1, 2, 3] = test", desc: "Type bracket and brace code combinations." }
    ]
  }
];
