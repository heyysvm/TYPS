import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
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
  const [isFocused, setIsFocused] = useState(false)

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
    currentInputVal: '',
    isFinished: false
  })

  // Lobby Browser & Requests States
  const [openRooms, setOpenRooms] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [requestStatus, setRequestStatus] = useState({}) // { [roomId]: 'idle' | 'pending' | 'declined' }

  // Countdown State
  const [countdown, setCountdown] = useState(3)
  const [copied, setCopied] = useState(false)
  const [winner, setWinner] = useState('')

  const channelRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const audioCtxRef = useRef(null)
  const myUserId = useRef(null)

  const startTimeRef = useRef(null)
  const correctCharsRef = useRef(0)
  const totalCharsRef = useRef(0)
  const totalKeysRef = useRef(0)

  const wordsContainerRef = useRef(null)
  const [caretPos, setCaretPos] = useState({ left: 0, top: 0 })
  const [resizeToggle, setResizeToggle] = useState(false)

  useEffect(() => {
    const handleResize = () => setResizeToggle(prev => !prev)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useLayoutEffect(() => {
    if (!wordsContainerRef.current) return
    const wordEl = wordsContainerRef.current.querySelectorAll('.word')[currentWordIdx]
    if (!wordEl) return

    const charEls = wordEl.querySelectorAll('.ch')
    const caretIdx = currentInput.length

    let left, top

    if (caretIdx === 0) {
      const first = charEls[0]
      if (first) {
        left = wordEl.offsetLeft + first.offsetLeft
        top = wordEl.offsetTop
      } else {
        left = wordEl.offsetLeft
        top = wordEl.offsetTop
      }
    } else {
      const prev = charEls[caretIdx - 1]
      if (prev) {
        left = wordEl.offsetLeft + prev.offsetLeft + prev.offsetWidth
        top = wordEl.offsetTop
      } else {
        const last = charEls[charEls.length - 1]
        if (last) {
          left = wordEl.offsetLeft + last.offsetLeft + last.offsetWidth
          top = wordEl.offsetTop
        } else {
          left = wordEl.offsetLeft
          top = wordEl.offsetTop
        }
      }
    }

    if (left !== undefined) {
      setCaretPos({ left: left - 1, top })
    }
  }, [currentInput, currentWordIdx, gameWords, resizeToggle])

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

    startTimeRef.current = null
    correctCharsRef.current = 0
    totalCharsRef.current = 0
    totalKeysRef.current = 0
    
    setOpponentStats(prev => ({
      ...prev,
      wpm: 0,
      accuracy: 100,
      currentWordIdx: 0,
      currentInputVal: '',
      isFinished: false
    }))
    
    if (wordsList) setGameWords(wordsList)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [mode, timeLimit])

  // Copy code helper
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Global lobby browser synchronization
  useEffect(() => {
    if (lobbyState !== 'lobby' && lobbyState !== 'waiting') return

    const lobbyChan = supabase.channel('battle_lobby')

    lobbyChan.on('presence', { event: 'sync' }, () => {
      const presenceState = lobbyChan.presenceState()
      const rooms = Object.values(presenceState)
        .flat()
        .filter(r => r.roomId)
      setOpenRooms(rooms)
    })

    lobbyChan.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        if (lobbyState === 'waiting' && isHost) {
          // Host tracks the room in global lobby
          await lobbyChan.track({
            roomId,
            hostName: user?.username || 'Host',
            tier,
            mode,
            limit: mode === 'words' ? wordCount : timeLimit,
            playersCount: players.length
          })
        }
      }
    })

    return () => {
      lobbyChan.unsubscribe()
    }
  }, [lobbyState, isHost, roomId, tier, mode, wordCount, timeLimit, players.length, user])

  // Focus redirection when pressing keys outside the typing area
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (lobbyState === 'arena' && !isFocused && status !== 'finished') {
        // Prevent key defaults when focusing (like space scrolling)
        if (e.key === ' ' || e.key === 'Backspace') e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [lobbyState, isFocused, status])

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
          currentInputVal: payload.currentInputVal || '',
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

    // Host listens for join requests
    if (hostFlag) {
      channel.on('broadcast', { event: 'join_request' }, ({ payload }) => {
        setJoinRequests(prev => {
          if (prev.some(r => r.requesterId === payload.requesterId)) return prev
          return [...prev, payload]
        })
      })
    }

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
          const initialWords = generateWords(tier, mode === 'words' ? wordCount : Math.max(timeLimit * 6, 300))
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
    setJoinRequests([])
  }

  // Create Room (4-digit code)
  const handleCreateRoom = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    setRoomId(code)
    setIsHost(true)
    setLobbyState('waiting')
    setupRealtimeChannel(code, true)
  }

  // Join Room via Form
  const handleJoinRoom = (e) => {
    e.preventDefault()
    if (!roomCodeInput.trim()) return
    const code = roomCodeInput.trim()
    setRoomId(code)
    setIsHost(false)
    setLobbyState('waiting')
    setupRealtimeChannel(code, false)
  }

  // Accept Join Request (Host)
  const handleAcceptRequest = (req) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'join_accepted',
        payload: {
          requesterId: req.requesterId
        }
      })
    }
    setJoinRequests(prev => prev.filter(r => r.requesterId !== req.requesterId))
  }

  // Decline Join Request (Host)
  const handleDeclineRequest = (req) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'join_declined',
        payload: {
          requesterId: req.requesterId
        }
      })
    }
    setJoinRequests(prev => prev.filter(r => r.requesterId !== req.requesterId))
  }

  // Request to Join Room (Lobby list click)
  const handleRequestToJoin = (targetRoom) => {
    const targetRoomId = targetRoom.roomId
    setRequestStatus(prev => ({ ...prev, [targetRoomId]: 'pending' }))

    const tempChan = supabase.channel(`room_${targetRoomId}`)
    
    tempChan
      .on('broadcast', { event: 'join_accepted' }, ({ payload }) => {
        if (payload.requesterId === myUserId.current) {
          tempChan.unsubscribe()
          setRoomId(targetRoomId)
          setIsHost(false)
          setLobbyState('waiting')
          setupRealtimeChannel(targetRoomId, false)
        }
      })
      .on('broadcast', { event: 'join_declined' }, ({ payload }) => {
        if (payload.requesterId === myUserId.current) {
          setRequestStatus(prev => ({ ...prev, [targetRoomId]: 'declined' }))
          tempChan.unsubscribe()
          setTimeout(() => {
            setRequestStatus(prev => ({ ...prev, [targetRoomId]: 'idle' }))
          }, 3000)
        }
      })

    tempChan.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        tempChan.send({
          type: 'broadcast',
          event: 'join_request',
          payload: {
            requesterName: user?.username || `Guest_${Math.floor(Math.random() * 1000)}`,
            requesterId: myUserId.current
          }
        })
      }
    })
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

    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return
      const elapsedSec = (Date.now() - startTimeRef.current) / 1000
      setElapsed(elapsedSec)

      const minutes = elapsedSec / 60

      // Calculate live WPM (prevent spikes at the very beginning)
      if (minutes > 0.01) {
        const currentWpm = Math.round((correctCharsRef.current / 5) / minutes)
        setWpm(currentWpm)
      }

      // Time mode check
      if (mode === 'time') {
        const remaining = Math.max(0, timeLimit - elapsedSec)
        setTimeLeft(Math.ceil(remaining))

        if (remaining <= 0) {
          clearInterval(timerRef.current)
          setStatus('finished')
          // Broadcast final stats
          const finalWpm = Math.round((correctCharsRef.current / 5) / Math.max(elapsedSec / 60, 0.001))
          setWpm(finalWpm)
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'typing_progress',
              payload: {
                username: user?.username || 'You',
                wpm: finalWpm,
                accuracy,
                currentWordIdx,
                currentInputVal: '',
                isFinished: true
              }
            })
          }
        }
      }
    }, 100)

    return () => clearInterval(timerRef.current)
  }, [status, mode, timeLimit, accuracy, currentWordIdx, user])

  // AI Bot Opponent logic (high precision fluid rendering)
  useEffect(() => {
    if (lobbyState !== 'arena' || !isBotMode || status === 'finished') return

    setOpponentStats(prev => ({ ...prev, username: `Bot (Speed: ${botWpm} WPM)` }))

    const botInterval = setInterval(() => {
      setOpponentStats(prev => {
        if (prev.isFinished || status === 'finished') {
          clearInterval(botInterval)
          return prev
        }

        const step = (botWpm / 60) * 0.1
        const nextIdx = prev.currentWordIdx + step
        const isFinished = nextIdx >= gameWords.length

        const integerPart = Math.floor(nextIdx)
        const decimalPart = nextIdx - integerPart
        const currentWord = gameWords[integerPart] || ''
        const currentInputVal = currentWord.slice(0, Math.floor(decimalPart * currentWord.length))

        return {
          username: prev.username,
          currentWordIdx: Math.min(gameWords.length, nextIdx),
          wpm: botWpm,
          accuracy: 100,
          currentInputVal,
          isFinished
        }
      })
    }, 100)

    return () => clearInterval(botInterval)
  }, [lobbyState, isBotMode, botWpm, gameWords, status])

  // Helper to send character-by-character updates to opponent
  const sendTypingProgress = (wordIdx, inputVal, isFinishedFlag = false) => {
    if (channelRef.current) {
      const elapsedSec = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0.001
      const minutes = elapsedSec / 60
      const currentWpm = minutes > 0.01 ? Math.round((correctCharsRef.current / 5) / minutes) : 0
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing_progress',
        payload: {
          username: user?.username || 'You',
          wpm: currentWpm,
          accuracy,
          currentWordIdx: wordIdx,
          currentInputVal: inputVal,
          isFinished: isFinishedFlag
        }
      })
    }
  }

  // Handle typing input keydowns
  const handleKeyDown = (e) => {
    if (lobbyState !== 'arena' || status === 'finished') return
    playClick()

    if (status === 'idle') {
      setStatus('running')
      startTimeRef.current = Date.now()
    }

    const { key } = e
    const currentWord = gameWords[currentWordIdx]

    // Backspace
    if (key === 'Backspace') {
      e.preventDefault()
      if (currentInput.length > 0) {
        const newVal = currentInput.slice(0, -1)
        setCurrentInput(newVal)
        sendTypingProgress(currentWordIdx, newVal)
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
      if (isCorrect) {
        correctCharsRef.current += currentWord.length + 1 // including space
        setCorrectChars(correctCharsRef.current)
      } else {
        setMistakesCount(prev => prev + 1)
      }

      totalKeysRef.current += currentInput.length + 1
      totalCharsRef.current += currentInput.length + 1
      setTypedCharsCount(totalCharsRef.current)

      const acc = Math.max(0, Math.round(((totalCharsRef.current - (mistakesCount + (isCorrect ? 0 : 1))) / totalCharsRef.current) * 100))
      setAccuracy(acc)

      // Broadcast progress on word submission
      const elapsedSec = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0.001
      const currentWpm = elapsedSec > 0.6 ? Math.round((correctCharsRef.current / 5) / (elapsedSec / 60)) : 0
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
            currentInputVal: '',
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
      const newVal = currentInput + key
      setCurrentInput(newVal)
      totalKeysRef.current += 1
      sendTypingProgress(currentWordIdx, newVal)

      // Auto-finish: if this is the LAST word and all chars match, auto-submit
      const isLastWord = currentWordIdx === gameWords.length - 1
      if (isLastWord && newVal === currentWord && mode === 'words') {
        const updatedTyped = [...typedWords, newVal]
        setTypedWords(updatedTyped)
        const nextIdx = currentWordIdx + 1
        setCurrentWordIdx(nextIdx)
        setCurrentInput('')

        correctCharsRef.current += currentWord.length
        setCorrectChars(correctCharsRef.current)
        totalCharsRef.current += newVal.length
        setTypedCharsCount(totalCharsRef.current)

        const acc = Math.max(0, Math.round(((totalCharsRef.current - mistakesCount) / totalCharsRef.current) * 100))
        setAccuracy(acc)

        const elapsedSec = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0.001
        const finalWpm = elapsedSec > 0.6 ? Math.round((correctCharsRef.current / 5) / (elapsedSec / 60)) : 0
        setWpm(finalWpm)

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing_progress',
            payload: {
              username: user?.username || 'You',
              wpm: finalWpm,
              accuracy: acc,
              currentWordIdx: nextIdx,
              currentInputVal: '',
              isFinished: true
            }
          })
        }

        if (timerRef.current) clearInterval(timerRef.current)
        setStatus('finished')
      }
    }
  }

  // Determine game winner when finished
  useEffect(() => {
    if (status === 'finished' || opponentStats.isFinished) {
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
      
      const t = setTimeout(() => {
        setLobbyState('results')
      }, 1000)
      return () => clearTimeout(t)
    }
  }, [status, opponentStats.isFinished, opponentStats.wpm, wpm, mode, timeLeft, opponentStats.username])

  // Rematch
  const handleRematch = () => {
    const nextWords = generateWords(tier, mode === 'words' ? wordCount : Math.max(timeLimit * 6, 300))
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

  // 1. Lobby Setup Screen with Rooms Browser
  if (lobbyState === 'lobby') {
    return (
      <div className="battle-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', justifyContent: 'center', alignItems: 'flex-start' }}>
        
        {/* Setup card */}
        <div className="lobby-card" style={{ margin: '0' }}>
          <div className="lobby-title">
            <Swords size={22} className="accent-color-svg" />
            <h2>Create / Join Battle</h2>
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
            <Play size={16} /> Create Room
          </button>

          <div className="lobby-divider">OR</div>

          <form onSubmit={handleJoinRoom} className="join-row">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter 4-digit Code" 
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ''))}
              maxLength={4}
              required
            />
            <button type="submit" className="lobby-btn">
              Join
            </button>
          </form>
        </div>

        {/* Active Rooms Browser Card */}
        <div className="lobby-browser">
          <div className="browser-title">
            <span>Active Rooms Browser</span>
            <span className="browser-count">{openRooms.length} Open</span>
          </div>

          {openRooms.length === 0 ? (
            <div className="player-card" style={{ padding: '24px', justifyContent: 'center', opacity: 0.5 }}>
              <span style={{ fontSize: '0.875rem' }}>No active rooms. Create one to host!</span>
            </div>
          ) : (
            openRooms.map((room, idx) => {
              const status = requestStatus[room.roomId] || 'idle'
              return (
                <div key={idx} className="room-browser-card">
                  <div className="room-browser-info">
                    <span className="room-host-name">{room.hostName}'s Room</span>
                    <div className="room-details">
                      <span>{room.tier.toUpperCase()}</span>
                      <span>{room.mode.toUpperCase()}: {room.limit}</span>
                    </div>
                  </div>
                  
                  <div className="room-browser-actions">
                    <button 
                      className={`lobby-btn ${status === 'pending' ? '' : 'primary'}`}
                      style={{ padding: '8px 14px', fontSize: '0.8125rem', minWidth: '110px' }}
                      disabled={status === 'pending' || room.playersCount >= 2}
                      onClick={() => handleRequestToJoin(room)}
                    >
                      {status === 'pending' ? 'Requesting...' : status === 'declined' ? 'Declined' : 'Request Join'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    )
  }

  // 2. Waiting Room Lobby (Host displays requests here)
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

          {/* Join Requests (Host UI only) */}
          {isHost && joinRequests.length > 0 && (
            <div style={{ border: '1px solid rgba(var(--accent-rgb), 0.2)', padding: '16px', borderRadius: 'var(--radius)', background: 'rgba(var(--accent-rgb), 0.03)' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-hi)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Join Requests
              </span>
              <div className="players-list" style={{ gap: '8px' }}>
                {joinRequests.map((req, idx) => (
                  <div key={idx} className="player-card" style={{ padding: '10px 14px' }}>
                    <span className="player-name" style={{ fontSize: '0.875rem' }}>{req.requesterName} wants to join</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="lobby-btn primary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }} 
                        onClick={() => handleAcceptRequest(req)}
                      >
                        Accept
                      </button>
                      <button 
                        className="lobby-btn" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }} 
                        onClick={() => handleDeclineRequest(req)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

  // 3. Countdown Overlay
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
              <div className="arena-wpm" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {mode === 'time' && (
                  <span style={{ fontSize: '1rem', color: timeLeft <= 5 ? 'var(--wrong)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {timeLeft}s left
                  </span>
                )}
                <span>{wpm} <span>WPM</span></span>
              </div>
            </div>

            <div className="arena-typing-box" onClick={() => inputRef.current?.focus()}>
              {/* Dim overlay when blurred */}
              {status !== 'finished' && !isFocused && (
                <div className="focus-error-overlay">
                  <div className="focus-error-text">
                    <span>Click or press any key to focus</span>
                  </div>
                </div>
              )}

              {/* Target Text (Overwrite inline highlighting) */}
              <div 
                ref={wordsContainerRef}
                style={{ 
                  position: 'relative',
                  fontSize: '1.625rem', 
                  lineHeight: '2.625rem', 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '12px', 
                  pointerEvents: 'none',
                  opacity: isFocused ? 1 : 0.25,
                  transition: 'opacity 0.25s ease'
                }}
              >
                {/* Single absolute smooth caret */}
                {status !== 'finished' && isFocused && (
                  <span
                    className="battle-smooth-caret"
                    style={{
                      position: 'absolute',
                      left: caretPos.left,
                      top: caretPos.top + 9,
                      width: '2px',
                      height: '1.5rem',
                      transition: 'left 0.05s cubic-bezier(0.25, 0, 0, 1), top 0s',
                    }}
                  />
                )}

                {gameWords.map((word, idx) => {
                  const isCurrent = idx === currentWordIdx
                  const isCompleted = idx < currentWordIdx
                  
                  if (isCompleted) {
                    const isCorrect = typedWords[idx] === word
                    return (
                      <span key={idx} className="word" style={{ color: isCorrect ? 'var(--accent)' : 'var(--wrong)' }}>
                        {word}
                      </span>
                    )
                  }
                  
                  if (isCurrent) {
                    return (
                      <span key={idx} className="word curr" style={{ display: 'inline-block' }}>
                        {word.split('').map((char, charIdx) => {
                          let charColor = 'var(--text-dim)'
                          if (charIdx < currentInput.length) {
                            charColor = currentInput[charIdx] === char ? 'var(--accent)' : 'var(--wrong)'
                          }
                          
                          return (
                            <span key={charIdx} className="ch" style={{ color: charColor, transition: 'color 0.08s ease' }}>
                              {char}
                            </span>
                          )
                        })}
                        
                        {/* Render extra typed characters if any */}
                        {currentInput.length > word.length && (
                          currentInput.slice(word.length).split('').map((char, charIdx) => {
                            return (
                              <span key={`extra-${charIdx}`} className="ch extra" style={{ color: 'var(--wrong)' }}>
                                {char}
                              </span>
                            )
                          })
                        )}
                      </span>
                    )
                  }
                  
                  // Untyped words
                  return (
                    <span key={idx} className="word" style={{ color: 'var(--text-dim)', opacity: 0.4 }}>
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
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={() => {}}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
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
              <div style={{ fontSize: '1.625rem', lineHeight: '2.625rem', display: 'flex', flexWrap: 'wrap', gap: '12px', opacity: 0.6 }}>
                {gameWords.map((word, idx) => {
                  const isCurrent = idx === Math.floor(opponentStats.currentWordIdx)
                  const isTyped = idx < Math.floor(opponentStats.currentWordIdx)
                  
                  return (
                    <span 
                      key={idx} 
                      className={`opp-word ${isCurrent ? 'current' : ''} ${isTyped ? 'typed' : ''}`}
                    >
                      {isCurrent ? (
                        <span>
                          <span style={{ color: 'var(--accent)' }}>
                            {word.slice(0, (opponentStats.currentInputVal || '').length)}
                          </span>
                          <span className="opp-caret" style={{ 
                            display: 'inline-block',
                            width: '2px', 
                            height: '1.1em', 
                            background: 'var(--accent)', 
                            verticalAlign: 'middle',
                            margin: '0 1px'
                          }} />
                          <span style={{ opacity: 0.35 }}>
                            {word.slice((opponentStats.currentInputVal || '').length)}
                          </span>
                        </span>
                      ) : word}
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
