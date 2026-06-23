import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

function formatDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label, valueLabel }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      <div className="value">{payload[0].value} {valueLabel || ''}</div>
    </div>
  )
}

export default function Statistics() {
  const { user, getUserHistory } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      try {
        const local = JSON.parse(localStorage.getItem('typs_local_history') || '[]')
        setHistory(local)
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
        setHistory(h || [])
      } catch {
        setHistory([])
      }
      setLoading(false)
    }
    load()
  }, [user, getUserHistory])

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="loading-state">loading...</div>
      </div>
    )
  }

  if (!history.length) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <BarChart2 size={18} />
          <h2>statistics</h2>
        </div>
        <div className="empty-state">no tests yet — finish a test to see statistics here</div>
      </div>
    )
  }

  
  const totalTests = history.length
  const avgWpm = Math.round(history.reduce((s, h) => s + h.wpm, 0) / totalTests)
  const bestWpm = Math.max(...history.map(h => h.wpm))
  const avgAccuracy = Math.round(history.reduce((s, h) => s + h.accuracy, 0) / totalTests)
  const totalWords = history.reduce((s, h) => s + (h.word_count || 0), 0)

  
  const chronological = [...history].reverse()
  const wpmData = chronological.map(h => ({
    date: formatDate(h.created_at),
    wpm: h.wpm
  }))
  const accData = chronological.map(h => ({
    date: formatDate(h.created_at),
    accuracy: h.accuracy
  }))

  return (
    <div className="page-wrap">
      <div className="page-header">
        <BarChart2 size={18} />
        <h2>statistics</h2>
        {!user && (
          <span className="guest-badge">guest mode (local data)</span>
        )}
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <span className="sc-label">average wpm</span>
          <span className="sc-val">{avgWpm}</span>
        </div>
        <div className="stat-card">
          <span className="sc-label">best wpm</span>
          <span className="sc-val">{bestWpm}</span>
        </div>
        <div className="stat-card">
          <span className="sc-label">avg accuracy</span>
          <span className="sc-val">{avgAccuracy}%</span>
        </div>
        <div className="stat-card">
          <span className="sc-label">total tests</span>
          <span className="sc-val">{totalTests}</span>
        </div>
      </div>

      {totalWords > 0 && (
        <div className="stats-cards" style={{ marginTop: '-12px' }}>
          <div className="stat-card">
            <span className="sc-label">total words typed</span>
            <span className="sc-val">{totalWords}</span>
          </div>
        </div>
      )}

      <div className="chart-section">
        <h3 className="chart-title">wpm over time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={wpmData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-dim)', fontSize: '0.75rem' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-dim)', fontSize: '0.75rem' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip valueLabel="wpm" />} />
            <Line
              type="monotone"
              dataKey="wpm"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--accent)' }}
              activeDot={{ r: 5, fill: 'var(--accent)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-section">
        <h3 className="chart-title">accuracy over time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={accData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-dim)', fontSize: '0.75rem' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--text-dim)', fontSize: '0.75rem' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip valueLabel="%" />} />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--accent)' }}
              activeDot={{ r: 5, fill: 'var(--accent)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
