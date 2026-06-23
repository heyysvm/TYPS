import { RotateCcw, Trophy, Clock, Target, Zap, Crown, TrendingUp, TrendingDown } from 'lucide-react'

export default function Results({
  wpm, rawWpm, accuracy, elapsed, mode, timeLimit, wpmHistory, onRestart, saved,
  charsCorrect, charsIncorrect, charsExtra, charsMissed, bestWpm, previousWpm
}) {
  const duration = mode === 'time' ? timeLimit : Math.round(elapsed)
  const isPB = bestWpm > 0 && wpm > bestWpm
  const hasDelta = previousWpm > 0
  const delta = hasDelta ? wpm - previousWpm : 0

  return (
    <div className="results-wrap">
      {isPB && (
        <div className="pb-badge">
          <Crown size={16} /> new personal best!
        </div>
      )}

      <div className="results-grid">
        <div className="res-block primary">
          <span className="res-label"><Zap size={11} /> wpm</span>
          <span className="res-val">{wpm}</span>
        </div>
        <div className="res-block">
          <span className="res-label"><Target size={11} /> accuracy</span>
          <span className="res-val">{accuracy}<span className="res-unit">%</span></span>
        </div>
        <div className="res-block">
          <span className="res-label"><Zap size={11} /> raw</span>
          <span className="res-val">{rawWpm}</span>
        </div>
        <div className="res-block">
          <span className="res-label"><Clock size={11} /> time</span>
          <span className="res-val">{duration}<span className="res-unit">s</span></span>
        </div>
      </div>

      {(charsCorrect > 0 || charsIncorrect > 0 || charsExtra > 0 || charsMissed > 0) && (
        <div className="chars-row">
          <span className="char-stat correct">{charsCorrect}</span>
          <span>/</span>
          <span className="char-stat wrong">{charsIncorrect}</span>
          <span>/</span>
          <span className="char-stat extra">{charsExtra}</span>
          <span>/</span>
          <span className="char-stat missed">{charsMissed}</span>
          <span className="char-labels">correct / incorrect / extra / missed</span>
        </div>
      )}

      {hasDelta && (
        <div className={`wpm-delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {delta >= 0 ? '+' : ''}{delta} wpm vs last test
        </div>
      )}

      {saved && (
        <p className="res-saved"><Trophy size={12} /> result saved to your profile</p>
      )}

      <div className="res-actions">
        <button className="res-restart" onClick={onRestart}>
          <RotateCcw size={15} /> restart
        </button>
        <span className="res-hint">or <kbd>Tab</kbd> + <kbd>Enter</kbd></span>
      </div>
    </div>
  )
}
