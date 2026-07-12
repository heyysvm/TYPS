import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const syncLocalHistory = async (userId) => {
    try {
      const localStr = localStorage.getItem('typs_local_history')
      if (!localStr) return
      const local = JSON.parse(localStr)
      if (local && local.length > 0) {
        const testsToInsert = local.map(t => ({
          user_id: userId,
          wpm: t.wpm,
          raw_wpm: t.rawWpm ?? t.raw_wpm ?? 0,
          accuracy: t.accuracy,
          tier: t.tier || 'basic',
          mode: t.mode || 'words',
          word_count: t.wordCount ?? t.word_count ?? null,
          time_limit: t.timeLimit ?? t.time_limit ?? null,
          elapsed: t.elapsed ?? 0,
          chars_correct: t.charsCorrect ?? t.chars_correct ?? 0,
          chars_incorrect: t.charsIncorrect ?? t.chars_incorrect ?? 0,
          chars_extra: t.charsExtra ?? t.chars_extra ?? 0,
          chars_missed: t.charsMissed ?? t.chars_missed ?? 0,
          created_at: t.created_at || new Date().toISOString()
        }))

        const { error } = await supabase.from('tests').insert(testsToInsert)
        if (!error) {
          localStorage.removeItem('typs_local_history')
        } else {
          console.error('Error syncing local history:', error.message)
        }
      }
    } catch (e) {
      console.error('Failed to sync local history:', e)
    }
  }

  
  async function fetchProfile(authUser) {
    if (!authUser) {
      setUser(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (data && !error) {
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          joined: data.created_at,
          theme: data.theme,
          avatarUrl: data.avatar_url,
        })
        syncLocalHistory(data.id)
        return
      }
    } catch (err) {
      console.warn('Failed to fetch profile from database:', err)
    }

    
    setUser({
      id: authUser.id,
      username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
      email: authUser.email,
      joined: authUser.created_at || new Date().toISOString(),
      theme: 'yellow',
      avatarUrl: null,
    })
    syncLocalHistory(authUser.id)
  }

  
  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        if (session?.user) {
          await fetchProfile(session.user)
        }
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      return { ok: false, msg: error.message }
    }
    await fetchProfile(data.user)
    return { ok: true }
  }

  const register = async (email, password, username) => {
    if (!username || username.length < 2) {
      return { ok: false, msg: 'Username too short (min 2 chars)' }
    }
    if (!password || password.length < 6) {
      return { ok: false, msg: 'Password too short (min 6 chars)' }
    }

    
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (existing) {
      return { ok: false, msg: 'Username already taken' }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (error) {
      return { ok: false, msg: error.message }
    }

    if (data.user) {
      await fetchProfile(data.user)
    }

    return { ok: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  

  const saveTest = async (result) => {
    if (!user) return
    const { error } = await supabase.from('tests').insert({
      user_id: user.id,
      wpm: result.wpm,
      raw_wpm: result.rawWpm ?? result.raw_wpm ?? 0,
      accuracy: result.accuracy,
      tier: result.tier ?? null,
      mode: result.mode ?? null,
      word_count: result.wordCount ?? result.word_count ?? null,
      time_limit: result.timeLimit ?? result.time_limit ?? null,
      elapsed: result.elapsed ?? null,
      chars_correct: result.charsCorrect ?? result.chars_correct ?? 0,
      chars_incorrect: result.charsIncorrect ?? result.chars_incorrect ?? 0,
      chars_extra: result.charsExtra ?? result.chars_extra ?? 0,
      chars_missed: result.charsMissed ?? result.chars_missed ?? 0,
    })
    if (error) {
      console.error('Error saving test:', error.message)
    }
  }

  const getUserHistory = async () => {
    if (!user) return []
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching history:', error.message)
      return []
    }
    return data || []
  }

  const getLeaderboardData = async () => {
    
    const { data, error } = await supabase
      .from('tests')
      .select('wpm, accuracy, user_id, mode, word_count, time_limit, profiles(username)')

    if (error) {
      console.error('Error fetching leaderboard:', error.message)
      return []
    }

    if (!data || data.length === 0) return []

    
    const userMap = {}
    for (const row of data) {
      const uid = row.user_id
      if (!userMap[uid]) {
        userMap[uid] = {
          username: row.profiles?.username || 'Unknown',
          wpms: [],
          accs: [],
          totalTestsCount: 0
        }
      }
      userMap[uid].totalTestsCount++

      const isCustom = row.mode === 'words'
        ? ![10, 30, 60].includes(row.word_count)
        : ![10, 30, 40, 60].includes(row.time_limit)

      if (isCustom) continue 

      userMap[uid].wpms.push(row.wpm)
      userMap[uid].accs.push(row.accuracy)
    }

    const filteredUsers = Object.values(userMap).filter(u => u.wpms.length > 0)

    const leaderboard = filteredUsers.map((u) => ({
      username: u.username,
      bestWpm: Math.max(...u.wpms),
      avgWpm: Math.round(u.wpms.reduce((a, b) => a + b, 0) / u.wpms.length),
      avgAcc: Math.round(u.accs.reduce((a, b) => a + b, 0) / u.accs.length),
      tests: u.totalTestsCount,
    }))

    leaderboard.sort((a, b) => b.bestWpm - a.bestWpm)
    return leaderboard
  }

  const getUserStats = async () => {
    if (!user) return null
    return getProfileStats(user.id)
  }

  const getProfileStats = async (userId) => {
    if (!userId) return null

    const { data, error } = await supabase
      .from('tests')
      .select('wpm, accuracy, word_count')
      .eq('user_id', userId)

    if (error || !data || data.length === 0) return null

    const avgWpm = Math.round(data.reduce((s, t) => s + t.wpm, 0) / data.length)
    const bestWpm = Math.max(...data.map((t) => t.wpm))
    const avgAcc = Math.round(data.reduce((s, t) => s + t.accuracy, 0) / data.length)
    const totalWords = data.reduce((s, t) => s + (t.word_count || 0), 0)

    return { avgWpm, bestWpm, avgAcc, tests: data.length, totalWords }
  }

  const updateTheme = async (themeName) => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ theme: themeName })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating theme:', error.message)
      return
    }

    localStorage.setItem('typs_theme', themeName)
    setUser((prev) => (prev ? { ...prev, theme: themeName } : prev))
  }

  const updateAvatar = async (avatarUrl) => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating avatar:', error.message)
      throw error
    }

    setUser((prev) => (prev ? { ...prev, avatarUrl } : prev))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        saveTest,
        getUserHistory,
        getLeaderboardData,
        getUserStats,
        getProfileStats,
        updateTheme,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
