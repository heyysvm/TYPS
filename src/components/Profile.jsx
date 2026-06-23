import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, getUserStats, updateAvatar } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    async function load() {
      setLoading(true)
      try {
        const s = await getUserStats()
        setStats(s)
      } catch {
        setStats(null)
      }
      setLoading(false)
    }
    load()
  }, [user, getUserStats])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    
    if (file.size > 1024 * 1024) {
      alert("Image must be smaller than 1MB.")
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      try {
        await updateAvatar(reader.result)
      } catch (err) {
        alert("Failed to save avatar: " + err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  if (!user) {
    return (
      <div className="page-wrap">
        <div className="empty-state">sign in to view your profile</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="loading-state">loading...</div>
      </div>
    )
  }

  const joinedDate = new Date(user.joined).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="page-wrap">
      <div className="profile-header">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="avatar-img" />
            ) : (
              user.username[0].toUpperCase()
            )}
          </div>
          <label className="avatar-upload-label">
            change pic
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
        </div>
        <div>
          <h2 className="profile-name">{user.username}</h2>
          {user.email && <p className="profile-email">{user.email}</p>}
          <p className="profile-joined">joined {joinedDate}</p>
        </div>
      </div>

      {stats ? (
        <div className="stats-cards">
          <div className="stat-card">
            <span className="sc-label">total tests</span>
            <span className="sc-val">{stats.tests}</span>
          </div>
          <div className="stat-card">
            <span className="sc-label">best wpm</span>
            <span className="sc-val">{stats.bestWpm}</span>
          </div>
          <div className="stat-card">
            <span className="sc-label">avg wpm</span>
            <span className="sc-val">{stats.avgWpm}</span>
          </div>
          <div className="stat-card">
            <span className="sc-label">avg accuracy</span>
            <span className="sc-val">{stats.avgAcc}%</span>
          </div>
        </div>
      ) : (
        <div className="empty-state">no tests yet — finish a test to see your stats</div>
      )}
    </div>
  )
}
