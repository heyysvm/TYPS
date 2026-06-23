import { useState, useEffect, useRef, useCallback } from 'react'
import { generateWords } from '../data/words'

export function useTypingEngine({ mode, tier, wordCount, timeLimit, key: _key }) {
  const [words, setWords]               = useState([])
  const [typedChars, setTypedChars]     = useState([])
  const [currentWordIdx, setCWI]        = useState(0)
  const [currentInput, setCurrentInput] = useState('')
  const [status, setStatus]             = useState('idle')
  const [timeLeft, setTimeLeft]         = useState(timeLimit)
  const [elapsed, setElapsed]           = useState(0)
  const [wpm, setWpm]                   = useState(0)
  const [rawWpm, setRawWpm]             = useState(0)
  const [accuracy, setAccuracy]         = useState(100)
  const [wpmHistory, setWpmHistory]     = useState([])
  const [charsCorrect, setCharsCorrect]     = useState(0)
  const [charsIncorrect, setCharsIncorrect] = useState(0)
  const [charsExtra, setCharsExtra]         = useState(0)
  const [charsMissed, setCharsMissed]       = useState(0)

  const timerRef          = useRef(null)
  const inputRef          = useRef(null)
  const wordRefs          = useRef([])
  const startTimeRef      = useRef(null)
  const correctCharsRef   = useRef(0)  
  const totalCharsRef     = useRef(0)  
  const totalKeysRef      = useRef(0)  
  const statusRef         = useRef('idle')
  const wordsRef          = useRef([])
  const currentInputRef   = useRef('')
  const currentWordIdxRef = useRef(0)
  const typedCharsRef     = useRef([])

  
  const charsCorrectRef   = useRef(0)
  const charsIncorrectRef = useRef(0)
  const charsExtraRef     = useRef(0)
  const charsMissedRef    = useRef(0)

  const syncStatus = (s) => { statusRef.current = s; setStatus(s) }

  const syncCharStats = () => {
    setCharsCorrect(charsCorrectRef.current)
    setCharsIncorrect(charsIncorrectRef.current)
    setCharsExtra(charsExtraRef.current)
    setCharsMissed(charsMissedRef.current)
  }

  const countCharStats = (word, typed) => {
    for (let i = 0; i < Math.max(word.length, typed.length); i++) {
      if (i >= word.length) charsExtraRef.current++
      else if (i >= typed.length) charsMissedRef.current++
      else if (typed[i] === word[i]) charsCorrectRef.current++
      else charsIncorrectRef.current++
    }
  }

  const initWords = useCallback(() => {
    const count     = mode === 'words' ? wordCount : Math.max(wordCount * 4, 200)
    const generated = generateWords(tier, count)

    wordsRef.current          = generated
    currentInputRef.current   = ''
    currentWordIdxRef.current = 0
    typedCharsRef.current     = Array(generated.length).fill(null).map(() => [])
    correctCharsRef.current   = 0
    totalCharsRef.current     = 0
    totalKeysRef.current      = 0
    startTimeRef.current      = null
    charsCorrectRef.current   = 0
    charsIncorrectRef.current = 0
    charsExtraRef.current     = 0
    charsMissedRef.current    = 0

    if (timerRef.current) clearInterval(timerRef.current)

    setWords(generated)
    setTypedChars(Array(generated.length).fill(null).map(() => []))
    setCWI(0)
    setCurrentInput('')
    syncStatus('idle')
    setTimeLeft(timeLimit)
    setElapsed(0)
    setWpm(0)
    setRawWpm(0)
    setAccuracy(100)
    setWpmHistory([])
    setCharsCorrect(0)
    setCharsIncorrect(0)
    setCharsExtra(0)
    setCharsMissed(0)
  }, [mode, tier, wordCount, timeLimit, _key]) 

  useEffect(() => { initWords() }, [initWords])

  
  useEffect(() => {
    if (status !== 'running') return

    timerRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - startTimeRef.current) / 1000
      const minutes    = elapsedSec / 60

      if (mode === 'time') {
        const left = Math.max(0, timeLimit - elapsedSec)
        setTimeLeft(Math.ceil(left))
        setElapsed(elapsedSec)

        if (left <= 0) {
          clearInterval(timerRef.current)
          const mins = Math.max(elapsedSec / 60, 0.001)
          
          setWpm(Math.round((correctCharsRef.current / 5) / mins))
          setRawWpm(Math.round((totalKeysRef.current / 5) / mins))
          syncCharStats()
          syncStatus('finished')
          return
        }
      } else {
        setElapsed(elapsedSec)
      }

      if (minutes > 0) {
        const liveWpm = Math.round((correctCharsRef.current / 5) / minutes)
        const liveRaw = Math.round((totalKeysRef.current   / 5) / minutes)
        setWpm(liveWpm)
        setRawWpm(liveRaw)
        
        const sec = Math.floor(elapsedSec)
        setWpmHistory(prev => {
          if (prev.length && prev[prev.length - 1].t === sec) return prev
          return [...prev, { t: sec, wpm: liveWpm }]
        })
      }
    }, 100)

    return () => clearInterval(timerRef.current)
  }, [status, mode, timeLimit])

  
  const handleKeyDown = useCallback((e) => {
    const st  = statusRef.current
    if (st === 'finished') return
    const key = e.key

    
    if (st === 'idle' && key.length === 1) {
      syncStatus('running')
      startTimeRef.current = Date.now()
    }
    if (statusRef.current !== 'running') return

    
    if (key === 'Backspace' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      currentInputRef.current = ''
      typedCharsRef.current[currentWordIdxRef.current] = []
      setCurrentInput('')
      setTypedChars(prev => {
        const n = [...prev]; n[currentWordIdxRef.current] = []; return n
      })
      return
    }

    
    if (key === 'Backspace') {
      e.preventDefault()
      const ci  = currentInputRef.current
      const cwi = currentWordIdxRef.current

      if (ci.length === 0 && cwi > 0) {
        
        const prevWord  = wordsRef.current[cwi - 1]
        const prevTyped = typedCharsRef.current[cwi - 1] || []
        const hadError  = prevTyped.length !== prevWord.length ||
                          prevTyped.some((c, i) => c !== prevWord[i])
        if (hadError) {
          const restored = prevTyped.join('')
          currentWordIdxRef.current = cwi - 1
          currentInputRef.current   = restored
          setCWI(cwi - 1)
          setCurrentInput(restored)
        }
      } else {
        const newInput = ci.slice(0, -1)
        currentInputRef.current    = newInput
        typedCharsRef.current[cwi] = newInput.split('')
        setCurrentInput(newInput)
        setTypedChars(prev => {
          const n = [...prev]; n[cwi] = newInput.split(''); return n
        })
      }
      return
    }

    
    if (key === ' ') {
      e.preventDefault()
      const ci  = currentInputRef.current
      const cwi = currentWordIdxRef.current
      if (ci.trim() === '') return

      const currentWord = wordsRef.current[cwi]

      
      countCharStats(currentWord, ci)

      
      
      if (ci === currentWord) {
        
        correctCharsRef.current += currentWord.length + 1
      }

      
      totalKeysRef.current += ci.length + 1

      
      totalCharsRef.current += ci.length + 1
      const acc = Math.round(
        (correctCharsRef.current / Math.max(totalCharsRef.current, 1)) * 100
      )
      setAccuracy(Math.min(acc, 100))

      const nextIdx = cwi + 1

      
      if (mode === 'words' && nextIdx >= wordsRef.current.length) {
        clearInterval(timerRef.current)
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000
        const mins       = Math.max(elapsedSec / 60, 0.001)
        setWpm(Math.round((correctCharsRef.current / 5) / mins))
        setRawWpm(Math.round((totalKeysRef.current   / 5) / mins))
        setElapsed(elapsedSec)
        syncCharStats()
        syncStatus('finished')
        return
      }

      currentWordIdxRef.current = nextIdx
      currentInputRef.current   = ''
      setCWI(nextIdx)
      setCurrentInput('')
      return
    }

    
    if (key.length === 1) {
      const ci          = currentInputRef.current
      const cwi         = currentWordIdxRef.current
      const currentWord = wordsRef.current[cwi]
      
      if (ci.length >= currentWord.length + 10) return

      const newInput = ci + key
      currentInputRef.current    = newInput
      typedCharsRef.current[cwi] = newInput.split('')
      totalKeysRef.current      += 1
      setCurrentInput(newInput)
      setTypedChars(prev => {
        const n = [...prev]; n[cwi] = newInput.split(''); return n
      })

      
      if (mode === 'words' && cwi === wordsRef.current.length - 1 && newInput === currentWord) {
        
        countCharStats(currentWord, newInput)

        correctCharsRef.current += currentWord.length
        totalKeysRef.current += newInput.length
        totalCharsRef.current += newInput.length
        clearInterval(timerRef.current)
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000
        const mins = Math.max(elapsedSec / 60, 0.001)
        setWpm(Math.round((correctCharsRef.current / 5) / mins))
        setRawWpm(Math.round((totalKeysRef.current / 5) / mins))
        setElapsed(elapsedSec)
        syncCharStats()
        syncStatus('finished')
        return
      }
    }
  }, [mode])

  
  useEffect(() => {
    if (status === 'idle') {
      const t = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(t)
    }
  }, [status])

  const restart = useCallback(() => {
    initWords()
  }, [initWords])

  const focusInput = useCallback(() => inputRef.current?.focus(), [])

  return {
    words, typedChars, currentWordIdx, currentInput,
    status, timeLeft, elapsed, wpm, rawWpm, accuracy, wpmHistory,
    charsCorrect, charsIncorrect, charsExtra, charsMissed,
    handleKeyDown, restart, inputRef, wordRefs, focusInput,
  }
}
