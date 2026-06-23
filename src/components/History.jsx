import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { History, TrendingUp } from 'lucide-react'

function fmt(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function computeLocalStats(data) {
  if (!data || data.length === 0) return null
  const avgWpm = Math.round(data.reduce((s, t) => s + t.wpm, 0) / data.length)
  const bestWpm = Math.max(...data.map((t) => t.wpm))
  const avgAcc = Math.round(data.reduce((s, t) => s + t.accuracy, 0) / data.length)
  return { bestWpm, avgWpm, avgAcc, tests: data.length }
}

export default function HistoryPage() {
  const { getUserHistory, getUserStats, user } = useAuth()
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      try {
        const local = JSON.parse(localStorage.getItem('typs_local_history') || '[]')
        setHistory(local)
        setStats(computeLocalStats(local))
      } catch (e) {
        console.error('Failed to load local history:', e)
      }
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      try {
        const h = await getUserHistory()
        const s = await getUserStats()
        setHistory(h || [])
        setStats(s)
      } catch {
        setHistory([])
        setStats(null)
      }
      setLoading(false)
    }
    load()
  }, [user, getUserHistory, getUserStats])

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <History size={18} />
          <h2>history</h2>
        </div>
        <div className="loading-state">loading...</div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <History size={18} />
        <h2>history</h2>
        {!user && (
          <span className="guest-badge">guest mode (local data)</span>
        )}
      </div>

      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <span className="sc-label">best wpm</span>
            <span className="sc-val">{stats.bestWpm}</span>
          </div>
          <div className="stat-card">
            <span className="sc-label">avg wpm</span>
            <span className="sc-val">{stats.avgWpm}</span>
          </div>
          <div className="stat-card">
            <span className="sc-label">avg acc</span>
            <span className="sc-val">{stats.avgAcc}%</span>
          </div>
          <div className="stat-card">
            <span className="sc-label">tests</span>
            <span className="sc-val">{stats.tests}</span>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="empty-state">no tests yet — finish a test to see results here</div>
      ) : (
        <div className="lb-table">
          <div className="lb-head hist-head">
            <span>date</span>
            <span>wpm</span>
            <span>raw</span>
            <span>acc</span>
            <span>mode</span>
          </div>
          {history.map((h) => (
            <div key={h.id} className="lb-row hist-row">
              <span className="lb-user">{fmt(h.created_at)}</span>
              <span className="lb-wpm">{h.wpm}</span>
              <span className="lb-acc">{h.raw_wpm}</span>
              <span className="lb-acc">{h.accuracy}%</span>
              <span className="lb-mode">{h.mode} · {h.tier}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
