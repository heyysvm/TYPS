import { Volume2, VolumeX, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const TIERS = ['basic', 'intermd', 'hard']
const TYPES = ['words', 'time']

const WORD_OPTIONS = [10, 30, 60]
const TIME_OPTIONS = [10, 30, 40, 60]

export default function Navbar({
  tier,
  setTier,
  mode,
  setMode,
  wordCount,
  setWordCount,
  timeLimit,
  setTimeLimit,
  customVal,
  setCustomVal,
  showCustom,
  setShowCustom,
  sound,
  setSound,
  onRestart,
  theme,
  setTheme,
  themes,
}) {
  const { baseTheme, toggleBaseTheme } = useTheme()
  const options = mode === 'words' ? WORD_OPTIONS : TIME_OPTIONS

  const activeValue =
    mode === 'words'
      ? wordCount
      : timeLimit

  const setValue =
    mode === 'words'
      ? setWordCount
      : setTimeLimit

  const handleMode = (selectedMode) => {
    setMode(selectedMode)
    setShowCustom(false)

    if (selectedMode === 'words') {
      setWordCount(30)
    } else {
      setTimeLimit(30)
    }

    onRestart()
  }

  const handleOption = (value) => {
    setValue(value)
    setShowCustom(false)
    onRestart()
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()

    const value = parseInt(customVal)

    if (!value || value < 1) return

    setValue(Math.min(value, 300))
    setShowCustom(false)
    onRestart()
  }

  return (
    <div className="navbar-wrap">
      <nav className="navbar">

        {}
        <div className="nav-group">
          <button
            className="nb-icon"
            onClick={() => setSound((prev) => !prev)}
            onMouseDown={e => e.preventDefault()}
            title="Toggle Sound"
          >
            {sound ? (
              <Volume2 size={16} />
            ) : (
              <VolumeX size={16} />
            )}
          </button>

          <span className="nb-label">tier</span>

          {TIERS.map((t) => (
            <button
              key={t}
              className={`nb-pill ${
                tier === t ? 'active' : ''
              }`}
              onClick={() => {
                setTier(t)
                onRestart()
              }}
              onMouseDown={e => e.preventDefault()}
            >
              {t}
            </button>
          ))}
        </div>

        {}
        <div className="nav-group">
          <span className="nb-label">type</span>

          {TYPES.map((type) => (
            <button
              key={type}
              className={`nb-pill ${
                mode === type ? 'active' : ''
              }`}
              onClick={() => handleMode(type)}
              onMouseDown={e => e.preventDefault()}
            >
              {type}
            </button>
          ))}
        </div>

        {}
        <div className="nav-group">
          {options.map((value) => (
            <button
              key={value}
              className={`nb-num ${
                activeValue === value &&
                !showCustom
                  ? 'active'
                  : ''
              }`}
              onClick={() => handleOption(value)}
              onMouseDown={e => e.preventDefault()}
            >
              {value}
            </button>
          ))}

          <button
            className={`nb-pill sm ${
              showCustom ? 'active' : ''
            }`}
            onClick={() =>
              setShowCustom((prev) => !prev)
            }
            onMouseDown={e => e.preventDefault()}
          >
            custom
          </button>

          {showCustom && (
            <form
              onSubmit={handleCustomSubmit}
              className="nb-custom"
            >
              <input
                type="number"
                className="nb-custom-input"
                placeholder={
                  mode === 'words'
                    ? 'words'
                    : 'sec'
                }
                value={customVal}
                onChange={(e) =>
                  setCustomVal(e.target.value)
                }
                autoFocus
                min={1}
                max={300}
              />

              <button
                type="submit"
                className="nb-custom-go"
              >
                →
              </button>
            </form>
          )}
        </div>

        {}
        {themes && (
          <div className="nav-group">
            <button
              className="nb-icon"
              onClick={toggleBaseTheme}
              onMouseDown={e => e.preventDefault()}
              title={`Switch to ${baseTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {baseTheme === 'light' ? (
                <Moon size={16} />
              ) : (
                <Sun size={16} />
              )}
            </button>

            <span className="nb-label">theme</span>
            {Object.entries(themes).map(([name, vars]) => (
              <button
                key={name}
                className={`theme-dot ${theme === name ? 'active' : ''}`}
                style={{ '--dot-color': vars['--accent'] }}
                onClick={() => setTheme(name)}
                onMouseDown={e => e.preventDefault()}
                title={name}
              />
            ))}
          </div>
        )}

      </nav>
    </div>
  )
}