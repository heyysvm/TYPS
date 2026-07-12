import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, CheckCircle, Lock, Award, RotateCcw, Play, ChevronRight, Volume2, VolumeX, Eye, HelpCircle, ArrowRight, Clipboard, Sun, Moon } from 'lucide-react';
import { lessons } from '../data/lessons';
import { keyboardRows, getRequiredKeys, getFingerName, charToKeyMap } from '../data/keyboard';
import { useTheme } from '../context/ThemeContext';

const WORD_POOL = [
  "the","be","to","of","and","a","in","that","have","it","for","not","on","with",
  "he","as","you","do","at","this","but","his","by","from","they","we","say","her",
  "she","or","an","will","my","one","all","would","there","their","what","so","up",
  "out","if","about","who","get","which","go","me","when","make","can","like","time",
  "no","just","him","know","take","people","into","year","your","good","some","could",
  "them","see","other","than","then","now","look","only","come","its","over","think",
  "also","back","after","use","two","how","our","work","first","well","way","even",
  "new","want","because","any","these","give","day","most","us","great","between",
  "need","large","often","hand","high","place","hold","turn","here","why","help","put",
  "different","away","again","off","home","read","seem","found","still","should",
  "learn","plant","food","sun","four","state","keep","eye","never","last","let",
  "thought","city","tree","farm","hard","start","might","story","saw","far","sea",
  "draw","left","late","run","while","press","close","night","real","life","few",
  "north","open","together","next","white","children","begin","got","walk","ease",
  "paper","group","always","music","those","both","mark","book","letter","until",
  "mile","river","car","feet","care","second","enough","plain","girl","young","ready",
  "above","ever","red","list","though","feel","talk","bird","soon","body","dog",
  "family","direct","pose","name","set","old","air","line","mother","answer",
  "world","every","near","add","own","below","country","school","father"
];

function generateMixedText(keys, count = 120) {
  const result = [];
  const cleanKeys = keys.filter(k => k.toLowerCase() !== 'shift');
  const cleanLen = cleanKeys.length;
  
  if (cleanLen <= 0) return "test";

  if (cleanLen <= 6) {
    for (let i = 0; i < count; i++) {
      let word = "";
      const wordLen = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < wordLen; j++) {
        word += cleanKeys[Math.floor(Math.random() * cleanLen)];
      }
      result.push(word);
    }
  } else {
    const allowedSet = new Set(cleanKeys.map(k => k.toLowerCase()));
    const filtered = WORD_POOL.filter(w => 
      w.split('').every(char => allowedSet.has(char))
    );
    const activePool = filtered.length >= 10 ? filtered : cleanKeys;
    for (let i = 0; i < count; i++) {
      if (activePool === cleanKeys) {
        let word = "";
        const wordLen = 3 + Math.floor(Math.random() * 4);
        for (let j = 0; j < wordLen; j++) {
          word += cleanKeys[Math.floor(Math.random() * cleanLen)];
        }
        result.push(word);
      } else {
        result.push(activePool[Math.floor(Math.random() * activePool.length)]);
      }
    }
  }
  return result.join(" ");
}

