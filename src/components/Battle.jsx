import { useState, useEffect, useRef, useCallback } from 'react'
import { Swords, Trophy, Play, Copy, User, Volume2, VolumeX, ArrowLeft, Crown, Zap, Target, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { generateWords } from '../data/words'

export default function Battle({ sound: globalSound }) {
  const { user } = useAuth()
  const [lobbyState, setLobbyState] = useState('lobby') // lobby | waiting | countdown | arena | results
  const [roomId, setRoomId] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState([])
  const [sound, setSound] = useState(globalSound)
  
  // Room Configuration
  const [tier, setTier] = useState('basic')
  const [mode, setMode] = useState('words')
  const [wordCount, setWordCount] = useState(30)
  const [timeLimit, setTimeLimit] = useState(30)
  const [isBotMode, setIsBotMode] = useState(false)
  const [botWpm, setBotWpm] = useState(60)

  // Typing Arena States
  const [gameWords, setGameWords] = useState([])
  const [typedWords, setTypedWords] = useState([])
  const [currentInput, setCurrentInput] = useState('')
  const [currentWordIdx, setCurrentWordIdx] = useState(0)
  const [status, setStatus] = useState('idle') // idle | running | finished
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)

  // Live Metrics
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [correctChars, setCorrectChars] = useState(0)
  const [typedCharsCount, setTypedCharsCount] = useState(0)
  const [mistakesCount, setMistakesCount] = useState(0)

  // Opponent Live Metrics
  const [opponentStats, setOpponentStats] = useState({
    username: 'Waiting...',
    wpm: 0,
    accuracy: 100,
    currentWordIdx: 0,
    isFinished: false
  })

  // Countdown State
  const [countdown, setCountdown] = useState(3)
  const [copied, setCopied] = useState(false)
  const [winner, setWinner] = useState('')

  const channelRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const audioCtxRef = useRef(null)

  // Web Audio keyclick
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
      gain.gain.setValueAtTime(0.02, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
      osc.start(); osc.stop(ctx.currentTime + 0.04)
    } catch {}
  }, [sound])

  // Reset local typing arena variables
  const resetLocalTyping = useCallback((wordsList) => {
    setTypedWords([])
    setCurrentInput('')
    setCurrentWordIdx(0)
    setStatus('idle')
    setStartTime(null)
    setElapsed(0)
    setTimeLeft(mode === 'time' ? timeLimit : 0)
    setWpm(0)
    setAccuracy(100)
    setCorrectChars(0)
    setTypedCharsCount(0)
    setMistakesCount(0)
    
    setOpponentStats(prev => ({
      ...prev,
      wpm: 0,
      accuracy: 100,
      currentWordIdx: 0,
      isFinished: false
    }))
    
    if (wordsList) setGameWords(wordsList)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [mode, timeLimit])

  // Format countdown and duration helpers
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Supabase Realtime Room Handling
  const setupRealtimeChannel = useCallback((targetRoomId, hostFlag) => {
    const channel = supabase.channel(`room_${targetRoomId}`, {
      config: {
        presence: {
          key: user?.username || `Guest_${Math.floor(Math.random() * 1000)}`,
        }
      }
    })

    channelRef.current = channel

    // Listen to presence events
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      const list = Object.entries(presenceState).map(([key, val]) => ({
        username: key,
        id: val[0]?.id || key,
        isHost: val[0]?.isHost || false
      }))
      setPlayers(list)
    })

    // Listen to broadcasts
    channel
      .on('broadcast', { event: 'typing_progress' }, ({ payload }) => {
        setOpponentStats({
          username: payload.username,
          wpm: payload.wpm,
          accuracy: payload.accuracy,
          currentWordIdx: payload.currentWordIdx,
          isFinished: payload.isFinished
        })
      })
      .on('broadcast', { event: 'room_config' }, ({ payload }) => {
        if (!hostFlag) {
          setTier(payload.tier)
          setMode(payload.mode)
          setWordCount(payload.wordCount)
          setTimeLimit(payload.timeLimit)
          setGameWords(payload.words)
          setOpponentStats(prev => ({ ...prev, username: payload.hostName }))
        }
      })
      .on('broadcast', { event: 'start_countdown' }, () => {
        setLobbyState('countdown')
      })
      .on('broadcast', { event: 'rematch' }, ({ payload }) => {
        resetLocalTyping(payload.words)
        setLobbyState('countdown')
      })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const myName = user?.username || `Guest_${Math.floor(Math.random() * 1000)}`
        await channel.track({
          id: user?.id || `guest_${Date.now()}`,
          isHost: hostFlag,
          joinedAt: new Date().toISOString()
        })

        // If host, immediately broadcast config
        if (hostFlag) {
          const initialWords = generateWords(tier, mode === 'words' ? wordCount : Math.max(wordCount * 4, 150))
          setGameWords(initialWords)
          channel.send({
            type: 'broadcast',
            event: 'room_config',
            payload: {
              tier,
              mode,
              wordCount,
              timeLimit,
              words: initialWords,
              hostName: myName
            }
          })
        }
      }
    })
  }, [user, tier, mode, wordCount, timeLimit, resetLocalTyping])

  // Leave room cleanups
  const leaveRoom = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setLobbyState('lobby')
    setPlayers([])
    setRoomId('')
    setIsHost(false)
    setIsBotMode(false)
  }

  // Create Room
  const handleCreateRoom = () => {
    const code = `B-${Math.floor(1000 + Math.random() * 9000)}`
    setRoomId(code)
    setIsHost(true)
    setLobbyState('waiting')
    setupRealtimeChannel(code, true)
  }

  // Join Room
  const handleJoinRoom = (e) => {
    e.preventDefault()
    if (!roomCodeInput.trim()) return
    const code = roomCodeInput.trim().toUpperCase()
    setRoomId(code)
    setIsHost(false)
    setLobbyState('waiting')
    setupRealtimeChannel(code, false)
  }

  // Start Battle Countdown
  const handleStartBattle = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'start_countdown',
        payload: {}
      })
    }
    setLobbyState('countdown')
  }

  // Countdown timer effect
  useEffect(() => {
    if (lobbyState !== 'countdown') return
    setCountdown(3)
    
    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countInterval)
          setLobbyState('arena')
          resetLocalTyping()
          return 3
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countInterval)
  }, [lobbyState, resetLocalTyping])

  // Focus input when Arena starts
  useEffect(() => {
    if (lobbyState === 'arena') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [lobbyState])

  // Game timer loop
  useEffect(() => {
    if (status !== 'running') return

    setStartTime(Date.now())
    
    timerRef.current = setInterval(() => {
      setStartTime(start => {
        if (!start) return start
        const elapsedSec = (Date.now() - start) / 1000
        setElapsed(elapsedSec)

        // Calculate live WPM
        const minutes = Math.max(elapsedSec / 60, 0.001)
        const currentWpm = Math.round((correctChars / 5) / minutes)
        setWpm(currentWpm)

        // Time mode check
        if (mode === 'time') {
          const remaining = Math.max(0, timeLimit - elapsedSec)
          setTimeLeft(Math.ceil(remaining))

          if (remaining <= 0) {
            clearInterval(timerRef.current)
            setStatus('finished')
            // Broadcast final stats
            if (channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'typing_progress',
                payload: {
                  username: user?.username || 'You',
                  wpm: currentWpm,
                  accuracy,
                  currentWordIdx,
                  isFinished: true
                }
              })
            }
          }
        }
        return start
      })
    }, 100)

    return () => clearInterval(timerRef.current)
  }, [status, mode, timeLimit, correctChars, accuracy, currentWordIdx, user])

  // AI Bot Opponent logic
  useEffect(() => {
    if (lobbyState !== 'arena' || !isBotMode || status === 'finished') return

    // Opponent name for bot
    setOpponentStats(prev => ({ ...prev, username: `Bot (Speed: ${botWpm} WPM)` }))

    const botInterval = setInterval(() => {
      setOpponentStats(prev => {
        if (prev.isFinished || status === 'finished') {
          clearInterval(botInterval)
          return prev
        }

        // botWpm / 60 = words per second
        // increment by a step
        const step = botWpm / 60
        const nextIdx = prev.currentWordIdx + step
        const isFinished = nextIdx >= gameWords.length

        return {
          ...prev,
          currentWordIdx: Math.min(gameWords.length, nextIdx),
          wpm: botWpm,
          isFinished
        }
      })
    }, 1000)

    return () => clearInterval(botInterval)
  }, [lobbyState, isBotMode, botWpm, gameWords, status])

  // Handle typing input keydowns
  const handleKeyDown = (e) => {
    if (lobbyState !== 'arena' || status === 'finished') return
    playClick()

    if (status === 'idle') {
      setStatus('running')
    }

    const { key } = e
    const currentWord = gameWords[currentWordIdx]

    // Backspace
    if (key === 'Backspace') {
      e.preventDefault()
      if (currentInput.length > 0) {
        setCurrentInput(prev => prev.slice(0, -1))
      }
      return
    }

    // Space: submit word
    if (key === ' ') {
      e.preventDefault()
      if (!currentInput.trim()) return

      const isCorrect = currentInput === currentWord
      const updatedTyped = [...typedWords, currentInput]
      setTypedWords(updatedTyped)
      
      const nextIdx = currentWordIdx + 1
      setCurrentWordIdx(nextIdx)
      setCurrentInput('')

      // Calculate accuracy & correct chars
      let newCorrect = correctChars
      if (isCorrect) {
        newCorrect += currentWord.length + 1 // including space
        setCorrectChars(newCorrect)
      } else {
        setMistakesCount(prev => prev + 1)
      }

      const totalTyped = typedCharsCount + currentInput.length + 1
      setTypedCharsCount(totalTyped)
      const acc = Math.max(0, Math.round(((totalTyped - (mistakesCount + (isCorrect ? 0 : 1))) / totalTyped) * 100))
      setAccuracy(acc)

      // Broadcast progress
      const currentWpm = Math.round((newCorrect / 5) / (elapsed > 0 ? elapsed / 60 : 0.001))
      const isFinished = (mode === 'words' && nextIdx >= gameWords.length)

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing_progress',
          payload: {
            username: user?.username || 'You',
            wpm: currentWpm,
            accuracy: acc,
            currentWordIdx: nextIdx,
            isFinished
          }
        })
      }

      // Check if finished
      if (isFinished) {
        if (timerRef.current) clearInterval(timerRef.current)
        setStatus('finished')
      }
      return
    }

    // Letter characters
    if (key.length === 1) {
      if (currentInput.length >= currentWord.length + 10) return
      setCurrentInput(prev => prev + key)
    }
  };

  // Determine game winner when finished
  useEffect(() => {
    const bothFinished = (isBotMode ? (status === 'finished' && opponentStats.isFinished) : (status === 'finished' && opponentStats.isFinished)) || 
                         (mode === 'time' && timeLeft <= 0)

    const guestAndBotFinished = (status === 'finished' || opponentStats.isFinished)

    if (status === 'finished' || opponentStats.isFinished) {
      // Determine winner
      // Words mode winner is who finishes first or has higher WPM
      // Time mode winner is who has higher WPM at time limit
      let gameWinner = ''
      if (mode === 'words') {
        const myFinished = status === 'finished'
        const oppFinished = opponentStats.isFinished
        
        if (myFinished && !oppFinished) {
          gameWinner = 'You'
        } else if (!myFinished && oppFinished) {
          gameWinner = opponentStats.username || 'Opponent'
        } else {
          gameWinner = wpm > opponentStats.wpm ? 'You' : (wpm < opponentStats.wpm ? (opponentStats.username || 'Opponent') : 'Draw')
        }
      } else {
        gameWinner = wpm > opponentStats.wpm ? 'You' : (wpm < opponentStats.wpm ? (opponentStats.username || 'Opponent') : 'Draw')
      }
      
      setWinner(gameWinner)
      
      // Delay transitioning to results to let user see finish screen brief moment
      const t = setTimeout(() => {
        setLobbyState('results')
      }, 1000)
      return () => clearTimeout(t)
    }
  }, [status, opponentStats.isFinished, opponentStats.wpm, wpm, mode, isBotMode, timeLeft, opponentStats.username])

  // Rematch
  const handleRematch = () => {
    const nextWords = generateWords(tier, mode === 'words' ? wordCount : Math.max(wordCount * 4, 150))
    setGameWords(nextWords)
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'rematch',
        payload: {
          words: nextWords
        }
      })
    }
    
    resetLocalTyping(nextWords)
    setLobbyState('countdown')
  }

  // --- RENDERING SCREENS ---

  // 1. Lobby Setup
  if (lobbyState === 'lobby') {
    return (
      <div className="battle-wrap">
        <div className="battle-lobby">
          <div className="lobby-card">
            <div className="lobby-title">
              <Swords size={22} className="accent-color-svg" />
              <h2>Multiplayer Battle</h2>
            </div>
            
            <div className="lobby-form-group">
              <div className="form-row">
                <label>Tier / Difficulty</label>
                <select className="form-select" value={tier} onChange={(e) => setTier(e.target.value)}>
                  <option value="basic">Easy</option>
                  <option value="intermd">Medium</option>
                  <option value="hard">Hard (Stories)</option>
                </select>
              </div>

              <div className="form-row">
                <label>Game Mode</label>
                <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="words">Words</option>
                  <option value="time">Time</option>
                </select>
              </div>

              <div className="form-row">
                <label>{mode === 'words' ? 'Word Count' : 'Time Limit'}</label>
                <select 
                  className="form-select" 
                  value={mode === 'words' ? wordCount : timeLimit} 
                  onChange={(e) => mode === 'words' ? setWordCount(Number(e.target.value)) : setTimeLimit(Number(e.target.value))}
                >
                  {mode === 'words' ? (
                    <>
                      <option value="10">10 words</option>
                      <option value="30">30 words</option>
                      <option value="60">60 words</option>
                    </>
                  ) : (
                    <>
                      <option value="10">10 seconds</option>
                      <option value="30">30 seconds</option>
                      <option value="60">60 seconds</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <button className="lobby-btn primary" onClick={handleCreateRoom}>
              <Play size={16} /> Create Private Room
            </button>

            <div className="lobby-divider">OR</div>

            <form onSubmit={handleJoinRoom} className="join-row">
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter Code (e.g. B-1234)" 
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                maxLength={6}
                required
              />
              <button type="submit" className="lobby-btn">
                Join
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // 2. Waiting Room Lobby
  if (lobbyState === 'waiting') {
    const oppJoined = players.length > 1
    
    return (
      <div className="battle-wrap">
        <div className="waiting-room">
          <div className="room-header">
            <div className="room-title-block">
              <h2>Lobby Waiting Room</h2>
              <span>Config: {tier.toUpperCase()} • {mode.toUpperCase()} ({mode === 'words' ? `${wordCount} words` : `${timeLimit}s`})</span>
            </div>
            
            <div className="room-code-badge" onClick={handleCopyCode} title="Click to copy">
              <span>{roomId}</span>
              <Copy size={14} />
            </div>
          </div>

          {copied && <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '-16px', alignSelf: 'flex-end' }}>Code copied to clipboard!</div>}

          <div className="players-list">
            <div className="player-card">
              <div className="player-info">
                <div className="player-avatar">
                  {user?.username ? user.username[0].toUpperCase() : 'Y'}
                </div>
                <span className="player-name">{user?.username || 'You (Host)'}</span>
              </div>
              <span className="player-status ready">Host</span>
            </div>

            {!isBotMode ? (
              <div className="player-card">
                {oppJoined ? (
                  <>
                    <div className="player-info">
                      <div className="player-avatar opponent">
                        {players.find(p => !p.isHost)?.username[0].toUpperCase() || 'O'}
                      </div>
                      <span className="player-name">{players.find(p => !p.isHost)?.username || 'Opponent'}</span>
                    </div>
                    <span className="player-status ready">Joined</span>
                  </>
                ) : (
                  <>
                    <div className="player-info" style={{ opacity: 0.5 }}>
                      <div className="player-avatar opponent">?</div>
                      <span className="player-name">Waiting for opponent...</span>
                    </div>
                    <span className="player-status">Offline</span>
                  </>
                )}
              </div>
            ) : (
              <div className="player-card">
                <div className="player-info">
                  <div className="player-avatar opponent">🤖</div>
                  <span className="player-name">AI Bot Opponent</span>
                </div>
                <span className="player-status ready">Activated</span>
              </div>
            )}
          </div>

          {isHost && (
            <div className="bot-config-row">
              <span className="bot-config-label">Play against AI Bot instead?</span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={isBotMode} 
                  onChange={(e) => setIsBotMode(e.target.checked)} 
                  style={{ cursor: 'pointer' }}
                />
                {isBotMode && (
                  <select 
                    className="form-select" 
                    value={botWpm} 
                    onChange={(e) => setBotWpm(Number(e.target.value))}
                    style={{ padding: '4px 8px', fontSize: '0.8125rem' }}
                  >
                    <option value="40">Easy (40 WPM)</option>
                    <option value="60">Medium (60 WPM)</option>
                    <option value="90">Hard (90 WPM)</option>
                    <option value="120">Pro (120 WPM)</option>
                  </select>
                )}
              </div>
            </div>
          )}

          <div className="btn-row">
            <button className="lobby-btn" onClick={leaveRoom}>
              <ArrowLeft size={16} /> Leave Room
            </button>
            {isHost && (
              <button 
                className="lobby-btn primary" 
                onClick={handleStartBattle}
                disabled={!oppJoined && !isBotMode}
                style={{ opacity: (!oppJoined && !isBotMode) ? 0.5 : 1 }}
              >
                <Swords size={16} /> Start Battle
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 3. Countdown Screen
  if (lobbyState === 'countdown') {
    return (
      <div className="countdown-overlay">
        <Swords size={48} className="accent-color-svg" style={{ marginBottom: '16px', opacity: 0.5 }} />
        <span className="countdown-number">{countdown}</span>
        <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '16px' }}>Ready your fingers</span>
      </div>
    )
  }

  // 4. Split-Screen Arena
  if (lobbyState === 'arena') {
    return (
      <div className="battle-wrap">
        <div className="battle-arena">
          
          {/* PLAYER PANEL (YOU) */}
          <div className="arena-panel">
            <div className="arena-panel-header">
              <div className="arena-user">
                <div className="player-avatar" style={{ width: '24px', height: '24px', fontSize: '0.6875rem' }}>
                  {user?.username ? user.username[0].toUpperCase() : 'Y'}
                </div>
                <span className="arena-user-name">{user?.username || 'You'}</span>
              </div>
              <div className="arena-wpm">
                {wpm} <span>WPM</span>
              </div>
            </div>

            <div className="arena-typing-box" onClick={() => inputRef.current?.focus()}>
              {/* Target Text and typing inputs */}
              <div style={{ fontSize: '1.25rem', lineHeight: '2rem', display: 'flex', flexWrap: 'wrap', gap: '8px', pointerEvents: 'none' }}>
                {gameWords.map((word, idx) => {
                  let colorClass = 'var(--text-dim)'
                  if (idx < currentWordIdx) {
                    colorClass = typedWords[idx] === word ? 'var(--accent)' : 'var(--wrong)'
                  } else if (idx === currentWordIdx) {
                    colorClass = 'var(--text-hi)'
                  }
                  
                  return (
                    <span key={idx} style={{ color: colorClass, borderBottom: idx === currentWordIdx ? '2px solid var(--accent)' : 'none' }}>
                      {word}
                    </span>
                  )
                })}
              </div>

              {/* Hidden text input */}
              <input 
                ref={inputRef}
                type="text" 
                className="hidden-typing-input"
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                value={currentInput}
                onChange={handleKeyDown}
                autoComplete="off"
                autoCapitalize="off"
              />

              {/* Display live current typed input */}
              {status !== 'finished' && (
                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--accent)' }}>
                    {currentInput || <span style={{ opacity: 0.3, fontStyle: 'italic', fontSize: '0.9375rem' }}>type here...</span>}
                  </span>
                  {mode === 'time' && (
                    <span style={{ color: timeLeft <= 5 ? 'var(--wrong)' : 'var(--text-muted)', fontWeight: 700 }}>
                      {timeLeft}s remaining
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* OPPONENT PANEL */}
          <div className="arena-panel">
            <div className="arena-panel-header">
              <div className="arena-user">
                <div className="player-avatar opponent" style={{ width: '24px', height: '24px', fontSize: '0.6875rem' }}>
                  {isBotMode ? '🤖' : 'O'}
                </div>
                <span className="arena-user-name">{opponentStats.username || 'Opponent'}</span>
              </div>
              <div className="arena-wpm">
                {opponentStats.wpm} <span>WPM</span>
              </div>
            </div>

            <div className="arena-typing-box opponent-box">
              <div style={{ fontSize: '1.25rem', lineHeight: '2rem', display: 'flex', flexWrap: 'wrap', gap: '8px', opacity: 0.6 }}>
                {gameWords.map((word, idx) => {
                  const isCurrent = idx === Math.floor(opponentStats.currentWordIdx)
                  const isTyped = idx < Math.floor(opponentStats.currentWordIdx)
                  
                  return (
                    <span 
                      key={idx} 
                      className={`opp-word ${isCurrent ? 'current' : ''} ${isTyped ? 'typed' : ''}`}
                    >
                      {word}
                      {isCurrent && <span className="opp-caret" />}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
        
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <button className="lobby-btn" onClick={leaveRoom} style={{ maxWidth: '200px' }}>
            Forfeit / Leave Game
          </button>
        </div>
      </div>
    )
  }

  // 5. Results Screen
  if (lobbyState === 'results') {
    const isWin = winner === 'You'
    const isDraw = winner === 'Draw'
    
    return (
      <div className="battle-wrap">
        <div className="battle-results-wrap">
          <div className={`battle-outcome-banner ${isWin ? 'win' : (isDraw ? 'draw' : 'lose')}`}>
            {isWin ? (
              <>
                <Crown size={32} />
                <span>Victory!</span>
              </>
            ) : isDraw ? (
              <span>It's a Draw</span>
            ) : (
              <span>Defeat...</span>
            )}
          </div>

          <div className="results-split">
            {/* YOUR CARD */}
            <div className={`res-split-card ${isWin ? 'winner' : ''}`}>
              {isWin && (
                <div className="winner-crown">
                  <Crown size={18} />
                </div>
              )}
              <div className="res-split-header">Your Performance</div>
              <div className="res-split-metrics">
                <div className="res-metric-row">
                  <span className="res-metric-label">Speed</span>
                  <span className="res-metric-val wpm-highlight">{wpm} WPM</span>
                </div>
                <div className="res-metric-row">
                  <span className="res-metric-label">Accuracy</span>
                  <span className="res-metric-val">{accuracy}%</span>
                </div>
                <div className="res-metric-row">
                  <span className="res-metric-label">Words Typed</span>
                  <span className="res-metric-val">{currentWordIdx} / {gameWords.length}</span>
                </div>
              </div>
            </div>

            {/* OPPONENT CARD */}
            <div className={`res-split-card ${(!isWin && !isDraw) ? 'winner' : ''}`}>
              {(!isWin && !isDraw) && (
                <div className="winner-crown">
                  <Crown size={18} />
                </div>
              )}
              <div className="res-split-header">{opponentStats.username || 'Opponent'}</div>
              <div className="res-split-metrics">
                <div className="res-metric-row">
                  <span className="res-metric-label">Speed</span>
                  <span className="res-metric-val wpm-highlight">{opponentStats.wpm} WPM</span>
                </div>
                <div className="res-metric-row">
                  <span className="res-metric-label">Accuracy</span>
                  <span className="res-metric-val">{opponentStats.accuracy}%</span>
                </div>
                <div className="res-metric-row">
                  <span className="res-metric-label">Words Typed</span>
                  <span className="res-metric-val">{Math.floor(opponentStats.currentWordIdx)} / {gameWords.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="btn-row" style={{ width: '100%', maxWidth: '480px' }}>
            <button className="lobby-btn" onClick={leaveRoom}>
              Back to Lobby
            </button>
            {isHost && (
              <button className="lobby-btn primary" onClick={handleRematch}>
                Play Again (Rematch)
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
