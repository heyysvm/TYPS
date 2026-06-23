import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Trophy, Medal } from 'lucide-react'

export default function Leaderboard() {
  const { getLeaderboardData, user } = useAuth()
  const [lb, setLb] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getLeaderboardData()
        setLb(data || [])
      } catch {
        setLb([])
      }
      setLoading(false)
    }
    load()
  }, [getLeaderboardData])

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <Trophy size={18} />
          <h2>leaderboard</h2>
        </div>
        <div className="loading-state">loading...</div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Trophy size={18} />
        <h2>leaderboard</h2>
      </div>

      {lb.length === 0 ? (
        <div className="empty-state">no scores yet — finish a test to appear here</div>
      ) : (
        <div className="lb-table">
          <div className="lb-head lb-expanded">
            <span>#</span>
            <span>user</span>
            <span>best wpm</span>
            <span>avg wpm</span>
            <span>tests</span>
          </div>
          {lb.map((entry, i) => (
            <div key={entry.username}
              className={`lb-row lb-expanded ${entry.username === user?.username ? 'lb-me' : ''}`}>
              <span className="lb-rank">
                {i === 0 ? <Medal size={14} style={{ color: '#FFD700' }} /> :
                 i === 1 ? <Medal size={14} style={{ color: '#C0C0C0' }} /> :
                 i === 2 ? <Medal size={14} style={{ color: '#CD7F32' }} /> :
                 i + 1}
              </span>
              <span className="lb-user">{entry.username}{entry.username === user?.username ? ' (you)' : ''}</span>
              <span className="lb-wpm">{entry.bestWpm}</span>
              <span className="lb-acc">{entry.avgWpm || '—'}</span>
              <span className="lb-tests">{entry.tests || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
