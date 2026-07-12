import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from './components/Navbar'
import TypingArea from './components/TypingArea'
import Results from './components/Results'
import Leaderboard from './components/Leaderboard'
import HistoryPage from './components/History'
import Statistics from './components/Statistics'
import Profile from './components/Profile'
import AuthModal from './components/AuthModal'
import { useTypingEngine } from './hooks/useTypingEngine'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import { RotateCcw, Trophy, History, LogOut, ChevronDown, BarChart2, User, BookOpen } from 'lucide-react'
import Learn from './components/Learn'

export default function App() {
  const { user, logout, saveTest, getUserStats } = useAuth()
  const { theme, setTheme, themes } = useTheme()

  
  const [tier, setTier]           = useState('basic')
  const [mode, setMode]           = useState('words')
  const [wordCount, setWordCount] = useState(30)
  const [timeLimit, setTimeLimit] = useState(30)
  const [customVal, setCustomVal] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [sound, setSound]         = useState(false)

  
  const [page, setPage]           = useState('home') 
  const [showAuth, setShowAuth]   = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [resultSaved, setResultSaved]   = useState(false)
  const [restartKey, setRestartKey]     = useState(0)

  
  const [bestWpm, setBestWpm]         = useState(0)
  const [previousWpm, setPreviousWpm] = useState(0)

  const userMenuRef = useRef(null)

  const triggerRestart = useCallback(() => {
    setRestartKey(k => k + 1)
    setResultSaved(false)
  }, [])

  const handleRestart = useCallback(() => {
    triggerRestart()
  }, [triggerRestart])

  const engine = useTypingEngine({
    mode, tier, wordCount, timeLimit, key: restartKey
  })

  const {
    words, typedChars, currentWordIdx, currentInput,
    status, timeLeft, elapsed, wpm, rawWpm, accuracy, wpmHistory,
    handleKeyDown, restart, inputRef, wordRefs, focusInput,
    charsCorrect, charsIncorrect, charsExtra, charsMissed
  } = engine

  
  const audioCtxRef = useRef(null)
  const playClick = useCallback(() => {
    if (!sound) return
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 800 + Math.random() * 200
      osc.type = 'square'
      gain.gain.setValueAtTime(0.03, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
      osc.start(); osc.stop(ctx.currentTime + 0.04)
    } catch {}
  }, [sound])

  
  useEffect(() => {
    if (status === 'finished' && user) {
      try {
        const result = getUserStats()
        
        if (result && typeof result.then === 'function') {
          result.then(stats => {
            if (stats) setBestWpm(stats.bestWpm || 0)
          }).catch(() => {})
        } else if (result) {
          setBestWpm(result.bestWpm || 0)
        }
      } catch {}
    }
  }, [status, user, getUserStats])

  
  const lastWpmRef = useRef(0)
  useEffect(() => {
    if (status === 'finished' && wpm > 0) {
      setPreviousWpm(lastWpmRef.current)
      lastWpmRef.current = wpm
    }
  }, [status, wpm])

  
  useEffect(() => {
    if (status === 'finished' && !resultSaved) {
      if (wpm > 0) {
        const testData = {
          wpm,
          rawWpm,
          accuracy,
          elapsed,
          mode,
          tier,
          wordCount,
          timeLimit,
          charsCorrect: charsCorrect || 0,
          charsIncorrect: charsIncorrect || 0,
          charsExtra: charsExtra || 0,
          charsMissed: charsMissed || 0,
        }

        if (user) {
          saveTest(testData)
        } else {
          
          try {
            const local = JSON.parse(localStorage.getItem('typs_local_history') || '[]')
            local.unshift({
              id: 'local_' + Date.now(),
              created_at: new Date().toISOString(),
              ...testData
            })
            localStorage.setItem('typs_local_history', JSON.stringify(local.slice(0, 100)))
          } catch (e) {
            console.error('Failed to save test locally:', e)
          }
        }
        setResultSaved(true)
      }
    }
  }, [status, resultSaved, user, wpm, rawWpm, accuracy, elapsed, mode, tier, wordCount, timeLimit, saveTest, charsCorrect, charsIncorrect, charsExtra, charsMissed])

  
  useEffect(() => {
    let tabDown = false
    const onKeyDown = (e) => {
      if (e.key === 'Tab') { e.preventDefault(); tabDown = true }
      if (e.key === 'Enter' && tabDown) { e.preventDefault(); handleRestart() }
      if (e.key === 'Escape') setShowAuth(false)
    }
    const onKeyUp = (e) => { if (e.key === 'Tab') tabDown = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [handleRestart])

  
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const wrappedKeyDown = useCallback((e) => {
    playClick()
    handleKeyDown(e)
  }, [playClick, handleKeyDown])

  return (
    <div className={`app ${page === 'learn' ? 'practice-page-active' : ''}`}>
      {}
      <header className="header">
        <div className="header-inner">
          <button className="logo" onClick={() => { setPage('home'); handleRestart() }}>
            <span className="logo-text">typs</span>
            <span className="logo-accent">&lt;&gt;</span>
          </button>

          <nav className="header-nav">
            <button
              className={`hn-btn ${page === 'learn' ? 'active' : ''}`}
              onClick={() => setPage(page === 'learn' ? 'home' : 'learn')}
            >
              <BookOpen size={14} />
              <span>learn</span>
            </button>
            <button
              className={`hn-btn ${page === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setPage(page === 'leaderboard' ? 'home' : 'leaderboard')}
            >
              <Trophy size={14} />
              <span>leaderboard</span>
            </button>
             <button
              className={`hn-btn ${page === 'statistics' ? 'active' : ''}`}
              onClick={() => setPage(page === 'statistics' ? 'home' : 'statistics')}
            >
              <BarChart2 size={14} />
              <span>statistics</span>
            </button>
            <button
              className={`hn-btn ${page === 'history' ? 'active' : ''}`}
              onClick={() => setPage(page === 'history' ? 'home' : 'history')}
            >
              <History size={14} />
              <span>history</span>
            </button>
          </nav>

          <div className="header-right">
            {user ? (
              <div className="user-menu-wrap" ref={userMenuRef}>
                <button className="user-btn" onClick={() => setShowUserMenu(v => !v)}>
                  <span className="user-btn-avatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="avatar-img" />
                    ) : (
                      user.username[0].toUpperCase()
                    )}
                  </span>
                  <span className="user-btn-name">{user.username}</span>
                  <ChevronDown size={11} className={"user-btn-chevron" + (showUserMenu ? " open" : "")} />
                </button>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="ud-header">
                      <div className="ud-avatar-row">
                        <div className="ud-avatar-lg">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className="avatar-img" />
                          ) : (
                            user.username[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="ud-username">{user.username}</div>
                          <div className="ud-joined">member since {new Date(user.joined).getFullYear()}</div>
                        </div>
                      </div>
                    </div>
                    <button className="ud-item" onClick={() => { setPage('profile'); setShowUserMenu(false) }}>
                      <User size={13} /> profile
                    </button>
                    <button className="ud-item" onClick={() => { setPage('history'); setShowUserMenu(false) }}>
                      <History size={13} /> history
                    </button>
                    <button className="ud-item" onClick={() => { setPage('statistics'); setShowUserMenu(false) }}>
                      <BarChart2 size={13} /> statistics
                    </button>
                    <div className="ud-sep" />
                    <button className="ud-item danger" onClick={() => { logout(); setShowUserMenu(false) }}>
                      <LogOut size={13} /> sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="user-btn guest-btn" onClick={() => setShowAuth(true)}>
                <span className="user-btn-avatar guest-avatar">
                  <User size={12} />
                </span>
                <span className="user-btn-name">guest</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {}
      {page === 'home' && (
        <Navbar
          tier={tier} setTier={setTier}
          mode={mode} setMode={setMode}
          wordCount={wordCount} setWordCount={setWordCount}
          timeLimit={timeLimit} setTimeLimit={setTimeLimit}
          customVal={customVal} setCustomVal={setCustomVal}
          showCustom={showCustom} setShowCustom={setShowCustom}
          sound={sound} setSound={setSound}
          onRestart={handleRestart}
          theme={theme} setTheme={setTheme} themes={themes}
        />
      )}

      {}
      <main className="main">
        {page === 'leaderboard' && <Leaderboard />}
        {page === 'learn'       && <Learn sound={sound} />}
        {page === 'history'     && <HistoryPage />}
        {page === 'statistics'  && <Statistics />}
        {page === 'profile'     && <Profile />}

        {page === 'home' && (
          <>
            {}
            {(status === 'running' || status === 'idle') && (
              <div className="counter-bar">
                {mode === 'time' ? (
                  <span className={`counter-num ${timeLeft <= 5 ? 'danger' : ''}`}>{timeLeft}</span>
                ) : (
                  <span className="counter-num">
                    {currentWordIdx}<span className="counter-of">/{wordCount}</span>
                  </span>
                )}
                {status === 'running' && wpm > 0 && (
                  <span className="live-wpm">{wpm} <span className="live-label">wpm</span></span>
                )}
              </div>
            )}

            {status !== 'finished' ? (
              <TypingArea
                words={words}
                typedChars={typedChars}
                currentWordIdx={currentWordIdx}
                currentInput={currentInput}
                status={status}
                handleKeyDown={wrappedKeyDown}
                inputRef={inputRef}
                wordRefs={wordRefs}
                focusInput={focusInput}
              />
            ) : (
              <Results
                wpm={wpm}
                rawWpm={rawWpm}
                accuracy={accuracy}
                elapsed={elapsed}
                mode={mode}
                timeLimit={timeLimit}
                wpmHistory={wpmHistory}
                onRestart={handleRestart}
                saved={resultSaved}
                charsCorrect={charsCorrect || 0}
                charsIncorrect={charsIncorrect || 0}
                charsExtra={charsExtra || 0}
                charsMissed={charsMissed || 0}
                bestWpm={bestWpm}
                previousWpm={previousWpm}
              />
            )}

            {}
            {status !== 'finished' && (
              <div className="restart-row">
                <button className="restart-btn" onClick={handleRestart} onMouseDown={e => e.preventDefault()} title="restart (Tab+Enter)">
                  <RotateCcw size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {}
      <footer className="footer">
        <div className="footer-left">
          <a href="https://github.com/heyysvm/typs" target="_blank" rel="noopener noreferrer" className="footer-link">
            <span>Loved this? Star us on GitHub!</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </a>
        </div>
        <div className="footer-right">
          <a href="https://github.com/heyysvm" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/></svg>
            <span>github</span>
          </a>
          <span className="footer-dot">·</span>
          <a href="https://linkedin.com/in/heyysvm" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            <span>linkedin</span>
          </a>
          <span className="footer-dot">·</span>
          <a href="https://instagram.com/heyysvm" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            <span>instagram</span>
          </a>
        </div>
      </footer>

      {}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false)
            setPage('profile')
          }}
        />
      )}
    </div>
  )
}
