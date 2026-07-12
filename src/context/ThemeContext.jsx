import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext.jsx'

const ThemeContext = createContext(null)

const THEMES = {
  yellow: {
    '--accent': '#e2b714',
    '--accent2': '#c8a010',
    '--correct': '#e2b714',
    '--accent-rgb': '226,183,20',
  },
  cyan: {
    '--accent': '#00c2cb',
    '--accent2': '#009ca3',
    '--correct': '#00c2cb',
    '--accent-rgb': '0,194,203',
  },
  orange: {
    '--accent': '#ff7a00',
    '--accent2': '#e06c00',
    '--correct': '#ff7a00',
    '--accent-rgb': '255,122,0',
  },
  green: {
    '--accent': '#a3be8c',
    '--accent2': '#8faa78',
    '--correct': '#a3be8c',
    '--accent-rgb': '163,190,140',
  },
}

function applyTheme(name) {
  const vars = THEMES[name]
  if (!vars) return
  const root = document.documentElement
  Object.entries(vars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value)
  })
}

export function ThemeProvider({ children }) {
  const { user, updateTheme, loading } = useAuth()
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('typs_theme')
    return saved && THEMES[saved] ? saved : 'yellow'
  })
  const [baseTheme, setBaseThemeState] = useState(() => {
    const saved = localStorage.getItem('typs_base_theme')
    return saved === 'light' ? 'light' : 'dark'
  })
  const [isGlass, setIsGlassState] = useState(() => {
    return localStorage.getItem('typs_is_glass') === 'true'
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (baseTheme === 'light') {
      document.documentElement.classList.add('light-mode')
    } else {
      document.documentElement.classList.remove('light-mode')
    }
  }, [baseTheme])

  useEffect(() => {
    if (isGlass) {
      document.documentElement.classList.add('glass-ui-active')
      document.body.classList.add('glass-ui-active')
    } else {
      document.documentElement.classList.remove('glass-ui-active')
      document.body.classList.remove('glass-ui-active')
    }
  }, [isGlass])

  useEffect(() => {
    if (!loading && user && user.theme && THEMES[user.theme]) {
      if (user.theme !== theme) {
        setThemeState(user.theme)
        localStorage.setItem('typs_theme', user.theme)
      }
    }
  }, [loading, user])

  const setTheme = async (name) => {
    if (!THEMES[name]) return
    setThemeState(name)
    localStorage.setItem('typs_theme', name)
    applyTheme(name)
    if (user && updateTheme) {
      await updateTheme(name)
    }
  }

  const toggleBaseTheme = () => {
    setBaseThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('typs_base_theme', next)
      return next
    })
  }

  const toggleGlass = () => {
    setIsGlassState((prev) => {
      const next = !prev
      localStorage.setItem('typs_is_glass', String(next))
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, baseTheme, toggleBaseTheme, isGlass, toggleGlass }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