export default function Learn({ sound: globalSound }) {
  // --- Theme Access Hooks ---
  const { theme: activeTheme, setTheme: setActiveTheme, themes: allThemes, baseTheme, toggleBaseTheme } = useTheme();

  // --- Page Mode State ---
  const [practiceTab, setPracticeTab] = useState("lessons"); // lessons | manual
  
  // --- Lesson Run States ---
  const [activeLessonId, setActiveLessonId] = useState(null); // null means dashboard list
  const [isOnboarding, setIsOnboarding] = useState(true); // onboarding screen before lesson
  const [currentStepIdx, setCurrentStepIdx] = useState(0); // active step index inside lesson
  const [demoState, setDemoState] = useState("typing"); // typing active
  const [typedText, setTypedText] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [mistakesMap, setMistakesMap] = useState({}); // { char: count }
  const [typingStatus, setTypingStatus] = useState("idle"); // idle | typing | finished
  
  // --- Final Step Mixed Time Drill state ---
  const [mixedDuration, setMixedDuration] = useState(60); // seconds
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeStepText, setActiveStepText] = useState("");
  const [activeStepDesc, setActiveStepDesc] = useState("");
  
  // --- Live Metrics ---
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  
  // --- Interactive key state & slide effect ---
  const [keyFlash, setKeyFlash] = useState({});
  const [shakeActive, setShakeActive] = useState(false);
  const [slideInActive, setSlideInActive] = useState(true);

  // --- Settings ---
  const [sound, setSound] = useState(globalSound);
  const [showFingerGuide, setShowFingerGuide] = useState(true);
  const [textSize, setTextSize] = useState("normal");
  const [reducedMotion, setReducedMotion] = useState(false);

  // --- LocalStorage Stats ---
  const [practiceStats, setPracticeStats] = useState({
    completedLessons: [],
    bestWpm: {},
    bestAcc: {},
    totalKeysTyped: 0,
    unlockedAchievements: [],
    weakKeys: {}
  });

  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Sound click builder
  const playClick = useCallback(() => {
    if (!sound) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800 + Math.random() * 200;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }, [sound]);

  // Load progress
  useEffect(() => {
    const saved = localStorage.getItem('typs_practice_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPracticeStats({
          completedLessons: parsed.completedLessons || [],
          bestWpm: parsed.bestWpm || {},
          bestAcc: parsed.bestAcc || {},
          totalKeysTyped: parsed.totalKeysTyped || 0,
          unlockedAchievements: parsed.unlockedAchievements || [],
          weakKeys: parsed.weakKeys || {}
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveStatsToStorage = (updated) => {
    setPracticeStats(updated);
    localStorage.setItem('typs_practice_stats', JSON.stringify(updated));
  };

  // Resolve current active lesson & step text
  const lesson = lessons.find(l => l.id === activeLessonId) || lessons[0];
  const step = lesson.steps && lesson.steps[currentStepIdx] ? lesson.steps[currentStepIdx] : { text: "", desc: "" };
  const targetText = activeStepText || step.text || "";

  // WPM/Acc Calculations
  const calculateWpm = useCallback((correctLen, timeSec) => {
    if (timeSec <= 0) return 0;
    const minutes = timeSec / 60;
    return Math.round((correctLen / 5) / minutes);
  }, []);

  const calculateAccuracy = useCallback((correctLen, totalMistakes) => {
    const totalTyped = correctLen + totalMistakes;
    if (totalTyped === 0) return 100;
    return Math.round((correctLen / totalTyped) * 100);
  }, []);

  const isFinalStep = lesson.steps && currentStepIdx === lesson.steps.length - 1;

  // Timer Tick
  useEffect(() => {
    if (typingStatus === "typing") {
      timerRef.current = setInterval(() => {
        const elapsedSec = (Date.now() - startTime) / 1000;
        setElapsed(elapsedSec);
        
        const correctCount = typedText.length;
        setWpm(calculateWpm(correctCount, elapsedSec));
        setAccuracy(calculateAccuracy(correctCount, mistakesCount));

        if (isFinalStep) {
          const remaining = Math.max(0, mixedDuration - elapsedSec);
          setTimeLeft(Math.ceil(remaining));
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            setTypingStatus("finished");
            handleLessonCompletion(correctCount, elapsedSec);
          }
        }
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [typingStatus, startTime, typedText, mistakesCount, calculateWpm, calculateAccuracy, isFinalStep, mixedDuration]);

  // Reset/Initialize step typing
  const resetStepPractice = useCallback(() => {
    setTypedText("");
    setStartTime(null);
    setElapsed(0);
    setWpm(0);
    setAccuracy(100);
    setKeyFlash({});
    setTypingStatus("idle");
    setSlideInActive(false);
    
    // Trigger entry slide animation
    setTimeout(() => setSlideInActive(true), 50);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (isFinalStep) {
      const generated = generateMixedText(lesson.keys, 150);
      setActiveStepText(generated);
      setActiveStepDesc("Mixed review time drill: type for the selected duration.");
      setTimeLeft(mixedDuration);
    } else {
      setActiveStepText(step.text || "");
      setActiveStepDesc(step.desc || "");
    }
  }, [isFinalStep, lesson.keys, step.text, step.desc, mixedDuration]);

  // Reset when lesson or step index changes
  useEffect(() => {
    if (activeLessonId !== null && !isOnboarding) {
      resetStepPractice();
    }
  }, [activeLessonId, currentStepIdx, isOnboarding, resetStepPractice]);

  // Focus utility
  const focusInput = () => {
    if (inputRef.current && demoState === "typing") {
      inputRef.current.focus();
    }
  };

  // Keep input focused when typing state active
  useEffect(() => {
    if (activeLessonId !== null && !isOnboarding && demoState === "typing") {
      focusInput();
      const clickHandler = () => focusInput();
      document.addEventListener('click', clickHandler);
      return () => document.removeEventListener('click', clickHandler);
    }
  }, [activeLessonId, isOnboarding, demoState]);

  // Key Event Handler
  const handleKeyDown = (e) => {
    if (typingStatus === "finished" || demoState !== "typing") return;

    const { key } = e;
    if (key.length !== 1 && key !== "Backspace") return;

    if (key === "Backspace") {
      e.preventDefault();
      if (typedText.length > 0) {
        setTypedText(prev => prev.slice(0, -1));
        playClick();
      }
      return;
    }

    e.preventDefault();

    let currentStartTime = startTime;
    if (typingStatus === "idle") {
      currentStartTime = Date.now();
      setStartTime(currentStartTime);
      setTypingStatus("typing");
    }

    const currentIndex = typedText.length;
    const expectedChar = targetText[currentIndex];

    if (key === expectedChar) {
      playClick();
      const newTyped = typedText + key;
      setTypedText(newTyped);

      // Flash key green
      const expectedKeyIds = getRequiredKeys(expectedChar);
      const flash = {};
      expectedKeyIds.forEach(id => { flash[id] = 'correct'; });
      setKeyFlash(prev => ({ ...prev, ...flash }));
      setTimeout(() => {
        setKeyFlash(prev => {
          const next = { ...prev };
          expectedKeyIds.forEach(id => delete next[id]);
          return next;
        });
      }, 150);

      // Check if we need to append more text for infinite stream
      if (isFinalStep && newTyped.length >= targetText.length - 20) {
        const additional = generateMixedText(lesson.keys, 50);
        setActiveStepText(prev => prev + " " + additional);
      }

      // Check if step is complete (only for non-mixed steps)
      if (!isFinalStep && newTyped.length === targetText.length) {
        handleStepCompletion();
      }
    } else {
      // Mistake!
      setMistakesCount(prev => prev + 1);
      setMistakesMap(prev => ({
        ...prev,
        [expectedChar]: (prev[expectedChar] || 0) + 1
      }));

      // Shake animation & red key flash
      setShakeActive(true);
      setTimeout(() => setShakeActive(false), 250);

      const expectedKeyIds = getRequiredKeys(expectedChar);
      const flash = {};
      expectedKeyIds.forEach(id => { flash[id] = 'wrong'; });
      setKeyFlash(prev => ({ ...prev, ...flash }));
      setTimeout(() => {
        setKeyFlash(prev => {
          const next = { ...prev };
          expectedKeyIds.forEach(id => delete next[id]);
          return next;
        });
      }, 200);
    }
  };

  // Step Completion logic
  const handleStepCompletion = () => {
    if (currentStepIdx < lesson.steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      setTypingStatus("finished");
      handleLessonCompletion();
    }
  };

  // Lesson Completion logic
  const handleLessonCompletion = (lengthOverride, elapsedOverride) => {
    const finalElapsed = elapsedOverride !== undefined ? elapsedOverride : (Date.now() - startTime) / 1000;
    const finalLength = lengthOverride !== undefined ? lengthOverride : targetText.length;
    const finalWpm = calculateWpm(finalLength, finalElapsed);
    const finalAcc = calculateAccuracy(finalLength, mistakesCount);

    const passed = finalWpm >= lesson.targetWpm && finalAcc >= lesson.targetAccuracy;

    let updatedCompleted = [...practiceStats.completedLessons];
    if (passed && !updatedCompleted.includes(activeLessonId)) {
      updatedCompleted.push(activeLessonId);
    }

    const updatedBestWpm = { ...practiceStats.bestWpm };
    const updatedBestAcc = { ...practiceStats.bestAcc };
    if (!updatedBestWpm[activeLessonId] || finalWpm > updatedBestWpm[activeLessonId]) {
      updatedBestWpm[activeLessonId] = finalWpm;
    }
    if (!updatedBestAcc[activeLessonId] || finalAcc > updatedBestAcc[activeLessonId]) {
      updatedBestAcc[activeLessonId] = finalAcc;
    }

    const updatedWeakKeys = { ...practiceStats.weakKeys };
    Object.entries(mistakesMap).forEach(([char, count]) => {
      updatedWeakKeys[char] = (updatedWeakKeys[char] || 0) + count;
    });

    const newKeysTyped = practiceStats.totalKeysTyped + finalLength;
    const unlocked = [...practiceStats.unlockedAchievements];

    if (passed && !unlocked.includes('first_lesson') && activeLessonId === 1) unlocked.push('first_lesson');
    if (!unlocked.includes('keys_1000') && newKeysTyped >= 1000) unlocked.push('keys_1000');
    if (!unlocked.includes('accuracy_95') && finalAcc >= 95) unlocked.push('accuracy_95');
    if (passed && !unlocked.includes('home_row_master') && activeLessonId === 5) unlocked.push('home_row_master');
    if (!unlocked.includes('wpm_50') && finalWpm >= 50) unlocked.push('wpm_50');
    if (!unlocked.includes('wpm_100') && finalWpm >= 100) unlocked.push('wpm_100');

    saveStatsToStorage({
      completedLessons: updatedCompleted,
      bestWpm: updatedBestWpm,
      bestAcc: updatedBestAcc,
      totalKeysTyped: newKeysTyped,
      unlockedAchievements: unlocked,
      weakKeys: updatedWeakKeys
    });
  };

  const getStarsCount = (wpmVal, accVal) => {
    if (wpmVal >= lesson.targetWpm + 15 && accVal >= 98) return 3;
    if (wpmVal >= lesson.targetWpm + 5 && accVal >= 95) return 2;
    return 1;
  };

  // Keyboard mapping details
  const currentExpectedChar = targetText[typedText.length] || null;
  const currentKeyIds = currentExpectedChar ? getRequiredKeys(currentExpectedChar) : [];
  const currentKeyInfo = currentExpectedChar ? charToKeyMap[currentExpectedChar] : null;
  const currentFinger = currentKeyInfo ? currentKeyInfo.finger : null;

  const nextExpectedChar = targetText[typedText.length + 1] || null;
  const nextKeyIds = nextExpectedChar ? getRequiredKeys(nextExpectedChar) : [];
  const nextKeyInfo = nextExpectedChar ? charToKeyMap[nextExpectedChar] : null;
  const nextFinger = nextKeyInfo ? nextKeyInfo.finger : null;

  // Custom mock weak keys lesson practice
  const handlePracticeWeakKeys = () => {
    const sortedWeak = Object.entries(practiceStats.weakKeys)
      .filter(([char]) => char !== ' ' && char !== '\n')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([char]) => char);

    if (sortedWeak.length === 0) return;

    let weakText = "";
    sortedWeak.forEach(char => {
      weakText += `${char.repeat(4)} `;
    });
    weakText = weakText.trim();

    const mockLessonId = -1;
    const mockLesson = {
      id: mockLessonId,
      title: `Practice: Weak Keys Focus (${sortedWeak.join(', ').toUpperCase()})`,
      keys: sortedWeak,
      targetWpm: 25,
      targetAccuracy: 95,
      description: "Focus on your historically weak characters to build correct muscle memory anchors.",
      steps: [
        { type: "single-key", text: sortedWeak.map(c => `${c} ${c}`).join(' '), desc: "Warmup: slow presses." },
        { type: "words", text: weakText, desc: "Type repeating combos." }
      ]
    };

    lessons.push(mockLesson);
    setActiveLessonId(mockLessonId);
    setIsOnboarding(true);
    setCurrentStepIdx(0);
  };

  useEffect(() => {
    return () => {
      const idx = lessons.findIndex(l => l.id === -1);
      if (idx !== -1) lessons.splice(idx, 1);
    };
  }, [activeLessonId]);

  const ACHIEVEMENTS_LIST = [
    { id: 'first_lesson', title: 'First Steps', desc: 'Complete Lesson 1', icon: '🌱' },
    { id: 'home_row_master', title: 'Home Row Master', desc: 'Complete Lesson 5', icon: '⌨️' },
    { id: 'accuracy_95', title: 'Sniper', desc: 'Finish with 95% Accuracy', icon: '🎯' },
    { id: 'keys_1000', title: 'Typing Enthusiast', desc: 'Type 1,000 Correct Keys', icon: '🔋' },
    { id: 'wpm_50', title: 'Speed Demon', desc: 'Achieve 50 WPM', icon: '⚡' },
    { id: 'wpm_100', title: 'Grandmaster', desc: 'Achieve 100 WPM', icon: '🏆' }
  ];

  // Helper: check if a key is a focus key for the current lesson
  const isFocusKey = (keyId) => {
    if (activeLessonId === null) return true;
    if (lesson.id === -1) return true;
    
    if (keyId === 'ShiftLeft' || keyId === 'ShiftRight') {
      return lesson.keys.includes('Shift');
    }
    
    let matched = false;
    keyboardRows.forEach(row => {
      row.forEach(k => {
        if (k.id === keyId) {
          if (k.key && lesson.keys.includes(k.key)) matched = true;
          if (k.shiftKey && lesson.keys.includes(k.shiftKey)) matched = true;
        }
      });
    });
    return matched;
  };

  return (
    <div className={`practice-container text-size-${textSize} ${reducedMotion ? 'reduced-motion' : ''}`}>
      
      {/* HEADER CONTROLS */}
      <div className="practice-header-dashboard" style={{ gridColumn: 'span 3', display: 'flex', gap: '12px', marginBottom: '8px' }}>
        <button
          className={`qc-toggle-btn ${practiceTab === 'lessons' && activeLessonId === null ? 'active' : ''}`}
          onClick={() => {
            setActiveLessonId(null);
            setPracticeTab("lessons");
          }}
        >
          <BookOpen size={14} />
          <span>Progressive Lessons</span>
        </button>
        <button
          className={`qc-toggle-btn ${practiceTab === 'manual' ? 'active' : ''}`}
          onClick={() => {
            setActiveLessonId(null);
            setPracticeTab("manual");
          }}
        >
          <Clipboard size={14} />
          <span>Learn Touch Typing (Guide)</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: LEARN TOUCH TYPING GUIDE MANUAL
          ========================================== */}
      {practiceTab === "manual" && (
        <div className="manual-learning-wrap" style={{ gridColumn: 'span 3' }}>
          <h2 className="page-header" style={{ display: 'flex', gap: '8px', fontSize: '1.5rem', marginBottom: '24px' }}>
            <Clipboard size={22} className="li-icon-done" />
            <span>Learn Touch Typing Guide</span>
          </h2>
          
          <div className="manual-layout-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            <div className="res-block">
              <span className="res-label">fundamentals</span>
              <h3 style={{ color: 'var(--text-hi)', fontSize: '1.125rem', margin: '4px 0 10px' }}>What is Touch Typing?</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Touch typing is the ability to type text using muscle memory without looking down at the keyboard keys. 
                By keeping your eyes anchored to the screen, you eliminate visual switching delays, dramatically raising typing accuracy and speed.
              </p>
            </div>

            <div className="res-block">
              <span className="res-label">ergonomics</span>
              <h3 style={{ color: 'var(--text-hi)', fontSize: '1.125rem', margin: '4px 0 10px' }}>Correct Sitting Posture</h3>
              <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.6', paddingLeft: '16px', margin: 0 }}>
                <li><strong>Straight Back:</strong> Sit back fully against your chair.</li>
                <li><strong>Elbows 90°:</strong> Relax shoulders, keep elbows at a right angle.</li>
                <li><strong>Monitor Position:</strong> Monitor should be at eye-level, arm's length away.</li>
                <li><strong>Wrists Level:</strong> Keep wrists parallel to desk; do not rest them on the frame.</li>
              </ul>
            </div>

            <div className="res-block">
              <span className="res-label">placement</span>
              <h3 style={{ color: 'var(--text-hi)', fontSize: '1.125rem', margin: '4px 0 10px' }}>Home Row Resting Placement</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '8px' }}>
                Fingers must rest on middle row keys when idle:
              </p>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                <div style={{ background: 'var(--bg3)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  Left hand: <strong>A S D F</strong>
                </div>
                <div style={{ background: 'var(--bg3)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  Right hand: <strong>J K L ;</strong>
                </div>
              </div>
            </div>

            <div className="res-block">
              <span className="res-label">tactile bumps</span>
              <h3 style={{ color: 'var(--text-hi)', fontSize: '1.125rem', margin: '4px 0 10px' }}>Why F & J Have Bumps</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                The physical ridges on the **F** and **J** keys act as tactile guides. They allow you to align both index fingers in the correct resting position without needing to peek down at the keyboard layout.
              </p>
            </div>

            <div className="res-block">
              <span className="res-label">rules</span>
              <h3 style={{ color: 'var(--text-hi)', fontSize: '1.125rem', margin: '4px 0 10px' }}>Golden Typing Rules</h3>
              <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.6', paddingLeft: '16px', margin: 0 }}>
                <li><strong>Never look down:</strong> Visual mapping builds incorrect finger muscle memory.</li>
                <li><strong>Return to Home Row:</strong> Move active finger to tap, then slide back instantly.</li>
                <li><strong>Accuracy over speed:</strong> Practice slowly. Speed will unlock naturally as accuracy reaches 98%.</li>
              </ul>
            </div>

            <div className="res-block primary">
              <span className="res-label">curriculum roadmap</span>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.125rem', margin: '4px 0 10px' }}>Touch Typing Roadmap</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)' }}>
                {['Home Row', 'Top Row', 'Bottom Row', 'Numbers', 'Symbols', 'Words', 'Sentences', 'Paragraphs', 'Speed Drills'].map((stepName, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--text-hi)' }}>{stepName}</span>
                    {i < 8 && <ArrowRight size={10} style={{ color: 'var(--accent)' }} />}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: PROGRESSIVE LESSONS (DASHBOARD LIST)
          ========================================== */}
      {practiceTab === "lessons" && activeLessonId === null && (
        <div className="lessons-dashboard-wrap" style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="page-header" style={{ fontSize: '1.5rem', margin: 0 }}>Progressive Keyboard Course</h2>
            {Object.keys(practiceStats.weakKeys).length > 0 && (
              <button className="practice-weak-btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={handlePracticeWeakKeys}>
                <Play size={12} /> Practice Weak Keys
              </button>
            )}
          </div>

          <div className="lessons-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {lessons.filter(l => l.id !== -1).map((l, index) => {
              const isCompleted = practiceStats.completedLessons.includes(l.id);
              const isUnlocked = true; // All lessons unlocked
              const bestWpm = practiceStats.bestWpm[l.id] || 0;
              const bestAcc = practiceStats.bestAcc[l.id] || 0;

              return (
                <div key={l.id} className={`res-block ${isCompleted ? 'primary' : ''}`} style={{ cursor: 'pointer', position: 'relative' }} onClick={() => [setActiveLessonId(l.id), setIsOnboarding(true), setCurrentStepIdx(0)]}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="res-label">Lesson {l.id}</span>
                    {isCompleted ? (
                      <span className="res-saved" style={{ margin: 0 }}>✓ Complete</span>
                    ) : (
                      <span style={{ fontSize: '0.625rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Ready</span>
                    )}
                  </div>
                  
                  <h3 style={{ color: 'var(--text-hi)', fontSize: '1.05rem', margin: '6px 0 8px' }}>{l.title.replace(`Lesson ${l.id}: `, "")}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '14px' }}>{l.description}</p>
                  
                  {isCompleted && (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      <div>Best: <span style={{ color: 'var(--text-hi)' }}>{bestWpm} WPM</span></div>
                      <div>Acc: <span style={{ color: 'var(--text-hi)' }}>{bestAcc}%</span></div>
                    </div>
                  )}
                  {!isCompleted && (
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                      Target: {l.targetWpm} WPM / {l.targetAccuracy}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          ONBOARDING INTRO CARD (BEFORE LESSON RUNS)
          ========================================== */}
      {activeLessonId !== null && isOnboarding && (
        <div className="onboarding-overlay-container" style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <div className="res-block" style={{ width: '100%', maxWidth: '640px', padding: '32px', animation: 'fadeUp 0.28s ease' }}>
            <span className="res-label">course introduction</span>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-hi)', margin: '8px 0 16px', fontFamily: 'var(--font-mono)' }}>{lesson.title}</h2>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
              {lesson.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px', textAlign: 'left' }}>
              <div>
                <h4 style={{ color: 'var(--text-hi)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '8px' }}>Your Objectives:</h4>
                <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '14px', lineHeight: '1.6' }}>
                  <li>Learn resting finger positions.</li>
                  <li>Type without looking at fingers.</li>
                  <li>Maintain posture controls.</li>
                  <li>Target: <strong>{lesson.targetWpm} WPM</strong> speed.</li>
                  <li>Target: <strong>{lesson.targetAccuracy}%</strong> accuracy.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-hi)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '8px' }}>Finger Rules:</h4>
                <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '14px', lineHeight: '1.6' }}>
                  <li>✓ Feel the bumps on F & J keys.</li>
                  <li>✓ Don't peek down.</li>
                  <li>✓ Use only active highlighted fingers.</li>
                  <li>✓ Return to Home Row instantly.</li>
                </ul>
              </div>
            </div>

            <div className="completion-actions-row">
              <button className="completion-btn secondary" onClick={() => setActiveLessonId(null)}>
                Back to Lessons
              </button>
              <button className="completion-btn primary" onClick={() => setIsOnboarding(false)}>
                Start Lesson <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          ACTIVE LESSON PRACTICE RUNNER
          ========================================== */}
      {activeLessonId !== null && !isOnboarding && (
        <>
          {/* LEFT PANEL: Steps list */}
          <div className="practice-left-panel">
            <div className="practice-section-header">
              <BookOpen size={16} />
              <h3>Course Progress</h3>
            </div>
            
            <div className="lessons-list" style={{ gap: '8px' }}>
              {lesson.steps.map((st, sIdx) => {
                const isStepCompleted = sIdx < currentStepIdx;
                const isStepActive = sIdx === currentStepIdx;

                return (
                  <button
                    key={sIdx}
                    className={`lesson-item-btn ${isStepActive ? 'active' : ''} ${isStepCompleted ? 'completed' : ''}`}
                    onClick={() => setCurrentStepIdx(sIdx)}
                    style={{ padding: '8px 10px' }}
                  >
                    <div className="li-status" style={{ width: '16px', height: '16px' }}>
                      {isStepCompleted ? (
                        <CheckCircle size={12} className="li-icon-done" />
                      ) : (
                        <div className="li-number" style={{ fontSize: '0.75rem' }}>{sIdx + 1}</div>
                      )}
                    </div>
                    <div className="li-content">
                      <div className="li-title" style={{ fontSize: '0.75rem' }}>{st.type.replace('-', ' ')}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="practice-progress-box" style={{ marginTop: '16px' }}>
              <div className="progress-label-row">
                <span>Step Progress</span>
                <span>{currentStepIdx + 1} / {lesson.steps.length}</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${((currentStepIdx + 1) / lesson.steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* CENTER PANEL: Typing Card, Keyboard, Hands */}
          <div className="practice-center-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {currentExpectedChar && (
              <div className="live-guidance-banner">
                <span>Type <kbd className="highlight-kbd">{currentExpectedChar === ' ' ? 'Space' : currentExpectedChar}</kbd> with your <strong>{getFingerName(currentFinger)}</strong>. Keep opposite fingers anchored.</span>
              </div>
            )}

            {/* Glassmorphic typing exercise card */}
            <div className={`practice-typing-wrap ${shakeActive ? 'shake' : ''} ${slideInActive ? 'fadeUp' : ''}`} style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
              padding: '40px 24px',
              textAlign: 'center',
              position: 'relative'
            }} onClick={focusInput}>
              
              {isFinalStep && typingStatus === 'idle' && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 12 }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Drill Duration:</span>
                  <select 
                    className="qc-select" 
                    value={mixedDuration} 
                    onChange={(e) => {
                      const dur = parseInt(e.target.value);
                      setMixedDuration(dur);
                      setTimeLeft(dur);
                    }}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-hi)', padding: '4px 8px', borderRadius: '4px' }}
                  >
                    <option value={60}>1 Minute</option>
                    <option value={120}>2 Minutes</option>
                    <option value={180}>3 Minutes</option>
                    <option value={240}>4 Minutes</option>
                    <option value={300}>5 Minutes</option>
                  </select>
                </div>
              )}

              {isFinalStep && typingStatus === 'typing' && (
                <div style={{ marginBottom: '20px', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 'bold' }}>
                  ⏰ Time Remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              )}

              <div className="practice-words-viewport">
                <div className="practice-words-container" style={{ justifyContent: 'center' }}>
                  {targetText.split("").map((char, index) => {
                    let charClass = "pr-ch";
                    if (index < typedText.length) {
                      charClass += typedText[index] === char ? " correct" : " wrong";
                    } else if (index === typedText.length) {
                      charClass += " current";
                    } else {
                      charClass += " pending";
                    }
                    return (
                      <span key={index} className={charClass}>
                        {char === " " ? "␣" : char}
                      </span>
                    );
                  })}
                </div>
              </div>

              <input
                ref={inputRef}
                type="text"
                className="ghost-input"
                onKeyDown={handleKeyDown}
                onChange={() => {}}
                value=""
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>

            {/* Virtual Keyboard */}
            <div className="virtual-keyboard" style={{ width: '100%' }}>
              {keyboardRows.map((row, rIdx) => (
                <div key={rIdx} className="keyboard-row">
                  {row.map(k => {
                    const isCurrent = currentKeyIds.includes(k.id);
                    const isNext = nextKeyIds.includes(k.id);
                    const flashStatus = keyFlash[k.id];
                    const focus = isFocusKey(k.id);
                    
                    let keyClass = `kb-key key-finger-${k.finger}`;
                    if (k.width) keyClass += ` width-${k.width}`;
                    if (k.isAnchor) keyClass += ' key-anchor';
                    
                    if (flashStatus === 'correct') keyClass += ' key-correct';
                    else if (flashStatus === 'wrong') keyClass += ' key-wrong';
                    else if (isCurrent) keyClass += ' key-current';
                    else if (isNext) keyClass += ' key-next';
                    
                    if (!focus) keyClass += ' key-dimmed';

                    return (
                      <div key={k.id} className={keyClass} style={{ opacity: focus ? 1 : 0.25 }}>
                        <span className="key-main-lbl">{k.label}</span>
                        {k.shiftLabel && <span className="key-shift-lbl">{k.shiftLabel}</span>}
                        {k.isAnchor && <span className="anchor-bump" />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* SVGs hands guide */}
            {showFingerGuide && (
              <div className="hands-visualizer-container" style={{ width: '100%' }}>
                <svg viewBox="0 0 400 130" className="hands-svg">
                  <g className="hand-group left-hand" transform="translate(40, 10)">
                    <path d="M 10 90 Q 20 110 50 110 Q 80 110 90 90" fill="none" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="15" cy="55" r="10" className={`hand-finger finger-left-pinky ${currentFinger === 'left-pinky' ? 'glow-finger' : ''} ${nextFinger === 'left-pinky' ? 'pulse-finger' : ''}`} />
                    <line x1="15" y1="65" x2="25" y2="90" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="35" cy="35" r="10" className={`hand-finger finger-left-ring ${currentFinger === 'left-ring' ? 'glow-finger' : ''} ${nextFinger === 'left-ring' ? 'pulse-finger' : ''}`} />
                    <line x1="35" y1="45" x2="40" y2="90" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="55" cy="25" r="10" className={`hand-finger finger-left-middle ${currentFinger === 'left-middle' ? 'glow-finger' : ''} ${nextFinger === 'left-middle' ? 'pulse-finger' : ''}`} />
                    <line x1="55" y1="35" x2="55" y2="90" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="75" cy="35" r="10" className={`hand-finger finger-left-index ${currentFinger === 'left-index' ? 'glow-finger' : ''} ${nextFinger === 'left-index' ? 'pulse-finger' : ''}`} />
                    <line x1="75" y1="45" x2="70" y2="90" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="100" cy="70" r="10" className={`hand-finger finger-left-thumb ${currentFinger === 'thumb' ? 'glow-finger' : ''} ${nextFinger === 'thumb' ? 'pulse-finger' : ''}`} />
                    <line x1="100" y1="80" x2="85" y2="95" stroke="var(--border)" strokeWidth="3" />
                    <text x="50" y="125" textAnchor="middle" className="hand-label">LEFT HAND</text>
                  </g>
                  <g className="hand-group right-hand" transform="translate(240, 10)">
                    <path d="M 10 90 Q 20 110 50 110 Q 80 110 90 90" fill="none" stroke="var(--border)" strokeWidth="3" transform="scale(-1, 1) translate(-100, 0)" />
                    <circle cx="15" cy="70" r="10" className={`hand-finger finger-right-thumb ${currentFinger === 'thumb' ? 'glow-finger' : ''} ${nextFinger === 'thumb' ? 'pulse-finger' : ''}`} />
                    <line x1="15" y1="80" x2="30" y2="95" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="40" cy="35" r="10" className={`hand-finger finger-right-index ${currentFinger === 'right-index' ? 'glow-finger' : ''} ${nextFinger === 'right-index' ? 'pulse-finger' : ''}`} />
                    <line x1="40" y1="45" x2="45" y2="90" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="60" cy="25" r="10" className={`hand-finger finger-right-middle ${currentFinger === 'right-middle' ? 'glow-finger' : ''} ${nextFinger === 'right-middle' ? 'pulse-finger' : ''}`} />
                    <line x1="60" y1="35" x2="60" y2="90" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="80" cy="35" r="10" className={`hand-finger finger-right-ring ${currentFinger === 'right-ring' ? 'glow-finger' : ''} ${nextFinger === 'right-ring' ? 'pulse-finger' : ''}`} />
                    <line x1="80" y1="45" x2="75" y2="90" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="100" cy="55" r="10" className={`hand-finger finger-right-pinky ${currentFinger === 'right-pinky' ? 'glow-finger' : ''} ${nextFinger === 'right-pinky' ? 'pulse-finger' : ''}`} />
                    <line x1="100" y1="65" x2="90" y2="90" stroke="var(--border)" strokeWidth="3" />
                    <text x="55" y="125" textAnchor="middle" className="hand-label">RIGHT HAND</text>
                  </g>
                </svg>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Live instructions & details stats */}
          <div className="practice-right-panel">
            <div className="practice-section-header">
              <Award size={16} />
              <h3>Session Stats</h3>
            </div>
            
            <div className="stats-box" style={{ gap: '10px' }}>
              <div className="p-stat-item" style={{ padding: '8px 12px' }}>
                <span className="p-stat-lbl">LIVE SPEED</span>
                <div className="p-stat-value" style={{ fontSize: '1.25rem' }}>{wpm} <span className="p-stat-unit">WPM</span></div>
              </div>
              <div className="p-stat-item" style={{ padding: '8px 12px' }}>
                <span className="p-stat-lbl">ACCURACY</span>
                <div className="p-stat-value" style={{ fontSize: '1.25rem' }}>{accuracy}%</div>
              </div>
            </div>

            <div className="practice-section-header" style={{ marginTop: '20px' }}>
              <HelpCircle size={16} />
              <h3>Instructions</h3>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {currentFinger ? (
                <>
                  <p style={{ marginBottom: '8px' }}>
                    ✔ Use your <strong>{getFingerName(currentFinger)}</strong>.
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    ✔ Keep opposite hands anchored on home row points (<strong>F</strong> and <strong>J</strong>).
                  </p>
                  <p>
                    ✔ Return fingers immediately back to <strong>ASDF JKL;</strong> after typing keys.
                  </p>
                </>
              ) : (
                <p>Ensure correct posture: straight spine, forearms level, feet flat on the floor.</p>
              )}
            </div>

            {/* Quick visual settings */}
            <div className="practice-section-header" style={{ marginTop: '20px' }}>
              <Eye size={16} />
              <h3>Settings</h3>
            </div>
            
            <div className="quick-controls-grid" style={{ gap: '6px' }}>
              <div className="qc-row">
                <span>Sound FX</span>
                <button className="qc-toggle-btn" onClick={() => setSound(!sound)}>
                  {sound ? <Volume2 size={12} /> : <VolumeX size={12} />}
                </button>
              </div>
              <div className="qc-row">
                <span>Show Hands</span>
                <button className={`qc-toggle-btn ${showFingerGuide ? 'active' : ''}`} onClick={() => setShowFingerGuide(!showFingerGuide)}>
                  <span>{showFingerGuide ? "ON" : "OFF"}</span>
                </button>
              </div>
              <div className="qc-row">
                <span>Motion</span>
                <button className={`qc-toggle-btn ${!reducedMotion ? 'active' : ''}`} onClick={() => setReducedMotion(!reducedMotion)}>
                  <span>{!reducedMotion ? "NORMAL" : "REDUCED"}</span>
                </button>
              </div>

              {/* Mode Toggle inside Learn */}
              <div className="qc-row">
                <span>Mode</span>
                <button className="qc-toggle-btn" onClick={toggleBaseTheme}>
                  <span>{baseTheme === 'dark' ? 'DARK' : 'LIGHT'}</span>
                </button>
              </div>

              {/* Accent Color Dot Toggles */}
              <div className="qc-row" style={{ marginTop: '4px' }}>
                <span>Theme Accent</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {Object.entries(allThemes).map(([name, vars]) => (
                    <button
                      key={name}
                      className={`theme-dot ${activeTheme === name ? 'active' : ''}`}
                      style={{ 
                        '--dot-color': vars['--accent'],
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: vars['--accent'],
                        border: activeTheme === name ? '2px solid var(--text-hi)' : '1px solid var(--border)',
                        padding: 0,
                        cursor: 'pointer'
                      }}
                      onClick={() => setActiveTheme(name)}
                      title={name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="restart-wrapper" style={{ marginTop: '20px' }}>
              <button className="practice-reset-btn" onClick={() => setActiveLessonId(null)}>
                Cancel Lesson
              </button>
            </div>
          </div>
        </>
      )}

      {/* ==========================================
          LESSON COMPLETION OVERLAY SCREEN MODAL
          ========================================== */}
      {typingStatus === "finished" && (
        <div className="modal-overlay">
          <div className="modal-box completion-modal" style={{ background: 'var(--bg2)' }}>
            <h2 className="completion-title">🎉 Lesson Complete</h2>
            <p className="completion-desc">{lesson.title}</p>
            
            <div className="stars-row">
              {Array.from({ length: 3 }).map((_, idx) => {
                const activeStars = getStarsCount(wpm, accuracy);
                const isEarned = idx < activeStars;
                return (
                  <span key={idx} className={`star-item ${isEarned ? 'earned' : 'empty'}`}>
                    ★
                  </span>
                );
              })}
            </div>

            <div className="completion-stats-grid">
              <div className="cs-card">
                <span className="cs-lbl">WPM</span>
                <span className="cs-val">{wpm}</span>
                <span className="cs-target">Target: {lesson.targetWpm}</span>
              </div>
              <div className="cs-card">
                <span className="cs-lbl">Accuracy</span>
                <span className="cs-val">{accuracy}%</span>
                <span className="cs-target">Target: {lesson.targetAccuracy}%</span>
              </div>
              <div className="cs-card">
                <span className="cs-lbl">Mistakes</span>
                <span className="cs-val text-red" style={{ color: 'var(--wrong)' }}>{mistakesCount}</span>
              </div>
            </div>

            <div className="completion-message-box">
              {wpm >= lesson.targetWpm && accuracy >= lesson.targetAccuracy ? (
                <div className="completion-status pass">
                  <span>✔ Passed! Unlocked next progress lesson.</span>
                </div>
              ) : (
                <div className="completion-status fail">
                  <span>✘ Target goals not hit. Re-practice keys to proceed.</span>
                </div>
              )}
            </div>

            <div className="completion-actions-row">
              <button className="completion-btn secondary" onClick={() => [setIsOnboarding(true), setCurrentStepIdx(0), resetStepPractice()]}>
                <RotateCcw size={14} /> Practice Again
              </button>
              {wpm >= lesson.targetWpm && accuracy >= lesson.targetAccuracy && activeLessonId < 15 && activeLessonId !== -1 && (
                <button
                  className="completion-btn primary"
                  onClick={() => {
                    setActiveLessonId(activeLessonId + 1);
                    setIsOnboarding(true);
                    setCurrentStepIdx(0);
                  }}
                >
                  Next Lesson <ChevronRight size={14} />
                </button>
              )}
              {(activeLessonId === -1 || activeLessonId === 15 || !(wpm >= lesson.targetWpm && accuracy >= lesson.targetAccuracy)) && (
                <button className="completion-btn primary" onClick={() => setActiveLessonId(null)}>
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
