import { useState, useEffect, useRef, useCallback } from 'react'
import { Zap, Heart, Play, RotateCcw, ArrowLeft, Volume2, VolumeX, Trophy, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { generateWords } from '../data/words'
import { supabase } from '../lib/supabase'

export default function WordRush({ sound: globalSound }) {
  const { user } = useAuth()
  const [gameState, setGameState] = useState('menu') // menu | countdown | active | results
  const [sound, setSound] = useState(globalSound)
  
  // Configurations
  const [tier, setTier] = useState('basic')
  const [speedWpm, setSpeedWpm] = useState(60) // 40 | 60 | 90 | 120
  
  // Game Play States
  const [wordList, setWordList] = useState([])
  const [currentWordIdx, setCurrentWordIdx] = useState(0)
  const [currentInput, setCurrentInput] = useState('')
  const [lives, setLives] = useState(3)
  const [score, setScore] = useState(0)
  const [flashRed, setFlashRed] = useState(false)
  const [flashGreen, setFlashGreen] = useState(false)
  const [countdown, setCountdown] = useState(3)

  // Timer States for the active word
  const [wordTimeLimit, setWordTimeLimit] = useState(2.0)
  const [wordTimeLeft, setWordTimeLeft] = useState(2.0)
  
  // Leaderboard States
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)

  // Highscore state
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem('typs_rush_highscore') || 0)
  })

  const inputRef = useRef(null)
  const gameTimerRef = useRef(null)
  const audioCtxRef = useRef(null)
  
  // Play sound effect
  const playSound = useCallback((freq, type = 'sine', duration = 0.08, volume = 0.02) => {
    if (!sound) return
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = type
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(); osc.stop(ctx.currentTime + duration)
    } catch {}
  }, [sound])

  // Get timer limit for word based on length and target speed (WPM)
  const calculateWordTime = useCallback((word) => {
    // 1 standard word = 5 characters. So chars/sec = (speedWpm * 5) / 60
    const charsPerSec = (speedWpm * 5) / 60
    const rawTime = word.length / charsPerSec
    // Add safety buffer (e.g. 1.0 second base buffer so it's humanly playable)
    return Math.max(1.2, Number((rawTime + 1.0).toFixed(2)))
  }, [speedWpm])

  // Fetch overall leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true)
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('wpm, user_id, profiles(username)')
        .eq('mode', 'rush')

      if (error) {
        console.error('Error fetching rush leaderboard:', error.message)
        return
      }

      if (!data || data.length === 0) {
        setLeaderboardData([])
        return
      }

      const userMap = {}
      for (const row of data) {
        const uid = row.user_id
        const scoreVal = row.wpm
        const username = row.profiles?.username || 'Unknown'
        if (!userMap[uid] || scoreVal > userMap[uid].bestScore) {
          userMap[uid] = {
            username,
            bestScore: scoreVal
          }
        }
      }

      const sorted = Object.values(userMap)
        .map(u => ({ username: u.username, score: u.bestScore }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)

      setLeaderboardData(sorted)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLeaderboard(false)
    }
  }, [])

  useEffect(() => {
    if (gameState === 'menu') {
      fetchLeaderboard()
    }
  }, [gameState, fetchLeaderboard])

  // Start new game
  const startGame = useCallback(() => {
    const list = generateWords(tier, 200)
    setWordList(list)
    setCurrentWordIdx(0)
    setCurrentInput('')
    setLives(3)
    setScore(0)
    setGameState('countdown')
    setCountdown(3)
  }, [tier])

  // Handle countdown
  useEffect(() => {
    if (gameState !== 'countdown') return
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setGameState('active')
          const firstWord = wordList[0]
          const tLimit = calculateWordTime(firstWord)
          setWordTimeLimit(tLimit)
          setWordTimeLeft(tLimit)
          setTimeout(() => inputRef.current?.focus(), 50)
          return 3
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState, wordList, calculateWordTime])

  // Lost a life helper
  const handleLifeLoss = useCallback(() => {
    playSound(150, 'sawtooth', 0.2, 0.04)
    setFlashRed(true)
    setTimeout(() => setFlashRed(false), 200)
    
    setLives(prev => {
      const nextLives = prev - 1
      if (nextLives <= 0) {
        // Game Over
        setGameState('results')
        if (score > highScore) {
          setHighScore(score)
          localStorage.setItem('typs_rush_highscore', String(score))
        }

        // Save score to Supabase if logged in
        if (user) {
          supabase.from('tests').insert({
            user_id: user.id,
            wpm: score, // store score in wpm field
            raw_wpm: score,
            accuracy: 100,
            tier: tier,
            mode: 'rush',
            time_limit: speedWpm,
            elapsed: 60,
          }).then(({ error }) => {
            if (error) console.error('Failed to save rush test:', error.message)
            else fetchLeaderboard()
          })
        }
      } else {
        // Move to next word
        const nextIdx = currentWordIdx + 1
        setCurrentWordIdx(nextIdx)
        setCurrentInput('')
        // Generate more words if running low
        if (nextIdx >= wordList.length - 5) {
          setWordList(prevList => [...prevList, ...generateWords(tier, 100)])
        }
        const nextWord = wordList[nextIdx] || 'rush'
        const tLimit = calculateWordTime(nextWord)
        setWordTimeLimit(tLimit)
        setWordTimeLeft(tLimit)
      }
      return nextLives
    })
  }, [currentWordIdx, wordList, tier, score, highScore, calculateWordTime, playSound, user, fetchLeaderboard])

  // Active game timer tick
  useEffect(() => {
    if (gameState !== 'active') return

    gameTimerRef.current = setInterval(() => {
      setWordTimeLeft(prev => {
        const next = Number((prev - 0.05).toFixed(2))
        if (next <= 0) {
          handleLifeLoss()
          return 0
        }
        return next
      })
    }, 50)

    return () => clearInterval(gameTimerRef.current)
  }, [gameState, handleLifeLoss])

  // Handle typing input
  const handleKeyDown = (e) => {
    if (gameState !== 'active') return
    const { key } = e
    const currentWord = wordList[currentWordIdx]

    // Backspace
    if (key === 'Backspace') {
      e.preventDefault()
      setCurrentInput(prev => prev.slice(0, -1))
      playSound(400, 'sine', 0.04, 0.01)
      return
    }

    // Key click sound
    if (key.length === 1) {
      playSound(800, 'square', 0.04, 0.01)
      const nextInput = currentInput + key
      setCurrentInput(nextInput)

      // Instantly submit when perfect match is hit (no space required!)
      if (nextInput === currentWord) {
        playSound(1000, 'sine', 0.08, 0.02)
        setFlashGreen(true)
        setTimeout(() => setFlashGreen(false), 150)
        setScore(prev => prev + 1)
        
        const nextIdx = currentWordIdx + 1
        setCurrentWordIdx(nextIdx)
        setCurrentInput('')
        
        if (nextIdx >= wordList.length - 5) {
          setWordList(prevList => [...prevList, ...generateWords(tier, 100)])
        }
        
        const nextWord = wordList[nextIdx] || 'rush'
        const tLimit = calculateWordTime(nextWord)
        setWordTimeLimit(tLimit)
        setWordTimeLeft(tLimit)
      }
    }
  }

  // Global key listener redirection & Tab + Enter restart handler
  useEffect(() => {
    let tabPressed = false

    const handleGlobalKeys = (e) => {
      if (gameState === 'active') {
        inputRef.current?.focus()
      }

      if (e.key === 'Tab') {
        tabPressed = true
        if (gameState === 'active' || gameState === 'results') {
          e.preventDefault()
        }
      } else if (e.key === 'Enter' && tabPressed) {
        e.preventDefault()
        tabPressed = false
        startGame()
      } else {
        tabPressed = false
      }
    }

    window.addEventListener('keydown', handleGlobalFocusRedirect)
    function handleGlobalFocusRedirect(e) {
      handleGlobalKeys(e)
    }
    return () => window.removeEventListener('keydown', handleGlobalFocusRedirect)
  }, [gameState, startGame])

  // Percentage for countdown progress bar
  const timeLeftPercent = Math.max(0, (wordTimeLeft / wordTimeLimit) * 100)

  // --- RENDERING VIEWS ---

  if (gameState === 'menu') {
    return (
      <div className="battle-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', justifyContent: 'center', alignItems: 'flex-start', margin: '40px auto 0', maxWidth: '1000px' }}>
        
        {/* Play Setup Card */}
        <div className="lobby-card" style={{ flex: '1 1 420px', margin: '0' }}>
          <div className="lobby-title" style={{ justifyContent: 'center' }}>
            <Zap size={24} className="accent-color-svg" />
            <h2>Word Rush Mode</h2>
          </div>
          
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '24px', lineHeight: '1.5rem' }}>
            Type words one by one before they disappear! You have 3 lives. Correct matches load the next word instantly. Speed scales with WPM settings.
          </p>

          <div className="lobby-form-group">
            <div className="form-row">
              <label>Tier / Word List</label>
              <select className="form-select" value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="basic">Easy</option>
                <option value="intermd">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="form-row">
              <label>Target Speed (WPM)</label>
              <select className="form-select" value={speedWpm} onChange={(e) => setSpeedWpm(Number(e.target.value))}>
                {Array.from({ length: 16 }, (_, i) => 50 + i * 10).map(wpm => (
                  <option key={wpm} value={wpm}>
                    {wpm} WPM {wpm === 60 ? '(Standard)' : wpm === 100 ? '(Pro)' : wpm === 200 ? '(Godspeed)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '12px 24px', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PERSONAL HIGHSCORE</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)' }}>{highScore} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>words</span></span>
            </div>
          </div>

          <button className="lobby-btn primary" onClick={startGame} style={{ marginTop: '24px', width: '100%' }}>
            <Play size={16} /> Start Rush Mode
          </button>
        </div>

        {/* Overall Leaderboard Card */}
        <div className="lobby-browser" style={{ flex: '1 1 360px', margin: '0', minHeight: '380px' }}>
          <div className="browser-title">
            <span>Overall Leaderboard</span>
            <span className="browser-count">Top 10 Global</span>
          </div>

          {loadingLeaderboard ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading leaderboard...</div>
          ) : leaderboardData.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No scores yet. Be the first to set a score!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboardData.map((row, idx) => (
                <div key={idx} className="room-browser-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontWeight: 800, 
                      color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)', 
                      width: '24px' 
                    }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-hi)' }}>{row.username}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.125rem' }}>
                    {row.score} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>words</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    )
  }

  if (gameState === 'countdown') {
    return (
      <div className="countdown-overlay">
        <Zap size={48} className="accent-color-svg" style={{ marginBottom: '16px', animation: 'pulse 1s infinite' }} />
        <span className="countdown-number">{countdown}</span>
        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '16px' }}>Type immediately on match!</span>
      </div>
    )
  }

  if (gameState === 'active') {
    const currentWord = wordList[currentWordIdx] || ''
    
    return (
      <div className={`battle-wrap ${flashRed ? 'flash-red-active' : ''} ${flashGreen ? 'flash-green-active' : ''}`} style={{ transition: 'all 0.15s ease' }}>
        <div className="lobby-card" style={{ maxWidth: '520px', margin: '40px auto 0', padding: '36px', position: 'relative' }}>
          
          {/* Header Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart 
                  key={i} 
                  size={20} 
                  fill={i < lives ? 'var(--wrong)' : 'none'} 
                  stroke={i < lives ? 'var(--wrong)' : 'var(--text-muted)'} 
                  style={{ transition: 'all 0.3s ease', transform: i < lives ? 'scale(1)' : 'scale(0.8)', opacity: i < lives ? 1 : 0.3 }}
                />
              ))}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>SCORE:</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{score}</span>
            </div>
          </div>

          {/* Shrinking progress timer bar */}
          <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '40px' }}>
            <div 
              style={{ 
                width: `${timeLeftPercent}%`, 
                height: '100%', 
                background: timeLeftPercent <= 30 ? 'var(--wrong)' : 'var(--accent)', 
                transition: 'width 0.05s linear' 
              }} 
            />
          </div>

          {/* Typing Area Core */}
          <div style={{ textAlign: 'center', minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {/* Word to type (Letter-by-letter comparison highlights) */}
            <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', marginBottom: '24px', color: 'var(--text-hi)', display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {currentWord.split('').map((char, charIdx) => {
                let charColor = 'var(--text-dim)'
                let opacity = 0.35
                
                if (charIdx < currentInput.length) {
                  const isCorrect = currentInput[charIdx] === char
                  charColor = isCorrect ? 'var(--accent)' : 'var(--wrong)'
                  opacity = 1
                }
                
                return (
                  <span key={charIdx} style={{ color: charColor, opacity, transition: 'color 0.05s ease' }}>
                    {char}
                  </span>
                )
              })}
              
              {/* Extra typed characters */}
              {currentInput.length > currentWord.length && (
                currentInput.slice(currentWord.length).split('').map((char, charIdx) => (
                  <span key={`extra-${charIdx}`} style={{ color: 'var(--wrong)', opacity: 1 }}>
                    {char}
                  </span>
                ))
              )}
            </div>

            {/* Current Input preview helper */}
            <div style={{ height: '32px', fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {currentInput || <span style={{ opacity: 0.15, fontStyle: 'italic' }}>type word...</span>}
            </div>
          </div>

          {/* Hidden text input */}
          <input
            ref={inputRef}
            type="text"
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            value={currentInput}
            onKeyDown={handleKeyDown}
            onChange={() => {}}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', gap: '12px' }}>
            <button className="lobby-btn" onClick={() => setGameState('menu')} style={{ fontSize: '0.8125rem' }}>
              <ArrowLeft size={12} /> Menu
            </button>
            <button className="restart-btn" onClick={startGame} title="restart (Tab+Enter)" style={{ padding: '8px 14px' }}>
              <RotateCcw size={14} />
            </button>
          </div>

        </div>
      </div>
    )
  }

  if (gameState === 'results') {
    return (
      <div className="battle-wrap">
        <div className="lobby-card" style={{ maxWidth: '440px', margin: '40px auto 0', textAlign: 'center' }}>
          <div className="lobby-title" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <Trophy size={28} className="accent-color-svg" />
            <h2>Game Over</h2>
          </div>
          
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>WORDS RUSHED SUCCESSFULLY</span>
          <span style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent)', display: 'block', lineHeight: 1, marginBottom: '24px' }}>
            {score}
          </span>

          {score >= highScore && score > 0 && (
            <div style={{ background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid var(--accent)', padding: '10px', borderRadius: 'var(--radius)', color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '24px' }}>
              🎉 NEW PERSONAL HIGH SCORE!
            </div>
          )}

          <div className="btn-row" style={{ width: '100%', gap: '12px' }}>
            <button className="lobby-btn" onClick={() => setGameState('menu')} style={{ flex: 1 }}>
              <ArrowLeft size={14} /> Back to Menu
            </button>
            <button className="lobby-btn primary" onClick={startGame} style={{ flex: 1 }}>
              <RotateCcw size={14} /> Play Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
