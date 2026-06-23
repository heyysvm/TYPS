import { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react'

export default function TypingArea({
  words, typedChars, currentWordIdx, currentInput,
  status, handleKeyDown, inputRef, wordRefs, focusInput
}) {
  const containerRef = useRef(null)
  const viewportRef  = useRef(null)
  const [offsetY, setOffsetY]       = useState(0)
  const [caretPos, setCaretPos]     = useState({ left: 0, top: 0 })
  const [caretVisible, setCaretVisible] = useState(true)
  const [rowH, setRowH]             = useState(0)
  const [resizeTrigger, setResizeTrigger] = useState(0)
  const [isFocused, setIsFocused]   = useState(false)
  const [capsLock, setCapsLock]     = useState(false)
  const blinkRef    = useRef(null)
  const offsetYRef  = useRef(0)

  
  useEffect(() => {
    const handleResize = () => setResizeTrigger(t => t + 1)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  
  useLayoutEffect(() => {
    if (!containerRef.current || words.length < 2) return
    const wordEls = containerRef.current.querySelectorAll('.word')
    let firstTop = null
    let measuredH = 0
    for (const el of wordEls) {
      if (firstTop === null) { firstTop = el.offsetTop; continue }
      if (el.offsetTop !== firstTop) {
        measuredH = el.offsetTop - firstTop
        break
      }
    }
    if (measuredH > 0) setRowH(measuredH)
  }, [words])

  
  const resetBlink = useCallback(() => {
    setCaretVisible(true)
    clearInterval(blinkRef.current)
    blinkRef.current = setInterval(() => setCaretVisible(v => !v), 530)
  }, [])

  useEffect(() => {
    if (isFocused && (status === 'idle' || status === 'running')) {
      blinkRef.current = setInterval(() => setCaretVisible(v => !v), 530)
    } else {
      setCaretVisible(true)
      clearInterval(blinkRef.current)
    }
    return () => clearInterval(blinkRef.current)
  }, [status, isFocused])

  
  useLayoutEffect(() => {
    const wordEl = wordRefs.current[currentWordIdx]
    if (!wordEl || !containerRef.current) return

    const charEls  = wordEl.querySelectorAll('.ch')
    const caretIdx = currentInput.length

    let left, top

    if (caretIdx === 0) {
      const first = charEls[0]
      if (first) {
        left = wordEl.offsetLeft + first.offsetLeft
        top  = wordEl.offsetTop
      }
    } else {
      const prev = charEls[caretIdx - 1]
      if (prev) {
        left = wordEl.offsetLeft + prev.offsetLeft + prev.offsetWidth
        top  = wordEl.offsetTop
      } else {
        const last = charEls[charEls.length - 1]
        if (last) {
          left = wordEl.offsetLeft + last.offsetLeft + last.offsetWidth
          top  = wordEl.offsetTop
        }
      }
    }

    if (left !== undefined) {
      setCaretPos({ left: left - 1, top })
    }
  }, [currentInput, currentWordIdx, words, typedChars, wordRefs, resizeTrigger])

  
  useLayoutEffect(() => {
    if (rowH === 0) return
    const wordEl = wordRefs.current[currentWordIdx]
    if (!wordEl || !containerRef.current) return

    
    const wordTop = wordEl.offsetTop
    const firstWordTop = containerRef.current.querySelector('.word')?.offsetTop || 0
    const currentRow = Math.round((wordTop - firstWordTop) / rowH)

    
    
    const targetOffset = -Math.max(0, currentRow - 1) * rowH

    if (targetOffset !== offsetYRef.current) {
      offsetYRef.current = targetOffset
      setOffsetY(targetOffset)
    }
  }, [currentWordIdx, rowH, wordRefs, resizeTrigger])

  
  useEffect(() => {
    if (status === 'idle') {
      offsetYRef.current = 0
      setOffsetY(0)
    }
  }, [status])

  
  useEffect(() => {
    const focus = () => {
      if (inputRef.current) {
        inputRef.current.focus()
        setIsFocused(document.activeElement === inputRef.current)
      }
    }
    focus()
    const t1 = setTimeout(focus, 50)
    const t2 = setTimeout(focus, 150)
    const t3 = setTimeout(focus, 350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [inputRef])

  
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Escape' || e.key === 'Tab') {
        return
      }

      if (inputRef.current) {
        inputRef.current.focus()
        setIsFocused(true)
        handleKeyDown(e)
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [inputRef, handleKeyDown])

  
  useEffect(() => {
    const checkCapsLock = (e) => {
      if (e.getModifierState) {
        setCapsLock(e.getModifierState('CapsLock'))
      }
    }
    window.addEventListener('keydown', checkCapsLock)
    window.addEventListener('keyup', checkCapsLock)
    return () => {
      window.removeEventListener('keydown', checkCapsLock)
      window.removeEventListener('keyup', checkCapsLock)
    }
  }, [])

  return (
    <div className="typing-area" onClick={focusInput}>
      {}
      {capsLock && (
        <div className="caps-lock-indicator">
          <span className="caps-lock-dot" />
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '-2px' }}><path d="M12 3v18M12 3L5 9M12 3l7 6M5 21h14"/></svg>
          <span>caps lock active</span>
        </div>
      )}

      <div
        className="words-viewport"
        ref={viewportRef}
        style={rowH > 0 ? { height: rowH * 3 } : undefined}
      >
        <div
          className="words-container"
          ref={containerRef}
          style={{
            transform: `translateY(${offsetY}px)`,
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {}
          {status !== 'finished' && isFocused && (
            <span
              className="pipe-caret"
              style={{
                left:    caretPos.left,
                top:     caretPos.top,
                opacity: caretVisible ? 1 : 0,
                transition: 'left 0.08s linear, top 0s, opacity 0.08s',
              }}
            />
          )}

          {words.map((word, wi) => {
            const typed  = typedChars[wi] || []
            const isCurr = wi === currentWordIdx

            
            const isDone  = wi < currentWordIdx
            const isWrong = isDone && (
              typed.length !== word.length ||
              typed.some((ch, i) => ch !== word[i])
            )

            return (
              <span
                key={wi}
                ref={el => { wordRefs.current[wi] = el }}
                className={[
                  'word',
                  isCurr  ? 'curr'       : '',
                  isDone  ? 'done'       : '',
                  isWrong ? 'wrong-word' : '',
                ].filter(Boolean).join(' ')}
              >
                {}
                {word.split('').map((ch, ci) => {
                  let cls = 'ch dim'
                  if (ci < typed.length) {
                    cls = typed[ci] === ch ? 'ch correct' : 'ch wrong'
                  }
                  return <span key={ci} className={cls}>{ch}</span>
                })}

                {}
                {typed.length > word.length &&
                  typed.slice(word.length).map((ch, i) => (
                    <span key={`ex${i}`} className="ch extra">{ch}</span>
                  ))
                }
              </span>
            )
          })}
        </div>
      </div>

      {}
      <input
        ref={inputRef}
        className="ghost-input"
        onKeyDown={e => { resetBlink(); handleKeyDown(e) }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={() => {}}
        value={currentInput}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        tabIndex={-1}
        autoFocus
      />

      {}
      {status !== 'finished' && !isFocused && (
        <div className="focus-error-overlay">
          <div className="focus-error-text">
            <span>Click or press any key to focus</span>
          </div>
        </div>
      )}
    </div>
  )
}
